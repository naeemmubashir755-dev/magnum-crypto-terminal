(() => {
  'use strict';

  const HOLDINGS_STORAGE_KEY = 'crypto-portfolio-holdings';

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

  const createTableCell = (value) => {
    const cell = document.createElement('td');
    cell.textContent = value;
    return cell;
  };

  const renderHoldings = () => {
    const tableBody = document.getElementById('holdings-table-body');
    if (!tableBody) {
      return;
    }

    const holdings = getSavedHoldings();
    tableBody.replaceChildren();

    if (!holdings.length) {
      const row = document.createElement('tr');
      const cell = createTableCell('No holdings have been added yet.');
      cell.colSpan = 5;
      row.appendChild(cell);
      tableBody.appendChild(row);
      return;
    }

    holdings.forEach((holding, index) => {
      const row = document.createElement('tr');
      const savedHolding = holding && typeof holding === 'object' ? holding : {};
      const quantity = Number(savedHolding.quantity);
      const buyPrice = Number(savedHolding.buyPrice);

      row.append(
        createTableCell(savedHolding.coin || 'Unknown coin'),
        createTableCell(Number.isFinite(quantity) ? String(quantity) : '--'),
        createTableCell(Number.isFinite(buyPrice) ? formatBuyPrice(buyPrice) : '--'),
        createTableCell(savedHolding.purchaseDate || '--')
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
      renderHoldings();
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
      renderHoldings();
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
    renderHoldings();
  });
})();
