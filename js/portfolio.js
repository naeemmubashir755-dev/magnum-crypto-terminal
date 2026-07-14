(() => {
  'use strict';

  const HOLDINGS_STORAGE_KEY = 'crypto-portfolio-holdings';
  const allocationColors = [
    '#38bdf8',
    '#22c55e',
    '#f59e0b',
    '#f97316',
    '#ec4899',
    '#14b8a6',
    '#ef4444',
    '#a78bfa',
  ];
  const marketPriceState = {
    marketDataRequest: null,
    coinDetailRequests: new Map(),
    prices: new Map(),
    refreshId: 0,
    allocationChart: null,
  };

  // Static display values until portfolio calculations and data persistence are added.
  const portfolioPlaceholder = Object.freeze({
    totalValue: '$125,400.00',
    todayProfitLoss: '+$1,250.00',
    totalProfitLoss: '+$12,300.00',
    assetCount: '3',
  });

  const renderPortfolioSummary = (summary) => {
    document.querySelectorAll('[data-portfolio-metric]').forEach((metric) => {
      const value = summary[metric.dataset.portfolioMetric];

      if (value !== undefined) {
        metric.textContent = value;
      }
    });
  };

  const getSavedHoldings = () => {
    try {
      const savedHoldings = localStorage.getItem(HOLDINGS_STORAGE_KEY);
      const holdings = savedHoldings ? JSON.parse(savedHoldings) : [];

      return Array.isArray(holdings) ? holdings : [];
    } catch (error) {
      console.error('Could not read portfolio holdings:', error);
      return [];
    }
  };

  const saveHoldings = (holdings) => {
    localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings));
  };

  const saveHolding = (holding) => {
    const holdings = getSavedHoldings();
    holdings.push(holding);
    saveHoldings(holdings);
  };

  const formatBuyPrice = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);

  const formatCurrentValue = (value) => formatBuyPrice(value);

  const formatSignedCurrency = (value) => {
    if (!Number.isFinite(value)) {
      return '--';
    }

    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatBuyPrice(Math.abs(value))}`;
  };

  const formatProfitLossPercentage = (value) => {
    if (!Number.isFinite(value)) {
      return '--';
    }

    const sign = value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${Math.abs(value).toFixed(2)}%`;
  };

  const formatAllocationPercentage = (value) => `${value.toFixed(2)}%`;

  const getProfitLossClass = (value) => {
    if (value > 0) {
      return 'price-positive';
    }

    if (value < 0) {
      return 'price-negative';
    }

    return '';
  };

  const getHoldingKey = (coin) => String(coin || '').trim().toLowerCase();

  const getCoinIdentifier = (coin) => getHoldingKey(coin).replace(/\s+/g, '-');

  const getMarketDataOnce = () => {
    if (!marketPriceState.marketDataRequest) {
      marketPriceState.marketDataRequest = window.fetchMarketData(250);
    }

    return marketPriceState.marketDataRequest;
  };

  const getCoinDetailsOnce = (coinIdentifier) => {
    if (!marketPriceState.coinDetailRequests.has(coinIdentifier)) {
      marketPriceState.coinDetailRequests.set(coinIdentifier, window.fetchCoinDetails(coinIdentifier));
    }

    return marketPriceState.coinDetailRequests.get(coinIdentifier);
  };

  const createMarketPriceLookup = (coins) => {
    const prices = new Map();

    coins.forEach((coin) => {
      const price = Number(coin.current_price);
      if (!Number.isFinite(price)) {
        return;
      }

      [coin.id, coin.name, coin.symbol].forEach((identifier) => {
        const key = getHoldingKey(identifier);
        if (key) {
          prices.set(key, price);
        }
      });
    });

    return prices;
  };

  const fetchCurrentPrices = async (holdings) => {
    const holdingKeys = [...new Set(holdings.map((holding) => getHoldingKey(holding?.coin)).filter(Boolean))];
    if (!holdingKeys.length) {
      return new Map();
    }

    let prices = new Map();

    try {
      const marketCoins = await getMarketDataOnce();
      prices = createMarketPriceLookup(marketCoins);
    } catch (error) {
      console.error('Could not load the market price list:', error);
    }

    // Only fall back to a detail request for unique holdings missing from the bulk response.
    await Promise.all(
      holdingKeys
        .filter((holdingKey) => !prices.has(holdingKey))
        .map(async (holdingKey) => {
          try {
            const coin = await getCoinDetailsOnce(getCoinIdentifier(holdingKey));
            const price = Number(coin.market_data?.current_price?.usd);

            if (Number.isFinite(price)) {
              prices.set(holdingKey, price);
            }
          } catch (error) {
            console.error(`Could not load the current price for ${holdingKey}:`, error);
          }
        })
    );

    return prices;
  };

  const calculateCurrentValue = (holding, prices) => {
    const quantity = Number(holding?.quantity);
    const price = prices.get(getHoldingKey(holding?.coin));

    if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
      return null;
    }

    return quantity * price;
  };

  const calculateHoldingPerformance = (holding, prices) => {
    const quantity = Number(holding?.quantity);
    const buyPrice = Number(holding?.buyPrice);
    const currentValue = calculateCurrentValue(holding, prices);

    if (!Number.isFinite(quantity) || !Number.isFinite(buyPrice) || currentValue === null) {
      return null;
    }

    const costBasis = quantity * buyPrice;
    const profitLoss = currentValue - costBasis;

    return {
      currentValue,
      costBasis,
      profitLoss,
      profitLossPercentage: costBasis > 0 ? (profitLoss / costBasis) * 100 : null,
    };
  };

  const calculatePortfolioPerformance = (holdings, prices) => {
    let totalValue = 0;
    let totalCostBasis = 0;

    for (const holding of holdings) {
      const performance = calculateHoldingPerformance(holding, prices);
      if (!performance) {
        return null;
      }

      totalValue += performance.currentValue;
      totalCostBasis += performance.costBasis;
    }

    const profitLoss = totalValue - totalCostBasis;

    return {
      totalValue,
      profitLoss,
      profitLossPercentage: totalCostBasis > 0 ? (profitLoss / totalCostBasis) * 100 : null,
    };
  };

  const calculatePortfolioAllocation = (holdings, prices) => {
    const assets = new Map();

    for (const holding of holdings) {
      const currentValue = calculateCurrentValue(holding, prices);
      const key = getHoldingKey(holding?.coin);

      if (currentValue === null || !key) {
        return null;
      }

      const asset = assets.get(key) || {
        name: String(holding.coin).trim(),
        value: 0,
      };
      asset.value += currentValue;
      assets.set(key, asset);
    }

    const totalValue = [...assets.values()].reduce((total, asset) => total + asset.value, 0);
    if (totalValue <= 0) {
      return [];
    }

    return [...assets.values()]
      .map((asset) => ({
        ...asset,
        percentage: (asset.value / totalValue) * 100,
      }))
      .sort((left, right) => right.value - left.value);
  };

  const createTableCell = (value, className = '') => {
    const cell = document.createElement('td');
    cell.textContent = value;
    if (className) {
      cell.className = className;
    }
    return cell;
  };

  const renderHoldings = (holdings = getSavedHoldings(), prices = marketPriceState.prices) => {
    const tableBody = document.getElementById('holdings-table-body');
    if (!tableBody) {
      return;
    }

    tableBody.replaceChildren();

    if (!holdings.length) {
      const row = document.createElement('tr');
      const cell = createTableCell('No holdings have been added yet.');
      cell.colSpan = 7;
      row.appendChild(cell);
      tableBody.appendChild(row);
      return;
    }

    holdings.forEach((holding, index) => {
      const row = document.createElement('tr');
      const savedHolding = holding && typeof holding === 'object' ? holding : {};
      const quantity = Number(savedHolding.quantity);
      const buyPrice = Number(savedHolding.buyPrice);
      const performance = calculateHoldingPerformance(savedHolding, prices);
      const profitLoss = performance?.profitLoss;
      const profitLossPercentage = performance?.profitLossPercentage;

      row.append(
        createTableCell(savedHolding.coin || 'Unknown coin'),
        createTableCell(Number.isFinite(quantity) ? String(quantity) : '--'),
        createTableCell(Number.isFinite(buyPrice) ? formatBuyPrice(buyPrice) : '--'),
        createTableCell(savedHolding.purchaseDate || '--'),
        createTableCell(performance ? formatCurrentValue(performance.currentValue) : '--'),
        createTableCell(
          performance ? `${formatSignedCurrency(profitLoss)} (${formatProfitLossPercentage(profitLossPercentage)})` : '--',
          getProfitLossClass(profitLoss)
        )
      );

      const actionCell = document.createElement('td');
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn-danger';
      deleteButton.dataset.holdingIndex = String(index);
      deleteButton.textContent = 'Delete';
      actionCell.appendChild(deleteButton);
      row.appendChild(actionCell);
      tableBody.appendChild(row);
    });
  };

  const setFormStatus = (message, type = '') => {
    const status = document.getElementById('holding-form-status');
    if (!status) {
      return;
    }

    status.textContent = message;
    status.className = `holding-form-status ${type}`.trim();
  };

  const setAllocationStatus = (message) => {
    const status = document.getElementById('portfolio-allocation-status');
    if (status) {
      status.textContent = message;
    }
  };

  const destroyAllocationChart = () => {
    if (marketPriceState.allocationChart) {
      marketPriceState.allocationChart.destroy();
      marketPriceState.allocationChart = null;
    }
  };

  const renderAllocationLegend = (allocation) => {
    const legend = document.getElementById('portfolio-allocation-legend');
    if (!legend) {
      return;
    }

    legend.replaceChildren();

    allocation.forEach((asset, index) => {
      const item = document.createElement('li');
      const swatch = document.createElement('span');
      const name = document.createElement('span');
      const percentage = document.createElement('span');

      swatch.className = 'portfolio-allocation-swatch';
      swatch.style.backgroundColor = allocationColors[index % allocationColors.length];
      name.className = 'portfolio-allocation-name';
      name.textContent = asset.name;
      percentage.className = 'portfolio-allocation-percentage';
      percentage.textContent = formatAllocationPercentage(asset.percentage);

      item.append(swatch, name, percentage);
      legend.appendChild(item);
    });
  };

  const createAllocationChartOptions = (allocation) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const asset = allocation[context.dataIndex];
            return `${asset.name}: ${formatCurrentValue(asset.value)} (${formatAllocationPercentage(asset.percentage)})`;
          },
        },
      },
    },
  });

  const renderPortfolioAllocation = (holdings, prices) => {
    const canvas = document.getElementById('portfolio-allocation-chart');
    if (!canvas) {
      return;
    }

    if (!holdings.length) {
      destroyAllocationChart();
      renderAllocationLegend([]);
      setAllocationStatus('Add a holding to view your allocation.');
      return;
    }

    const allocation = calculatePortfolioAllocation(holdings, prices);
    if (!allocation) {
      destroyAllocationChart();
      renderAllocationLegend([]);
      setAllocationStatus('Allocation will appear when current prices are available.');
      return;
    }

    if (!allocation.length) {
      destroyAllocationChart();
      renderAllocationLegend([]);
      setAllocationStatus('Allocation is unavailable because the portfolio value is zero.');
      return;
    }

    if (typeof window.Chart === 'undefined') {
      renderAllocationLegend(allocation);
      setAllocationStatus('The allocation chart could not be loaded.');
      return;
    }

    const labels = allocation.map((asset) => `${asset.name} ${formatAllocationPercentage(asset.percentage)}`);
    const data = allocation.map((asset) => asset.value);
    const colors = allocation.map((_, index) => allocationColors[index % allocationColors.length]);

    renderAllocationLegend(allocation);
    setAllocationStatus('');

    if (!marketPriceState.allocationChart) {
      marketPriceState.allocationChart = new window.Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{ data, backgroundColor: colors, borderWidth: 0 }],
        },
        options: createAllocationChartOptions(allocation),
      });
      return;
    }

    marketPriceState.allocationChart.data.labels = labels;
    marketPriceState.allocationChart.data.datasets[0].data = data;
    marketPriceState.allocationChart.data.datasets[0].backgroundColor = colors;
    marketPriceState.allocationChart.options = createAllocationChartOptions(allocation);
    marketPriceState.allocationChart.update();
  };

  const renderOverallProfitLoss = (performance) => {
    const metric = document.querySelector('[data-portfolio-metric="totalProfitLoss"]');
    if (!metric) {
      return;
    }

    const profitLoss = performance?.profitLoss;
    const profitLossPercentage = performance?.profitLossPercentage;

    metric.textContent = performance
      ? `${formatSignedCurrency(profitLoss)} (${formatProfitLossPercentage(profitLossPercentage)})`
      : '--';
    metric.classList.remove('price-positive', 'price-negative');
    metric.classList.add(getProfitLossClass(profitLoss));
  };

  const refreshPortfolioValues = async () => {
    const refreshId = ++marketPriceState.refreshId;
    const holdings = getSavedHoldings();

    if (!holdings.length) {
      marketPriceState.prices = new Map();
      renderHoldings(holdings);
      renderPortfolioAllocation(holdings, marketPriceState.prices);
      renderPortfolioSummary({ ...portfolioPlaceholder, totalValue: formatCurrentValue(0) });
      renderOverallProfitLoss({ profitLoss: 0, profitLossPercentage: 0 });
      return;
    }

    renderHoldings(holdings);
    renderPortfolioAllocation(holdings, marketPriceState.prices);
    const prices = await fetchCurrentPrices(holdings);

    if (refreshId !== marketPriceState.refreshId) {
      return;
    }

    marketPriceState.prices = prices;
    renderHoldings(holdings, prices);
    renderPortfolioAllocation(holdings, prices);

    // Recalculate summary performance from the same prices used for every table row.
    const performance = calculatePortfolioPerformance(holdings, prices);
    renderPortfolioSummary({
      ...portfolioPlaceholder,
      totalValue: performance ? formatCurrentValue(performance.totalValue) : '--',
    });
    renderOverallProfitLoss(performance);
  };

  const getToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const validateHolding = (form) => {
    const coin = form.elements.coin.value.trim();
    const quantity = Number(form.elements.quantity.value);
    const buyPrice = Number(form.elements.buyPrice.value);
    const purchaseDate = form.elements.purchaseDate.value;

    if (!coin) {
      return 'Enter a cryptocurrency name.';
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return 'Enter a quantity greater than zero.';
    }

    if (!Number.isFinite(buyPrice) || buyPrice <= 0) {
      return 'Enter a buy price greater than zero.';
    }

    if (!purchaseDate || purchaseDate > getToday()) {
      return 'Enter a purchase date that is not in the future.';
    }

    return '';
  };

  const createHoldingFromForm = (form) => ({
    coin: form.elements.coin.value.trim(),
    quantity: Number(form.elements.quantity.value),
    buyPrice: Number(form.elements.buyPrice.value),
    purchaseDate: form.elements.purchaseDate.value,
  });

  const handleHoldingSubmission = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const validationMessage = validateHolding(form);

    if (validationMessage) {
      setFormStatus(validationMessage, 'error');
      return;
    }

    try {
      saveHolding(createHoldingFromForm(form));
      form.reset();
      setFormStatus('Holding saved.', 'success');
      refreshPortfolioValues();
    } catch (error) {
      console.error('Could not save portfolio holding:', error);
      setFormStatus('We could not save this holding. Please try again.', 'error');
    }
  };

  const handleHoldingDeletion = (event) => {
    const deleteButton = event.target.closest('button[data-holding-index]');
    if (!deleteButton) {
      return;
    }

    const holdingIndex = Number.parseInt(deleteButton.dataset.holdingIndex, 10);
    const holdings = getSavedHoldings();

    if (!Number.isInteger(holdingIndex) || holdingIndex < 0 || holdingIndex >= holdings.length) {
      return;
    }

    try {
      holdings.splice(holdingIndex, 1);
      saveHoldings(holdings);
      refreshPortfolioValues();
      setFormStatus('Holding deleted.', 'success');
    } catch (error) {
      console.error('Could not delete portfolio holding:', error);
      setFormStatus('We could not delete this holding. Please try again.', 'error');
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderPortfolioSummary(portfolioPlaceholder);

    const holdingForm = document.getElementById('add-holding-form');
    if (holdingForm) {
      const purchaseDate = holdingForm.elements.purchaseDate;
      purchaseDate.max = getToday();
      holdingForm.addEventListener('submit', handleHoldingSubmission);
    }

    const holdingsTableBody = document.getElementById('holdings-table-body');
    holdingsTableBody?.addEventListener('click', handleHoldingDeletion);
    refreshPortfolioValues();
  });
})();
