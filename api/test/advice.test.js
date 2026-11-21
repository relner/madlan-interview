const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeAdvice, matchesFilters } = require('../src/services/advice.service');
const { validateAdvice } = require('../src/services/grounding.service');
const { emptyFilters } = require('../src/validators/filters.validators');

const options = {
    minSampleSize: 5,
    minTrendSampleSize: 10,
    trendPeriods: [{ id: 'early', from: 2021, to: 2023 }, { id: 'late', from: 2024, to: 2026 }]
};
const range = (n) => Array.from({ length: n }, (_, i) => i + 1);

const deal = (id, city, rooms, price, size, extra = {}) => ({
    dealId: id, city, rooms, priceNis: price, sizeSqm: size, propertyType: 'דירה',
    pricePerSqmCalculated: Math.round(price / size), includeInPriceStats: true, ...extra
});

const deals = [
    // Tel Aviv: 4 rooms around 4.4–4.8M, 80 000 per sqm
    ...range(6).map((i) => deal(`T${i}`, 'תל אביב-יפו', 4, 4000000 + i * 100000, 50 + i)),
    // Bat Yam: 4 rooms 2.3–2.8M, about 25 000 per sqm
    ...range(8).map((i) => deal(`B${i}`, 'בת ים', 4, 2300000 + i * 60000, 100)),
    // Holon: only 3 deals → not enough for advice
    ...range(3).map((i) => deal(`H${i}`, 'חולון', 4, 2000000, 100)),
    // Be'er Sheva: cheap, many deals
    ...range(7).map((i) => deal(`S${i}`, 'באר שבע', 4, 1400000 + i * 10000, 120)),
    deal('X1', 'בת ים', 4, 18000, 100, { includeInPriceStats: false })
];

const filters = (patch) => ({ ...emptyFilters, ...patch });

test('matchesFilters follows the search rules and can ignore a group', () => {
    const d = deal('A', 'חולון', 4, 2000000, 100, { hasParking: null });
    assert.equal(matchesFilters(d, filters({ cities: ['בת ים'] })), false);
    assert.equal(matchesFilters(d, filters({ cities: ['בת ים'] }), ['city']), true);
    assert.equal(matchesFilters(d, filters({ requireParking: true })), false, 'unknown parking does not pass a must-have');
    assert.equal(matchesFilters(d, filters({ priceMax: 1500000 })), false);
});

test('budget fit: cities where the budget bought such homes, and the gap in the buyer\'s city', () => {
    const facts = computeAdvice(filters({ cities: ['תל אביב-יפו'], roomsMin: 4, priceMax: 2600000 }), deals, options);

    const cities = facts.filter((f) => f.type === 'budget_city').map((f) => f.city);
    assert.deepEqual(cities, ['באר שבע', 'בת ים'], 'only cities with enough deals in budget, most deals first');

    const own = facts.find((f) => f.id === 'budget:selected:תל אביב-יפו');
    assert.equal(own.details.withinBudget, 0);
    assert.equal(own.n, 6);
    assert.equal(own.enoughData, true);
});

test('nearby cheaper: only nearby cities with enough deals and a lower price per sqm', () => {
    const facts = computeAdvice(filters({ cities: ['תל אביב-יפו'] }), deals, options);
    const nearby = facts.filter((f) => f.type === 'nearby_city');
    assert.deepEqual(nearby.map((f) => f.city), ['בת ים'], 'Holon has too few deals; Be\'er Sheva is not nearby');
    assert(nearby[0].details.cheaperPct > 0);
    assert(nearby[0].details.moreAreaRatio > 1);
    assert(facts.some((f) => f.id === 'nearby:base:תל אביב-יפו'));
});

test('offer check: share of similar deals that closed below the offer; excluded deals are ignored', () => {
    const [fact] = computeAdvice(filters({ cities: ['בת ים'], roomsMin: 4, offerPrice: 2600000 }), deals, options);
    assert.equal(fact.id, 'offer:check');
    assert.equal(fact.n, 8, 'the 18 000 NIS deal is not compared');
    assert.equal(fact.details.cheaperCount, 4);
    assert.equal(fact.details.cheaperPct, 50);
    assert.equal(fact.enoughData, true);
});

test('offer check needs a city and rooms', () => {
    const facts = computeAdvice(filters({ offerPrice: 2600000 }), deals, options);
    assert.equal(facts.filter((f) => f.type === 'offer_check').length, 0);
});

test('validateAdvice keeps grounded recommendations and drops an invented one', () => {
    const f = filters({ cities: ['בת ים'], roomsMin: 4, offerPrice: 2600000 });
    const facts = computeAdvice(f, deals, options);
    const output = {
        text: 'ב־4 מתוך 8 עסקאות דומות המחיר היה נמוך מההצעה.',
        usedFactIds: ['offer:check'],
        recommendations: [
            { headline: 'יש מקום למשא ומתן', reason: '50% מ־8 העסקאות הדומות נסגרו בפחות מ־2.6 מיליון.', usedFactIds: ['offer:check'] },
            { headline: 'המחירים יעלו', reason: 'צפויה עלייה של 12% בשנה הבאה.', usedFactIds: ['offer:check'] }
        ]
    };
    const { explanation, rejected } = validateAdvice(output, facts, f);
    assert.equal(explanation.text, output.text);
    assert.equal(explanation.recommendations.length, 1);
    assert.equal(explanation.recommendations[0].headline, 'יש מקום למשא ומתן');
    assert.equal(rejected.length, 1);
});

