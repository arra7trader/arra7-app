'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConnectAccountModalProps {
    onSuccess: () => void;
}

export default function ConnectAccountModal({ onSuccess }: ConnectAccountModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'form' | 'connecting' | 'success'>('form');
    const [formData, setFormData] = useState({
        name: '',
        broker: '',
        platform: 'MT5',
        server: '',
        login: '',
        password: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setStep('connecting');

        try {
            // Simulate connection delay for realism
            await new Promise(resolve => setTimeout(resolve, 2000));

            const res = await fetch('/api/trading/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (data.status === 'success') {
                setStep('success');
                // track('Connect Broker Account Success', { broker: formData.broker });
                setTimeout(() => {
                    setIsOpen(false);
                    onSuccess();
                    // Reset form after close
                    setTimeout(() => {
                        setStep('form');
                        setFormData({ name: '', broker: '', platform: 'MT5', server: '', login: '', password: '' });
                    }, 500);
                }, 1500);
            } else {
                throw new Error(data.message || 'Failed to connect');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message);
            setStep('form');
            alert(`Connection Failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
            >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Connect Account
            </button>

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-light)] rounded-2xl p-6 shadow-2xl z-50 max-h-[90vh] overflow-y-auto"
                        >
                            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Connect Trading Account</h2>
                            <p className="text-sm text-[var(--text-secondary)] mb-6">
                                Connect your Exness or FBS account to enable auto-trading.
                            </p>

                            {step === 'form' && (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {error && (
                                        <div className="bg-red-500/10 border-red-500/20 text-red-400 p-3 rounded-md text-sm flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            {error}
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium text-[var(--text-primary)]">Account Name</label>
                                        <input
                                            id="name"
                                            className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                            placeholder="e.g. My Exness Real"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="broker" className="text-sm font-medium text-[var(--text-primary)]">Broker</label>
                                            <select
                                                id="broker"
                                                className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-[var(--bg-primary)]"
                                                value={formData.broker}
                                                onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                                                required
                                            >
                                                <option value="" disabled>Select...</option>
                                                <option value="Exness">Exness</option>
                                                <option value="FBS">FBS</option>
                                                <option value="XM">XM</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="platform" className="text-sm font-medium text-[var(--text-primary)]">Platform</label>
                                            <select
                                                id="platform"
                                                className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-[var(--bg-primary)]"
                                                value={formData.platform}
                                                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                            >
                                                <option value="MT4">MetaTrader 4</option>
                                                <option value="MT5">MetaTrader 5</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="server" className="text-sm font-medium text-[var(--text-primary)]">Server</label>
                                        <input
                                            id="server"
                                            className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="e.g. Exness-Real12"
                                            value={formData.server}
                                            onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label htmlFor="login" className="text-sm font-medium text-[var(--text-primary)]">Login ID</label>
                                            <input
                                                id="login"
                                                type="number"
                                                className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Account No."
                                                value={formData.login}
                                                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="password" className="text-sm font-medium text-[var(--text-primary)]">Password</label>
                                            <input
                                                id="password"
                                                type="password"
                                                className="w-full px-3 py-2 border border-[var(--border-medium)] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="Trading Password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Connecting...
                                            </span>
                                        ) : 'Connect Account'}
                                    </button>
                                </form>
                            )}

                            {step === 'connecting' && (
                                <div className="py-12 flex flex-col items-center justify-center text-center">
                                    <svg className="animate-spin h-12 w-12 text-blue-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Connecting to Broker...</h3>
                                    <p className="text-sm text-[var(--text-secondary)] mt-2">Verifying credentials with {formData.broker}</p>
                                </div>
                            )}

                            {step === 'success' && (
                                <div className="py-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                                    <div className="w-16 h-16 bg-green-500/10 border-green-500/20 rounded-full flex items-center justify-center mb-4">
                                        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-green-400">Connected!</h3>
                                    <p className="text-sm text-[var(--text-secondary)] mt-2">Your account is now ready for auto-trading.</p>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
