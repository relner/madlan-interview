// Applies buyer-vocabulary concepts (rag service) to the model's changes.
//
// Code applies them, not the model: in testing, Sonnet applied concepts like "עד 70 מ״ר" but kept asking
// about concepts that are a list of cities ("אזור לא יקר"), even when told to apply them. The model only
// decides two things: which retrieved concepts the message does not really express (ignored), and
// explicit values, which win ("ליד הים בנתניה" → the model sets ["נתניה"], the coastal list is not used).
//
// A null from the model does not clear a concept field: the model often returns nulls for fields it did not touch.

const isSet = (v) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length);

function applyConcepts(changes, vocabulary, ignoredIds = []) {
    const ignored = new Set(ignoredIds);
    const applied = [];
    const result = { ...(changes || {}) };
    for (const concept of vocabulary) {
        if (ignored.has(concept.id)) continue;
        // Only fields the model did not set explicitly; a concept that adds nothing is not shown as applied
        const fields = Object.entries(concept.filters || {}).filter(([field]) => !isSet(result[field]));
        if (!fields.length) continue;
        for (const [field, value] of fields) result[field] = value;
        applied.push(concept);
    }
    return { changes: result, applied };
}

// The model's new wishes, cleaned before they become votes: only fields a wish may define, and only values
// the data has. Price is personal ("עד 2 מיליון"), not the meaning of a word, so it is never learned.
const LEARNABLE = ['purpose', 'cities', 'neighborhoods', 'propertyTypes', 'roomsMin', 'roomsMax', 'sizeMin', 'sizeMax',
    'requireParking', 'requireElevator', 'requireSafeRoom', 'requireBalcony'];

// wishes: [{ phrase, fields }] from the model; the values come from its changes
function cleanWishes(wishes, changes, sanitize) {
    return (wishes || []).flatMap(({ phrase, fields }) => {
        // 2–4 words, no numbers: the rag service searches 2–4-word windows; "4 חדרים" is a filter, not a wish
        const words = typeof phrase === 'string' ? phrase.trim().split(/\s+/).filter(Boolean) : [];
        if (words.length < 2 || words.length > 4 || /\d/.test(phrase)) return [];
        const asked = Object.fromEntries((fields || [])
            .filter((k) => LEARNABLE.includes(k) && isSet(changes?.[k]))
            .map((k) => [k, changes[k]]));
        if (!Object.keys(asked).length) return [];
        const { filters: clean, rejected } = sanitize(asked);
        if (rejected.length) return [];
        const kept = Object.fromEntries(Object.keys(asked).map((k) => [k, clean[k]]).filter(([, v]) => isSet(v)));
        return Object.keys(kept).length ? [{ phrase: phrase.trim(), filters: kept }] : [];
    });
}

module.exports = { applyConcepts, cleanWishes };
