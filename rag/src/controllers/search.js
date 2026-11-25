const logger = require('../utils/logger');
const indexService = require('../services/index.service');
const { learn } = require('../services/learning.service');

const MAX_TEXT_LENGTH = 500;

// POST /concepts/search { text } → { version, matches: [{ id, title, meaning, filters, basis, score, matchedText, example }] }
module.exports.search = async function(req, res) {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim().slice(0, MAX_TEXT_LENGTH) : '';
    if (!text) return res.status(400).json({ message: 'text is required' });
    try {
        const startedAt = Date.now();
        const result = await indexService.search(text);
        logger.info({ ms: Date.now() - startedAt, matches: result.matches.map((m) => `${m.id}:${m.score}`) }, 'concept search');
        res.status(200).json(result);
    } catch (error) {
        logger.error({ err: error.message }, 'concept search failed');
        res.status(500).json({ message: 'search failed' });
    }
}

// POST /concepts/reload — re-read the table now (otherwise every RAG_RELOAD_INTERVAL_MS). Internal network only.
module.exports.reload = async function(req, res) {
    try {
        res.status(200).json(await indexService.reload());
    } catch (error) {
        logger.error({ err: error.message }, 'concept reload failed');
        res.status(500).json({ message: 'reload failed' });
    }
}

// POST /concepts/learn { voter, wishes: [{ phrase, filters }] } — vague wishes the parse model met
// and could not find in the table. voter: a hash of the buyer (the api never sends the IP itself).
const MAX_WISHES = 3;
const MAX_PHRASE_LENGTH = 40;
// 2–4 words: the search compares 2–4-word windows of a message, so a one-word example ("לסטודנטים")
// would never be found again (it scored 0.943 against "דירה לסטודנטים", below the threshold)
const MIN_PHRASE_WORDS = 2;
const MAX_PHRASE_WORDS = 4;

function validWish(w) {
    if (!w || typeof w.phrase !== 'string' || !w.filters || typeof w.filters !== 'object' || Array.isArray(w.filters)) return false;
    const phrase = w.phrase.trim();
    // A wish is words, not numbers: "עד 3 מיליון" or "4 חדרים" are explicit filters, not vocabulary
    return phrase.length > 0 && phrase.length <= MAX_PHRASE_LENGTH && !/\d/.test(phrase)
        && phrase.split(/\s+/).length >= MIN_PHRASE_WORDS && phrase.split(/\s+/).length <= MAX_PHRASE_WORDS
        && Object.keys(w.filters).length > 0;
}

module.exports.learn = async function(req, res) {
    const voter = typeof req.body?.voter === 'string' ? req.body.voter.slice(0, 64) : '';
    const wishes = (Array.isArray(req.body?.wishes) ? req.body.wishes : [])
        .filter(validWish)
        .slice(0, MAX_WISHES)
        .map((w) => ({ phrase: w.phrase.trim().replace(/\s+/g, ' '), filters: w.filters }));
    if (!voter || !wishes.length) return res.status(400).json({ message: 'voter and wishes are required' });
    try {
        const results = await learn(wishes, voter);
        logger.info({ wishes: wishes.map((w, i) => `${w.phrase}:${results[i]}`) }, 'concepts learn');
        res.status(200).json({ results });
    } catch (error) {
        logger.error({ err: error.message }, 'concepts learn failed');
        res.status(500).json({ message: 'learn failed' });
    }
}

module.exports.health = function(req, res) {
    res.status(200).json({ status: 'ok', ...indexService.status() });
}
