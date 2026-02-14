'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/solid';
import { useTranslations } from 'next-intl';

interface MaintenanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName: string;
}

export default function MaintenanceModal({ isOpen, onClose, featureName }: MaintenanceModalProps) {
    const t = useTranslations('maintenance');

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", duration: 0.5 }}
                            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6 text-gray-500" />
                            </button>

                            {/* Icon */}
                            <div className="flex justify-center mb-6">
                                <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center">
                                    <WrenchScrewdriverIcon className="w-10 h-10 text-orange-500" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                                    {t('title')}
                                </h2>
                                <p className="text-[var(--text-secondary)] mb-2">
                                    <span className="font-semibold text-[var(--text-primary)]">{featureName}</span> {t('message')}
                                </p>
                                <p className="text-sm text-[var(--text-muted)] mb-6">
                                    {t('info')}
                                </p>

                                {/* Button */}
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 px-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                                >
                                    {t('button')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
