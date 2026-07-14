const STORAGE_KEY = 'crypto-watchlist';

const getWatchlist = () => {
  try {
    const savedWatchlist = localStorage.getItem(STORAGE_KEY);
    return savedWatchlist ? JSON.parse(savedWatchlist) : [];
  } catch (error) {
    console.error('Could not read watchlist:', error);
    return [];
  }
};

const renderWatchlist = () => {
  const list = document.getElementById('watchlist-list');
  if (!list) {
    return;
  }

  const watchlist = getWatchlist();

  if (!watchlist.length) {
    list.innerHTML = '<li class="watchlist-empty">No coins saved yet.</li>';
    return;
  }

  list.innerHTML = watchlist
    .map((coinId) => `<li>${coinId}</li>`)
    .join('');
};

document.addEventListener('DOMContentLoaded', () => {
  renderWatchlist();
});
