// Pure retrieval logic, no model and no database: easy to test.
//
// Why windows: a whole message ("רוצה לגור קרוב לים עד 3 מיליון") is pulled toward its other parts and scored
// near unrelated concepts. Its 2–4 word windows contain the wish itself ("קרוב לים"), which matches an example
// at ~0.99. Single words are left out: "דירה" or "עם" alone scored up to 0.95 against everything.
const MIN_WINDOW = 2;
const MAX_WINDOW = 4;
const MAX_WINDOWS = 120;

function windows(text) {
    const words = String(text)
        .replace(/[^\p{L}\p{N}"'״׳.\s-]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean);
    const result = new Set([words.join(' ')]);
    for (let n = MIN_WINDOW; n <= MAX_WINDOW; n++) {
        for (let i = 0; i + n <= words.length; i++) result.add(words.slice(i, i + n).join(' '));
    }
    return [...result].filter(Boolean).slice(0, MAX_WINDOWS);
}

const dot = (a, b) => {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s;
};

// index: [{ concept, vectors: [[...]] }]; queryVectors: one per window
// → concepts whose closest example is above minScore, best first, with the window that matched
function rank(index, queryVectors, queryTexts, { minScore, maxResults }) {
    const matches = [];
    for (const { concept, vectors } of index) {
        let best = { score: -1, matchedText: null, example: null };
        vectors.forEach((v, ei) => {
            queryVectors.forEach((q, qi) => {
                const score = dot(v, q);
                if (score > best.score) best = { score, matchedText: queryTexts[qi], example: concept.examples[ei] };
            });
        });
        if (best.score >= minScore) matches.push({ concept, ...best });
    }
    return matches.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

module.exports = { windows, rank, dot };
