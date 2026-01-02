'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BinanceWebSocket } from '@/lib/bookmap/websocket';

export interface DepthMatrixState {
    bids: Map<number, number>;
    asks: Map<number, number>;
    trades: Array<{
        price: number;
        quantity: number;
        time: number;
        isBuyerMaker: boolean;
    }>;
    bestBid: number;
    bestAsk: number;
    lastPrice: number;
    lastTradeIsBuy: boolean;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'error';

export function useDepthMatrix(symbol: string) {
    const [status, setStatus] = useState<ConnectionStatus>('connecting');
    const [tick, setTick] = useState(0);

    const dataRef = useRef<DepthMatrixState>({
        bids: new Map(),
        asks: new Map(),
        trades: [],
        bestBid: 0,
        bestAsk: 0,
        lastPrice: 0,
        lastTradeIsBuy: true,
    });

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
            lastTradeIsBuy: true,
        };
        setStatus('connecting');

        // Create WebSocket connection
        wsRef.current = new BinanceWebSocket(symbol, {
            onDepthUpdate: (bidsArr, asksArr) => {
                // Convert arrays to Maps
                const bidsMap = new Map<number, number>();
                const asksMap = new Map<number, number>();

                for (const level of bidsArr) {
                    bidsMap.set(level.price, level.quantity);
                }
                for (const level of asksArr) {
                    asksMap.set(level.price, level.quantity);
                }

                dataRef.current.bids = bidsMap;
                dataRef.current.asks = asksMap;

                // Calculate best bid/ask
                let bestBid = 0;
                let bestAsk = Infinity;
                bidsMap.forEach((_, price) => { if (price > bestBid) bestBid = price; });
                asksMap.forEach((_, price) => { if (price < bestAsk) bestAsk = price; });

                dataRef.current.bestBid = bestBid;
                dataRef.current.bestAsk = bestAsk === Infinity ? 0 : bestAsk;

                // Trigger render (throttled)
                setTick(t => t + 1);
            },
            onTrade: (trade) => {
                dataRef.current.trades.push(trade);
                dataRef.current.lastPrice = trade.price;
                dataRef.current.lastTradeIsBuy = !trade.isBuyerMaker;

                // Keep last 500 trades for analysis
                if (dataRef.current.trades.length > 500) {
                    dataRef.current.trades = dataRef.current.trades.slice(-500);
                }
            },
            onStatusChange: (newStatus) => {
                setStatus(newStatus);
            },
        });

        return () => {
            wsRef.current?.disconnect();
        };
    }, [symbol]);

    // Force re-render periodically for smooth UI updates
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1);
        }, 100);
        return () => clearInterval(interval);
    }, []);

    return {
        dataRef,
        status,
        tick,
    };
}
