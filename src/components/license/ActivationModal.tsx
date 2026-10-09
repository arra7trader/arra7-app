'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePicaDevice } from '@/context/PicaDeviceContext';
import { KeyIcon, CrownIcon, BoltIcon, CheckCircleIcon, WarningIcon, CheckIcon } from '@/components/PremiumIcons';

export default function ActivationModal() {
  const {
    isActivationOpen,
    closeActivation,
    tier,
    tierExpiresAt,
    daysLeft,
    deviceId,
    redeemKey,
  } = usePicaDevice();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedDevId, setCopiedDevId] = useState(false);

  if (!isActivationOpen) return null;

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setFeedback(null);

    const res = await redeemKey(code);
    setLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setCode('');
      // Auto close after 2.5s on success
      setTimeout(() => {
        closeActivation();
        setFeedback(null);
      }, 2500);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopiedDevId(true);
    setTimeout(() => setCopiedDevId(false), 2000);
  };

  const isVvip = tier === 'VVIP';
  const isPro = tier === 'PRO';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeActivation}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-md rounded-3xl bg-white border border-slate-200/90 shadow-2xl p-6 sm:p-8 z-10 text-slate-900"
        >
          {/* Close button */}
          <button
            onClick={closeActivation}
            className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/20 mb-3.5">
              <KeyIcon size="md" className="text-white" />
            </div>
            <h2 className="text-2xl font-bold font-['Space_Grotesk',system-ui,sans-serif] tracking-tight">
              Aktivasi Lisensi PICA
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Masukkan kode akses 1x pakai untuk mengaktifkan VVIP / PRO
            </p>
          </div>

          {/* Current Tier Status Card */}
          <div className="mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-medium">Status Perangkat Ini:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                  isVvip
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : isPro
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-slate-200/80 text-slate-700 border border-slate-300'
                }`}
              >
                {isVvip ? (
                  <>
                    <CrownIcon size="xs" />
                    <span>VVIP AKTIF</span>
                  </>
                ) : isPro ? (
                  <>
                    <BoltIcon size="xs" />
                    <span>PRO AKTIF</span>
                  </>
                ) : (
                  'BASIC (GRATIS)'
                )}
              </span>
            </div>

            {tierExpiresAt && (isVvip || isPro) ? (
              <p className="text-xs text-emerald-700 font-medium">
                Aktif sampai: {new Date(tierExpiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} ({daysLeft} hari lagi)
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">
                Fitur standar aktif tanpa login. Aktifkan kode untuk akses sinyal kuantitatif tak terbatas.
              </p>
            )}
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mb-5 p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold'
                  : 'bg-rose-50 border border-rose-200 text-rose-800 font-medium'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircleIcon size="sm" className="text-emerald-600 shrink-0" />
              ) : (
                <WarningIcon size="sm" className="text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </motion.div>
          )}

          {/* Input Form */}
          <form onSubmit={handleRedeem} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                Kode Akses (Voucher)
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="CONTOH: PICA-VVIP-XXXX-XXXX"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-mono text-sm tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all placeholder:text-slate-400 placeholder:normal-case"
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Kode...</span>
                </>
              ) : (
                <span>Aktifkan Sekarang</span>
              )}
            </button>
          </form>

          {/* Device ID Info Footer */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate max-w-[220px]" title={deviceId}>
              ID: <span className="font-mono text-slate-500">{deviceId || 'Generating...'}</span>
            </span>
            <button
              onClick={handleCopyDeviceId}
              className="hover:text-blue-600 font-semibold cursor-pointer transition-colors"
            >
              {copiedDevId ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                  <CheckIcon size="xs" /> Tersalin
                </span>
              ) : (
                'Salin ID'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
