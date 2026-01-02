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
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private isManualClose = false;
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
        this.callbacks = callbacks;
    }

    connect() {
        if (this.isManualClose) return;

        this.callbacks.onStatusChange?.('connecting');

        // Use combined streams for depth and trades
        const streamUrl = `wss://stream.binance.com:9443/stream?streams=${this.symbol}@depth20@100ms/${this.symbol}@trade`;

        console.log(`[Bookmap] Connecting to ${streamUrl}`);

        try {
            this.ws = new WebSocket(streamUrl);
        } catch (error) {
            console.error('[Bookmap] Failed to create WebSocket:', error);
            this.callbacks.onStatusChange?.('error');
            return;
        }

        this.ws.onopen = () => {
            console.log('[Bookmap] Connected to Binance WebSocket');
            this.reconnectAttempts = 0;
            this.callbacks.onStatusChange?.('connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const data = message.data;

                if (!data) return;

                // Handle Depth Update (depth20 snapshot)
                if (message.stream && message.stream.includes('@depth20')) {
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
                console.log(`[Bookmap] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                setTimeout(() => this.connect(), delay);
            } else {
                console.error('[Bookmap] Max reconnection attempts reached');
                this.callbacks.onStatusChange?.('error');
            }
        };

        this.ws.onerror = (error) => {
            console.error('[Bookmap] WebSocket error:', error);
            // Don't set error status here, let onclose handle it
        };
    }

    disconnect() {
        this.isManualClose = true;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
