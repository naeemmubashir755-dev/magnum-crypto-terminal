const prisma = require('../config/prisma');
const { createHttpError } = require('../utils/httpError');

const watchlistWithCoins = {
  coins: { orderBy: { addedAt: 'desc' } },
};

/** Database operations for watchlists and their saved coins. */
class WatchlistService {
  async listForUser(userId) {
    return prisma.watchlist.findMany({
      where: { userId },
      include: watchlistWithCoins,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWatchlist({ userId }) {
    if (!userId) throw createHttpError(400, 'userId is required.');

    return prisma.watchlist.create({
      data: { userId },
      include: watchlistWithCoins,
    });
  }

  async getWatchlistById(id) {
    const watchlist = await prisma.watchlist.findUnique({
      where: { id },
      include: watchlistWithCoins,
    });

    if (!watchlist) throw createHttpError(404, 'Watchlist not found.');
    return watchlist;
  }

  async addCoin({ watchlistId, coinId }) {
    if (!watchlistId || !coinId) {
      throw createHttpError(400, 'watchlistId and coinId are required.');
    }

    return prisma.watchlistCoin.create({ data: { watchlistId, coinId } });
  }

  async removeCoin(id) {
    await prisma.watchlistCoin.delete({ where: { id } });
  }
}

module.exports = new WatchlistService();
