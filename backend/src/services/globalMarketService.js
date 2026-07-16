const marketService = require('./marketService');

// CoinGecko's global dominance response uses lower-case coin symbols.
// This set covers the major centralized, decentralized, and algorithmic stablecoins.
const STABLECOIN_SYMBOLS = new Set([
  'usdt', 'usdc', 'dai', 'usde', 'usds', 'fdusd', 'pyusd', 'tusd', 'usdp',
  'gusd', 'lusd', 'frax', 'crvusd', 'susd', 'usdd', 'usdx', 'busd',
]);

const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/** Calculates aggregate stablecoin dominance from CoinGecko dominance percentages. */
const calculateStablecoinDominance = (marketCapPercentages = {}) => {
  const stablecoinPercentages = Object.entries(marketCapPercentages)
    .filter(([symbol]) => STABLECOIN_SYMBOLS.has(symbol.toLowerCase()))
    .map(([, percentage]) => toFiniteNumber(percentage))
    .filter((percentage) => percentage !== null);

  if (!stablecoinPercentages.length) return null;
  return stablecoinPercentages.reduce((sum, percentage) => sum + percentage, 0);
};

/**
 * Produces a stable Dashboard response from the existing cached CoinGecko
 * global helper while retaining the raw /api/global endpoint for compatibility.
 */
const getGlobalMarketMetrics = async () => {
  const payload = await marketService.fetchGlobalMarketData();
  const data = payload?.data;

  if (!data) {
    const error = new Error('Global market data is currently unavailable.');
    error.statusCode = 502;
    throw error;
  }

  return {
    bitcoinDominance: toFiniteNumber(data.market_cap_percentage?.btc),
    ethereumDominance: toFiniteNumber(data.market_cap_percentage?.eth),
    stablecoinDominance: calculateStablecoinDominance(data.market_cap_percentage),
    totalMarketCap: toFiniteNumber(data.total_market_cap?.usd),
    total24hVolume: toFiniteNumber(data.total_volume?.usd),
    activeCryptocurrencies: toFiniteNumber(data.active_cryptocurrencies),
    activeMarkets: toFiniteNumber(data.markets),
  };
};

module.exports = { getGlobalMarketMetrics, calculateStablecoinDominance };
