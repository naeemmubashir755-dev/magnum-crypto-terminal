function formatTitle(text) {
  return text.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}
