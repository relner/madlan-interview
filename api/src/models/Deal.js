const mongoose = require('mongoose');

const Schema = mongoose.Schema;

// One document per deal version after cleaning.
// Normalized fields are used by search and statistics; `raw` keeps the original CSV row.
// Unknown values stay null — a missing parking value is "unknown", not "no".
const dealSchema = new Schema({
    dealId: {
        type: String,
        required: true,
        index: true
    },
    city: { type: String, index: true },
    neighborhood: String,
    street: String,
    propertyType: String,
    rooms: Number,
    sizeSqm: Number,
    floor: Number,
    totalFloors: Number,
    yearBuilt: Number,
    condition: String,
    hasElevator: { type: Boolean, default: null },
    hasParking: { type: Boolean, default: null },
    hasBalcony: { type: Boolean, default: null },
    hasSafeRoom: { type: Boolean, default: null },

    // For month-only dates ("Aug 2025") dealDate is the first of the month and precision is 'month'.
    dealDate: Date,
    dealDatePrecision: {
        type: String,
        enum: ['day', 'month', null],
        default: null
    },
    dealYear: { type: Number, index: true },

    priceNis: Number,
    pricePerSqmReported: Number,
    pricePerSqmCalculated: Number,
    source: String,
    sources: [String],

    // Data quality flags, e.g. 'price_conflict', 'zero_price', 'price_per_sqm_mismatch', 'new_condition_old_building'
    qualityFlags: [String],
    // false → the deal is shown in search but excluded from price statistics
    includeInPriceStats: {
        type: Boolean,
        default: true
    },
    exclusionReason: String,
    // How many identical CSV rows were merged into this document
    duplicateCount: {
        type: Number,
        default: 1
    },
    // For conflicting versions of the same deal_id: what the other versions say
    conflictWith: [{
        _id: false,
        source: String,
        priceNis: Number
    }],

    raw: Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('deals', dealSchema);
