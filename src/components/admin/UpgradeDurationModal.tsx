'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Durasi & Harga (bisa disesuaikan dengan DB/Konfigurasi nantinya)
export const PROMO_SLOTS = {
    '1_MONTH': { total: 50, used: 25 }, // Dummy data, sebaiknya di-fetch dari API
    '3_MONTHS': { total: 200, used: 198 },
    '6_MONTHS': { total: 100, used: 45 },
};

export const UPGRADE_OPTIONS = [
    {
        id: '1_MONTH',
        duration: 1, // in months
        label: '1 Bulan',
        price: 'Rp 149.000',
        icon: '🥉',
        popular: false,
        promoSlots: PROMO_SLOTS['1_MONTH'].total,
        usedSlots: PROMO_SLOTS['1_MONTH'].used,
    },
    {
        id: '3_MONTHS',
        duration: 3,
        label: '3 Bulan',
        price: 'Rp 299.000',
        icon: '🥈',
        isPopular: true,
        promoSlots: PROMO_SLOTS['3_MONTHS'].total,
        usedSlots: PROMO_SLOTS['3_MONTHS'].used,
    },
    {
        id: '6_MONTHS',
        duration: 6,
        label: '6 Bulan',
        price: 'Rp 499.000',
        icon: '🥇',
        popular: false,
        promoSlots: PROMO_SLOTS['6_MONTHS'].total,
        usedSlots: PROMO_SLOTS['6_MONTHS'].used,
    },
    {
        id: '12_MONTHS',
        duration: 12,
        label: '1 Tahun',
        price: 'Rp 899.000',
        icon: '💎',
        popular: false,
        // Promo slot untuk 1 tahun unlimited (atau undefined)
    },
];

interface UpgradeDurationModalProps {
    isOpen: boolean;
    onClose: () => void;
    membership: 'PRO' | 'VVIP';
    userId: string;
    onSelect?: (option: { label: string; days: number; duration: string; customExpiresAt?: string }) => Promise<void> | void;
    onSuccess?: () => void;
}

