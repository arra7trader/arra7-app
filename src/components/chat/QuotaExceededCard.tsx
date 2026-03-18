import { LockIcon, GemIcon } from '@/components/PremiumIcons';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface QuotaExceededCardProps {
    message?: string;
    limitType?: 'FOREX' | 'STOCK';
}

export default function QuotaExceededCard({ message, limitType = 'FOREX' }: QuotaExceededCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="bg-gradient-to-br from-red-900/40 to-slate-900 border border-red-500/30 rounded-xl p-6 text-center max-w-sm mx-auto my-4 shadow-2xl relative overflow-hidden"
        >
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />

            <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="bg-red-500/20 p-3 rounded-full mb-1 ring-1 ring-red-500/50">
                    <LockIcon size="xl" className="text-red-400" />
                </div>

                <h3 className="text-lg font-bold text-white">
                    {limitType === 'STOCK' ? 'Daily Stock Limit Reached' : 'Daily Analysis Limit Reached'}
                </h3>

                <p className="text-sm text-slate-300 leading-relaxed mb-2">
                    {message || "You've hit your daily free analysis limit. Upgrade to PRO for unlimited access and advanced features."}
                </p>

                <div className="w-full h-px bg-slate-700/50 my-2" />

                <div className="flex flex-col gap-2 w-full">
                    <Link href="/pricing" className="block w-full">
                        <motion.button
                            whileHover={{ scale: 1.02, backgroundColor: '#dc2626' }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
                        >
                            <span>Upgrade to PRO</span>
                            {/* Arrow or Icon */}
                        </motion.button>
                    </Link>

                    <button className="text-xs text-[var(--text-secondary)] hover:text-slate-400 underline decoration-slate-700">
                        View Plan Comparison
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
