document.addEventListener('DOMContentLoaded', async () => {
  const table = document.getElementById('screener-table');
  const tableBody = document.getElementById('screener-table-body');
  const status = document.getElementById('screener-status');

  if (!table || !tableBody || !status) return;

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

  const showError = (message) => {
    status.classList.add('error');
    status.textContent = message;
  };

  try {
    const coins = await window.fetchMarketData(100);
    renderCoins(coins);
    status.remove();
  } catch (error) {
    console.error('Unable to load screener market data:', error);
    showError(error.message || 'Market data is currently unavailable. Please try again later.');
  }
});
