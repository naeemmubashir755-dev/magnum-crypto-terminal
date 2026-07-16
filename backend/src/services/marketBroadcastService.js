const marketService = require('./marketService');

const MARKET_LIMIT = 100;

/**
 * Publishes one shared market snapshot to all connected Socket.IO clients.
 * It delegates fetching and caching to MarketService, so REST and WebSocket
 * consumers use the same CoinGecko data path.
 */
const createMarketBroadcaster = (io, {
  intervalMs,
  fetchMarkets = marketService.fetchMarkets,
  logger = console,
} = {}) => {
  let intervalId;
  let isPublishing = false;
  let latestUpdate = null;

  const publishMarketUpdate = async () => {
    if (isPublishing) return latestUpdate;
    isPublishing = true;

    try {
      const markets = await fetchMarkets({ limit: MARKET_LIMIT });
      latestUpdate = { markets, updatedAt: new Date().toISOString() };
      io.emit('market:update', latestUpdate);
      return latestUpdate;
    } catch (error) {
      logger.error('Unable to broadcast market update:', error.message);
      io.emit('market:error', { message: 'Live market updates are temporarily unavailable.' });
      return null;
    } finally {
      isPublishing = false;
    }
  };

  const sendInitialUpdate = (socket) => {
    if (latestUpdate) {
      socket.emit('market:update', latestUpdate);
      return;
    }

    // The first connected client starts the shared snapshot; every client
    // receives the resulting broadcast without separate API calls.
    void publishMarketUpdate();
  };

  const start = () => {
    if (intervalId) return;

    io.on('connection', sendInitialUpdate);
    intervalId = setInterval(() => {
      // Do not poll upstream when there are no clients to receive an update.
      if (io.engine.clientsCount > 0) void publishMarketUpdate();
    }, intervalMs);
  };

  const stop = () => {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = undefined;
  };

  return { start, stop, publishMarketUpdate };
};

module.exports = { createMarketBroadcaster };
