import { useEffect, useRef, useState, useCallback } from 'react';
import { BinanceWebSocket, OrderBookLevel, Trade } from '@/lib/bookmap/websocket';

export type BookmapState = {
    bids: Map<number, number>; // Price -> Quantity
    asks: Map<number, number>; // Price -> Quantity
    trades: Trade[];
    bestBid: number;
    bestAsk: number;
    lastPrice: number;
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
    });

    // Force update for components that need low-frequency updates (like the side panel)
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
        };
        setStatus('connecting');

        wsRef.current = new BinanceWebSocket(symbol, {
            onDepthUpdate: (bids, asks) => {
                const now = Date.now();

                // Update Bids
                bids.forEach(bid => {
                    if (bid.quantity === 0) {
                        dataRef.current.bids.delete(bid.price);
                    } else {
                        dataRef.current.bids.set(bid.price, bid.quantity);
                    }
                });

                // Update Asks
                asks.forEach(ask => {
                    if (ask.quantity === 0) {
                        dataRef.current.asks.delete(ask.price);
                    } else {
                        dataRef.current.asks.set(ask.price, ask.quantity);
                    }
                });

                // Calculate Best Bid/Ask
                // Note: Getting max/min from Map keys can be expensive if map is huge, 
                // but for partial depth (depth20) it's fine. 
                // However, we accumulate partial depths, so the map might grow.
                // Binance's @depth20 stream already gives sorted arrays, but our local map isn't sorted.
                // Optimization: Track max/min iteratively or assume high density.
                // For now, simple spread usage (careful with performance)
                if (dataRef.current.bids.size > 0) {
                    dataRef.current.bestBid = Math.max(...dataRef.current.bids.keys());
                }
                if (dataRef.current.asks.size > 0) {
                    dataRef.current.bestAsk = Math.min(...dataRef.current.asks.keys());
                }
            },
            onTrade: (trade) => {
                dataRef.current.trades.push(trade);
                dataRef.current.lastPrice = trade.price;

                // Keep only last 100 trades to avoid memory leak in this ref
                // (The visualizer will have its own buffer)
                if (dataRef.current.trades.length > 500) {
                    dataRef.current.trades = dataRef.current.trades.slice(-500);
                }
            }
        });

        wsRef.current.connect();
        setStatus('connected');

        // Low-frequency update loop for UI panels (OrderBookPanel)
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 500); // Update side panel every 500ms

        return () => {
            wsRef.current?.disconnect();
            clearInterval(interval);
        };
    }, [symbol]);

    return {
        status,
        dataRef, // Direct access to mutable ref for Canvas
        tick // Trigger for React components
    };
};
