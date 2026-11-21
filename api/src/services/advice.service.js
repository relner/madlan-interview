// Advice facts: comparisons computed by code, from which the LLM picks the ones that matter for this buyer
// and phrases a recommendation ("worth checking X, because …"). WORK_PLAN.md 7, "Advice".
//
// Same contract as facts.service: every advice fact has an id, a value, n and the deal ids, and the
// grounding check validates the recommendation against them. Code decides what is true; the LLM decides
// what is relevant and how to say it.
//
//  1. budget fit     — where this budget actually bought what the buyer wants (and what it costs in their city)
//  2. nearby cheaper — nearby cities where the same money buys more area
//  3. offer check    — where a price the buyer was offered falls among similar closed deals
//  4. by purpose     — live: where this budget bought the largest homes; invest: the cities with the largest
//                      past price growth (history, not a forecast)

const { median, computeCityTrends } = require('./facts.service');
const { NEARBY_CITIES } = require('../utils/nearbyCities');

const MAX_BUDGET_CITIES = 3;
const MAX_NEARBY = 3;
const MAX_PURPOSE_CITIES = 3;
// Similar deals for the offer check: same city and property type, rooms ±0.5, area ±15%
const OFFER_ROOMS_TOLERANCE = 0.5;
const OFFER_SIZE_TOLERANCE = 0.15;

const round = (v) => (v === null ? null : Math.round(v));
const round1 = (v) => Math.round(v * 10) / 10;

// Same rules as search.service buildDealQuery, as a predicate over loaded deals.
// `ignore` lists filter groups to skip: 'city' (cities + neighborhoods), 'price', 'rooms', 'size', 'features'.
function matchesFilters(deal, filters, ignore = []) {
    const skip = new Set(ignore);
    const inRange = (v, min, max) => (min === null || (v !== null && v >= min)) && (max === null || (v !== null && v <= max));

    if (!skip.has('city')) {
        if (filters.cities.length && !filters.cities.includes(deal.city)) return false;
        if (filters.neighborhoods.length && !filters.neighborhoods.includes(deal.neighborhood)) return false;
    }
    if (filters.propertyTypes.length && !filters.propertyTypes.includes(deal.propertyType)) return false;
    if (!skip.has('rooms') && !inRange(deal.rooms, filters.roomsMin, filters.roomsMax)) return false;
    if (!skip.has('size') && !inRange(deal.sizeSqm, filters.sizeMin, filters.sizeMax)) return false;
    if (!skip.has('price') && !inRange(deal.priceNis, filters.priceMin, filters.priceMax)) return false;
    if (!skip.has('features')) {
        if (filters.requireParking && deal.hasParking !== true) return false;
        if (filters.requireElevator && deal.hasElevator !== true) return false;
        if (filters.requireSafeRoom && deal.hasSafeRoom !== true) return false;
        if (filters.requireBalcony && deal.hasBalcony !== true) return false;
    }
    return true;
}

function groupBy(list, key) {
    const map = new Map();
    for (const item of list) {
        const k = item[key];
        if (!k) continue;
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(item);
    }
    return map;
}

// 1. Budget fit. Only when the buyer gave a budget.
function budgetFacts(priced, filters, minSampleSize) {
    if (filters.priceMax === null) return [];
    const facts = [];

    // Where this budget (with the buyer's rooms / type / must-haves) bought the most homes, ignoring the city
    const inBudget = priced.filter((d) => matchesFilters(d, filters, ['city']));
    const byCity = [...groupBy(inBudget, 'city').entries()]
        .filter(([, list]) => list.length >= minSampleSize)
        .sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b))
        .slice(0, MAX_BUDGET_CITIES);

    for (const [city, list] of byCity) {
        facts.push({
            id: `budget:city:${city}`,
            type: 'budget_city',
            label: `Deals in ${city} that match the buyer's budget and criteria (any city)`,
            city,
            value: list.length,
            n: list.length,
            enoughData: true,
            details: {
                medianPrice: round(median(list.map((d) => d.priceNis))),
                medianSizeSqm: round(median(list.map((d) => d.sizeSqm).filter(Boolean)))
            },
            dealIds: list.map((d) => d.dealId)
        });
    }

    // In the buyer's own city: what homes like this actually cost, and how many fit the budget
    for (const city of filters.cities) {
        const sameKind = priced.filter((d) => d.city === city && matchesFilters(d, { ...filters, cities: [city] }, ['price']));
        if (!sameKind.length) continue;
        const withinBudget = sameKind.filter((d) => d.priceNis <= filters.priceMax).length;
        facts.push({
            id: `budget:selected:${city}`,
            type: 'budget_selected',
            label: `Homes like the buyer wants in ${city}, any price: median price, and how many were within the budget`,
            city,
            value: round(median(sameKind.map((d) => d.priceNis))),
            n: sameKind.length,
            enoughData: sameKind.length >= minSampleSize,
            details: { withinBudget },
            dealIds: sameKind.map((d) => d.dealId)
        });
    }
    return facts;
}

