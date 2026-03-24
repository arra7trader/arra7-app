const https = require('https');

async function testYahoo() {
    const ticker = 'GC=F';
    const interval = '1h';
    const range = '5d';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${interval}&range=${range}`;
    
    console.log("Fetching:", url);

    https.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log("Status Code:", res.statusCode);
            if (res.statusCode !== 200) {
                console.log("Response:", data.substring(0, 500));
                return;
            }
            try {
                const json = JSON.parse(data);
                const result = json.chart.result[0];
                const timestamps = result.timestamp || [];
                const quote = result.indicators.quote[0];
                let validCount = 0;
                
                for (let i = 0; i < timestamps.length; i++) {
                    if (quote.open[i] !== null && quote.close[i] !== null) {
                        validCount++;
                    }
                }
                
                console.log(`Found ${validCount} valid candles out of ${timestamps.length} timestamps for ${ticker}`);
            } catch (e) {
                console.log("JSON Parse error", e.message);
            }
        });
    }).on('error', (e) => {
        console.error("HTTP Error:", e.message);
    });
}

testYahoo();
