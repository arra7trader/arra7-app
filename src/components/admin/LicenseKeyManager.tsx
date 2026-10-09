'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { KeyIcon, BoltIcon, RefreshIcon, CheckIcon, SparklesIcon } from '@/components/PremiumIcons';

interface LicenseKey {
  id?: number;
  code: string;
  tier: 'PRO' | 'VVIP';
  durationDays: number;
  isUsed: boolean;
  usedByDeviceId?: string;
  createdAt: string;
  activatedAt?: string;
  expiresAt?: string;
  notes?: string;
}

interface DeviceUser {
  deviceId: string;
  tier: 'BASIC' | 'PRO' | 'VVIP';
  tierExpiresAt?: string;
  activeLicenseCode?: string;
  firstSeenAt: string;
  lastActiveAt: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  totalPredictions: number;
  totalVisits: number;
}

export default function LicenseKeyManager() {
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [devices, setDevices] = useState<DeviceUser[]>([]);
  const [activeTab, setActiveTab] = useState<'keys' | 'devices'>('keys');
  const [loading, setLoading] = useState(true);

  // Generator form
  const [genTier, setGenTier] = useState<'VVIP' | 'PRO'>('VVIP');
  const [genDuration, setGenDuration] = useState<number>(30);
  const [genCount, setGenCount] = useState<number>(1);
  const [genNotes, setGenNotes] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [justGenerated, setJustGenerated] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Filter
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'USED'>('ALL');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resKeys, resDevs] = await Promise.all([
        fetch('/api/admin/license').then(r => r.json()),
        fetch('/api/admin/devices').then(r => r.json()),
      ]);

      if (resKeys.status === 'success') {
        setKeys(resKeys.data || []);
      }
      if (resDevs.status === 'success') {
        setDevices(resDevs.data || []);
      }
    } catch (e) {
      console.error('Failed to load licenses or devices', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setJustGenerated([]);

    try {
      const res = await fetch('/api/admin/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: genTier,
          durationDays: genDuration,
          count: genCount,
          notes: genNotes.trim(),
        }),
      });

      const json = await res.json();
      if (json.status === 'success') {
        setJustGenerated(json.data || []);
        setGenNotes('');
        await fetchData();
      } else {
        alert(json.message || 'Gagal generate kode lisensi');
      }
    } catch (err: any) {
      alert('Error saat generate: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(code);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyTemplate = (code: string) => {
    const text = `Halo! Berikut kode lisensi ${genTier} PICA Anda:

🔑 Kode: ${code}
⏳ Masa Aktif: ${genDuration} Hari

Cara Aktivasi:
1. Buka https://pica.my.id
2. Klik tombol "Aktivasi Kode" di pojok atas
3. Tempel kode di atas lalu klik Aktifkan.
Langsung aktif seketika tanpa perlu login!`;

    navigator.clipboard.writeText(text);
    setCopiedKey(code + '_template');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredKeys = keys.filter(k => {
    if (filterStatus === 'AVAILABLE') return !k.isUsed;
    if (filterStatus === 'USED') return k.isUsed;
    return true;
  });

  const availableCount = keys.filter(k => !k.isUsed).length;
  const usedCount = keys.filter(k => k.isUsed).length;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 inline-flex items-center justify-center">
              <KeyIcon size="md" />
            </span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight font-['Space_Grotesk']">
              Sistem Lisensi 1x Pakai &amp; Tracking Perangkat
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Generate voucher VVIP/PRO untuk pembeli dan pantau perangkat yang aktif tanpa syarat login.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200/80 shrink-0">
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'keys' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Daftar Kode ({keys.length})
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'devices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Perangkat Terlacak ({devices.length})
          </button>
        </div>
      </div>

      {activeTab === 'keys' && (
        <div className="space-y-8">
          {/* ══════ GENERATOR CARD ══════ */}
          <div className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <BoltIcon size="sm" className="text-blue-600" />
              <span>Buat Kode Lisensi Baru (1 Kali Pakai)</span>
            </h3>

            <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Paket</label>
                <select
                  value={genTier}
                  onChange={e => setGenTier(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-900"
                >
                  <option value="VVIP">VVIP Access</option>
                  <option value="PRO">PRO Access</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Durasi</label>
                <select
                  value={genDuration}
                  onChange={e => setGenDuration(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900"
                >
                  <option value={7}>7 Hari (Trial)</option>
                  <option value={30}>30 Hari (1 Bulan)</option>
                  <option value={90}>90 Hari (3 Bulan)</option>
                  <option value={180}>180 Hari (6 Bulan)</option>
                  <option value={365}>365 Hari (1 Tahun)</option>
                  <option value={9999}>Lifetime (Selamanya)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Jumlah</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={genCount}
                  onChange={e => setGenCount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Catatan Pembeli (Opsional)</label>
                <input
                  type="text"
                  placeholder="Mis: Pembeli WA @Andi"
                  value={genNotes}
                  onChange={e => setGenNotes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={generating}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {generating ? 'Membuat...' : '+ Buat Kode'}
                </button>
              </div>
            </form>

            {/* Just Generated Highlight */}
            {justGenerated.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <SparklesIcon size="xs" className="text-emerald-600" />
                    <span>{justGenerated.length} Kode Baru Berhasil Dibuat:</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {justGenerated.map((code) => (
                    <div
                      key={code}
                      className="p-3 bg-white rounded-xl border border-emerald-300 flex items-center justify-between gap-2"
                    >
                      <span className="font-mono font-bold text-slate-900 text-sm tracking-wider select-all">
                        {code}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopy(code)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                        >
                          {copiedKey === code ? (
                            <>
                              <CheckIcon size="xs" className="text-emerald-600" />
                              <span className="text-emerald-600">Salin</span>
                            </>
                          ) : (
                            'Salin Kode'
                          )}
                        </button>
                        <button
                          onClick={() => handleCopyTemplate(code)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer flex items-center gap-1"
                          title="Salin pesan siap kirim ke WhatsApp / Telegram"
                        >
                          {copiedKey === code + '_template' ? (
                            <>
                              <CheckIcon size="xs" />
                              <span>Format WA</span>
                            </>
                          ) : (
                            'Format Chat'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* ══════ FILTER & TABLE ══════ */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Semua ({keys.length})
                </button>
                <button
                  onClick={() => setFilterStatus('AVAILABLE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    filterStatus === 'AVAILABLE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  Tersedia ({availableCount})
                </button>
                <button
                  onClick={() => setFilterStatus('USED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    filterStatus === 'USED' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Sudah Terpakai ({usedCount})
                </button>
              </div>

              <button
                onClick={fetchData}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
              >
                <RefreshIcon size="xs" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Kode Lisensi</th>
                    <th className="p-3">Paket</th>
                    <th className="p-3">Durasi</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Device Pengguna</th>
                    <th className="p-3">Catatan</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredKeys.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        Belum ada kode lisensi di kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredKeys.map((k) => (
                      <tr key={k.code} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900 select-all">
                          {k.code}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              k.tier === 'VVIP'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-blue-100 text-blue-800 border border-blue-300'
                            }`}
                          >
                            {k.tier}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-700">
                          {k.durationDays >= 999 ? 'Lifetime' : `${k.durationDays} Hari`}
                        </td>
                        <td className="p-3">
                          {k.isUsed ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Terpakai
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Tersedia (Ready)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {k.usedByDeviceId ? (
                            <span title={k.usedByDeviceId} className="truncate max-w-[140px] inline-block">
                              {k.usedByDeviceId}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3 text-slate-500 max-w-[160px] truncate" title={k.notes || ''}>
                          {k.notes || '-'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleCopy(k.code)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                          >
                            {copiedKey === k.code ? <CheckIcon size="xs" className="text-emerald-600 inline" /> : 'Salin'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════ DEVICES TAB ══════ */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Setiap pengunjung yang membuka web otomatis terdaftar di sini tanpa perlu login.
            </p>
            <button onClick={fetchData} className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1">
              <RefreshIcon size="xs" />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Device ID</th>
                  <th className="p-3">Status Tier</th>
                  <th className="p-3">Lokasi (IP/Negara)</th>
                  <th className="p-3">Total Kunjungan</th>
                  <th className="p-3">Kode Lisensi Aktif</th>
                  <th className="p-3">Terakhir Aktif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      Belum ada data perangkat yang terekam.
                    </td>
                  </tr>
                ) : (
                  devices.map((d) => (
                    <tr key={d.deviceId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 select-all">
                        {d.deviceId}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.tier === 'VVIP'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : d.tier === 'PRO'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {d.tier}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {d.city || d.country ? `${d.city || ''} ${d.country || ''}` : d.ipAddress || '-'}
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        {d.totalVisits} kali
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">
                        {d.activeLicenseCode || '-'}
                      </td>
                      <td className="p-3 text-slate-500">
                        {new Date(d.lastActiveAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
