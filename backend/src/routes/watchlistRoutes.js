const express = require('express');
const controller = require('../controllers/watchlistController');
const { requireAuth, requireCurrentUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/users/:userId/watchlists', requireAuth, requireCurrentUser('userId'), controller.listWatchlists);
router.post('/watchlists', requireAuth, controller.createWatchlist);
router.get('/watchlists/:id', requireAuth, controller.getWatchlist);
router.post('/watchlists/:id/coins', requireAuth, controller.addCoin);
router.delete('/watchlist-coins/:id', requireAuth, controller.removeCoin);

module.exports = router;
