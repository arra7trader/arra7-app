import { Candle } from './market-data';

export type SmcKanjiDirection = 'BUY' | 'SELL';
export type SmcKanjiZoneKind =
  | 'DEMAND'
  | 'SUPPLY'
  | 'FVG_DEMAND'
  | 'FVG_SUPPLY'
  | 'KANJI_ENTRY'
  | 'KANJI_SCALP'
  | 'KANJI_PULLBACK'
  | 'KANJI_ENTRY_2'
  | 'KANJI_PULLBACK_2'
  | 'KANJI_ENTRY_3';

export type SmcKanjiZone = {
  kind: SmcKanjiZoneKind;
  direction: 1 | -1;
  top: number;
  bottom: number;
  leftIndex: number;
  rightIndex: number;
  touched?: boolean;
  label: string;
};

export type SmcKanjiStructureEvent = {
  type: 'BOS' | 'CHOCH';
  direction: 1 | -1;
  price: number;
  index: number;
};

export type SmcKanjiSignal = {
  direction: SmcKanjiDirection;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  executionType: 'INSTANT';
  orderType: 'BUY NOW' | 'SELL NOW';
  source: 'SMC_ZONE_RETEST' | 'FVG_RETEST' | 'BOS_BREAK';
  zone: SmcKanjiZone;
  rr: number;
  confidence: number;
};

export type SmcKanjiAnalysis = {
  signal: SmcKanjiSignal | null;
  latestStructure: SmcKanjiStructureEvent | null;
  activeZones: SmcKanjiZone[];
  fibZones: SmcKanjiZone[];
  fvgZones: SmcKanjiZone[];
  fibStart: number | null;
  fibEnd: number | null;
  fibDir: 1 | -1 | 0;
  fibLevels: Record<string, number>;
  eofOk: boolean;
  eofScore: number;
  kanjiOk: boolean;
  reason: string;
};

type EngineOptions = {
  swingLen: number;
  internalLen: number;
  breakByClose: boolean;
  minBodyAtr: number;
  minBreakAtr: number;
  minGapBars: number;
  obLookback: number;
  zoneExtend: number;
  zoneUseWick: boolean;
  maxZones: number;
  minZoneAtr: number;
  oneSignalPerZone: boolean;
  requireSignalCandle: boolean;
  showFVG: boolean;
  showFVGSignals: boolean;
  fvgExtend: number;
  fvgMinAtr: number;
  maxFvgBoxes: number;
  showKanjiFib: boolean;
  fibUseMusangAnchor: boolean;
  fibExtendBars: number;
  fibOnlyLatest: boolean;
  fibAutoReset: boolean;
  fibResetAtr: number;
  fibRequireZoneConfluence: boolean;
  fibConfluenceAtr: number;
  showEofTiming: boolean;
  filterSignalsByEof: boolean;
  eofMinScore: number;
  eofUseMoon: boolean;
  eofUseQuarterMoon: boolean;
  eofMoonWindowHours: number;
  eofUseFibTime: boolean;
  eofFibWindowBars: number;
  rr: number;
  confirmedOnly: boolean;
  showBreakSignals: boolean;
  showRetestSignals: boolean;
};

const DEFAULT_OPTIONS: EngineOptions = {
  swingLen: 9,
  internalLen: 4,
  breakByClose: true,
  minBodyAtr: 0.35,
  minBreakAtr: 0.08,
  minGapBars: 8,
  obLookback: 30,
  zoneExtend: 42,
  zoneUseWick: true,
  maxZones: 10,
  minZoneAtr: 0.05,
  oneSignalPerZone: true,
  requireSignalCandle: true,
  showFVG: true,
  showFVGSignals: false,
  fvgExtend: 36,
  fvgMinAtr: 0.12,
  maxFvgBoxes: 16,
  showKanjiFib: true,
  fibUseMusangAnchor: true,
  fibExtendBars: 56,
  fibOnlyLatest: true,
  fibAutoReset: true,
  fibResetAtr: 0.15,
  fibRequireZoneConfluence: true,
  fibConfluenceAtr: 0.12,
  showEofTiming: true,
  filterSignalsByEof: true,
  eofMinScore: 1,
  eofUseMoon: true,
  eofUseQuarterMoon: false,
  eofMoonWindowHours: 36,
  eofUseFibTime: true,
  eofFibWindowBars: 3,
  rr: 5,
  confirmedOnly: true,
  showBreakSignals: false,
  showRetestSignals: true,
};