// 2. Nearby cities with a lower price per sqm. Only when exactly one city is selected.
// Price per sqm already normalizes area, so only the property type filter applies (otherwise too few deals).
function nearbyFacts(priced, filters, minSampleSize) {
    if (filters.cities.length !== 1) return [];
    const city = filters.cities[0];
    const neighbours = NEARBY_CITIES[city];
    if (!neighbours) return [];

    const ppsqm = (c) => {
        const list = priced.filter((d) => d.city === c && d.pricePerSqmCalculated
            && (!filters.propertyTypes.length || filters.propertyTypes.includes(d.propertyType)));
        return { value: round(median(list.map((d) => d.pricePerSqmCalculated))), n: list.length, dealIds: list.map((d) => d.dealId) };
    };

    const base = ppsqm(city);
    if (base.n < minSampleSize) return [];

    const cheaper = neighbours
        .map((c) => ({ city: c, ...ppsqm(c) }))
        .filter((x) => x.n >= minSampleSize && x.value < base.value)
        .sort((a, b) => a.value - b.value)
        .slice(0, MAX_NEARBY);
    if (!cheaper.length) return [];

    return [
        {
            id: `nearby:base:${city}`,
            type: 'city_price_per_sqm',
            label: `Median price per sqm in ${city} (the buyer's city), all years`,
            city,
            value: base.value,
            n: base.n,
            enoughData: true,
            dealIds: base.dealIds
        },
        ...cheaper.map((x) => ({
            id: `nearby:${x.city}`,
            type: 'nearby_city',
            label: `Median price per sqm in ${x.city}, near ${city}, all years. cheaperPct: how much lower than ${city}; moreAreaRatio: how many times more area the same money bought`,
            city: x.city,
            nearTo: city,
            value: x.value,
            n: x.n,
            enoughData: true,
            details: {
                cheaperPct: Math.round((1 - x.value / base.value) * 100),
                moreAreaRatio: round1(base.value / x.value)
            },
            dealIds: x.dealIds
        }))
    ];
}

// 3. Offer check: the buyer was offered a specific home at a price.
// Needs a city and rooms; area narrows the comparison when known.
function offerFacts(priced, filters, minSampleSize) {
    if (filters.offerPrice === null || filters.offerPrice === undefined || !filters.cities.length || filters.roomsMin === null) return [];

    const roomsFrom = filters.roomsMin - OFFER_ROOMS_TOLERANCE;
    const roomsTo = (filters.roomsMax ?? filters.roomsMin) + OFFER_ROOMS_TOLERANCE;
    const size = filters.sizeMin ?? filters.sizeMax;

    const similar = priced.filter((d) =>
        filters.cities.includes(d.city)
        && (!filters.propertyTypes.length || filters.propertyTypes.includes(d.propertyType))
        && d.rooms !== null && d.rooms >= roomsFrom && d.rooms <= roomsTo
        && (size === null || (d.sizeSqm && Math.abs(d.sizeSqm - size) / size <= OFFER_SIZE_TOLERANCE)));

    const prices = similar.map((d) => d.priceNis);
    const cheaperCount = prices.filter((p) => p < filters.offerPrice).length;

    return [{
        id: 'offer:check',
        type: 'offer_check',
        label: `Price the buyer was offered, compared with similar closed deals (same city and type, rooms ±${OFFER_ROOMS_TOLERANCE}${size !== null ? `, area ±${OFFER_SIZE_TOLERANCE * 100}%` : ''}). cheaperCount / cheaperPct: similar deals that closed below the offer`,
        city: filters.cities.join(', '),
        value: filters.offerPrice,
        n: similar.length,
        enoughData: similar.length >= minSampleSize,
        details: similar.length ? {
            medianPrice: round(median(prices)),
            cheaperCount,
            cheaperPct: Math.round((cheaperCount / similar.length) * 100),
            minPrice: Math.min(...prices),
            maxPrice: Math.max(...prices)
        } : {},
        criteria: { roomsFrom, roomsTo, sizeSqm: size },
        dealIds: similar.map((d) => d.dealId)
    }];
}

