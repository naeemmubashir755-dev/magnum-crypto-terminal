/*
 * Rule-based AI Market Summary generator.
 * It consumes indicators already calculated by the Coin Details page and
 * deliberately performs no network requests or external AI calls.
 */
(function () {
  const toFiniteNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  const titleCase = (value) => String(value || 'Unavailable')
    .replace(/\b\w/g, (character) => character.toUpperCase());

  const getOverallTrend = ({ priceTrend, marketStructure, ema20, ema50, currentPrice }) => {
    const trend = String(priceTrend || '').toLowerCase();
    if (trend.includes('uptrend')) return 'Bullish';
    if (trend.includes('downtrend')) return 'Bearish';

    const price = toFiniteNumber(currentPrice);
    const fastEma = toFiniteNumber(ema20);
    const slowEma = toFiniteNumber(ema50);
    if (marketStructure === 'bullish' || (price !== null && fastEma !== null && slowEma !== null && price > fastEma && fastEma > slowEma)) return 'Bullish';
    if (marketStructure === 'bearish' || (price !== null && fastEma !== null && slowEma !== null && price < fastEma && fastEma < slowEma)) return 'Bearish';
    return 'Neutral';
  };

  const getMomentum = ({ rsi, macd, volumeTrend }) => {
    const rsiValue = toFiniteNumber(rsi);
    const macdLine = toFiniteNumber(macd?.line);
    const signalLine = toFiniteNumber(macd?.signal);
    const volume = String(volumeTrend?.label ?? volumeTrend ?? '').toLowerCase();
    let score = 0;

    if (macdLine !== null && signalLine !== null) score += macdLine > signalLine ? 1 : -1;
    if (rsiValue !== null) {
      if (rsiValue >= 45 && rsiValue <= 65) score += 1;
      if (rsiValue >= 70 || rsiValue <= 30) score -= 1;
    }
    if (volume.includes('rising') || volume.includes('increasing')) score += 1;
    if (volume.includes('falling') || volume.includes('decreasing')) score -= 1;

    if (score >= 2) return 'Strong Bullish';
    if (score === 1) return 'Bullish';
    if (score <= -2) return 'Strong Bearish';
    if (score === -1) return 'Bearish';
    return 'Neutral';
  };

  const getMarketStructure = ({ marketStructure, currentPrice, ema20, ema50 }) => {
    if (['bullish', 'bearish', 'mixed'].includes(marketStructure)) return titleCase(marketStructure);

    const price = toFiniteNumber(currentPrice);
    const fastEma = toFiniteNumber(ema20);
    const slowEma = toFiniteNumber(ema50);
    if (price !== null && fastEma !== null && slowEma !== null && price > fastEma && fastEma > slowEma) return 'Bullish';
    if (price !== null && fastEma !== null && slowEma !== null && price < fastEma && fastEma < slowEma) return 'Bearish';
    return 'Mixed';
  };

  const getRiskLevel = ({ riskAssessment, rsi, marketStructure }) => {
    if (riskAssessment?.level) return titleCase(riskAssessment.level);

    const rsiValue = toFiniteNumber(rsi);
    if (rsiValue !== null && (rsiValue >= 70 || rsiValue <= 30)) return 'High';
    if (marketStructure === 'mixed') return 'Medium';
    return 'Low';
  };

  const getConfidenceScore = ({ signalAnalysis, rsi, macd, ema20, ema50, volumeTrend, supportResistance }) => {
    const existingConfidence = toFiniteNumber(signalAnalysis?.confidence);
    if (existingConfidence !== null) return Math.max(0, Math.min(100, Math.round(existingConfidence)));

    const availableIndicators = [
      toFiniteNumber(rsi) !== null,
      toFiniteNumber(macd?.line) !== null && toFiniteNumber(macd?.signal) !== null,
      toFiniteNumber(ema20) !== null && toFiniteNumber(ema50) !== null,
      Boolean(volumeTrend?.label ?? volumeTrend),
      toFiniteNumber(supportResistance?.primarySupport) !== null || toFiniteNumber(supportResistance?.primaryResistance) !== null,
    ].filter(Boolean).length;
    return Math.round((availableIndicators / 5) * 100);
  };

  const getRsiPhrase = (rsi) => {
    const value = toFiniteNumber(rsi);
    if (value === null) return 'RSI is unavailable';
    if (value >= 70) return `RSI is elevated at ${value.toFixed(1)}`;
    if (value <= 30) return `RSI is oversold at ${value.toFixed(1)}`;
    return `RSI is in a healthy range at ${value.toFixed(1)}`;
  };

  const getMacdPhrase = (macd) => {
    const line = toFiniteNumber(macd?.line);
    const signal = toFiniteNumber(macd?.signal);
    if (line === null || signal === null) return 'MACD is unavailable';
    return line > signal ? 'MACD confirms upward momentum' : 'MACD remains below its signal line';
  };

  const getVolumePhrase = (volumeTrend) => {
    const trend = String(volumeTrend?.label ?? volumeTrend ?? '').toLowerCase();
    if (trend.includes('rising') || trend.includes('increasing')) return 'Volume is increasing and supports participation';
    if (trend.includes('falling') || trend.includes('decreasing')) return 'Volume is declining, which reduces confirmation';
    return 'Volume is broadly stable';
  };

  const getLevelPhrase = ({ currentPrice, supportResistance }) => {
    const price = toFiniteNumber(currentPrice);
    const support = toFiniteNumber(supportResistance?.primarySupport);
    const resistance = toFiniteNumber(supportResistance?.primaryResistance);
    if (price === null || (support === null && resistance === null)) return 'Key support and resistance levels are still being established';

    const supportDistance = support === null ? Infinity : Math.abs(price - support) / price;
    const resistanceDistance = resistance === null ? Infinity : Math.abs(resistance - price) / price;
    if (resistanceDistance <= 0.03) return 'Nearby resistance may limit the next advance';
    if (supportDistance <= 0.03) return 'Nearby support is helping define the current range';
    return 'Price is trading between identified support and resistance levels';
  };

  /**
   * Produces presentation-ready labels and a four-sentence market narrative.
   * @returns {{overallTrend: string, momentum: string, marketStructure: string, riskLevel: string, confidenceScore: number, summary: string}}
   */
  const generateAiMarketSummary = (inputs = {}) => {
    const overallTrend = getOverallTrend(inputs);
    const momentum = getMomentum(inputs);
    const marketStructure = getMarketStructure(inputs);
    const riskLevel = getRiskLevel(inputs);
    const confidenceScore = getConfidenceScore(inputs);
    const assetName = inputs.coinName || 'This asset';
    const riskExplanation = inputs.riskAssessment?.explanation
      ? inputs.riskAssessment.explanation.replace(/\.$/, '')
      : `${riskLevel} risk based on the available technical data`;

    const summary = [
      `${assetName} is currently in a ${overallTrend.toLowerCase()} trend with ${marketStructure.toLowerCase()} market structure.`,
      `Momentum is ${momentum.toLowerCase()}: ${getRsiPhrase(inputs.rsi)}, while ${getMacdPhrase(inputs.macd)}.`,
      `${getVolumePhrase(inputs.volumeTrend)}.`,
      `${riskExplanation}; ${getLevelPhrase(inputs)}, with ${confidenceScore}% confidence.`,
    ].join(' ');

    return { overallTrend, momentum, marketStructure, riskLevel, confidenceScore, summary };
  };

  window.generateAiMarketSummary = generateAiMarketSummary;
})();
