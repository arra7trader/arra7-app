import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const WIDTH = 1080;
const HEIGHT = 1500;
const CHART_X = 54;
const CHART_Y = 318;
const CHART_W = 972;
const CHART_H = 700;

type Ohlc = {
  open: number;
  high: number;
  low: number;
  close: number;
};

type ChartZone = {
  kind: string;
  top: number;
  bottom: number;
  leftIndex: number;
  rightIndex: number;
};

function getParam(url: URL, key: string, fallback = '-') {
  const value = url.searchParams.get(key)?.trim();
  return value ? value.slice(0, 220) : fallback;
}

function getNumber(url: URL, key: string) {
  const value = Number(url.searchParams.get(key));
  return Number.isFinite(value) ? value : 0;
}

function parseOhlc(value: string): Ohlc[] {
  return value
    .split(';')
    .map((row) => row.split(',').map(Number))
    .filter((row) => row.length === 4 && row.every((item) => Number.isFinite(item) && item > 0))
    .map(([open, high, low, close]) => ({ open, high, low, close }))
    .filter((candle) => candle.high >= Math.max(candle.open, candle.close) && candle.low <= Math.min(candle.open, candle.close))
    .slice(-44);
}

function parseZones(value: string): ChartZone[] {
  return value
    .split(';')
    .map((row) => row.split(','))
    .filter((row) => row.length === 5)
    .map(([kind, top, bottom, leftIndex, rightIndex]) => ({
      kind,
      top: Number(top),
      bottom: Number(bottom),
      leftIndex: Number(leftIndex),
      rightIndex: Number(rightIndex),
    }))
    .filter((zone) => Number.isFinite(zone.top) && Number.isFinite(zone.bottom) && Number.isFinite(zone.leftIndex) && Number.isFinite(zone.rightIndex) && zone.top > zone.bottom)
    .slice(-18);
}

function zoneStyle(kind: string) {
  if (kind === 'DEMAND') return { label: 'Demand Zone', fill: 'rgba(130,130,130,0.28)', border: 'rgba(220,220,220,0.28)', text: '#fff7ad' };
  if (kind === 'SUPPLY') return { label: 'Supply Zone', fill: 'rgba(130,130,130,0.28)', border: 'rgba(220,220,220,0.28)', text: '#fff7ad' };
  if (kind === 'KANJI_ENTRY') return { label: 'Kanji Entry', fill: 'rgba(95,107,255,0.26)', border: 'rgba(125,135,255,0.45)', text: '#fff7ad' };
  if (kind === 'KANJI_SCALP') return { label: 'Kanji Scalp', fill: 'rgba(0,188,212,0.24)', border: 'rgba(0,218,245,0.45)', text: '#fff7ad' };
  if (kind === 'KANJI_PULLBACK') return { label: 'Kanji Pullback', fill: 'rgba(255,193,7,0.24)', border: 'rgba(255,213,80,0.48)', text: '#fff7ad' };
  if (kind === 'KANJI_ENTRY_2') return { label: 'Kanji Entry 2', fill: 'rgba(95,107,255,0.26)', border: 'rgba(125,135,255,0.45)', text: '#fff7ad' };
  if (kind === 'KANJI_PULLBACK_2') return { label: 'Kanji Pullback 2', fill: 'rgba(255,193,7,0.24)', border: 'rgba(255,213,80,0.48)', text: '#fff7ad' };
  if (kind === 'KANJI_ENTRY_3') return { label: 'Kanji Entry 3', fill: 'rgba(95,107,255,0.26)', border: 'rgba(125,135,255,0.45)', text: '#fff7ad' };
  return { label: 'FVG', fill: 'rgba(184,184,184,0.20)', border: 'rgba(220,220,220,0.25)', text: '#fff7ad' };
}

