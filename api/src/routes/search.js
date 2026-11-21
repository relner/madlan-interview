const express = require('express');
const controllers = require('../controllers/search');
const { validateFilters } = require('../validators/filters.validators');
const router = express.Router();


router.post('/', validateFilters, controllers.search);


module.exports = router;
