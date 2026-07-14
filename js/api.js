(function () {
  const BASE_URL = 'https://api.coingecko.com/api/v3';

  // Fetch the top cryptocurrencies from CoinGecko's public markets endpoint.
  async function fetchMarketData(limit = 100) {
    const url = new URL(`${BASE_URL}/coins/markets`);
    url.searchParams.set('vs_currency', 'usd');
    url.searchParams.set('order', 'market_cap_desc');
    url.searchParams.set('per_page', String(limit));
    url.searchParams.set('page', '1');
    url.searchParams.set('price_change_percentage', '24h');
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
  window.fetchCoinDetails = fetchCoinDetails;
  window.fetchCoinHistory = fetchCoinHistory;
})();
