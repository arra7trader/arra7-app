export type OrderBookLevel = {
    price: number;
    quantity: number;
};

export type Trade = {
    price: number;
    quantity: number;
    time: number;
    isBuyerMaker: boolean; // true = sell, false = buy
};

export type BookmapData = {
    bids: Map<number, number>; // price -> quantity
    asks: Map<number, number>; // price -> quantity
    trades: Trade[];
};

type DepthUpdate = {
    e: string; // Event type
    E: number; // Event time
    s: string; // Symbol
    U: number; // First update ID in event
    u: number; // Final update ID in event
    b: [string, string][]; // Bids to be updated [price, quantity]
    a: [string, string][]; // Asks to be updated [price, quantity]
};

type TradeUpdate = {
    e: string; // Event type
    E: number; // Event time
    s: string; // Symbol
    p: string; // Price
    q: string; // Quantity
    T: number; // Trade time
    m: boolean; // Is the buyer the market maker?
};

export class BinanceWebSocket {
    private ws: WebSocket | null = null;
    private symbol: string;
    private callbacks: {
        onDepthUpdate: (bids: OrderBookLevel[], asks: OrderBookLevel[]) => void;
        onTrade: (trade: Trade) => void;
    };

    constructor(
        symbol: string,
        callbacks: {
            onDepthUpdate: (bids: OrderBookLevel[], asks: OrderBookLevel[]) => void;
            onTrade: (trade: Trade) => void;
        }
    ) {
        this.symbol = symbol.toLowerCase();
        this.callbacks = callbacks;
    }

    connect() {
        // We use combined streams for depth and trades
        // depth20@100ms for faster updates, trade for real-time trades
        const streamUrl = `wss://stream.binance.com:9443/stream?streams=${this.symbol}@depth20@100ms/${this.symbol}@trade`;

        console.log(`[Bookmap] Connecting to ${streamUrl}`);
        this.ws = new WebSocket(streamUrl);

        this.ws.onopen = () => {
            console.log('[Bookmap] Connected to Binance WebSocket');
        };

        this.ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            const data = message.data;

            if (!data) return;

            // Handle Depth Update
            if (data.e === 'depthUpdate' || message.stream.includes('@depth20')) {
                // Determine structure based on depth20 vs depthUpdate
                // depth20 sends a snapshot-like structure slightly different
                // But for @depth20 stream, data has 'bids' and 'asks' directly usually in snapshot mode
                // Wait, @depth20 is partial book depth. 
                // Structure: { lastUpdateId, bids: [[price, qty], ...], asks: [[price, qty], ...] }

                const bids: OrderBookLevel[] = (data.bids || []).map((b: string[]) => ({
                    price: parseFloat(b[0]),
                    quantity: parseFloat(b[1]),
                }));

                const asks: OrderBookLevel[] = (data.asks || []).map((a: string[]) => ({
                    price: parseFloat(a[0]),
                    quantity: parseFloat(a[1]),
                }));

                this.callbacks.onDepthUpdate(bids, asks);
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
        };

        this.ws.onclose = () => {
            console.log('[Bookmap] WebSocket disconnected. Reconnecting in 5s...');
            setTimeout(() => this.connect(), 5000);
        };

        this.ws.onerror = (error) => {
            console.error('[Bookmap] WebSocket error:', error);
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
