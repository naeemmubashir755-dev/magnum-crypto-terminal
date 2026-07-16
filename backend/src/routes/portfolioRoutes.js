const express = require('express');
const controller = require('../controllers/portfolioController');
const { requireAuth, requireCurrentUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/users/:userId/portfolios', requireAuth, requireCurrentUser('userId'), controller.listPortfolios);
router.post('/portfolios', requireAuth, controller.createPortfolio);
router.get('/portfolios/:id', requireAuth, controller.getPortfolio);
router.post('/portfolios/:id/holdings', requireAuth, controller.addHolding);
router.delete('/holdings/:id', requireAuth, controller.removeHolding);

module.exports = router;
