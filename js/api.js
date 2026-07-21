(function () {
  // Backend URL
  const API_BASE_URL =
    window.MAGNUM_API_URL || "http://localhost:5000/api";

  // All frontend data requests pass through the Magnum backend.
  async function requestBackend(path, fallbackMessage) {
    const url = `${API_BASE_URL}${path}`;

    console.log("======================================");
    console.log("Fetching:", url);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Status:", response.status);

    const payload = await response.json().catch(() => null);

    console.log("Response:", payload);

    if (!response.ok) {
      throw new Error(payload?.message || fallbackMessage);
    }

    return payload;
  }

  // Fetch the top cryptocurrencies from CoinGecko's public markets endpoint.
  async function fetchMarketData(limit = 100) {
    return requestBackend(
      `/markets?limit=${encodeURIComponent(limit)}`,
      "We could not load the latest market data right now. Please try again."
    );
  }

  // Fetch CoinGecko's search-popularity ranking.
  async function fetchTrendingCoins() {
    return requestBackend(
      "/trending",
      "We could not load trending coins right now. Please try again."
    );
  }

  // Dashboard Trending Coins
  async function fetchDashboardTrendingCoins() {
    return requestBackend(
      "/market/trending",
      "Trending coins are currently unavailable."
    );
  }

  // Recently Added Coins
  async function fetchRecentlyAddedCoins() {
    return requestBackend(
      "/coins/recent",
      "Recently added coins are unavailable."
    );
  }

  // Fetch markets for ids
  async function fetchMarketDataForIds(ids) {
    if (!ids?.length) return [];

    return requestBackend(
      `/markets?ids=${encodeURIComponent(ids.join(","))}`,
      "We could not load market prices."
    );
  }

  // Original global endpoint
  async function fetchGlobalMarketData() {
    return requestBackend(
      "/global",
      "We could not load global market data."
    );
  }

  // Dashboard Global Market
  async function fetchDashboardGlobalMarket() {
    return requestBackend(
      "/market/global",
      "Global market data is currently unavailable."
    );
  }

  // Fear & Greed
  async function fetchFearGreedIndex() {
    return requestBackend(
      "/fear-greed",
      "Fear & Greed data unavailable."
    );
  }

  // Dashboard Fear & Greed
  async function fetchMarketFearGreed() {
    return requestBackend(
      "/market/fear-greed",
      "Market sentiment unavailable."
    );
  }

  // Coin Details
  async function fetchCoinDetails(id) {
    return requestBackend(
      `/coins/${encodeURIComponent(id)}`,
      "Unable to load coin details."
    );
  }

  // Coin History
  async function fetchCoinHistory(id, days) {
    return requestBackend(
      `/coins/${encodeURIComponent(id)}/history?days=${encodeURIComponent(days)}`,
      "Unable to load history."
    );
  }

  window.fetchMarketData = fetchMarketData;
  window.fetchTrendingCoins = fetchTrendingCoins;
  window.fetchDashboardTrendingCoins = fetchDashboardTrendingCoins;
  window.fetchRecentlyAddedCoins = fetchRecentlyAddedCoins;
  window.fetchMarketDataForIds = fetchMarketDataForIds;
  window.fetchGlobalMarketData = fetchGlobalMarketData;
  window.fetchDashboardGlobalMarket = fetchDashboardGlobalMarket;
  window.fetchFearGreedIndex = fetchFearGreedIndex;
  window.fetchMarketFearGreed = fetchMarketFearGreed;
  window.fetchCoinDetails = fetchCoinDetails;
  window.fetchCoinHistory = fetchCoinHistory;
})();