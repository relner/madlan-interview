const crypto = require('crypto');
const LlmCache = require('../models/LlmCache');
const { llmCacheTtlSeconds } = require('../helpers/configuration');
const logger = require('../utils/logger');

// Same input must always give the same key: sort object keys before hashing.
function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

// Normalize free text so trivial differences hit the same cache entry.
function normalizeText(text) {
    return text
        .normalize('NFC')
        .toLowerCase()
        .replace(/[״"׳'`.,!?]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function makeKey(kind, payload) {
    return `${kind}:${crypto.createHash('sha256').update(stableStringify(payload)).digest('hex')}`;
}

// A cache failure must never break a request: on error behave as a miss.
async function get(kind, payload) {
    try {
        const doc = await LlmCache.findOneAndUpdate(
            { key: makeKey(kind, payload), expiresAt: { $gt: new Date() } },
            { $inc: { hits: 1 } },
            { new: true }
        ).lean();
        return doc ? doc.value : null;
    } catch (error) {
        logger.warn({ err: error.message }, 'cache get failed');
        return null;
    }
}

async function set(kind, payload, value) {
    try {
        await LlmCache.updateOne(
            { key: makeKey(kind, payload) },
            { $set: { kind, value, expiresAt: new Date(Date.now() + llmCacheTtlSeconds * 1000) } },
            { upsert: true }
        );
    } catch (error) {
        logger.warn({ err: error.message }, 'cache set failed');
    }
}

module.exports = { get, set, makeKey, normalizeText, stableStringify };
