const crypto = require('crypto');
const Concept = require('../models/Concept');
const logger = require('../utils/logger');
const { embed } = require('./embedding.service');
const { dot } = require('./retrieval.service');
const indexService = require('./index.service');
const { describeFilters } = require('../utils/describeFilters');
const { embeddingModel, minScore, minVotes } = require('../helpers/configuration');

// The table grows by itself from buyers' messages.
//
// The parse model reports the vague wishes it met that no concept covers ("דירה מוארת") and how it read
// them as filters. Each wish is compared with every row, enabled or not (local embeddings, no tokens):
//  - close to an enabled concept → nothing to learn (the model should have been given it);
//  - close to a candidate → one more vote for this reading;
//  - new → a new candidate, disabled.
// A candidate is enabled when MIN_VOTES different buyers got exactly the same reading: one buyer cannot
// enable a row alone, and a reading the model gives inconsistently never becomes a definition.
// The meaning shown to buyers is written by code from the filters (utils/describeFilters.js).

const MAX_EXAMPLES = 10;

// Same filters → same key, whatever the key or array order
function filtersKey(filters) {
    const sorted = {};
    for (const k of Object.keys(filters).sort()) {
        const v = filters[k];
        sorted[k] = Array.isArray(v) ? [...v].sort() : v;
    }
    return JSON.stringify(sorted);
}

// Pure: adds a vote, returns the new interpretations and the filters to enable (or null)
function vote(interpretations, filters, voter, votesNeeded) {
    const key = filtersKey(filters);
    const list = (interpretations || []).map((i) => ({ ...i, voters: [...i.voters] }));
    let entry = list.find((i) => i.key === key);
    if (!entry) {
        entry = { key, filters, voters: [] };
        list.push(entry);
    }
    if (!entry.voters.includes(voter)) entry.voters.push(voter);
    return { interpretations: list, promote: entry.voters.length >= votesNeeded ? entry.filters : null };
}

function closest(vector) {
    let best = { score: -1, entry: null };
    for (const entry of indexService.allEntries()) {
        for (const v of entry.vectors) {
            const score = dot(v, vector);
            if (score > best.score) best = { score, entry };
        }
    }
    return best;
}

async function learnOne({ phrase, filters }, voter) {
    const [vector] = await embed([phrase]);
    const { score, entry } = closest(vector);

    if (entry && score >= minScore) {
        const { doc } = entry;
        if (doc.enabled) return 'covered';
        const { interpretations, promote } = vote(doc.interpretations, filters, voter, minVotes);
        const update = { $set: { interpretations }, $inc: { hits: 1 } };
        if (!doc.examples.includes(phrase) && doc.examples.length < MAX_EXAMPLES) {
            const examples = [...doc.examples, phrase];
            update.$set.examples = examples;
            update.$set.embeddings = [...entry.vectors, vector];
            update.$set.examplesHash = indexService.hashOf(examples);
        }
        if (promote) Object.assign(update.$set, enableFields(doc.title, promote));
        await Concept.updateOne({ _id: doc._id }, update);
        if (promote) logger.info({ conceptId: doc.conceptId, filters: promote }, 'learned concept enabled');
        return promote ? 'enabled' : 'voted';
    }

    const { interpretations, promote } = vote([], filters, voter, minVotes);
    const conceptId = `learned-${crypto.createHash('sha256').update(phrase).digest('hex').slice(0, 10)}`;
    await Concept.updateOne({ conceptId }, {
        $setOnInsert: {
            conceptId,
            title: phrase,
            examples: [phrase],
            embeddings: [vector],
            examplesHash: indexService.hashOf([phrase]),
            embeddingModel,
            basis: 'learned',
            source: 'llm',
            enabled: false,
            interpretations,
            hits: 1,
            ...(promote ? enableFields(phrase, promote) : {})
        }
    }, { upsert: true });
    logger.info({ conceptId, phrase, filters }, 'learned concept candidate');
    return 'created';
}

function enableFields(title, filters) {
    return { enabled: true, filters, meaning: `פירשנו "${title}" כ: ${describeFilters(filters)}`, enabledAt: new Date() };
}

// One at a time: two messages with the same new wish must not create two candidates
let queue = Promise.resolve();

function learn(wishes, voter) {
    const run = queue.then(async () => {
        const results = [];
        for (const wish of wishes) results.push(await learnOne(wish, voter));
        // Writes go through this service, so it refreshes its own copy right away: no polling needed
        if (results.some((r) => r !== 'covered')) await indexService.reload();
        return results;
    });
    queue = run.catch(() => {});
    return run;
}

module.exports = { learn, vote, filtersKey };
