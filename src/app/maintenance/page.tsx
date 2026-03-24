import Link from 'next/link';

export default function MaintenancePage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6 py-20">
            <div className="w-full max-w-xl rounded-3xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-8 shadow-sm">
                <div className="mb-6 inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">
                    Maintenance Mode
                </div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
                    Sistem Sedang Maintenance
                </h1>
                <p className="text-[var(--text-secondary)] mb-8">
                    Untuk sementara akses fitur utama dibatasi. Tim sedang menyiapkan update APK terbaru.
                    Silakan download versi mobile terbaru di bawah ini.
                </p>

                <div className="space-y-3">
                    <Link
                        href="/download-app"
                        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
                    >
                        Buka Halaman Download APK
                    </Link>
                    <Link
                        href="/downloads/arra7-v3.0.0-beta.apk"
                        download
                        className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border-light)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                        Download APK v3.0.0 Beta
                    </Link>
                </div>

                <p className="mt-6 text-xs text-[var(--text-muted)]">
                    Jika Anda admin, login dengan email admin untuk bypass maintenance.
                </p>
            </div>
        </div>
    );
}
