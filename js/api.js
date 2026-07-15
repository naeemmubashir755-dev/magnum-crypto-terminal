(function () {
  const BASE_URL = 'https://api.coingecko.com/api/v3';

  // Fetch the top cryptocurrencies from CoinGecko's public markets endpoint.
  async function fetchMarketData(limit = 100) {
    const url = new URL(`${BASE_URL}/coins/markets`);
    url.searchParams.set('vs_currency', 'usd');
    url.searchParams.set('order', 'market_cap_desc');
    url.searchParams.set('per_page', String(limit));
    url.searchParams.set('page', '1');
    // Request both percentage windows so market views can show daily and weekly movement.
    url.searchParams.set('price_change_percentage', '24h,7d');
    url.searchParams.set('sparkline', 'false');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('We could not load the latest market data right now. Please try again.');
    }

    return response.json();
  }

  // Fetch CoinGecko's search-popularity ranking for trending coins.
  async function fetchTrendingCoins() {
    const response = await fetch(`${BASE_URL}/search/trending`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('We could not load trending coins right now. Please try again.');
    }

    return response.json();
  }

  // Fetch the latest assets activated on CoinGecko (availability depends on the API plan).
  async function fetchRecentlyAddedCoins() {
    const response = await fetch(`${BASE_URL}/coins/list/new`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Recently added coins are unavailable with the current CoinGecko API access.');
    }

    return response.json();
  }

  // Fetch market fields for a known set of CoinGecko ids, used to enrich discovery lists.
  async function fetchMarketDataForIds(ids) {
    if (!ids?.length) return [];

    const url = new URL(`${BASE_URL}/coins/markets`);
    url.searchParams.set('vs_currency', 'usd');
    url.searchParams.set('ids', ids.join(','));
    url.searchParams.set('price_change_percentage', '24h');
    url.searchParams.set('sparkline', 'false');

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error('We could not load market prices for these coins right now.');
    }

    return response.json();
  }

  // Fetch detailed information for one cryptocurrency by its CoinGecko id.
  async function fetchCoinDetails(id) {
    const response = await fetch(`${BASE_URL}/coins/${id}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('We could not load the coin details right now. Please try again.');
    }

    return response.json();
  }

  // Fetch historical price and market data for a cryptocurrency over a specified period.
  async function fetchCoinHistory(id, days) {
    const url = new URL(`${BASE_URL}/coins/${id}/market_chart`);
    url.searchParams.set('vs_currency', 'usd');
    url.searchParams.set('days', String(days));

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('We could not load the price history right now. Please try again.');
    }

    return response.json();
  }

  window.fetchMarketData = fetchMarketData;
  window.fetchTrendingCoins = fetchTrendingCoins;
  window.fetchRecentlyAddedCoins = fetchRecentlyAddedCoins;
  window.fetchMarketDataForIds = fetchMarketDataForIds;
  window.fetchCoinDetails = fetchCoinDetails;
  window.fetchCoinHistory = fetchCoinHistory;
})();
