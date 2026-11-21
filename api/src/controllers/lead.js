const Lead = require('../models/Lead');
const errorHandler = require('../utils/errorHandler');
const { sanitizeFilters } = require('../validators/filters.validators');
const { getAllowedValues } = require('../services/search.service');

// Demo: the lead is saved with its confirmed preferences. Email / WhatsApp delivery is not connected
// and the response says so, so the UI never pretends a message was sent.
module.exports.create = async function(req, res) {
    try {
        const allowed = await getAllowedValues();
        const { filters } = sanitizeFilters(req.body.filters, allowed);

        const lead = new Lead({
            name: req.body.name,
            channel: req.body.channel,
            contact: req.body.contact,
            wantsSummary: req.body.wantsSummary !== false,
            wantsNewListings: req.body.wantsNewListings === true,
            filters
        });
        await lead.save();

        res.status(201).json({
            id: lead._id,
            status: lead.status,
            deliveryConnected: false
        });
    } catch (error) {
        errorHandler(res, error);
    }
}
