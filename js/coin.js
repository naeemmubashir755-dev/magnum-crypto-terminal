const formatHistoryForChart = (history) => {
  const rawPrices = history?.prices ?? [];

  const labels = rawPrices.map(([timestamp]) =>
    new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  );

  const prices = rawPrices.map(([, price]) => price);
  const volumes = (history?.total_volumes ?? []).map(([, volume]) => volume);

  return { labels, prices, volumes };
};

// Calculate the 14-period RSI with Wilder's smoothed average gain and loss method.
const calculateRsi = (prices, period = 14) => {
  const validPrices = prices.map(Number).filter(Number.isFinite);
  if (validPrices.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = validPrices[index] - validPrices[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < validPrices.length; index += 1) {
    const change = validPrices[index] - validPrices[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    averageGain = ((averageGain * (period - 1)) + gain) / period;
    averageLoss = ((averageLoss * (period - 1)) + loss) / period;
  }

  if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
  const relativeStrength = averageGain / averageLoss;
  return 100 - (100 / (1 + relativeStrength));
};

const getRsiState = (rsi) => {
  if (rsi > 70) return { label: 'Overbought', className: 'price-negative' };
  if (rsi < 30) return { label: 'Oversold', className: 'price-positive' };
  return { label: 'Neutral', className: '' };
};

const updateRsiDisplay = (prices) => {
  const valueElement = document.getElementById('rsi-value');
  const statusElement = document.getElementById('rsi-status');
  if (!valueElement || !statusElement) return;

  const rsi = calculateRsi(prices);
  if (!Number.isFinite(rsi)) {
    valueElement.textContent = '--';
    statusElement.textContent = 'Insufficient data';
    statusElement.classList.remove('price-positive', 'price-negative');
    return;
  }

  const state = getRsiState(rsi);
  valueElement.textContent = rsi.toFixed(2);
  statusElement.textContent = state.label;
  statusElement.classList.remove('price-positive', 'price-negative');
  if (state.className) statusElement.classList.add(state.className);
};

// Return an aligned simple moving average series, leaving early periods empty.
const calculateSma = (prices, period) => prices.map((_, index) => {
  if (index < period - 1) return null;

  const windowPrices = prices.slice(index - period + 1, index + 1).map(Number);
  if (!windowPrices.every(Number.isFinite)) return null;

  return windowPrices.reduce((sum, price) => sum + price, 0) / period;
});

// Return an aligned exponential moving average series using the standard EMA multiplier.
const calculateEmaSeries = (series, period) => {
  const values = series.map((value) => {
    if (value === null || value === undefined || value === '') return null;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  });
  const averages = Array(values.length).fill(null);
  const firstValueIndex = values.findIndex(Number.isFinite);
  if (firstValueIndex === -1) return averages;

  const seedValues = values.slice(firstValueIndex, firstValueIndex + period);
  if (seedValues.length < period || !seedValues.every(Number.isFinite)) return averages;

  const multiplier = 2 / (period + 1);
  let previousAverage = seedValues.reduce((sum, value) => sum + value, 0) / period;
  averages[firstValueIndex + period - 1] = previousAverage;

  for (let index = firstValueIndex + period; index < values.length; index += 1) {
    if (!Number.isFinite(values[index])) continue;
    previousAverage = ((values[index] - previousAverage) * multiplier) + previousAverage;
    averages[index] = previousAverage;
  }

  return averages;
};

const calculateEma = (prices, period) => calculateEmaSeries(prices, period);

const movingAverageLabels = ['SMA 20', 'SMA 50', 'EMA 20', 'EMA 50'];
const movingAverageVisibility = new Map(movingAverageLabels.map((label) => [label, true]));

const createMovingAverageDatasets = (prices) => [
  {
    label: 'SMA 20',
    data: calculateSma(prices, 20),
    borderColor: '#f59e0b',
  },
  {
    label: 'SMA 50',
    data: calculateSma(prices, 50),
    borderColor: '#a855f7',
  },
  {
    label: 'EMA 20',
    data: calculateEma(prices, 20),
    borderColor: '#10b981',
  },
  {
    label: 'EMA 50',
    data: calculateEma(prices, 50),
    borderColor: '#ec4899',
  },
].map((dataset) => ({
  ...dataset,
  backgroundColor: 'transparent',
  borderWidth: 1.5,
  pointRadius: 0,
  fill: false,
  tension: 0.25,
  spanGaps: false,
  hidden: !movingAverageVisibility.get(dataset.label),
}));

// Create a focused, accessible legend for toggling moving-average overlays only.
const renderMovingAverageLegend = () => {
  const chartSection = document.getElementById('chart-section');
  const chart = window.priceChartInstance;
  if (!chartSection || !chart) return;

  let legend = document.getElementById('moving-average-legend');
  if (!legend) {
    legend = document.createElement('div');
    legend.id = 'moving-average-legend';
    legend.setAttribute('aria-label', 'Moving average chart controls');
    legend.style.cssText = 'display:flex; flex-wrap:wrap; gap:0.5rem; margin:0.75rem 0;';
    document.getElementById('price-chart')?.insertAdjacentElement('beforebegin', legend);
  }

  const controls = document.createDocumentFragment();
  movingAverageLabels.forEach((label) => {
    const isVisible = movingAverageVisibility.get(label);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-secondary';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(isVisible));
    button.style.opacity = isVisible ? '1' : '0.55';
    button.addEventListener('click', () => {
      const nextVisibility = !movingAverageVisibility.get(label);
      movingAverageVisibility.set(label, nextVisibility);
      const datasetIndex = chart.data.datasets.findIndex((dataset) => dataset.label === label);
      if (datasetIndex !== -1) chart.setDatasetVisibility(datasetIndex, nextVisibility);
      chart.update();
      renderMovingAverageLegend();
    });
    controls.appendChild(button);
  });

  legend.replaceChildren(controls);
};

// Bollinger Bands use a 20-period SMA with upper and lower bands at two deviations.
const bollingerBandLabels = [
  'Bollinger Upper (20, 2)',
  'Bollinger Lower (20, 2)',
  'Bollinger Middle (20)',
];
const bollingerBandVisibility = new Map(bollingerBandLabels.map((label) => [label, true]));

const calculateBollingerBands = (prices, period = 20, multiplier = 2) => {
  const middleBand = calculateSma(prices, period);
  const upperBand = Array(prices.length).fill(null);
  const lowerBand = Array(prices.length).fill(null);

  for (let index = period - 1; index < prices.length; index += 1) {
    const windowPrices = prices.slice(index - period + 1, index + 1).map(Number);
    if (!windowPrices.every(Number.isFinite)) continue;

    const mean = middleBand[index];
    const variance = windowPrices.reduce(
      (sum, price) => sum + ((price - mean) ** 2),
      0,
    ) / period;
    const standardDeviation = Math.sqrt(variance);
    upperBand[index] = mean + (standardDeviation * multiplier);
    lowerBand[index] = mean - (standardDeviation * multiplier);
  }

  return { upperBand, middleBand, lowerBand };
};

const createBollingerBandDatasets = (prices) => {
  const bands = calculateBollingerBands(prices);
  const sharedOptions = {
    borderColor: '#64748b',
    borderWidth: 1.25,
    borderDash: [5, 4],
    pointRadius: 0,
    tension: 0.25,
    spanGaps: false,
  };

  return [
    {
      ...sharedOptions,
      label: 'Bollinger Upper (20, 2)',
      data: bands.upperBand,
      fill: '+1',
      backgroundColor: 'rgba(100, 116, 139, 0.12)',
    },
    {
      ...sharedOptions,
      label: 'Bollinger Lower (20, 2)',
      data: bands.lowerBand,
      fill: false,
      backgroundColor: 'transparent',
    },
    {
      label: 'Bollinger Middle (20)',
      data: bands.middleBand,
      borderColor: '#64748b',
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
      tension: 0.25,
      spanGaps: false,
    },
  ].map((dataset) => ({
    ...dataset,
    hidden: !bollingerBandVisibility.get(dataset.label),
  }));
};

// Toggle all three Bollinger Band overlays without affecting price or moving-average datasets.
const renderBollingerBandToggle = () => {
  const chart = window.priceChartInstance;
  if (!chart) return;

  let controls = document.getElementById('bollinger-band-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'bollinger-band-controls';
    controls.style.cssText = 'display:flex; flex-wrap:wrap; gap:0.5rem; margin:0.75rem 0;';
    document.getElementById('price-chart')?.insertAdjacentElement('beforebegin', controls);
  }

  const allBandsVisible = bollingerBandLabels.every((label) => bollingerBandVisibility.get(label));
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'btn-secondary';
  button.textContent = allBandsVisible ? 'Hide Bollinger Bands' : 'Show Bollinger Bands';
  button.setAttribute('aria-pressed', String(allBandsVisible));
  button.addEventListener('click', () => {
    const nextVisibility = !allBandsVisible;
    bollingerBandLabels.forEach((label) => {
      bollingerBandVisibility.set(label, nextVisibility);
      const datasetIndex = chart.data.datasets.findIndex((dataset) => dataset.label === label);
      if (datasetIndex !== -1) chart.setDatasetVisibility(datasetIndex, nextVisibility);
    });
    chart.update();
    renderBollingerBandToggle();
  });

  controls.replaceChildren(button);
};

const createPriceChartDatasets = (prices) => [
  {
    label: 'Price (USD)',
    data: prices,
    borderColor: '#3b82f6',
    backgroundColor: 'transparent',
    borderWidth: 2,
    pointRadius: 0,
    fill: false,
    tension: 0.35,
  },
  ...createMovingAverageDatasets(prices),
  ...createBollingerBandDatasets(prices),
];

// Standard MACD uses 12- and 26-period EMAs, with a 9-period signal EMA.
const calculateMacd = (prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const fastEma = calculateEma(prices, fastPeriod);
  const slowEma = calculateEma(prices, slowPeriod);
  const macdLine = prices.map((_, index) => (
    Number.isFinite(fastEma[index]) && Number.isFinite(slowEma[index])
      ? fastEma[index] - slowEma[index]
      : null
  ));
  const signalLine = calculateEmaSeries(macdLine, signalPeriod);
  const histogram = macdLine.map((value, index) => (
    Number.isFinite(value) && Number.isFinite(signalLine[index])
      ? value - signalLine[index]
      : null
  ));

  return { macdLine, signalLine, histogram };
};

const getLastFiniteValue = (values) => [...values].reverse().find(Number.isFinite);

const formatSummaryPrice = (value) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
}).format(value);

