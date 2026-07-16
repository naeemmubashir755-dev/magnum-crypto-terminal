// Backward-compatible export for the existing /api/fear-greed endpoint.
const { fetchFearGreedIndex } = require('./marketSentimentService');

module.exports = { fetchFearGreedIndex };
