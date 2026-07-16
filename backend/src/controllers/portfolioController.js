const portfolioService = require('../services/portfolioService');

const listPortfolios = async (request, response, next) => {
  try {
    response.status(200).json(await portfolioService.listForUser(request.auth.userId));
  } catch (error) { next(error); }
};

const createPortfolio = async (request, response, next) => {
  try {
    response.status(201).json(await portfolioService.createPortfolio({ userId: request.auth.userId }));
  } catch (error) { next(error); }
};

const getPortfolio = async (request, response, next) => {
  try {
    response.status(200).json(await portfolioService.getPortfolioById(request.params.id, request.auth.userId));
  } catch (error) { next(error); }
};

const addHolding = async (request, response, next) => {
  try {
    response.status(201).json(await portfolioService.addHolding({ ...request.body, portfolioId: request.params.id, userId: request.auth.userId }));
  } catch (error) { next(error); }
};

const removeHolding = async (request, response, next) => {
  try {
    await portfolioService.removeHolding(request.params.id, request.auth.userId);
    response.status(204).send();
  } catch (error) { next(error); }
};

module.exports = { listPortfolios, createPortfolio, getPortfolio, addHolding, removeHolding };
