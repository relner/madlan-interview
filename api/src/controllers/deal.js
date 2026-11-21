const Deal = require('../models/Deal');
const errorHandler = require('../utils/errorHandler');
const { getAllowedValues } = require('../services/search.service');

// Values for the form dropdowns
module.exports.getOptions = async function(req, res) {
    try {
        const options = await getAllowedValues();
        res.status(200).json(options);
    } catch (error) {
        errorHandler(res, error);
    }
}

// All versions of one deal, including the original CSV rows (for "show me the source")
module.exports.getByDealId = async function(req, res) {
    try {
        const versions = await Deal.find({ dealId: req.params.dealId }).lean();
        if (!versions.length) {
            return res.status(404).json({ message: 'Deal not found' });
        }
        res.status(200).json(versions);
    } catch (error) {
        errorHandler(res, error);
    }
}
