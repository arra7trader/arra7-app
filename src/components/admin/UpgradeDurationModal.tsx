import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface DurationOption {
    duration: string;
    days: number;
    price: string;
    priceValue: number;
    promoSlots?: number;
    usedSlots?: number;
    label: string;
    icon: string;
    customExpiresAt?: string;
}

interface UpgradeDurationModalProps {
    isOpen: boolean;
    membership: 'PRO' | 'VVIP';
    currentExpiresAt?: string | null;
    onSelect: (option: DurationOption) => void;
    onClose: () => void;
}

const DURATION_OPTIONS: Record<'PRO' | 'VVIP', DurationOption[]> = {
    PRO: [
        {
            duration: '1month',
            days: 30,
            price: 'Rp 99K',
            priceValue: 99000,
            label: '1 Bulan',
            icon: '⚡',
        },
        {
            duration: '3months',
            days: 90,
            price: 'Rp 290K',
            priceValue: 290000,
            promoSlots: 15,
            label: '3 Bulan',
            icon: '🔥',
        },
        {
            duration: '6months',
            days: 180,
            price: 'Rp 590K',
            priceValue: 590000,
            promoSlots: 15,
            label: '6 Bulan',
            icon: '💎',
        },
        {
            duration: '1year',
            days: 365,
            price: 'Rp 1,000K',
            priceValue: 1000000,
            promoSlots: 15,
            label: '1 Tahun',
            icon: '👑',
        },
    ],
    VVIP: [
        {
            duration: '1month',
            days: 30,
            price: 'Rp 249K',
            priceValue: 249000,
            label: '1 Bulan',
            icon: '⚡',
        },
        {
            duration: '3months',
            days: 90,
            price: 'Rp 740K',
            priceValue: 740000,
            promoSlots: 15,
            label: '3 Bulan',
            icon: '🔥',
        },
        {
            duration: '6months',
            days: 180,
            price: 'Rp 1,490K',
            priceValue: 1490000,
            promoSlots: 15,
            label: '6 Bulan',
            icon: '💎',
        },
        {
            duration: '1year',
            days: 365,
            price: 'Rp 2,800K',
            priceValue: 2800000,
            promoSlots: 15,
            label: '1 Tahun',
            icon: '👑',
        },
    ],
};

export default function UpgradeDurationModal({ isOpen, membership, currentExpiresAt, onSelect, onClose }: UpgradeDurationModalProps) {
    const [slots, setSlots] = useState<Record<string, { used: number; remaining: number; max: number }>>({});
    const [loading, setLoading] = useState(true);
    const [customDate, setCustomDate] = useState('');

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            fetchSlots();
            const base = new Date();
            base.setDate(base.getDate() + 30);
            setCustomDate(base.toISOString().split('T')[0]);
        }
    }, [isOpen]);

    const fetchSlots = async () => {
        try {
            const response = await fetch('/api/pricing/slots');
            const data = await response.json();
            if (data.status === 'success') {
                setSlots(data.slots[membership] || {});
            }
        } catch (error) {
            console.error('Fetch slots error:', error);
        } finally {
            setLoading(false);
        }
    };

    const options = DURATION_OPTIONS[membership].map((opt) => {
        const slotInfo = slots[opt.duration];
        return {
            ...opt,
            usedSlots: slotInfo?.used || 0,
            promoSlots: opt.promoSlots || undefined,
        };
    });

    const handleSelect = (option: DurationOption) => {
        // Admin can upgrade regardless of slot availability
        onSelect(option);
    };

    const handleSelectCustomDate = () => {
        if (!customDate) return;
        const selected = new Date(`${customDate}T23:59:59`);
        if (Number.isNaN(selected.getTime())) return;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selected < today) return;

        const now = new Date();
        const diffMs = selected.getTime() - now.getTime();
        const diffDays = Math.max(1, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

        onSelect({
            duration: 'custom_date',
            days: diffDays,
            price: 'Manual Date',
            priceValue: 0,
            label: `Sampai ${selected.toLocaleDateString('id-ID')}`,
            icon: '📅',
            customExpiresAt: selected.toISOString(),
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[var(--bg-primary)] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[var(--border-light)] sticky top-0 bg-[var(--bg-primary)] z-10">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    Pilih Durasi Upgrade - {membership}
                                </h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">Pilih paket durasi untuk user</p>
                                {currentExpiresAt && (
                                    <p className="text-xs text-emerald-600 mt-2">
                                        Expiry saat ini: {new Date(currentExpiresAt).toLocaleDateString('id-ID')}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Options */}
                    <div className="p-6 space-y-3">
                        {loading ? (
                            <div className="text-center py-8 text-gray-400">Loading slot data...</div>
                        ) : (
                            options.map((option, index) => {
                                const isRecommended = index === 1; // 3 months is recommended
                                const isPromo = option.promoSlots !== undefined;
                                const isSoldOut = isPromo && option.usedSlots >= (option.promoSlots || 0);
                                const remaining = isPromo ? (option.promoSlots || 0) - option.usedSlots : null;

                                return (
                                    <motion.button
                                        key={option.duration}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => handleSelect(option)}
                                        className={`
                                            w-full p-4 rounded-xl border-2 text-left transition-all
                                            ${isRecommended
                                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                : 'border-[var(--border-light)] hover:border-blue-300 hover:bg-[var(--bg-secondary)]'
                                            }
                                        `}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-2xl">{option.icon}</span>
                                                    <span className="font-bold text-[var(--text-primary)]">{option.label}</span>
                                                    {isRecommended && (
                                                        <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-bold">
                                                            REKOMENDASI
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-lg font-semibold text-[var(--text-primary)]">{option.price}</p>
                                                {isPromo && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        {isSoldOut ? (
                                                            <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold">
                                                                🔴 SOLD OUT ({option.usedSlots}/{option.promoSlots})
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">
                                                                ✅ Promo: Sisa {remaining}/{option.promoSlots} slot
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {!isPromo && (
                                                    <p className="text-xs text-[var(--text-secondary)] mt-1">Standard pricing</p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })
                        )}

                        {!loading && (
                            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                                <p className="text-sm font-semibold text-blue-900">Atur Expiry Manual</p>
                                <p className="mt-1 text-xs text-blue-700">
                                    Gunakan ini jika user upgrade di tengah jalan dan kamu ingin set tanggal akhir spesifik.
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={customDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(event) => setCustomDate(event.target.value)}
                                        className="flex-1 rounded-lg border border-blue-200 bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    />
                                    <button
                                        onClick={handleSelectCustomDate}
                                        className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                                    >
                                        Set Tanggal
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Note */}
                    <div className="px-6 pb-6">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-xs text-amber-800">
                                <strong>Note:</strong> Admin dapat upgrade tanpa batasan slot promo. Slot count hanya untuk customer payment via pricing page.
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-[var(--border-light)] bg-[var(--bg-secondary)] sticky bottom-0">
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-xl border border-[var(--border-medium)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-secondary)] transition-colors"
                        >
                            Batal
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
