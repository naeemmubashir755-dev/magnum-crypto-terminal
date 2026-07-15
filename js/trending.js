document.addEventListener('DOMContentLoaded', async () => {
  const sections = {
    trending: { list: document.getElementById('trending-list'), status: document.getElementById('trending-status') },
    recent: { list: document.getElementById('recent-list'), status: document.getElementById('recent-status') },
    visited: { list: document.getElementById('visited-list'), status: document.getElementById('visited-status') },
  };

  if (!Object.values(sections).every(({ list, status }) => list && status)) return;

  const formatPrice = (price) => {
    const value = Number(price);
    if (!Number.isFinite(value)) return 'Price unavailable';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: value < 0.01 ? 6 : 2,
    }).format(value);
  };

  const formatChange = (change) => {
    const value = Number(change);
    if (!Number.isFinite(value)) return '24h change unavailable';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const renderCoins = ({ list, status }, coins) => {
    const items = document.createDocumentFragment();
    coins.forEach((coin) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `coin.html?id=${encodeURIComponent(coin.id)}`;
      link.className = 'discovery-coin-link';

      const logo = document.createElement('img');
      logo.src = coin.image || '';
      logo.alt = '';
      logo.width = 28;
      logo.height = 28;
      logo.className = 'market-logo';
      const identity = document.createElement('span');
      identity.className = 'discovery-coin-name';
      identity.textContent = `${coin.name} (${(coin.symbol || '').toUpperCase()})`;
      const price = document.createElement('span');
      price.textContent = formatPrice(coin.price);
      const change = document.createElement('span');
      change.className = Number(coin.change) >= 0 ? 'price-positive' : 'price-negative';
      change.textContent = formatChange(coin.change);
      link.append(logo, identity, price, change);
      item.appendChild(link);
      items.appendChild(item);
    });
    list.replaceChildren(items);
    status.remove();
  };

  const showError = ({ status }, message) => {
    status.classList.add('error');
    status.textContent = message;
  };

  const normalizeTrendingCoin = ({ item }) => ({
    id: item.id,
    name: item.name,
    symbol: item.symbol,
    image: item.small || item.thumb,
    price: item.data?.price,
    change: item.data?.price_change_percentage_24h?.usd,
  });

  const loadTrendingData = async () => {
    try {
      const response = await window.fetchTrendingCoins();
      const coins = (response.coins || []).map(normalizeTrendingCoin);
      renderCoins(sections.trending, coins);
      // CoinGecko's trending endpoint ranks assets by popular user searches, used here as most visited.
      renderCoins(sections.visited, coins);
    } catch (error) {
      console.error('Unable to load trending coins:', error);
      showError(sections.trending, error.message || 'Trending coins are currently unavailable.');
      showError(sections.visited, 'Most visited coins are currently unavailable.');
    }
  };

  const loadRecentlyAddedData = async () => {
    try {
      const recentCoins = await window.fetchRecentlyAddedCoins();
      const recentIds = recentCoins.slice(0, 10).map((coin) => coin.id);
      const marketData = await window.fetchMarketDataForIds(recentIds);
      const marketsById = new Map(marketData.map((coin) => [coin.id, coin]));
      const coins = recentCoins.slice(0, 10).map((coin) => {
        const market = marketsById.get(coin.id);
        return {
          ...coin,
          image: market?.image,
          price: market?.current_price,
          change: market?.price_change_percentage_24h,
        };
      });
      renderCoins(sections.recent, coins);
    } catch (error) {
      console.error('Unable to load recently added coins:', error);
      showError(sections.recent, error.message || 'Recently added coins are currently unavailable.');
    }
  };

  // The two independent discovery sources can load in parallel.
  await Promise.all([loadTrendingData(), loadRecentlyAddedData()]);
});
