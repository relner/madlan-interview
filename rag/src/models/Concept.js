const mongoose = require('mongoose');

// The buyer vocabulary table. Two kinds of rows:
//  - seed (data/concepts.js): written by us, enabled;
//  - llm: vague wishes the parse model met in buyers' messages, disabled until 3 different buyers
//    got the same reading (services/learning.service.js).
// The service re-embeds a row when its examples change (examplesHash).
const conceptSchema = new mongoose.Schema({
    conceptId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    examples: { type: [String], required: true },
    meaning: { type: String, default: null },
    // A partial of the API filter contract; the API validates it. Empty for a candidate not enabled yet
    filters: { type: mongoose.Schema.Types.Mixed, default: {} },
    // 'learned': added from buyers' messages and enabled automatically (services/learning.service.js)
    basis: { type: String, enum: ['data', 'curated', 'learned'], default: 'curated' },
    source: { type: String, enum: ['seed', 'llm'], default: 'seed' },
    enabled: { type: Boolean, default: true },
    // Learned candidates only: each distinct reading the model gave, and which buyers (hashed) gave it.
    // A reading becomes the concept's filters when MIN_VOTES different buyers got the same one.
    interpretations: {
        type: [{
            _id: false,
            key: String,
            filters: mongoose.Schema.Types.Mixed,
            voters: [String]
        }],
        default: undefined
    },
    hits: { type: Number, default: 0 },
    enabledAt: Date,
    // One vector per example, written by the service
    embeddings: { type: [[Number]], default: undefined, select: false },
    examplesHash: { type: String, default: null },
    embeddingModel: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Concept', conceptSchema, 'concepts');
