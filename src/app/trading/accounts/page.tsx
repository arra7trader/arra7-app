'use client';

import { useState, useEffect } from 'react';
import ConnectAccountModal from '@/components/trading/ConnectAccountModal';
import { motion } from 'framer-motion';

interface Account {
    id: string;
    name: string;
    broker: string;
    login: string;
    server: string;
    platform: string;
    status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    createdAt: string;
}

export default function TradingAccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchAccounts = async () => {
        try {
            const res = await fetch('/api/trading/accounts');
            const data = await res.json();
            if (data.status === 'success') {
                setAccounts(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch accounts', error);
            // toast.error("Failed to load accounts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to disconnect this account?')) return;

        setDeletingId(id);
        try {
            const res = await fetch(`/api/trading/accounts/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setAccounts(accounts.filter(a => a.id !== id));
                // toast.success("Account disconnected");
            } else {
                alert("Failed to disconnect");
            }
        } catch (error) {
            alert("Error occurred");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-24 pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Trading Accounts</h1>
                        <p className="text-[var(--text-secondary)] mt-1">Manage your connected broker accounts for auto-trading.</p>
                    </div>
                    <ConnectAccountModal onSuccess={fetchAccounts} />
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : accounts.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">No Accounts Connected</h3>
                        <p className="text-gray-500 max-w-sm mt-2 mb-6">Connect your Exness or FBS account to start using our auto-trading features.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {accounts.map((account) => (
                            <motion.div
                                key={account.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
                            >
                                <div className="h-2 bg-blue-600 w-full" />
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                                {account.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                <span className="font-semibold text-gray-700">{account.broker}</span>
                                                <span>•</span>
                                                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600 font-medium">{account.platform}</span>
                                            </div>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${account.status === 'CONNECTED'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {account.status}
                                        </span>
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-gray-100">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500 text-xs uppercase tracking-wide">Login ID</p>
                                                <p className="font-medium font-mono text-gray-900">{account.login}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs uppercase tracking-wide">Server</p>
                                                <p className="font-medium truncate text-gray-900" title={account.server}>{account.server}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-4 mt-2">
                                            <button className="flex-1 py-1.5 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 font-medium flex items-center justify-center gap-2 transition-colors">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                Configure
                                            </button>
                                            <button
                                                onClick={() => handleDelete(account.id)}
                                                disabled={deletingId === account.id}
                                                className="w-10 py-1.5 flex items-center justify-center bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-600 transition-colors disabled:opacity-50"
                                            >
                                                {deletingId === account.id ? (
                                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
