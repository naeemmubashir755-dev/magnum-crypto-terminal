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
    // Fetch the detailed coin information from the shared API helper.
    const coin = await window.fetchCoinDetails(coinId);

    // Log the full response for debugging purposes.
    console.log('Coin details response:', coin);

    // Fetch 30 days of historical price data after the coin details load.
    try {
      const history = await window.fetchCoinHistory(coinId, 30);
      console.log('Coin history response:', history);
    } catch (historyError) {
      console.error('Could not load coin history:', historyError);
    }

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

    // Populate price summary.
    const price = document.getElementById('coin-price');
    if (price) price.textContent = formatCurrency(coin.market_data?.current_price?.usd);

    const change = document.getElementById('coin-change');
    if (change) {
      const changeValue = coin.market_data?.price_change_percentage_24h || 0;
      const sign = changeValue >= 0 ? '+' : '';
      change.textContent = `${sign}${changeValue.toFixed(2)}%`;
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