export default function UpgradeDurationModal({
    isOpen,
    onClose,
    membership,
    userId,
    onSelect,
    onSuccess
}: UpgradeDurationModalProps) {
    const [selectedDuration, setSelectedDuration] = useState<(typeof UPGRADE_OPTIONS)[0] | null>(null);
    const [customDate, setCustomDate] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch live slot data whenever modal opens
    const [options, setOptions] = useState(UPGRADE_OPTIONS);

    useEffect(() => {
        if (isOpen) {
            fetchPromoSlots();
        }
    }, [isOpen]);

    const fetchPromoSlots = async () => {
        try {
            const res = await fetch('/api/public/promo-slots');
            const data = await res.json();
            if (data.slots) {
                // Update options with live slot data
                const updatedOptions = UPGRADE_OPTIONS.map(opt => {
                    if (data.slots[opt.id]) {
                        return {
                            ...opt,
                            promoSlots: data.slots[opt.id].total,
                            usedSlots: data.slots[opt.id].used
                        };
                    }
                    return opt;
                });
                setOptions(updatedOptions);
            }
        } catch (error) {
            console.error('Failed to fetch promo slots:', error);
            // Fallback to initial options
        }
    };

    const handleSelect = (option: typeof UPGRADE_OPTIONS[0]) => {
        setSelectedDuration(option);
        setCustomDate(''); // Reset custom date if pre-defined duration is selected
        setError(null);
    };

    const handleSelectCustomDate = () => {
        if (!customDate) {
            setError('Pilih tanggal kadaluwarsa terlebih dahulu');
            return;
        }

        const selected = new Date(customDate);
        const now = new Date();

        if (selected <= now) {
            setError('Tanggal harus lebih dari hari ini');
            return;
        }

        setSelectedDuration(null); // Clear predefined selection
        setError(null);
        void handleUpgrade(customDate); // Pass the raw date string (YYYY-MM-DD)
    };

    const confirmSelection = () => {
        if (!selectedDuration) return;

        // Calculate end date from duration
        const end = new Date();
        end.setMonth(end.getMonth() + selectedDuration.duration);

        void handleUpgrade(end.toISOString().split('T')[0]); // YYYY-MM-DD
    };

    const handleUpgrade = async (endDateStr: string) => {
        setLoading(true);
        setError(null);

        try {
            if (onSelect) {
                if (selectedDuration) {
                    const durationCodeMap: Record<string, string> = {
                        '1_MONTH': '1month',
                        '3_MONTHS': '3months',
                        '6_MONTHS': '6months',
                        '12_MONTHS': '1year',
                    };
                    await onSelect({
                        label: selectedDuration.label,
                        days: selectedDuration.duration * 30,
                        duration: durationCodeMap[selectedDuration.id] || '1month',
                    });
                } else {
                    await onSelect({
                        label: 'Tanggal Manual',
                        days: 0,
                        duration: 'custom_date',
                        customExpiresAt: endDateStr,
                    });
                }
            } else {
                const res = await fetch(`/api/admin/users/${userId}/upgrade`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        membership,
                        endDate: endDateStr,
                        packageId: selectedDuration?.id,
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Failed to upgrade user');
                }
            }

            if (onSuccess) onSuccess();
            onClose();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
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
                    className="glass-card w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-[var(--border-light)] sticky top-0 bg-[var(--bg-primary)] z-10">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    Pilih Durasi Upgrade - {membership}
                                </h2>
                                {userId && (
                                    <p className="text-sm text-[var(--text-secondary)] mt-1 truncate max-w-[200px] sm:max-w-xs">
                                        ID: {userId}
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
                    <div className="p-6 space-y-3 overflow-y-auto">
                        {loading ? (
                            <div className="text-center py-8 text-[var(--text-muted)]">Loading slot data...</div>
                        ) : (
                            options.map((option, index) => {
                                const isRecommended = index === 1; // 3 months is recommended
                                const isPromo = option.promoSlots !== undefined;
                                const isSoldOut = isPromo && option.usedSlots >= (option.promoSlots || 0);
                                const remaining = isPromo ? (option.promoSlots || 0) - option.usedSlots : null;
                                const slotsRemaining = (option.promoSlots || 0) - (option.usedSlots || 0);

                                return (
                                    <motion.button
                                        key={option.duration}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => handleSelect(option)}
                                        className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition-all w-full
                                            ${selectedDuration?.id === option.id
                                                ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                                : isRecommended
                                                    ? 'border-blue-500/30 bg-[var(--bg-secondary)] hover:border-blue-500/50'
                                                    : 'border-[var(--border-medium)] bg-[var(--bg-secondary)] hover:border-[var(--border-light)]'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-2xl">{option.icon}</span>
                                                    <span className="font-bold text-[var(--text-primary)]">{option.label}</span>
                                                    {isRecommended && (
                                                        <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-bold shadow-[0_0_8px_rgba(59,130,246,0.4)]">
                                                            REKOMENDASI
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-lg font-semibold text-[var(--text-primary)]">{option.price}</p>
                                                {isPromo && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        {isSoldOut ? (
                                                            <span className="px-2.5 py-1 rounded bg-red-500/15 text-red-400 text-xs font-semibold">
                                                                🔴 SOLD OUT ({option.usedSlots}/{option.promoSlots})
                                                            </span>
                                                        ) : (
                                                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${slotsRemaining > 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
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

                        {error && (
                            <div className="admin-error-box mt-4">
                                {error}
                            </div>
                        )}

                        {selectedDuration && !loading && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                onClick={confirmSelection}
                                className="w-full mt-4 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:bg-blue-700 transition-colors flex justify-center items-center gap-2"
                            >
                                Konfirmasi Upgrade {selectedDuration.label}
                            </motion.button>
                        )}

                        {!loading && (
                            <div className="mt-6 admin-info-box border border-blue-500/30">
                                <p className="text-sm font-semibold flex items-center gap-2"><span>📅</span> Atur Expiry Manual</p>
                                <p className="mt-1 text-xs opacity-80 text-[var(--text-secondary)]">
                                    Gunakan ini jika user upgrade di tengah jalan dan kamu ingin set tanggal akhir spesifik.
                                </p>
                                <div className="mt-3 flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={customDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(event) => setCustomDate(event.target.value)}
                                        className="arra-input flex-1 py-1.5"
                                    />
                                    <button
                                        onClick={handleSelectCustomDate}
                                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-[0_0_10px_rgba(37,99,235,0.2)] transition-colors"
                                    >
                                        Set Tanggal
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Note */}
                    <div className="px-6 pb-6 pt-2 border-t border-[var(--border-light)]">
                        <div className="admin-warning-box mt-4 bg-amber-500/10 border-amber-500/20 text-amber-500/90 text-xs">
                            <p className="font-medium flex items-start gap-2">
                                <span className="shrink-0 mt-0.5">⚠️</span> 
                                <span><strong>Note:</strong> Admin dapat melakukan upgrade tanpa mengurangi slot promo payment gateway. Slot count hanya untuk customer payment via pricing page.</span>
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
