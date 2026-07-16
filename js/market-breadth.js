document.addEventListener('DOMContentLoaded', async () => {
  const status = document.getElementById('market-breadth-status');
  const content = document.getElementById('market-breadth-content');
  const chartStatus = document.getElementById('market-breadth-chart-status');
  const fields = {
    profit: document.getElementById('breadth-profit-percentage'),
    loss: document.getElementById('breadth-loss-percentage'),
    performance: document.getElementById('breadth-average-performance'),
    volume: document.getElementById('breadth-average-volume'),
  };
  const canvases = {
    distribution: document.getElementById('market-breadth-distribution-chart'),
    performance: document.getElementById('market-breadth-performance-chart'),
    volume: document.getElementById('market-breadth-volume-chart'),
  };

  if (!status || !content || !Object.values(fields).every(Boolean)) return;

  const charts = {};
  let receivedLiveUpdate = false;
  const percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1,
  });
  const compactCurrency = new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2,
  });

  const toFiniteNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  /** Calculates all Market Breadth metrics from one shared market snapshot. */
  const calculateBreadth = (coins) => {
    const changes = coins
      .map((coin) => toFiniteNumber(coin.price_change_percentage_24h))
      .filter((value) => value !== null);
    const volumes = coins
      .map((coin) => toFiniteNumber(coin.total_volume))
      .filter((value) => value !== null && value >= 0);
    const total = changes.length;
    const profitCount = changes.filter((change) => change > 0).length;
    const lossCount = changes.filter((change) => change < 0).length;
    const neutralCount = total - profitCount - lossCount;

    return {
      profitPercentage: total ? profitCount / total : 0,
      lossPercentage: total ? lossCount / total : 0,
      neutralPercentage: total ? neutralCount / total : 0,
      hasChangeData: total > 0,
      hasVolumeData: volumes.length > 0,
      averagePerformance: total ? changes.reduce((sum, change) => sum + change, 0) / total : null,
      averageVolume: volumes.length ? volumes.reduce((sum, volume) => sum + volume, 0) / volumes.length : null,
    };
  };

  const updateChart = (key, canvas, config) => {
    if (!canvas || typeof window.Chart === 'undefined') return;

    if (charts[key]) {
      charts[key].data = config.data;
      charts[key].options = config.options;
      charts[key].update();
      return;
    }

    charts[key] = new window.Chart(canvas.getContext('2d'), config);
  };

  const clearChart = (key, canvas) => {
    if (charts[key]) {
      charts[key].destroy();
      delete charts[key];
    }
    canvas?.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const renderCharts = (breadth) => {
    if (typeof window.Chart === 'undefined') {
      if (chartStatus) chartStatus.textContent = 'Charts are unavailable, but the Market Breadth metrics are current.';
      return;
    }

    if (chartStatus) {
      chartStatus.textContent = breadth.hasChangeData && breadth.hasVolumeData
        ? ''
        : 'Some market data is unavailable, so the related chart cannot be shown.';
    }
    const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--muted-text-color').trim() || '#94a3b8';
    const gridColor = 'rgba(148, 163, 184, 0.2)';

    if (breadth.hasChangeData) {
      updateChart('distribution', canvases.distribution, {
        type: 'doughnut',
        data: {
          labels: ['In Profit', 'In Loss', 'Unchanged'],
          datasets: [{
            data: [breadth.profitPercentage * 100, breadth.lossPercentage * 100, breadth.neutralPercentage * 100],
            backgroundColor: ['#22c55e', '#ef4444', '#64748b'],
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { color: labelColor } } },
        },
      });
    } else {
      clearChart('distribution', canvases.distribution);
    }

    if (breadth.hasChangeData) {
      updateChart('performance', canvases.performance, {
        type: 'bar',
        data: {
          labels: ['Average 24h Performance'],
          datasets: [{
            data: [breadth.averagePerformance],
            backgroundColor: breadth.averagePerformance >= 0 ? '#22c55e' : '#ef4444',
            borderRadius: 6,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: labelColor }, grid: { display: false } },
            y: { ticks: { color: labelColor, callback: (value) => `${value}%` }, grid: { color: gridColor } },
          },
        },
      });
    } else {
      clearChart('performance', canvases.performance);
    }

    if (breadth.hasVolumeData) {
      updateChart('volume', canvases.volume, {
        type: 'bar',
        data: {
          labels: ['Average Trading Volume'],
          datasets: [{ data: [breadth.averageVolume], backgroundColor: '#38bdf8', borderRadius: 6 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: labelColor }, grid: { display: false } },
            y: { ticks: { color: labelColor, callback: (value) => compactCurrency.format(value) }, grid: { color: gridColor } },
          },
        },
      });
    } else {
      clearChart('volume', canvases.volume);
    }
  };

  const renderBreadth = (coins) => {
    if (!Array.isArray(coins) || !coins.length) return;

    const breadth = calculateBreadth(coins);
    fields.profit.textContent = breadth.hasChangeData ? percentFormatter.format(breadth.profitPercentage) : '--';
    fields.loss.textContent = breadth.hasChangeData ? percentFormatter.format(breadth.lossPercentage) : '--';
    fields.performance.textContent = breadth.hasChangeData
      ? `${breadth.averagePerformance >= 0 ? '+' : ''}${breadth.averagePerformance.toFixed(2)}%`
      : '--';
    fields.performance.classList.toggle('price-positive', breadth.hasChangeData && breadth.averagePerformance > 0);
    fields.performance.classList.toggle('price-negative', breadth.hasChangeData && breadth.averagePerformance < 0);
    fields.volume.textContent = breadth.hasVolumeData ? compactCurrency.format(breadth.averageVolume) : '--';
    renderCharts(breadth);

    content.hidden = false;
    status.hidden = true;
    status.classList.remove('error');
  };

  const applyLiveMarketUpdate = (update) => {
    if (!Array.isArray(update?.markets)) return;
    receivedLiveUpdate = true;
    renderBreadth(update.markets);
  };

  const unsubscribe = window.marketSocket?.subscribe(applyLiveMarketUpdate);
  window.addEventListener('market-socket-status', (event) => {
    const { status: socketStatus, message } = event.detail || {};
    if ((socketStatus === 'error' || socketStatus === 'disconnected') && !content.hidden) {
      status.hidden = false;
      status.classList.remove('error');
      status.textContent = `${message} Showing the latest Market Breadth data.`;
    }
  });
  window.addEventListener('pagehide', () => {
    unsubscribe?.();
    Object.values(charts).forEach((chart) => chart.destroy());
  }, { once: true });

  try {
    const coins = await window.fetchMarketData(100);
    // A socket update takes precedence if it arrived while the fallback loaded.
    if (!receivedLiveUpdate) renderBreadth(coins);
  } catch (error) {
    console.error('Unable to load Market Breadth:', error);
    if (content.hidden) {
      status.classList.add('error');
      status.textContent = error.message || 'Market Breadth data is currently unavailable.';
    }
  }
});
