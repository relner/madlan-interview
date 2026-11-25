const { test } = require('node:test');
const assert = require('node:assert');
const { windows, rank } = require('../src/services/retrieval.service');

test('windows: the whole message plus every 2–4 word window, no single words', () => {
    const w = windows('רוצה לגור קרוב לים');
    assert.ok(w.includes('רוצה לגור קרוב לים'));
    assert.ok(w.includes('קרוב לים'));
    assert.ok(w.includes('לגור קרוב לים'));
    assert.ok(!w.includes('לים'));
});

test('windows: punctuation is dropped, numbers and Hebrew quotes kept', () => {
    const w = windows('זוג צעירים, דירה ראשונה! ממ"ד, 3.5 חדרים');
    assert.ok(w.includes('דירה ראשונה'));
    assert.ok(w.includes('ממ"ד 3.5'));
});

test('rank: best example decides, below the threshold is dropped, best first', () => {
    const index = [
        { concept: { id: 'a', examples: ['x', 'y'] }, vectors: [[1, 0], [0.6, 0.8]] },
        { concept: { id: 'b', examples: ['z'] }, vectors: [[0, 1]] },
        { concept: { id: 'c', examples: ['w'] }, vectors: [[-1, 0]] }
    ];
    const result = rank(index, [[0, 1], [1, 0]], ['q1', 'q2'], { minScore: 0.5, maxResults: 3 });
    assert.deepStrictEqual(result.map((m) => m.concept.id), ['a', 'b']);
    assert.strictEqual(result[0].matchedText, 'q2');
    assert.strictEqual(result[0].example, 'x');
});

test('rank: maxResults limits the list', () => {
    const index = ['a', 'b', 'c'].map((id) => ({ concept: { id, examples: ['e'] }, vectors: [[1, 0]] }));
    assert.strictEqual(rank(index, [[1, 0]], ['q'], { minScore: 0.5, maxResults: 2 }).length, 2);
});
