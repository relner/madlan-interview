const logger = require('../utils/logger');
const crypto = require('crypto');
const { ragUrl, ragTimeoutMs, voterSalt } = require('../helpers/configuration');

// Client of the rag service: finds the buyer-vocabulary concepts ("דירה נעימה", "אזור לא יקר", "להשקעה")
// that a message expresses. The parse prompt gets them first, as our definition of those words.
//
// Optional by design, like the LLM: on timeout or error the message is parsed without them
// (the model then interprets vague words itself, as before). A failure never fails the request.

const NONE = Object.freeze({ version: null, matches: [], ms: null });

async function findConcepts(text) {
    if (!ragUrl) return NONE;
    const startedAt = Date.now();
    try {
        const response = await fetch(`${ragUrl}/concepts/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
            signal: AbortSignal.timeout(ragTimeoutMs)
        });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const body = await response.json();
        const matches = Array.isArray(body.matches) ? body.matches.filter((m) => m && typeof m.id === 'string' && m.filters) : [];
        return { version: body.version || null, matches, ms: Date.now() - startedAt };
    } catch (error) {
        logger.warn({ err: error.message, ms: Date.now() - startedAt }, 'rag unavailable, parsing without concepts');
        return NONE;
    }
}

// Votes for new table rows: wishes the model met and read as filters. Fire and forget — the buyer never
// waits for it, and a failure only means one vote less.
// voter: a salted hash of the buyer's IP, so one buyer cannot enable a row alone and no IP is stored.
function voterOf(ip) {
    return crypto.createHash('sha256').update(`${voterSalt}:${ip || ''}`).digest('hex').slice(0, 24);
}

function learnWishes(wishes, ip) {
    if (!ragUrl || !wishes.length) return;
    fetch(`${ragUrl}/concepts/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter: voterOf(ip), wishes }),
        signal: AbortSignal.timeout(10000)
    })
        .then((r) => r.json())
        .then((body) => logger.info({ wishes: wishes.map((w) => w.phrase), results: body.results }, 'rag learn'))
        .catch((error) => logger.warn({ err: error.message }, 'rag learn failed'));
}

module.exports = { findConcepts, learnWishes, voterOf };
