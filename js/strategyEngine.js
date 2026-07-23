/*
 * Reusable, rule-based strategy engine for the Coin Details page.
 * Strategies receive already-calculated market data only; this module never
 * makes network requests and can be extended through registerStrategy().
 */
(function () {
  const strategies = [];

  const toFiniteNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  };

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);

  const getVolumeLabel = (volumeTrend) => String(volumeTrend?.label ?? volumeTrend ?? '').toLowerCase();

  const getTrendLabel = (priceTrend) => String(priceTrend ?? '').toLowerCase();

  const getStructureLabel = (marketStructure) => String(marketStructure ?? '').toLowerCase();

  const getMacdState = (macd = {}) => {
    const line = toFiniteNumber(macd.line);
    const signal = toFiniteNumber(macd.signal);
    const previousLine = toFiniteNumber(macd.previousLine);
    const previousSignal = toFiniteNumber(macd.previousSignal);
    const difference = line !== null && signal !== null ? line - signal : null;
    const previousDifference = previousLine !== null && previousSignal !== null
      ? previousLine - previousSignal
      : null;

    return {
      available: difference !== null,
      bullish: difference !== null && difference > 0,
      bearish: difference !== null && difference < 0,
      improving: difference !== null && previousDifference !== null && difference > previousDifference,
      weakening: difference !== null && previousDifference !== null && difference < previousDifference,
    };
  };

  const getPriorRange = (inputs, lookback = 20) => {
    const configuredHigh = toFiniteNumber(inputs.breakoutHigh);
    const configuredLow = toFiniteNumber(inputs.breakoutLow);
    if (configuredHigh !== null && configuredLow !== null) {
      return { high: configuredHigh, low: configuredLow };
    }

    const prices = Array.isArray(inputs.prices)
      ? inputs.prices.map(toFiniteNumber).filter((price) => price !== null)
      : [];
    if (prices.length < lookback + 1) return null;

    const priorPrices = prices.slice(-(lookback + 1), -1);
    return {
      high: Math.max(...priorPrices),
      low: Math.min(...priorPrices),
    };
  };

  const getRecentPriceChange = (inputs) => {
    const configuredChange = toFiniteNumber(inputs.recentPriceChange);
    if (configuredChange !== null) return configuredChange;

    const prices = Array.isArray(inputs.prices)
      ? inputs.prices.map(toFiniteNumber).filter((price) => price !== null)
      : [];
    if (prices.length < 3) return null;

    const lookback = Math.max(2, Math.floor(prices.length * 0.2));
    const currentPrice = prices.at(-1);
    const comparisonPrice = prices.at(-1 - lookback);
    if (!Number.isFinite(currentPrice) || !Number.isFinite(comparisonPrice) || comparisonPrice === 0) {
      return null;
    }

    return ((currentPrice - comparisonPrice) / comparisonPrice) * 100;
  };

  const calculateConfidence = (factors) => Math.round(factors.reduce(
    (total, factor) => total + (factor.met ? factor.weight : 0),
    0,
  ));

  const createUnavailableResult = (reasoning) => ({
    active: false,
    confidence: 0,
    reasoning,
  });

  const isNearLevel = (price, level, threshold = 0.03) => (
    price !== null
    && level !== null
    && Math.abs(price - level) / price <= threshold
  );

  const evaluateTrendFollowing = (inputs) => {
    const currentPrice = toFiniteNumber(inputs.currentPrice);
    const ema20 = toFiniteNumber(inputs.ema20);
    const ema50 = toFiniteNumber(inputs.ema50);
    const macd = getMacdState(inputs.macd);
    if (currentPrice === null || ema20 === null || ema50 === null || !macd.available) {
      return createUnavailableResult(
        'Trend Following is inactive because price, EMA 20/50, and MACD confirmation are required.',
      );
    }

    const trend = getTrendLabel(inputs.priceTrend);
    const structure = getStructureLabel(inputs.marketStructure);
    const volumeRising = getVolumeLabel(inputs.volumeTrend).includes('rising');
    const bullish = {
      direction: 'Bullish',
      trend: trend.includes('uptrend') || structure === 'bullish',
      emaAlignment: ema20 > ema50,
      pricePlacement: currentPrice > ema20 && currentPrice > ema50,
      macdConfirmation: macd.bullish,
      volumeConfirmation: volumeRising,
    };
    const bearish = {
      direction: 'Bearish',
      trend: trend.includes('downtrend') || structure === 'bearish',
      emaAlignment: ema20 < ema50,
      pricePlacement: currentPrice < ema20 && currentPrice < ema50,
      macdConfirmation: macd.bearish,
      volumeConfirmation: volumeRising,
    };
    const score = (conditions) => calculateConfidence([
      { met: conditions.trend, weight: 25 },
      { met: conditions.emaAlignment, weight: 30 },
      { met: conditions.pricePlacement, weight: 20 },
      { met: conditions.macdConfirmation, weight: 15 },
      { met: conditions.volumeConfirmation, weight: 10 },
    ]);
    const selected = score(bullish) >= score(bearish) ? bullish : bearish;
    const confidence = score(selected);
    const active = selected.trend
      && selected.emaAlignment
      && selected.pricePlacement
      && selected.macdConfirmation;

    if (active) {
      return {
        active,
        confidence,
        reasoning: 'Active ' + selected.direction.toLowerCase()
          + ' trend: price and EMA 20/50 are aligned, with MACD confirmation'
          + (selected.volumeConfirmation ? ' and rising volume.' : '.'),
      };
    }

    const missing = [
      !selected.trend ? 'a confirmed price trend' : null,
      !selected.emaAlignment ? 'EMA 20/50 alignment' : null,
      !selected.pricePlacement ? 'price placement above/below both EMAs' : null,
      !selected.macdConfirmation ? 'MACD confirmation' : null,
    ].filter(Boolean);
    return {
      active: false,
      confidence,
      reasoning: 'Inactive: ' + (missing.length
        ? 'waiting for ' + missing.slice(0, 2).join(' and ') + '.'
        : 'trend conditions are not fully aligned.'),
    };
  };

  const evaluateBreakout = (inputs) => {
    const currentPrice = toFiniteNumber(inputs.currentPrice);
    const range = getPriorRange(inputs);
    const macd = getMacdState(inputs.macd);
    if (currentPrice === null || !range) {
      return createUnavailableResult(
        'Breakout is inactive because at least 21 historical price points are required to establish the prior range.',
      );
    }

    const threshold = 0.002;
    const volumeRising = getVolumeLabel(inputs.volumeTrend).includes('rising');
    const trend = getTrendLabel(inputs.priceTrend);
    const structure = getStructureLabel(inputs.marketStructure);
    const bullish = {
      direction: 'Bullish',
      breakout: currentPrice > range.high * (1 + threshold),
      volumeConfirmation: volumeRising,
      macdConfirmation: macd.bullish,
      trendConfirmation: trend.includes('uptrend') || structure === 'bullish',
    };
    const bearish = {
      direction: 'Bearish',
      breakout: currentPrice < range.low * (1 - threshold),
      volumeConfirmation: volumeRising,
      macdConfirmation: macd.bearish,
      trendConfirmation: trend.includes('downtrend') || structure === 'bearish',
    };
    const score = (conditions) => calculateConfidence([
      { met: conditions.breakout, weight: 45 },
      { met: conditions.volumeConfirmation, weight: 25 },
      { met: conditions.macdConfirmation, weight: 20 },
      { met: conditions.trendConfirmation, weight: 10 },
    ]);
    const selected = score(bullish) >= score(bearish) ? bullish : bearish;
    const confidence = score(selected);
    const active = selected.breakout && selected.volumeConfirmation && selected.macdConfirmation;

    if (active) {
      return {
        active,
        confidence,
        reasoning: 'Active ' + selected.direction.toLowerCase()
          + ' breakout: price has moved beyond the prior 20-point range with MACD and rising-volume confirmation.',
      };
    }

    if (!bullish.breakout && !bearish.breakout) {
      return {
        active: false,
        confidence,
        reasoning: 'Inactive: price remains inside the prior 20-point range; a confirmed range break is required.',
      };
    }

    const missing = [
      !selected.volumeConfirmation ? 'rising volume' : null,
      !selected.macdConfirmation ? 'MACD confirmation' : null,
    ].filter(Boolean);
    return {
      active: false,
      confidence,
      reasoning: 'Inactive: a ' + selected.direction.toLowerCase()
        + ' range break is present, but it still needs ' + missing.join(' and ') + '.',
    };
  };

  const evaluateMeanReversion = (inputs) => {
    const currentPrice = toFiniteNumber(inputs.currentPrice);
    const rsi = toFiniteNumber(inputs.rsi);
    if (currentPrice === null || rsi === null) {
      return createUnavailableResult(
        'Mean Reversion is inactive because current price and RSI data are required.',
      );
    }

    const levels = inputs.supportResistance ?? {};
    const support = toFiniteNumber(levels.primarySupport);
    const resistance = toFiniteNumber(levels.primaryResistance);
    const lowerBand = toFiniteNumber(inputs.bollingerBands?.lower);
    const upperBand = toFiniteNumber(inputs.bollingerBands?.upper);
    const macd = getMacdState(inputs.macd);
    const nearSupport = isNearLevel(currentPrice, support)
      || (lowerBand !== null && currentPrice <= lowerBand * 1.01);
    const nearResistance = isNearLevel(currentPrice, resistance)
      || (upperBand !== null && currentPrice >= upperBand * 0.99);
    const bullish = {
      direction: 'Bullish',
      rsiExtreme: rsi <= 30,
      location: nearSupport,
      reversal: macd.bullish || macd.improving,
    };
    const bearish = {
      direction: 'Bearish',
      rsiExtreme: rsi >= 70,
      location: nearResistance,
      reversal: macd.bearish || macd.weakening,
    };
    const score = (conditions) => calculateConfidence([
      { met: conditions.rsiExtreme, weight: 40 },
      { met: conditions.location, weight: 35 },
      { met: conditions.reversal, weight: 25 },
    ]);
    const selected = score(bullish) >= score(bearish) ? bullish : bearish;
    const confidence = score(selected);
    const active = selected.rsiExtreme && (selected.location || selected.reversal);

    if (active) {
      const location = selected.location
        ? 'price is near a support/resistance or Bollinger Band level'
        : 'MACD is beginning to reverse';
      return {
        active,
        confidence,
        reasoning: 'Active ' + selected.direction.toLowerCase()
          + ' mean-reversion setup: RSI is at an extreme and ' + location + '.',
      };
    }

    return {
      active: false,
      confidence,
      reasoning: 'Inactive: RSI is not at a confirmed reversal extreme with supporting location or MACD reversal evidence.',
    };
  };

  const evaluateMomentum = (inputs) => {
    const currentPrice = toFiniteNumber(inputs.currentPrice);
    const rsi = toFiniteNumber(inputs.rsi);
    const ema20 = toFiniteNumber(inputs.ema20);
    const ema50 = toFiniteNumber(inputs.ema50);
    const priceChange = getRecentPriceChange(inputs);
    const macd = getMacdState(inputs.macd);
    if (currentPrice === null || rsi === null || priceChange === null || !macd.available) {
      return createUnavailableResult(
        'Momentum is inactive because price history, RSI, and MACD data are required.',
      );
    }

    const volumeRising = getVolumeLabel(inputs.volumeTrend).includes('rising');
    const bullish = {
      direction: 'Bullish',
      macdConfirmation: macd.bullish,
      rsiConfirmation: rsi >= 55 && rsi < 70,
      priceMomentum: priceChange >= 2,
      emaConfirmation: ema20 !== null && currentPrice > ema20 && (ema50 === null || ema20 > ema50),
      volumeConfirmation: volumeRising,
    };
    const bearish = {
      direction: 'Bearish',
      macdConfirmation: macd.bearish,
      rsiConfirmation: rsi > 30 && rsi <= 45,
      priceMomentum: priceChange <= -2,
      emaConfirmation: ema20 !== null && currentPrice < ema20 && (ema50 === null || ema20 < ema50),
      volumeConfirmation: volumeRising,
    };
    const score = (conditions) => calculateConfidence([
      { met: conditions.macdConfirmation, weight: 30 },
      { met: conditions.rsiConfirmation, weight: 20 },
      { met: conditions.priceMomentum, weight: 20 },
      { met: conditions.emaConfirmation, weight: 15 },
      { met: conditions.volumeConfirmation, weight: 15 },
    ]);
    const selected = score(bullish) >= score(bearish) ? bullish : bearish;
    const confidence = score(selected);
    const additionalConfirmations = [
      selected.rsiConfirmation,
      selected.emaConfirmation,
      selected.volumeConfirmation,
    ].filter(Boolean).length;
    const active = selected.macdConfirmation && selected.priceMomentum && additionalConfirmations >= 2;

    if (active) {
      return {
        active,
        confidence,
        reasoning: 'Active ' + selected.direction.toLowerCase()
          + ' momentum: price change, MACD, and at least two supporting RSI, EMA, or volume conditions agree.',
      };
    }

    return {
      active: false,
      confidence,
      reasoning: 'Inactive: waiting for MACD, recent price momentum, and supporting RSI, EMA, or volume alignment.',
    };
  };

  const registerStrategy = (strategy) => {
    if (!strategy || typeof strategy.id !== 'string' || typeof strategy.name !== 'string'
      || typeof strategy.evaluate !== 'function') {
      throw new TypeError('A strategy requires an id, name, and evaluate function.');
    }
    if (strategies.some((registeredStrategy) => registeredStrategy.id === strategy.id)) {
      throw new Error('A strategy with id "' + strategy.id + '" is already registered.');
    }
    strategies.push(Object.freeze({
      id: strategy.id,
      name: strategy.name,
      evaluate: strategy.evaluate,
    }));
  };

  const normalizeResult = (strategy, result) => ({
    id: strategy.id,
    name: strategy.name,
    status: result?.active ? 'Active' : 'Inactive',
    active: Boolean(result?.active),
    confidence: clamp(Math.round(toFiniteNumber(result?.confidence) ?? 0), 0, 100),
    reasoning: typeof result?.reasoning === 'string'
      ? result.reasoning
      : 'No strategy reasoning is available.',
  });

  const evaluateStrategies = (inputs = {}) => strategies.map((strategy) => {
    try {
      return normalizeResult(strategy, strategy.evaluate(inputs));
    } catch (error) {
      return normalizeResult(strategy, createUnavailableResult(
        'This strategy could not evaluate the available market data.',
      ));
    }
  });

  registerStrategy({ id: 'trend-following', name: 'Trend Following', evaluate: evaluateTrendFollowing });
  registerStrategy({ id: 'breakout', name: 'Breakout', evaluate: evaluateBreakout });
  registerStrategy({ id: 'mean-reversion', name: 'Mean Reversion', evaluate: evaluateMeanReversion });
  registerStrategy({ id: 'momentum', name: 'Momentum', evaluate: evaluateMomentum });

  window.strategyEngine = {
    evaluate: evaluateStrategies,
    registerStrategy,
    getStrategies: () => strategies.map(({ id, name }) => ({ id, name })),
  };
})();
