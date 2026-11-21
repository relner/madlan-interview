// Pure functions that turn one raw CSV row into a normalized deal.
// No I/O here, so every rule is covered by unit tests (test/dealNormalize.test.js).
// Rules are documented in WORK_PLAN.md section 5.

// Raw label → canonical city. Built from the actual values in the file.
// Assumption (documented): "מודיעין" and "מודיעין מכבים רעות" are the same city — same neighborhoods in the data.
const CITY_ALIASES = {
    'תל אביב': 'תל אביב-יפו',
    'תל אביב יפו': 'תל אביב-יפו',
    'תל אביב-יפו': 'תל אביב-יפו',
    'ת"א': 'תל אביב-יפו',
    'tel aviv-yafo': 'תל אביב-יפו',
    'jerusalem': 'ירושלים',
    'באר-שבע': 'באר שבע',
    'ב"ש': 'באר שבע',
    'בית-שמש': 'בית שמש',
    'מודיעין': 'מודיעין-מכבים-רעות',
    'מודיעין מכבים רעות': 'מודיעין-מכבים-רעות'
};

// Neighborhood spelling variants found in the data (same city in every case).
// Assumption (documented): "מרכז" and "מרכז העיר" both mean the city center.
const NEIGHBORHOOD_ALIASES = {
    'florentin': 'פלורנטין',
    'רמת בית שמש א': "רמת בית שמש א'",
    'רמת בית שמש ג': "רמת בית שמש ג'",
    'רמב"ש א\'': "רמת בית שמש א'",
    'רמב"ש ג\'': "רמת בית שמש ג'",
    'מרכז': 'מרכז העיר'
};

const TRUE_VALUES = ['כן', 'true', '1', 'yes'];
const FALSE_VALUES = ['לא', 'false', '0', 'no'];

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

const NEW_CONDITION = 'חדש מקבלן';
// "New from developer" with a building older than this many years before the deal is flagged
const NEW_CONDITION_MAX_AGE_YEARS = 5;
const PRICE_PER_SQM_TOLERANCE = 0.02;

function cleanText(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).replace(/\s+/g, ' ').trim();
    return text === '' ? null : text;
}

function normalizeCity(value) {
    const text = cleanText(value);
    if (!text) return null;
    return CITY_ALIASES[text.toLowerCase()] || CITY_ALIASES[text] || text;
}

function normalizeNeighborhood(value) {
    const text = cleanText(value);
    if (!text) return null;
    return NEIGHBORHOOD_ALIASES[text.toLowerCase()] || text;
}

// "3,054,000", "₪1,884,000", "2 חדרים", "3.5" → number; empty → null
function parseNumber(value) {
    const text = cleanText(value);
    if (!text) return null;
    const cleaned = text.replace(/[₪,\s]/g, '').replace(/[^\d.\-]/g, '');
    if (cleaned === '') return null;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : null;
}

// Empty → null: unknown is not "no"
function parseBoolean(value) {
    const text = cleanText(value);
    if (!text) return null;
    const lower = text.toLowerCase();
    if (TRUE_VALUES.includes(lower)) return true;
    if (FALSE_VALUES.includes(lower)) return false;
    return null;
}