test('a recommendation without an advice fact behind it is dropped (no numbers to check in the reason)', () => {
    const f = filters({ cities: ['בת ים'], roomsMin: 4, offerPrice: 2600000 });
    const facts = [...computeAdvice(f, deals, options), { id: 'city:חולון:change', type: 'city_change_pct', city: 'חולון', value: 5, n: 30, enoughData: true }];
    const output = {
        text: 'השוואה לעסקאות דומות.',
        usedFactIds: [],
        recommendations: [
            { headline: 'כדאי לבדוק ערים סמוכות', reason: 'בערים סמוכות יש יותר דירות במחיר דומה.', usedFactIds: ['city:חולון:change'] },
            { headline: 'כדאי לבדוק את הנכס', reason: 'המחיר באמצע הטווח של העסקאות הדומות.', usedFactIds: ['offer:check'] }
        ]
    };
    const { explanation } = validateAdvice(output, facts, f);
    assert.deepEqual(explanation.recommendations.map((r) => r.headline), ['כדאי לבדוק את הנכס']);
});

test('purpose live: cities where the budget bought the largest homes, largest first', () => {
    const facts = computeAdvice(filters({ purpose: 'live', roomsMin: 4, priceMax: 3000000 }), deals, options);
    const live = facts.filter((f) => f.type === 'live_most_area');
    assert.deepEqual(live.map((f) => f.city), ['באר שבע', 'בת ים'], 'Be\'er Sheva 120 sqm before Bat Yam 100 sqm; Holon has too few deals');
    assert.equal(live[0].value, 120);
    assert.equal(live[0].details.rank, 1);
    assert.equal(computeAdvice(filters({ purpose: 'invest', roomsMin: 4, priceMax: 3000000 }), deals, options)
        .filter((f) => f.type === 'live_most_area').length, 0, 'only for purpose live');
});

test('purpose invest: cities with the largest published past growth, with deals within budget', () => {
    const trendOptions = { minSampleSize: 5, minTrendSampleSize: 10, trendPeriods: [{ id: 'early', from: 2021, to: 2023 }, { id: 'late', from: 2024, to: 2026 }] };
    const city = (prefix, name, early, late, n = 10) => [
        ...range(n).map((i) => deal(`${prefix}E${i}`, name, 3, early * 100, 100, { dealYear: 2022 })),
        ...range(n).map((i) => deal(`${prefix}L${i}`, name, 3, late * 100, 100, { dealYear: 2025 }))
    ];
    const data = [
        ...city('A', 'חולון', 30000, 36000),          // +20%
        ...city('B', 'בת ים', 30000, 33000),          // +10%
        ...city('C', 'נתניה', 30000, 27000),          // −10%: not growth
        ...city('D', 'רחובות', 20000, 40000, 4)       // +100% but too few deals: not published
    ];
    const facts = computeAdvice(filters({ purpose: 'invest', priceMax: 3400000 }), data, trendOptions);
    const growth = facts.filter((f) => f.type === 'invest_growth');
    assert.deepEqual(growth.map((f) => f.city), ['חולון', 'בת ים']);
    assert.equal(growth[0].details.changePct, 20);
    assert.equal(growth[0].details.withinBudget, 10, 'only the early Holon deals (3.0M) fit a 3.4M budget');
});

test('a purpose recommendation passes grounding with its percentage', () => {
    const trendOptions = { minSampleSize: 5, minTrendSampleSize: 10, trendPeriods: [{ id: 'early', from: 2021, to: 2023 }, { id: 'late', from: 2024, to: 2026 }] };
    const data = [
        ...range(10).map((i) => deal(`E${i}`, 'חולון', 3, 3000000, 100, { dealYear: 2022 })),
        ...range(10).map((i) => deal(`L${i}`, 'חולון', 3, 3600000, 100, { dealYear: 2025 }))
    ];
    const f = filters({ purpose: 'invest' });
    const facts = computeAdvice(f, data, trendOptions);
    const output = {
        text: 'בחולון המחיר למ״ר עלה ב־20% בעסקאות האלה.',
        usedFactIds: ['invest:growth:חולון'],
        recommendations: [{ headline: 'שימו לב לחולון', reason: 'כי אתם מחפשים להשקעה, שם הייתה הצמיחה הגבוהה ביותר בעבר.', usedFactIds: ['invest:growth:חולון'] }]
    };
    const { explanation, rejected } = validateAdvice(output, facts, f);
    assert.deepEqual(rejected, []);
    assert.equal(explanation.recommendations.length, 1);
});
