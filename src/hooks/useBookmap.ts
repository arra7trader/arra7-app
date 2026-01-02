import { useEffect, useRef, useState } from 'react';
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

        // Disconnect previous WebSocket if exists
        if (wsRef.current) {
            wsRef.current.disconnect();
        }

        wsRef.current = new BinanceWebSocket(symbol, {
            onDepthUpdate: (bids, asks) => {
                // Update Bids - for depth20 we get full snapshot, so clear and rebuild
                const newBids = new Map<number, number>();
                bids.forEach(bid => {
                    if (bid.quantity > 0) {
                        newBids.set(bid.price, bid.quantity);
                    }
                });
                dataRef.current.bids = newBids;

                // Update Asks
                const newAsks = new Map<number, number>();
                asks.forEach(ask => {
                    if (ask.quantity > 0) {
                        newAsks.set(ask.price, ask.quantity);
                    }
                });
                dataRef.current.asks = newAsks;

                // Calculate Best Bid/Ask from the new snapshot
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

                // Keep only last 500 trades to avoid memory leak
                if (dataRef.current.trades.length > 500) {
                    dataRef.current.trades = dataRef.current.trades.slice(-500);
                }
            },
            onStatusChange: (newStatus) => {
                setStatus(newStatus);
            }
        });

        wsRef.current.connect();

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
