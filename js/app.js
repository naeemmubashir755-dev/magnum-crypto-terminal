document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('theme-toggle');
  const storageKey = 'crypto-terminal-theme';

  const applyTheme = (theme) => {
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);

    if (toggleButton) {
      toggleButton.textContent = theme === 'dark' ? 'Light mode' : 'Dark mode';
      toggleButton.setAttribute('aria-pressed', String(theme === 'dark'));
    }
  };

  const savedTheme = localStorage.getItem(storageKey);
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');

  toggleButton?.addEventListener('click', () => {
    const nextTheme = document.documentElement.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  });

  console.log('Crypto Terminal app loaded');
});
