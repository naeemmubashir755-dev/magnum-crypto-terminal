/*
 * Reusable, rule-based trade setup generator.
 * It uses technical values already available on the Coin Details page and
 * deliberately makes no network requests or external AI calls.
 */
(function () {
  const toFiniteNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

  const getRiskLevel = (riskAssessment) => String(riskAssessment?.level ?? '').toLowerCase();

  const getVolumeLabel = (volumeTrend) => String(volumeTrend?.label ?? volumeTrend ?? '').toLowerCase();

  const getSignalLabel = (signalAnalysis) => String(signalAnalysis?.signal ?? '').toLowerCase();

  const getDirectionalBias = (inputs) => {
    const currentPrice = toFiniteNumber(inputs.currentPrice);
    const rsi = toFiniteNumber(inputs.rsi);
    const macdLine = toFiniteNumber(inputs.macd?.line);
    const macdSignal = toFiniteNumber(inputs.macd?.signal);
    const ema20 = toFiniteNumber(inputs.ema20);
    const ema50 = toFiniteNumber(inputs.ema50);
    const confidence = toFiniteNumber(inputs.signalAnalysis?.confidence);
    const trend = String(inputs.priceTrend ?? '').toLowerCase();
    const structure = String(inputs.marketStructure ?? '').toLowerCase();
    const volume = getVolumeLabel(inputs.volumeTrend);
    const signal = getSignalLabel(inputs.signalAnalysis);

    if (currentPrice === null || currentPrice <= 0 || (confidence !== null && confidence < 25)) {
      return 'Wait';
    }

    let bullishScore = 0;
    let bearishScore = 0;

    if (macdLine !== null && macdSignal !== null) {
      if (macdLine > macdSignal) bullishScore += 1;
      if (macdLine < macdSignal) bearishScore += 1;
    }
    if (ema20 !== null) {
      if (currentPrice > ema20) bullishScore += 1;
      if (currentPrice < ema20) bearishScore += 1;
    }
    if (ema20 !== null && ema50 !== null) {
      if (ema20 > ema50) bullishScore += 1;
      if (ema20 < ema50) bearishScore += 1;
    }
    if (trend.includes('uptrend')) bullishScore += 1;
    if (trend.includes('downtrend')) bearishScore += 1;
    if (structure === 'bullish') bullishScore += 1;
    if (structure === 'bearish') bearishScore += 1;
    if (signal.includes('buy')) bullishScore += 1;
    if (signal.includes('sell')) bearishScore += 1;
    if (volume.includes('falling') || volume.includes('decreasing')) {
      bullishScore -= 1;
      bearishScore -= 1;
    }

    if (bullishScore >= 2 && bullishScore > bearishScore && (rsi === null || rsi < 70)) {
      return 'Long';
    }
    if (bearishScore >= 2 && bearishScore > bullishScore && (rsi === null || rsi > 30)) {
      return 'Short';
    }
    return 'Wait';
  };

  // Convert return volatility into a small price buffer for zones and stops.
  const getVolatilityBuffer = (volatility, riskAssessment) => {
    const value = toFiniteNumber(volatility);
    const riskLevel = getRiskLevel(riskAssessment);
    let buffer = value === null ? 0.015 : clamp((value / 100) * 1.25, 0.005, 0.03);
    if (riskLevel === 'high') buffer = clamp(buffer * 1.25, 0.005, 0.04);
    return buffer;
  };

  const getLevel = (levels, key, predicate) => {
    const level = toFiniteNumber(levels?.[key]);
    return level !== null && level > 0 && predicate(level) ? level : null;
  };

  const getLongEntry = (currentPrice, ema20, levels, buffer) => {
    const primarySupport = getLevel(levels, 'primarySupport', (level) => level < currentPrice);
    const supportIsNearby = primarySupport !== null
      && ((currentPrice - primarySupport) / currentPrice) <= 0.15;
    const emaIsNearby = ema20 !== null && ema20 < currentPrice
      && ((currentPrice - ema20) / currentPrice) <= 0.1;

    const center = supportIsNearby
      ? primarySupport
      : emaIsNearby ? ema20 : currentPrice * (1 - (buffer * 0.5));
    const source = supportIsNearby
      ? 'primary support'
      : emaIsNearby ? 'the EMA 20' : 'a volatility-adjusted pullback';
    const low = Math.max(0, center * (1 - buffer));
    const high = Math.min(currentPrice, center * (1 + buffer));

    return {
      low,
      high: Math.max(low, high),
      source,
      primarySupport: supportIsNearby ? primarySupport : null,
    };
  };

  const getShortEntry = (currentPrice, ema20, levels, buffer) => {
    const primaryResistance = getLevel(levels, 'primaryResistance', (level) => level > currentPrice);
    const resistanceIsNearby = primaryResistance !== null
      && ((primaryResistance - currentPrice) / currentPrice) <= 0.15;
    const emaIsNearby = ema20 !== null && ema20 > currentPrice
      && ((ema20 - currentPrice) / currentPrice) <= 0.1;

    const center = resistanceIsNearby
      ? primaryResistance
      : emaIsNearby ? ema20 : currentPrice * (1 + (buffer * 0.5));
    const source = resistanceIsNearby
      ? 'primary resistance'
      : emaIsNearby ? 'the EMA 20' : 'a volatility-adjusted rebound';
    const low = Math.max(currentPrice, center * (1 - buffer));
    const high = center * (1 + buffer);

    return {
      low: Math.min(low, high),
      high,
      source,
      primaryResistance: resistanceIsNearby ? primaryResistance : null,
    };
  };

  const buildLongSetup = ({ currentPrice, ema20, levels, buffer }) => {
    const entryZone = getLongEntry(currentPrice, ema20, levels, buffer);
    const entryPrice = (entryZone.low + entryZone.high) / 2;
    const secondarySupport = getLevel(
      levels,
      'secondarySupport',
      (level) => level < entryZone.low && ((entryZone.low - level) / entryZone.low) <= 0.15,
    );
    const stopAnchor = secondarySupport ?? entryZone.primarySupport;
    const stopLoss = Math.max(0, Math.min(
      entryZone.low * (1 - buffer),
      stopAnchor !== null ? stopAnchor * (1 - (buffer * 1.5)) : entryZone.low * (1 - buffer),
    ));
    const risk = entryPrice - stopLoss;
    if (!Number.isFinite(risk) || risk <= 0) return null;

    const targets = [
      { value: getLevel(levels, 'primaryResistance', (level) => level > entryPrice), source: 'primary resistance' },
      { value: getLevel(levels, 'secondaryResistance', (level) => level > entryPrice), source: 'secondary resistance' },
    ].filter((target) => target.value !== null).sort((first, second) => first.value - second.value);
    const minimumTarget = entryPrice + (risk * 1.5);
    const selectedTarget = targets.find((target) => target.value >= minimumTarget)
      ?? targets[0]
      ?? { value: entryPrice + (risk * 2), source: 'a 2R projection' };
    const riskReward = (selectedTarget.value - entryPrice) / risk;

    return {
      entryZone,
      stopLoss,
      takeProfit: selectedTarget.value,
      riskReward,
      stopSource: secondarySupport !== null ? 'secondary support' : entryZone.primarySupport !== null ? 'primary support' : 'the entry zone',
      targetSource: selectedTarget.source,
    };
  };

  const buildShortSetup = ({ currentPrice, ema20, levels, buffer }) => {
    const entryZone = getShortEntry(currentPrice, ema20, levels, buffer);
    const entryPrice = (entryZone.low + entryZone.high) / 2;
    const secondaryResistance = getLevel(
      levels,
      'secondaryResistance',
      (level) => level > entryZone.high && ((level - entryZone.high) / entryZone.high) <= 0.15,
    );
    const stopAnchor = secondaryResistance ?? entryZone.primaryResistance;
    const stopLoss = Math.max(
      entryZone.high * (1 + buffer),
      stopAnchor !== null ? stopAnchor * (1 + (buffer * 1.5)) : entryZone.high * (1 + buffer),
    );
    const risk = stopLoss - entryPrice;
    if (!Number.isFinite(risk) || risk <= 0) return null;

    const targets = [
      { value: getLevel(levels, 'primarySupport', (level) => level < entryPrice), source: 'primary support' },
      { value: getLevel(levels, 'secondarySupport', (level) => level < entryPrice), source: 'secondary support' },
    ].filter((target) => target.value !== null).sort((first, second) => second.value - first.value);
    const minimumTarget = entryPrice - (risk * 1.5);
    const selectedTarget = targets.find((target) => target.value <= minimumTarget)
      ?? targets[0]
      ?? { value: Math.max(0, entryPrice - (risk * 2)), source: 'a 2R projection' };
    const riskReward = (entryPrice - selectedTarget.value) / risk;

    return {
      entryZone,
      stopLoss,
      takeProfit: selectedTarget.value,
      riskReward,
      stopSource: secondaryResistance !== null ? 'secondary resistance' : entryZone.primaryResistance !== null ? 'primary resistance' : 'the entry zone',
      targetSource: selectedTarget.source,
    };
  };

  const describeConfirmation = (inputs, bias) => {
    const details = [];
    const macdLine = toFiniteNumber(inputs.macd?.line);
    const macdSignal = toFiniteNumber(inputs.macd?.signal);
    const ema20 = toFiniteNumber(inputs.ema20);
    const ema50 = toFiniteNumber(inputs.ema50);
    const currentPrice = toFiniteNumber(inputs.currentPrice);
    const rsi = toFiniteNumber(inputs.rsi);
    const volume = getVolumeLabel(inputs.volumeTrend);

    if (macdLine !== null && macdSignal !== null) {
      details.push(bias === 'Long'
        ? (macdLine > macdSignal ? 'MACD is above its signal line' : 'MACD is recovering')
        : (macdLine < macdSignal ? 'MACD is below its signal line' : 'MACD is weakening'));
    }
    if (rsi !== null) {
      details.push(
        rsi >= 70 ? 'RSI is elevated at ' + rsi.toFixed(1)
          : rsi <= 30 ? 'RSI is oversold at ' + rsi.toFixed(1)
            : 'RSI is neutral at ' + rsi.toFixed(1),
      );
    }
    if (currentPrice !== null && ema20 !== null) {
      details.push(bias === 'Long'
        ? (currentPrice > ema20 ? 'price is above the EMA 20' : 'price is testing the EMA 20')
        : (currentPrice < ema20 ? 'price is below the EMA 20' : 'price is testing the EMA 20'));
    }
    if (ema20 !== null && ema50 !== null) {
      details.push(bias === 'Long'
        ? (ema20 > ema50 ? 'EMA 20 leads EMA 50' : 'the EMA crossover is still mixed')
        : (ema20 < ema50 ? 'EMA 20 is below EMA 50' : 'the EMA crossover is still mixed'));
    }
    if (volume.includes('rising') || volume.includes('increasing')) details.push('volume is increasing');
    if (volume.includes('falling') || volume.includes('decreasing')) details.push('volume is declining');

    return details.slice(0, 3).join(', ');
  };

  const createExplanation = (inputs, bias, setup, buffer) => {
    const confirmation = describeConfirmation(inputs, bias) || 'the available trend indicators';
    const riskLevel = getRiskLevel(inputs.riskAssessment);
    const riskNote = riskLevel === 'high'
      ? ' High market risk widens the volatility buffer, so position sizing should remain conservative.'
      : riskLevel === 'medium'
        ? ' Medium market risk supports a measured position size.'
        : '';

    return 'The ' + bias.toLowerCase() + ' bias is supported by ' + confirmation + '. '
      + 'The entry zone is anchored to ' + setup.entryZone.source + ', while the stop sits beyond '
      + setup.stopSource + ' with a ' + (buffer * 100).toFixed(1) + '% volatility buffer. '
      + 'Take profit targets ' + setup.targetSource + ' for an estimated 1:'
      + setup.riskReward.toFixed(2) + ' risk/reward ratio.' + riskNote;
  };

  /**
   * Produce a transparent trade idea from the supplied existing indicators.
   *
   * @param {Object} inputs
   * @param {number} inputs.currentPrice
   * @param {number} inputs.rsi
   * @param {{line?: number, signal?: number}} inputs.macd
   * @param {number} inputs.ema20
   * @param {number} inputs.ema50
   * @param {Object|string} inputs.volumeTrend
   * @param {{primarySupport?: number, secondarySupport?: number, primaryResistance?: number, secondaryResistance?: number}} inputs.supportResistance
   * @param {number} inputs.volatility
   * @param {{level?: string}} inputs.riskAssessment
   * @param {{signal?: string, confidence?: number}} inputs.signalAnalysis
   * @returns {{bias: 'Long'|'Short'|'Wait', entryZone: {low: number, high: number}|null, stopLoss: number|null, takeProfit: number|null, riskReward: number|null, explanation: string}}
   */
  const generateAiTradeSetup = (inputs = {}) => {
    const currentPrice = toFiniteNumber(inputs.currentPrice);
    const bias = getDirectionalBias(inputs);
    if (currentPrice === null || currentPrice <= 0) {
      return {
        bias: 'Wait',
        entryZone: null,
        stopLoss: null,
        takeProfit: null,
        riskReward: null,
        explanation: 'A current price is required before a rule-based trade setup can be calculated.',
      };
    }
    if (bias === 'Wait') {
      return {
        bias,
        entryZone: null,
        stopLoss: null,
        takeProfit: null,
        riskReward: null,
        explanation: 'The current RSI, MACD, moving-average, volume, and trend signals are not aligned enough to suggest a trade. Wait for clearer bullish or bearish confirmation.',
      };
    }

    const buffer = getVolatilityBuffer(inputs.volatility, inputs.riskAssessment);
    const ema20 = toFiniteNumber(inputs.ema20);
    const levels = inputs.supportResistance ?? {};
    const setup = bias === 'Long'
      ? buildLongSetup({ currentPrice, ema20, levels, buffer })
      : buildShortSetup({ currentPrice, ema20, levels, buffer });

    if (!setup || !Number.isFinite(setup.riskReward) || setup.riskReward <= 0) {
      return {
        bias: 'Wait',
        entryZone: null,
        stopLoss: null,
        takeProfit: null,
        riskReward: null,
        explanation: 'The detected support and resistance levels do not currently provide a valid risk-managed setup. Wait for a clearer price structure.',
      };
    }

    return {
      bias,
      entryZone: setup.entryZone,
      stopLoss: setup.stopLoss,
      takeProfit: setup.takeProfit,
      riskReward: setup.riskReward,
      explanation: createExplanation(inputs, bias, setup, buffer),
    };
  };

  window.generateAiTradeSetup = generateAiTradeSetup;
})();
