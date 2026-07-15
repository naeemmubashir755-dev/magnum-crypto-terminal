const marketService = require('../services/marketService');
const { fetchFearGreedIndex } = require('../services/sentimentService');

const getMarkets = async (request, response, next) => {
  try {
    const limit = Math.min(Math.max(Number(request.query.limit) || 100, 1), 250);
    const data = await marketService.fetchMarkets({ limit, ids: request.query.ids });
    response.status(200).json(data);
  } catch (error) { next(error); }
};

const getCoinDetails = async (request, response, next) => {
  try { response.status(200).json(await marketService.fetchCoinDetails(request.params.id)); } catch (error) { next(error); }
};

const getCoinHistory = async (request, response, next) => {
  try { response.status(200).json(await marketService.fetchCoinHistory(request.params.id, request.query.days)); } catch (error) { next(error); }
};

const getTrending = async (request, response, next) => {
  try { response.status(200).json(await marketService.fetchTrending()); } catch (error) { next(error); }
};

const getRecentlyAdded = async (request, response, next) => {
  try { response.status(200).json(await marketService.fetchRecentlyAdded()); } catch (error) { next(error); }
};

const getGlobalMarketData = async (request, response, next) => {
  try { response.status(200).json(await marketService.fetchGlobalMarketData()); } catch (error) { next(error); }
};

const getFearGreedIndex = async (request, response, next) => {
  try { response.status(200).json(await fetchFearGreedIndex()); } catch (error) { next(error); }
};

module.exports = {
  getMarkets, getCoinDetails, getCoinHistory, getTrending,
  getRecentlyAdded, getGlobalMarketData, getFearGreedIndex,
};
