/*
 * Reusable support and resistance detector.
 * It identifies local swing points, clusters nearby levels, and never makes network requests.
 */
(function () {
  const sanitizePrices = (prices) => prices.map(Number).filter(Number.isFinite);

  const getPivotCandidates = (prices, radius) => {
    const supports = [];
    const resistances = [];

    for (let index = radius; index < prices.length - radius; index += 1) {
      const window = prices.slice(index - radius, index + radius + 1);
      const price = prices[index];
      if (price === Math.min(...window)) supports.push(price);
      if (price === Math.max(...window)) resistances.push(price);
    }

    return { supports, resistances };
  };

  // Merge nearby pivot prices so repeated tests of the same area become one level.
  const clusterLevels = (levels, tolerance) => {
    const clusters = [];
    [...levels].sort((first, second) => first - second).forEach((level) => {
      const cluster = clusters.at(-1);
      if (cluster && Math.abs(level - cluster.value) / cluster.value <= tolerance) {
        cluster.values.push(level);
        cluster.value = cluster.values.reduce((sum, value) => sum + value, 0) / cluster.values.length;
      } else {
        clusters.push({ value: level, values: [level] });
      }
    });

    return clusters.map(({ value }) => value);
  };

  const getDirectionalLevels = (levels, currentPrice, direction, tolerance) => {
    const filtered = levels.filter((level) => (
      direction === 'support' ? level < currentPrice : level > currentPrice
    ));
    return clusterLevels(filtered, tolerance).sort((first, second) => (
      direction === 'support' ? second - first : first - second
    )).slice(0, 2);
  };

  /**
   * Detects two support and two resistance levels from a historical price series.
   * @param {number[]} prices Historical prices in chronological order.
   * @returns {{primarySupport: number|null, secondarySupport: number|null, primaryResistance: number|null, secondaryResistance: number|null}}
   */
  const detectSupportResistance = (prices) => {
    const values = sanitizePrices(prices);
    if (values.length < 5) {
      return {
        primarySupport: null, secondarySupport: null,
        primaryResistance: null, secondaryResistance: null,
      };
    }

    const currentPrice = values.at(-1);
    const radius = Math.max(2, Math.min(7, Math.floor(values.length / 40)));
    const tolerance = 0.015;
    const pivots = getPivotCandidates(values, radius);

    // Include all prices as a fallback for short or strongly one-directional histories.
    const supports = getDirectionalLevels([...pivots.supports, ...values], currentPrice, 'support', tolerance);
    const resistances = getDirectionalLevels([...pivots.resistances, ...values], currentPrice, 'resistance', tolerance);

    return {
      primarySupport: supports[0] ?? null,
      secondarySupport: supports[1] ?? null,
      primaryResistance: resistances[0] ?? null,
      secondaryResistance: resistances[1] ?? null,
    };
  };

  window.detectSupportResistance = detectSupportResistance;
})();
