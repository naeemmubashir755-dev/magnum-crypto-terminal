document.addEventListener('DOMContentLoaded', async () => {
  const tbody = document.getElementById('market-table-body');
  const searchInput = document.getElementById('market-search');
  const sortButtons = Array.from(document.querySelectorAll('button[data-sort]'));
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');
  const pageIndicator = document.getElementById('page-indicator');
  const tableStatus = document.getElementById('table-status');
  if (!tbody) return;

  const pageSize = 20;
  let allCoins = [];
  let visibleCoins = [];
  let currentSort = { key: null, buttonKey: null, direction: 'asc' };
  let currentPage = 1;

  const renderCoins = (coins) => {
    visibleCoins = coins;
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageCoins = coins.slice(start, end);

    tbody.innerHTML = pageCoins.map((coin) => {
      const price = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: coin.current_price >= 1000 ? 0 : 2,
      }).format(coin.current_price);

      const largeNumber = (value) =>
        new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 2,
        }).format(value);

      const change = `${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h?.toFixed(2) || '0.00'}%`;

      return `
        <tr data-id="${coin.id}">
          <td><img src="${coin.image}" alt="${coin.name} logo" width="24" height="24" /></td>
          <td>${coin.name}</td>
          <td>${coin.symbol.toUpperCase()}</td>
          <td>${price}</td>
          <td>${change}</td>
          <td>$${largeNumber(coin.market_cap)}</td>
          <td>$${largeNumber(coin.total_volume)}</td>
        </tr>
      `;
    }).join('');

    const totalPages = Math.max(1, Math.ceil(coins.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);

    if (pageIndicator) {
      pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    if (prevButton) {
      prevButton.disabled = currentPage === 1;
    }
    if (nextButton) {
      nextButton.disabled = currentPage === totalPages;
    }

    // Make each rendered row redirect to the coin details page using the CoinGecko id.
    tbody.querySelectorAll('tr[data-id]').forEach((row) => {
      row.addEventListener('click', () => {
        const coinId = row.getAttribute('data-id');
        if (coinId) {
          window.location.href = `coin.html?id=${coinId}`;
        }
      });
    });
  };

  const getFilteredCoins = (query) => {
    const value = query.trim().toLowerCase();
    return allCoins.filter((coin) => {
      const name = coin.name.toLowerCase();
      const symbol = coin.symbol.toLowerCase();
      return name.includes(value) || symbol.includes(value);
    });
  };

  const sortCoins = (coins) => {
    if (!currentSort.key) return coins;

    return [...coins].sort((a, b) => {
      const valueA = Number(a[currentSort.key]) || 0;
      const valueB = Number(b[currentSort.key]) || 0;
      if (valueA < valueB) return currentSort.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return currentSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const updateSortButtons = () => {
    sortButtons.forEach((button) => {
      const label = button.dataset.label || button.textContent.replace(/[▲▼]/g, '').trim();
      const isActive = button.dataset.sort === currentSort.buttonKey;
      button.textContent = isActive
        ? `${label} ${currentSort.direction === 'asc' ? '▲' : '▼'}`
        : label;
    });
  };

  const setTableStatus = (message) => {
    if (tableStatus) tableStatus.textContent = message;
  };

  const updateVisibleCoins = (query = '', resetPage = true) => {
    const filteredCoins = sortCoins(getFilteredCoins(query));
    if (resetPage) currentPage = 1;
    renderCoins(filteredCoins);
    updateSortButtons();
  };

  const applyLiveMarketUpdate = (update) => {
    if (!Array.isArray(update?.markets)) return;

    allCoins = update.markets;
    updateVisibleCoins(searchInput?.value || '', false);
    setTableStatus(`Live market update received at ${new Date(update.updatedAt).toLocaleTimeString()}.`);
  };

  try {
    allCoins = await window.fetchMarketData(100);
    updateVisibleCoins('');
    setTableStatus('Showing the latest market data.');
  } catch (error) {
    console.error(error);
    setTableStatus('We could not load market data. Live updates will retry automatically.');
  }

  const unsubscribe = window.marketSocket?.subscribe(applyLiveMarketUpdate);
  window.addEventListener('market-socket-status', (event) => {
    const { status, message } = event.detail || {};
    if (status === 'error' || status === 'disconnected') setTableStatus(message);
  });
  window.addEventListener('pagehide', () => unsubscribe?.(), { once: true });

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      updateVisibleCoins(event.target.value);
    });
  }

  sortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const keyMap = {
        price: 'current_price',
        change: 'price_change_percentage_24h',
        marketCap: 'market_cap',
        volume: 'total_volume',
      };

      const nextKey = keyMap[button.dataset.sort] || button.dataset.sort;

      if (currentSort.key === nextKey) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = { key: nextKey, buttonKey: button.dataset.sort, direction: 'asc' };
      }

      renderCoins(sortCoins(visibleCoins));
      updateSortButtons();
    });
  });

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderCoins(visibleCoins);
      }
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      const totalPages = Math.max(1, Math.ceil(visibleCoins.length / pageSize));
      if (currentPage < totalPages) {
        currentPage += 1;
        renderCoins(visibleCoins);
      }
    });
  }
});
