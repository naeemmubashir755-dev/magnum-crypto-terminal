const prisma = require('../config/prisma');
const { createHttpError } = require('../utils/httpError');

const portfolioWithHoldings = {
  holdings: { orderBy: { createdAt: 'desc' } },
};

/** Database operations for portfolios and their holdings. */
class PortfolioService {
  async listForUser(userId) {
    return prisma.portfolio.findMany({
      where: { userId },
      include: portfolioWithHoldings,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPortfolio({ userId }) {
    if (!userId) throw createHttpError(400, 'userId is required.');

    return prisma.portfolio.create({
      data: { userId },
      include: portfolioWithHoldings,
    });
  }

  async getPortfolioById(id) {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id },
      include: portfolioWithHoldings,
    });

    if (!portfolio) throw createHttpError(404, 'Portfolio not found.');
    return portfolio;
  }

  async addHolding({ portfolioId, coinId, quantity, averageBuyPrice }) {
    if (!portfolioId || !coinId || quantity === undefined) {
      throw createHttpError(400, 'portfolioId, coinId, and quantity are required.');
    }

    return prisma.holding.create({
      data: { portfolioId, coinId, quantity, averageBuyPrice },
    });
  }

  async removeHolding(id) {
    await prisma.holding.delete({ where: { id } });
  }
}

module.exports = new PortfolioService();
