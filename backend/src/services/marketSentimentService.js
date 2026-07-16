const { fearGreedApiUrl } = require('../config/env');
const { getOrSet } = require('../utils/cache');

const SENTIMENT_CACHE_TTL_MS = 60 * 1000;

/**
 * Retrieves Alternative.me's source payload. The short cache protects the
 * upstream API when multiple dashboard clients request the same index.
 */
const fetchFearGreedIndex = () => getOrSet(
  'alternative:market-fear-greed',
  SENTIMENT_CACHE_TTL_MS,
  async () => {
    let response;
    try {
      response = await fetch(fearGreedApiUrl, {
        headers: { Accept: 'application/json' },
      });
    } catch (cause) {
      const error = new Error('The Fear & Greed index is currently unavailable.');
      error.statusCode = 503;
      throw error;
    }
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error('The Fear & Greed index is currently unavailable.');
      error.statusCode = response.status;
      throw error;
    }

    return payload;
  },
);

/**
 * Returns a stable, UI-friendly representation of the latest market
 * sentiment reading without exposing Alternative.me's response structure.
 */
const getCurrentFearGreed = async () => {
  const payload = await fetchFearGreedIndex();
  const latest = payload?.data?.[0];
  const value = Number(latest?.value);

  if (!Number.isFinite(value) || !latest?.value_classification) {
    const error = new Error('Market sentiment data is currently unavailable.');
    error.statusCode = 502;
    throw error;
  }

  const timestamp = Number(latest.timestamp);
  return {
    value,
    classification: latest.value_classification,
    lastUpdated: Number.isFinite(timestamp) ? new Date(timestamp * 1000).toISOString() : null,
  };
};

module.exports = { fetchFearGreedIndex, getCurrentFearGreed };
