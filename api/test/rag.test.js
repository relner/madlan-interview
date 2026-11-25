const { test } = require('node:test');
const assert = require('node:assert');
const http = require('http');

// The rag client must never fail a request: errors and timeouts → no concepts
function withServer(handler, fn) {
    return new Promise((resolve, reject) => {
        const server = http.createServer(handler).listen(0, async () => {
            try {
                resolve(await fn(`http://127.0.0.1:${server.address().port}`));
            } catch (e) {
                reject(e);
            } finally {
                server.close();
            }
        });
    });
}

function loadClient(url, timeoutMs = 300) {
    process.env.RAG_URL = url;
    process.env.RAG_TIMEOUT_MS = String(timeoutMs);
    delete require.cache[require.resolve('../src/helpers/configuration')];
    delete require.cache[require.resolve('../src/services/rag.service')];
    return require('../src/services/rag.service');
}

test('rag: returns the matches and the table version', () => withServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ version: 'v1', matches: [{ id: 'cozy', filters: { sizeMax: 70 } }, { id: 'broken' }] }));
}, async (url) => {
    const result = await loadClient(url).findConcepts('דירה נעימה');
    assert.strictEqual(result.version, 'v1');
    assert.deepStrictEqual(result.matches.map((m) => m.id), ['cozy']);
}));

test('rag: an error status → no concepts', () => withServer((req, res) => {
    res.statusCode = 500;
    res.end('{}');
}, async (url) => {
    assert.deepStrictEqual((await loadClient(url).findConcepts('x')).matches, []);
}));

test('rag: a slow service is cut by the timeout', () => withServer((req, res) => {
    setTimeout(() => res.end('{}'), 2000);
}, async (url) => {
    const startedAt = Date.now();
    const result = await loadClient(url, 200).findConcepts('x');
    assert.deepStrictEqual(result.matches, []);
    assert.ok(Date.now() - startedAt < 1000);
}));

test('rag: turned off with an empty RAG_URL', async () => {
    assert.deepStrictEqual((await loadClient('').findConcepts('x')).matches, []);
});
