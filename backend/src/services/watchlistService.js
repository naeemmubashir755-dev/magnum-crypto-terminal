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

  async getWatchlistById(id, userId) {
    const watchlist = await prisma.watchlist.findFirst({
      where: { id, userId },
      include: watchlistWithCoins,
    });

    if (!watchlist) throw createHttpError(404, 'Watchlist not found.');
    return watchlist;
  }

  async addCoin({ watchlistId, userId, coinId }) {
    if (!watchlistId || !coinId) {
      throw createHttpError(400, 'watchlistId and coinId are required.');
    }

    const watchlist = await prisma.watchlist.findFirst({ where: { id: watchlistId, userId } });
    if (!watchlist) throw createHttpError(404, 'Watchlist not found.');

    return prisma.watchlistCoin.create({ data: { watchlistId, coinId } });
  }

  async removeCoin(id, userId) {
    const coin = await prisma.watchlistCoin.findFirst({
      where: { id, watchlist: { userId } },
    });
    if (!coin) throw createHttpError(404, 'Watchlist coin not found.');

    await prisma.watchlistCoin.delete({ where: { id } });
  }
}

module.exports = new WatchlistService();
