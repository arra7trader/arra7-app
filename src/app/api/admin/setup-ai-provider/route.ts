import { NextRequest, NextResponse } from 'next/server';
import getTursoClient from '@/lib/turso';

export async function GET(request: NextRequest) {
    return handleSetup(request);
}

export async function POST(request: NextRequest) {
    return handleSetup(request);
}

async function handleSetup(request: NextRequest) {
    try {
        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
        }

        // CONSTANTS
        const AI_PROVIDER_ID = 'provider_ai_genesis';
        const AI_USER_ID = 'ai-genesis-system';
        const AI_NAME = 'ARRA Quantum AI';
        const AI_BIO = 'Official AI Trading System. High-accuracy XAUUSD signals powered by SmartPredictor v2.';

        // 1. Ensure Dummy User Exists
        await turso.execute({
            sql: `INSERT INTO users (id, email, name, image, membership)
                  VALUES (?, ?, ?, ?, 'VVIP')
                  ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
            args: [AI_USER_ID, 'ai.system@arra7.com', AI_NAME, '/assets/ai-avatar.png']
        });

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

        // 3. Ensure Provider Statistics Entry Exists
        await turso.execute({
            sql: `INSERT INTO provider_statistics (id, provider_id)
                  VALUES (?, ?)
                  ON CONFLICT(provider_id) DO NOTHING`,
            args: [`stats_${AI_PROVIDER_ID}`, AI_PROVIDER_ID]
        });

        return NextResponse.json({
            success: true,
            message: 'AI Genesis Provider initialized successfully',
            providerId: AI_PROVIDER_ID
        });

    } catch (error: any) {
        console.error('[SetupAI] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
