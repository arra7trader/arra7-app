
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars first
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import the metrics calculation function
import { updateProviderStats } from './src/lib/analysis/provider-metrics';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error('Missing TURSO credentials');
    process.exit(1);
}

async function run() {
    console.log('--- Recalculating Stats ---');
    try {
        let providerId = 'dummy_prov_1';
        console.log(`Calculating stats for ${providerId}...`);
        await updateProviderStats(providerId);
        console.log('Done! Stats updated.');
    } catch (e) {
        console.error('Recalc Error:', e);
    }
}

run();
