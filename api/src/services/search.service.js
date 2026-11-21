const Deal = require('../models/Deal');

const RESULT_LIMIT = 50;

// Filters → Mongo query. Pure function, so it is covered by unit tests.
function buildDealQuery(filters) {
    const query = {};

    if (filters.cities.length) query.city = { $in: filters.cities };
    if (filters.neighborhoods.length) query.neighborhood = { $in: filters.neighborhoods };
    if (filters.propertyTypes.length) query.propertyType = { $in: filters.propertyTypes };

    const range = (min, max) => {
        const r = {};
        if (min !== null) r.$gte = min;
        if (max !== null) r.$lte = max;
        return Object.keys(r).length ? r : null;
    };

    const rooms = range(filters.roomsMin, filters.roomsMax);
    if (rooms) query.rooms = rooms;

    const size = range(filters.sizeMin, filters.sizeMax);
    if (size) query.sizeSqm = size;

    const price = range(filters.priceMin, filters.priceMax);
    if (price) query.priceNis = { ...price, $gt: 0 };

    // "Must have" matches only deals where the feature is known to exist; unknown values do not pass.
    if (filters.requireParking) query.hasParking = true;
    if (filters.requireElevator) query.hasElevator = true;
    if (filters.requireSafeRoom) query.hasSafeRoom = true;
    if (filters.requireBalcony) query.hasBalcony = true;

    return query;
}

async function searchDeals(filters) {
    const query = buildDealQuery(filters);
    const [deals, total] = await Promise.all([
        Deal.find(query).select('-raw').sort({ dealDate: -1 }).lean(),
        Deal.countDocuments(query)
    ]);
    return { deals, total, shown: deals.slice(0, RESULT_LIMIT) };
}

// Allowed values for the form dropdowns and for checking LLM output.
// The data is static, so it is loaded once per process.
let allowedValuesCache = null;

async function getAllowedValues() {
    if (allowedValuesCache) return allowedValuesCache;

    const [cities, neighborhoods, propertyTypes] = await Promise.all([
        Deal.distinct('city'),
        Deal.distinct('neighborhood'),
        Deal.distinct('propertyType')
    ]);

    const neighborhoodsByCity = {};
    const pairs = await Deal.aggregate([
        { $match: { neighborhood: { $ne: null } } },
        { $group: { _id: { city: '$city', neighborhood: '$neighborhood' } } }
    ]);
    for (const { _id } of pairs) {
        (neighborhoodsByCity[_id.city] ||= []).push(_id.neighborhood);
    }

    allowedValuesCache = {
        cities: cities.filter(Boolean).sort(),
        neighborhoods: neighborhoods.filter(Boolean).sort(),
        propertyTypes: propertyTypes.filter(Boolean).sort(),
        neighborhoodsByCity
    };
    return allowedValuesCache;
}

// All deals, for city-level trends. Static data → loaded once per process (restart after a seed).
let allDealsCache = null;
async function getAllDeals() {
    if (!allDealsCache) allDealsCache = await Deal.find({}).select('-raw').lean();
    return allDealsCache;
}

module.exports = { buildDealQuery, searchDeals, getAllowedValues, getAllDeals, RESULT_LIMIT };
