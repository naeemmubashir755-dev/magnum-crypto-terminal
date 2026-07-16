(function () {
  // Same-origin deployments use /api; hosts may inject MAGNUM_API_URL at runtime.
  const API_BASE_URL = window.MAGNUM_API_URL || '/api';

  // All frontend data requests pass through the Magnum backend.
  async function requestBackend(path, fallbackMessage) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || fallbackMessage);
    return payload;
  }

  // Fetch the top cryptocurrencies from CoinGecko's public markets endpoint.
  async function fetchMarketData(limit = 100) {
    return requestBackend(`/markets?limit=${encodeURIComponent(limit)}`, 'We could not load the latest market data right now. Please try again.');
  }

  // Fetch CoinGecko's search-popularity ranking for trending coins.
  async function fetchTrendingCoins() {
    return requestBackend('/trending', 'We could not load trending coins right now. Please try again.');
  }

  // Fetch normalized CoinGecko trending data for Dashboard market discovery.
  async function fetchDashboardTrendingCoins() {
    return requestBackend('/market/trending', 'Trending coins are currently unavailable.');
  }

  // Fetch the latest assets activated on CoinGecko (availability depends on the API plan).
  async function fetchRecentlyAddedCoins() {
    return requestBackend('/coins/recent', 'Recently added coins are unavailable with the current CoinGecko API access.');
  }

  // Fetch market fields for a known set of CoinGecko ids, used to enrich discovery lists.
  async function fetchMarketDataForIds(ids) {
    if (!ids?.length) return [];

    return requestBackend(`/markets?ids=${encodeURIComponent(ids.join(','))}`, 'We could not load market prices for these coins right now.');
  }

  // Fetch aggregate cryptocurrency market statistics for the dashboard overview.
  async function fetchGlobalMarketData() {
    return requestBackend('/global', 'We could not load the global market overview right now.');
  }

  // Alternative.me provides a free, public crypto Fear & Greed index.
  async function fetchFearGreedIndex() {
    return requestBackend('/fear-greed', 'The Fear & Greed index is currently unavailable.');
  }

  // Fetch the backend-normalized current Market Sentiment reading.
  async function fetchMarketFearGreed() {
    return requestBackend('/market/fear-greed', 'Market sentiment is currently unavailable.');
  }

  // Fetch detailed information for one cryptocurrency by its CoinGecko id.
  async function fetchCoinDetails(id) {
    return requestBackend(`/coins/${encodeURIComponent(id)}`, 'We could not load the coin details right now. Please try again.');
  }

  // Fetch historical price and market data for a cryptocurrency over a specified period.
  async function fetchCoinHistory(id, days) {
    return requestBackend(`/coins/${encodeURIComponent(id)}/history?days=${encodeURIComponent(days)}`, 'We could not load the price history right now. Please try again.');
  }

  window.fetchMarketData = fetchMarketData;
  window.fetchTrendingCoins = fetchTrendingCoins;
  window.fetchDashboardTrendingCoins = fetchDashboardTrendingCoins;
  window.fetchRecentlyAddedCoins = fetchRecentlyAddedCoins;
  window.fetchMarketDataForIds = fetchMarketDataForIds;
  window.fetchGlobalMarketData = fetchGlobalMarketData;
  window.fetchFearGreedIndex = fetchFearGreedIndex;
  window.fetchMarketFearGreed = fetchMarketFearGreed;
  window.fetchCoinDetails = fetchCoinDetails;
  window.fetchCoinHistory = fetchCoinHistory;
})();
