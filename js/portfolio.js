(() => {
  'use strict';

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

  document.addEventListener('DOMContentLoaded', () => {
    renderPortfolioSummary(portfolioPlaceholder);
  });
})();
