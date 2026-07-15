/*
 * Reusable, client-side technical signal evaluator.
 * Include this script on any page, then call window.analyzeTechnicalSignals(indicators).
 * It intentionally makes no network requests and does not depend on third-party libraries.
 */
(function () {
  const indicatorWeights = {
    rsi: 0.2,
    macd: 0.3,
    ema: 0.25,
    volume: 0.1,
    supportResistance: 0.15,
  };
  const indicatorLabels = {
    rsi: 'RSI',
    macd: 'MACD',
    ema: 'EMA',
    volume: 'Volume Trend',
    supportResistance: 'Support/Resistance',
  };

  const toFiniteNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const evaluateRsi = (rsi) => {
    if (rsi === null) return { score: 0, maxScore: 2, available: false, reason: 'RSI is unavailable.' };
    if (rsi <= 30) return { score: 2, maxScore: 2, available: true, reason: 'RSI is oversold.' };
    if (rsi < 45) return { score: 1, maxScore: 2, available: true, reason: 'RSI is recovering.' };
    if (rsi >= 70) return { score: -2, maxScore: 2, available: true, reason: 'RSI is overbought.' };
    if (rsi > 55) return { score: -1, maxScore: 2, available: true, reason: 'RSI is weakening.' };
    return { score: 0, maxScore: 2, available: true, reason: 'RSI is neutral.' };
  };

  const evaluateMacd = (macd) => {
    const line = toFiniteNumber(macd?.line ?? macd?.macdLine ?? macd);
    const signal = toFiniteNumber(macd?.signal ?? macd?.signalLine);
    if (line === null || signal === null) return { score: 0, maxScore: 2, available: false, reason: 'MACD is unavailable.' };

    const previousLine = toFiniteNumber(macd?.previousLine ?? macd?.previousMacdLine);
    const previousSignal = toFiniteNumber(macd?.previousSignal ?? macd?.previousSignalLine);
    if (previousLine !== null && previousSignal !== null && previousLine <= previousSignal && line > signal) {
      return { score: 2, maxScore: 2, available: true, reason: 'MACD shows a bullish crossover.' };
    }
    if (previousLine !== null && previousSignal !== null && previousLine >= previousSignal && line < signal) {
      return { score: -2, maxScore: 2, available: true, reason: 'MACD shows a bearish crossover.' };
    }
    return line > signal
      ? { score: 1, maxScore: 2, available: true, reason: 'MACD is above its signal line.' }
      : { score: -1, maxScore: 2, available: true, reason: 'MACD is below its signal line.' };
  };

  const evaluateMovingAverages = (ema20, ema50, currentPrice) => {
    if (ema20 === null || ema50 === null) {
      return { score: 0, maxScore: 3, available: false, reason: 'EMA crossover data is unavailable.' };
    }

    let score = ema20 > ema50 ? 2 : -2;
    const reasons = [ema20 > ema50 ? 'EMA20 is above EMA50.' : 'EMA20 is below EMA50.'];
    if (currentPrice !== null) {
      if (currentPrice > ema20 && currentPrice > ema50) {
        score += 1;
        reasons.push('Price is above both moving averages.');
      } else if (currentPrice < ema20 && currentPrice < ema50) {
        score -= 1;
        reasons.push('Price is below both moving averages.');
      }
    }
    return { score, maxScore: 3, available: true, reason: reasons.join(' ') };
  };

  const evaluateVolumeTrend = (volumeTrend) => {
    const trend = String(volumeTrend?.label ?? volumeTrend ?? '').toLowerCase();
    if (trend.includes('rising') || trend.includes('increasing')) {
      return { score: 1, maxScore: 1, available: true, reason: 'Volume is increasing.' };
    }
    if (trend.includes('falling') || trend.includes('decreasing')) {
      return { score: -1, maxScore: 1, available: true, reason: 'Volume is decreasing.' };
    }
    if (trend.includes('stable')) return { score: 0, maxScore: 1, available: true, reason: 'Volume is stable.' };
    return { score: 0, maxScore: 1, available: false, reason: 'Volume trend is unavailable.' };
  };

  const evaluateSupportResistance = (levels, currentPrice) => {
    const price = toFiniteNumber(currentPrice);
    const support = toFiniteNumber(levels?.primarySupport);
    const resistance = toFiniteNumber(levels?.primaryResistance);
    if (price === null || (support === null && resistance === null)) {
      return { score: 0, maxScore: 1, available: false, reason: 'Support and resistance data is unavailable.' };
    }

    const supportDistance = support === null ? Infinity : Math.abs(price - support) / price;
    const resistanceDistance = resistance === null ? Infinity : Math.abs(resistance - price) / price;
    if (supportDistance <= 0.03 && supportDistance < resistanceDistance) {
      return { score: 1, maxScore: 1, available: true, reason: 'Price is testing nearby support.' };
    }
    if (resistanceDistance <= 0.03) {
      return { score: -1, maxScore: 1, available: true, reason: 'Price is testing nearby resistance.' };
    }
    return { score: 0, maxScore: 1, available: true, reason: 'Price is between key support and resistance levels.' };
  };

  const getSignal = (score) => {
    if (score >= 5) return 'Strong Buy';
    if (score >= 2) return 'Buy';
    if (score <= -5) return 'Strong Sell';
    if (score <= -2) return 'Sell';
    return 'Hold';
  };

  // Weight conviction by the available indicators, then expose the largest contributors.
  const getWeightedConfidence = (evaluations) => {
    const availableWeight = evaluations.reduce(
      (total, { key, evaluation }) => total + (evaluation.available ? indicatorWeights[key] : 0),
      0,
    );
    if (!availableWeight) return { confidence: 0, contributors: [] };

    const contributors = evaluations.map(({ key, evaluation }) => ({
      key,
      weight: indicatorWeights[key],
      contribution: evaluation.available ? Math.abs(evaluation.score / evaluation.maxScore) * indicatorWeights[key] : 0,
      reason: evaluation.reason,
    })).sort((first, second) => second.contribution - first.contribution);
    const strength = contributors.reduce((total, item) => total + item.contribution, 0) / availableWeight;
    const coverage = availableWeight;
    const confidence = Math.round(Math.min(100, ((strength * 0.75) + (coverage * 0.25)) * 100));

    return {
      confidence,
      contributors: contributors.filter((item) => item.contribution > 0).slice(0, 3),
    };
  };

  /**
   * Analyze technical indicator values and return a transparent, score-based signal.
   *
   * @param {Object} indicators
   * @param {number} indicators.rsi
   * @param {Object|number} indicators.macd - { line, signal, previousLine?, previousSignal? }
   * @param {number} indicators.ema20
   * @param {number} indicators.ema50
   * @param {number} indicators.currentPrice
   * @param {Object|string} indicators.volumeTrend - e.g. { label: 'volume rising' }
   * @param {{primarySupport?: number, primaryResistance?: number}} indicators.supportResistance
   * @returns {{signal: string, confidence: number, reasons: string[], confidenceFactors: string[]}}
   */
  const analyzeTechnicalSignals = (indicators = {}) => {
    const evaluations = [
      { key: 'rsi', evaluation: evaluateRsi(toFiniteNumber(indicators.rsi)) },
      { key: 'macd', evaluation: evaluateMacd(indicators.macd) },
      { key: 'ema', evaluation: evaluateMovingAverages(
        toFiniteNumber(indicators.ema20),
        toFiniteNumber(indicators.ema50),
        toFiniteNumber(indicators.currentPrice),
      ) },
      { key: 'volume', evaluation: evaluateVolumeTrend(indicators.volumeTrend) },
      { key: 'supportResistance', evaluation: evaluateSupportResistance(
        indicators.supportResistance,
        indicators.currentPrice,
      ) },
    ];
    const score = evaluations.reduce((total, { evaluation }) => total + evaluation.score, 0);
    const confidenceDetails = getWeightedConfidence(evaluations);

    return {
      signal: getSignal(score),
      confidence: confidenceDetails.confidence,
      reasons: evaluations
        .filter(({ key, evaluation }) => evaluation.available || key !== 'supportResistance')
        .map(({ evaluation }) => evaluation.reason),
      confidenceFactors: confidenceDetails.contributors.map(({ key, reason }) => `${indicatorLabels[key]}: ${reason}`),
    };
  };

  window.analyzeTechnicalSignals = analyzeTechnicalSignals;
})();