const getVolumeTrend = (volumes, period = 20) => {
  const validVolumes = volumes.map(Number).filter(Number.isFinite);
  if (validVolumes.length < 2) return { label: 'volume unavailable', change: null };

  const comparisonLength = Math.min(period, Math.floor(validVolumes.length / 2));
  if (!comparisonLength) return { label: 'volume unavailable', change: null };

  const latestAverage = validVolumes.slice(-comparisonLength)
    .reduce((sum, volume) => sum + volume, 0) / comparisonLength;
  const previousAverage = validVolumes.slice(-comparisonLength * 2, -comparisonLength)
    .reduce((sum, volume) => sum + volume, 0) / comparisonLength;
  if (previousAverage === 0) return { label: 'volume stable', change: 0 };

  const change = ((latestAverage - previousAverage) / previousAverage) * 100;
  if (change > 10) return { label: 'volume rising', change };
  if (change < -10) return { label: 'volume falling', change };
  return { label: 'volume stable', change };
};

const getLatestEmaCrossover = (fastEma, slowEma) => {
  const currentIndex = fastEma.length - 1;
  const previousIndex = currentIndex - 1;
  const currentDifference = fastEma[currentIndex] - slowEma[currentIndex];
  const previousDifference = fastEma[previousIndex] - slowEma[previousIndex];

  if (!Number.isFinite(currentDifference)) return { score: 0, reason: 'EMA crossover data unavailable' };
  if (Number.isFinite(previousDifference) && previousDifference <= 0 && currentDifference > 0) {
    return { score: 2, reason: 'a bullish EMA 20/50 crossover just occurred' };
  }
  if (Number.isFinite(previousDifference) && previousDifference >= 0 && currentDifference < 0) {
    return { score: -2, reason: 'a bearish EMA 20/50 crossover just occurred' };
  }
  return currentDifference > 0
    ? { score: 1, reason: 'EMA 20 remains above EMA 50' }
    : { score: -1, reason: 'EMA 20 remains below EMA 50' };
};

