const Anthropic = require('@anthropic-ai/sdk');
const { zodOutputFormat } = require('@anthropic-ai/sdk/helpers/zod');
const { z } = require('zod');
const { llmParseModel, llmExplainModel, llmParseTimeoutMs, llmExplainTimeoutMs, modelPrices } = require('../helpers/configuration');
const MODELS = { parse: llmParseModel, explain: llmExplainModel };
const logger = require('../utils/logger');
const { filtersSchema } = require('../validators/filters.validators');

// The SDK reads ANTHROPIC_API_KEY from the environment.
let client = null;
function getClient() {
    if (!client) client = new Anthropic();
    return client;
}

class LlmUnavailableError extends Error {
    constructor(reason, cause) {
        super(`LLM unavailable: ${reason}`);
        this.reason = reason;
        this.cause = cause;
    }
}

// How each model family turns thinking off (Opus 5.5 cannot: effort is its only control)
function thinkingOff(model) {
    if (model.startsWith('claude-haiku')) return { thinking: { type: 'disabled' } };
    if (model.startsWith('claude-sonnet-5')) return { thinking: { type: 'between_tools' } };
    return {};
}

// Hard timeout and no retries — on failure the user gets the fallback immediately (WORK_PLAN.md 8.3).
const requestOptions = (timeoutMs) => ({ timeout: timeoutMs, maxRetries: 0 });

async function callStructured({ kind, system, userContent, schema, timeoutMs }) {
    const model = MODELS[kind];
    let response;
    const startedAt = Date.now();
    try {
        response = await getClient().messages.parse({
            model,
            max_tokens: 2000,
            // Stable instructions first and cached: billed at the cached rate on repeated calls (WORK_PLAN.md 8.4)
            system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: userContent }],
            // Both tasks are short extraction / phrasing over given facts: no thinking needed.
            // Haiku accepts thinking off at effort ≤ high; Opus 5.5 cannot turn it off (effort is its only control).
            ...thinkingOff(model),
            output_config: {
                effort: 'low',
                format: zodOutputFormat(schema)
            }
        }, requestOptions(timeoutMs));
    } catch (error) {
        const reason = error instanceof Anthropic.APIConnectionTimeoutError ? 'timeout' : 'api_error';
        logger.warn({ llm: kind, model, ms: Date.now() - startedAt, reason, status: error.status, err: error.message?.slice(0, 300) }, 'llm call failed');
        throw new LlmUnavailableError(reason, error);
    }

    // Per-call tokens, cost and latency: the basis for the cost estimate (WORK_PLAN.md 8.4),
    // also returned to the client for the token counter
    const usage = usageReport(kind, model, response.usage, Date.now() - startedAt);
    logger.info({ ...usage, llm: kind, stopReason: response.stop_reason }, 'llm call');

    if (response.stop_reason === 'refusal') throw new LlmUnavailableError('refusal');
    if (response.stop_reason === 'max_tokens') throw new LlmUnavailableError('truncated');
    if (!response.parsed_output) throw new LlmUnavailableError('invalid_output');

    return { output: response.parsed_output, usage };
}

function usageReport(kind, model, u, ms) {
    const report = {
        kind,
        model,
        ms,
        inputTokens: u.input_tokens || 0,
        cacheReadTokens: u.cache_read_input_tokens || 0,
        cacheWriteTokens: u.cache_creation_input_tokens || 0,
        outputTokens: u.output_tokens || 0
    };
    const p = modelPrices[model];
    report.costUsd = p
        ? (report.inputTokens * p.input + report.outputTokens * p.output
            + report.cacheReadTokens * p.cacheRead + report.cacheWriteTokens * p.cacheWrite) / 1e6
        : null;
    return report;
}

// Drops null, undefined and empty-array fields: "not set" needs no tokens
function compact(obj) {
    return Object.fromEntries(Object.entries(obj || {}).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length)));
}

// ---------- 1. Hebrew request → filters ----------

