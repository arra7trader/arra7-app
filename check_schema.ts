
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
});

async function checkSchema() {
    console.log('--- Checking Schema ---');
    try {
        const res = await turso.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='provider_daily_stats'");
        console.log(res.rows[0]?.sql);
    } catch (e) {
        console.error(e);
    }
}
checkSchema();