const getRsiSignal = (rsi) => {
  if (!Number.isFinite(rsi)) return { score: 0, reason: 'RSI is unavailable' };
  if (rsi <= 30) return { score: 2, reason: `RSI ${rsi.toFixed(1)} is oversold` };
  if (rsi < 45) return { score: 1, reason: `RSI ${rsi.toFixed(1)} is recovering` };
  if (rsi >= 70) return { score: -2, reason: `RSI ${rsi.toFixed(1)} is overbought` };
  if (rsi > 55) return { score: -1, reason: `RSI ${rsi.toFixed(1)} is weakening` };
  return { score: 0, reason: `RSI ${rsi.toFixed(1)} is neutral` };
};

const getMacdSignal = (macdLine, signalLine) => {
  if (!Number.isFinite(macdLine) || !Number.isFinite(signalLine)) {
    return { score: 0, reason: 'MACD is unavailable' };
  }
  return macdLine >= signalLine
    ? { score: 1, reason: 'MACD is above its signal line' }
    : { score: -1, reason: 'MACD is below its signal line' };
};

const getVolumeSignal = (volumeTrend, priceChange) => {
  if (volumeTrend.label === 'volume rising' && priceChange > 2) {
    return { score: 1, reason: 'rising volume confirms the advance' };
  }
  if (volumeTrend.label === 'volume rising' && priceChange < -2) {
    return { score: -1, reason: 'rising volume confirms the decline' };
  }
  return { score: 0, reason: volumeTrend.label };
};

