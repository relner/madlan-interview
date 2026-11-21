const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    normalizeCity, normalizeNeighborhood, parseNumber, parseBoolean, parseDealDate, normalizeRow, resolveDeals
} = require('../src/utils/dealNormalize');

const baseRow = {
    deal_id: 'D1', city: 'חולון', neighborhood: 'נאות רחל ', street: 'בן גוריון', property_type: '  דירה ',
    rooms: '4 חדרים', size_sqm: '100', floor: '3', total_floors: '8', year_built: '2000', condition: 'שמור',
    has_elevator: 'yes', has_parking: '', has_balcony: '1', has_safe_room: 'לא',
    deal_date: '13/04/2024', price_nis: '₪2,500,000', price_per_sqm: '25000', source: 'רשות המסים'
};

test('city aliases map to one canonical name', () => {
    for (const alias of ['ת"א', 'Tel Aviv-Yafo', 'תל אביב יפו', 'תל אביב']) {
        assert.equal(normalizeCity(alias), 'תל אביב-יפו');
    }
    assert.equal(normalizeCity('ב"ש'), 'באר שבע');
    assert.equal(normalizeCity('ירושלים '), 'ירושלים');
    assert.equal(normalizeCity('Jerusalem'), 'ירושלים');
});

test('neighborhood spelling variants are merged', () => {
    assert.equal(normalizeNeighborhood('Florentin'), 'פלורנטין');
    assert.equal(normalizeNeighborhood('רמב"ש א\''), "רמת בית שמש א'");
    assert.equal(normalizeNeighborhood('רמת בית שמש ג'), "רמת בית שמש ג'");
    assert.equal(normalizeNeighborhood('מרכז '), 'מרכז העיר');
    assert.equal(normalizeNeighborhood('נווה צדק'), 'נווה צדק');
});

test('numbers with commas, currency and Hebrew units', () => {
    assert.equal(parseNumber('₪12,144,000'), 12144000);
    assert.equal(parseNumber('3.5 חדרים'), 3.5);
    assert.equal(parseNumber(''), null);
});

test('booleans: every spelling, empty is unknown', () => {
    for (const v of ['כן', 'TRUE', '1', 'yes']) assert.equal(parseBoolean(v), true);
    for (const v of ['לא', 'FALSE', '0', 'no']) assert.equal(parseBoolean(v), false);
    assert.equal(parseBoolean(''), null);
});

test('dates: ISO, day/month/year, month-only keeps month precision', () => {
    assert.equal(parseDealDate('2025-09-07').date.toISOString().slice(0, 10), '2025-09-07');
    assert.equal(parseDealDate('13/04/2024').date.toISOString().slice(0, 10), '2024-04-13');
    assert.equal(parseDealDate('23.07.2021').date.toISOString().slice(0, 10), '2021-07-23');
    const month = parseDealDate('Aug 2025');
    assert.equal(month.precision, 'month');
    assert.equal(month.date.toISOString().slice(0, 10), '2025-08-01');
    assert.equal(parseDealDate('31/02/2024').date, null);
});

test('row normalization keeps unknowns as null and the raw row', () => {
    const d = normalizeRow(baseRow);
    assert.equal(d.rooms, 4);
    assert.equal(d.propertyType, 'דירה');
    assert.equal(d.neighborhood, 'נאות רחל');
    assert.equal(d.hasParking, null);
    assert(d.qualityFlags.includes('unknown_parking'));
    assert.equal(d.pricePerSqmCalculated, 25000);
    assert.equal(d.raw, baseRow);
});

test('zero price is kept but excluded from statistics', () => {
    const d = normalizeRow({ ...baseRow, price_nis: '0', price_per_sqm: '0' });
    assert.equal(d.includeInPriceStats, false);
    assert(d.qualityFlags.includes('zero_price'));
});

test('implausibly low price (real case: 18,000 NIS for 132 sqm) is kept but excluded from statistics', () => {
    const d = normalizeRow({ ...baseRow, price_nis: '18000', price_per_sqm: '0' });
    assert.equal(d.includeInPriceStats, false);
    assert(d.qualityFlags.includes('implausible_price'));
});

test('price per sqm mismatch is flagged, not corrected', () => {
    const d = normalizeRow({ ...baseRow, price_per_sqm: '30000' });
    assert(d.qualityFlags.includes('price_per_sqm_mismatch'));
    assert.equal(d.pricePerSqmReported, 30000);
    assert.equal(d.pricePerSqmCalculated, 25000);
});

test('"new from developer" in an old building is flagged only', () => {
    const d = normalizeRow({ ...baseRow, condition: 'חדש מקבלן', year_built: '1950' });
    assert(d.qualityFlags.includes('new_condition_old_building'));
    assert.equal(d.condition, 'חדש מקבלן');
    assert.equal(d.includeInPriceStats, true);
});

test('exact duplicates merge; differently spelled booleans still count as identical', () => {
    const rows = [normalizeRow(baseRow), normalizeRow({ ...baseRow, has_elevator: 'כן' })];
    const { deals, report } = resolveDeals(rows);
    assert.equal(deals.length, 1);
    assert.equal(deals[0].duplicateCount, 2);
    assert.deepEqual(report.exactDuplicatesMerged, ['D1']);
});

test('same deal, different source only → one deal with both sources', () => {
    const rows = [normalizeRow(baseRow), normalizeRow({ ...baseRow, source: 'מתווך' })];
    const { deals } = resolveDeals(rows);
    assert.equal(deals.length, 1);
    assert.deepEqual(deals[0].sources, ['רשות המסים', 'מתווך']);
});

test('same deal, different price → both kept, flagged and excluded', () => {
    const rows = [normalizeRow(baseRow), normalizeRow({ ...baseRow, source: 'מתווך', price_nis: '2,400,000' })];
    const { deals, report } = resolveDeals(rows);
    assert.equal(deals.length, 2);
    for (const d of deals) {
        assert(d.qualityFlags.includes('price_conflict'));
        assert.equal(d.includeInPriceStats, false);
        assert.equal(d.conflictWith.length, 1);
    }
    assert.equal(report.priceConflicts.length, 1);
});
