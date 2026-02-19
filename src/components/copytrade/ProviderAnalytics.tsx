
'use client';

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import { motion } from 'framer-motion';

interface ProviderStats {
    stats_win_rate?: number;
    stats_profit_factor?: number;
    stats_max_drawdown?: number;
    stats_total_pips?: number;
    stats_active_since?: string;
    stats_risk_score?: number;
}

interface DailyStat {
    date: string;
    daily_pips: number;
    daily_profit_usd: number;
    balance_snapshot: number;
}

interface ProviderAnalyticsProps {
    stats: ProviderStats;
    dailyStats: DailyStat[];
}

export default function ProviderAnalytics({ stats, dailyStats }: ProviderAnalyticsProps) {
    const formatCurrency = (val: number) => `$${val.toFixed(2)}`;
    const formatPercent = (val: number) => `${val.toFixed(1)}%`;

    // Process data for charts
    const chartData = dailyStats.map(d => ({
        date: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        fullDate: d.date,
        balance: d.balance_snapshot,
        pips: d.daily_pips
    }));

    return (
        <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Win Rate"
                    value={formatPercent(stats.stats_win_rate || 0)}
                    subtext="Consitency"
                    color="text-green-600"
                    bg="bg-green-50"
                />
                <StatCard
                    label="Profit Factor"
                    value={(stats.stats_profit_factor || 0).toFixed(2)}
                    subtext="Risk/Reward"
                    color={stats.stats_profit_factor && stats.stats_profit_factor > 1.5 ? "text-blue-600" : "text-gray-600"}
                    bg="bg-blue-50"
                />
                <StatCard
                    label="Max Drawdown"
                    value={`$${(stats.stats_max_drawdown || 0).toFixed(2)}`}
                    subtext="Max Risk"
                    color="text-red-600"
                    bg="bg-red-50"
                />
                <StatCard
                    label="Active Since"
                    value={stats.stats_active_since ? new Date(stats.stats_active_since).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : '-'}
                    subtext="Experience"
                    color="text-purple-600"
                    bg="bg-purple-50"
                />
            </div>

            {/* Equity Curve Chart */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Growth Curve (Equity)</h3>

                {chartData.length > 1 ? (
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#94A3B8' }}
                                    minTickGap={30}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fill: '#94A3B8' }}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(val: number) => [`$${val.toFixed(2)}`, 'Profit']}
                                    labelStyle={{ color: '#64748B', marginBottom: '4px' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#3B82F6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorBalance)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="h-[300px] flex items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p>Belum cukup data untuk menampilkan grafik</p>
                    </div>
                )}
            </div>

            {/* Risk Score Indicator */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex items-center justify-between">
                <div>
                    <h3 className="text-base font-bold text-gray-900">Risk Score</h3>
                    <p className="text-sm text-gray-500">Berdasarkan Drawdown & Konsistensi</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                            <div
                                key={score}
                                className={`w-2 h-8 rounded-full ${(stats.stats_risk_score || 1) >= score
                                        ? score > 7 ? 'bg-red-500' : score > 4 ? 'bg-yellow-500' : 'bg-green-500'
                                        : 'bg-gray-100'
                                    }`}
                            />
                        ))}
                    </div>
                    <span className="text-xl font-black text-gray-900">{stats.stats_risk_score || 1}/10</span>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, subtext, color, bg }: any) {
    return (
        <div className={`p-4 rounded-2xl ${bg} border border-transparent hover:border-gray-200 transition-all`}>
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-black ${color} tracking-tight`}>{value}</p>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">{subtext}</p>
        </div>
    );
}
