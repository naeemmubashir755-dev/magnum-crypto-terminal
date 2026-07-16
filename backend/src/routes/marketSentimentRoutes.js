const express = require('express');
const { getCurrentFearGreed } = require('../controllers/marketSentimentController');

const router = express.Router();

router.get('/market/fear-greed', getCurrentFearGreed);

module.exports = router;
