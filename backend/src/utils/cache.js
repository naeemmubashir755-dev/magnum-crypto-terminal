/*
 * Minimal in-memory TTL cache for upstream API responses.
 * Entries expire automatically on read; failed loader calls are never cached.
 */
const entries = new Map();
const pendingLoads = new Map();

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

  // Reuse an in-flight load so concurrent REST and socket requests do not
  // trigger duplicate upstream calls when a cache entry expires.
  if (pendingLoads.has(key)) return pendingLoads.get(key);

  const pendingLoad = Promise.resolve()
    .then(loader)
    .then((freshValue) => set(key, freshValue, ttlMilliseconds))
    .finally(() => pendingLoads.delete(key));

  pendingLoads.set(key, pendingLoad);
  return pendingLoad;
};

module.exports = { getOrSet };
