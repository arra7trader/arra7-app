'use client';

import { DEPTH_MATRIX_THEME } from '@/lib/depth-matrix/theme';
import { DepthMatrixState } from '@/hooks/useDepthMatrix';

const theme = DEPTH_MATRIX_THEME;

interface OrderBookHistogramProps {
    dataRef: React.MutableRefObject<DepthMatrixState>;
    tick: number; // Just to trigger re-render
}

export default function OrderBookHistogram({ dataRef, tick: _ }: OrderBookHistogramProps) {
    const data = dataRef.current;

    // Get top 15 levels each side
    const bids = Array.from(data.bids.entries())
        .sort((a, b) => b[0] - a[0])
        .slice(0, 15);

    const asks = Array.from(data.asks.entries())
        .sort((a, b) => a[0] - b[0])
        .slice(0, 15);

    // Find max for scaling
    const maxQty = Math.max(
        ...bids.map(([, q]) => q),
        ...asks.map(([, q]) => q),
        1
    );

    // Calculate totals
    const totalBid = bids.reduce((sum, [, q]) => sum + q, 0);
    const totalAsk = asks.reduce((sum, [, q]) => sum + q, 0);
    const imbalance = totalBid + totalAsk > 0
        ? ((totalBid - totalAsk) / (totalBid + totalAsk) * 100).toFixed(0)
        : '0';

    return (
        <div
            className="h-full flex flex-col overflow-hidden"
            style={{ background: theme.surface }}
        >
            {/* Header */}
            <div
                className="px-3 py-2 border-b flex items-center justify-between"
                style={{ borderColor: theme.border }}
            >
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                    Order Book
                </span>
                <div className="flex items-center gap-1.5">
                    <span
                        className="text-[10px] font-mono"
                        style={{
                            color: Number(imbalance) > 0 ? theme.bullish :
                                Number(imbalance) < 0 ? theme.bearish : theme.textSecondary
                        }}
                    >
                        {Number(imbalance) > 0 ? '+' : ''}{imbalance}%
                    </span>
                </div>
            </div>

            {/* Book */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Asks (top, reversed) */}
                <div className="flex-1 flex flex-col justify-end overflow-hidden px-2 py-1">
                    {asks.slice().reverse().map(([price, qty], i) => (
                        <OrderRow
                            key={`ask-${price}`}
                            price={price}
                            quantity={qty}
                            maxQty={maxQty}
                            side="ask"
                            isTop={i === asks.length - 1}
                        />
                    ))}
                </div>

                {/* Spread */}
                <div
                    className="px-3 py-1.5 flex items-center justify-between border-y"
                    style={{
                        background: theme.surfaceElevated,
                        borderColor: theme.border
                    }}
                >
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: theme.textMuted }}>
                        Spread
                    </span>
                    <span className="text-xs font-mono font-bold" style={{ color: theme.primary }}>
                        {data.bestAsk > 0 && data.bestBid > 0
                            ? (data.bestAsk - data.bestBid).toFixed(2)
                            : '--'
                        }
                    </span>
                </div>

                {/* Bids (bottom) */}
                <div className="flex-1 flex flex-col overflow-hidden px-2 py-1">
                    {bids.map(([price, qty], i) => (
                        <OrderRow
                            key={`bid-${price}`}
                            price={price}
                            quantity={qty}
                            maxQty={maxQty}
                            side="bid"
                            isTop={i === 0}
                        />
                    ))}
                </div>
            </div>

            {/* Totals */}
            <div
                className="px-3 py-2 border-t flex justify-between text-[10px] font-mono"
                style={{ borderColor: theme.border, color: theme.textMuted }}
            >
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm" style={{ background: theme.bullish }} />
                    <span>{formatQty(totalBid)}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span>{formatQty(totalAsk)}</span>
                    <div className="w-2 h-2 rounded-sm" style={{ background: theme.bearish }} />
                </div>
            </div>
        </div>
    );
}

function OrderRow({
    price,
    quantity,
    maxQty,
    side,
    isTop
}: {
    price: number;
    quantity: number;
    maxQty: number;
    side: 'bid' | 'ask';
    isTop: boolean;
}) {
    const percent = (quantity / maxQty) * 100;
    const isBid = side === 'bid';

    return (
        <div
            className={`relative flex items-center justify-between py-0.5 text-[10px] font-mono ${isTop ? 'font-bold' : ''}`}
        >
            {/* Background bar */}
            <div
                className="absolute inset-y-0 transition-all duration-150"
                style={{
                    width: `${percent}%`,
                    left: isBid ? 0 : 'auto',
                    right: isBid ? 'auto' : 0,
                    background: isBid
                        ? `linear-gradient(to right, ${theme.bullish}15, ${theme.bullish}30)`
                        : `linear-gradient(to left, ${theme.bearish}15, ${theme.bearish}30)`,
                }}
            />

            {/* Content */}
            <span
                className="relative z-10"
                style={{ color: isTop ? (isBid ? theme.bullish : theme.bearish) : theme.textSecondary }}
            >
                {formatPrice(price)}
            </span>
            <span
                className="relative z-10"
                style={{ color: theme.textMuted }}
            >
                {formatQty(quantity)}
            </span>
        </div>
    );
}

function formatPrice(price: number): string {
    if (price >= 10000) return price.toFixed(0);
    if (price >= 100) return price.toFixed(1);
    return price.toFixed(2);
}

function formatQty(qty: number): string {
    if (qty >= 1000) return `${(qty / 1000).toFixed(1)}K`;
    if (qty >= 1) return qty.toFixed(2);
    return qty.toFixed(4);
}