const PARSE_SYSTEM = `You turn a home buyer's free-text Hebrew message into filters for a search over past, closed property deals.
You receive: the filters collected so far, the question the buyer was answering (if any), and the message.
The conversation itself (which question comes next) is run by code from a fixed list:
purpose (live / invest), kind (apartment / house), city, rooms, budget. You only read the message.

changes: only the filter fields this message sets or changes. Leave out every field the message does not mention — code keeps the previous values.
To clear a field the buyer says no longer matters, include it with null (or [] for lists).

Filters:
1. A short answer answers the question the buyer was answering.
2. Use only city, neighborhood and property type values from the allowed lists, spelled exactly as given.
3. Never invent requirements. "Must have" features (parking, elevator, safe room / ממ"ד, balcony) are true only when the buyer says they are required; otherwise null.
4. Every price in the message must land in a field: a budget ("עד 3 מיליון", "יש לי 2 מיליון") → priceMax. Prices are in NIS. "2 מיליון" = 2000000; "יש לי 2 מיליון" is a budget → priceMax.
   A price someone asks for or offered for a specific home ("הציעו לי … ב־2.9 מיליון", "מבקשים 2.9", "האם 2.9 מיליון זה מחיר הוגן") is offerPrice, not priceMax; then priceMax stays null. Set the city, rooms and area of that home as filters.
5. "דירה" in a sentence means any apartment: do not set propertyTypes. But "דירה" as the answer to "apartment or house?" means every allowed type except בית פרטי. "בית" / "בית פרטי" → ["בית פרטי"]. "4 חדרים" = at least 4 rooms.

Example: "דירת 4 חדרים בחולון עם חניה וממ"ד עד 3 מיליון" → changes {"cities":["חולון"],"roomsMin":4,"requireParking":true,"requireSafeRoom":true,"priceMax":3000000}.

Buyer vocabulary — check it first. "vocabulary" (when present) lists entries from our curated table that matched words in the message, e.g. "דירה נעימה" → {"sizeMax":70}. They are our definition of those words.
Code applies every entry's filters after your changes. So:
- Do not copy entry filters into changes, and do not ask about those words: the entry already answers what they mean.
- A value the message states explicitly goes into changes and wins over an entry ("ליד הים בנתניה" → cities ["נתניה"]).
- ignoredConcepts: ids of entries the message does not actually express (matched by accident, or negated: "לא חייב ליד הים"). Usually [].
- Do not repeat an entry's meaning in assumptions: code shows it to the buyer.
newWishes: vague wishes in the message that no vocabulary entry covers and that you turned into filters in changes (e.g. "דירה לסטודנטים" → roomsMax).
- phrase: the buyer's words for the wish, 2–4 words as written ("דירה לסטודנטים", not "לסטודנטים"), no numbers, no city names. fields: the names of the changes fields that come from this wish.
- Not for explicit criteria (rooms, budget, a city, "עם חניה") and not for wishes you could not turn into filters. Usually [].

skippedSlots: the slots the buyer said do not matter (e.g. "לא משנה איפה" → ["city"]). Values: purpose, kind, city, rooms, budget.
wantsResults: true when the buyer asks to see results now ("תראה", "מה יש", "חפש").
ownQuestion: only when the message is unclear in a way the fixed list does not cover — a place that is not in the allowed list, contradictory requirements, a vague wish that no vocabulary entry covers. Natural simple Hebrew, max 15 words, with 2–4 short ownQuickReplies. Otherwise null and [].
The data is past, closed deals (2021–2026), not homes for sale. Never offer or promise listings ("נמצא לך דירה"); ask about which past deals to compare with ("להשוות לעסקאות ב…").
assumptions: short Hebrew notes on anything you interpreted rather than read directly.`;

