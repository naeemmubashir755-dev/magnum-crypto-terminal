/*
 * Minimal in-memory TTL cache for upstream API responses.
 * Entries expire automatically on read; failed loader calls are never cached.
 */
const entries = new Map();

const get = (key) => {
  const entry = entries.get(key);
  if (!entry) return null;

  if (Date.now() >= entry.expiresAt) {
    entries.delete(key);
    return null;
  }

  return entry.value;
};

const set = (key, value, ttlMilliseconds) => {
  entries.set(key, {
    value,
    expiresAt: Date.now() + ttlMilliseconds,
  });
  return value;
};

const getOrSet = async (key, ttlMilliseconds, loader) => {
  const cachedValue = get(key);
  if (cachedValue !== null) return cachedValue;

  const freshValue = await loader();
  return set(key, freshValue, ttlMilliseconds);
};

module.exports = { getOrSet };
