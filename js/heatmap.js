document.addEventListener('DOMContentLoaded', async () => {
  const heatmap = document.getElementById('crypto-heatmap');
  const status = document.getElementById('heatmap-status');

  if (!heatmap || !status) return;

  const formatPrice = (price) => {
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice)) return '—';

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: numericPrice < 0.01 ? 6 : 2,
    }).format(numericPrice);
  };

  const formatChange = (change) => {
    const numericChange = Number(change);
    if (!Number.isFinite(numericChange)) return '—';
    return `${numericChange >= 0 ? '+' : ''}${numericChange.toFixed(2)}%`;
  };

  // Map daily movement to the five requested heatmap intensity levels.
  const getHeatmapColor = (change) => {
    const numericChange = Number(change);
    if (!Number.isFinite(numericChange) || (numericChange > -1 && numericChange < 1)) return 'heatmap-neutral';
    if (numericChange >= 5) return 'heatmap-strong-gain';
    if (numericChange > 0) return 'heatmap-gain';
    if (numericChange <= -5) return 'heatmap-strong-loss';
    return 'heatmap-loss';
  };

  // Logarithmic scaling keeps the largest assets prominent without hiding smaller top-100 coins.
  const getTileSpan = (marketCap, minimumMarketCap, maximumMarketCap) => {
    const cap = Math.max(Number(marketCap) || 0, 1);
    const minimum = Math.max(minimumMarketCap, 1);
    const maximum = Math.max(maximumMarketCap, minimum + 1);
    const scale = (Math.log(cap) - Math.log(minimum)) / (Math.log(maximum) - Math.log(minimum));
    return Math.min(6, Math.max(2, Math.round(2 + (scale * 4))));
  };

  const createTile = (coin, span) => {
    const tile = document.createElement('a');
    tile.className = `heatmap-tile ${getHeatmapColor(coin.price_change_percentage_24h)}`;
    tile.href = `coin.html?id=${encodeURIComponent(coin.id)}`;
    tile.style.gridColumn = `span ${span}`;
    tile.style.gridRow = `span ${span >= 5 ? 2 : 1}`;
    tile.setAttribute('aria-label', `${coin.name}: ${formatChange(coin.price_change_percentage_24h)} in 24 hours`);

    const identity = document.createElement('div');
    identity.className = 'heatmap-tile-identity';
    const logo = document.createElement('img');
    logo.src = coin.image;
    logo.alt = '';
    logo.width = 28;
    logo.height = 28;
    logo.loading = 'lazy';
    logo.className = 'market-logo';
    const symbol = document.createElement('strong');
    symbol.textContent = (coin.symbol || '—').toUpperCase();
    identity.append(logo, symbol);

    const price = document.createElement('span');
    price.textContent = formatPrice(coin.current_price);
    const change = document.createElement('span');
    change.textContent = formatChange(coin.price_change_percentage_24h);
    change.className = 'heatmap-tile-change';
    tile.append(identity, price, change);
    return tile;
  };

  const renderHeatmap = (coins) => {
    const marketCaps = coins.map((coin) => Number(coin.market_cap)).filter(Number.isFinite);
    const minimumMarketCap = Math.min(...marketCaps);
    const maximumMarketCap = Math.max(...marketCaps);
    const tiles = document.createDocumentFragment();

    coins.forEach((coin) => {
      tiles.appendChild(createTile(coin, getTileSpan(coin.market_cap, minimumMarketCap, maximumMarketCap)));
    });

    heatmap.replaceChildren(tiles);
  };

  const showError = (message) => {
    status.classList.add('error');
    status.textContent = message;
  };

  try {
    const coins = await window.fetchMarketData(100);
    renderHeatmap(coins);
    status.remove();
  } catch (error) {
    console.error('Unable to load heatmap market data:', error);
    showError(error.message || 'Market data is currently unavailable. Please try again later.');
  }
});
