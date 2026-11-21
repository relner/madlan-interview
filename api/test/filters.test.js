const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeFilters } = require('../src/validators/filters.validators');
const { buildDealQuery } = require('../src/services/search.service');

const allowed = { cities: ['חולון', 'בת ים'], neighborhoods: [], propertyTypes: ['דירה'] };

test('unknown cities from the LLM are dropped and reported', () => {
    const { filters, rejected } = sanitizeFilters({ cities: ['חולון', 'Atlantis'] }, allowed);
    assert.deepEqual(filters.cities, ['חולון']);
    assert(rejected.includes('cities'));
});

test('impossible ranges are dropped', () => {
    const { filters, rejected } = sanitizeFilters({ roomsMin: 5, roomsMax: 3, priceMax: 5 }, allowed);
    assert.equal(filters.roomsMin, null);
    assert.equal(filters.roomsMax, null);
    assert.equal(filters.priceMax, null);
    assert(rejected.includes('priceMax'));
});

test('"must have" matches only known true values, unknown parking does not pass', () => {
    const { filters } = sanitizeFilters({ requireParking: true, requireElevator: false }, allowed);
    const query = buildDealQuery(filters);
    assert.equal(query.hasParking, true);
    assert.equal(query.hasElevator, undefined);
});

test('price filter never matches zero-price deals', () => {
    const { filters } = sanitizeFilters({ priceMax: 3000000 }, allowed);
    assert.deepEqual(buildDealQuery(filters).priceNis, { $lte: 3000000, $gt: 0 });
});
