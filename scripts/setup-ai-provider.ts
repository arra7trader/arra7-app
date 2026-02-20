
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
        console.error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN');
        process.exit(1);
    }

    const turso = createClient({ url, authToken });

    console.log('Initializing AI Genesis Provider...');

    // CONSTANTS
    const AI_PROVIDER_ID = 'provider_ai_genesis';
    const AI_USER_ID = 'ai-genesis-system';
    const AI_NAME = 'ARRA Quantum AI';
    const AI_BIO = 'Official AI Trading System. High-accuracy XAUUSD signals powered by SmartPredictor v2.';

    try {
        // 1. Ensure Dummy User Exists
        await turso.execute({
            sql: `INSERT INTO users (id, email, name, image, membership)
                  VALUES (?, ?, ?, ?, 'VVIP')
                  ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
            args: [AI_USER_ID, 'ai.system@arra7.com', AI_NAME, '/assets/ai-avatar.png']
        });
        console.log('User created/updated.');

        // 2. Ensure Signal Provider Exists
        await turso.execute({
            sql: `INSERT INTO signal_providers (
                    id, user_id, display_name, bio, 
                    subscription_fee, profit_sharing_percent, 
                    is_active, is_approved, broker_name
                  )
                  VALUES (?, ?, ?, ?, 0, 0, 1, 1, 'Swissquote')
                  ON CONFLICT(id) DO UPDATE SET 
                    display_name = excluded.display_name,
                    bio = excluded.bio,
                    is_active = 1,
                    is_approved = 1`,
            args: [AI_PROVIDER_ID, AI_USER_ID, AI_NAME, AI_BIO]
        });
        console.log('Signal Provider created/updated.');

        // 3. Ensure Provider Statistics Entry Exists
        await turso.execute({
            sql: `INSERT INTO provider_statistics (id, provider_id)
                  VALUES (?, ?)
                  ON CONFLICT(provider_id) DO NOTHING`,
            args: [`stats_${AI_PROVIDER_ID}`, AI_PROVIDER_ID]
        });
        console.log('Provider Statistics initialized.');

        console.log('✅ AI Genesis Provider Setup Complete!');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
