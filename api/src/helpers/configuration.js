module.exports.port = process.env.PORT || 3000;
module.exports.mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/madlan';
module.exports.logLevel = process.env.LOG_LEVEL || 'info';
module.exports.nodeEnv = process.env.NODE_ENV || 'development';

// LLM. The API key is read by the SDK from ANTHROPIC_API_KEY.
// One model per task, chosen by measurement (WORK_PLAN.md 8.4):
//  - parse: Sonnet 5.5 — the buyer waits for it, and a missed field costs an extra question.
//    Haiku lost the budget in 1 of 4 multi-condition sentences.
//  - explain: Haiku 5.5 — ~15× cheaper than Sonnet; its output passes the grounding,
//    advice-basis and language checks, and is cached by filters.
// LLM_MODEL overrides both (e.g. to compare models).
module.exports.llmParseModel = process.env.LLM_PARSE_MODEL || process.env.LLM_MODEL || 'claude-sonnet-5-5';
module.exports.llmExplainModel = process.env.LLM_EXPLAIN_MODEL || process.env.LLM_MODEL || 'claude-haiku-5-5';
// Parsing blocks the user (the form waits for it), so it gets a short limit.
// The explanation loads after the results are already on screen, so it can wait longer.
// List prices, USD per 1M tokens: input, output, cache read, cache write (5-minute TTL).
// Used for the per-request cost shown in the UI token counter and in the logs. Check before the presentation.
module.exports.modelPrices = {
    'claude-haiku-5-5': { input: 0.10, output: 0.50, cacheRead: 0.01, cacheWrite: 0.125 },
    'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.10, cacheWrite: 2.5 },
    'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.20, cacheWrite: 5 }
};

module.exports.llmParseTimeoutMs = Number(process.env.LLM_PARSE_TIMEOUT_MS || 8000);
module.exports.llmExplainTimeoutMs = Number(process.env.LLM_EXPLAIN_TIMEOUT_MS || 20000);
module.exports.llmCacheTtlSeconds = Number(process.env.LLM_CACHE_TTL_SECONDS || 604800);
// Stored advice (collection 'advice') lives 24 hours: the same filters within a day get it without a model call
module.exports.adviceTtlSeconds = Number(process.env.ADVICE_TTL_SECONDS || 86400);

// Buyer-vocabulary retrieval (rag service). Empty RAG_URL turns it off.
// Short timeout: it runs before the parse call, which the buyer is already waiting for.
module.exports.ragUrl = process.env.RAG_URL === undefined ? 'http://rag:4000' : process.env.RAG_URL;
module.exports.ragTimeoutMs = Number(process.env.RAG_TIMEOUT_MS || 1500);
// Salt for the buyer hash sent with learned wishes (rag counts different buyers, never sees an IP).
// Set your own in .env: with the default, a hash of an IPv4 address could be reversed by trying them all.
module.exports.voterSalt = process.env.VOTER_SALT || 'madlan-default-voter-salt';

module.exports.rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
module.exports.rateLimitMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 20);
module.exports.messageMaxLength = Number(process.env.MESSAGE_MAX_LENGTH || 500);

module.exports.minSampleSize = Number(process.env.MIN_SAMPLE_SIZE || 5);

// Trends: every city is compared over the same two periods, with at least this many deals in each.
// Same periods → cities are comparable with each other; minimum sample → no "trend" from a handful of deals.
module.exports.trendPeriods = [
    { id: 'early', from: 2021, to: 2023 },
    { id: 'late', from: 2024, to: 2026 }
];
module.exports.minTrendSampleSize = Number(process.env.MIN_TREND_SAMPLE_SIZE || 10);

// Everything computeFacts needs, in one object for the controllers
module.exports.factsOptions = {
    minSampleSize: module.exports.minSampleSize,
    trendPeriods: module.exports.trendPeriods,
    minTrendSampleSize: module.exports.minTrendSampleSize
};