// 4a. Purpose "live": for this budget and criteria, the cities where the homes were the largest.
// Needs a budget. The city filter is ignored: the point is where else the money buys more space.
function liveFacts(priced, filters, minSampleSize) {
    if (filters.purpose !== 'live' || filters.priceMax === null) return [];
    const inBudget = priced.filter((d) => d.sizeSqm && matchesFilters(d, filters, ['city']));
    return [...groupBy(inBudget, 'city').entries()]
        .filter(([, list]) => list.length >= minSampleSize)
        .map(([city, list]) => ({ city, list, size: median(list.map((d) => d.sizeSqm)) }))
        .sort((a, b) => b.size - a.size || a.city.localeCompare(b.city))
        .slice(0, MAX_PURPOSE_CITIES)
        .map(({ city, list, size }, i) => ({
            id: `live:area:${city}`,
            type: 'live_most_area',
            label: `Purpose live: median area of homes in ${city} within the buyer's budget and criteria; rank ${i + 1} = largest`,
            city,
            value: round(size),
            n: list.length,
            enoughData: true,
            details: { rank: i + 1, medianPrice: round(median(list.map((d) => d.priceNis))) },
            dealIds: list.map((d) => d.dealId)
        }));
}

// 4b. Purpose "invest": the cities with the largest past change in median price per sqm (same fixed periods
// as the trend table, only published changes: enough deals in both periods and a comparable property mix).
// Trends use all deals of the city (a filtered search rarely has enough for a fair comparison); how many
// deals fit the buyer's budget is added, so the advice stays practical.
function investFacts(priced, filters, options) {
    if (filters.purpose !== 'invest') return [];
    const growth = computeCityTrends(priced, options)
        .filter((f) => f.type === 'city_change_pct' && f.enoughData && f.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, MAX_PURPOSE_CITIES);

    return growth.map((f, i) => {
        const details = { rank: i + 1, changePct: f.value, fromPricePerSqm: f.from.value, toPricePerSqm: f.to.value };
        if (filters.priceMax !== null) {
            details.withinBudget = priced.filter((d) => d.city === f.city && matchesFilters(d, { ...filters, cities: [f.city] })).length;
        }
        return {
            id: `invest:growth:${f.city}`,
            type: 'invest_growth',
            label: `Purpose invest: past change in median price per sqm in ${f.city}, ${f.from.period.from}–${f.from.period.to} vs ${f.to.period.from}–${f.to.period.to}; rank ${i + 1} = largest growth. History, not a forecast`,
            city: f.city,
            value: f.value,
            n: f.n,
            enoughData: true,
            details,
            from: f.from,
            to: f.to,
            dealIds: []
        };
    });
}

function computeAdvice(filters, allDeals, options) {
    const { minSampleSize } = options;
    const priced = allDeals.filter((d) => d.includeInPriceStats && d.priceNis > 0);
    return [
        ...liveFacts(priced, filters, minSampleSize),
        ...investFacts(priced, filters, options),
        ...offerFacts(priced, filters, minSampleSize),
        ...budgetFacts(priced, filters, minSampleSize),
        ...nearbyFacts(priced, filters, minSampleSize)
    ];
}

module.exports = { computeAdvice, matchesFilters };
