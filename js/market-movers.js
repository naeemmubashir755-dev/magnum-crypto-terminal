document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('market-movers-status');
  const grid = document.getElementById('market-movers-grid');
  const lists = {
    gainers: document.getElementById('top-gainers-list'),
    losers: document.getElementById('top-losers-list'),
    volume: document.getElementById('highest-volume-list'),
    trending: document.getElementById('trending-coins-list'),
  };

  if (!status || !grid || !Object.values(lists).every(Boolean)) return;

  const topCount = 10;
  const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  });

  const getChange = (coin) => Number(coin.price_change_percentage_24h) || 0;
  const getVolume = (coin) => Number(coin.total_volume) || 0;

  // Derive every movers list from the same market response to avoid duplicate API requests.
  const createMovers = (coins) => ({
    gainers: [...coins].sort((first, second) => getChange(second) - getChange(first)).slice(0, topCount),
    losers: [...coins].sort((first, second) => getChange(first) - getChange(second)).slice(0, topCount),
    volume: [...coins].sort((first, second) => getVolume(second) - getVolume(first)).slice(0, topCount),
    trending: [...coins].sort((first, second) => (
      Math.abs(getChange(second)) - Math.abs(getChange(first))
    )).slice(0, topCount),
  });

  const createListItem = (coin, metric, metricClass = '') => {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `coin.html?id=${encodeURIComponent(coin.id)}`;
    link.className = 'market-mover-link';

    const name = document.createElement('span');
    name.className = 'market-mover-name';
    name.textContent = `${coin.name} (${(coin.symbol || '').toUpperCase()})`;
    const value = document.createElement('span');
    value.className = `market-mover-metric ${metricClass}`.trim();
    value.textContent = metric;
    link.append(name, value);
    item.appendChild(link);
    return item;
  };

  const renderList = (list, coins, getMetric, getMetricClass) => {
    const items = document.createDocumentFragment();
    coins.forEach((coin) => {
      items.appendChild(createListItem(coin, getMetric(coin), getMetricClass(coin)));
    });
    list.replaceChildren(items);
  };

  const renderMovers = (movers) => {
    const formatChange = (coin) => `${getChange(coin) >= 0 ? '+' : ''}${getChange(coin).toFixed(2)}%`;
    const changeClass = (coin) => (getChange(coin) >= 0 ? 'price-positive' : 'price-negative');
    renderList(lists.gainers, movers.gainers, formatChange, changeClass);
    renderList(lists.losers, movers.losers, formatChange, changeClass);
    renderList(lists.volume, movers.volume, (coin) => compactCurrencyFormatter.format(getVolume(coin)), () => '');
    renderList(lists.trending, movers.trending, formatChange, changeClass);
  };

  const showError = (message) => {
    status.classList.add('error');
    status.textContent = message;
  };

  try {
    const coins = await window.fetchMarketData(100);
    renderMovers(createMovers(coins));
    grid.hidden = false;
    status.remove();
  } catch (error) {
    console.error('Unable to load market movers:', error);
    showError(error.message || 'Market movers are currently unavailable. Please try again later.');
  }
});
