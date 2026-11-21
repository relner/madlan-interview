// Facts are the only numbers the user (and the LLM) ever sees.
// Every fact has a stable id, the value, the number of deals behind it (n) and the deal ids.
// WORK_PLAN.md 8.1.

function median(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round(value) {
    return value === null ? null : Math.round(value);
}

// If the share of any property type differs by more than this between the two periods,
// a change in the median reflects a different mix of apartments, not a change in prices.
// Found on real data: Jerusalem showed −32% only because 5 penthouses were in the early period and none later.
const MAX_PROPERTY_TYPE_MIX_SHIFT = 0.25;

// Largest difference in the share of a property type between two groups (0..1)
function propertyTypeMixShift(a, b) {
    if (!a.length || !b.length) return 1;
    const share = (list) => {
        const counts = {};
        for (const d of list) counts[d.propertyType] = (counts[d.propertyType] || 0) + 1;
        return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / list.length]));
    };
    const sa = share(a);
    const sb = share(b);
    const types = new Set([...Object.keys(sa), ...Object.keys(sb)]);
    return Math.max(...[...types].map((t) => Math.abs((sa[t] || 0) - (sb[t] || 0))));
}

// trendDeals: the deals city trends are computed from. Trends are market context for each city,
// so the controllers pass all deals, not only the ones matching the buyer's rooms / price filters
// (otherwise a filtered search almost never has enough deals for a fair comparison).
function computeFacts(deals, { minSampleSize, trendPeriods, minTrendSampleSize }, trendDeals = deals) {
    const facts = [];
    const priced = deals.filter((d) => d.includeInPriceStats && d.priceNis > 0);

    facts.push({
        id: 'matched_count',
        type: 'count',
        label: 'Deals matching the criteria',
        value: deals.length,
        n: deals.length
    });

    facts.push({
        id: 'priced_count',
        type: 'count',
        label: 'Deals used for price statistics',
        value: priced.length,
        n: priced.length,
        excludedIds: deals.filter((d) => !priced.includes(d)).map((d) => d.dealId)
    });

    if (priced.length) {
        const years = priced.map((d) => d.dealYear).filter(Boolean);
        facts.push({
            id: 'period',
            type: 'period',
            label: 'Period covered',
            value: { from: Math.min(...years), to: Math.max(...years) },
            n: priced.length
        });

        facts.push({
            id: 'median_price',
            type: 'price',
            label: 'Median deal price (NIS)',
            value: round(median(priced.map((d) => d.priceNis))),
            n: priced.length,
            enoughData: priced.length >= minSampleSize,
            dealIds: priced.map((d) => d.dealId)
        });

        const perSqm = priced.filter((d) => d.pricePerSqmCalculated);
        if (perSqm.length) {
            facts.push({
                id: 'median_price_per_sqm',
                type: 'price_per_sqm',
                label: 'Median price per sqm (NIS), calculated from price and area',
                value: round(median(perSqm.map((d) => d.pricePerSqmCalculated))),
                n: perSqm.length,
                enoughData: perSqm.length >= minSampleSize,
                dealIds: perSqm.map((d) => d.dealId)
            });
        }
    }

    const trendPriced = trendDeals.filter((d) => d.includeInPriceStats && d.priceNis > 0);
    facts.push(...computeCityTrends(trendPriced, { trendPeriods, minTrendSampleSize }));

    return facts;
}

// Median price per sqm by city for two fixed periods, and the change between them.
// Every city uses the same periods, so changes are comparable between cities.
// A change is published only when both periods have at least minTrendSampleSize deals.
// Trends are city-level on purpose: neighborhoods have too few deals.
// Limitation (shown to the user): the deals in each period are not the same apartments, and property types are mixed.
function computeCityTrends(priced, { trendPeriods, minTrendSampleSize }) {
    const facts = [];
    const [early, late] = trendPeriods;
    const periodOf = (year) => trendPeriods.find((p) => year >= p.from && year <= p.to);

    const byCity = new Map();
    for (const d of priced) {
        if (!d.city || !d.dealYear || !d.pricePerSqmCalculated) continue;
        const period = periodOf(d.dealYear);
        if (!period) continue;
        if (!byCity.has(d.city)) byCity.set(d.city, Object.fromEntries(trendPeriods.map((p) => [p.id, []])));
        byCity.get(d.city)[period.id].push(d);
    }

    for (const [city, groups] of [...byCity.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const periodFacts = trendPeriods.map((p) => {
            const list = groups[p.id];
            return {
                id: `city:${city}:period:${p.id}`,
                type: 'city_period_price_per_sqm',
                label: `Median price per sqm in ${city}, ${p.from}–${p.to}`,
                city,
                period: { from: p.from, to: p.to },
                value: list.length ? round(median(list.map((d) => d.pricePerSqmCalculated))) : null,
                n: list.length,
                enoughData: list.length >= minTrendSampleSize,
                dealIds: list.map((d) => d.dealId)
            };
        });
        facts.push(...periodFacts);

        const [first, last] = periodFacts;
        const enoughDeals = first.enoughData && last.enoughData;
        const mixShift = propertyTypeMixShift(groups[early.id], groups[late.id]);
        const comparableMix = mixShift <= MAX_PROPERTY_TYPE_MIX_SHIFT;
        const enoughData = enoughDeals && comparableMix;

        let label = `Change in median price per sqm in ${city}, ${early.from}–${early.to} vs ${late.from}–${late.to}`;
        let notComparableReason = null;
        if (!enoughDeals) {
            notComparableReason = 'not_enough_deals';
            label = `Not enough deals in ${city} to compare ${early.from}–${early.to} with ${late.from}–${late.to} (minimum ${minTrendSampleSize} per period)`;
        } else if (!comparableMix) {
            notComparableReason = 'property_type_mix_changed';
            label = `The mix of property types in ${city} differs too much between ${early.from}–${early.to} and ${late.from}–${late.to} to compare prices`;
        }

        facts.push({
            id: `city:${city}:change`,
            type: 'city_change_pct',
            label,
            notComparableReason,
            propertyTypeMixShift: Math.round(mixShift * 100),
            city,
            value: enoughData ? Math.round(((last.value - first.value) / first.value) * 1000) / 10 : null,
            from: { period: first.period, value: first.value, n: first.n },
            to: { period: last.period, value: last.value, n: last.n },
            n: first.n + last.n,
            minSampleSize: minTrendSampleSize,
            enoughData,
            basedOn: [first.id, last.id],
            caveat: 'Different apartments in each period; property types are mixed. Past change, not a forecast.'
        });
    }

    return facts;
}

module.exports = { computeFacts, computeCityTrends, median };
