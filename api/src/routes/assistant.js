const express = require('express');
const controllers = require('../controllers/assistant');
const rateLimit = require('../middleware/rateLimit');
const { validateMessage } = require('../validators/assistant.validators');
const { validateFilters } = require('../validators/filters.validators');
const router = express.Router();


router.post('/parse', rateLimit, validateMessage, controllers.parse);   // validateMessage skips quick replies and examples
router.get('/examples', controllers.examples);
router.post('/explain', rateLimit, validateFilters, controllers.explain);


module.exports = router;