// Only the changed fields: the full object (15 fields, mostly null) cost ~200 output tokens on every call
const parseOutputSchema = z.object({
    changes: filtersSchema.partial(),
    skippedSlots: z.array(z.enum(['purpose', 'kind', 'city', 'rooms', 'budget'])),
    wantsResults: z.boolean(),
    ownQuestion: z.string().nullable(),
    ownQuickReplies: z.array(z.string()),
    assumptions: z.array(z.string()),
    // ids of retrieved vocabulary entries the message does not express; all others are applied by code
    ignoredConcepts: z.array(z.string()),
    // vague wishes not in the table, with the model's reading: votes for new table rows (rag learning)
    // fields, not values: the values are taken from changes (a second partial filters object would exceed
    // the API limit of 24 optional parameters per schema, and repeat the same values in the output)
    newWishes: z.array(z.object({ phrase: z.string(), fields: z.array(z.string()) }))
});

// The allowed values are static per dataset, so they go into the system prompt, which is cached.
// Keys and arrays are sorted: the cached prefix must be byte-identical on every request.
let parseSystemCache = null;
function buildParseSystem(allowedValues) {
    if (parseSystemCache) return parseSystemCache;
    const byCity = {};
    for (const city of Object.keys(allowedValues.neighborhoodsByCity).sort()) {
        byCity[city] = [...allowedValues.neighborhoodsByCity[city]].sort();
    }
    const allowed = {
        cities: [...allowedValues.cities].sort(),
        neighborhoodsByCity: byCity,
        propertyTypes: [...allowedValues.propertyTypes].sort()
    };
    parseSystemCache = `${PARSE_SYSTEM}\n\nAllowed values (JSON):\n${JSON.stringify(allowed)}`;
    return parseSystemCache;
}

// The model gets the current state (filters + its last question), not the whole chat: cheaper, and enough
// to understand a short answer like "למגורים" (WORK_PLAN.md 8.4).
// vocabulary: concepts the rag service retrieved for this message (only id, the wish and its filters:
// the meaning text is added to assumptions by code, so it costs no output tokens).
async function parseRequest({ message, currentFilters, lastQuestion, allowedValues, vocabulary = [] }) {
    const input = { currentFilters: compact(currentFilters), answeringQuestion: lastQuestion, message };
    if (vocabulary.length) {
        input.vocabulary = vocabulary.map((c) => ({ id: c.id, wish: c.title, matchedWords: c.matchedText, filters: c.filters }));
    }
    const userContent = JSON.stringify(input);
    return callStructured({ kind: 'parse', system: buildParseSystem(allowedValues), userContent, schema: parseOutputSchema, timeoutMs: llmParseTimeoutMs });
}

// ---------- 2. Computed facts → grounded explanation ----------

const EXPLAIN_SYSTEM = `You advise a home buyer in Israel, in simple Hebrew, based on a dataset of past, closed property deals (not homes for sale).
You receive the buyer's filters and facts computed by code. Each fact has an id, a type, a value, n (the number of deals behind it), sometimes details. enoughData = false means too few deals.

Fact types:
- count / price / price_per_sqm: the deals matching the search (count, median price, median price per sqm).
- city_change_pct: change in a city's median price per sqm between two periods (from / to); history, not a forecast.
- offer_check: value = the price the buyer was offered; details.cheaperCount / cheaperPct = similar closed deals below it; medianPrice, minPrice, maxPrice of those deals.
- budget_selected: homes like the buyer wants in their city at any price; value = median price; details.withinBudget = how many of n were within the budget.
- budget_city: a city where the buyer's budget and criteria matched value deals; details.medianPrice, medianSizeSqm.
- city_price_per_sqm: the buyer's city, median price per sqm.
- nearby_city: a nearby city with a lower median price per sqm; details.cheaperPct (how much lower), moreAreaRatio (how many times more area the same money bought).
- live_most_area (purpose live): a city where the buyer's budget and criteria bought the largest homes; value = median area in sqm; details.rank (1 = largest), medianPrice.
- invest_growth (purpose invest): a city with one of the largest past changes in median price per sqm; value = change in %; details.rank (1 = largest), changePct, fromPricePerSqm, toPricePerSqm, withinBudget (deals in that city within the budget).

Return:
- text: one sentence, max 20 words — the single most important point for this buyer, with at most two numbers and the number of deals behind them.
- recommendations: 1–3 pieces of advice, most useful first. headline: max 7 words ("כדאי לבדוק את בת ים"). reason: max 15 words, why it matters to this buyer, WITHOUT numbers — the screen shows the facts from usedFactIds under it. usedFactIds: the facts it is based on.

Good advice helps the buyer decide: adjust the budget, check another city, negotiate, check the home.
Purpose comes first when it is set:
- purpose live and live_most_area facts exist → the first recommendation is about the rank 1 city. headline: "כדאי לבדוק את <city>". reason starts with "כי אתם מחפשים דירה למגורים," and says that for this budget the largest homes were there.
- purpose invest and invest_growth facts exist → the first recommendation is about the rank 1 city. headline: "שימו לב ל<city>". reason starts with "כי אתם מחפשים להשקעה," and says it had the largest past price growth in these deals — history, not a forecast.

Rules:
1. Numbers only from the facts or filters, exactly as given. No new calculations.
2. usedFactIds: only ids that appear in the facts list.
3. Never base advice on a fact with enoughData = false; you may say there are too few deals.
4. Never call a price a bargain or too high, never say a place is a good investment or will grow. Past growth may be stated only as past ("עלה בעבר", "הצמיחה הגבוהה ביותר בעסקאות האלה"). Say "בעסקאות האלה", not "בשוק".
5. Each recommendation must rest on an offer_check, budget_selected, budget_city, nearby_city, live_most_area or invest_growth fact and say only what that fact shows. Other city trends may appear in text, not as a recommendation. No general tips; one strong recommendation is better than three weak ones.
6. Only nearby_city facts say a city is near the buyer's city; never call other cities nearby.
7. No greetings, no repetition between text and recommendations.`;