const MOON_CYCLE_DAYS = 29.530588853;
const HOUR_MS = 60 * 60 * 1000;
const MOON_CYCLE_MS = MOON_CYCLE_DAYS * 24 * HOUR_MS;
const MOON_REF_TIME = 947182440000;

function isFinitePrice(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function trueRange(candle: Candle, prevClose?: number) {
  if (!isFinitePrice(prevClose)) return candle.high - candle.low;
  return Math.max(candle.high - candle.low, Math.abs(candle.high - prevClose), Math.abs(candle.low - prevClose));
}

function calculateAtr(candles: Candle[], index: number, length = 14) {
  const start = Math.max(0, index - length + 1);
  const ranges: number[] = [];
  for (let i = start; i <= index; i += 1) {
    ranges.push(trueRange(candles[i], i > 0 ? candles[i - 1].close : undefined));
  }
  if (ranges.length === 0) return 0;
  return ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
}

function pivotHigh(candles: Candle[], index: number, len: number) {
  const pivotIndex = index - len;
  if (pivotIndex < len || index >= candles.length) return null;
  const value = candles[pivotIndex].high;
  for (let i = pivotIndex - len; i <= pivotIndex + len; i += 1) {
    if (i === pivotIndex) continue;
    if (candles[i]?.high >= value) return null;
  }
  return { value, index: pivotIndex };
}

function pivotLow(candles: Candle[], index: number, len: number) {
  const pivotIndex = index - len;
  if (pivotIndex < len || index >= candles.length) return null;
  const value = candles[pivotIndex].low;
  for (let i = pivotIndex - len; i <= pivotIndex + len; i += 1) {
    if (i === pivotIndex) continue;
    if (candles[i]?.low <= value) return null;
  }
  return { value, index: pivotIndex };
}

function candleTimeMs(candle: Candle) {
  const parsed = new Date(candle.time).getTime();
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function moonPhaseNear(timeMs: number, phaseDays: number, options: EngineOptions) {
  const rawAge = timeMs - MOON_REF_TIME;
  const cycleCount = Math.floor(rawAge / MOON_CYCLE_MS);
  const ageMsRaw = rawAge - cycleCount * MOON_CYCLE_MS;
  const ageMs = ageMsRaw < 0 ? ageMsRaw + MOON_CYCLE_MS : ageMsRaw;
  const ageDays = ageMs / (24 * HOUR_MS);
  const dist = Math.abs(ageDays - phaseDays);
  return Math.min(dist, MOON_CYCLE_DAYS - dist) <= options.eofMoonWindowHours / 24;
}

function fibPrice(start: number, end: number, ratio: number) {
  return start + (end - start) * ratio;
}

function makeFibZone(
  start: number,
  end: number,
  dir: 1 | -1,
  endBar: number,
  currentIndex: number,
  r1: number,
  r2: number,
  kind: SmcKanjiZoneKind,
  label: string,
  extend: number
): SmcKanjiZone {
  const p1 = fibPrice(start, end, r1);
  const p2 = fibPrice(start, end, r2);
  return {
    kind,
    direction: dir,
    top: Math.max(p1, p2),
    bottom: Math.min(p1, p2),
    leftIndex: endBar,
    rightIndex: currentIndex + extend,
    label,
  };
}

function createFibZones(start: number, end: number, dir: 1 | -1, endBar: number, currentIndex: number, options: EngineOptions) {
  return [
    makeFibZone(start, end, dir, endBar, currentIndex, 0.559, 0.667, 'KANJI_ENTRY', 'Kanji Entry', options.fibExtendBars),
    makeFibZone(start, end, dir, endBar, currentIndex, 0.786, 0.882, 'KANJI_SCALP', 'Kanji Scalp', options.fibExtendBars),
    makeFibZone(start, end, dir, endBar, currentIndex, 1.124, 1.272, 'KANJI_PULLBACK', 'Kanji Pullback', options.fibExtendBars),
    makeFibZone(start, end, dir, endBar, currentIndex, 1.559, 1.667, 'KANJI_ENTRY_2', 'Kanji Entry 2', options.fibExtendBars),
    makeFibZone(start, end, dir, endBar, currentIndex, 2.124, 2.272, 'KANJI_PULLBACK_2', 'Kanji Pullback 2', options.fibExtendBars),
    makeFibZone(start, end, dir, endBar, currentIndex, 2.559, 2.667, 'KANJI_ENTRY_3', 'Kanji Entry 3', options.fibExtendBars),
  ];
}

function calculateFibLevels(start: number | null, end: number | null) {
  if (!isFinitePrice(start) || !isFinitePrice(end)) return {};
  const levels = [0, 0.559, 0.619, 0.667, 0.786, 0.882, 1, 1.124, 1.272, 1.559, 1.618, 1.667, 2, 2.124, 2.272, 2.559, 2.618, 2.667, 3];
  return Object.fromEntries(levels.map((level) => [String(level), fibPrice(start, end, level)]));
}

export function analyzeSmcKanji(candlesInput: Candle[], overrides: Partial<EngineOptions> = {}): SmcKanjiAnalysis {
  const options = { ...DEFAULT_OPTIONS, ...overrides };
  const candles = candlesInput.filter((c) => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0);
  if (candles.length < Math.max(options.swingLen * 2 + 5, 40)) {
    return {
      signal: null,
      latestStructure: null,
      activeZones: [],
      fibZones: [],
      fvgZones: [],
      fibStart: null,
      fibEnd: null,
      fibDir: 0,
      fibLevels: {},
      eofOk: false,
      eofScore: 0,
      kanjiOk: false,
      reason: `Minimal perlu ${Math.max(options.swingLen * 2 + 5, 40)} candle untuk SMC Kanji, tersedia ${candles.length}.`,
    };
  }

  let lastHigh: number | null = null;
  let lastHighBar: number | null = null;
  let highBroken = false;
  let lastLow: number | null = null;
  let lastLowBar: number | null = null;
  let lowBroken = false;
  let trend = 0;
  let lastStructBar: number | null = null;

  let fibStart: number | null = null;
  let fibEnd: number | null = null;
  let fibStartBar: number | null = null;
  let fibEndBar: number | null = null;
  let fibDir: 1 | -1 | 0 = 0;
  let fibZones: SmcKanjiZone[] = [];
  let latestStructure: SmcKanjiStructureEvent | null = null;
  let latestSignal: SmcKanjiSignal | null = null;
  let latestEofScore = 0;
  let latestEofOk = false;
  let latestKanjiOk = false;
  let latestReason = 'Belum ada retest SMC Kanji valid pada candle terakhir.';

  const zones: SmcKanjiZone[] = [];
  const fvgZones: SmcKanjiZone[] = [];

  const resetFib = () => {
    fibStart = null;
    fibEnd = null;
    fibStartBar = null;
    fibEndBar = null;
    fibDir = 0;
    fibZones = [];
  };

  const currentFibPrice = (ratio: number) => {
    if (!isFinitePrice(fibStart) || !isFinitePrice(fibEnd)) return null;
    return fibPrice(fibStart, fibEnd, ratio);
  };

  const kanjiEntryConfluence = (candle: Candle, atr: number) => {
    if (!options.showKanjiFib || fibDir === 0 || !isFinitePrice(fibStart) || !isFinitePrice(fibEnd)) return false;
    const tol = atr * options.fibConfluenceAtr;
    const zonesToCheck = [
      [0.559, 0.667],
      [1.559, 1.667],
      [2.559, 2.667],
    ];
    return zonesToCheck.some(([a, b]) => {
      const p1 = currentFibPrice(a);
      const p2 = currentFibPrice(b);
      if (!isFinitePrice(p1) || !isFinitePrice(p2)) return false;
      const top = Math.max(p1, p2) + tol;
      const bottom = Math.min(p1, p2) - tol;
      return candle.low <= top && candle.high >= bottom;
    });
  };

  const eofState = (index: number, atr: number) => {
    const candle = candles[index];
    const timeMs = candleTimeMs(candle);
    const moonNewWindow = options.eofUseMoon && moonPhaseNear(timeMs, 0, options);
    const moonFullWindow = options.eofUseMoon && moonPhaseNear(timeMs, MOON_CYCLE_DAYS / 2, options);
    const moonQuarterWindow = options.eofUseMoon && options.eofUseQuarterMoon && (moonPhaseNear(timeMs, MOON_CYCLE_DAYS / 4, options) || moonPhaseNear(timeMs, (MOON_CYCLE_DAYS * 3) / 4, options));
    const moonTurnWindow = moonNewWindow || moonFullWindow || moonQuarterWindow;
    const swingBars = fibStartBar != null && fibEndBar != null ? Math.abs(fibEndBar - fibStartBar) : null;
    const fibTimeWindow = options.eofUseFibTime && swingBars != null && swingBars > 0 && [0.618, 1, 1.618, 2.618].some((ratio) => Math.abs(index - Math.round(fibEndBar! + swingBars * ratio)) <= options.eofFibWindowBars);
    const score = (moonTurnWindow ? 1 : 0) + (fibTimeWindow ? 1 : 0);
    const timingWindow = options.showEofTiming && score >= options.eofMinScore;
    const ok = !options.filterSignalsByEof || !options.showEofTiming || timingWindow;
    if (!Number.isFinite(atr)) return { ok, score };
    return { ok, score };
  };

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    const atr = calculateAtr(candles, index, 14);
    const body = Math.abs(candle.close - candle.open);
    const ph = pivotHigh(candles, index, options.swingLen);
    const pl = pivotLow(candles, index, options.swingLen);

    if (ph) {
      lastHigh = ph.value;
      lastHighBar = ph.index;
      highBroken = false;
    }

    if (pl) {
      lastLow = pl.value;
      lastLowBar = pl.index;
      lowBroken = false;
    }

    const breakUp = options.breakByClose ? candle.close : candle.high;
    const breakDown = options.breakByClose ? candle.close : candle.low;
    const gapOk = lastStructBar == null || index - lastStructBar >= options.minGapBars;
    const bodyOk = atr > 0 ? body >= atr * options.minBodyAtr : true;
    const breakUpOk = isFinitePrice(lastHigh) && breakUp > lastHigh + atr * options.minBreakAtr;
    const breakDownOk = isFinitePrice(lastLow) && breakDown < lastLow - atr * options.minBreakAtr;
    const bullBos = gapOk && bodyOk && !highBroken && !!breakUpOk;
    const bearBos = gapOk && bodyOk && !lowBroken && !!breakDownOk;

    if (bullBos) {
      highBroken = true;
      lastStructBar = index;
      const eventType: 'BOS' | 'CHOCH' = trend < 0 ? 'CHOCH' : 'BOS';
      trend = 1;
      latestStructure = { type: eventType, direction: 1, price: lastHigh!, index };

      if (options.showKanjiFib && isFinitePrice(lastLow) && isFinitePrice(lastHigh) && lastLowBar != null && lastHighBar != null) {
        if (options.fibOnlyLatest) resetFib();
        fibStart = lastLow;
        fibEnd = options.fibUseMusangAnchor ? lastHigh : breakUp;
        fibStartBar = lastLowBar;
        fibEndBar = options.fibUseMusangAnchor ? lastHighBar : index;
        fibDir = 1;
        fibZones = createFibZones(fibStart, fibEnd, fibDir, fibEndBar, index, options);
      }

      let found: number | null = null;
      for (let i = 1; i <= options.obLookback && index - i >= 0; i += 1) {
        const c = candles[index - i];
        if (c.close < c.open) {
          found = i;
          break;
        }
      }
      if (found != null) {
        const c = candles[index - found];
        let top = Math.max(c.open, c.close);
        let bottom = options.zoneUseWick ? c.low : Math.min(c.open, c.close);
        const mid = (top + bottom) / 2;
        const minHeight = atr * options.minZoneAtr;
        if (top - bottom < minHeight) {
          top = mid + minHeight / 2;
          bottom = mid - minHeight / 2;
        }
        zones.push({ kind: 'DEMAND', direction: 1, top, bottom, leftIndex: index - found, rightIndex: index + options.zoneExtend, touched: false, label: 'Demand Zone' });
        while (zones.length > options.maxZones) zones.shift();
      }
    }

    if (bearBos) {
      lowBroken = true;
      lastStructBar = index;
      const eventType: 'BOS' | 'CHOCH' = trend > 0 ? 'CHOCH' : 'BOS';
      trend = -1;
      latestStructure = { type: eventType, direction: -1, price: lastLow!, index };

      if (options.showKanjiFib && isFinitePrice(lastHigh) && isFinitePrice(lastLow) && lastHighBar != null && lastLowBar != null) {
        if (options.fibOnlyLatest) resetFib();
        fibStart = lastHigh;
        fibEnd = options.fibUseMusangAnchor ? lastLow : breakDown;
        fibStartBar = lastHighBar;
        fibEndBar = options.fibUseMusangAnchor ? lastLowBar : index;
        fibDir = -1;
        fibZones = createFibZones(fibStart, fibEnd, fibDir, fibEndBar, index, options);
      }

      let found: number | null = null;
      for (let i = 1; i <= options.obLookback && index - i >= 0; i += 1) {
        const c = candles[index - i];
        if (c.close > c.open) {
          found = i;
          break;
        }
      }
      if (found != null) {
        const c = candles[index - found];
        let top = options.zoneUseWick ? c.high : Math.max(c.open, c.close);
        let bottom = Math.min(c.open, c.close);
        const mid = (top + bottom) / 2;
        const minHeight = atr * options.minZoneAtr;
        if (top - bottom < minHeight) {
          top = mid + minHeight / 2;
          bottom = mid - minHeight / 2;
        }
        zones.push({ kind: 'SUPPLY', direction: -1, top, bottom, leftIndex: index - found, rightIndex: index + options.zoneExtend, touched: false, label: 'Supply Zone' });
        while (zones.length > options.maxZones) zones.shift();
      }
    }

    const bullFvg = options.showFVG && bodyOk && index >= 2 && candle.low > candles[index - 2].high && candle.low - candles[index - 2].high >= atr * options.fvgMinAtr;
    const bearFvg = options.showFVG && bodyOk && index >= 2 && candle.high < candles[index - 2].low && candles[index - 2].low - candle.high >= atr * options.fvgMinAtr;
    if (bullFvg) {
      fvgZones.push({ kind: 'FVG_DEMAND', direction: 1, top: Math.max(candle.low, candles[index - 2].high), bottom: Math.min(candle.low, candles[index - 2].high), leftIndex: index - 2, rightIndex: index + options.fvgExtend, touched: false, label: 'FVG' });
      while (fvgZones.length > options.maxFvgBoxes) fvgZones.shift();
    }
    if (bearFvg) {
      fvgZones.push({ kind: 'FVG_SUPPLY', direction: -1, top: Math.max(candles[index - 2].low, candle.high), bottom: Math.min(candles[index - 2].low, candle.high), leftIndex: index - 2, rightIndex: index + options.fvgExtend, touched: false, label: 'FVG' });
      while (fvgZones.length > options.maxFvgBoxes) fvgZones.shift();
    }

    if (options.fibAutoReset && options.showKanjiFib && fibDir !== 0 && isFinitePrice(fibStart) && isFinitePrice(fibEnd)) {
      const buffer = atr * options.fibResetAtr;
      const fib3 = fibPrice(fibStart, fibEnd, 3);
      const far = fibDir === 1
        ? candle.close < fibStart - buffer || candle.close > fib3 + buffer
        : candle.close > fibStart + buffer || candle.close < fib3 - buffer;
      if (far) resetFib();
    }

    const kanjiOk = !options.fibRequireZoneConfluence || kanjiEntryConfluence(candle, atr);
    const eof = eofState(index, atr);
    latestKanjiOk = kanjiOk;
    latestEofOk = eof.ok;
    latestEofScore = eof.score;

    const canSignal = !options.confirmedOnly || index < candles.length;
    const buyConfirm = !options.requireSignalCandle || candle.close >= candle.open;
    const sellConfirm = !options.requireSignalCandle || candle.close <= candle.open;

    const tryCreateSignal = (direction: 1 | -1, zone: SmcKanjiZone, source: SmcKanjiSignal['source']) => {
      const entryPrice = candle.close;
      const stopLoss = direction === 1 ? zone.bottom : zone.top;
      const risk = direction === 1 ? entryPrice - stopLoss : stopLoss - entryPrice;
      if (!(risk > 0)) return null;
      const tp1 = direction === 1 ? entryPrice + risk * options.rr : entryPrice - risk * options.rr;
      const tp2 = direction === 1 ? entryPrice + risk * options.rr * 1.25 : entryPrice - risk * options.rr * 1.25;
      const tp3 = direction === 1 ? entryPrice + risk * options.rr * 1.5 : entryPrice - risk * options.rr * 1.5;
      const confidence = Math.max(62, Math.min(92, 68 + (kanjiOk ? 10 : 0) + (eof.ok ? 6 : 0) + (latestStructure?.type === 'CHOCH' ? 4 : 0) + (source === 'SMC_ZONE_RETEST' ? 4 : 0)));
      return {
        direction: direction === 1 ? 'BUY' : 'SELL',
        entryPrice,
        stopLoss,
        takeProfit1: tp1,
        takeProfit2: tp2,
        takeProfit3: tp3,
        executionType: 'INSTANT',
        orderType: direction === 1 ? 'BUY NOW' : 'SELL NOW',
        source,
        zone,
        rr: options.rr,
        confidence,
      } satisfies SmcKanjiSignal;
    };

    if (canSignal && options.showRetestSignals && kanjiOk && eof.ok) {
      for (const zone of zones) {
        if (options.oneSignalPerZone && zone.touched) continue;
        const priceInside = candle.low <= zone.top && candle.high >= zone.bottom;
        const dRetest = zone.direction === 1 && priceInside && candle.close > zone.bottom && buyConfirm;
        const sRetest = zone.direction === -1 && priceInside && candle.close < zone.top && sellConfirm;
        if (dRetest || sRetest) {
          const signal = tryCreateSignal(zone.direction, zone, 'SMC_ZONE_RETEST');
          if (signal) {
            latestSignal = signal;
            latestReason = `${zone.label} retest valid sesuai SMC Kanji.`;
            if (options.oneSignalPerZone) zone.touched = true;
            break;
          }
        }
      }
    }

    if (!latestSignal && canSignal && options.showFVGSignals && kanjiOk && eof.ok) {
      for (const zone of fvgZones) {
        if (options.oneSignalPerZone && zone.touched) continue;
        const inside = candle.low <= zone.top && candle.high >= zone.bottom;
        const fBuy = zone.direction === 1 && inside && candle.close > zone.bottom;
        const fSell = zone.direction === -1 && inside && candle.close < zone.top;
        if (fBuy || fSell) {
          const signal = tryCreateSignal(zone.direction, zone, 'FVG_RETEST');
          if (signal) {
            latestSignal = signal;
            latestReason = `${zone.label} retest valid sesuai SMC Kanji.`;
            if (options.oneSignalPerZone) zone.touched = true;
            break;
          }
        }
      }
    }

    if (!latestSignal && canSignal && options.showBreakSignals && eof.ok && (bullBos || bearBos)) {
      const direction = bullBos ? 1 : -1;
      const syntheticZone: SmcKanjiZone = {
        kind: direction === 1 ? 'DEMAND' : 'SUPPLY',
        direction,
        top: direction === 1 ? candle.close : candle.high + atr,
        bottom: direction === 1 ? candle.low - atr : candle.close,
        leftIndex: index,
        rightIndex: index + options.zoneExtend,
        label: direction === 1 ? 'BOS Demand' : 'BOS Supply',
      };
      const signal = tryCreateSignal(direction, syntheticZone, 'BOS_BREAK');
      if (signal) {
        latestSignal = signal;
        latestReason = `${bullBos ? 'Bullish' : 'Bearish'} ${latestStructure?.type || 'BOS'} break signal.`;
      }
    }

    if (!kanjiOk) latestReason = 'Belum ada candle yang masuk Kanji Entry zone 0.559-0.667 / 1.559-1.667 / 2.559-2.667.';
    else if (!eof.ok) latestReason = `Kanji zone valid, tetapi EoF timing filter belum lolos (score ${eof.score}/${options.eofMinScore}).`;
    else if (!latestSignal) latestReason = 'Kanji/EoF valid, tetapi belum ada retest demand/supply zone yang terkonfirmasi.';
  }

  const activeZones = zones.filter((zone) => !zone.touched).slice(-options.maxZones);
  return {
    signal: latestSignal,
    latestStructure,
    activeZones,
    fibZones,
    fvgZones: fvgZones.filter((zone) => !zone.touched).slice(-options.maxFvgBoxes),
    fibStart,
    fibEnd,
    fibDir,
    fibLevels: calculateFibLevels(fibStart, fibEnd),
    eofOk: latestEofOk,
    eofScore: latestEofScore,
    kanjiOk: latestKanjiOk,
    reason: latestReason,
  };
}

export function encodeSmcKanjiZones(zones: SmcKanjiZone[]) {
  return zones
    .slice(-18)
    .map((zone) => [zone.kind, zone.top.toFixed(5), zone.bottom.toFixed(5), zone.leftIndex, zone.rightIndex].join(','))
    .join(';');
}
