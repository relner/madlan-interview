const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Two cache levels (WORK_PLAN.md 8.4):
//   kind 'parse'   — key: normalized request text  → value: filters
//   kind 'explain' — no longer used: advice is stored in its own collection for 24 h (models/Advice.js)
// Mongo removes expired documents itself through the TTL index on expiresAt.
const llmCacheSchema = new Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    kind: {
        type: String,
        enum: ['parse', 'explain'],
        required: true
    },
    value: Schema.Types.Mixed,
    hits: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

llmCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('llm_cache', llmCacheSchema);
