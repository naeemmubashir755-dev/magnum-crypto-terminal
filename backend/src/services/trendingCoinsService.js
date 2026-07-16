const marketService = require('./marketService');

/**
 * Converts CoinGecko's search-trending payload into a stable response shape
 * for clients. CoinGecko scores are zero-based, so rank starts at one.
 */
const toFiniteNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeTrendingCoins = (coins = []) => coins
  .map(({ item } = {}, index) => {
    const price = toFiniteNumber(item?.data?.price);
    const marketCapRank = toFiniteNumber(item?.market_cap_rank);
    const score = toFiniteNumber(item?.score);

    return {
      trendingRank: score !== null ? score + 1 : index + 1,
      id: item?.id,
      name: item?.name,
      symbol: item?.symbol,
      price,
      marketCapRank,
      image: item?.small || item?.thumb || null,
    };
  })
  .filter((coin) => coin.id && coin.name);

/** Uses the existing cached MarketService CoinGecko helper. */
const getTrendingCoins = async () => {
  const payload = await marketService.fetchTrending();
  return { coins: normalizeTrendingCoins(payload?.coins) };
};

module.exports = { getTrendingCoins, normalizeTrendingCoins };
