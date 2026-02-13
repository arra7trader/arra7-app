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
}

interface UpgradeDurationModalProps {
    isOpen: boolean;
    membership: 'PRO' | 'VVIP';
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

export default function UpgradeDurationModal({ isOpen, membership, onSelect, onClose }: UpgradeDurationModalProps) {
    const [slots, setSlots] = useState<Record<string, { used: number; remaining: number; max: number }>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchSlots();
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
                    className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    Pilih Durasi Upgrade - {membership}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Pilih paket durasi untuk user</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                                            }
                                        `}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-2xl">{option.icon}</span>
                                                    <span className="font-bold text-gray-900">{option.label}</span>
                                                    {isRecommended && (
                                                        <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-bold">
                                                            REKOMENDASI
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-lg font-semibold text-gray-700">{option.price}</p>
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
                                                    <p className="text-xs text-gray-500 mt-1">Standard pricing</p>
                                                )}
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })
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
                    <div className="p-6 border-t border-gray-100 bg-gray-50 sticky bottom-0">
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                        >
                            Batal
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
