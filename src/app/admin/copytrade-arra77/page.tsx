'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type AdminTab = 'overview' | 'topups' | 'providers' | 'follows' | 'bridge';

function fmtDate(v?: string | null) {
  if (!v) return '-';
  try {
    return new Date(v).toLocaleString('id-ID');
  } catch {
    return v;
  }
}

function fmtIdr(v: number) {
  return `Rp ${v.toLocaleString('id-ID')}`;
}

function lockDiagBadge(diag: any): { label: string; className: string } {
  const reason = String(diag?.reasonCode || '').toUpperCase();
  if (reason === 'LOCK_EXPECTED_OPEN_POSITION') {
    return { label: 'Lock Normal', className: 'bg-blue-100 text-blue-700' };
  }
  if (reason === 'STALE_LOCK_SUSPECT') {
    return { label: 'Reset Recommended', className: 'bg-rose-100 text-rose-700' };
  }
  if (reason === 'HEARTBEAT_STALE') {
    return { label: 'EA Offline', className: 'bg-slate-100 text-slate-700' };
  }
  if (reason === 'LOCK_OBSERVED_WAIT_SYNC') {
    return { label: 'Wait Sync', className: 'bg-amber-100 text-amber-700' };
  }
  return { label: 'Healthy', className: 'bg-emerald-100 text-emerald-700' };
}

