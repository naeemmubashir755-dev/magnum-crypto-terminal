const { coinGeckoBaseUrl } = require('../config/env');

// The MarketService is the only backend layer that communicates with CoinGecko.
const requestCoinGecko = async (path, query = {}) => {
  const url = new URL(path, coinGeckoBaseUrl);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.status?.error_message || 'CoinGecko data is currently unavailable.');
    error.statusCode = response.status;
    throw error;
  }

  return payload;
};

const fetchMarkets = ({ limit = 100, ids } = {}) => requestCoinGecko('/coins/markets', {
  vs_currency: 'usd',
  order: ids ? undefined : 'market_cap_desc',
  per_page: limit,
  page: 1,
  ids,
  price_change_percentage: '24h,7d',
  sparkline: 'false',
});

const fetchCoinDetails = (id) => requestCoinGecko(`/coins/${encodeURIComponent(id)}`);
const fetchCoinHistory = (id, days) => requestCoinGecko(`/coins/${encodeURIComponent(id)}/market_chart`, {
  vs_currency: 'usd', days,
});
const fetchTrending = () => requestCoinGecko('/search/trending');
const fetchRecentlyAdded = () => requestCoinGecko('/coins/list/new');
const fetchGlobalMarketData = () => requestCoinGecko('/global');

module.exports = {
  fetchMarkets,
  fetchCoinDetails,
  fetchCoinHistory,
  fetchTrending,
  fetchRecentlyAdded,
  fetchGlobalMarketData,
};
