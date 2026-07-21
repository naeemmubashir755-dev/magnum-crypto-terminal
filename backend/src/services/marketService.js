const { coinGeckoBaseUrl } = require('../config/env');
const { getOrSet } = require('../utils/cache');

const coinGeckoCacheTtl = 60 * 1000;

// Ensure the base URL always ends with a slash so URL() joins paths correctly.
const baseUrl = coinGeckoBaseUrl.endsWith('/')
  ? coinGeckoBaseUrl
  : `${coinGeckoBaseUrl}/`;

// The MarketService is the only backend layer that communicates with CoinGecko.
// Each complete upstream URL is cached for 60 seconds before a fresh request is made.
const requestCoinGecko = async (path, query = {}) => {
  // Remove any leading slash from the path.
  const normalizedPath = path.replace(/^\/+/, '');

  const url = new URL(normalizedPath, baseUrl);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return getOrSet(`coingecko:${url.toString()}`, coinGeckoCacheTtl, async () => {
    try {
      console.log('\n========================================');
      console.log('CoinGecko Request:', url.toString());

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
        },
      });

      console.log('HTTP Status:', response.status);

      const text = await response.text();
      console.log('Raw Response:', text);

      let payload = null;

      try {
        payload = JSON.parse(text);
      } catch {
        console.log('Response is not valid JSON.');
      }

      if (!response.ok) {
        const error = new Error(
          payload?.status?.error_message ||
          `CoinGecko returned ${response.status}`
        );

        error.statusCode = response.status;
        throw error;
      }

      return payload;
    } catch (error) {
      console.error('CoinGecko Request Failed');
      console.error(error);
      throw error;
    }
  });
};

const fetchMarkets = ({ limit = 100, ids } = {}) =>
  requestCoinGecko('coins/markets', {
    vs_currency: 'usd',
    order: ids ? undefined : 'market_cap_desc',
    per_page: limit,
    page: 1,
    ids,
    price_change_percentage: '24h,7d',
    sparkline: 'false',
  });

const fetchCoinDetails = (id) =>
  requestCoinGecko(`coins/${encodeURIComponent(id)}`);

const fetchCoinHistory = (id, days) =>
  requestCoinGecko(`coins/${encodeURIComponent(id)}/market_chart`, {
    vs_currency: 'usd',
    days,
  });

const fetchTrending = () =>
  requestCoinGecko('search/trending');

const fetchRecentlyAdded = () =>
  requestCoinGecko('coins/list/new');

const fetchGlobalMarketData = () =>
  requestCoinGecko('global');

module.exports = {
  fetchMarkets,
  fetchCoinDetails,
  fetchCoinHistory,
  fetchTrending,
  fetchRecentlyAdded,
  fetchGlobalMarketData,
};