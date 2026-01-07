import { NextResponse } from 'next/server';

// ML Backend URL
const ML_BACKEND_URL = process.env.ML_BACKEND_URL || 'http://localhost:8001';

export async function GET() {
    try {
        // Try to get status from ML backend
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
            const [statusRes, btcModelsRes, xauModelsRes] = await Promise.allSettled([
                fetch(`${ML_BACKEND_URL}/health`, { signal: controller.signal }),
                fetch(`${ML_BACKEND_URL}/models/BTCUSD`, { signal: controller.signal }),
                fetch(`${ML_BACKEND_URL}/models/XAUUSD`, { signal: controller.signal }),
            ]);

            clearTimeout(timeoutId);

            // Check if backend is healthy
            if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
                const healthData = await statusRes.value.json();

                // Collect model info
                let totalModels = 0;
                const symbols: string[] = [];
                const performance: Record<string, any> = {};

                if (btcModelsRes.status === 'fulfilled' && btcModelsRes.value.ok) {
                    const btcData = await btcModelsRes.value.json();
                    symbols.push('BTCUSD');
                    totalModels += Object.keys(btcData.models || {}).length;
                }

                if (xauModelsRes.status === 'fulfilled' && xauModelsRes.value.ok) {
                    const xauData = await xauModelsRes.value.json();
                    symbols.push('XAUUSD');
                }

                // Try to get performance data
                try {
                    const perfRes = await fetch(`${ML_BACKEND_URL}/performance/BTCUSD`, {
                        signal: AbortSignal.timeout(2000)
                    });
                    if (perfRes.ok) {
                        const perfData = await perfRes.json();
                        Object.assign(performance, perfData);
                    }
                } catch {
                    // Performance data not available
                }

                return NextResponse.json({
                    available: true,
                    status: 'online',
                    models_loaded: healthData.models_loaded || totalModels,
                    symbols,
                    default_model: 'ensemble',
                    performance,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            // Backend not available
        }

        // Fallback status when ML backend is offline
        return NextResponse.json({
            available: false,
            status: 'offline',
            models_loaded: 0,
            symbols: ['BTCUSD', 'XAUUSD'],
            default_model: 'heuristic',
            message: 'ML backend offline, using heuristic predictions',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('ML Status Error:', error);
        return NextResponse.json({
            available: false,
            status: 'error',
            models_loaded: 0,
            symbols: [],
            default_model: 'heuristic',
            error: 'Failed to check ML status'
        }, { status: 500 });
    }
}
