
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const turso = createClient({ url: url!, authToken: authToken! });

async function check() {
    console.log('--- Checking DB Signals ---');
    try {
        const prov = await turso.execute("SELECT * FROM signal_providers WHERE id = 'dummy_prov_1'");
        console.log('Provider found:', prov.rows.length > 0);

        const sigs = await turso.execute("SELECT COUNT(*) as count FROM provider_signals WHERE provider_id = 'dummy_prov_1'");
        console.log('Signal Count:', sigs.rows[0].count);

        const sample = await turso.execute("SELECT * FROM provider_signals WHERE provider_id = 'dummy_prov_1' LIMIT 1");
        console.log('Sample Signal:', sample.rows[0]);

    } catch (e) {
        console.error('Check Error:', e);
    }
}
check();
