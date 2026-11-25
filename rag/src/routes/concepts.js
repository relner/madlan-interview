const express = require('express');
const controllers = require('../controllers/search');

const router = express.Router();

router.post('/search', controllers.search);
router.post('/reload', controllers.reload);
router.post('/learn', controllers.learn);

module.exports = router;
