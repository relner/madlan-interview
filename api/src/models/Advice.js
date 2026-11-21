const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Every advice the model wrote (after it passed the grounding checks), stored per filters for 24 hours.
// The same filters within that time get this advice from the database — no model call (WORK_PLAN.md 8.4).
// Unlike the generic llm_caches entries, the filters are stored readable, so stored advice can be reviewed.
// Mongo removes expired documents itself through the TTL index on expiresAt.
const adviceSchema = new Schema({
    // Hash of the prompt version, the model and the filters (cache.service makeKey)
    key: {
        type: String,
        required: true,
        unique: true
    },
    filters: Schema.Types.Mixed,
    // { text, usedFactIds, recommendations[] } — exactly what the client gets
    explanation: Schema.Types.Mixed,
    model: String,
    promptVersion: String,
    // Tokens and cost of the call that produced it: what every later hit saved
    usage: Schema.Types.Mixed,
    hits: {
        type: Number,
        default: 0
    },
    lastServedAt: Date,
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

adviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('advice', adviceSchema, 'advice');