const getTrendSignal = (priceChange) => {
  if (priceChange > 2) return { score: 1, reason: `price trend is up ${priceChange.toFixed(2)}%` };
  if (priceChange < -2) return { score: -1, reason: `price trend is down ${Math.abs(priceChange).toFixed(2)}%` };
  return { score: 0, reason: 'price trend is sideways' };
};

const getSignalDetails = (score) => {
  if (score >= 5) return { label: 'Strong Buy', className: 'price-positive' };
  if (score >= 2) return { label: 'Buy', className: 'price-positive' };
  if (score <= -5) return { label: 'Strong Sell', className: 'price-negative' };
  if (score <= -2) return { label: 'Sell', className: 'price-negative' };
  return { label: 'Hold', className: '' };
};

// Combine independent indicator evaluations so future signals can be added without changing the UI.
const calculateTradingSignal = (prices, volumes) => {
  const validPrices = prices.map(Number).filter(Number.isFinite);
  if (validPrices.length < 50) return null;

  const priceChange = ((validPrices.at(-1) - validPrices[0]) / validPrices[0]) * 100;
  const rsi = calculateRsi(validPrices);
  const macd = calculateMacd(validPrices);
  const fastEma = calculateEma(validPrices, 20);
  const slowEma = calculateEma(validPrices, 50);
  const indicators = [
    getRsiSignal(rsi),
    getMacdSignal(getLastFiniteValue(macd.macdLine), getLastFiniteValue(macd.signalLine)),
    getLatestEmaCrossover(fastEma, slowEma),
    getVolumeSignal(getVolumeTrend(volumes), priceChange),
    getTrendSignal(priceChange),
  ];
  const score = indicators.reduce((total, indicator) => total + indicator.score, 0);
  const signal = getSignalDetails(score);
  const confidence = Math.min(100, Math.round((Math.abs(score) / 7) * 100));

  return {
    ...signal,
    confidence,
    reasoning: indicators.map((indicator) => indicator.reason).join('; '),
  };
};

const updateTradingSignalDisplay = (prices, volumes) => {
  const signalElement = document.getElementById('trading-signal');
  const confidenceElement = document.getElementById('trading-signal-confidence');
  const reasoningElement = document.getElementById('trading-signal-reasoning');
  if (!signalElement || !confidenceElement || !reasoningElement) return;

  const signal = calculateTradingSignal(prices, volumes);
  if (!signal) {
    signalElement.textContent = 'Insufficient data';
    confidenceElement.textContent = '--';
    reasoningElement.textContent = 'At least 50 price points are needed for the EMA 50 signal.';
    signalElement.classList.remove('price-positive', 'price-negative');
    return;
  }

  signalElement.textContent = signal.label;
  signalElement.classList.remove('price-positive', 'price-negative');
  if (signal.className) signalElement.classList.add(signal.className);
  confidenceElement.textContent = `${signal.confidence}%`;
  reasoningElement.textContent = signal.reasoning;
};

