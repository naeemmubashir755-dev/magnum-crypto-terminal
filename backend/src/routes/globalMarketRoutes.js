const express = require('express');
const { getGlobalMarketMetrics } = require('../controllers/globalMarketController');

const router = express.Router();

router.get('/market/global', getGlobalMarketMetrics);

module.exports = router;
