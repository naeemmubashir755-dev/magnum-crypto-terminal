document.addEventListener('DOMContentLoaded', async () => {
  const table = document.getElementById('screener-table');
  const tableBody = document.getElementById('screener-table-body');
  const status = document.getElementById('screener-status');
  const filtersForm = document.getElementById('screener-filters');
  const saveForm = document.getElementById('screener-save-form');
  const nameInput = document.getElementById('screener-name');
  const savedScreenerSelect = document.getElementById('saved-screener-select');
  const savedScreenerStatus = document.getElementById('saved-screener-status');
  const loadScreenerButton = document.getElementById('load-screener');
  const renameScreenerButton = document.getElementById('rename-screener');
  const deleteScreenerButton = document.getElementById('delete-screener');
  const retryButton = document.getElementById('retry-screener');

  if (!table || !tableBody || !status || !filtersForm || !saveForm || !nameInput
    || !savedScreenerSelect || !savedScreenerStatus || !loadScreenerButton
    || !renameScreenerButton || !deleteScreenerButton || !retryButton) return;

  const savedScreenersStorageKey = 'crypto-terminal-saved-screeners';

  const filterFields = {
    marketCap: { input: filtersForm.elements.marketCap, coinKey: 'market_cap' },
    price: { input: filtersForm.elements.price, coinKey: 'current_price' },
    volume: { input: filtersForm.elements.volume, coinKey: 'total_volume' },
    change24h: { input: filtersForm.elements.change24h, coinKey: 'price_change_percentage_24h' },
    change7d: { input: filtersForm.elements.change7d, coinKey: 'price_change_percentage_7d_in_currency' },
  };
  const sortFields = {
    Coin: 'name',
    'Current Price (USD)': 'current_price',
    '24h Change (%)': 'price_change_percentage_24h',
    '7d Change (%)': 'price_change_percentage_7d_in_currency',
    'Market Cap': 'market_cap',
    'Total Volume': 'total_volume',
  };
  let allCoins = [];
  let currentSort = { key: null, direction: 'asc' };

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });

  const compactCurrencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  });

  // Formats unavailable values safely and assigns the terminal's gain/loss color.
  const formatChange = (value) => {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return { className: '', text: '—' };
    }

    return {
      className: numericValue >= 0 ? 'price-positive' : 'price-negative',
      text: `${numericValue >= 0 ? '+' : ''}${numericValue.toFixed(2)}%`,
    };
  };

  const formatPrice = (price) => {
    if (!Number.isFinite(Number(price))) return '—';
    return currencyFormatter.format(price);
  };

  // Render only API-provided text and attributes through DOM nodes to avoid HTML injection.
  const createCell = (content, className = '') => {
    const cell = document.createElement('td');
    cell.textContent = content;
    if (className) cell.className = className;
    return cell;
  };

  const renderCoins = (coins) => {
    const rows = document.createDocumentFragment();

    coins.forEach((coin) => {
      const row = document.createElement('tr');
      const logoCell = document.createElement('td');
      const logo = document.createElement('img');
      logo.src = coin.image;
      logo.alt = `${coin.name} logo`;
      logo.width = 28;
      logo.height = 28;
      logo.loading = 'lazy';
      logo.className = 'market-logo';
      logoCell.appendChild(logo);

      const dailyChange = formatChange(coin.price_change_percentage_24h);
      const weeklyChange = formatChange(coin.price_change_percentage_7d_in_currency);
      row.append(
        logoCell,
        createCell(coin.name || 'Unknown'),
        createCell((coin.symbol || '—').toUpperCase()),
        createCell(formatPrice(coin.current_price)),
        createCell(dailyChange.text, dailyChange.className),
        createCell(weeklyChange.text, weeklyChange.className),
        createCell(Number.isFinite(Number(coin.market_cap)) ? compactCurrencyFormatter.format(coin.market_cap) : '—'),
        createCell(Number.isFinite(Number(coin.total_volume)) ? compactCurrencyFormatter.format(coin.total_volume) : '—'),
      );
      rows.appendChild(row);
    });

    tableBody.replaceChildren(rows);
    table.hidden = false;
  };

  const getActiveFilters = () => Object.values(filterFields).map(({ input, coinKey }) => ({
    coinKey,
    minimum: input.value === '' ? null : Number(input.value),
  })).filter(({ minimum }) => Number.isFinite(minimum));

  const getFilterValues = () => Object.fromEntries(
    Object.entries(filterFields).map(([name, { input }]) => [name, input.value]),
  );

  const showSavedScreenerMessage = (message, type = '') => {
    savedScreenerStatus.textContent = message;
    savedScreenerStatus.className = `holding-form-status${type ? ` ${type}` : ''}`;
  };

  const readSavedScreeners = () => {
    try {
      const storedScreeners = JSON.parse(window.localStorage.getItem(savedScreenersStorageKey) || '[]');
      return Array.isArray(storedScreeners) ? storedScreeners : [];
    } catch (error) {
      console.error('Unable to read saved screeners:', error);
      showSavedScreenerMessage('Saved screeners are unavailable in this browser.', 'error');
      return [];
    }
  };

  const writeSavedScreeners = (screeners) => {
    try {
      window.localStorage.setItem(savedScreenersStorageKey, JSON.stringify(screeners));
      return true;
    } catch (error) {
      console.error('Unable to save screeners:', error);
      showSavedScreenerMessage('Unable to save screeners in this browser.', 'error');
      return false;
    }
  };

  const renderSavedScreenerOptions = (screeners, selectedId = '') => {
    const options = document.createDocumentFragment();
    const placeholder = new Option('Select a saved screener', '');
    options.appendChild(placeholder);
    screeners.forEach((screener) => {
      options.appendChild(new Option(screener.name, screener.id));
    });
    savedScreenerSelect.replaceChildren(options);
    savedScreenerSelect.value = selectedId;
  };

  const getSelectedScreener = () => readSavedScreeners().find(
    (screener) => screener.id === savedScreenerSelect.value,
  );

  const createScreenerId = () => (window.crypto?.randomUUID?.()
    || `screener-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  // Filter the in-memory response only; controls never trigger another API request.
  const getFilteredCoins = () => {
    const activeFilters = getActiveFilters();
    return allCoins.filter((coin) => activeFilters.every(({ coinKey, minimum }) => {
      const value = Number(coin[coinKey]);
      return Number.isFinite(value) && value >= minimum;
    }));
  };

  const sortCoins = (coins) => {
    if (!currentSort.key) return coins;

    return [...coins].sort((firstCoin, secondCoin) => {
      // Coin names are alphabetic; all other supported fields are numeric market values.
      if (currentSort.key === 'name') {
        const comparison = (firstCoin.name || '').localeCompare(secondCoin.name || '', undefined, {
          sensitivity: 'base',
        });
        return currentSort.direction === 'asc' ? comparison : -comparison;
      }

      const firstValue = Number(firstCoin[currentSort.key]);
      const secondValue = Number(secondCoin[currentSort.key]);
      const normalizedFirstValue = Number.isFinite(firstValue) ? firstValue : -Infinity;
      const normalizedSecondValue = Number.isFinite(secondValue) ? secondValue : -Infinity;

      return currentSort.direction === 'asc'
        ? normalizedFirstValue - normalizedSecondValue
        : normalizedSecondValue - normalizedFirstValue;
    });
  };

  const updateSortControls = () => {
    table.querySelectorAll('button[data-sort-key]').forEach((button) => {
      const isActive = button.dataset.sortKey === currentSort.key;
      button.textContent = isActive
        ? `${button.dataset.sortLabel} (${currentSort.direction})`
        : button.dataset.sortLabel;
      button.closest('th').setAttribute('aria-sort', isActive
        ? (currentSort.direction === 'asc' ? 'ascending' : 'descending')
        : 'none');
    });
  };

  // Turn the existing numeric column headers into accessible sort controls.
  const initializeSortControls = () => {
    Array.from(table.querySelectorAll('thead th')).forEach((header) => {
      const label = header.textContent.trim();
      const sortKey = sortFields[label];
      if (!sortKey) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-secondary';
      button.dataset.sortKey = sortKey;
      button.dataset.sortLabel = label;
      button.textContent = label;
      button.addEventListener('click', () => {
        currentSort = currentSort.key === sortKey
          ? { key: sortKey, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' }
          : { key: sortKey, direction: 'asc' };
        updateScreener();
      });

      header.replaceChildren(button);
      header.setAttribute('aria-sort', 'none');
    });
  };

  const updateScreener = () => {
    const filteredCoins = sortCoins(getFilteredCoins());
    renderCoins(filteredCoins);
    updateSortControls();
    status.classList.remove('error');
    status.textContent = `${filteredCoins.length} ${filteredCoins.length === 1 ? 'cryptocurrency' : 'cryptocurrencies'} match your filters.`;
    retryButton.hidden = true;
  };

  // Saved screeners contain the current filter values and selected sort order only.
  const loadScreener = (screener) => {
    Object.entries(filterFields).forEach(([name, { input }]) => {
      input.value = screener.filters?.[name] || '';
    });

    const savedSort = screener.sort;
    currentSort = savedSort && Object.values(sortFields).includes(savedSort.key)
      && ['asc', 'desc'].includes(savedSort.direction)
      ? savedSort
      : { key: null, direction: 'asc' };
    updateScreener();
  };

  const saveCurrentScreener = () => {
    const name = nameInput.value.trim();
    if (!name) {
      showSavedScreenerMessage('Enter a name before saving.', 'error');
      nameInput.focus();
      return;
    }

    const screeners = readSavedScreeners();
    const screener = {
      id: createScreenerId(),
      name,
      filters: getFilterValues(),
      sort: { ...currentSort },
    };
    if (!writeSavedScreeners([...screeners, screener])) return;

    renderSavedScreenerOptions([...screeners, screener], screener.id);
    nameInput.value = '';
    showSavedScreenerMessage(`Saved "${name}".`, 'success');
  };

  const renameSelectedScreener = () => {
    const screener = getSelectedScreener();
    const name = nameInput.value.trim();
    if (!screener) {
      showSavedScreenerMessage('Select a screener to rename.', 'error');
      return;
    }
    if (!name) {
      showSavedScreenerMessage('Enter a new name before renaming.', 'error');
      nameInput.focus();
      return;
    }

    const screeners = readSavedScreeners().map((item) => (
      item.id === screener.id ? { ...item, name } : item
    ));
    if (!writeSavedScreeners(screeners)) return;
    renderSavedScreenerOptions(screeners, screener.id);
    nameInput.value = '';
    showSavedScreenerMessage(`Renamed to "${name}".`, 'success');
  };

  const deleteSelectedScreener = () => {
    const screener = getSelectedScreener();
    if (!screener) {
      showSavedScreenerMessage('Select a screener to delete.', 'error');
      return;
    }

    const screeners = readSavedScreeners().filter((item) => item.id !== screener.id);
    if (!writeSavedScreeners(screeners)) return;
    renderSavedScreenerOptions(screeners);
    showSavedScreenerMessage(`Deleted "${screener.name}".`, 'success');
  };

  const showError = (message) => {
    status.classList.add('error');
    status.textContent = message;
    retryButton.hidden = false;
  };

  const showLoading = () => {
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    spinner.setAttribute('aria-hidden', 'true');
    status.classList.remove('error');
    status.replaceChildren(spinner, document.createTextNode('Loading market data...'));
    retryButton.hidden = true;
  };

  // Use the shared helper for the initial load and any user-requested retry.
  const loadMarketData = async () => {
    showLoading();
    retryButton.disabled = true;
    try {
      allCoins = await window.fetchMarketData(100);
      updateScreener();
    } catch (error) {
      console.error('Unable to load screener market data:', error);
      showError(error.message || 'Market data is currently unavailable. Please try again later.');
    } finally {
      retryButton.disabled = false;
    }
  };

  // Recalculate results on every keystroke for immediate, client-side filtering.
  filtersForm.addEventListener('input', updateScreener);
  filtersForm.addEventListener('reset', () => {
    window.requestAnimationFrame(updateScreener);
  });
  saveForm.addEventListener('submit', (event) => {
    event.preventDefault();
    saveCurrentScreener();
  });
  loadScreenerButton.addEventListener('click', () => {
    const screener = getSelectedScreener();
    if (!screener) {
      showSavedScreenerMessage('Select a screener to load.', 'error');
      return;
    }
    loadScreener(screener);
    showSavedScreenerMessage(`Loaded "${screener.name}".`, 'success');
  });
  renameScreenerButton.addEventListener('click', renameSelectedScreener);
  deleteScreenerButton.addEventListener('click', deleteSelectedScreener);
  retryButton.addEventListener('click', loadMarketData);
  initializeSortControls();
  renderSavedScreenerOptions(readSavedScreeners());
  loadMarketData();
});
