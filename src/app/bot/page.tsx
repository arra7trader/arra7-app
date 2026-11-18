'use client';

import AutoTradingDashboard from '@/components/trading/AutoTradingDashboard';
import PremiumGuard from '@/components/layout/PremiumGuard';

export default function TradingBotPage() {
    return (
        <PremiumGuard minTier="PRO" title="Trading Bot">
            <div className="p-6 max-w-7xl mx-auto">
                <AutoTradingDashboard />
            </div>
        </PremiumGuard>
    );
}
