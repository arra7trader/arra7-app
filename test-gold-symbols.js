// Test different Gold symbols
const GOLD_SYMBOLS = [
    'GC=F',      // Gold Futures
    'XAUUSD=X',  // Current (failing)
    'GLD',       // Gold ETF
    '^XAU',      // Gold Index
];

async function testGoldSymbols() {
    for (const symbol of GOLD_SYMBOLS) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1h&range=1d`;
            console.log(`\nTesting: ${symbol}`);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });

            console.log(`  Status: ${response.status}`);

            if (response.ok) {
                const data = await response.json();
                const result = data.chart?.result?.[0];

                if (result && result.meta) {
                    console.log(`  ✅ WORKS! Price: ${result.meta.regularMarketPrice}`);
                    console.log(`  Currency: ${result.meta.currency}`);
                    console.log(`  Exchange: ${result.meta.exchangeName}`);
                } else {
                    console.log(`  ❌ No data`);
                }
            } else {
                console.log(`  ❌ Failed`);
            }

        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
    }
}

testGoldSymbols();
