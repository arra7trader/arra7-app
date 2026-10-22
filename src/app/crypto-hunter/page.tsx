'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import CryptoHunterDashboard from '@/components/crypto-hunter/CryptoHunterDashboard';
import { ArrowLeftIcon } from '@/components/PremiumIcons';

export default function CryptoHunterPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeftIcon size="sm" className="text-slate-600" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <span className="text-white text-sm">🎯</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Crypto Hunter</h1>
                <p className="text-[10px] text-slate-400 font-medium">OG Smart Money Scanner</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full bg-emerald-600 h-1.5 w-1.5"></span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Scanner Active</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="px-4 sm:px-6 py-6">
        <CryptoHunterDashboard />
      </main>
    </div>
  );
}
