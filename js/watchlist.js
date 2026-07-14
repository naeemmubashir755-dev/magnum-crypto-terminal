const STORAGE_KEY = 'crypto-watchlist';
const REFRESH_INTERVAL_MS = 30000;

const state = {
  coins: [],
  query: '',
  sortKey: 'name',
  sortDirection: 'asc',
  refreshTimer: null,
};

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

const setStatusMessage = (message, isRefreshing = false) => {
  const status = document.getElementById('watchlist-status');
  if (!status) {
    return;
  }

  if (isRefreshing) {
    status.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.9rem;color:#f59e0b;"><span style="width:0.55rem;height:0.55rem;border-radius:999px;background:currentColor;display:inline-block;animation:pulse 1s infinite;"></span>Updating...</span>';
    return;
  }

  status.textContent = message;
};

const renderLoadingState = () => {
  const body = document.getElementById('watchlist-body');

  if (body) {
    body.innerHTML = '<tr><td colspan="7"><div class="table-status"><div class="spinner"></div><span>Loading watchlist...</span></div></td></tr>';
  }

  setStatusMessage('Loading watchlist...');
};

const renderEmptyState = () => {
  const body = document.getElementById('watchlist-body');

  if (body) {
    body.innerHTML = '<tr><td colspan="7">Your watchlist is empty.</td></tr>';
  }

  setStatusMessage('Your watchlist is empty.');
};

const saveWatchlist = (watchlist) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
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

const getRowMarkup = (coin) => `
  <td><img src="${coin.image || ''}" alt="${coin.name || 'Coin'} logo" class="market-logo" /></td>
  <td>${coin.name || 'Unknown Coin'}</td>
  <td>${coin.symbol?.toUpperCase() || 'N/A'}</td>
  <td>${formatCurrency(coin.current_price)}</td>
  <td class="${coin.price_change_percentage_24h >= 0 ? 'price-positive' : 'price-negative'}">${formatPercentage(coin.price_change_percentage_24h)}</td>
  <td>${formatMarketCap(coin.market_cap)}</td>
  <td><button type="button" class="btn-danger" data-remove-coin="${coin.id}">Remove</button></td>
`;

const renderWatchlistRows = (coins = state.coins, query = state.query, sortKey = state.sortKey, direction = state.sortDirection) => {
  const body = document.getElementById('watchlist-body');

  if (!body) {
    return;
  }

  state.coins = Array.isArray(coins) ? coins : [];
  state.query = query || '';
  state.sortKey = sortKey || 'name';
  state.sortDirection = direction || 'asc';

  const filteredCoins = filterCoinsByQuery(state.coins, state.query);
  const sortedCoins = sortCoins(filteredCoins, state.sortKey, state.sortDirection);

  if (!state.coins.length) {
    renderEmptyState();
    return;
  }

  if (!sortedCoins.length) {
    body.innerHTML = '<tr><td colspan="7">No matching coins found.</td></tr>';
    setStatusMessage('No matching coins found.');
    return;
  }

  setStatusMessage('Showing your saved cryptocurrencies.');

  const existingRows = Array.from(body.querySelectorAll('tr[data-coin-id]'));
  const existingRowMap = new Map(existingRows.map((row) => [row.dataset.coinId, row]));
  const visibleCoinIds = new Set(sortedCoins.map((coin) => coin.id));

  existingRows.forEach((row) => {
    if (!visibleCoinIds.has(row.dataset.coinId)) {
      row.remove();
    }
  });

  sortedCoins.forEach((coin, index) => {
    let row = existingRowMap.get(coin.id);

    if (!row) {
      row = document.createElement('tr');
      row.dataset.coinId = coin.id;
      body.appendChild(row);
      existingRowMap.set(coin.id, row);
    }

    row.innerHTML = getRowMarkup(coin);
    row.dataset.coinId = coin.id;
    row.className = '';

    const targetRow = body.children[index] || null;
    if (targetRow !== row) {
      body.insertBefore(row, targetRow);
    }
  });
};

const attachSorting = () => {
  const headers = document.querySelectorAll('#watchlist-table thead th');

  headers.forEach((header) => {
    const sortKey = header.dataset.sortKey || header.textContent.trim().toLowerCase();
    const mappedSortKey = {
      'coin name': 'name',
      'current price (usd)': 'current_price',
      '24h change (%)': 'price_change_percentage_24h',
      'market cap': 'market_cap',
    }[sortKey];

    if (!mappedSortKey) {
      return;
    }

    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      if (state.sortKey === mappedSortKey) {
        state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = mappedSortKey;
        state.sortDirection = 'asc';
      }

      renderWatchlistRows(state.coins, state.query, state.sortKey, state.sortDirection);
    });
  });
};

const refreshWatchlistData = async () => {
  const watchlist = getWatchlist();

  if (!watchlist.length) {
    state.coins = [];
    renderEmptyState();
    return;
  }

  setStatusMessage('', true);

  const uniqueCoinIds = [...new Set(watchlist)];

  try {
    const marketItems = await window.fetchMarketData(100);
    const coins = uniqueCoinIds
      .map((coinId) => marketItems.find((item) => item.id === coinId) || null)
      .filter(Boolean);

    renderWatchlistRows(coins);
  } catch (error) {
    console.error('Could not refresh watchlist data:', error);
    setStatusMessage('We could not refresh your watchlist right now.');
  }
};

const startAutoRefresh = () => {
  if (state.refreshTimer) {
    return;
  }

  state.refreshTimer = window.setInterval(() => {
    refreshWatchlistData();
  }, REFRESH_INTERVAL_MS);
};

const removeCoinFromWatchlist = (coinId) => {
  const watchlist = getWatchlist().filter((savedId) => savedId !== coinId);
  saveWatchlist(watchlist);

  state.coins = state.coins.filter((coin) => coin.id !== coinId);

  if (!watchlist.length) {
    renderEmptyState();
    return;
  }

  renderWatchlistRows(state.coins, state.query, state.sortKey, state.sortDirection);
};

const loadWatchlistData = async () => {
  const watchlist = getWatchlist();

  if (!watchlist.length) {
    state.coins = [];
    renderEmptyState();
    return;
  }

  renderLoadingState();

  try {
    await refreshWatchlistData();
    startAutoRefresh();
  } catch (error) {
    console.error('Could not load watchlist data:', error);
    setStatusMessage('We could not load your watchlist right now.');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const body = document.getElementById('watchlist-body');
  const searchInput = document.getElementById('watchlist-search');

  attachSorting();

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      renderWatchlistRows(state.coins, event.target.value, state.sortKey, state.sortDirection);
    });
  }

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
