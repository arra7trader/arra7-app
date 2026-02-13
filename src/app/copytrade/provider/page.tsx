'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';

export default function ProviderDashboardPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const format = useFormatter();
    const [loading, setLoading] = useState(true);
    const [provider, setProvider] = useState<any>(null);

    useEffect(() => {
        if (session) {
            fetchProviderProfile();
        }
    }, [session]);

    const fetchProviderProfile = async () => {
        try {
            const res = await fetch('/api/copytrade/providers?myProfile=true');
            const data = await res.json();

            if (data.error === 'User not found') {
                // Not registered yet
                router.push('/copytrade/become-provider');
                return;
            }

            if (data.provider) {
                setProvider(data.provider);
            } else {
                // Registered but no profile found? Redirect to register
                router.push('/copytrade/become-provider');
            }
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

    if (!provider) return null;

    return (
        <main className="min-h-screen bg-[#000000] text-white">
            <Navbar />

            <div className="pt-32 pb-20 container-wide">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">Provider Dashboard</h1>
                        <p className="text-gray-400">Manage your copy trading profile and earnings</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${provider.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                            }`}>
                            {provider.is_active ? 'Active' : 'Pending Approval'}
                        </span>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                        <div className="text-gray-400 text-sm mb-2">Total Followers</div>
                        <div className="text-3xl font-bold text-white">{provider.total_followers}</div>
                    </div>
                    <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                        <div className="text-gray-400 text-sm mb-2">Total Earnings</div>
                        <div className="text-3xl font-bold text-[var(--accent-blue)]">
                            {format.number(provider.total_earnings || 0, { style: 'currency', currency: 'IDR' })}
                        </div>
                    </div>
                    <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                        <div className="text-gray-400 text-sm mb-2">Win Rate</div>
                        <div className="text-3xl font-bold text-green-400">
                            {(provider.win_rate || 0).toFixed(1)}%
                        </div>
                    </div>
                    <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                        <div className="text-gray-400 text-sm mb-2">Total Profit (USD)</div>
                        <div className="text-3xl font-bold text-white">
                            ${(provider.total_profit_usd || 0).toFixed(2)}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Settings */}
                        <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                            <h3 className="text-lg font-semibold mb-4 text-white">Profile Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                                    <input
                                        type="text"
                                        value={provider.display_name}
                                        readOnly
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white opacity-60 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Bio</label>
                                    <textarea
                                        value={provider.bio || ''}
                                        readOnly
                                        rows={3}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white opacity-60 cursor-not-allowed"
                                    />
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-1/2">
                                        <label className="block text-sm text-gray-400 mb-1">Subscription Fee</label>
                                        <input
                                            type="text"
                                            value={format.number(provider.subscription_fee, { style: 'currency', currency: 'IDR' })}
                                            readOnly
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white opacity-60 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="w-1/2">
                                        <label className="block text-sm text-gray-400 mb-1">Profit Share</label>
                                        <input
                                            type="text"
                                            value={provider.profit_sharing_percent + '%'}
                                            readOnly
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white opacity-60 cursor-not-allowed"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 italic">Contact support to change profile details.</p>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Broker Info */}
                        <div className="bg-[#1c1c1e] p-6 rounded-2xl border border-white/5">
                            <h3 className="text-lg font-semibold mb-4 text-white">Broker Connection</h3>
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <span className="text-gray-400">Broker</span>
                                <span className="text-white">{provider.broker_name || 'Exness'}</span>
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-white/5">
                                <span className="text-gray-400">Account ID</span>
                                <span className="text-white">{provider.broker_account_id}</span>
                            </div>
                            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm text-center">
                                ● Connected
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
