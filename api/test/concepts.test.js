const { test } = require('node:test');
const assert = require('node:assert');
const { applyConcepts } = require('../src/utils/concepts');

const COZY = { id: 'cozy', filters: { sizeMax: 70 } };
const SEA = { id: 'near-sea', filters: { cities: ['נתניה', 'חיפה'] } };

test('concepts: applied on top of the model changes', () => {
    const { changes, applied } = applyConcepts({ priceMax: 2500000 }, [COZY, SEA]);
    assert.deepStrictEqual(changes, { priceMax: 2500000, sizeMax: 70, cities: ['נתניה', 'חיפה'] });
    assert.deepStrictEqual(applied.map((c) => c.id), ['cozy', 'near-sea']);
});

test('concepts: an explicit value from the model wins, and the concept is not shown as applied', () => {
    const { changes, applied } = applyConcepts({ cities: ['נתניה'] }, [SEA]);
    assert.deepStrictEqual(changes.cities, ['נתניה']);
    assert.deepStrictEqual(applied, []);
});

test('concepts: a null or empty list from the model does not clear the concept', () => {
    const { changes } = applyConcepts({ sizeMax: null, cities: [] }, [COZY, SEA]);
    assert.strictEqual(changes.sizeMax, 70);
    assert.deepStrictEqual(changes.cities, ['נתניה', 'חיפה']);
});

test('concepts: ignored by the model → not applied', () => {
    const { changes, applied } = applyConcepts({}, [COZY, SEA], ['near-sea']);
    assert.deepStrictEqual(changes, { sizeMax: 70 });
    assert.deepStrictEqual(applied.map((c) => c.id), ['cozy']);
});

const { cleanWishes } = require('../src/utils/concepts');
const { sanitizeFilters } = require('../src/validators/filters.validators');
const ALLOWED = { cities: ['חיפה', 'רעננה'], neighborhoods: [], propertyTypes: ['דירת גן'], neighborhoodsByCity: {} };
const sanitize = (f) => sanitizeFilters(f, ALLOWED);

test('cleanWishes: keeps the wish fields the data has', () => {
    assert.deepStrictEqual(cleanWishes([{ phrase: ' קרוב לפארק ', fields: ['cities', 'sizeMin'] }], { cities: ['רעננה'], sizeMin: null, roomsMin: 3 }, sanitize),
        [{ phrase: 'קרוב לפארק', filters: { cities: ['רעננה'] } }]);
});

test('cleanWishes: a one-word phrase is not learned (the search could never find it)', () => {
    assert.deepStrictEqual(cleanWishes([{ phrase: 'לסטודנטים', fields: ['roomsMax'] }], { roomsMax: 3 }, sanitize), []);
});

test('cleanWishes: price is never learned, numbers in the phrase are not a wish', () => {
    assert.deepStrictEqual(cleanWishes([{ phrase: 'לא יקר', fields: ['priceMax'] }], { priceMax: 1500000 }, sanitize), []);
    assert.deepStrictEqual(cleanWishes([{ phrase: '4 חדרים', fields: ['roomsMin'] }], { roomsMin: 4 }, sanitize), []);
});

test('cleanWishes: a value the data does not have drops the wish', () => {
    assert.deepStrictEqual(cleanWishes([{ phrase: 'ליד האוניברסיטה', fields: ['cities'] }], { cities: ['אילת'] }, sanitize), []);
});