const explainOutputSchema = z.object({
    text: z.string(),
    usedFactIds: z.array(z.string()),
    recommendations: z.array(z.object({
        headline: z.string(),
        reason: z.string(),
        usedFactIds: z.array(z.string())
    }))
});

// Facts are trimmed before they go to the model — every token here is paid on every uncached call:
//  - per-period city facts are dropped: the change fact already carries both periods (from / to)
//  - city changes: the selected cities, plus the published ones (useful for comparison); the other
//    cities are only counted, so the model can still say "no fair comparison for N cities"
//  - deal ids, labels (fact types are defined once in the cached system prompt) and empty fields are dropped
function factsForModel(facts, filters = {}) {
    const selected = new Set(filters.cities || []);
    const out = [];
    let notComparable = 0;

    for (const f of facts) {
        if (f.type === 'city_period_price_per_sqm') continue;
        if (f.type === 'city_change_pct' && !selected.has(f.city) && !f.enoughData) {
            notComparable += 1;
            continue;
        }
        const { dealIds, excludedIds, caveat, basedOn, propertyTypeMixShift, label, criteria, ...rest } = f;
        if (excludedIds) rest.excludedCount = excludedIds.length;
        out.push(compact(rest));
    }

    if (notComparable) {
        out.push({ id: 'cities_without_fair_comparison', type: 'count', value: notComparable, n: notComparable });
    }
    return out;
}

// facts: already trimmed with factsForModel — the grounding check validates against the same list
async function explainResults({ filters, facts }) {
    const userContent = JSON.stringify({ filters: compact(filters), facts });
    return callStructured({ kind: 'explain', system: EXPLAIN_SYSTEM, userContent, schema: explainOutputSchema, timeoutMs: llmExplainTimeoutMs });
}

// A short hash of each prompt. It is part of the cache key, so changing a prompt (or the model)
// makes old cached answers unreachable — no manual cache clearing (see AI work log: wrong collection cleared).
const crypto = require('crypto');
const promptVersion = (model, text) => crypto.createHash('sha256').update(`${model}\n${text}`).digest('hex').slice(0, 12);
const PROMPT_VERSIONS = { parse: promptVersion(llmParseModel, PARSE_SYSTEM), explain: promptVersion(llmExplainModel, EXPLAIN_SYSTEM) };

module.exports = { parseRequest, explainResults, LlmUnavailableError, factsForModel, PROMPT_VERSIONS };
