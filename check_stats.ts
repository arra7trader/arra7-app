
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const turso = createClient({ url: url!, authToken: authToken! });

async function checkStats() {
    console.log('--- Checking User Stats ---');
    try {
        const result = await turso.execute("SELECT id, name, stats_win_rate, stats_profit_factor, stats_total_pips FROM users WHERE id = 'dummy_user_1'");
        if (result.rows.length > 0) {
            console.log('User Stats:', result.rows[0]);
        } else {
            console.log('User not found!');
        }
    } catch (e) {
        console.error('Check Error:', e);
    }
}
checkStats();
