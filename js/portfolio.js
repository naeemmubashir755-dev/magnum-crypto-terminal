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

  const saveHolding = (holding) => {
    const holdings = getSavedHoldings();
    holdings.push(holding);
    localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings));
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
    } catch (error) {
      console.error('Could not save portfolio holding:', error);
      setFormStatus('We could not save this holding. Please try again.', 'error');
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderPortfolioSummary(portfolioPlaceholder);

    const holdingForm = document.getElementById('add-holding-form');
    if (!holdingForm) {
      return;
    }

    const purchaseDate = holdingForm.elements.purchaseDate;
    purchaseDate.max = getToday();
    holdingForm.addEventListener('submit', handleHoldingSubmission);
  });
})();
