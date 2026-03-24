import { getBrokerPrice, getMarketData } from './src/lib/market-data';

async function test() {
    console.log("Testing Swissquote...");
    try {
        const d1 = await getBrokerPrice('XAUUSD' as any, '1h' as any, 'swissquote');
        console.log(`Swissquote returned ${d1.candles?.length || 0} candles, price: ${d1.current_price}`);
    } catch (e: any) {
        console.log("Swissquote failed:", e.message);
    }

    console.log("\nTesting Yahoo...");
    try {
        const d2 = await getMarketData('XAUUSD' as any, '1h' as any);
        console.log(`Yahoo returned ${d2.candles?.length || 0} candles, price: ${d2.current_price}`);
    } catch (e: any) {
        console.log("Yahoo failed:", e.message);
    }
}

test();
