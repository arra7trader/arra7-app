'use client';

import { useEffect, useState } from 'react';
import { DEPTH_MATRIX_THEME } from '@/lib/depth-matrix/theme';
import { WhaleAlert } from '@/lib/depth-matrix/analytics';

const theme = DEPTH_MATRIX_THEME;

interface WhaleAlertPopupProps {
    alerts: WhaleAlert[];
    onDismiss: (id: string) => void;
}

export default function WhaleAlertPopup({ alerts, onDismiss }: WhaleAlertPopupProps) {
    return (
        <div className="fixed bottom-20 left-4 flex flex-col gap-2 z-50 pointer-events-none">
            {alerts.slice(0, 3).map((alert) => (
                <WhaleCard key={alert.id} alert={alert} onDismiss={onDismiss} />
            ))}
        </div>
    );
}

function WhaleCard({ alert, onDismiss }: { alert: WhaleAlert; onDismiss: (id: string) => void }) {
    const [visible, setVisible] = useState(true);
    const isBuy = alert.side === 'buy';
    const colors = isBuy ? theme.whaleBuy : theme.whaleSell;

    // Auto-dismiss after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onDismiss(alert.id), 300);
        }, 5000);
        return () => clearTimeout(timer);
    }, [alert.id, onDismiss]);

    if (!visible) return null;

    return (
        <div
            className={`
                pointer-events-auto
                flex items-center gap-3 px-4 py-3 rounded-xl border
                animate-slide-in-left
                transition-all duration-300
                backdrop-blur-lg
            `}
            style={{
                background: colors.bg,
                borderColor: colors.border,
                boxShadow: `0 0 20px ${colors.glow}`
            }}
        >
            {/* Icon */}
            <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: `${colors.border}30` }}
            >
                <span className="text-xl">🐋</span>
            </div>

            {/* Content */}
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{ color: colors.border }}
                    >
                        {isBuy ? 'Whale BUY' : 'Whale SELL'}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: theme.textMuted }}>
                        {alert.symbol}
                    </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                    <span
                        className="text-lg font-mono font-bold"
                        style={{ color: isBuy ? theme.bullish : theme.bearish }}
                    >
                        {formatQuantity(alert.quantity)}
                    </span>
                    <span className="text-sm font-mono" style={{ color: theme.textSecondary }}>
                        @ {formatPrice(alert.price)}
                    </span>
                </div>
            </div>

            {/* Close button */}
            <button
                onClick={() => onDismiss(alert.id)}
                className="ml-2 p-1 rounded-full hover:bg-white/10 transition-colors"
                style={{ color: theme.textMuted }}
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

function formatQuantity(qty: number): string {
    if (qty >= 1000) return `${(qty / 1000).toFixed(1)}K`;
    if (qty >= 1) return qty.toFixed(2);
    return qty.toFixed(4);
}

function formatPrice(price: number): string {
    if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (price >= 100) return price.toFixed(1);
    return price.toFixed(2);
}
