'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import FollowSettingsModal from './FollowSettingsModal';

interface ProviderCardProps {
    provider: any;
}

export default function ProviderCard({ provider }: ProviderCardProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [showModal, setShowModal] = useState(false);

    const winRate = Number(provider.win_rate ?? 0);
    const netProfit = Number(provider.net_profit_usd ?? 0);
    const maxDrawdown = Number(provider.max_drawdown ?? 0);
    const totalTrades = Number(provider.total_trades ?? 0);
    const followers = Number(provider.total_followers ?? 0);

    let riskLabel = 'Rendah';
    let riskBg = 'bg-green-100 text-green-700 border-green-200';
    if (maxDrawdown > 15) { riskLabel = 'Sedang'; riskBg = 'bg-yellow-100 text-yellow-700 border-yellow-200'; }
    if (maxDrawdown > 30) { riskLabel = 'Tinggi'; riskBg = 'bg-red-100 text-red-700 border-red-200'; }

    const handleCopy = () => {
        if (!session) { router.push('/login'); return; }
        setShowModal(true);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,113,227,0.12)' }}
                transition={{ duration: 0.3 }}
                className="group relative bg-white rounded-2xl p-5 border border-gray-100 hover:border-blue-200 transition-all duration-300 flex flex-col"
            >
                {/* Top: Avatar + Name + Risk */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                            {provider.display_name?.charAt(0) ?? 'P'}
                        </div>
                        <div>
                            <Link href={`/copytrade/provider/${provider.id}`}>
                                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm leading-tight">{provider.display_name}</h3>
                            </Link>
                            <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                                <span>{provider.broker_name || 'Multi-Broker'}</span>
                                <span>·</span>
                                <span>{followers} pengikut</span>
                            </div>
                        </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${riskBg}`}>
                        {riskLabel}
                    </span>
                </div>

                {/* Bio */}
                {provider.bio && (
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed">{provider.bio}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-1 mb-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="text-center">
                        <div className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">Win Rate</div>
                        <div className="text-sm font-bold text-gray-900">{winRate.toFixed(1)}%</div>
                    </div>
                    <div className="text-center border-x border-gray-200">
                        <div className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">Net Profit</div>
                        <div className={`text-sm font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {netProfit >= 0 ? '+' : ''}${netProfit.toFixed(0)}
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-[10px] text-gray-400 mb-0.5 uppercase tracking-wider">Max DD</div>
                        <div className="text-sm font-bold text-gray-700">{maxDrawdown.toFixed(1)}%</div>
                    </div>
                </div>

                {/* Trades + Fee */}
                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <span>{totalTrades} trades</span>
                    <span className="font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                        Pay-Per-Signal
                    </span>
                </div>

                {/* Win Rate Bar */}
                <div className="mb-4">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                            style={{ width: `${Math.min(winRate, 100)}%` }}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto">
                    <Link href={`/copytrade/provider/${provider.id}`} className="flex-1">
                        <button className="w-full py-2 rounded-xl border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 text-sm font-medium transition-all">
                            Detail
                        </button>
                    </Link>
                    <button
                        onClick={handleCopy}
                        className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-sm hover:shadow-blue-500/30 hover:shadow-md"
                    >
                        Ikuti Master
                    </button>
                </div>
            </motion.div>

            {showModal && (
                <FollowSettingsModal
                    provider={provider}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
