const { test } = require('node:test');
const assert = require('node:assert');
const { vote, filtersKey } = require('../src/services/learning.service');
const { describeFilters } = require('../src/utils/describeFilters');

test('filtersKey: key and array order do not matter', () => {
    assert.strictEqual(filtersKey({ sizeMax: 70, cities: ['חיפה', 'אשדוד'] }), filtersKey({ cities: ['אשדוד', 'חיפה'], sizeMax: 70 }));
    assert.notStrictEqual(filtersKey({ sizeMax: 70 }), filtersKey({ sizeMax: 80 }));
});

test('vote: enabled only when 3 different buyers got the same reading', () => {
    let state = vote([], { sizeMin: 100 }, 'a', 3);
    assert.strictEqual(state.promote, null);
    state = vote(state.interpretations, { sizeMin: 100 }, 'a', 3);   // the same buyer again: not counted
    assert.strictEqual(state.interpretations[0].voters.length, 1);
    state = vote(state.interpretations, { sizeMin: 120 }, 'b', 3);   // a different reading: its own count
    state = vote(state.interpretations, { sizeMin: 100 }, 'c', 3);
    assert.strictEqual(state.promote, null);
    state = vote(state.interpretations, { sizeMin: 100 }, 'd', 3);
    assert.deepStrictEqual(state.promote, { sizeMin: 100 });
    assert.strictEqual(state.interpretations.length, 2);
});

test('vote: does not change the list it was given', () => {
    const before = [{ key: filtersKey({ sizeMin: 100 }), filters: { sizeMin: 100 }, voters: ['a'] }];
    vote(before, { sizeMin: 100 }, 'b', 3);
    assert.deepStrictEqual(before[0].voters, ['a']);
});

test('describeFilters: Hebrew meaning written by code', () => {
    assert.strictEqual(describeFilters({ sizeMin: 100, requireBalcony: true }), '100 מ״ר לפחות, עם מרפסת (חובה)');
    assert.strictEqual(describeFilters({ propertyTypes: ['דירת גן'], cities: ['רעננה'] }), 'דירת גן, ברעננה');
    assert.strictEqual(describeFilters({ roomsMin: 2, roomsMax: 3 }), '2–3 חדרים');
});
