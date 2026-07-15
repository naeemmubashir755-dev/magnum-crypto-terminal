/*
 * Reusable, client-side technical signal evaluator.
 * Include this script on any page, then call window.analyzeTechnicalSignals(indicators).
 * It intentionally makes no network requests and does not depend on third-party libraries.
 */
(function () {
  const toFiniteNumber = (value) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const evaluateRsi = (rsi) => {
    if (rsi === null) return { score: 0, reason: 'RSI is unavailable.' };
    if (rsi <= 30) return { score: 2, reason: 'RSI is oversold.' };
    if (rsi < 45) return { score: 1, reason: 'RSI is recovering.' };
    if (rsi >= 70) return { score: -2, reason: 'RSI is overbought.' };
    if (rsi > 55) return { score: -1, reason: 'RSI is weakening.' };
    return { score: 0, reason: 'RSI is neutral.' };
  };

  const evaluateMacd = (macd) => {
    const line = toFiniteNumber(macd?.line ?? macd?.macdLine ?? macd);
    const signal = toFiniteNumber(macd?.signal ?? macd?.signalLine);
    if (line === null || signal === null) return { score: 0, reason: 'MACD is unavailable.' };

    const previousLine = toFiniteNumber(macd?.previousLine ?? macd?.previousMacdLine);
    const previousSignal = toFiniteNumber(macd?.previousSignal ?? macd?.previousSignalLine);
    if (previousLine !== null && previousSignal !== null && previousLine <= previousSignal && line > signal) {
      return { score: 2, reason: 'MACD shows a bullish crossover.' };
    }
    if (previousLine !== null && previousSignal !== null && previousLine >= previousSignal && line < signal) {
      return { score: -2, reason: 'MACD shows a bearish crossover.' };
    }
    return line > signal
      ? { score: 1, reason: 'MACD is above its signal line.' }
      : { score: -1, reason: 'MACD is below its signal line.' };
  };

  const evaluateMovingAverages = (ema20, ema50, currentPrice) => {
    if (ema20 === null || ema50 === null) {
      return { score: 0, reason: 'EMA crossover data is unavailable.' };
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
    return { score, reason: reasons.join(' ') };
  };

  const evaluateVolumeTrend = (volumeTrend) => {
    const trend = String(volumeTrend?.label ?? volumeTrend ?? '').toLowerCase();
    if (trend.includes('rising') || trend.includes('increasing')) {
      return { score: 1, reason: 'Volume is increasing.' };
    }
    if (trend.includes('falling') || trend.includes('decreasing')) {
      return { score: -1, reason: 'Volume is decreasing.' };
    }
    if (trend.includes('stable')) return { score: 0, reason: 'Volume is stable.' };
    return { score: 0, reason: 'Volume trend is unavailable.' };
  };

  const getSignal = (score) => {
    if (score >= 5) return 'Strong Buy';
    if (score >= 2) return 'Buy';
    if (score <= -5) return 'Strong Sell';
    if (score <= -2) return 'Sell';
    return 'Hold';
  };

  const getConfidence = (score, maxScore) => {
    const normalizedStrength = Math.min(1, Math.abs(score) / maxScore);
    return Math.round(35 + (normalizedStrength * 65));
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
   * @returns {{signal: string, confidence: number, reasons: string[]}}
   */
  const analyzeTechnicalSignals = (indicators = {}) => {
    const evaluations = [
      evaluateRsi(toFiniteNumber(indicators.rsi)),
      evaluateMacd(indicators.macd),
      evaluateMovingAverages(
        toFiniteNumber(indicators.ema20),
        toFiniteNumber(indicators.ema50),
        toFiniteNumber(indicators.currentPrice),
      ),
      evaluateVolumeTrend(indicators.volumeTrend),
    ];
    const score = evaluations.reduce((total, evaluation) => total + evaluation.score, 0);

    return {
      signal: getSignal(score),
      confidence: getConfidence(score, 8),
      reasons: evaluations.map((evaluation) => evaluation.reason),
    };
  };

  window.analyzeTechnicalSignals = analyzeTechnicalSignals;
})();
