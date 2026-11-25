const { test } = require('node:test');
const assert = require('node:assert');
const concepts = require('../data/concepts');

// Fields of the API filter contract (api/src/validators/filters.validators.js)
const FILTER_FIELDS = ['purpose', 'cities', 'neighborhoods', 'propertyTypes', 'roomsMin', 'roomsMax', 'sizeMin', 'sizeMax',
    'priceMin', 'priceMax', 'offerPrice', 'requireParking', 'requireElevator', 'requireSafeRoom', 'requireBalcony'];

test('concepts: unique ids, examples, a meaning and known filter fields', () => {
    const ids = concepts.map((c) => c.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    for (const c of concepts) {
        assert.ok(c.title && c.meaning, c.id);
        assert.ok(c.examples.length >= 3, `${c.id}: at least 3 examples`);
        assert.ok(Object.keys(c.filters).length, `${c.id}: no filters`);
        for (const field of Object.keys(c.filters)) assert.ok(FILTER_FIELDS.includes(field), `${c.id}: ${field}`);
        assert.ok(['data', 'curated'].includes(c.basis), c.id);
    }
});
