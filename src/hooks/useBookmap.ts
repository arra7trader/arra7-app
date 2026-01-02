import { useEffect, useRef, useState } from 'react';
import { BinanceWebSocket, OrderBookLevel, Trade } from '@/lib/bookmap/websocket';

export type BookmapState = {
    bids: Map<number, number>; // Price -> Quantity
    asks: Map<number, number>; // Price -> Quantity
    trades: Trade[];
    bestBid: number;
    bestAsk: number;
    lastPrice: number;
    levelCount: number; // Track how many levels we have
};

export const useBookmap = (symbol: string) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

    // We use refs for high-frequency data to avoid re-renders
    const dataRef = useRef<BookmapState>({
        bids: new Map(),
        asks: new Map(),
        trades: [],
        bestBid: 0,
        bestAsk: 0,
        lastPrice: 0,
        levelCount: 0,
    });

    // Force update for components that need low-frequency updates
    const [tick, setTick] = useState(0);

    const wsRef = useRef<BinanceWebSocket | null>(null);

    useEffect(() => {
        // Reset state on symbol change
        dataRef.current = {
            bids: new Map(),
            asks: new Map(),
            trades: [],
            bestBid: 0,
            bestAsk: 0,
            lastPrice: 0,
            levelCount: 0,
        };
        setStatus('connecting');

        // Disconnect previous WebSocket if exists
        if (wsRef.current) {
            wsRef.current.disconnect();
        }

        wsRef.current = new BinanceWebSocket(symbol, {
            onDepthUpdate: (bids, asks) => {
                // Full order book update (up to 1000 levels each side)
                const newBids = new Map<number, number>();
                bids.forEach(level => {
                    if (level.quantity > 0) {
                        newBids.set(level.price, level.quantity);
                    }
                });
                dataRef.current.bids = newBids;

                const newAsks = new Map<number, number>();
                asks.forEach(level => {
                    if (level.quantity > 0) {
                        newAsks.set(level.price, level.quantity);
                    }
                });
                dataRef.current.asks = newAsks;

                // Calculate Best Bid/Ask
                if (dataRef.current.bids.size > 0) {
                    dataRef.current.bestBid = Math.max(...dataRef.current.bids.keys());
                }
                if (dataRef.current.asks.size > 0) {
                    dataRef.current.bestAsk = Math.min(...dataRef.current.asks.keys());
                }

                // Track level count
                dataRef.current.levelCount = dataRef.current.bids.size + dataRef.current.asks.size;
            },
            onTrade: (trade) => {
                dataRef.current.trades.push(trade);
                dataRef.current.lastPrice = trade.price;

                // Keep only last 500 trades
                if (dataRef.current.trades.length > 500) {
                    dataRef.current.trades = dataRef.current.trades.slice(-500);
                }
            },
            onStatusChange: (newStatus) => {
                setStatus(newStatus);
            }
        });

        wsRef.current.connect();

        // Low-frequency update loop for UI panels
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 500);

        return () => {
            wsRef.current?.disconnect();
            clearInterval(interval);
        };
    }, [symbol]);

    return {
        status,
        dataRef,
        tick
    };
};