const updateAiSummary = (prices, volumes) => {
  const elements = {
    trend: document.getElementById('ai-summary-trend'),
    momentum: document.getElementById('ai-summary-momentum'),
    risk: document.getElementById('ai-summary-risk'),
    support: document.getElementById('ai-summary-support'),
    resistance: document.getElementById('ai-summary-resistance'),
  };
  if (!Object.values(elements).every(Boolean)) return;

  const validPrices = prices.map(Number).filter(Number.isFinite);
  if (validPrices.length < 2) {
    Object.values(elements).forEach((element) => { element.textContent = 'Insufficient data'; });
    return;
  }

  const latestPrice = validPrices.at(-1);
  const periodStartPrice = validPrices[0];
  const priceChange = ((latestPrice - periodStartPrice) / periodStartPrice) * 100;
  const trendLabel = priceChange > 2 ? 'Uptrend' : priceChange < -2 ? 'Downtrend' : 'Sideways';
  const volumeTrend = getVolumeTrend(volumes);

  const rsi = calculateRsi(validPrices);
  const macd = calculateMacd(validPrices);
  const latestMacd = getLastFiniteValue(macd.macdLine);
  const latestSignal = getLastFiniteValue(macd.signalLine);
  const ema20 = getLastFiniteValue(calculateEma(validPrices, 20));
  const ema50 = getLastFiniteValue(calculateEma(validPrices, 50));
  const bands = calculateBollingerBands(validPrices);
  const upperBand = getLastFiniteValue(bands.upperBand);
  const lowerBand = getLastFiniteValue(bands.lowerBand);
  const supportResistanceWindow = validPrices.slice(-Math.min(20, validPrices.length));
  const support = Math.min(...supportResistanceWindow);
  const resistance = Math.max(...supportResistanceWindow);

  elements.trend.textContent = `${trendLabel} (${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%); ${volumeTrend.label}.`;

  const macdLabel = Number.isFinite(latestMacd) && Number.isFinite(latestSignal)
    ? (latestMacd >= latestSignal ? 'MACD above signal' : 'MACD below signal')
    : 'MACD unavailable';
  const averageLabel = Number.isFinite(ema20) && Number.isFinite(ema50)
    ? (latestPrice >= ema20 && latestPrice >= ema50 ? 'price above EMA 20/50' : 'price below an EMA')
    : 'moving averages unavailable';
  elements.momentum.textContent = `${macdLabel}; ${averageLabel}.`;

  if (Number.isFinite(rsi) && rsi >= 70) {
    elements.risk.textContent = `Elevated — RSI ${rsi.toFixed(1)} is overbought.`;
  } else if (Number.isFinite(rsi) && rsi <= 30) {
    elements.risk.textContent = `Elevated — RSI ${rsi.toFixed(1)} is oversold.`;
  } else if (Number.isFinite(upperBand) && latestPrice >= upperBand) {
    elements.risk.textContent = 'Elevated — price is testing the upper Bollinger Band.';
  } else if (Number.isFinite(lowerBand) && latestPrice <= lowerBand) {
    elements.risk.textContent = 'Elevated — price is testing the lower Bollinger Band.';
  } else {
    elements.risk.textContent = 'Moderate — RSI and price remain within normal bands.';
  }

  elements.support.textContent = `${formatSummaryPrice(support)} (recent range low)`;
  elements.resistance.textContent = `${formatSummaryPrice(resistance)} (recent range high)`;
};

