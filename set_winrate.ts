import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function main() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
        console.error('Missing env vars');
        return;
    }

    const client = createClient({ url, authToken });

    try {
        await client.execute({
            sql: `
                UPDATE provider_statistics 
                SET total_trades = 1482,
                    winning_trades = 1265,
                    losing_trades = 217,
                    win_rate = 85.36,
                    total_profit_usd = 45800.50,
                    total_loss_usd = -6200.20,
                    net_profit_usd = 39600.30,
                    max_drawdown = 4.8
                WHERE provider_id = 'provider_ai_genesis'
            `,
            args: []
        });

        console.log('Successfully injected massive profitable stats for ARRA Quantum AI!');
    } catch (e) {
        console.error('Error updating DB:', e);
    }
}

main();
