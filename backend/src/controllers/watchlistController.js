const watchlistService = require('../services/watchlistService');

const listWatchlists = async (request, response, next) => {
  try {
    response.status(200).json(await watchlistService.listForUser(request.auth.userId));
  } catch (error) { next(error); }
};

const createWatchlist = async (request, response, next) => {
  try {
    response.status(201).json(await watchlistService.createWatchlist({ userId: request.auth.userId }));
  } catch (error) { next(error); }
};

const getWatchlist = async (request, response, next) => {
  try {
    response.status(200).json(await watchlistService.getWatchlistById(request.params.id, request.auth.userId));
  } catch (error) { next(error); }
};

const addCoin = async (request, response, next) => {
  try {
    response.status(201).json(await watchlistService.addCoin({ ...request.body, watchlistId: request.params.id, userId: request.auth.userId }));
  } catch (error) { next(error); }
};

const removeCoin = async (request, response, next) => {
  try {
    await watchlistService.removeCoin(request.params.id, request.auth.userId);
    response.status(204).send();
  } catch (error) { next(error); }
};

module.exports = { listWatchlists, createWatchlist, getWatchlist, addCoin, removeCoin };