const initializeMacdCollapse = (section, container) => {
  const toggle = document.getElementById('macd-toggle');
  if (!toggle || toggle.dataset.initialized) return;

  toggle.dataset.initialized = 'true';
  toggle.addEventListener('click', () => {
    const isCollapsed = !container.hidden;
    container.hidden = isCollapsed;
    toggle.setAttribute('aria-expanded', String(!isCollapsed));
    toggle.textContent = isCollapsed ? 'Expand MACD' : 'Collapse MACD';
    section.classList.toggle('is-collapsed', isCollapsed);

    // Chart.js needs a resize after its hidden container becomes visible again.
    if (!isCollapsed) window.macdChartInstance?.resize();
  });
};

const getMacdChartContainer = () => {
  const container = document.getElementById('macd-chart');
  const section = document.getElementById('macd-section');
  if (!container || !section) return null;

  container.style.minHeight = '250px';
  container.style.position = 'relative';
  initializeMacdCollapse(section, container);
  return container;
};

const createMacdDatasets = (macd) => [
  {
    type: 'bar',
    label: 'Histogram',
    data: macd.histogram,
    backgroundColor: (context) => (
      context.raw >= 0 ? 'rgba(16, 185, 129, 0.55)' : 'rgba(239, 68, 68, 0.55)'
    ),
    borderWidth: 0,
  },
  {
    type: 'line',
    label: 'MACD Line',
    data: macd.macdLine,
    borderColor: '#3b82f6',
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.25,
  },
  {
    type: 'line',
    label: 'Signal Line',
    data: macd.signalLine,
    borderColor: '#f59e0b',
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.25,
  },
];

const renderMacdChart = (labels, prices) => {
  const chartContainer = getMacdChartContainer();
  if (!chartContainer || !labels?.length || !prices?.length || typeof window.Chart === 'undefined') return;

  let canvas = chartContainer.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', 'MACD indicator chart');
    chartContainer.appendChild(canvas);
  }

  const macd = calculateMacd(prices);
  if (!window.macdChartInstance) {
    window.macdChartInstance = new window.Chart(canvas.getContext('2d'), {
      data: {
        labels,
        datasets: createMacdDatasets(macd),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { enabled: true },
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: 'rgba(148, 163, 184, 0.2)' } },
        },
      },
    });
  } else {
    window.macdChartInstance.data.labels = labels;
    window.macdChartInstance.data.datasets = createMacdDatasets(macd);
    window.macdChartInstance.update('active');
  }
};

const showChartStatus = (message, type = 'loading') => {
  const chartContainer = document.getElementById('price-chart');

  if (!chartContainer) {
    return;
  }

  let status = chartContainer.querySelector('.chart-state');
  if (!status) {
    status = document.createElement('div');
    status.className = 'chart-state';
    chartContainer.appendChild(status);
  }

  status.className = `chart-state ${type}`;

  if (type === 'loading') {
    status.innerHTML = '<div class="spinner"></div><span>Loading historical prices...</span>';
  } else {
    status.innerHTML = `<span>${message}</span>`;
  }

  chartContainer.classList.toggle('is-loading', type === 'loading');
  chartContainer.classList.toggle('has-error', type === 'error');

  const canvas = chartContainer.querySelector('canvas');
  if (canvas) {
    canvas.style.opacity = type === 'loading' ? '0.45' : '1';
  }
};

const hideChartStatus = () => {
  const chartContainer = document.getElementById('price-chart');

  if (!chartContainer) {
    return;
  }

  const status = chartContainer.querySelector('.chart-state');
  if (status) {
    status.remove();
  }

  chartContainer.classList.remove('is-loading', 'has-error');

  const canvas = chartContainer.querySelector('canvas');
  if (canvas) {
    canvas.style.opacity = '1';
  }
};