function formatPrice(symbol: string, value: number) {
  if (!(value > 0)) return '-';
  const abs = Math.abs(value);
  let digits = 2;
  if (abs < 1) digits = 5;
  else if (abs < 100) digits = 4;
  if (symbol.endsWith('JPY')) digits = 3;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function truncate(value: string, length: number) {
  return value.length > length ? `${value.slice(0, length - 1)}...` : value;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function approxSame(a: number, b: number) {
  if (!(a > 0) || !(b > 0)) return false;
  return Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b), 1) * 0.000001;
}

function buildFallbackCandles(current: number, entry: number, swingHigh: number, swingLow: number): Ohlc[] {
  if (!(current > 0) || !(swingHigh > swingLow)) return [];
  const candles: Ohlc[] = [];
  const start = entry > 0 ? entry : swingLow + (swingHigh - swingLow) * 0.45;
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    const center = start + (current - start) * t;
    const wave = Math.sin(i * 1.7) * (swingHigh - swingLow) * 0.035;
    const open = center - wave;
    const close = center + wave * 0.8;
    candles.push({
      open,
      close,
      high: Math.max(open, close) + (swingHigh - swingLow) * 0.018,
      low: Math.min(open, close) - (swingHigh - swingLow) * 0.018,
    });
  }
  return candles;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = getParam(url, 'symbol', 'XAUUSD').toUpperCase();
  const timeframe = getParam(url, 'timeframe', 'H1').toUpperCase();
  const direction = getParam(url, 'direction', 'WAIT').toUpperCase();
  const orderType = getParam(url, 'orderType', 'WAIT').toUpperCase();
  const setupGrade = getParam(url, 'setupGrade', 'Structured Setup');
  const current = getNumber(url, 'current');
  const entryA = getNumber(url, 'entryA');
  const entryB = getNumber(url, 'entryB');
  const entry = getNumber(url, 'entry');
  const stopLoss = getNumber(url, 'sl');
  const tp1 = getNumber(url, 'tp1');
  const tp2 = getNumber(url, 'tp2');
  const tp3 = getNumber(url, 'tp3');
  const swingHigh = getNumber(url, 'swingHigh');
  const swingLow = getNumber(url, 'swingLow');
  const confidence = getParam(url, 'confidence', '0');
  const rr = getParam(url, 'rr', '-');
  const liveSource = getParam(url, 'liveSource', 'real-market');
  const candleSource = getParam(url, 'candleSource', 'real-history');
  const candlesCount = getParam(url, 'candles', '0');
  const zone = getParam(url, 'zone', '-');
  const invalidation = getParam(url, 'invalidation', '-');
  const signalId = getParam(url, 'signalId', '-');
  const hasSetup = getParam(url, 'hasSetup', '1') !== '0';
  const parsedCandles = parseOhlc(url.searchParams.get('ohlc') || '');
  const chartZones = parseZones(url.searchParams.get('zones') || '');
  const chartCandles = parsedCandles.length >= 5
    ? parsedCandles
    : buildFallbackCandles(current, entry, swingHigh, swingLow);
  const candlesCountNumber = Number(candlesCount);
  const sourceCandleCount = Number.isFinite(candlesCountNumber) && candlesCountNumber > 0 ? candlesCountNumber : chartCandles.length;

  const isBuy = direction === 'BUY';
  const isSell = direction === 'SELL';
  const accent = isBuy ? '#20d68b' : isSell ? '#ff5e6c' : '#f8c247';
  const accentSoft = isBuy ? 'rgba(32, 214, 139, 0.18)' : isSell ? 'rgba(255, 94, 108, 0.18)' : 'rgba(248, 194, 71, 0.18)';
  const entryLow = Math.min(entryA, entryB);
  const entryHigh = Math.max(entryA, entryB);
  const setupPrices = hasSetup ? [entryA, entryB, entry, stopLoss, tp1, tp2, tp3].filter((price) => price > 0) : [];
  const validSwing = swingHigh > swingLow && !approxSame(swingHigh, swingLow);
  const rrDisplay = hasSetup && rr !== '-' ? `1:${rr}` : 'WAIT';

  const allPrices = [
    ...chartCandles.flatMap((candle) => [candle.high, candle.low]),
    ...chartZones.flatMap((zone) => [zone.top, zone.bottom]),
    current,
    ...setupPrices,
    ...(validSwing ? [swingHigh, swingLow] : []),
  ].filter((price) => price > 0);
  const priceRange = allPrices.length > 0 ? allPrices : [1];
  const minPrice = Math.min(...priceRange);
  const maxPrice = Math.max(...priceRange);
  const padding = Math.max((maxPrice - minPrice) * 0.08, maxPrice * 0.0002);
  const scaleMin = minPrice - padding;
  const scaleMax = maxPrice + padding;
  const span = Math.max(scaleMax - scaleMin, 0.0000001);
  const yFor = (price: number) => CHART_Y + ((scaleMax - price) / span) * CHART_H;
  const currentBarIndex = Math.max(sourceCandleCount - 1, chartCandles.length - 1, 0);
  const maxZoneIndex = chartZones.length > 0 ? Math.max(...chartZones.map((zone) => zone.rightIndex)) : currentBarIndex;
  const futureBars = clamp(maxZoneIndex - currentBarIndex, 0, 10);
  const visibleStartIndex = Math.max(0, currentBarIndex - Math.max(chartCandles.length - 1, 1));
  const visibleEndIndex = currentBarIndex + futureBars;
  const visibleBars = Math.max(visibleEndIndex - visibleStartIndex + 1, 1);
  const candleSlot = CHART_W / visibleBars;
  const candleBodyW = clamp(candleSlot * 0.55, 8, 18);
  const xForBar = (index: number) => clamp(((index - visibleStartIndex) / Math.max(visibleEndIndex - visibleStartIndex, 1)) * CHART_W, 0, CHART_W);

  const setupLevels = hasSetup
    ? [
        { key: 'TP3', label: 'TP3 2.618', value: tp3, color: '#73f0ff', width: 1 },
        { key: 'TP2', label: 'TP2 2.000', value: tp2, color: '#73f0ff', width: 1 },
        { key: 'TP1', label: 'TP1 1.618', value: tp1, color: '#73f0ff', width: 2 },
        { key: 'ENTRY A', label: 'ENTRY 0.559', value: entryA, color: accent, width: 2 },
        { key: 'ENTRY B', label: 'ENTRY 0.667', value: entryB, color: accent, width: 2 },
        { key: 'SL', label: 'SL / INVALID', value: stopLoss, color: '#ff8a8a', width: 2 },
      ].filter((level) => level.value > 0 && !approxSame(level.value, current))
    : [];
  const swingLevels = validSwing
    ? [
        { key: 'HIGH', label: 'SWING HIGH', value: swingHigh, color: '#9aa8c0', width: 1 },
        { key: 'LOW', label: 'SWING LOW', value: swingLow, color: '#9aa8c0', width: 1 },
      ]
    : [];
  const levels = [
    ...setupLevels,
    { key: 'CURRENT', label: 'CURRENT', value: current, color: '#ffffff', width: 2 },
    ...swingLevels,
  ].filter((level) => level.value > 0);

  const gridPrices = Array.from({ length: 6 }, (_, index) => scaleMin + (span * index) / 5).reverse();

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          padding: 44,
          color: '#f7fbff',
          background: 'linear-gradient(145deg, #06080d 0%, #10151d 48%, #071112 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', color: '#9fb0ca', fontSize: 27 }}>ARRA7 EXCLUSIVE CHART</div>
            <div style={{ display: 'flex', marginTop: 8, fontSize: 52, fontWeight: 800 }}>SMC Kanji Signal</div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
              minWidth: 250,
              height: 100,
              borderRadius: 28,
              border: `3px solid ${accent}`,
              background: accentSoft,
              padding: '0 28px',
            }}
          >
            <div style={{ display: 'flex', color: accent, fontSize: 42, fontWeight: 800 }}>{direction}</div>
            <div style={{ display: 'flex', color: '#d8dfec', fontSize: 21 }}>{orderType}</div>
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 22, justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 23 }}>INSTRUMENT</div>
            <div style={{ display: 'flex', marginTop: 2, fontSize: 70, fontWeight: 800 }}>{symbol}</div>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            <MiniBox label="TIMEFRAME" value={timeframe} />
            <MiniBox label="CONFIDENCE" value={`${confidence}%`} />
            <MiniBox label="RR" value={rrDisplay} />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: CHART_X,
            top: CHART_Y,
            width: CHART_W,
            height: CHART_H,
            borderRadius: 28,
            background: 'rgba(3,8,13,0.86)',
            border: '1px solid rgba(255,255,255,0.14)',
            overflow: 'hidden',
          }}
        >
          {gridPrices.map((price) => {
            const y = yFor(price) - CHART_Y;
            return (
              <div key={`grid-${price}`} style={{ display: 'flex', position: 'absolute', left: 0, right: 0, top: y }}>
                <div style={{ display: 'flex', width: '100%', height: 1, background: 'rgba(255,255,255,0.07)' }} />
                <div style={{ display: 'flex', position: 'absolute', right: 18, top: -14, color: '#63718a', fontSize: 20 }}>
                  {formatPrice(symbol, price)}
                </div>
              </div>
            );
          })}

          {chartZones.map((zone, index) => {
            const style = zoneStyle(zone.kind);
            const left = xForBar(zone.leftIndex);
            const right = Math.max(xForBar(zone.rightIndex), left + 90);
            const top = yFor(zone.top) - CHART_Y;
            const bottom = yFor(zone.bottom) - CHART_Y;
            return (
              <div
                key={`zone-${zone.kind}-${index}`}
                style={{
                  display: 'flex',
                  position: 'absolute',
                  left,
                  top,
                  width: Math.max(right - left, 90),
                  height: Math.max(bottom - top, 10),
                  background: style.fill,
                  borderTop: `1px solid ${style.border}`,
                  borderBottom: `1px solid ${style.border}`,
                  opacity: 0.92,
                }}
              >
                <div style={{ display: 'flex', marginLeft: 'auto', marginRight: 14, marginTop: 6, color: style.text, fontSize: 18, fontWeight: 700 }}>
                  {style.label}
                </div>
              </div>
            );
          })}

          {hasSetup && entryA > 0 && entryB > 0 ? (
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                left: 0,
                right: 0,
                top: yFor(entryHigh) - CHART_Y,
                height: Math.max(yFor(entryLow) - yFor(entryHigh), 8),
                background: accentSoft,
                borderTop: `2px solid ${accent}`,
                borderBottom: `2px solid ${accent}`,
              }}
            />
          ) : null}

          {chartCandles.map((candle, index) => {
            const x = xForBar(visibleStartIndex + index);
            const wickTop = yFor(candle.high) - CHART_Y;
            const wickBottom = yFor(candle.low) - CHART_Y;
            const openY = yFor(candle.open) - CHART_Y;
            const closeY = yFor(candle.close) - CHART_Y;
            const isUp = candle.close >= candle.open;
            const color = isUp ? '#20d68b' : '#ff5e6c';
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(openY - closeY), 4);
            return (
              <div key={`candle-${index}`} style={{ display: 'flex', position: 'absolute', left: x, top: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    left: -1,
                    top: wickTop,
                    width: 2,
                    height: Math.max(wickBottom - wickTop, 1),
                    background: color,
                    opacity: 0.85,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    left: -candleBodyW / 2,
                    top: bodyTop,
                    width: candleBodyW,
                    height: bodyHeight,
                    borderRadius: 3,
                    background: isUp ? color : 'rgba(255,94,108,0.18)',
                    border: `2px solid ${color}`,
                  }}
                />
              </div>
            );
          })}

          {levels.map((level, index) => {
            const y = yFor(level.value) - CHART_Y;
            const labelTop = clamp(y - 18, 12, CHART_H - 42);
            const labelLeft = index % 2 === 0 ? CHART_W - 302 : 18;
            return (
              <div key={level.key} style={{ display: 'flex', position: 'absolute', left: 0, right: 0, top: y }}>
                <div
                  style={{
                    display: 'flex',
                    width: '100%',
                    height: level.width,
                    background: level.color,
                    opacity: level.key === 'CURRENT' ? 0.92 : 0.68,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    top: labelTop - y,
                    left: labelLeft,
                    width: 284,
                    padding: '7px 11px',
                    borderRadius: 12,
                    background: 'rgba(3,8,13,0.82)',
                    border: `1px solid ${level.color}`,
                    color: level.color,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {level.label} {formatPrice(symbol, level.value)}
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', position: 'absolute', left: 22, bottom: 18, color: '#8fa0ba', fontSize: 20 }}>
            {parsedCandles.length >= 5 ? 'REAL OHLC CANDLES FROM SIGNAL DATA' : 'PRICE PATH FALLBACK - CANDLE PAYLOAD MISSING'}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 54,
            top: 1046,
            width: 972,
            gap: 18,
          }}
        >
          <Panel
            title="ENTRY ZONE"
            value={hasSetup ? `${formatPrice(symbol, entryLow)} - ${formatPrice(symbol, entryHigh)}` : 'WAIT SETUP'}
            sub={hasSetup ? `Entry ${formatPrice(symbol, entry)} | ${truncate(zone, 28)}` : truncate(zone, 44)}
            accent={accent}
          />
          <Panel title="STOP LOSS" value={hasSetup ? formatPrice(symbol, stopLoss) : 'WAIT'} sub={truncate(invalidation, 54)} accent="#ff8a8a" />
          <Panel
            title="TARGETS"
            value={hasSetup ? `${formatPrice(symbol, tp1)} / ${formatPrice(symbol, tp2)}` : 'WAIT'}
            sub={hasSetup ? `TP3 ${formatPrice(symbol, tp3)}` : 'Menunggu retest SMC Kanji valid'}
            accent="#73f0ff"
          />
        </div>

        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 54,
            top: 1300,
            width: 972,
            justifyContent: 'space-between',
            paddingTop: 22,
            borderTop: '1px solid rgba(255,255,255,0.14)',
            color: '#9fb0ca',
            fontSize: 22,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', color: '#f7fbff', fontSize: 28, fontWeight: 800 }}>{truncate(setupGrade, 42)}</div>
            <div style={{ display: 'flex', marginTop: 10 }}>Source: {truncate(liveSource, 32)} | Candles: {truncate(candleSource, 28)} ({candlesCount})</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex' }}>Rule 0.559/0.667 + SMC zone retest</div>
            <div style={{ display: 'flex', marginTop: 10 }}>{signalId === '-' ? 'ARRA7 Private Execution Desk' : `REF #${signalId}`}</div>
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
    }
  );
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 150,
        padding: '14px 18px',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.055)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 18 }}>{label}</div>
      <div style={{ display: 'flex', marginTop: 6, color: '#ffffff', fontSize: 32, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function Panel({ title, value, sub, accent }: { title: string; value: string; sub: string; accent: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 146,
        padding: 24,
        borderRadius: 24,
        background: 'rgba(255,255,255,0.055)',
        border: `1px solid ${accent}`,
      }}
    >
      <div style={{ display: 'flex', color: '#9fb0ca', fontSize: 20 }}>{title}</div>
      <div style={{ display: 'flex', marginTop: 12, color: accent, fontSize: 34, fontWeight: 800 }}>{value}</div>
      <div style={{ display: 'flex', marginTop: 12, color: '#d8dfec', fontSize: 20, lineHeight: 1.25 }}>{sub}</div>
    </div>
  );
}
