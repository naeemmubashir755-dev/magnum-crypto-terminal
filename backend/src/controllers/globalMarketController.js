const globalMarketService = require('../services/globalMarketService');

// The controller stays thin; data normalization belongs to GlobalMarketService.
const getGlobalMarketMetrics = async (request, response, next) => {
  try {
    response.status(200).json(await globalMarketService.getGlobalMarketMetrics());
  } catch (error) { next(error); }
};

module.exports = { getGlobalMarketMetrics };
