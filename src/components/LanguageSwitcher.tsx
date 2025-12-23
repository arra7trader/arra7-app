'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
    const locale = useLocale();
    const [isPending, startTransition] = useTransition();
    const [currentLocale, setCurrentLocale] = useState(locale);

    const toggleLocale = () => {
        const newLocale = currentLocale === 'en' ? 'id' : 'en';

        startTransition(() => {
            // Set cookie and reload to apply new locale
            document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
            setCurrentLocale(newLocale);
            window.location.reload();
        });
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleLocale}
            disabled={isPending}
            className={`
        relative flex items-center gap-1.5 px-3 py-1.5 rounded-full
        bg-[#12141A] border border-[#1F2937] hover:border-[#374151]
        text-sm font-medium transition-all
        ${isPending ? 'opacity-50 cursor-wait' : ''}
      `}
        >
            <span className={currentLocale === 'en' ? 'text-white' : 'text-[#64748B]'}>
                EN
            </span>
            <span className="text-[#374151]">/</span>
            <span className={currentLocale === 'id' ? 'text-white' : 'text-[#64748B]'}>
                ID
            </span>

            {/* Active Indicator */}
            <motion.div
                layoutId="locale-indicator"
                className="absolute inset-0 rounded-full"
                style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
        </motion.button>
    );
}
