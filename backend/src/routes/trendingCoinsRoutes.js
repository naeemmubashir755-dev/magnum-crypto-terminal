const express = require('express');
const { getTrendingCoins } = require('../controllers/trendingCoinsController');

const router = express.Router();

router.get('/market/trending', getTrendingCoins);

module.exports = router;
