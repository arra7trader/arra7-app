'use client';

import Link from 'next/link';

export default function CopytradeSystemGuidePage() {
    return (
        <section className="min-h-screen bg-[var(--bg-primary)] px-4 pb-12 pt-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="rounded-3xl border border-[var(--border-light)] bg-white p-6">
                    <h1 className="text-3xl font-black text-[var(--text-primary)]">Copytrade System Guide</h1>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        Dokumen operasional untuk user, provider, bridge user (EA), dan admin. Gunakan halaman ini sebagai SOP harian agar flow copytrade
                        tetap konsisten.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <article className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                        <h2 className="text-base font-bold text-[var(--text-primary)]">A. Follower Workflow</h2>
                        <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-[var(--text-secondary)]">
                            <li>Buka marketplace di <code>/copytrade</code> dan pilih provider.</li>
                            <li>Klik follow, atur risk profile di modal follow settings.</li>
                            <li>Pantau signal feed di <code>/copytrade/dashboard</code>.</li>
                            <li>Untuk signal premium, lakukan purchase dengan koin.</li>
                            <li>Kelola provider relation: resume, pause, atau stop.</li>
                        </ol>
                    </article>

                    <article className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                        <h2 className="text-base font-bold text-[var(--text-primary)]">B. Provider Workflow</h2>
                        <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-[var(--text-secondary)]">
                            <li>Daftar provider lewat <code>/copytrade/become-provider</code>.</li>
                            <li>Tunggu approval admin.</li>
                            <li>Kelola profil dan monetisasi di <code>/copytrade/provider</code>.</li>
                            <li>Posting signal dari tab provider workspace di dashboard.</li>
                            <li>Update status signal (TP/SL/Cancel) agar statistik rapi.</li>
                        </ol>
                    </article>

                    <article className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                        <h2 className="text-base font-bold text-[var(--text-primary)]">C. Bridge EA Workflow</h2>
                        <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-[var(--text-secondary)]">
                            <li>Masuk ke <code>/copytrade-bridge</code> lalu generate license key.</li>
                            <li>Pasang EA bridge di MT4/MT5 dan isi license key.</li>
                            <li>Lakukan topup kredit (1 kredit = 1 eksekusi).</li>
                            <li>EA membaca endpoint validasi signal secara periodik.</li>
                            <li>Trade log dikirim balik agar balance dan status sinkron.</li>
                        </ol>
                    </article>

                    <article className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                        <h2 className="text-base font-bold text-[var(--text-primary)]">D. Admin Workflow</h2>
                        <ol className="mt-3 list-decimal space-y-1 pl-4 text-sm text-[var(--text-secondary)]">
                            <li>Buka <code>/admin/copytrade-bridge</code>.</li>
                            <li>Review provider registrations (approve/reject/deactivate).</li>
                            <li>Broadcast signal bridge untuk EA users.</li>
                            <li>Kelola saldo kredit user bridge.</li>
                            <li>Pantau metric aktif user, signal volume, dan konsistensi logs.</li>
                        </ol>
                    </article>
                </div>

                <div className="rounded-2xl border border-[var(--border-light)] bg-white p-5">
                    <h2 className="text-base font-bold text-[var(--text-primary)]">Endpoint Map</h2>
                    <div className="mt-3 grid gap-2 text-xs text-[var(--text-secondary)] md:grid-cols-2">
                        <p><code>/api/copytrade/providers</code> - provider list + registration.</p>
                        <p><code>/api/copytrade/relationships</code> - follower relationship state.</p>
                        <p><code>/api/copytrade/signals</code> - follower/provider signal feed.</p>
                        <p><code>/api/copytrade/purchase-signal</code> - unlock premium signal.</p>
                        <p><code>/api/copytrade-bridge/user/*</code> - key + bridge identity.</p>
                        <p><code>/api/copytrade-bridge/trade/*</code> - trade logs + history.</p>
                        <p><code>/api/admin/copytrade</code> - provider moderation.</p>
                        <p><code>/api/admin/copytrade-bridge/*</code> - bridge operational admin.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Link href="/copytrade" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Open Marketplace</Link>
                    <Link href="/copytrade/dashboard" className="rounded-xl border border-[var(--border-light)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">Open Dashboard</Link>
                    <Link href="/copytrade-bridge" className="rounded-xl border border-[var(--border-light)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-primary)]">Open Bridge</Link>
                </div>
            </div>
        </section>
    );
}