// Supported: 2025-09-07, 13/04/2024, 23.07.2021 (day/month/year — confirmed by the data:
// the first part is sometimes > 12, the second never), "Aug 2025" (month precision).
function parseDealDate(value) {
    const text = cleanText(value);
    if (!text) return { date: null, precision: null };

    let m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return dayDate(+m[1], +m[2], +m[3]);

    m = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    if (m) return dayDate(+m[3], +m[2], +m[1]);

    m = text.match(/^([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
    if (m && MONTHS[m[1].toLowerCase()] !== undefined) {
        return { date: new Date(Date.UTC(+m[2], MONTHS[m[1].toLowerCase()], 1)), precision: 'month' };
    }

    return { date: null, precision: null };
}

function dayDate(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    // Reject impossible dates such as 31/02
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return { date: null, precision: null };
    }
    return { date, precision: 'day' };
}

function normalizeRow(raw) {
    const { date, precision } = parseDealDate(raw.deal_date);
    const priceNis = parseNumber(raw.price_nis);
    const sizeSqm = parseNumber(raw.size_sqm);
    const pricePerSqmReported = parseNumber(raw.price_per_sqm);

    const deal = {
        dealId: cleanText(raw.deal_id),
        city: normalizeCity(raw.city),
        neighborhood: normalizeNeighborhood(raw.neighborhood),
        street: cleanText(raw.street),
        propertyType: cleanText(raw.property_type),
        rooms: parseNumber(raw.rooms),
        sizeSqm,
        floor: parseNumber(raw.floor),
        totalFloors: parseNumber(raw.total_floors),
        yearBuilt: parseNumber(raw.year_built),
        condition: cleanText(raw.condition),
        hasElevator: parseBoolean(raw.has_elevator),
        hasParking: parseBoolean(raw.has_parking),
        hasBalcony: parseBoolean(raw.has_balcony),
        hasSafeRoom: parseBoolean(raw.has_safe_room),
        dealDate: date,
        dealDatePrecision: precision,
        dealYear: date ? date.getUTCFullYear() : null,
        priceNis,
        pricePerSqmReported,
        pricePerSqmCalculated: priceNis > 0 && sizeSqm > 0 ? Math.round(priceNis / sizeSqm) : null,
        source: cleanText(raw.source),
        qualityFlags: [],
        includeInPriceStats: true,
        exclusionReason: null,
        raw
    };
    deal.sources = deal.source ? [deal.source] : [];

    addRowFlags(deal);
    return deal;
}

const MIN_PLAUSIBLE_PRICE = 100000;

// Flags that depend on a single row. Cross-row flags (duplicates, conflicts) are added by the seed.
function addRowFlags(deal) {
    const flag = (name) => deal.qualityFlags.push(name);

    if (!deal.dealDate) flag('invalid_date');
    if (deal.dealDatePrecision === 'month') flag('month_precision_date');
    if (deal.sizeSqm === null) flag('missing_size');
    if (deal.hasParking === null) flag('unknown_parking');

    if (deal.priceNis === null || deal.priceNis <= 0) {
        flag('zero_price');
        exclude(deal, 'Price is missing or zero');
    }
    // Found on real data: D100317 in Rehovot, 4.5 rooms / 132 sqm for 18,000 NIS (136 NIS per sqm).
    // No home in the dataset sells below this, so such a price is a typo or a non-market transfer.
    else if (deal.priceNis < MIN_PLAUSIBLE_PRICE) {
        flag('implausible_price');
        exclude(deal, `Price below ${MIN_PLAUSIBLE_PRICE} NIS is not a market price`);
    }

    if (deal.pricePerSqmCalculated && deal.pricePerSqmReported) {
        const diff = Math.abs(deal.pricePerSqmReported - deal.pricePerSqmCalculated) / deal.pricePerSqmCalculated;
        if (diff > PRICE_PER_SQM_TOLERANCE) flag('price_per_sqm_mismatch');
    }

    if (deal.condition === NEW_CONDITION && deal.yearBuilt && deal.dealYear
        && deal.yearBuilt < deal.dealYear - NEW_CONDITION_MAX_AGE_YEARS) {
        flag('new_condition_old_building');
    }

    if (deal.floor !== null && deal.totalFloors !== null && deal.floor > deal.totalFloors) {
        flag('floor_above_total_floors');
    }
}

function exclude(deal, reason) {
    deal.includeInPriceStats = false;
    deal.exclusionReason = deal.exclusionReason ? `${deal.exclusionReason}; ${reason}` : reason;
}

// Fields that describe the property and the deal itself. Used to compare versions of the same deal_id.
const COMPARABLE_FIELDS = [
    'city', 'neighborhood', 'street', 'propertyType', 'rooms', 'sizeSqm', 'floor', 'totalFloors',
    'yearBuilt', 'condition', 'hasElevator', 'hasParking', 'hasBalcony', 'hasSafeRoom'
];

function versionKey(deal, { withPrice = true, withSource = true } = {}) {
    const fields = [...COMPARABLE_FIELDS, 'dealDate', 'dealDatePrecision'];
    if (withPrice) fields.push('priceNis', 'pricePerSqmReported');
    if (withSource) fields.push('source');
    return JSON.stringify(fields.map((f) => (deal[f] instanceof Date ? deal[f].toISOString() : deal[f])));
}

// Cross-row rules:
//  1. Rows identical after normalization (including source) → one deal, duplicateCount kept.
//  2. Same deal_id, everything equal except the source → one deal with several sources.
//  3. Same deal_id, different price → keep every version, flag 'price_conflict', exclude from price stats.
//  4. Same deal_id, other fields differ → keep every version, flag 'version_conflict', exclude from price stats.
function resolveDeals(rows) {
    const report = { exactDuplicatesMerged: [], sourcesMerged: [], priceConflicts: [], versionConflicts: [] };

    // 1. exact duplicates
    const unique = new Map();
    for (const deal of rows) {
        const key = `${deal.dealId}|${versionKey(deal)}`;
        if (unique.has(key)) {
            const kept = unique.get(key);
            kept.duplicateCount += 1;
            if (!kept.qualityFlags.includes('exact_duplicate_merged')) kept.qualityFlags.push('exact_duplicate_merged');
            report.exactDuplicatesMerged.push(deal.dealId);
        } else {
            deal.duplicateCount = 1;
            unique.set(key, deal);
        }
    }

    // 2–4. versions of the same deal_id
    const byId = new Map();
    for (const deal of unique.values()) {
        if (!byId.has(deal.dealId)) byId.set(deal.dealId, []);
        byId.get(deal.dealId).push(deal);
    }

    const result = [];
    for (const [dealId, versions] of byId) {
        if (versions.length === 1) {
            result.push(versions[0]);
            continue;
        }

        const sameExceptSource = new Set(versions.map((v) => versionKey(v, { withSource: false }))).size === 1;
        if (sameExceptSource) {
            const merged = versions[0];
            merged.sources = [...new Set(versions.flatMap((v) => v.sources))];
            merged.qualityFlags.push('multiple_sources_agree');
            report.sourcesMerged.push(dealId);
            result.push(merged);
            continue;
        }

        const sameExceptPrice = new Set(versions.map((v) => versionKey(v, { withPrice: false, withSource: false }))).size === 1;
        const flagName = sameExceptPrice ? 'price_conflict' : 'version_conflict';
        const reason = sameExceptPrice
            ? 'Conflicting prices between sources for the same deal_id'
            : 'Conflicting versions of the same deal_id';

        for (const v of versions) {
            v.qualityFlags.push(flagName);
            exclude(v, reason);
            v.conflictWith = versions.filter((o) => o !== v).map((o) => ({ source: o.source, priceNis: o.priceNis }));
            result.push(v);
        }

        (sameExceptPrice ? report.priceConflicts : report.versionConflicts).push({
            dealId,
            versions: versions.map((v) => ({ source: v.source, priceNis: v.priceNis }))
        });
    }

    return { deals: result, report };
}

module.exports = {
    CITY_ALIASES,
    NEIGHBORHOOD_ALIASES,
    cleanText,
    normalizeCity,
    normalizeNeighborhood,
    parseNumber,
    parseBoolean,
    parseDealDate,
    normalizeRow,
    resolveDeals
};
