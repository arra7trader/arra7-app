
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { PlusIcon, TrashIcon, PlayIcon, PauseIcon, CogIcon } from '@heroicons/react/24/outline';

interface TradingAccount {
    id: string;
    name: string;
    broker: string;
    login: string;
    server: string;
    platform: string;
    connectionStatus: string;
    settings: {
        isActive: boolean;
        riskPercent: number;
        fixedLot: number;
        maxOpenTrades: number;
        pairsAllowed: string[];
    };
}

export default function AutoTradingDashboard() {
    const { data: session } = useSession();
    const [accounts, setAccounts] = useState<TradingAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newAccount, setNewAccount] = useState({
        name: '',
        broker: 'Exness',
        login: '',
        server: '',
        platform: 'MT5'
    });

    useEffect(() => {
        if (session) {
            fetchAccounts();
        }
    }, [session]);

    const fetchAccounts = async () => {
        try {
            const res = await fetch('/api/trading/accounts');
            const data = await res.json();
            if (data.status === 'success') {
                setAccounts(data.accounts);
            }
        } catch (error) {
            console.error('Failed to fetch accounts', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/trading/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', ...newAccount })
            });
            const data = await res.json();
            if (data.status === 'success') {
                setIsAddModalOpen(false);
                fetchAccounts();
                setNewAccount({ name: '', broker: 'Exness', login: '', server: '', platform: 'MT5' });
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert('Failed to add account');
        }
    };

    const toggleAutoTrade = async (accountId: string, currentStatus: boolean) => {
        try {
            await fetch('/api/trading/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    id: accountId,
                    settings: { isActive: !currentStatus }
                })
            });
            fetchAccounts(); // Refresh to show new status
        } catch (error) {
            console.error('Failed to toggle auto trade', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to remove this account?')) return;
        try {
            await fetch(`/api/trading/accounts?id=${id}`, { method: 'DELETE' });
            fetchAccounts();
        } catch (error) {
            alert('Failed to delete');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading accounts...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold text-white">Auto Trading Bots</h2>
                    <p className="text-sm text-gray-400">Manage your connected MT4/MT5 accounts</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span>Add Connection</span>
                </button>
            </div>

            {accounts.length === 0 ? (
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
                    <div className="bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CogIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">No Trading Accounts</h3>
                    <p className="text-gray-400 max-w-sm mx-auto mb-6">
                        Connect your Exness or FBS account to start auto-trading with our AI signals.
                    </p>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                        Connect Account &rarr;
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts.map((account) => (
                        <div key={account.id} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg hover:shadow-blue-900/10 transition">
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-semibold text-white text-lg">{account.name}</h3>
                                        <div className="flex items-center space-x-2 text-sm text-gray-400 mt-1">
                                            <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{account.broker}</span>
                                            <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">{account.platform}</span>
                                        </div>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${account.settings.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-600'}`} title={account.settings.isActive ? 'Running' : 'Stopped'} />
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Login ID</span>
                                        <span className="text-gray-300 font-mono">{account.login}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Server</span>
                                        <span className="text-gray-300 truncate max-w-[150px]" title={account.server}>{account.server}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Risk / Trade</span>
                                        <span className="text-gray-300">{account.settings.riskPercent}%</span>
                                    </div>

                                    {/* BRIDGE CONFIGURATION */}
                                    <div className="mt-4 pt-4 border-t border-gray-700">
                                        <div className="text-xs text-gray-500 mb-2 uppercase font-semibold tracking-wider">Bridge Configuration</div>
                                        <div className="bg-black/30 rounded p-2 mb-2">
                                            <div className="text-[10px] text-gray-500 mb-1">API KEY (Paste in Python Script)</div>
                                            <div className="flex items-center gap-2">
                                                <code className="text-xs text-blue-400 font-mono flex-1 truncate">{account.id}</code>
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(account.id)}
                                                    className="text-gray-400 hover:text-white"
                                                    title="Copy Key"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <a href="/scripts/arra7-bridge.py" download className="block w-full text-center text-xs bg-gray-700 hover:bg-gray-600 text-white py-1.5 rounded transition">
                                            Download Bridge Script (.py)
                                        </a>
                                        <div className="text-[10px] text-gray-500 mt-1 text-center">
                                            Requires Python & MetaTrader 5
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={() => toggleAutoTrade(account.id, account.settings.isActive)}
                                        className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-sm font-medium transition ${account.settings.isActive
                                            ? 'bg-amber-600/20 text-amber-500 hover:bg-amber-600/30'
                                            : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                    >
                                        {account.settings.isActive ? (
                                            <>
                                                <PauseIcon className="w-4 h-4" />
                                                <span>Pause Bot</span>
                                            </>
                                        ) : (
                                            <>
                                                <PlayIcon className="w-4 h-4" />
                                                <span>Start Bot</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(account.id)}
                                        className="p-2 bg-gray-700 text-gray-400 hover:text-red-400 hover:bg-gray-700/80 rounded-lg transition"
                                        title="Remove Account"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 px-5 py-3 border-t border-gray-700 flex justify-between items-center">
                                <span className={`text-xs flex items-center space-x-1 ${account.connectionStatus === 'CONNECTED' ? 'text-green-500' : 'text-gray-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${account.connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-gray-500'}`} />
                                    <span>{account.connectionStatus || 'Disconnected'}</span>
                                </span>
                                <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center space-x-1">
                                    <CogIcon className="w-3 h-3" />
                                    <span>Settings</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Account Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-1">Connect Broker</h3>
                            <p className="text-sm text-gray-400 mb-6">Enter your MT4/MT5 trading credentials.</p>

                            <form onSubmit={handleAddAccount} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Account Label</label>
                                    <input
                                        type="text"
                                        value={newAccount.name}
                                        onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                                        placeholder="e.g. My Fast Scalping"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Broker</label>
                                        <select
                                            value={newAccount.broker}
                                            onChange={e => setNewAccount({ ...newAccount, broker: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none"
                                        >
                                            <option value="Exness">Exness</option>
                                            <option value="FBS">FBS</option>
                                            <option value="XM">XM</option>
                                            <option value="ICMarkets">IC Markets</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Platform</label>
                                        <select
                                            value={newAccount.platform}
                                            onChange={e => setNewAccount({ ...newAccount, platform: e.target.value })}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none"
                                        >
                                            <option value="MT5">MetaTrader 5</option>
                                            <option value="MT4">MetaTrader 4</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Login ID</label>
                                    <input
                                        type="text"
                                        value={newAccount.login}
                                        onChange={e => setNewAccount({ ...newAccount, login: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Server Name</label>
                                    <input
                                        type="text"
                                        value={newAccount.server}
                                        onChange={e => setNewAccount({ ...newAccount, server: e.target.value })}
                                        placeholder="e.g. Exness-Real12"
                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-white outline-none"
                                        required
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
                                    >
                                        Connect
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
