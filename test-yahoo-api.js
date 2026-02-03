// Quick test script to debug Yahoo Finance API
const XAUUSD_YAHOO = 'XAUUSD=X';

async function testYahooAPI() {
    const hosts = ['query2.finance.yahoo.com', 'query1.finance.yahoo.com'];

    for (const host of hosts) {
        try {
            const timestamp = new Date().getTime();
            const url = `https://${host}/v8/finance/chart/${XAUUSD_YAHOO}?interval=1h&range=5d&_=${timestamp}`;

            console.log(`\nTesting: ${url}`);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                },
            });

            console.log(`Status: ${response.status}`);

            if (!response.ok) {
                console.error(`Failed: ${response.status} ${response.statusText}`);
                continue;
            }

            const data = await response.json();
            const result = data.chart?.result?.[0];

            if (!result) {
                console.error('No result in response');
                console.log(JSON.stringify(data, null, 2));
                continue;
            }

            const meta = result.meta;
            const timestamps = result.timestamp || [];
            const quote = result.indicators?.quote?.[0];

            console.log(`✅ Success from ${host}`);
            console.log(`Regular Market Price: ${meta.regularMarketPrice}`);
            console.log(`Total candles: ${timestamps.length}`);

            if (timestamps.length > 0) {
                const lastTime = new Date(timestamps[timestamps.length - 1] * 1000);
                const freshness = (Date.now() - lastTime.getTime()) / 1000;
                console.log(`Last candle time: ${lastTime.toISOString()}`);
                console.log(`Freshness: ${Math.floor(freshness)}s (${Math.floor(freshness / 60)}m ago)`);
                console.log(`Last close: ${quote.close[quote.close.length - 1]}`);
            }

            return; // Success!

        } catch (error) {
            console.error(`Error with ${host}:`, error.message);
        }
    }

    console.error('\n❌ All Yahoo Finance endpoints failed!');
}

testYahooAPI();
