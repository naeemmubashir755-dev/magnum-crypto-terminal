const { fearGreedApiUrl } = require('../config/env');

const fetchFearGreedIndex = async () => {
  const response = await fetch(fearGreedApiUrl, {
    headers: { Accept: 'application/json' },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error('The Fear & Greed index is currently unavailable.');
    error.statusCode = response.status;
    throw error;
  }
  return payload;
};

module.exports = { fetchFearGreedIndex };
