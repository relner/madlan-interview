const Advice = require('../models/Advice');
const logger = require('../utils/logger');
const { makeKey } = require('./cache.service');
const { adviceTtlSeconds, llmExplainModel } = require('../helpers/configuration');
const { PROMPT_VERSIONS } = require('./llm.service');

// Stored advice per filters (24 hours). Same filters → the stored advice, no model call.
// The key includes the prompt version and the model, so a prompt change never serves old advice.
// A database failure must never break a request: on error behave as "nothing stored".

function keyFor(filters) {
    return makeKey('advice', { prompt: PROMPT_VERSIONS.explain, filters });
}

async function find(filters) {
    try {
        const doc = await Advice.findOneAndUpdate(
            { key: keyFor(filters), expiresAt: { $gt: new Date() } },
            { $inc: { hits: 1 }, $set: { lastServedAt: new Date() } },
            { new: true }
        ).lean();
        return doc ? doc.explanation : null;
    } catch (error) {
        logger.warn({ err: error.message }, 'advice find failed');
        return null;
    }
}

async function save(filters, explanation, usage) {
    try {
        await Advice.updateOne(
            { key: keyFor(filters) },
            {
                $set: {
                    filters,
                    explanation,
                    model: llmExplainModel,
                    promptVersion: PROMPT_VERSIONS.explain,
                    usage,
                    expiresAt: new Date(Date.now() + adviceTtlSeconds * 1000)
                },
                $setOnInsert: { hits: 0 }
            },
            { upsert: true }
        );
    } catch (error) {
        logger.warn({ err: error.message }, 'advice save failed');
    }
}

module.exports = { find, save };
