const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// A lead is a contact together with the confirmed search preferences.
const leadSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    channel: {
        type: String,
        enum: ['email', 'whatsapp'],
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    // Separate consent: "send me this summary" vs "send me new matching listings"
    wantsSummary: {
        type: Boolean,
        default: true
    },
    wantsNewListings: {
        type: Boolean,
        default: false
    },
    filters: Schema.Types.Mixed,
    // Demo: delivery is not connected yet, so every lead stays 'saved'
    status: {
        type: String,
        enum: ['saved', 'sent'],
        default: 'saved'
    }
}, { timestamps: true });

module.exports = mongoose.model('leads', leadSchema);
