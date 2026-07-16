document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('dashboard-trending-status');
  const table = document.getElementById('dashboard-trending-table');
  const body = document.getElementById('dashboard-trending-body');

  if (!status || !table || !body) return;

  const formatPrice = (price) => {
    const value = Number(price);
    if (!Number.isFinite(value)) return 'Unavailable';
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', maximumFractionDigits: value < 0.01 ? 6 : 2,
    }).format(value);
  };

  const createCell = (text) => {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
  };

  const renderCoins = (coins) => {
    const rows = document.createDocumentFragment();

    coins.forEach((coin) => {
      const row = document.createElement('tr');
      const nameCell = document.createElement('td');
      const link = document.createElement('a');
      link.href = `coin.html?id=${encodeURIComponent(coin.id)}`;
      link.className = 'dashboard-trending-link';
      link.textContent = coin.name;
      nameCell.appendChild(link);

      row.append(
        createCell(`#${coin.trendingRank}`),
        nameCell,
        createCell((coin.symbol || 'N/A').toUpperCase()),
        createCell(formatPrice(coin.price)),
        createCell(coin.marketCapRank ? `#${coin.marketCapRank}` : 'Unranked'),
      );
      rows.appendChild(row);
    });

    body.replaceChildren(rows);
  };

  try {
    const { coins } = await window.fetchDashboardTrendingCoins();
    if (!coins?.length) throw new Error('No trending coins are currently available.');

    renderCoins(coins);
    table.hidden = false;
    status.remove();
  } catch (error) {
    console.error('Unable to load Dashboard trending coins:', error);
    status.classList.add('error');
    status.textContent = error.message || 'Trending coins are currently unavailable. Please try again later.';
  }
});
