module.exports.port = Number(process.env.PORT || 4000);
module.exports.mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/madlan';
module.exports.logLevel = process.env.LOG_LEVEL || 'info';

// Local multilingual embedding model (Hebrew included), run on CPU inside this container:
// no API key, no per-request cost, no network at request time. Downloaded at image build (npm run download-model).
module.exports.embeddingModel = process.env.EMBEDDING_MODEL || 'Xenova/multilingual-e5-small';
module.exports.modelCacheDir = process.env.MODEL_CACHE_DIR || require('path').join(__dirname, '../../models');

// A concept is returned only above this cosine similarity (calibrated by test/calibration.test.js: real matches 0.955–0.998, the strongest noise 0.944)
module.exports.minScore = Number(process.env.RAG_MIN_SCORE || 0.95);
module.exports.maxResults = Number(process.env.RAG_MAX_RESULTS || 3);
// How the service learns about table changes — by events, no polling:
//  - learned wishes are written by this service itself, which refreshes its copy right away;
//  - the seed calls POST /concepts/reload when it finishes;
//  - after a hand edit in the database: call POST /concepts/reload, or restart.
// RAG_RELOAD_INTERVAL_MS > 0 turns on a periodic re-read as well (off by default).
module.exports.reloadIntervalMs = Number(process.env.RAG_RELOAD_INTERVAL_MS || 0);
// A learned wish is enabled when this many different buyers got exactly the same reading
module.exports.minVotes = Number(process.env.RAG_MIN_VOTES || 3);
// Where the seed sends the reload call (the running service on the docker network)
module.exports.serviceUrl = process.env.RAG_SERVICE_URL || 'http://rag:4000';
