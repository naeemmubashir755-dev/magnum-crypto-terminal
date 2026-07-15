/*
 * Reusable, client-side market risk evaluator.
 * It consumes supplied indicator values only and never performs network requests.
 */
(function () {
  const toFiniteNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  // Volatility is the standard deviation of consecutive percentage returns.
  const calculatePriceVolatility = (prices) => {
    const values = prices.map(toFiniteNumber).filter((value) => value !== null);
    if (values.length < 2) return null;

    const returns = values.slice(1).map((price, index) => (
      ((price - values[index]) / values[index]) * 100
    ));
    const averageReturn = returns.reduce((sum, value) => sum + value, 0) / returns.length;
    const variance = returns.reduce(
      (sum, value) => sum + ((value - averageReturn) ** 2),
      0,
    ) / returns.length;
    return Math.sqrt(variance);
  };

  const evaluateRsiRisk = (rsi) => {
    if (rsi === null) return { score: 0, reason: 'RSI is unavailable' };
    if (rsi > 70 || rsi < 30) return { score: 2, reason: 'RSI is in an extreme zone' };
    return { score: 0, reason: 'RSI is in a neutral range' };
  };

  const evaluateVolatilityRisk = (volatility) => {
    if (volatility === null) return { score: 0, reason: 'volatility is unavailable' };
    if (volatility >= 5) return { score: 2, reason: 'price volatility is high' };
    if (volatility >= 2) return { score: 1, reason: 'price volatility is elevated' };
    return { score: 0, reason: 'price volatility is contained' };
  };

  const evaluateVolumeRisk = (volumeTrend) => {
    const trend = String(volumeTrend?.label ?? volumeTrend ?? '').toLowerCase();
    if (trend.includes('falling') || trend.includes('decreasing')) {
      return { score: 1, reason: 'volume is declining' };
    }
    return { score: 0, reason: trend.includes('rising') ? 'volume is supporting activity' : 'volume is stable' };
  };

  const evaluateTrendRisk = (priceTrend) => {
    const trend = String(priceTrend ?? '').toLowerCase();
    if (trend.includes('down')) return { score: 1, reason: 'the price trend is downward' };
    if (trend.includes('sideways')) return { score: 1, reason: 'the price trend lacks direction' };
    return { score: 0, reason: 'the price trend is upward' };
  };

  const evaluateStructureRisk = (marketStructure) => {
    const structure = String(marketStructure ?? '').toLowerCase();
    if (structure.includes('bearish')) return { score: 2, reason: 'market structure is bearish' };
    if (structure.includes('mixed')) return { score: 1, reason: 'market structure is mixed' };
    return { score: 0, reason: 'market structure is bullish' };
  };

  /**
   * Return a transparent Low, Medium, or High market-risk assessment.
   * @param {{rsi: number, volatility: number, volumeTrend: Object|string, priceTrend: string, marketStructure: string}} inputs
   * @returns {{level: 'Low'|'Medium'|'High', explanation: string, factors: string[]}}
   */
  const assessMarketRisk = (inputs = {}) => {
    const evaluations = [
      evaluateRsiRisk(toFiniteNumber(inputs.rsi)),
      evaluateVolatilityRisk(toFiniteNumber(inputs.volatility)),
      evaluateVolumeRisk(inputs.volumeTrend),
      evaluateTrendRisk(inputs.priceTrend),
      evaluateStructureRisk(inputs.marketStructure),
    ];
    const score = evaluations.reduce((total, evaluation) => total + evaluation.score, 0);
    const level = score >= 5 ? 'High' : score >= 2 ? 'Medium' : 'Low';
    const factors = evaluations.filter((evaluation) => evaluation.score > 0).map((evaluation) => evaluation.reason);
    const explanation = factors.length
      ? `${level} risk because ${factors.slice(0, 2).join(' and ')}.`
      : 'Low risk because volatility and technical conditions are currently contained.';

    return { level, explanation, factors };
  };

  window.calculatePriceVolatility = calculatePriceVolatility;
  window.assessMarketRisk = assessMarketRisk;
})();
