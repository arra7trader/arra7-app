'use client';

import type { TokenSecurity } from '@/lib/crypto-hunter/types';

interface SecurityBadgesProps {
  security: TokenSecurity;
  compact?: boolean;
}

export default function SecurityBadges({ security, compact = false }: SecurityBadgesProps) {
  const checks = [
    {
      label: 'Mint',
      value: security.mintRevoked,
      good: true, // true means "revoked" is good
      goodText: 'Revoked',
      badText: 'Active ⚠️',
    },
    {
      label: 'Freeze',
      value: security.freezeRevoked,
      good: true,
      goodText: 'Revoked',
      badText: 'Active ⚠️',
    },
    {
      label: 'Honeypot',
      value: security.isHoneypot === null ? null : !security.isHoneypot,
      good: true,
      goodText: 'Clean',
      badText: 'DETECTED 🚨',
    },
    {
      label: 'LP',
      value: security.lpBurned ? true : security.lpLocked ? true : null,
      good: true,
      goodText: security.lpBurned ? 'Burned 🔥' : 'Locked',
      badText: 'Unlocked',
    },
  ];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {checks.map((check) => {
          const isGood = check.value === true;
          const isBad = check.value === false;
          const isUnknown = check.value === null;

          return (
            <span
              key={check.label}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                isGood
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isBad
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-slate-50 text-slate-500 border border-slate-200'
              }`}
            >
              <span>{isGood ? '✅' : isBad ? '❌' : '❓'}</span>
              <span>{check.label}</span>
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
        <span>🛡️</span>
        <span>Security Check</span>
        <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
          security.securityScore >= 22 ? 'bg-emerald-100 text-emerald-700' :
          security.securityScore >= 15 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {security.securityScore}/30
        </span>
      </h4>
      <div className="grid grid-cols-2 gap-1.5">
        {checks.map((check) => {
          const isGood = check.value === true;
          const isBad = check.value === false;

          return (
            <div
              key={check.label}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${
                isGood
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : isBad
                  ? 'bg-red-50 text-red-700 border border-red-200/80'
                  : 'bg-slate-50 text-slate-500 border border-slate-200/80'
              }`}
            >
              <span>{check.label}</span>
              <span>{isGood ? check.goodText : isBad ? check.badText : 'Unknown'}</span>
            </div>
          );
        })}
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-2 gap-1.5 mt-1">
        {security.buyTax !== null && (
          <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
            security.buyTax <= 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
            security.buyTax <= 5 ? 'bg-yellow-50 text-yellow-700 border-yellow-200/80' :
            'bg-red-50 text-red-700 border-red-200/80'
          }`}>
            <span>Buy Tax</span>
            <span>{security.buyTax.toFixed(1)}%</span>
          </div>
        )}
        {security.sellTax !== null && (
          <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
            security.sellTax <= 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
            security.sellTax <= 5 ? 'bg-yellow-50 text-yellow-700 border-yellow-200/80' :
            'bg-red-50 text-red-700 border-red-200/80'
          }`}>
            <span>Sell Tax</span>
            <span>{security.sellTax.toFixed(1)}%</span>
          </div>
        )}
        {security.devHoldingPercent !== null && (
          <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
            security.devHoldingPercent < 5 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
            security.devHoldingPercent < 10 ? 'bg-yellow-50 text-yellow-700 border-yellow-200/80' :
            'bg-red-50 text-red-700 border-red-200/80'
          }`}>
            <span>Dev Hold</span>
            <span>{security.devHoldingPercent.toFixed(1)}%</span>
          </div>
        )}
        {security.top10HoldingPercent !== null && (
          <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
            security.top10HoldingPercent < 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
            security.top10HoldingPercent < 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200/80' :
            'bg-red-50 text-red-700 border-red-200/80'
          }`}>
            <span>Top 10</span>
            <span>{security.top10HoldingPercent.toFixed(1)}%</span>
          </div>
        )}
      </div>

      {security.rugcheckScore !== 'Unknown' && (
        <div className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${
          security.rugcheckScore === 'Good' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
          security.rugcheckScore === 'Warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200/80' :
          'bg-red-50 text-red-700 border-red-200/80'
        }`}>
          <span>Rugcheck:</span>
          <span>{security.rugcheckScore === 'Good' ? '✅ Good' : security.rugcheckScore === 'Warning' ? '⚠️ Warning' : '🚨 Danger'}</span>
        </div>
      )}
    </div>
  );
}
