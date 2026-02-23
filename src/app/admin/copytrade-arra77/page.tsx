'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

type AdminTab = 'overview' | 'topups' | 'providers' | 'bridge';

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

export default function CopytradeArra77AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [forcingKey, setForcingKey] = useState('');

  const [stats, setStats] = useState<any>(null);
  const [topups, setTopups] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [bridge, setBridge] = useState<{ terminals: any[]; logs: any[] }>({ terminals: [], logs: [] });
  const pendingTopups = topups.filter((o) => ['SUBMITTED', 'DRAFT'].includes(String(o?.status || '').toUpperCase()));
  const pendingProviders = providers.filter((p) => String(p?.status || '').toUpperCase() === 'PENDING');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?callbackUrl=/admin/copytrade-arra77');
    if (status === 'authenticated') refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const cacheBuster = Date.now();
      const [a, b, c, d] = await Promise.all([
        fetch(`/api/admin/copytrade-arra77/stats?_=${cacheBuster}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/admin/copytrade-arra77/topups?_=${cacheBuster}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/admin/copytrade-arra77/providers?_=${cacheBuster}`, { cache: 'no-store' }).then((r) => r.json()),
        fetch(`/api/admin/copytrade-arra77/terminals?_=${cacheBuster}`, { cache: 'no-store' }).then((r) => r.json()),
      ]);
      if (a.status !== 'success') throw new Error(a.message || 'Unauthorized');
      setStats(a.stats || null);
      setTopups(b.status === 'success' ? b.orders || [] : []);
      setProviders(c.status === 'success' ? c.providers || [] : []);
      setBridge(d.status === 'success' ? { terminals: d.terminals || [], logs: d.logs || [] } : { terminals: [], logs: [] });
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat admin copytrade.');
    } finally {
      setLoading(false);
    }
  }

  async function adminAct(url: string, body: any, okMsg: string) {
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
    } catch (e: any) {
      setError(e?.message || 'Action gagal diproses.');
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

  if (status === 'loading' || loading) return <div className="min-h-screen pt-32 text-center">Loading admin copytrade...</div>;

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 sm:px-6 lg:px-8 bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="rounded-3xl bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-blue-700">Admin Panel</p>
              <h1 className="text-2xl font-bold text-slate-900 mt-1">Copytrade ARRA77 Operations</h1>
              <p className="text-sm text-slate-600 mt-1">Topup review, provider approval, bridge monitoring.</p>
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
          {(['overview', 'topups', 'providers', 'bridge'] as AdminTab[]).map((k) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-xl text-sm ${tab === k ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'}`}>
              {k === 'overview' ? 'Overview' : k === 'topups' ? 'Topup Orders' : k === 'providers' ? 'Provider Review' : 'Bridge Monitor'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-500">Profiles</p><p className="text-2xl font-semibold">{stats?.profilesTotal ?? 0}</p></div>
            <div className="rounded-xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-500">Provider Approved</p><p className="text-2xl font-semibold">{stats?.providersApproved ?? 0}</p></div>
            <div className="rounded-xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-500">Pending Topup</p><p className="text-2xl font-semibold">{stats?.pendingTopups ?? 0}</p></div>
            <div className="rounded-xl bg-white border border-slate-200 p-4"><p className="text-xs text-slate-500">Terminal Online</p><p className="text-2xl font-semibold">{stats?.terminalsOnline ?? 0}</p></div>
          </div>
        )}

        {tab === 'topups' && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
            {pendingTopups.length === 0 && <p className="text-sm text-slate-500">Tidak ada topup yang perlu direview.</p>}
            {pendingTopups.map((o) => (
              <div key={o.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{o.profiles?.display_name || o.profiles?.email || 'User'} • {fmtIdr(o.amount_idr)} ({o.credit_amount} cr)</p>
                    <p className="text-xs text-slate-500">Status: {o.status} • {fmtDate(o.created_at)}</p>
                    {o.proof_image_url && <a href={o.proof_image_url} className="text-xs text-blue-600 underline" target="_blank" rel="noreferrer">Buka bukti</a>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => adminAct('/api/admin/copytrade-arra77/topups', { action: 'APPROVE', orderId: o.id }, 'Topup approved')} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs">Approve</button>
                    <button onClick={() => adminAct('/api/admin/copytrade-arra77/topups', { action: 'REJECT', orderId: o.id }, 'Topup rejected')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'providers' && (
          <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-2">
            {pendingProviders.length === 0 && <p className="text-sm text-slate-500">Tidak ada provider yang perlu direview.</p>}
            {pendingProviders.map((p) => (
              <div key={p.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-sm">{p.display_name} @{p.slug}</p>
                    <p className="text-xs text-slate-500">Owner: {p.profiles?.email || '-'} • Risk {p.risk_level} • Status {p.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => adminAct('/api/admin/copytrade-arra77/providers', { action: 'APPROVE', providerId: p.id }, 'Provider approved')} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs">Approve</button>
                    <button onClick={() => adminAct('/api/admin/copytrade-arra77/providers', { action: 'REJECT', providerId: p.id }, 'Provider rejected')} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs">Reject</button>
                    <button onClick={() => adminAct('/api/admin/copytrade-arra77/providers', { action: 'SUSPEND', providerId: p.id }, 'Provider suspended')} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs">Suspend</button>
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
                    disabled={forcingKey !== ''}
                    onClick={() => forceTestSignal('BUY')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-60"
                  >
                    Force BUY (Broadcast)
                  </button>
                  <button
                    disabled={forcingKey !== ''}
                    onClick={() => forceTestSignal('SELL')}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs disabled:opacity-60"
                  >
                    Force SELL (Broadcast)
                  </button>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-auto">
                {bridge.terminals.length === 0 && <p className="text-sm text-slate-500">Belum ada terminal.</p>}
                {bridge.terminals.map((t) => (
                  <div key={t.id} className="border border-slate-100 rounded-xl p-2 text-sm">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>{t.terminal_label} | {t.status} | {t.profiles?.email || '-'} | heartbeat {fmtDate(t.last_heartbeat_at)}</div>
                      <div className="flex gap-2">
                        <button
                          disabled={forcingKey !== ''}
                          onClick={() => forceTestSignal('BUY', String(t.id))}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-60"
                        >
                          Test BUY
                        </button>
                        <button
                          disabled={forcingKey !== ''}
                          onClick={() => forceTestSignal('SELL', String(t.id))}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs disabled:opacity-60"
                        >
                          Test SELL
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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

