const Deal = require('../models/Deal');
const LearnedQuestion = require('../models/LearnedQuestion');
const logger = require('../utils/logger');
const { QUESTIONS, SLOT_IDS } = require('../utils/questionBank');
const { buildDealQuery } = require('./search.service');
const { normalizeText } = require('./cache.service');

const CITY_OPTIONS = 3;

// Cities with the most deals for the current filters (ignoring the city itself) — real data, no LLM
async function topCities(filters) {
    const query = buildDealQuery({ ...filters, cities: [], neighborhoods: [] });
    const rows = await Deal.aggregate([
        { $match: query },
        { $group: { _id: '$city', n: { $sum: 1 } } },
        { $sort: { n: -1, _id: 1 } },
        { $limit: CITY_OPTIONS }
    ]);
    return rows.map((r) => r._id).filter(Boolean);
}

// The next question from the bank: the first slot that is empty and was not skipped ("לא משנה")
async function nextQuestion(filters, answered) {
    const question = QUESTIONS.find((q) => !answered.includes(q.id) && !q.isFilled(filters));
    if (!question) return null;

    let options = question.options.map(({ id, label }) => ({ id, label }));
    if (question.dynamicOptions === 'cities') {
        const cities = await topCities(filters);
        options = [...cities.map((c) => ({ id: `city:${c}`, label: c })), ...options];
    }
    return { id: question.id, source: 'bank', text: question.text, hint: question.hint ?? null, options };
}

// A quick-reply click: applied by code from the bank. Returns null for an unknown question / option.
function applyAnswer(questionId, optionId, filters, allowed) {
    const question = QUESTIONS.find((q) => q.id === questionId);
    if (!question) return null;

    let patch;
    if (question.dynamicOptions === 'cities' && optionId.startsWith('city:')) {
        const city = optionId.slice('city:'.length);
        if (!allowed.cities.includes(city)) return null;
        patch = { cities: [city], neighborhoods: [] };
    } else {
        const option = question.options.find((o) => o.id === optionId);
        if (!option) return null;
        patch = option.patch({ allowed });
    }
    return { filters: { ...filters, ...patch }, slot: question.id };
}

// The LLM asked its own question: count it as a candidate for the bank. Never blocks the request.
async function recordLearnedQuestion(text, quickReplies) {
    try {
        await LearnedQuestion.updateOne(
            { normalized: normalizeText(text) },
            {
                $setOnInsert: { text, quickReplies },
                $inc: { count: 1 },
                $set: { lastSeenAt: new Date() }
            },
            { upsert: true }
        );
    } catch (error) {
        logger.warn({ err: error.message }, 'learned question not saved');
    }
}

function cleanAnswered(list) {
    return Array.isArray(list) ? [...new Set(list.filter((s) => SLOT_IDS.includes(s)))] : [];
}

module.exports = { nextQuestion, applyAnswer, recordLearnedQuestion, cleanAnswered, topCities };
