document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('global-market-status');
  const grid = document.getElementById('global-market-grid');
  const fields = {
    marketCap: document.getElementById('global-market-cap'),
    volume: document.getElementById('global-volume'),
    btcDominance: document.getElementById('btc-dominance'),
    ethDominance: document.getElementById('eth-dominance'),
    fearGreed: document.getElementById('fear-greed-index'),
    cryptocurrencies: document.getElementById('active-cryptocurrencies'),
    exchanges: document.getElementById('active-exchanges'),
  };

  if (!status || !grid || !Object.values(fields).every(Boolean)) return;

  const compactCurrency = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2,
  });
  const wholeNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  const setText = (element, value) => {
    element.textContent = value;
  };

  const renderGlobalData = ({ data }) => {
    setText(fields.marketCap, compactCurrency.format(data.total_market_cap?.usd || 0));
    setText(fields.volume, compactCurrency.format(data.total_volume?.usd || 0));
    setText(fields.btcDominance, `${Number(data.market_cap_percentage?.btc || 0).toFixed(2)}%`);
    setText(fields.ethDominance, `${Number(data.market_cap_percentage?.eth || 0).toFixed(2)}%`);
    setText(fields.cryptocurrencies, wholeNumber.format(data.active_cryptocurrencies || 0));
    // CoinGecko's global "markets" count represents the active market/exchange ecosystem.
    setText(fields.exchanges, wholeNumber.format(data.markets || 0));
  };

  const renderFearGreed = ({ data }) => {
    const latest = data?.[0];
    if (!latest) throw new Error('No Fear & Greed data was returned.');
    setText(fields.fearGreed, `${latest.value} (${latest.value_classification})`);
  };

  const showGlobalError = (message) => {
    status.classList.add('error');
    status.textContent = message;
  };

  try {
    const globalData = await window.fetchGlobalMarketData();
    renderGlobalData(globalData);
    grid.hidden = false;
    status.remove();
  } catch (error) {
    console.error('Unable to load global market data:', error);
    showGlobalError(error.message || 'Global market data is currently unavailable. Please try again later.');
    return;
  }

  try {
    const fearGreedData = await window.fetchFearGreedIndex();
    renderFearGreed(fearGreedData);
  } catch (error) {
    console.error('Unable to load Fear & Greed index:', error);
    setText(fields.fearGreed, 'Unavailable');
  }
});