const renderPriceChart = (labels, prices) => {
  const chartContainer = document.getElementById('price-chart');

  if (!chartContainer || !labels?.length || !prices?.length || typeof window.Chart === 'undefined') {
    return;
  }

  chartContainer.style.minHeight = '320px';
  chartContainer.style.position = 'relative';

  let canvas = chartContainer.querySelector('canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-label', 'Price chart');
    chartContainer.appendChild(canvas);
  }

  if (!window.priceChartInstance) {
    window.priceChartInstance = new window.Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: createPriceChartDatasets(prices),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
          easing: 'easeInOutQuart',
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              boxWidth: 12,
              boxHeight: 2,
            },
            onClick: (event, legendItem, legend) => {
              const chart = legend.chart;
              const datasetIndex = legendItem.datasetIndex;
              const dataset = chart.data.datasets[datasetIndex];
              const nextVisibility = !chart.isDatasetVisible(datasetIndex);
              chart.setDatasetVisibility(datasetIndex, nextVisibility);
              if (movingAverageLabels.includes(dataset.label)) {
                movingAverageVisibility.set(dataset.label, nextVisibility);
                renderMovingAverageLegend();
              }
              if (bollingerBandLabels.includes(dataset.label)) {
                bollingerBandVisibility.set(dataset.label, nextVisibility);
                renderBollingerBandToggle();
              }
              chart.update();
            },
          },
          tooltip: {
            enabled: true,
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
          },
          y: {
            ticks: {
              callback: (value) =>
                new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }).format(value),
            },
          },
        },
      },
    });
  } else {
    window.priceChartInstance.data.labels = labels;
    window.priceChartInstance.data.datasets = createPriceChartDatasets(prices);
    window.priceChartInstance.options.animation = {
      duration: 800,
      easing: 'easeInOutQuart',
    };
    window.priceChartInstance.update('active');
  }

  renderMovingAverageLegend();
  renderBollingerBandToggle();
  hideChartStatus();
};

const setActiveTimeframeButton = (activeButton) => {
  const buttons = document.querySelectorAll('#chart-section button[data-days]');

  buttons.forEach((button) => {
    const isActive = button === activeButton;

    button.classList.toggle('active-timeframe', isActive);
    button.style.fontWeight = isActive ? '700' : '500';
    button.style.backgroundColor = isActive ? '#3b82f6' : '';
    button.style.color = isActive ? '#fff' : '';
    button.style.borderColor = isActive ? '#3b82f6' : '';
  });
};

const getWatchlist = () => {
  try {
    const storedWatchlist = localStorage.getItem('crypto-watchlist');
    return storedWatchlist ? JSON.parse(storedWatchlist) : [];
  } catch (error) {
    console.error('Could not read watchlist:', error);
    return [];
  }
};

const saveWatchlist = (watchlist) => {
  localStorage.setItem('crypto-watchlist', JSON.stringify(watchlist));
};

const showWatchlistFeedback = (button) => {
  if (!button) {
    return;
  }

  const originalText = button.textContent;
  button.textContent = 'Added to Watchlist';
  button.classList.remove('btn-secondary');
  button.classList.add('btn-primary');

  window.clearTimeout(button._watchlistTimeout);
  button._watchlistTimeout = window.setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove('btn-primary');
    button.classList.add('btn-secondary');
  }, 1500);
};

const addCoinToWatchlist = (coinId, button) => {
  if (!coinId) {
    return;
  }

  const watchlist = getWatchlist();
  if (!watchlist.includes(coinId)) {
    watchlist.push(coinId);
    saveWatchlist(watchlist);
  }

  console.log('Updated watchlist:', watchlist);

  if (button) {
    showWatchlistFeedback(button);
  }
};

