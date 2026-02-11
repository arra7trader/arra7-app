
'use client';

const PIVOT_DATA = [
    { label: 'R3', price: '2045.20', type: 'res' },
    { label: 'R2', price: '2038.50', type: 'res' },
    { label: 'R1', price: '2032.10', type: 'res' },
    { label: 'PIVOT', price: '2025.00', type: 'neutral' },
    { label: 'S1', price: '2018.80', type: 'sup' },
    { label: 'S2', price: '2012.40', type: 'sup' },
    { label: 'S3', price: '2005.60', type: 'sup' },
];

export default function KeyLevels() {
    return (
        <div className="bg-white p-6 rounded-2xl border border-[var(--border-light)] shadow-sm h-full">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    <span>🔑</span> Key Levels (Pivot)
                </h3>
                <select className="text-xs border rounded-md p-1 bg-gray-50">
                    <option>Classic</option>
                    <option>Fibonacci</option>
                    <option>Camarilla</option>
                </select>
            </div>

            <div className="space-y-3">
                {PIVOT_DATA.map((level) => (
                    <div
                        key={level.label}
                        className={`flex items-center justify-between p-3 rounded-lg border ${level.type === 'res' ? 'bg-red-50 border-red-100 text-red-700' :
                                level.type === 'sup' ? 'bg-green-50 border-green-100 text-green-700' :
                                    'bg-gray-100 border-gray-200 text-gray-800 font-bold'
                            }`}
                    >
                        <span className="font-mono font-semibold text-sm">{level.label}</span>
                        <span className="font-mono font-bold tracking-tight">{level.price}</span>
                    </div>
                ))}
            </div>

            <div className="mt-6 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 leading-relaxed border border-blue-100">
                <strong>Strategy:</strong> Watch for reversals at S1/R1. Breakout above R2 suggests strong bullish trend.
            </div>
        </div>
    );
}
