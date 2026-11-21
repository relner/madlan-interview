const express = require('express');
const controllers = require('../controllers/deal');
const router = express.Router();


router.get('/options', controllers.getOptions);
router.get('/:dealId', controllers.getByDealId);


module.exports = router;
