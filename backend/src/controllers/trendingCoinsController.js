const trendingCoinsService = require('../services/trendingCoinsService');

// Controllers expose HTTP concerns only; CoinGecko transformation is a service concern.
const getTrendingCoins = async (request, response, next) => {
  try {
    response.status(200).json(await trendingCoinsService.getTrendingCoins());
  } catch (error) { next(error); }
};

module.exports = { getTrendingCoins };
