document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('global-market-status');
  const grid = document.getElementById('global-market-grid');
  const fields = {
    marketCap: document.getElementById('global-market-cap'),
    volume: document.getElementById('global-volume'),
    btcDominance: document.getElementById('btc-dominance'),
    ethDominance: document.getElementById('eth-dominance'),
    stablecoinDominance: document.getElementById('stablecoin-dominance'),
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

  const formatCurrency = (value) => (Number.isFinite(Number(value)) ? compactCurrency.format(value) : '--');
  const formatPercentage = (value) => (Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : '--');
  const formatNumber = (value) => (Number.isFinite(Number(value)) ? wholeNumber.format(value) : '--');

  const renderGlobalData = (data) => {
    setText(fields.marketCap, formatCurrency(data.totalMarketCap));
    setText(fields.volume, formatCurrency(data.total24hVolume));
    setText(fields.btcDominance, formatPercentage(data.bitcoinDominance));
    setText(fields.ethDominance, formatPercentage(data.ethereumDominance));
    setText(fields.stablecoinDominance, formatPercentage(data.stablecoinDominance));
    setText(fields.cryptocurrencies, formatNumber(data.activeCryptocurrencies));
    setText(fields.exchanges, formatNumber(data.activeMarkets));
  };

  const showGlobalError = (message) => {
    status.classList.add('error');
    status.textContent = message;
  };

  try {
    const globalData = await window.fetchDashboardGlobalMarket();
    renderGlobalData(globalData);
    grid.hidden = false;
    status.remove();
  } catch (error) {
    console.error('Unable to load global market data:', error);
    showGlobalError(error.message || 'Global market data is currently unavailable. Please try again later.');
    // Keep independent dashboard cards (including market sentiment) available.
    grid.hidden = false;
  }

});
