const { test } = require('node:test');
const assert = require('node:assert/strict');
const { applyAnswer, cleanAnswered } = require('../src/services/conversation.service');
const { QUESTIONS } = require('../src/utils/questionBank');
const { emptyFilters } = require('../src/validators/filters.validators');

const allowed = {
    cities: ['חולון', 'נתניה'],
    propertyTypes: ['בית פרטי', 'דופלקס', 'דירה', 'דירת גג', 'דירת גן', 'פנטהאוז']
};
const empty = () => ({ ...emptyFilters, cities: [], neighborhoods: [], propertyTypes: [] });

test('a quick reply is applied by code', () => {
    const r = applyAnswer('purpose', 'live', empty(), allowed);
    assert.equal(r.filters.purpose, 'live');
    assert.equal(r.slot, 'purpose');
});

test('"apartment" means every type except a private house', () => {
    const r = applyAnswer('kind', 'apartment', empty(), allowed);
    assert.deepEqual(r.filters.propertyTypes, ['דופלקס', 'דירה', 'דירת גג', 'דירת גן', 'פנטהאוז']);
});

test('"לא משנה" changes no filter but marks the slot answered', () => {
    const r = applyAnswer('budget', 'any', empty(), allowed);
    assert.deepEqual(r.filters, empty());
    assert.equal(r.slot, 'budget');
});

test('city options must exist in the data', () => {
    assert.deepEqual(applyAnswer('city', 'city:נתניה', empty(), allowed).filters.cities, ['נתניה']);
    assert.equal(applyAnswer('city', 'city:Atlantis', empty(), allowed), null);
});

test('unknown questions and options are rejected', () => {
    assert.equal(applyAnswer('nope', 'live', empty(), allowed), null);
    assert.equal(applyAnswer('purpose', 'nope', empty(), allowed), null);
});

test('answered slots are cleaned to known ids', () => {
    assert.deepEqual(cleanAnswered(['city', 'city', 'hack', 7]), ['city']);
});

test('the bank asks in a fixed order and skips filled slots', () => {
    const f = { ...empty(), purpose: 'live', priceMax: 2000000 };
    const next = QUESTIONS.find((q) => !q.isFilled(f));
    assert.equal(next.id, 'kind');
    assert(QUESTIONS.find((q) => q.id === 'budget').isFilled(f));
});

test('every welcome example has a unique id, valid filters and known skipped slots', () => {
    const { EXAMPLES } = require('../src/utils/examples');
    const { filtersSchema } = require('../src/validators/filters.validators');
    const ids = new Set();
    for (const e of EXAMPLES) {
        assert(!ids.has(e.id), `duplicate id ${e.id}`);
        ids.add(e.id);
        assert(filtersSchema.partial().safeParse(e.filters).success, `invalid filters in ${e.id}`);
        for (const slot of e.skipped || []) assert(QUESTIONS.some((q) => q.id === slot), `unknown skipped slot ${slot} in ${e.id}`);
    }
});
