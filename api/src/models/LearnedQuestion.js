const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// Questions the LLM asked on its own (not from the curated bank in utils/questionBank.js).
// Stored with a counter as candidates: frequent ones are reviewed and moved into the bank,
// where their answers become code-applied quick replies. They are not added to the bank automatically,
// so the model never rewrites the conversation script by itself.
const learnedQuestionSchema = new Schema({
    normalized: {
        type: String,
        required: true,
        unique: true
    },
    text: {
        type: String,
        required: true
    },
    quickReplies: [String],
    count: {
        type: Number,
        default: 1
    },
    status: {
        type: String,
        enum: ['candidate', 'added', 'rejected'],
        default: 'candidate'
    },
    lastSeenAt: Date
}, { timestamps: true });

module.exports = mongoose.model('learned_questions', learnedQuestionSchema, 'learned_questions');
