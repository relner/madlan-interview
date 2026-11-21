const { z } = require('zod');

// One filter contract for the whole app (WORK_PLAN.md 8.2):
// the form sends it, the LLM fills it, the search service reads it.
// null always means "not specified / don't care".
const filtersSchema = z.object({
    purpose: z.enum(['live', 'invest']).nullable(),
    cities: z.array(z.string()),
    neighborhoods: z.array(z.string()),
    propertyTypes: z.array(z.string()),
    roomsMin: z.number().nullable(),
    roomsMax: z.number().nullable(),
    sizeMin: z.number().nullable(),
    sizeMax: z.number().nullable(),
    priceMin: z.number().nullable(),
    priceMax: z.number().nullable(),
    // A price the buyer was offered for a specific home. Not a search filter: it is compared with similar deals.
    offerPrice: z.number().nullable(),
    // true = must have; null = don't care. "Must not have" is not a real buyer need, so there is no false.
    requireParking: z.boolean().nullable(),
    requireElevator: z.boolean().nullable(),
    requireSafeRoom: z.boolean().nullable(),
    requireBalcony: z.boolean().nullable()
});

const emptyFilters = Object.freeze({
    purpose: null,
    cities: [],
    neighborhoods: [],
    propertyTypes: [],
    roomsMin: null,
    roomsMax: null,
    sizeMin: null,
    sizeMax: null,
    priceMin: null,
    priceMax: null,
    offerPrice: null,
    requireParking: null,
    requireElevator: null,
    requireSafeRoom: null,
    requireBalcony: null
});

const RANGES = {
    rooms: [1, 12],
    size: [10, 1000],
    price: [100000, 100000000]
};

function inRange(value, [min, max]) {
    return value === null || (Number.isFinite(value) && value >= min && value <= max);
}

// Checks values against what actually exists in the data.
// Returns the clean filters plus the list of fields that were dropped, so the UI can ask the user about them.
function sanitizeFilters(input, allowed) {
    const parsed = filtersSchema.partial().safeParse(input || {});
    if (!parsed.success) {
        return { filters: { ...emptyFilters }, rejected: ['*'] };
    }

    const filters = { ...emptyFilters, ...parsed.data };
    const rejected = [];

    const keepAllowed = (field, allowedList) => {
        const valid = filters[field].filter((v) => allowedList.includes(v));
        if (valid.length !== filters[field].length) rejected.push(field);
        filters[field] = valid;
    };

    if (allowed) {
        keepAllowed('cities', allowed.cities);
        keepAllowed('neighborhoods', allowed.neighborhoods);
        keepAllowed('propertyTypes', allowed.propertyTypes);
    }

    for (const [minKey, maxKey, range] of [
        ['roomsMin', 'roomsMax', RANGES.rooms],
        ['sizeMin', 'sizeMax', RANGES.size],
        ['priceMin', 'priceMax', RANGES.price]
    ]) {
        for (const key of [minKey, maxKey]) {
            if (!inRange(filters[key], range)) {
                rejected.push(key);
                filters[key] = null;
            }
        }
        if (filters[minKey] !== null && filters[maxKey] !== null && filters[minKey] > filters[maxKey]) {
            rejected.push(minKey, maxKey);
            filters[minKey] = null;
            filters[maxKey] = null;
        }
    }

    if (!inRange(filters.offerPrice, RANGES.price)) {
        rejected.push('offerPrice');
        filters.offerPrice = null;
    }

    for (const key of ['requireParking', 'requireElevator', 'requireSafeRoom', 'requireBalcony']) {
        if (filters[key] === false) filters[key] = null;
    }

    return { filters, rejected: [...new Set(rejected)] };
}

// Express middleware for endpoints that receive filters from the form
module.exports.validateFilters = function (req, res, next) {
    const parsed = filtersSchema.partial().safeParse(req.body.filters || {});
    if (!parsed.success) {
        return res.status(400).json({ message: 'filters are invalid', issues: parsed.error.issues });
    }
    req.body.filters = { ...emptyFilters, ...parsed.data };
    next();
};

module.exports.filtersSchema = filtersSchema;
module.exports.emptyFilters = emptyFilters;
module.exports.sanitizeFilters = sanitizeFilters;
