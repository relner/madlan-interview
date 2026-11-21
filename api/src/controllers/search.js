const errorHandler = require('../utils/errorHandler');
const { searchDeals, getAllowedValues, getAllDeals } = require('../services/search.service');
const { computeFacts } = require('../services/facts.service');
const { computeAdvice } = require('../services/advice.service');
const { sanitizeFilters } = require('../validators/filters.validators');
const { factsOptions } = require('../helpers/configuration');

// Works without the LLM: filters → deals + computed facts.
// This is the core of the app and the fallback when the model is unavailable.
module.exports.search = async function(req, res) {
    try {
        const allowed = await getAllowedValues();
        const { filters, rejected } = sanitizeFilters(req.body.filters, allowed);

        const { deals, total, shown } = await searchDeals(filters);
        const allDeals = await getAllDeals();
        const facts = [...computeFacts(deals, factsOptions, allDeals), ...computeAdvice(filters, allDeals, factsOptions)];

        res.status(200).json({
            filters,
            rejected,
            total,
            deals: shown,
            facts
        });
    } catch (error) {
        errorHandler(res, error);
    }
}
