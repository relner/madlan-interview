const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeFacts } = require('../src/services/facts.service');
const { validateExplanation } = require('../src/services/grounding.service');

const options = {
    minSampleSize: 5,
    trendPeriods: [
        { id: 'early', from: 2021, to: 2023 },
        { id: 'late', from: 2024, to: 2026 }
    ],
    minTrendSampleSize: 10
};

const deal = (id, city, year, price, size, extra = {}) => ({
    dealId: id, city, dealYear: year, priceNis: price, sizeSqm: size,
    pricePerSqmCalculated: Math.round(price / size), includeInPriceStats: true, ...extra
});

const range = (n) => Array.from({ length: n }, (_, i) => i + 1);

const deals = [
    // Holon: 10 deals in each period → trend allowed
    ...range(10).map((i) => deal(`A${i}`, 'חולון', 2022, 2000000, 100)),
    ...range(10).map((i) => deal(`B${i}`, 'חולון', 2025, 2400000, 100)),
    // Bat Yam: only 5 in the late period → no trend
    ...range(10).map((i) => deal(`C${i}`, 'בת ים', 2021, 1800000, 90)),
    ...range(5).map((i) => deal(`D${i}`, 'בת ים', 2026, 2000000, 90)),
    deal('Z1', 'חולון', 2024, 0, 100, { includeInPriceStats: false })
];

const facts = computeFacts(deals, options);
const byId = (id) => facts.find((f) => f.id === id);

test('excluded deals are counted but not used in price statistics', () => {
    assert.equal(byId('matched_count').value, 36);
    assert.equal(byId('priced_count').value, 35);
    assert.deepEqual(byId('priced_count').excludedIds, ['Z1']);
});

test('trend uses the same periods for every city and needs the minimum in both', () => {
    const holon = byId('city:חולון:change');
    assert.equal(holon.enoughData, true);
    assert.equal(holon.value, 20);
    assert.deepEqual(holon.from.period, { from: 2021, to: 2023 });
    assert.deepEqual(holon.to.period, { from: 2024, to: 2026 });

    const batYam = byId('city:בת ים:change');
    assert.equal(batYam.enoughData, false);
    assert.equal(batYam.value, null);
    assert.equal(byId('city:בת ים:period:late').n, 5);
});

test('city trends come from all deals, not only the filtered ones', () => {
    const filtered = deals.filter((d) => d.dealId.startsWith('A')).slice(0, 2);
    const withContext = computeFacts(filtered, options, deals);
    assert.equal(withContext.find((f) => f.id === 'matched_count').value, 2);
    assert.equal(withContext.find((f) => f.id === 'city:חולון:change').value, 20);
});

test('no trend when the property type mix changes between periods', () => {
    const mixed = [
        ...range(10).map((i) => deal(`P${i}`, 'ירושלים', 2022, 9000000, 100, { propertyType: 'פנטהאוז' })),
        ...range(10).map((i) => deal(`Q${i}`, 'ירושלים', 2025, 4500000, 100, { propertyType: 'דירה' }))
    ];
    const change = computeFacts(mixed, options).find((f) => f.id === 'city:ירושלים:change');
    assert.equal(change.enoughData, false);
    assert.equal(change.notComparableReason, 'property_type_mix_changed');
    assert.equal(change.value, null);
});

test('text with numbers from the facts passes', () => {
    const result = validateExplanation({
        text: 'בחולון המחיר החציוני למ"ר עלה ב-20% בין 2021–2023 ל-2024–2026, לפי 10 ו-10 עסקאות.',
        usedFactIds: ['city:חולון:change']
    }, facts);
    assert.equal(result.valid, true, result.reasons.join('; '));
});

test('an invented number is rejected', () => {
    const result = validateExplanation({
        text: 'בחולון המחירים צפויים לעלות ב-35% בשנה הבאה.',
        usedFactIds: ['city:חולון:change']
    }, facts);
    assert.equal(result.valid, false);
});

test('saying a group has not enough data is allowed', () => {
    const result = validateExplanation({
        text: 'בבת ים אין מספיק עסקאות כדי להשוות בין 2021–2023 ל-2024–2026 (נדרשות לפחות 10 בכל תקופה).',
        usedFactIds: ['city:בת ים:change']
    }, facts);
    assert.equal(result.valid, true, result.reasons.join('; '));
});

test('a percentage for a group without enough data is rejected', () => {
    const result = validateExplanation({
        text: 'בבת ים המחירים עלו ב-11%.',
        usedFactIds: ['city:בת ים:change']
    }, facts);
    assert.equal(result.valid, false);
});

test('a percentage taken from a period value, not a published change, is rejected', () => {
    // 10 is the n of a period — a number that exists, but not as a change
    const result = validateExplanation({
        text: 'בחולון המחיר עלה ב-10%.',
        usedFactIds: ['city:חולון:change']
    }, facts);
    assert.equal(result.valid, false);
});

test('an unknown fact id is rejected', () => {
    const result = validateExplanation({ text: 'טקסט', usedFactIds: ['made_up'] }, facts);
    assert.equal(result.valid, false);
});

test('facts sent to the model are trimmed to what the explanation can use', () => {
    const { factsForModel } = require('../src/services/llm.service');
    const trimmed = factsForModel(facts, { cities: [] });
    assert(!trimmed.some((f) => f.type === 'city_period_price_per_sqm'));
    assert(!trimmed.some((f) => f.dealIds));
    assert(trimmed.some((f) => f.id === 'city:חולון:change'));        // published
    assert(!trimmed.some((f) => f.id === 'city:בת ים:change'));       // not comparable, not selected
    assert.equal(trimmed.find((f) => f.id === 'cities_without_fair_comparison').value, 1);
    assert(factsForModel(facts, { cities: ['בת ים'] }).some((f) => f.id === 'city:בת ים:change'));
});

test('mojibake or non-Hebrew text is rejected even when its numbers are correct (real Sonnet output)', () => {
    const { looksLikeHebrew } = require('../src/services/grounding.service');
    assert.equal(looksLikeHebrew('ื‘ืขืกืงืื•ืช ื”ืืœื” ืœื ื ืžืฆืืข ื“ื™ืจื•ืช 3'), false);
    assert.equal(looksLikeHebrew('בעסקאות האלה, 19 עסקאות בתל אביב-יפו'), true);
});
