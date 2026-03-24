const fetch = require('node-fetch');

async function testFetch() {
    console.log("Testing Swissquote directly...");
    try {
        const url = 'https://www.swissquote.ch/sq_pi_web/market/price?ticker=XAUUSD&timeframe=1h';
        // Note: The app uses a proxy or specialized fetch for Swissquote, but maybe it's failing in production.
    } catch(e) {}
}

testFetch();
