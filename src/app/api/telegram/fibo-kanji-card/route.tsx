import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const WIDTH = 1080;
const HEIGHT = 1780;

function getParam(url: URL, key: string, fallback = '-') {
  const value = url.searchParams.get(key)?.trim();
  return value ? value.slice(0, 180) : fallback;
}

function getNumber(url: URL, key: string) {
  const value = Number(url.searchParams.get(key));
  return Number.isFinite(value) ? value : 0;
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
  const candles = getParam(url, 'candles', '0');
  const zone = getParam(url, 'zone', '-');
  const invalidation = getParam(url, 'invalidation', '-');
  const signalId = getParam(url, 'signalId', '-');

  const isBuy = direction === 'BUY';
  const isSell = direction === 'SELL';
  const accent = isBuy ? '#20d68b' : isSell ? '#ff5e6c' : '#f8c247';
  const accentSoft = isBuy ? 'rgba(32, 214, 139, 0.15)' : isSell ? 'rgba(255, 94, 108, 0.15)' : 'rgba(248, 194, 71, 0.16)';

  const levelRows = [
    { label: 'TP3', meta: '2.618', price: tp3, tone: '#73f0ff' },
    { label: 'TP2', meta: '2.000', price: tp2, tone: '#73f0ff' },
    { label: 'TP1', meta: '1.618', price: tp1, tone: '#73f0ff' },
    { label: 'CURRENT', meta: 'LIVE', price: current, tone: '#ffffff' },
    { label: 'ENTRY A', meta: '0.559', price: entryA, tone: accent },
    { label: 'ENTRY B', meta: '0.619', price: entryB, tone: accent },
    { label: 'SL', meta: '0.000', price: stopLoss, tone: '#ff8a8a' },
    { label: 'SWING HIGH', meta: 'ANCHOR', price: swingHigh, tone: '#b8c2d8' },
    { label: 'SWING LOW', meta: 'ANCHOR', price: swingLow, tone: '#b8c2d8' },
  ].filter((item) => item.price > 0).sort((a, b) => b.price - a.price);

  const entryLow = Math.min(entryA, entryB);
  const entryHigh = Math.max(entryA, entryB);

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          padding: 54,
          color: '#f7fbff',
          background: 'linear-gradient(145deg, #07090f 0%, #10151e 48%, #071112 100%)',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 28, letterSpacing: 0, color: '#c9d4e8' }}>ARRA7 EXCLUSIVE</div>
            <div style={{ display: 'flex', marginTop: 8, fontSize: 70, fontWeight: 800, letterSpacing: 0 }}>
              SIGNAL Fibo Kanji
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 228,
              height: 92,
              borderRadius: 30,
              border: `3px solid ${accent}`,
              background: accentSoft,
              color: accent,
              fontSize: 42,
              fontWeight: 800,
            }}
          >
            {direction}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 34,
            padding: '26px 30px',
            borderRadius: 30,
            background: 'rgba(255,255,255,0.055)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 24 }}>INSTRUMENT</div>
            <div style={{ display: 'flex', marginTop: 6, fontSize: 66, fontWeight: 800 }}>{symbol}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 24 }}>TIMEFRAME</div>
            <div style={{ display: 'flex', marginTop: 6, fontSize: 54, fontWeight: 800 }}>{timeframe}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 26 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: 28,
              borderRadius: 26,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 23 }}>EXECUTION</div>
            <div style={{ display: 'flex', marginTop: 10, color: accent, fontSize: 48, fontWeight: 800 }}>{orderType}</div>
            <div style={{ display: 'flex', marginTop: 14, color: '#d8dfec', fontSize: 25 }}>{truncate(setupGrade, 48)}</div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 300,
              padding: 28,
              borderRadius: 26,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 23 }}>CONFIDENCE</div>
            <div style={{ display: 'flex', marginTop: 10, color: '#ffffff', fontSize: 52, fontWeight: 800 }}>
              {confidence}%
            </div>
            <div style={{ display: 'flex', marginTop: 12, color: '#cbd6e8', fontSize: 24 }}>RR 1:{rr}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 28, marginTop: 28, flex: 1 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: 420,
              padding: 30,
              borderRadius: 30,
              background: 'rgba(4,8,14,0.78)',
              border: '1px solid rgba(255,255,255,0.13)',
            }}
          >
            <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 24 }}>KANJI LEVELS</div>
            <div style={{ display: 'flex', position: 'relative', flex: 1, marginTop: 26 }}>
              <div
                style={{
                  display: 'flex',
                  position: 'absolute',
                  left: 16,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  borderRadius: 4,
                  background: 'linear-gradient(180deg, #73f0ff 0%, #20d68b 53%, #ff8a8a 100%)',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', justifyContent: 'space-between' }}>
                {levelRows.map((row) => (
                  <div key={`${row.label}-${row.meta}`} style={{ display: 'flex', alignItems: 'center', minHeight: 54 }}>
                    <div
                      style={{
                        display: 'flex',
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        background: row.tone,
                        border: '4px solid #071017',
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 18, flex: 1 }}>
                      <div style={{ display: 'flex', color: row.tone, fontSize: 25, fontWeight: 800 }}>{row.label}</div>
                      <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 18 }}>{row.meta}</div>
                    </div>
                    <div style={{ display: 'flex', color: '#f7fbff', fontSize: 26, fontWeight: 700 }}>
                      {formatPrice(symbol, row.price)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 20 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 30,
                borderRadius: 30,
                background: accentSoft,
                border: `2px solid ${accent}`,
              }}
            >
              <div style={{ display: 'flex', color: '#cbd6e8', fontSize: 24 }}>ENTRY ZONE 0.559 - 0.619</div>
              <div style={{ display: 'flex', marginTop: 12, color: '#ffffff', fontSize: 48, fontWeight: 800 }}>
                {formatPrice(symbol, entryLow)} - {formatPrice(symbol, entryHigh)}
              </div>
              <div style={{ display: 'flex', marginTop: 16, color: '#d8dfec', fontSize: 28 }}>
                Recommended Entry: {formatPrice(symbol, entry)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 18 }}>
              <Metric label="CURRENT" value={formatPrice(symbol, current)} />
              <Metric label="STOP LOSS" value={formatPrice(symbol, stopLoss)} danger />
            </div>

            <div style={{ display: 'flex', gap: 18 }}>
              <Metric label="TP1 1.618" value={formatPrice(symbol, tp1)} />
              <Metric label="TP2 2.000" value={formatPrice(symbol, tp2)} />
              <Metric label="TP3 2.618" value={formatPrice(symbol, tp3)} />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 26,
                borderRadius: 26,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 22 }}>NEAREST ZONE</div>
              <div style={{ display: 'flex', marginTop: 8, color: '#ffffff', fontSize: 30, fontWeight: 800 }}>
                {truncate(zone, 42)}
              </div>
              <div style={{ display: 'flex', marginTop: 18, color: '#8fa0ba', fontSize: 22 }}>INVALIDATION</div>
              <div style={{ display: 'flex', marginTop: 8, color: '#d8dfec', fontSize: 25, lineHeight: 1.25 }}>
                {truncate(invalidation, 116)}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 26,
                borderRadius: 26,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 22 }}>DATA SOURCE</div>
              <div style={{ display: 'flex', marginTop: 8, color: '#ffffff', fontSize: 27, fontWeight: 800 }}>
                {truncate(liveSource, 36)}
              </div>
              <div style={{ display: 'flex', marginTop: 10, color: '#cbd6e8', fontSize: 22 }}>
                Candles: {truncate(candleSource, 26)} | {candles} bars
              </div>
              <div style={{ display: 'flex', marginTop: 18, color: '#8fa0ba', fontSize: 21 }}>
                {'Rule: 0.559/0.619 entry -> 1.618/2.000/2.618 TP'}
              </div>
              <div style={{ display: 'flex', marginTop: 10, color: '#8fa0ba', fontSize: 21 }}>
                {signalId === '-' ? 'Private Execution Desk' : `Private Execution Desk | REF #${signalId}`}
              </div>
            </div>
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

function Metric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: 24,
        borderRadius: 24,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div style={{ display: 'flex', color: '#8fa0ba', fontSize: 19 }}>{label}</div>
      <div style={{ display: 'flex', marginTop: 10, color: danger ? '#ff8a8a' : '#ffffff', fontSize: 28, fontWeight: 800 }}>
        {value}
      </div>
    </div>
  );
}
