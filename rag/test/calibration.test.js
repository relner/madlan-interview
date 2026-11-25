// Runs the real embedding model on buyer sentences (≈ 5 s). Skipped when the model is not downloaded
// (npm run download-model). If the threshold or the model changes, this test shows what it costs.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const concepts = require('../data/concepts');
const { embed } = require('../src/services/embedding.service');
const { windows, rank } = require('../src/services/retrieval.service');
const { minScore, maxResults, modelCacheDir } = require('../src/helpers/configuration');

const CASES = [
    ['מחפש דירה נעימה בחולון', ['cozy']],
    ['משהו קטן וחמוד לגור לבד', ['cozy']],
    ['רוצה לגור קרוב לים עד 3 מיליון', ['near-sea']],
    ['איפה אפשר למצוא שכונה לא יקרה', ['cheap-area']],
    ['אני רוצה דירה להשקעה', ['investment']],
    ['מחפשים להשקיע בנדל"ן ולהשכיר', ['investment']],
    ['אנחנו משפחה עם שני ילדים, צריך מקום', ['family']],
    ['זוג צעירים, דירה ראשונה, תקציב 1.8', ['young-couple']],
    ['דירה מרווחת ליד הים', ['spacious', 'near-sea']],
    ['דירה עם גינה לכלב שלנו', ['garden']],
    ['לאמא שלי, בלי מדרגות', ['accessible']],
    ['מקום שקט עם פארקים לילדים', ['quiet-green']],
    // Plain requests must match nothing: the filters are already explicit
    ['דירת 4 חדרים בחולון עם חניה עד 3 מיליון', []],
    ['יש לי 2 מיליון, מה אפשר לקנות?', []],
    ['בית בפתח תקווה', []],
    ['כמה עולה דירה ברמת גן', []],
    ['למגורים', []]
];

const modelReady = fs.existsSync(path.join(modelCacheDir, 'Xenova'));

test('calibration: buyer sentences find their concepts and plain requests find none', { skip: !modelReady && 'model not downloaded' }, async () => {
    const index = [];
    for (const c of concepts) index.push({ concept: c, vectors: await embed(c.examples) });
    const failures = [];
    for (const [text, expected] of CASES) {
        const texts = windows(text);
        const found = rank(index, await embed(texts), texts, { minScore, maxResults }).map((m) => m.concept.id);
        if (JSON.stringify([...found].sort()) !== JSON.stringify([...expected].sort())) failures.push(`${text}: expected ${expected}, got ${found}`);
    }
    assert.deepStrictEqual(failures, []);
});