export default function CopytradeArra77AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [forcingKey, setForcingKey] = useState('');
  const [resettingTerminalId, setResettingTerminalId] = useState('');
  const [topupScope, setTopupScope] = useState<'pending' | 'all'>('pending');
  const [providerScope, setProviderScope] = useState<'pending' | 'all'>('pending');
  const [followScope, setFollowScope] = useState<'active' | 'all'>('active');
  const [manualEmail, setManualEmail] = useState('');
  const [manualDirection, setManualDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [manualAmount, setManualAmount] = useState('10');
  const [manualNote, setManualNote] = useState('');

  const [stats, setStats] = useState<any>(null);
  const [topups, setTopups] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [follows, setFollows] = useState<any[]>([]);
  const [bridge, setBridge] = useState<{ terminals: any[]; logs: any[] }>({ terminals: [], logs: [] });

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=/admin/copytrade-arra77');
    if (status === 'authenticated') refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, topupScope, providerScope, followScope]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const cacheBuster = Date.now();
      const [a, b, c, d, e] = await Promise.all([
        fetch(`/api/admin/copytrade-arra77/stats?_=${cacheBuster}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/admin/copytrade-arra77/topups?scope=${topupScope}&_=${cacheBuster}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/admin/copytrade-arra77/providers?scope=${providerScope}&_=${cacheBuster}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/admin/copytrade-arra77/follows?scope=${followScope}&_=${cacheBuster}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/admin/copytrade-arra77/terminals?_=${cacheBuster}`, { cache: 'no-store' }).then((r) => r.json()),
      ]);
      if (a.status !== 'success') throw new Error(a.message || 'Unauthorized');
      setStats(a.stats || null);
      setTopups(b.status === 'success' ? b.orders || [] : []);
      setProviders(c.status === 'success' ? c.providers || [] : []);
      setFollows(d.status === 'success' ? d.follows || [] : []);
      setBridge(e.status === 'success' ? { terminals: e.terminals || [], logs: e.logs || [] } : { terminals: [], logs: [] });
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat admin copytrade.');
    } finally {
      setLoading(false);
    }
  }

  async function adminAct(url: string, body: any, okMsg: string): Promise<boolean> {
    setError('');
    setMessage('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok || j.status !== 'success') throw new Error(j.message || 'Action gagal');
      setMessage(j.message || okMsg);
      await refresh();
      return true;
    } catch (e: any) {
      setError(e?.message || 'Action gagal diproses.');
      return false;
    }
  }

  async function submitManualAdjust() {
    const email = manualEmail.trim().toLowerCase();
    const amount = Number(manualAmount);

    if (!email) {
      setMessage('');
      setError('Email user wajib diisi untuk adjustment manual.');
      return;
    }

    if (!Number.isInteger(amount) || amount <= 0) {
      setMessage('');
      setError('Jumlah credit harus angka bulat > 0.');
      return;
    }

    const ok = await adminAct(
      '/api/admin/copytrade-arra77/wallet-adjust',
      {
        email,
        direction: manualDirection,
        amountCredits: amount,
        note: manualNote.trim() || undefined,
      },
      'Saldo manual berhasil diubah.'
    );

    if (ok) {
      setManualEmail('');
      setManualDirection('CREDIT');
      setManualAmount('10');
      setManualNote('');
    }
  }

  async function forceTestSignal(side: 'BUY' | 'SELL', terminalId?: string) {
    const actionKey = `${side}:${terminalId || 'broadcast'}`;
    setForcingKey(actionKey);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/copytrade-arra77/force-test-signal', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          side,
          terminalId: terminalId || undefined,
          symbol: 'XAUUSD',
          timeframe: 'M15',
        }),
      });
      const j = await res.json();
      if (!res.ok || j.status !== 'success') throw new Error(j.message || 'Force test signal gagal');
      setMessage(`${j.message} (signalId: ${j.signalId})`);
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Force test signal gagal diproses.');
    } finally {
      setForcingKey('');
    }
  }

  async function resetLock(terminalId: string) {
    setResettingTerminalId(terminalId);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/admin/copytrade-arra77/reset-lock', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terminalId }),
      });
      const j = await res.json();
      if (!res.ok || j.status !== 'success') throw new Error(j.message || 'Reset lock gagal');
      setMessage(j.message || 'Reset lock berhasil.');
      await refresh();
    } catch (e: any) {
      setError(e?.message || 'Reset lock gagal diproses.');
    } finally {
      setResettingTerminalId('');
    }
  }

  if (status === 'loading' || loading) return <div className="min-h-screen pt-32 text-center">Loading admin copytrade...</div>;

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="rounded-3xl bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-blue-700">Admin Panel</p>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">Copytrade ARRA77 Operations</h1>
              <p className="text-sm text-slate-600 mt-1">Topup review, provider approval, follow monitoring, bridge monitoring.</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin" className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm">Admin Home</Link>
              <button onClick={refresh} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm">Refresh</button>
            </div>
          </div>
        </div>

        {message && <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">{message}</div>}
        {error && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">{error}</div>}

        <div className="flex gap-2 overflow-auto">
          {(['overview', 'topups', 'providers', 'follows', 'bridge'] as AdminTab[]).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm ${tab === k ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'}`}>
              {k === 'overview'
                ? 'Overview'
                : k === 'topups'
                  ? 'Topup Orders'
                  : k === 'providers'
                    ? 'Provider Review'
                    : k === 'follows'
                      ? 'Follow Monitor'
                      : 'Bridge Monitor'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="rounded-xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-500">Profiles</p><p className="text-2xl font-semibold">{stats?.profilesTotal ?? 0}</p></div>
            <div className="rounded-xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-500">Provider Approved</p><p className="text-2xl font-semibold">{stats?.providersApproved ?? 0}</p></div>
            <div className="rounded-xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-500">Pending Topup</p><p className="text-2xl font-semibold">{stats?.pendingTopups ?? 0}</p></div>
            <div className="rounded-xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-500">Follow Active</p><p className="text-2xl font-semibold">{stats?.followsActive ?? 0}</p></div>
            <div className="rounded-xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-500">Terminal Online</p><p className="text-2xl font-semibold">{stats?.terminalsOnline ?? 0}</p></div>
          </div>
        )}

        {tab === 'topups' && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setTopupScope('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs ${topupScope === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setTopupScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs ${topupScope === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                All
              </button>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3 space-y-2 mb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-800">Manual Credit Adjustment</p>
                <span className="text-xs text-slate-500">Untuk koreksi saldo tanpa topup order</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input
                  type="email"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="Email user copytrade"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                <select
                  value={manualDirection}
                  onChange={(e) => setManualDirection(e.target.value as 'CREDIT' | 'DEBIT')}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                >
                  <option value="CREDIT">CREDIT (+)</option>
                  <option value="DEBIT">DEBIT (-)</option>
                </select>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="Jumlah credit"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
                <button
                  onClick={submitManualAdjust}
                  className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm"
                >
                  Apply Adjustment
                </button>
              </div>
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Catatan admin (opsional)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
            {topups.length === 0 && <p className="text-sm text-slate-500">{topupScope === 'pending' ? 'Tidak ada topup yang perlu direview.' : 'Belum ada topup.'}</p>}
            {topups.map((o) => (
              <div key={o.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{o.profiles?.display_name || o.profiles?.email || 'User'} | {fmtIdr(o.amount_idr)} ({o.credit_amount} cr)</p>
                    <p className="text-xs text-slate-500">Status: {o.status} | {fmtDate(o.created_at)}</p>
                    {o.proof_image_url && <a href={o.proof_image_url} className="text-xs text-blue-600 underline" target="_blank" rel="noreferrer">Buka bukti</a>}
                  </div>
                  <div className="flex gap-2">
                    {['SUBMITTED', 'DRAFT'].includes(String(o.status || '').toUpperCase()) ? (
                      <>
                        <button onClick={() => adminAct('/api/admin/copytrade-arra77/topups', { action: 'APPROVE', orderId: o.id }, 'Topup approved')} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs">Approve</button>
                        <button onClick={() => adminAct('/api/admin/copytrade-arra77/topups', { action: 'REJECT', orderId: o.id }, 'Topup rejected')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">Reject</button>
                      </>
                    ) : (
                      <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs">No Action</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'providers' && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setProviderScope('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs ${providerScope === 'pending' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setProviderScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs ${providerScope === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                All
              </button>
            </div>
            {providers.length === 0 && <p className="text-sm text-slate-500">{providerScope === 'pending' ? 'Tidak ada provider yang perlu direview.' : 'Belum ada provider.'}</p>}
            {providers.map((p) => (
              <div key={p.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{p.display_name} @{p.slug}</p>
                    <p className="text-xs text-slate-500">Owner: {p.profiles?.email || '-'} | Risk {p.risk_level} | Status {p.status}</p>
                    {Array.isArray(p.provider_challenges) && p.provider_challenges[0] && (
                      <p className="text-xs text-blue-700">
                        Challenge {p.provider_challenges[0].total_trades || 0}/{p.provider_challenges[0].target_trades || 0}
                        {' '}| Winrate {p.provider_challenges[0].win_rate_pct || 0}% (min {p.provider_challenges[0].min_win_rate_pct || 0}%)
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {String(p.status || '').toUpperCase() === 'PENDING' && (
                      <>
                        <button onClick={() => adminAct('/api/admin/copytrade-arra77/providers', { action: 'APPROVE', providerId: p.id }, 'Provider approved')} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs">Approve</button>
                        <button onClick={() => adminAct('/api/admin/copytrade-arra77/providers', { action: 'REJECT', providerId: p.id }, 'Provider rejected')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">Reject</button>
                      </>
                    )}
                    {String(p.status || '').toUpperCase() === 'APPROVED' && (
                      <button onClick={() => adminAct('/api/admin/copytrade-arra77/providers', { action: 'SUSPEND', providerId: p.id }, 'Provider suspended')} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs">Suspend</button>
                    )}
                    {['REJECTED', 'SUSPENDED'].includes(String(p.status || '').toUpperCase()) && (
                      <button onClick={() => adminAct('/api/admin/copytrade-arra77/providers', { action: 'APPROVE', providerId: p.id }, 'Provider approved')} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs">Re-Approve</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'follows' && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => setFollowScope('active')}
                className={`px-3 py-1.5 rounded-lg text-xs ${followScope === 'active' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                Active
              </button>
              <button
                onClick={() => setFollowScope('all')}
                className={`px-3 py-1.5 rounded-lg text-xs ${followScope === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
              >
                All
              </button>
            </div>
            {follows.length === 0 && <p className="text-sm text-slate-500">{followScope === 'active' ? 'Tidak ada follow aktif.' : 'Belum ada data follow.'}</p>}
            {follows.map((f) => (
              <div key={f.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{f.follower?.name || f.follower?.email || 'Follower'} {'->'} {f.provider?.name || 'Provider'} @{f.provider?.slug || '-'}</p>
                    <p className="text-xs text-slate-500">Follower: {f.follower?.email || '-'} | Provider owner: {f.provider?.ownerEmail || '-'}</p>
                    <p className="text-xs text-slate-500">Status: {f.status} | Risk: {f.riskMode} | Lot: {f.fixedLot ?? '-'} | One-trade: {f.oneTradeAtATime ? 'ON' : 'OFF'}</p>
                    <p className="text-xs text-slate-500">Updated: {fmtDate(f.updatedAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'bridge' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                <h3 className="font-semibold">Bridge Terminals</h3>
                <div className="flex gap-2">
                  <button
                    disabled={forcingKey !== '' || resettingTerminalId !== ''}
                    onClick={() => forceTestSignal('BUY')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-60"
                  >
                    Force BUY (Broadcast)
                  </button>
                  <button
                    disabled={forcingKey !== '' || resettingTerminalId !== ''}
                    onClick={() => forceTestSignal('SELL')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs disabled:opacity-60"
                  >
                    Force SELL (Broadcast)
                  </button>
                </div>
              </div>
              <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                <p className="text-sm font-semibold text-slate-800">Checklist Monitoring Lock</p>
                <ol className="list-decimal ml-4 mt-2 space-y-1 text-xs text-slate-700">
                  <li>Jika Open(Follower) {'>'} 0: lock normal, jangan reset.</li>
                  <li>Jika Open(Follower)=0, Lock5m {'>='} 3, Heartbeat {'<='} 180s: lakukan reset lock.</li>
                  <li>Jika Heartbeat {'>'} 180s: minta user nyalakan EA dulu, jangan reset dulu.</li>
                  <li>Sesudah reset, test BUY/SELL 1x untuk validasi alur.</li>
                </ol>
              </div>
              <div className="space-y-2 max-h-96 overflow-auto">
                {bridge.terminals.length === 0 && <p className="text-sm text-slate-500">Belum ada terminal.</p>}
                {bridge.terminals.map((t) => {
                  const diag = t.lock_diagnostics || null;
                  const badge = lockDiagBadge(diag);
                  return (
                  <div key={t.id} className="border border-slate-100 rounded-xl p-2 text-sm space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{t.terminal_label} | {t.status} | {t.profiles?.email || '-'} | heartbeat {fmtDate(t.last_heartbeat_at)}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-medium ${badge.className}`}>{badge.label}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={forcingKey !== '' || resettingTerminalId !== ''}
                          onClick={() => forceTestSignal('BUY', String(t.id))}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-60"
                        >
                          Test BUY
                        </button>
                        <button
                          disabled={forcingKey !== '' || resettingTerminalId !== ''}
                          onClick={() => forceTestSignal('SELL', String(t.id))}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs disabled:opacity-60"
                        >
                          Test SELL
                        </button>
                        <button
                          disabled={forcingKey !== '' || resettingTerminalId !== ''}
                          onClick={() => resetLock(String(t.id))}
                          className={`px-2.5 py-1 rounded-lg text-white text-xs disabled:opacity-60 ${diag?.shouldReset ? 'bg-rose-600' : 'bg-amber-600'}`}
                        >
                          {resettingTerminalId === String(t.id) ? 'Resetting...' : diag?.shouldReset ? 'Reset Lock (Rec)' : 'Reset Lock'}
                        </button>
                      </div>
                    </div>
                    {diag && (
                      <>
                        <p className="text-xs text-slate-500">
                          Open(Terminal): {diag.openPositionsTerminal ?? 0} | Open(Follower): {diag.openPositionsFollower ?? 0} | Lock5m: {diag.lockEvents5m ?? 0} | HB age: {diag.heartbeatAgeSec ?? '-'}s
                        </p>
                        <p className="text-xs text-slate-600">
                          Rekomendasi: {diag.recommendation || '-'} {diag.lastLockAt ? `| Last lock: ${fmtDate(diag.lastLockAt)}` : ''}
                        </p>
                      </>
                    )}
                  </div>
                )})}
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <h3 className="font-semibold mb-2">Bridge Logs</h3>
              <div className="space-y-2 max-h-96 overflow-auto">
                {bridge.logs.length === 0 && <p className="text-sm text-slate-500">Belum ada logs.</p>}
                {bridge.logs.map((l) => <div key={l.id} className="border border-slate-100 rounded-xl p-2 text-sm">[{l.level}] {l.message} • {fmtDate(l.created_at)}</div>)}
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-400">Signed in admin: {session?.user?.email || '-'}</div>
      </div>
    </div>
  );
}
