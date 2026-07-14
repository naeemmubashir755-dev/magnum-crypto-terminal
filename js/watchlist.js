const STORAGE_KEY = 'crypto-watchlist';

const getWatchlist = () => {
  try {
    const savedWatchlist = localStorage.getItem(STORAGE_KEY);
    return savedWatchlist ? JSON.parse(savedWatchlist) : [];
  } catch (error) {
    console.error('Could not read watchlist:', error);
    return [];
  }
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatPercentage = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }

  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

const formatMarketCap = (value) => formatCurrency(value || 0);

const renderLoadingState = () => {
  const body = document.getElementById('watchlist-body');
  const status = document.getElementById('watchlist-status');

  if (body) {
    body.innerHTML = '<tr><td colspan="6"><div class="table-status"><div class="spinner"></div><span>Loading watchlist...</span></div></td></tr>';
  }

  if (status) {
    status.textContent = 'Loading watchlist...';
  }
};

const renderEmptyState = () => {
  const body = document.getElementById('watchlist-body');
  const status = document.getElementById('watchlist-status');

  if (body) {
    body.innerHTML = '<tr><td colspan="6">Your watchlist is empty.</td></tr>';
  }

  if (status) {
    status.textContent = 'Your watchlist is empty.';
  }
};

const saveWatchlist = (watchlist) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
};

const removeCoinFromWatchlist = (coinId) => {
  const watchlist = getWatchlist().filter((savedId) => savedId !== coinId);
  saveWatchlist(watchlist);

  const body = document.getElementById('watchlist-body');
  if (body) {
    const row = body.querySelector(`tr[data-coin-id="${coinId}"]`);
    if (row) {
      row.remove();
    }
  }

  if (!watchlist.length) {
    renderEmptyState();
  }
};

const filterCoinsByQuery = (coins, query) => {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return coins;
  }

  return coins.filter((coin) => {
    const name = (coin.name || '').toLowerCase();
    const symbol = (coin.symbol || '').toLowerCase();
    return name.includes(normalizedQuery) || symbol.includes(normalizedQuery);
  });
};

const sortCoins = (coins, sortKey, direction) => {
  const sortedCoins = [...coins];

  sortedCoins.sort((a, b) => {
    let left = a[sortKey];
    let right = b[sortKey];

    if (sortKey === 'name') {
      left = (left || '').toLowerCase();
      right = (right || '').toLowerCase();
    } else {
      left = typeof left === 'number' ? left : Number(left) || 0;
      right = typeof right === 'number' ? right : Number(right) || 0;
    }

    if (left < right) {
      return direction === 'asc' ? -1 : 1;
    }

    if (left > right) {
      return direction === 'asc' ? 1 : -1;
    }

    return 0;
  });

  return sortedCoins;
};

const renderWatchlistRows = (coins, query = '', sortKey = 'name', direction = 'asc') => {
  const body = document.getElementById('watchlist-body');
  const status = document.getElementById('watchlist-status');
  const filteredCoins = filterCoinsByQuery(coins, query);
  const sortedCoins = sortCoins(filteredCoins, sortKey, direction);

  if (!body) {
    return;
  }

  if (!filteredCoins.length) {
    body.innerHTML = '<tr><td colspan="7">No matching coins found.</td></tr>';
    if (status) {
      status.textContent = 'No matching coins found.';
    }
    return;
  }

  if (status) {
    status.textContent = 'Showing your saved cryptocurrencies.';
  }

  body.innerHTML = sortedCoins
    .map(
      (coin) => `
        <tr data-coin-id="${coin.id}">
          <td><img src="${coin.image || ''}" alt="${coin.name || 'Coin'} logo" class="market-logo" /></td>
          <td>${coin.name || 'Unknown Coin'}</td>
          <td>${coin.symbol?.toUpperCase() || 'N/A'}</td>
          <td>${formatCurrency(coin.current_price)}</td>
          <td class="${coin.price_change_percentage_24h >= 0 ? 'price-positive' : 'price-negative'}">${formatPercentage(coin.price_change_percentage_24h)}</td>
          <td>${formatMarketCap(coin.market_cap)}</td>
          <td><button type="button" class="btn-danger" data-remove-coin="${coin.id}">Remove</button></td>
        </tr>
      `
    )
    .join('');
};

const attachSorting = (coins) => {
  const headers = document.querySelectorAll('#watchlist-table thead th');
  let currentSortKey = 'name';
  let currentDirection = 'asc';

  headers.forEach((header) => {
    const sortKey = header.dataset.sortKey;
    if (!sortKey) {
      return;
    }

    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      if (currentSortKey === sortKey) {
        currentDirection = currentDirection === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortKey = sortKey;
        currentDirection = 'asc';
      }

      const searchInput = document.getElementById('watchlist-search');
      const query = searchInput?.value || '';
      renderWatchlistRows(coins, query, currentSortKey, currentDirection);
    });
  });
};

const loadWatchlistData = async () => {
  const watchlist = getWatchlist();

  if (!watchlist.length) {
    renderEmptyState();
    return;
  }

  renderLoadingState();

  const uniqueCoinIds = [...new Set(watchlist)];

  try {
    const marketData = await Promise.all(
      uniqueCoinIds.map((coinId) =>
        window.fetchMarketData(100).then((marketItems) => marketItems.find((item) => item.id === coinId) || null)
      )
    );

    const coins = marketData.filter(Boolean);
    renderWatchlistRows(coins);
    attachSorting(coins);

    const searchInput = document.getElementById('watchlist-search');
    if (searchInput) {
      searchInput.addEventListener('input', (event) => {
        renderWatchlistRows(coins, event.target.value);
      });
    }
  } catch (error) {
    console.error('Could not load watchlist data:', error);

    const body = document.getElementById('watchlist-body');
    if (body) {
      body.innerHTML = '<tr><td colspan="6">We could not load your watchlist right now.</td></tr>';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('watchlist-body');

  body?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-remove-coin]');
    if (!button) {
      return;
    }

    const coinId = button.getAttribute('data-remove-coin');
    if (coinId) {
      removeCoinFromWatchlist(coinId);
    }
  });

  loadWatchlistData();
});
