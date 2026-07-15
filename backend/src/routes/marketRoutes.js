const express = require('express');
const controller = require('../controllers/marketController');

const router = express.Router();

router.get('/markets', controller.getMarkets);
router.get('/trending', controller.getTrending);
router.get('/coins/recent', controller.getRecentlyAdded);
router.get('/coins/:id/history', controller.getCoinHistory);
router.get('/coins/:id', controller.getCoinDetails);
router.get('/global', controller.getGlobalMarketData);
router.get('/fear-greed', controller.getFearGreedIndex);

module.exports = router;
