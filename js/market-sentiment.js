document.addEventListener('DOMContentLoaded', async () => {
  const value = document.getElementById('fear-greed-value');
  const classification = document.getElementById('fear-greed-classification');
  const updated = document.getElementById('fear-greed-updated');

  if (!value || !classification || !updated) return;

  const renderUnavailable = () => {
    value.textContent = 'Unavailable';
    classification.textContent = 'Market sentiment data is currently unavailable.';
    updated.textContent = 'Last updated: --';
  };

  try {
    const sentiment = await window.fetchMarketFearGreed();
    value.textContent = String(sentiment.value);
    classification.textContent = sentiment.classification;
    updated.textContent = sentiment.lastUpdated
      ? `Last updated: ${new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium', timeStyle: 'short',
      }).format(new Date(sentiment.lastUpdated))}`
      : 'Last updated: --';
  } catch (error) {
    console.error('Unable to load market sentiment:', error);
    renderUnavailable();
  }
});
