// ARRA7 Depth Matrix - Analytics Engine
// AI-powered market analysis algorithms

interface OrderLevel {
    price: number;
    quantity: number;
}

interface LiquidityWall {
    price: number;
    quantity: number;
    strength: number; // 0-1, how significant compared to average
    side: 'bid' | 'ask';
}

interface WhaleAlert {
    id: string;
    time: number;
    price: number;
    quantity: number;
    side: 'buy' | 'sell';
    symbol: string;
}

interface NetFlowData {
    buyVolume: number;
    sellVolume: number;
    netFlow: number;      // positive = buying pressure
    flowPercent: number;  // -100 to +100
}

// Detect significant liquidity walls (large limit orders)
export function detectLiquidityWalls(
    bids: Map<number, number>,
    asks: Map<number, number>,
    topN: number = 5
): LiquidityWall[] {
    const walls: LiquidityWall[] = [];

    // Calculate average quantities
    let totalBidQty = 0;
    let totalAskQty = 0;
    let bidCount = 0;
    let askCount = 0;

    bids.forEach(qty => { totalBidQty += qty; bidCount++; });
    asks.forEach(qty => { totalAskQty += qty; askCount++; });

    const avgBid = bidCount > 0 ? totalBidQty / bidCount : 1;
    const avgAsk = askCount > 0 ? totalAskQty / askCount : 1;

    // Find walls (levels significantly above average)
    const multiplier = 3; // 3x average = wall

    bids.forEach((qty, price) => {
        if (qty > avgBid * multiplier) {
            walls.push({
                price,
                quantity: qty,
                strength: Math.min(qty / (avgBid * multiplier * 2), 1),
                side: 'bid',
            });
        }
    });

    asks.forEach((qty, price) => {
        if (qty > avgAsk * multiplier) {
            walls.push({
                price,
                quantity: qty,
                strength: Math.min(qty / (avgAsk * multiplier * 2), 1),
                side: 'ask',
            });
        }
    });

    // Sort by strength and return top N
    return walls
        .sort((a, b) => b.strength - a.strength)
        .slice(0, topN);
}

// Calculate net order flow (buy vs sell pressure)
export function calculateNetFlow(
    trades: Array<{ quantity: number; isBuyerMaker: boolean; time: number }>,
    windowMs: number = 5000 // Last 5 seconds
): NetFlowData {
    const now = Date.now();
    const cutoff = now - windowMs;

    let buyVolume = 0;
    let sellVolume = 0;

    for (let i = trades.length - 1; i >= 0; i--) {
        const trade = trades[i];
        if (trade.time < cutoff) break;

        if (trade.isBuyerMaker) {
            sellVolume += trade.quantity;
        } else {
            buyVolume += trade.quantity;
        }
    }

    const totalVolume = buyVolume + sellVolume;
    const netFlow = buyVolume - sellVolume;
    const flowPercent = totalVolume > 0
        ? (netFlow / totalVolume) * 100
        : 0;

    return {
        buyVolume,
        sellVolume,
        netFlow,
        flowPercent: Math.max(-100, Math.min(100, flowPercent)),
    };
}

// Detect whale trades (large market orders)
export function detectWhales(
    trades: Array<{ price: number; quantity: number; isBuyerMaker: boolean; time: number }>,
    threshold: number,
    lastAlertTime: number = 0
): WhaleAlert[] {
    const alerts: WhaleAlert[] = [];

    for (const trade of trades) {
        if (trade.time <= lastAlertTime) continue;
        if (trade.quantity >= threshold) {
            alerts.push({
                id: `whale-${trade.time}-${trade.price}`,
                time: trade.time,
                price: trade.price,
                quantity: trade.quantity,
                side: trade.isBuyerMaker ? 'sell' : 'buy',
                symbol: '',
            });
        }
    }

    return alerts;
}

// Detect iceberg orders (smart money splitting large orders)
// This is a simplified detection - looks for repeated same-size trades at similar prices
export function detectIcebergPattern(
    trades: Array<{ price: number; quantity: number; time: number }>,
    windowMs: number = 10000
): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;

    // Group trades by similar quantity (within 10%)
    const quantityGroups = new Map<number, number>();

    for (let i = trades.length - 1; i >= 0; i--) {
        const trade = trades[i];
        if (trade.time < cutoff) break;

        // Round quantity to nearest 0.1 to group similar sizes
        const roundedQty = Math.round(trade.quantity * 10) / 10;
        quantityGroups.set(roundedQty, (quantityGroups.get(roundedQty) || 0) + 1);
    }

    // If any quantity appears 5+ times in 10 seconds, likely iceberg
    for (const count of quantityGroups.values()) {
        if (count >= 5) return true;
    }

    return false;
}

// Calculate order book imbalance (bid vs ask volume ratio)
export function calculateImbalance(
    bids: Map<number, number>,
    asks: Map<number, number>,
    levels: number = 10 // Top 10 levels
): number {
    let bidVolume = 0;
    let askVolume = 0;

    // Get top bid levels
    const sortedBids = Array.from(bids.entries())
        .sort((a, b) => b[0] - a[0])
        .slice(0, levels);

    const sortedAsks = Array.from(asks.entries())
        .sort((a, b) => a[0] - b[0])
        .slice(0, levels);

    sortedBids.forEach(([, qty]) => { bidVolume += qty; });
    sortedAsks.forEach(([, qty]) => { askVolume += qty; });

    const total = bidVolume + askVolume;
    if (total === 0) return 0;

    // Returns -1 to +1 (negative = more asks, positive = more bids)
    return (bidVolume - askVolume) / total;
}

export type { OrderLevel, LiquidityWall, WhaleAlert, NetFlowData };
