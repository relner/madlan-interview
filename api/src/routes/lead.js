const express = require('express');
const controllers = require('../controllers/lead');
const rateLimit = require('../middleware/rateLimit');
const { validateCreateLead } = require('../validators/lead.validators');
const router = express.Router();


router.post('/', rateLimit, validateCreateLead, controllers.create);


module.exports = router;
