const formatHistoryForChart = (history) => {
  const rawPrices = history?.prices ?? [];

  const labels = rawPrices.map(([timestamp]) =>
    new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  );

  const prices = rawPrices.map(([, price]) => price);

  return { labels, prices };
};

const showChartStatus = (message, type = 'loading') => {
  const chartContainer = document.getElementById('price-chart');

  if (!chartContainer) {
    return;
  }

  let status = chartContainer.querySelector('.chart-state');
  if (!status) {
    status = document.createElement('div');
    status.className = 'chart-state';
    chartContainer.appendChild(status);
  }

  status.className = `chart-state ${type}`;

  if (type === 'loading') {
    status.innerHTML = '<div class="spinner"></div><span>Loading historical prices...</span>';
  } else {
    status.innerHTML = `<span>${message}</span>`;
  }

  chartContainer.classList.toggle('is-loading', type === 'loading');
  chartContainer.classList.toggle('has-error', type === 'error');

  const canvas = chartContainer.querySelector('canvas');
  if (canvas) {
    canvas.style.opacity = type === 'loading' ? '0.45' : '1';
  }
};

const hideChartStatus = () => {
  const chartContainer = document.getElementById('price-chart');

  if (!chartContainer) {
    return;
  }

  const status = chartContainer.querySelector('.chart-state');
  if (status) {
    status.remove();
  }

  chartContainer.classList.remove('is-loading', 'has-error');

  const canvas = chartContainer.querySelector('canvas');
  if (canvas) {
    canvas.style.opacity = '1';
  }
};

const renderPriceChart = (labels, prices) => {
  const chartContainer = document.getElementById('price-chart');

  if (!chartContainer || !labels?.length || !prices?.length || typeof window.Chart === 'undefined') {
    return;
  }

  chartContainer.style.minHeight = '320px';
  chartContainer.style.position = 'relative';

  let canvas = chartContainer.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', 'Price chart');
    chartContainer.appendChild(canvas);
  }

  if (!window.priceChartInstance) {
    window.priceChartInstance = new window.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Price (USD)',
            data: prices,
            borderColor: '#3b82f6',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 0,
            fill: false,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: 'easeInOutQuart',
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            ticks: {
              callback: (value) =>
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(value),
            },
          },
        },
      },
    });
  } else {
    window.priceChartInstance.data.labels = labels;
    window.priceChartInstance.data.datasets[0].data = prices;
    window.priceChartInstance.options.animation = {
      duration: 800,
      easing: 'easeInOutQuart',
    };
    window.priceChartInstance.update('active');
  }

  hideChartStatus();
};

const setActiveTimeframeButton = (activeButton) => {
  const buttons = document.querySelectorAll('#chart-section button[data-days]');

  buttons.forEach((button) => {
    const isActive = button === activeButton;

    button.classList.toggle('active-timeframe', isActive);
    button.style.fontWeight = isActive ? '700' : '500';
    button.style.backgroundColor = isActive ? '#3b82f6' : '';
    button.style.color = isActive ? '#fff' : '';
    button.style.borderColor = isActive ? '#3b82f6' : '';
  });
};

const loadHistoryAndRenderChart = async (coinId, days) => {
  const chartContainer = document.getElementById('price-chart');
  if (!chartContainer) {
    return;
  }

  showChartStatus('Loading historical prices...', 'loading');

  try {
    const history = await window.fetchCoinHistory(coinId, days);
    console.log('Coin history response:', history);

    const { labels, prices } = formatHistoryForChart(history);
    console.log('Labels:', labels);
    console.log('Prices:', prices);

    if (!labels.length || !prices.length) {
      throw new Error('No price history data was returned.');
    }

    renderPriceChart(labels, prices);
  } catch (historyError) {
    console.error('Could not load coin history:', historyError);
    showChartStatus('We could not load the chart data right now. Please try again.', 'error');
  }
};

const getWatchlist = () => {
  try {
    const storedWatchlist = localStorage.getItem('crypto-watchlist');
    return storedWatchlist ? JSON.parse(storedWatchlist) : [];
  } catch (error) {
    console.error('Could not read watchlist:', error);
    return [];
  }
};

const saveWatchlist = (watchlist) => {
  localStorage.setItem('crypto-watchlist', JSON.stringify(watchlist));
};

const addCoinToWatchlist = (coinId) => {
  if (!coinId) {
    return;
  }

  const watchlist = getWatchlist();
  if (!watchlist.includes(coinId)) {
    watchlist.push(coinId);
    saveWatchlist(watchlist);
  }

  console.log('Updated watchlist:', watchlist);
};

