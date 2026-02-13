'use client';

import { motion } from 'framer-motion';
import { useFormatter } from 'next-intl';
import Link from 'next/link';

interface ProviderCardProps {
    provider: any;
    onFollow?: (providerId: string) => void;
}

export default function ProviderCard({ provider, onFollow }: ProviderCardProps) {
    const format = useFormatter();

    const winRate = provider.win_rate || 0;
    const totalProfit = provider.total_profit_usd || 0;
    const maxDrawdown = provider.max_drawdown || 0;
    const followers = provider.total_followers || 0;

    // Determine risk level based on drawdown
    let riskLevel = 'Low';
    let riskColor = 'text-green-500';
    if (maxDrawdown > 15) { riskLevel = 'Medium'; riskColor = 'text-yellow-500'; }
    if (maxDrawdown > 30) { riskLevel = 'High'; riskColor = 'text-red-500'; }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            className="group relative bg-white rounded-2xl p-5 border border-[var(--border-light)] hover:border-[var(--accent-blue)] shadow-sm hover:shadow-md transition-all duration-300"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 p-[2px]">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                            {provider.user_image ? (
                                <img src={provider.user_image} alt={provider.display_name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-lg font-bold text-[var(--accent-blue)]">
                                    {provider.display_name.charAt(0)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-blue)] transition-colors">
                            {provider.display_name}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <span>{provider.broker_name || 'Multi-Broker'}</span>
                            <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]"></span>
                            <span>{followers} Copiers</span>
                        </div>
                    </div>
                </div>

                <div className={`px-2 py-1 rounded-lg bg-[var(--bg-secondary)] text-xs font-medium border border-[var(--border-light)] ${riskColor}`}>
                    {riskLevel} Risk
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                <div className="text-center">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Return</div>
                    <div className="text-sm font-bold text-green-500">
                        +{((totalProfit / 1000) * 100).toFixed(1)}%
                    </div>
                </div>
                <div className="text-center border-x border-[var(--border-medium)]">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Win Rate</div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">
                        {winRate.toFixed(1)}%
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-xs text-[var(--text-secondary)] mb-1">Max DD</div>
                    <div className="text-sm font-bold text-red-500">
                        {maxDrawdown.toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Fee Info */}
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-5">
                <div>
                    Subscription: <span className="text-[var(--text-primary)] font-medium">
                        {provider.subscription_fee > 0
                            ? format.number(provider.subscription_fee, { style: 'currency', currency: 'IDR' })
                            : 'Free'}
                    </span>
                </div>
                <div>
                    Profit Share: <span className="text-[var(--text-primary)] font-medium">{provider.profit_sharing_percent}%</span>
                </div>
            </div>

            {/* Action Button */}
            <Link
                href={`/copytrade/provider/${provider.id}`}
                className="block w-full"
            >
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 rounded-xl bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] 
                             hover:bg-[var(--accent-blue)] hover:text-white font-medium text-sm transition-all
                             border border-[var(--accent-blue)]/20 hover:border-transparent"
                >
                    View Strategy
                </motion.button>
            </Link>
        </motion.div>
    );
}
