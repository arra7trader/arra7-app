'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

interface BotMembership {
  userId: string;
  email: string;
  name: string;
  planCode: string;
  status: 'invited' | 'active' | 'expired' | 'revoked';
  telegramUsername: string | null;
  telegramChatId: string | null;
  source: string;
  invitedAt: string | null;
  activatedAt: string | null;
  expiresAt: string | null;
}

interface TelebotPaymentConfirmation {
  id: number;
  userId: string;
  email: string;
  displayName: string;
  planCode: string;
  durationCode: string;
  amountIdr: number;
  telegramUsername: string | null;
  paymentChannel: string;
  status: 'submitted' | 'approved' | 'rejected';
  adminNote: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
}

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

export default function PrivateBotAdminPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [memberships, setMemberships] = useState<BotMembership[]>([]);
  const [paymentConfirmations, setPaymentConfirmations] = useState<TelebotPaymentConfirmation[]>([]);
  const [email, setEmail] = useState('');
  const [telegramUsername, setTelegramUsername] = useState('');
  const [days, setDays] = useState(30);
  const [latestCode, setLatestCode] = useState<{ userId: string; code: string } | null>(null);
  const [query, setQuery] = useState('');

  const isAdmin = session?.user?.email && ADMIN_EMAILS.includes(session.user.email);

  useEffect(() => {
    if (isAdmin) {
      void fetchData();
    }
  }, [isAdmin]);

  async function fetchData() {
    try {
      const res = await fetch('/api/admin/bot-private');
      const data = await res.json();
      if (data.status === 'success') {
        setMemberships(data.memberships || []);
        setPaymentConfirmations(data.paymentConfirmations || []);
      } else {
        setMessage({ type: 'error', text: data.message || 'Gagal memuat data TELEBOT.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error saat memuat data TELEBOT.' });
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: string, targetEmail?: string, userId?: string) {
    setSaving(true);
    setMessage(null);
    setLatestCode(null);
    try {
      const res = await fetch('/api/admin/bot-private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          email: targetEmail,
          userId,
          days,
          telegramUsername
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setMessage({ type: 'success', text: data.message });
        if (data.code) {
          setLatestCode({ userId: data.userId, code: data.code });
        }
        await fetchData();
      } else {
        setMessage({ type: 'error', text: data.message || 'Aksi gagal dijalankan.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error saat menjalankan aksi.' });
    } finally {
      setSaving(false);
    }
  }

  const filteredMemberships = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return memberships;
    return memberships.filter((item) =>
      [item.email, item.name, item.userId, item.telegramUsername || '', item.telegramChatId || '', item.status]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [memberships, query]);

  const pendingPaymentConfirmations = useMemo(
    () => paymentConfirmations.filter((item) => item.status === 'submitted'),
    [paymentConfirmations]
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-2">Access Denied</h1>
          <p className="text-[var(--text-muted)]">Admin only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pt-36 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">TELEBOT Control</h1>
            <p className="text-sm text-[var(--text-secondary)]">User bayar di web, kirim username Telegram, lalu admin approve akses TELEBOT dari sini.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void fetchData()}
              className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
            >
              Refresh
            </button>
            <Link href="/admin" className="px-4 py-2 rounded-xl border border-[var(--border-light)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
              ← Admin Home
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[380px,1fr] gap-6">
          <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-light)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Approve TELEBOT</h2>
            <label className="block text-sm text-[var(--text-secondary)] mb-2">Email user ARRA</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@email.com"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] outline-none"
            />

            <label className="block text-sm text-[var(--text-secondary)] mt-4 mb-2">Username Telegram</label>
            <input
              value={telegramUsername}
              onChange={(e) => setTelegramUsername(e.target.value)}
              placeholder="@username_telegram"
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] outline-none"
            />
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Username ini akan di-whitelist. Saat user chat <code>/start</code>, bot akan auto-link jika username cocok.
            </p>

            <label className="block text-sm text-[var(--text-secondary)] mt-4 mb-2">Durasi aktif (hari)</label>
            <input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] outline-none"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <button
                disabled={saving || !email.trim()}
                onClick={() => void runAction('invite', email)}
                className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50"
              >
                Tandai Pending
              </button>
              <button
                disabled={saving || !email.trim()}
                onClick={() => void runAction('activate', email)}
                className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
              >
                Approve
              </button>
            </div>

            {latestCode && (
              <div className="mt-5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
                <p className="text-xs text-blue-300 mb-1">Link code terakhir</p>
                <p className="text-2xl font-bold tracking-[0.2em] text-blue-200">{latestCode.code}</p>
                <p className="text-xs text-blue-200/80 mt-2">User ID: {latestCode.userId}</p>
              </div>
            )}

            {message && (
              <div className={`mt-5 rounded-xl border p-4 text-sm ${message.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-red-500/30 bg-red-500/10 text-red-300'
                }`}>
                {message.text}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-light)] p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Konfirmasi Pembayaran TELEBOT</h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Daftar submit pembayaran dari web sebelum admin approve akses.</p>
                  <p className="text-sm text-[var(--text-secondary)]">{pendingPaymentConfirmations.length} pending</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                      <th className="py-3 pr-3">User</th>
                      <th className="py-3 pr-3">Username</th>
                      <th className="py-3 pr-3">Paket</th>
                      <th className="py-3 pr-3">Nominal</th>
                      <th className="py-3 pr-3">Status</th>
                      <th className="py-3 pr-3">Submitted</th>
                      <th className="py-3 pr-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentConfirmations.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-[var(--text-muted)]">
                          Belum ada konfirmasi pembayaran TELEBOT dari web.
                        </td>
                      </tr>
                    )}
                    {paymentConfirmations.map((item) => (
                      <tr key={item.id} className="border-b border-[var(--border-light)]/60 align-top">
                        <td className="py-4 pr-3">
                          <div className="font-medium text-[var(--text-primary)]">{item.displayName || '-'}</div>
                          <div className="text-[var(--text-secondary)]">{item.email}</div>
                          <div className="text-xs text-[var(--text-muted)] font-mono mt-1">{item.userId}</div>
                        </td>
                        <td className="py-4 pr-3 text-[var(--text-secondary)]">
                          {item.telegramUsername ? `@${item.telegramUsername}` : 'Belum diisi'}
                        </td>
                        <td className="py-4 pr-3 text-[var(--text-secondary)]">
                          <div>{item.planCode}</div>
                          <div className="text-xs text-[var(--text-muted)] mt-1">{item.durationCode}</div>
                        </td>
                        <td className="py-4 pr-3 text-[var(--text-secondary)]">
                          Rp {item.amountIdr.toLocaleString('id-ID')}
                        </td>
                        <td className="py-4 pr-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : item.status === 'rejected'
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-blue-500/15 text-blue-300'
                            }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-4 pr-3 text-[var(--text-secondary)]">
                          {item.submittedAt ? new Date(item.submittedAt).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="py-4 pr-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEmail(item.email);
                              setTelegramUsername(item.telegramUsername || '');
                            }}
                            className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs"
                          >
                            Pakai Data Ini
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-light)] p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Member TELEBOT</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">Approve user setelah pembayaran TELEBOT terverifikasi.</p>
                <p className="text-sm text-[var(--text-secondary)]">{filteredMemberships.length} record</p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari email, user ID, status, telegram..."
                className="w-full md:w-80 px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-primary)] outline-none"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="text-left text-[var(--text-secondary)] border-b border-[var(--border-light)]">
                    <th className="py-3 pr-3">User</th>
                    <th className="py-3 pr-3">Status</th>
                    <th className="py-3 pr-3">Username</th>
                    <th className="py-3 pr-3">Telegram</th>
                    <th className="py-3 pr-3">Expired</th>
                    <th className="py-3 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMemberships.map((item) => (
                    <tr key={item.userId} className="border-b border-[var(--border-light)]/60 align-top">
                      <td className="py-4 pr-3">
                        <div className="font-medium text-[var(--text-primary)]">{item.name || '-'}</div>
                        <div className="text-[var(--text-secondary)]">{item.email}</div>
                        <div className="text-xs text-[var(--text-muted)] font-mono mt-1">{item.userId}</div>
                      </td>
                      <td className="py-4 pr-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : item.status === 'invited'
                            ? 'bg-blue-500/15 text-blue-300'
                            : item.status === 'expired'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-red-500/15 text-red-300'
                          }`}>
                          {item.status}
                        </span>
                        <div className="text-xs text-[var(--text-muted)] mt-2">{item.planCode}</div>
                      </td>
                      <td className="py-4 pr-3 text-[var(--text-secondary)]">
                        {item.telegramUsername ? `@${item.telegramUsername}` : 'Belum diisi'}
                      </td>
                      <td className="py-4 pr-3 text-[var(--text-secondary)]">
                        {item.telegramChatId || 'Belum link'}
                      </td>
                      <td className="py-4 pr-3 text-[var(--text-secondary)]">
                        {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td className="py-4 pr-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={saving}
                            onClick={() => void runAction('activate', undefined, item.userId)}
                            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs disabled:opacity-50"
                          >
                            Activate
                          </button>
                          <button
                            disabled={saving}
                            onClick={() => void runAction('create_link', undefined, item.userId)}
                            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs disabled:opacity-50"
                          >
                            Link Code
                          </button>
                          <button
                            disabled={saving}
                            onClick={() => void runAction('deactivate', undefined, item.userId)}
                            className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-50"
                          >
                            Nonaktifkan
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