document.addEventListener('DOMContentLoaded', async () => {
  // Read the id from the current URL.
  const params = new URLSearchParams(window.location.search);
  const coinId = params.get('id');

  // Log the selected id to the browser console.
  console.log('Selected coin id:', coinId);

  // Show a friendly message if no id was provided.
  if (!coinId) {
    const main = document.querySelector('main');
    if (main) {
      main.innerHTML = '<p>No cryptocurrency selected.</p>';
    }
    return;
  }

  try {
    // Connect the timeframe buttons so they refresh the existing chart in place.
    const timeframeButtons = document.querySelectorAll('#chart-section button[data-days]');
    timeframeButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const days = button.getAttribute('data-days');
        setActiveTimeframeButton(button);
        await loadHistoryAndRenderChart(coinId, days);
      });
    });

    // Attach the watchlist action to the dedicated button.
    const watchlistButton = document.getElementById('watchlist-btn');
    if (watchlistButton) {
      watchlistButton.addEventListener('click', () => {
        addCoinToWatchlist(coinId);
      });
    }

    // Fetch the detailed coin information from the shared API helper.
    const coin = await window.fetchCoinDetails(coinId);

    // Log the full response for debugging purposes.
    console.log('Coin details response:', coin);

    // Load the default 30-day history and render the initial chart.
    const defaultButton = document.querySelector('#chart-section button[data-days="30"]');
    if (defaultButton) {
      setActiveTimeframeButton(defaultButton);
    }
    await loadHistoryAndRenderChart(coinId, 30);

    // Format numbers for display.
    const formatCurrency = (value) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
      }).format(value || 0);

    const formatNumber = (value) =>
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2,
      }).format(value || 0);

    // Populate the coin header.
    const logo = document.getElementById('coin-logo');
    if (logo) logo.src = coin.image?.large || '';
    if (logo) logo.alt = coin.name || 'Coin logo';

    const title = document.getElementById('coin-header-title');
    if (title) title.textContent = coin.name || 'Coin Name';

    const symbol = document.getElementById('coin-symbol');
    if (symbol) symbol.textContent = coin.symbol?.toUpperCase() || 'N/A';

    // Populate the enhanced coin header summary.
    const rankHeader = document.getElementById('coin-rank-header');
    if (rankHeader) rankHeader.textContent = `#${coin.market_cap_rank || 'N/A'}`;

    const priceHeader = document.getElementById('coin-price-header');
    if (priceHeader) priceHeader.textContent = formatCurrency(coin.market_data?.current_price?.usd);

    const changeHeader = document.getElementById('coin-change-header');
    if (changeHeader) {
      const changeValue = coin.market_data?.price_change_percentage_24h || 0;
      const sign = changeValue >= 0 ? '+' : '';
      changeHeader.textContent = `${sign}${changeValue.toFixed(2)}%`;
      changeHeader.classList.remove('price-positive', 'price-negative');
      changeHeader.classList.add(changeValue >= 0 ? 'price-positive' : 'price-negative');
    }

    // Populate price summary.
    const price = document.getElementById('coin-price');
    if (price) price.textContent = formatCurrency(coin.market_data?.current_price?.usd);

    const priceCard = document.getElementById('coin-price-card');
    if (priceCard) priceCard.textContent = formatCurrency(coin.market_data?.current_price?.usd);

    const change = document.getElementById('coin-change');
    if (change) {
      const changeValue = coin.market_data?.price_change_percentage_24h || 0;
      const sign = changeValue >= 0 ? '+' : '';
      change.textContent = `${sign}${changeValue.toFixed(2)}%`;
      change.classList.remove('price-positive', 'price-negative');
      change.classList.add(changeValue >= 0 ? 'price-positive' : 'price-negative');
    }

    const changeCard = document.getElementById('coin-change-card');
    if (changeCard) {
      const changeValue = coin.market_data?.price_change_percentage_24h || 0;
      const sign = changeValue >= 0 ? '+' : '';
      changeCard.textContent = `${sign}${changeValue.toFixed(2)}%`;
      changeCard.classList.remove('price-positive', 'price-negative');
      changeCard.classList.add(changeValue >= 0 ? 'price-positive' : 'price-negative');
    }

    const rank = document.getElementById('coin-rank');
    if (rank) rank.textContent = `#${coin.market_cap_rank || 'N/A'}`;

    // Populate market statistics.
    const marketCap = document.getElementById('coin-market-cap');
    if (marketCap) marketCap.textContent = formatCurrency(coin.market_data?.market_cap?.usd);

    const fdv = document.getElementById('coin-fdv');
    if (fdv) fdv.textContent = formatCurrency(coin.market_data?.fully_diluted_valuation?.usd);

    const circulatingSupply = document.getElementById('coin-circulating-supply');
    if (circulatingSupply) circulatingSupply.textContent = formatNumber(coin.market_data?.circulating_supply);

    const totalSupply = document.getElementById('coin-total-supply');
    if (totalSupply) totalSupply.textContent = formatNumber(coin.market_data?.total_supply);

    const maxSupply = document.getElementById('coin-max-supply');
    if (maxSupply) maxSupply.textContent = formatNumber(coin.market_data?.max_supply);

    // Populate price statistics.
    const high24h = document.getElementById('coin-high-24h');
    if (high24h) high24h.textContent = formatCurrency(coin.market_data?.high_24h?.usd);

    const low24h = document.getElementById('coin-low-24h');
    if (low24h) low24h.textContent = formatCurrency(coin.market_data?.low_24h?.usd);

    const ath = document.getElementById('coin-ath');
    if (ath) ath.textContent = formatCurrency(coin.market_data?.ath?.usd);

    const atl = document.getElementById('coin-atl');
    if (atl) atl.textContent = formatCurrency(coin.market_data?.atl?.usd);

    // Populate description.
    const description = document.getElementById('coin-description');
    if (description) description.textContent = coin.description?.en || 'No description available.';

    // Populate links.
    const website = document.getElementById('coin-website');
    if (website && coin.links?.homepage?.[0]) {
      website.href = coin.links.homepage[0];
      website.textContent = coin.links.homepage[0];
    }

    const explorer = document.getElementById('coin-explorer');
    if (explorer && coin.links?.blockchain_site?.[0]) {
      explorer.href = coin.links.blockchain_site[0];
      explorer.textContent = coin.links.blockchain_site[0];
    }
  } catch (error) {
    // Show an error message if the request fails.
    const main = document.querySelector('main');
    if (main) {
      main.innerHTML = '<p>We could not load the coin details right now.</p>';
    }
    console.error(error);
  }
});
