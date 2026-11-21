// Checks that an LLM explanation only uses numbers that exist in the facts it was given.
// If the check fails, the explanation is dropped and the UI shows the facts alone. WORK_PLAN.md 8.1.

const NUMBER_RE = /\d[\d,]*(?:\.\d+)?/g;

function numbersInText(text) {
    return (text.match(NUMBER_RE) || []).map((s) => Number(s.replace(/,/g, '')));
}

// "20%", "-0.7%", "7.5 %" → 20, 0.7, 7.5
function percentagesInText(text) {
    return [...text.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*%/g)].map((m) => Number(m[1].replace(/,/g, '')));
}

// All numbers a fact allows the text to mention, including common roundings
// (e.g. 2,350,000 may be written as 2.35 million or 2,350 thousand).
function allowedNumbersForFact(fact) {
    const out = [fact.n];
    const push = (v) => {
        if (typeof v !== 'number' || !Number.isFinite(v)) return;
        out.push(v, Math.round(v), Math.abs(v));
        if (Math.abs(v) >= 1e6) {
            out.push(Math.round(v / 1e4) / 100, Math.round(v / 1e5) / 10);
        }
        if (Math.abs(v) >= 1e3) {
            out.push(Math.round(v / 1e3));
        }
    };

    if (fact.value && typeof fact.value === 'object') {
        push(fact.value.from);
        push(fact.value.to);
    } else {
        push(fact.value);
    }
    if (fact.year) push(fact.year);
    if (fact.period) {
        push(fact.period.from);
        push(fact.period.to);
    }
    if (fact.minSampleSize) push(fact.minSampleSize);
    // Advice facts carry extra computed numbers (median area, cheaper share, …)
    for (const v of Object.values(fact.details || {})) push(v);
    for (const side of [fact.from, fact.to]) {
        if (side) {
            push(side.year);
            push(side.value);
            push(side.n);
            if (side.period) {
                push(side.period.from);
                push(side.period.to);
            }
        }
    }
    return out;
}

function numbersFromFilters(filters) {
    if (!filters) return [];
    const keys = ['roomsMin', 'roomsMax', 'sizeMin', 'sizeMax', 'priceMin', 'priceMax', 'offerPrice'];
    return keys.flatMap((k) => {
        const v = filters[k];
        if (typeof v !== 'number') return [];
        return v >= 1e6 ? [v, Math.round(v / 1e4) / 100, Math.round(v / 1e5) / 10] : [v];
    });
}

// Found on real output (Sonnet 5.5): Hebrew came back as mojibake ("ื‘ืขืกืง…" — UTF-8 read as a Thai code page)
// with correct numbers, so the number check passed. Text shown to the buyer must be mostly Hebrew letters.
const HEBREW_RE = /[\u0590-\u05FF]/g;
const LETTER_RE = /\p{L}/gu;
function looksLikeHebrew(text) {
    const letters = (text.match(LETTER_RE) || []).length;
    if (!letters) return true;
    return (text.match(HEBREW_RE) || []).length / letters >= 0.7;
}

function validateExplanation({ text, usedFactIds }, facts, filters) {
    const reasons = [];
    if (!looksLikeHebrew(text || '')) reasons.push('text is not Hebrew (encoding or language problem)');
    const byId = new Map(facts.map((f) => [f.id, f]));

    const used = [];
    for (const id of usedFactIds || []) {
        const fact = byId.get(id);
        if (!fact) reasons.push(`unknown fact id: ${id}`);
        else used.push(fact);
    }

    // Referencing a "not enough data" fact is fine (e.g. to say there is no trend).
    // But any percentage in the text must be a published change (enoughData) — so a trend
    // can never be described with a number from a group that does not support it.
    // Advice facts may also publish a share in their details (e.g. cheaperPct), only when they have enough deals.
    const publishedChanges = [
        ...used
            .filter((f) => f.type === 'city_change_pct' && f.enoughData && typeof f.value === 'number')
            .map((f) => Math.abs(f.value)),
        ...used
            .filter((f) => f.enoughData && f.details)
            .flatMap((f) => Object.entries(f.details).filter(([k, v]) => k.endsWith('Pct') && typeof v === 'number').map(([, v]) => Math.abs(v)))
    ];
    for (const pct of percentagesInText(text || '')) {
        if (!publishedChanges.some((v) => Math.abs(v - pct) <= 0.05)) {
            reasons.push(`percentage not backed by a published change: ${pct}%`);
        }
    }

    const allowed = [...used.flatMap(allowedNumbersForFact), ...numbersFromFilters(filters)];
    for (const num of numbersInText(text || '')) {
        const ok = allowed.some((a) => a === num || (a !== 0 && Math.abs(a - num) / Math.abs(a) <= 0.005));
        if (!ok) reasons.push(`number not found in facts: ${num}`);
    }

    return { valid: reasons.length === 0, reasons };
}

// The summary sentence and each recommendation are checked on their own: one ungrounded
// recommendation is dropped without losing the rest. Returns null when nothing passed.
// A recommendation's reason has no numbers (the facts are shown under it), so the number check alone
// cannot stop a vague or unsupported claim. It must rest on a comparison made for advice — not on general
// search statistics or city trends (found on real output: "check a nearby cheaper city", backed only by
// Netanya's own trend). City trends are shown in their own table.
const ADVICE_FACT_TYPES = new Set(['offer_check', 'budget_selected', 'budget_city', 'nearby_city', 'live_most_area', 'invest_growth']);
function hasAdviceBasis(ids, byId) {
    return (ids || []).some((id) => {
        const f = byId.get(id);
        if (!f || f.enoughData === false) return false;
        return ADVICE_FACT_TYPES.has(f.type);
    });
}

function validateAdvice(output, facts, filters) {
    const byId = new Map(facts.map((f) => [f.id, f]));
    const rejected = [];
    const textCheck = validateExplanation(output, facts, filters);
    if (!textCheck.valid) rejected.push({ part: 'text', reasons: textCheck.reasons });

    const recommendations = [];
    for (const rec of output.recommendations || []) {
        const check = validateExplanation({ text: `${rec.headline} ${rec.reason}`, usedFactIds: rec.usedFactIds }, facts, filters);
        const basis = hasAdviceBasis(rec.usedFactIds, byId);
        if (check.valid && basis) recommendations.push(rec);
        else rejected.push({ part: rec.headline, reasons: check.valid ? ['not based on an advice fact'] : check.reasons });
    }

    const text = textCheck.valid ? output.text : null;
    if (!text && !recommendations.length) return { explanation: null, rejected };
    return {
        explanation: { text, usedFactIds: textCheck.valid ? output.usedFactIds : [], recommendations },
        rejected
    };
}

module.exports = { validateExplanation, validateAdvice, numbersInText, looksLikeHebrew };
