const errorHandler = require('../utils/errorHandler');
const logger = require('../utils/logger');
const cache = require('../services/cache.service');
const adviceStore = require('../services/advice-store.service');
const { parseRequest, explainResults, factsForModel, LlmUnavailableError, PROMPT_VERSIONS } = require('../services/llm.service');
const { searchDeals, getAllowedValues, getAllDeals } = require('../services/search.service');
const { computeFacts } = require('../services/facts.service');
const { computeAdvice } = require('../services/advice.service');
const { validateAdvice } = require('../services/grounding.service');
const { sanitizeFilters, emptyFilters } = require('../validators/filters.validators');
const { factsOptions } = require('../helpers/configuration');
const { EXAMPLES } = require('../utils/examples');
const { nextQuestion, applyAnswer, recordLearnedQuestion, cleanAnswered } = require('../services/conversation.service');

// Every response says where the answer came from: 'cache' | 'llm' | 'fallback'.
// 'fallback' is not an error for the client — it shows the form with whatever was understood.

// The chat is run by code from the question bank (utils/questionBank.js):
//  - a quick-reply click is applied by code — no LLM call at all;
//  - free text goes to the LLM, which only extracts filters (and may ask its own question if the bank does not cover it);
//  - the next question is the first empty slot in the bank; after MAX_QUESTIONS the search runs anyway.
const MAX_QUESTIONS = 4;
const MAX_QUICK_REPLIES = 4;
const MAX_QUICK_REPLY_LENGTH = 30;

function cleanQuickReplies(list) {
    return [...new Set((list || [])
        .map((r) => (typeof r === 'string' ? r.trim() : ''))
        .filter((r) => r && r.length <= MAX_QUICK_REPLY_LENGTH))]
        .slice(0, MAX_QUICK_REPLIES);
}

// Decide what the assistant says next and whether to search
async function nextStep({ filters, answered, questionsAsked, wantsResults, ownQuestion }) {
    if (wantsResults || questionsAsked >= MAX_QUESTIONS) {
        return { question: null, readyToSearch: true };
    }
    if (ownQuestion) {
        return { question: ownQuestion, readyToSearch: false };
    }
    const question = await nextQuestion(filters, answered);
    return { question, readyToSearch: !question };
}

