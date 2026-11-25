const crypto = require('crypto');
const Concept = require('../models/Concept');
const logger = require('../utils/logger');
const { embed } = require('./embedding.service');
const { windows, rank } = require('./retrieval.service');
const { embeddingModel, minScore, maxResults } = require('../helpers/configuration');

// In-memory index of the concepts table. The table is small (tens of rows), so a linear scan of the
// vectors is faster and simpler than a vector database; Mongo keeps the vectors so a restart does not re-embed.

// Enabled concepts: what a message is searched against
let index = [];
// Every row, including learned candidates not enabled yet: what a new wish is compared with
let all = [];
// Changes whenever the table changes: the API puts it in its parse cache key
let version = 'empty';

const hashOf = (examples) => crypto.createHash('sha256').update(JSON.stringify(examples)).digest('hex').slice(0, 16);

async function reload() {
    const docs = await Concept.find({}).select('+embeddings').sort({ conceptId: 1 }).lean();
    const nextAll = [];
    for (const doc of docs) {
        const hash = hashOf(doc.examples);
        let vectors = doc.embeddings;
        if (!vectors || doc.examplesHash !== hash || doc.embeddingModel !== embeddingModel || vectors.length !== doc.examples.length) {
            vectors = await embed(doc.examples);
            await Concept.updateOne({ _id: doc._id }, { $set: { embeddings: vectors, examplesHash: hash, embeddingModel } });
            logger.info({ conceptId: doc.conceptId, examples: doc.examples.length }, 'concept embedded');
        }
        nextAll.push({ doc, concept: publicConcept(doc), vectors });
    }
    all = nextAll;
    const next = nextAll.filter((e) => e.doc.enabled && e.doc.meaning && Object.keys(e.doc.filters || {}).length);
    index = next.map(({ concept, vectors }) => ({ concept, vectors }));
    version = crypto.createHash('sha256')
        .update(JSON.stringify(next.map(({ concept }) => concept)) + embeddingModel + minScore)
        .digest('hex').slice(0, 12);
    return { concepts: index.length, version };
}

function publicConcept(doc) {
    return {
        id: doc.conceptId,
        title: doc.title,
        examples: doc.examples,
        meaning: doc.meaning,
        filters: doc.filters,
        basis: doc.basis
    };
}

async function search(text) {
    if (!index.length) return { version, matches: [] };
    const texts = windows(text);
    const vectors = await embed(texts);
    const matches = rank(index, vectors, texts, { minScore, maxResults }).map(({ concept, score, matchedText, example }) => {
        const { examples, ...rest } = concept;
        return { ...rest, score: Math.round(score * 1000) / 1000, matchedText, example };
    });
    return { version, matches };
}

const status = () => ({ concepts: index.length, candidates: all.length - index.length, version });
const allEntries = () => all;

module.exports = { reload, search, status, allEntries, hashOf };
