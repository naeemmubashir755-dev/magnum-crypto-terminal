const marketSentimentService = require('../services/marketSentimentService');

// HTTP translation only; Alternative.me integration belongs to the service.
const getCurrentFearGreed = async (request, response, next) => {
  try {
    response.status(200).json(await marketSentimentService.getCurrentFearGreed());
  } catch (error) { next(error); }
};

module.exports = { getCurrentFearGreed };
