const express = require('express');
const controller = require('../controllers/watchlistController');

const router = express.Router();

router.get('/users/:userId/watchlists', controller.listWatchlists);
router.post('/watchlists', controller.createWatchlist);
router.get('/watchlists/:id', controller.getWatchlist);
router.post('/watchlists/:id/coins', controller.addCoin);
router.delete('/watchlist-coins/:id', controller.removeCoin);

module.exports = router;
