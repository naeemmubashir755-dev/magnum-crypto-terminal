const express = require('express');
const controller = require('../controllers/portfolioController');

const router = express.Router();

router.get('/users/:userId/portfolios', controller.listPortfolios);
router.post('/portfolios', controller.createPortfolio);
router.get('/portfolios/:id', controller.getPortfolio);
router.post('/portfolios/:id/holdings', controller.addHolding);
router.delete('/holdings/:id', controller.removeHolding);

module.exports = router;
