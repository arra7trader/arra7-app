export type OrderBookLevel = {
    price: number;
    quantity: number;
};

export type Trade = {
    price: number;
    quantity: number;
    time: number;
    isBuyerMaker: boolean;
};

type DepthSnapshot = {
    lastUpdateId: number;
    bids: [string, string][];
    asks: [string, string][];
};

type DiffDepthEvent = {
    e: string;      // Event type
    E: number;      // Event time
    s: string;      // Symbol
    U: number;      // First update ID
    u: number;      // Final update ID
    b: [string, string][];  // Bids delta
    a: [string, string][];  // Asks delta
};

export class BinanceWebSocket {
    private ws: WebSocket | null = null;
    private symbol: string;
    private upperSymbol: string;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private isManualClose = false;

    // Order book state
    private orderBook: {
        bids: Map<number, number>;
        asks: Map<number, number>;
        lastUpdateId: number;
    } = { bids: new Map(), asks: new Map(), lastUpdateId: 0 };

    // Buffer for events before snapshot
    private eventBuffer: DiffDepthEvent[] = [];
    private snapshotReceived = false;

    private callbacks: {
        onDepthUpdate: (bids: OrderBookLevel[], asks: OrderBookLevel[]) => void;
        onTrade: (trade: Trade) => void;
        onStatusChange?: (status: 'connecting' | 'connected' | 'error') => void;
    };

    constructor(
        symbol: string,
        callbacks: {
            onDepthUpdate: (bids: OrderBookLevel[], asks: OrderBookLevel[]) => void;
            onTrade: (trade: Trade) => void;
            onStatusChange?: (status: 'connecting' | 'connected' | 'error') => void;
        }
    ) {
        this.symbol = symbol.toLowerCase();
        this.upperSymbol = symbol.toUpperCase();
        this.callbacks = callbacks;
    }

    async connect() {
        if (this.isManualClose) return;

        this.callbacks.onStatusChange?.('connecting');

        // Reset state
        this.orderBook = { bids: new Map(), asks: new Map(), lastUpdateId: 0 };
        this.eventBuffer = [];
        this.snapshotReceived = false;

        // 1. Open WebSocket for diff depth and trades
        const streamUrl = `wss://stream.binance.com:9443/stream?streams=${this.symbol}@depth@100ms/${this.symbol}@trade`;

        console.log(`[Bookmap] Connecting to ${streamUrl}`);

        try {
            this.ws = new WebSocket(streamUrl);
        } catch (error) {
            console.error('[Bookmap] Failed to create WebSocket:', error);
            this.callbacks.onStatusChange?.('error');
            return;
        }

        this.ws.onopen = async () => {
            console.log('[Bookmap] WebSocket connected, fetching snapshot...');
            this.reconnectAttempts = 0;

            // 2. Fetch snapshot via REST API (1000 levels)
            try {
                const snapshot = await this.fetchSnapshot();
                this.processSnapshot(snapshot);
                this.snapshotReceived = true;

                // 3. Process buffered events
                this.processBufferedEvents();

                this.callbacks.onStatusChange?.('connected');
                console.log(`[Bookmap] Order book initialized with ${this.orderBook.bids.size} bids and ${this.orderBook.asks.size} asks`);
            } catch (error) {
                console.error('[Bookmap] Failed to fetch snapshot:', error);
                this.callbacks.onStatusChange?.('error');
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const data = message.data;
                if (!data) return;

                // Handle Diff Depth Update
                if (message.stream && message.stream.includes('@depth')) {
                    if (!this.snapshotReceived) {
                        // Buffer events until we have the snapshot
                        this.eventBuffer.push(data as DiffDepthEvent);
                    } else {
                        // Process event directly
                        this.processDiffEvent(data as DiffDepthEvent);
                    }
                }

                // Handle Trade Update
                if (data.e === 'trade') {
                    const trade: Trade = {
                        price: parseFloat(data.p),
                        quantity: parseFloat(data.q),
                        time: data.T,
                        isBuyerMaker: data.m,
                    };
                    this.callbacks.onTrade(trade);
                }
            } catch (error) {
                console.error('[Bookmap] Error parsing message:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log(`[Bookmap] WebSocket disconnected. Code: ${event.code}`);

            if (this.isManualClose) return;

            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
                console.log(`[Bookmap] Reconnecting in ${delay / 1000}s`);
                setTimeout(() => this.connect(), delay);
            } else {
                this.callbacks.onStatusChange?.('error');
            }
        };

        this.ws.onerror = (error) => {
            console.error('[Bookmap] WebSocket error:', error);
        };
    }

    private async fetchSnapshot(): Promise<DepthSnapshot> {
        // Fetch 1000 levels from REST API
        const url = `https://api.binance.com/api/v3/depth?symbol=${this.upperSymbol}&limit=1000`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    private processSnapshot(snapshot: DepthSnapshot) {
        this.orderBook.lastUpdateId = snapshot.lastUpdateId;

        // Clear and populate bids
        this.orderBook.bids.clear();
        snapshot.bids.forEach(([price, qty]) => {
            const p = parseFloat(price);
            const q = parseFloat(qty);
            if (q > 0) {
                this.orderBook.bids.set(p, q);
            }
        });

        // Clear and populate asks
        this.orderBook.asks.clear();
        snapshot.asks.forEach(([price, qty]) => {
            const p = parseFloat(price);
            const q = parseFloat(qty);
            if (q > 0) {
                this.orderBook.asks.set(p, q);
            }
        });

        this.emitOrderBook();
    }

    private processBufferedEvents() {
        // Filter events that are relevant (U <= lastUpdateId+1 AND u >= lastUpdateId+1)
        let foundFirst = false;

        for (const event of this.eventBuffer) {
            if (!foundFirst) {
                // First event to process: U <= lastUpdateId+1 AND u >= lastUpdateId+1
                if (event.U <= this.orderBook.lastUpdateId + 1 && event.u >= this.orderBook.lastUpdateId + 1) {
                    foundFirst = true;
                    this.applyDiffEvent(event);
                }
            } else {
                // Subsequent events
                this.applyDiffEvent(event);
            }
        }

        this.eventBuffer = [];
    }

    private processDiffEvent(event: DiffDepthEvent) {
        // Validate event sequence
        if (event.u <= this.orderBook.lastUpdateId) {
            // Old event, ignore
            return;
        }

        this.applyDiffEvent(event);
    }

    private applyDiffEvent(event: DiffDepthEvent) {
        // Apply bid updates
        event.b.forEach(([price, qty]) => {
            const p = parseFloat(price);
            const q = parseFloat(qty);
            if (q === 0) {
                this.orderBook.bids.delete(p);
            } else {
                this.orderBook.bids.set(p, q);
            }
        });

        // Apply ask updates
        event.a.forEach(([price, qty]) => {
            const p = parseFloat(price);
            const q = parseFloat(qty);
            if (q === 0) {
                this.orderBook.asks.delete(p);
            } else {
                this.orderBook.asks.set(p, q);
            }
        });

        this.orderBook.lastUpdateId = event.u;
        this.emitOrderBook();
    }

    private emitOrderBook() {
        // Convert maps to arrays for callback
        const bids: OrderBookLevel[] = Array.from(this.orderBook.bids.entries())
            .map(([price, quantity]) => ({ price, quantity }));

        const asks: OrderBookLevel[] = Array.from(this.orderBook.asks.entries())
            .map(([price, quantity]) => ({ price, quantity }));

        this.callbacks.onDepthUpdate(bids, asks);
    }

    disconnect() {
        this.isManualClose = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
