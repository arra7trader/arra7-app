'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useSession } from 'next-auth/react';

export default function BecomeProviderPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        displayName: '',
        bio: '',
        subscriptionFee: 0,
        profitSharingPercent: 20,
        brokerName: 'Exness',
        brokerAccountId: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/copytrade/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to register');
            }

            // Success redirect
            router.push('/copytrade/provider?registered=true');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <Navbar />

            <div className="pt-32 pb-20 container-wide flex justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-2xl"
                >
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold mb-4">
                            Become a <span className="gradient-text">Signal Provider</span>
                        </h1>
                        <p className="text-gray-400">
                            Share your trading expertise and earn from subscriptions or profit sharing.
                        </p>
                    </div>

                    <div className="pt-32 pb-20 container mx-auto px-4 flex justify-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-2xl"
                        >
                            <div className="text-center mb-10">
                                <h1 className="text-4xl font-bold mb-4">
                                    Become a <span className="gradient-text">Signal Provider</span>
                                </h1>
                                <p className="text-[var(--text-secondary)]">
                                    {error && (
                                        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        {/* Basic Info */}
                                        <div className="space-y-4">
                                            <h3 className="text-lg font-semibold text-white border-b border-white/5 pb-2">Profile Details</h3>

                                            <div>
                                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Display Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formData.displayName}
                                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                                    placeholder="e.g. Master Trader John"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm text-[var(--text-secondary)] mb-1">Bio / Strategy Description</label>
                                                <textarea
                                                    rows={4}
                                                    value={formData.bio}
                                                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                                    placeholder="Describe your trading style, risk management, and experience..."
                                                />
                                            </div>
                                        </div>

                                        {/* Broker Info */}
                                        <div className="space-y-4 pt-4">
                                            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-2">Broker Connection</h3>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Broker</label>
                                                    <select
                                                        value={formData.brokerName}
                                                        onChange={(e) => setFormData({ ...formData, brokerName: e.target.value })}
                                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                                    >
                                                        <option value="Exness">Exness</option>
                                                        <option value="FBS">FBS</option>
                                                        <option value="XM">XM</option>
                                                        <option value="IC Markets">IC Markets</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Account ID (Login)</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={formData.brokerAccountId}
                                                        onChange={(e) => setFormData({ ...formData, brokerAccountId: e.target.value })}
                                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                                        placeholder="e.g. 8023456"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fees */}
                                        <div className="space-y-4 pt-4">
                                            <h3 className="text-lg font-semibold text-[var(--text-primary)] border-b border-[var(--border-light)] pb-2">Monetization</h3>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Subscription Fee (IDR)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1000"
                                                        value={formData.subscriptionFee}
                                                        onChange={(e) => setFormData({ ...formData, subscriptionFee: Number(e.target.value) })}
                                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                                    />
                                                    <p className="text-xs text-[var(--text-muted)] mt-1">Monthly fee per follower (0 for free)</p>
                                                </div>
                                                <div>
                                                    <label className="block text-sm text-[var(--text-secondary)] mb-1">Profit Sharing (%)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="30"
                                                        value={formData.profitSharingPercent}
                                                        onChange={(e) => setFormData({ ...formData, profitSharingPercent: Number(e.target.value) })}
                                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                                                    />
                                                    <p className="text-xs text-[var(--text-muted)] mt-1">Max 30% commission on profits</p>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                                        >
                                            {isLoading ? 'Submitting...' : 'Register as Provider'}
                                        </button>
                                    </form>
                            </div>
                        </motion.div>
                    </div>
                </main>
                );
}
