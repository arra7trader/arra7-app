
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const turso = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
});

async function migrate() {
    console.log('--- Migrating Users Table for Subscription ---');
    try {
        // Check if columns exist (naive check by trying to add them)
        // SQLite allows ADD COLUMN one by one.

        try {
            await turso.execute("ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free'");
            console.log('Added subscription_status');
        } catch (e: any) {
            if (!e.message.includes('duplicate column')) console.error(e);
        }

        try {
            await turso.execute("ALTER TABLE users ADD COLUMN subscription_end_date DATETIME");
            console.log('Added subscription_end_date');
        } catch (e: any) {
            if (!e.message.includes('duplicate column')) console.error(e);
        }

        try {
            await turso.execute("ALTER TABLE users ADD COLUMN telegram_chat_id TEXT");
            console.log('Added telegram_chat_id');
        } catch (e: any) {
            if (!e.message.includes('duplicate column')) console.error(e);
        }

        console.log('Migration Complete.');
    } catch (e) {
        console.error('Migration Error:', e);
    }
}

migrate();