// POST /api/assistant/parse
//   { message, filters, answered, lastQuestion, questionsAsked }               — free text (LLM)
//   { answer: { questionId, optionId }, filters, answered, questionsAsked }     — quick reply (code only)
//   { example: id }                                                            — welcome example (code only)
module.exports.parse = async function(req, res) {
    try {
        const allowed = await getAllowedValues();
        const { filters: currentFilters } = sanitizeFilters(req.body.filters || emptyFilters, allowed);
        let answered = cleanAnswered(req.body.answered);
        const questionsAsked = Math.max(0, Math.min(Number(req.body.questionsAsked) || 0, MAX_QUESTIONS));

        // ---------- welcome example: fixed text, fixed filters, no LLM ----------
        if (req.body.example !== undefined) {
            const example = EXAMPLES.find((e) => e.id === req.body.example);
            if (!example) return res.status(400).json({ message: 'example is invalid' });
            const { filters } = sanitizeFilters({ ...emptyFilters, ...example.filters }, allowed);
            // An example may also say that a slot does not matter ("לא משנה איפה"), like skippedSlots from the LLM
            const exampleAnswered = cleanAnswered(example.skipped || []);
            const step = await nextStep({ filters, answered: exampleAnswered, questionsAsked: 0 });
            return res.status(200).json({ source: 'bank', filters, rejected: [], answered: exampleAnswered, assumptions: [], usage: null, ...step });
        }

        // ---------- quick reply: no LLM ----------
        if (req.body.answer) {
            const { questionId, optionId } = req.body.answer;
            const applied = typeof questionId === 'string' && typeof optionId === 'string'
                ? applyAnswer(questionId, optionId, currentFilters, allowed)
                : null;
            if (!applied) return res.status(400).json({ message: 'answer is invalid' });

            const { filters } = sanitizeFilters(applied.filters, allowed);
            answered = cleanAnswered([...answered, applied.slot]);
            const step = await nextStep({ filters, answered, questionsAsked });
            return res.status(200).json({ source: 'bank', filters, rejected: [], answered, assumptions: [], usage: null, ...step });
        }

        // ---------- free text: LLM extracts the filters ----------
        if (typeof req.body.message !== 'string' || !req.body.message.trim()) {
            return res.status(400).json({ message: 'message is required' });
        }
        const lastQuestion = typeof req.body.lastQuestion === 'string' ? req.body.lastQuestion.slice(0, 200) : null;
        const cacheKey = { prompt: PROMPT_VERSIONS.parse, text: cache.normalizeText(req.body.message), currentFilters, lastQuestion };

        let output = await cache.get('parse', cacheKey);
        let source = output ? 'cache' : 'llm';
        // Tokens of this request: null when no model was called (cache hit, quick reply)
        let usage = null;
        if (!output) {
            try {
                ({ output, usage } = await parseRequest({ message: req.body.message, currentFilters, lastQuestion, allowedValues: allowed }));
            } catch (error) {
                if (!(error instanceof LlmUnavailableError)) throw error;
                logger.warn({ reason: error.reason }, 'parse fallback');
                return res.status(200).json({
                    source: 'fallback', reason: error.reason,
                    filters: currentFilters, rejected: [], answered, assumptions: [],
                    question: null, readyToSearch: true, usage: null
                });
            }
            await cache.set('parse', cacheKey, output);
        }

        // The model's output is checked like any user input: unknown cities, impossible ranges are dropped.
        // The model returns only the fields it changed; everything else keeps its current value
        const { filters, rejected } = sanitizeFilters({ ...currentFilters, ...(output.changes || {}) }, allowed);
        answered = cleanAnswered([...answered, ...(output.skippedSlots || [])]);

        let ownQuestion = null;
        if (output.ownQuestion) {
            const options = cleanQuickReplies(output.ownQuickReplies).map((label) => ({ id: label, label }));
            ownQuestion = { id: 'llm', source: 'llm', text: output.ownQuestion.slice(0, 200), hint: null, options };
            if (source === 'llm') await recordLearnedQuestion(ownQuestion.text, options.map((o) => o.label));
        }

        const step = await nextStep({ filters, answered, questionsAsked, wantsResults: output.wantsResults, ownQuestion });
        res.status(200).json({ source, filters, rejected, answered, assumptions: output.assumptions || [], usage, ...step });
    } catch (error) {
        errorHandler(res, error);
    }
}

// GET /api/assistant/examples — the welcome examples (id + text); a click sends { example: id } to parse
module.exports.examples = function(req, res) {
    res.status(200).json(EXAMPLES.map(({ id, text }) => ({ id, text })));
}

// POST /api/assistant/explain  { filters }
// Facts are computed first; the explanation is optional on top of them.
module.exports.explain = async function(req, res) {
    try {
        const allowed = await getAllowedValues();
        const { filters } = sanitizeFilters(req.body.filters, allowed);

        const { deals } = await searchDeals(filters);
        const allDeals = await getAllDeals();
        const facts = [...computeFacts(deals, factsOptions, allDeals), ...computeAdvice(filters, allDeals, factsOptions)];

        // Stored advice (24 h, keyed by structured filters, not by text): same filters → from the database
        const stored = await adviceStore.find(filters);
        if (stored) {
            return res.status(200).json({ source: 'cache', facts, explanation: stored, usage: null });
        }

        // The model sees a trimmed list; the explanation is checked against exactly that list
        const modelFacts = factsForModel(facts, filters);

        let output;
        let usage;
        try {
            ({ output, usage } = await explainResults({ filters, facts: modelFacts }));
        } catch (error) {
            if (!(error instanceof LlmUnavailableError)) throw error;
            logger.warn({ reason: error.reason }, 'explain fallback');
            return res.status(200).json({ source: 'fallback', reason: error.reason, facts, explanation: null, usage: null });
        }

        // Ungrounded parts are never shown. Logged for the AI work log and prompt tuning.
        const { explanation, rejected } = validateAdvice(output, modelFacts, filters);
        if (rejected.length) logger.warn({ rejected, output }, 'advice parts rejected by grounding check');
        if (!explanation) {
            // The tokens were spent even though the answer is not shown
            return res.status(200).json({ source: 'fallback', reason: 'ungrounded', facts, explanation: null, usage });
        }

        await adviceStore.save(filters, explanation, usage);
        res.status(200).json({ source: 'llm', facts, explanation, usage });
    } catch (error) {
        errorHandler(res, error);
    }
}