const loadHistoryAndRenderChart = async (coinId, days) => {
  const chartContainer = document.getElementById('price-chart');
  if (!chartContainer) {
    return;
  }

  showChartStatus('Loading historical prices...', 'loading');

  try {
    const history = await window.fetchCoinHistory(coinId, days);
    console.log('Coin history response:', history);

    const { labels, prices, volumes } = formatHistoryForChart(history);
    console.log('Labels:', labels);
    console.log('Prices:', prices);

    if (!labels.length || !prices.length) {
      throw new Error('No price history data was returned.');
    }

    renderPriceChart(labels, prices);
    renderMacdChart(labels, prices);
    updateRsiDisplay(prices);
    updateAiSummary(prices, volumes);
    updateTradingSignalDisplay(prices, volumes);
  } catch (historyError) {
    console.error('Could not load coin history:', historyError);
    showChartStatus('We could not load the chart data right now. Please try again.', 'error');
    updateRsiDisplay([]);
    updateAiSummary([], []);
    updateTradingSignalDisplay([], []);
  }
};

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
    // Connect the timeframe buttons so they refresh the existing chart in place.
    const timeframeButtons = document.querySelectorAll('#chart-section button[data-days]');
    timeframeButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        const days = button.getAttribute('data-days');
        setActiveTimeframeButton(button);
        await loadHistoryAndRenderChart(coinId, days);
      });
    });

    // Attach the watchlist action to the dedicated button.
    const watchlistButton = document.getElementById('watchlist-btn');
    if (watchlistButton) {
      watchlistButton.addEventListener('click', () => {
        addCoinToWatchlist(coinId, watchlistButton);
      });
    }

    // Fetch the detailed coin information from the shared API helper.
    const coin = await window.fetchCoinDetails(coinId);

    // Log the full response for debugging purposes.
    console.log('Coin details response:', coin);

    // Load the default 30-day history and render the initial chart.
    const defaultButton = document.querySelector('#chart-section button[data-days="30"]');
    if (defaultButton) {
      setActiveTimeframeButton(defaultButton);
    }
    await loadHistoryAndRenderChart(coinId, 30);

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

    // Populate the enhanced coin header summary.
    const rankHeader = document.getElementById('coin-rank-header');
    if (rankHeader) rankHeader.textContent = `#${coin.market_cap_rank || 'N/A'}`;

    const priceHeader = document.getElementById('coin-price-header');
    if (priceHeader) priceHeader.textContent = formatCurrency(coin.market_data?.current_price?.usd);

    const changeHeader = document.getElementById('coin-change-header');
    if (changeHeader) {
      const changeValue = coin.market_data?.price_change_percentage_24h || 0;
      const sign = changeValue >= 0 ? '+' : '';
      changeHeader.textContent = `${sign}${changeValue.toFixed(2)}%`;
      changeHeader.classList.remove('price-positive', 'price-negative');
      changeHeader.classList.add(changeValue >= 0 ? 'price-positive' : 'price-negative');
    }

    // Populate price summary.
    const price = document.getElementById('coin-price');
    if (price) price.textContent = formatCurrency(coin.market_data?.current_price?.usd);

    const priceCard = document.getElementById('coin-price-card');
    if (priceCard) priceCard.textContent = formatCurrency(coin.market_data?.current_price?.usd);

    const change = document.getElementById('coin-change');
    if (change) {
      const changeValue = coin.market_data?.price_change_percentage_24h || 0;
      const sign = changeValue >= 0 ? '+' : '';
      change.textContent = `${sign}${changeValue.toFixed(2)}%`;
      change.classList.remove('price-positive', 'price-negative');
      change.classList.add(changeValue >= 0 ? 'price-positive' : 'price-negative');
    }

    const changeCard = document.getElementById('coin-change-card');
    if (changeCard) {
      const changeValue = coin.market_data?.price_change_percentage_24h || 0;
      const sign = changeValue >= 0 ? '+' : '';
      changeCard.textContent = `${sign}${changeValue.toFixed(2)}%`;
      changeCard.classList.remove('price-positive', 'price-negative');
      changeCard.classList.add(changeValue >= 0 ? 'price-positive' : 'price-negative');
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

    // Populate price performance metrics from the existing coin details response.
    const performanceData = [
      { id: 'performance-24h', value: coin.market_data?.price_change_percentage_24h },
      { id: 'performance-7d', value: coin.market_data?.price_change_percentage_7d },
      { id: 'performance-14d', value: coin.market_data?.price_change_percentage_14d },
      { id: 'performance-30d', value: coin.market_data?.price_change_percentage_30d },
      { id: 'performance-60d', value: coin.market_data?.price_change_percentage_60d },
      { id: 'performance-200d', value: coin.market_data?.price_change_percentage_200d },
      { id: 'performance-1y', value: coin.market_data?.price_change_percentage_1y },
    ];

    performanceData.forEach(({ id, value }) => {
      const element = document.getElementById(id);
      if (!element) return;

      if (typeof value === 'number' && !Number.isNaN(value)) {
        const sign = value >= 0 ? '+' : '';
        element.textContent = `${sign}${value.toFixed(2)}%`;
        element.classList.remove('price-positive', 'price-negative');
        element.classList.add(value >= 0 ? 'price-positive' : 'price-negative');
      } else {
        element.textContent = '--';
        element.classList.remove('price-positive', 'price-negative');
      }
    });

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
