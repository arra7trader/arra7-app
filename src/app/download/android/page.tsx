import Link from 'next/link';

const apkFile = '/downloads/arra7-v3.0.0-beta.apk';

export default function DownloadAndroidPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pt-32 pb-16 px-6">
      <div className="max-w-2xl mx-auto rounded-3xl border border-[var(--border-light)] bg-white p-8 shadow-sm">
        <div className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 mb-4">
          Android Direct Download
        </div>

        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">ARRA7 Android APK</h1>
        <p className="text-[var(--text-secondary)] mb-6">
          Gunakan link ini untuk download langsung APK terbaru ARRA7 Mobile.
        </p>

        <div className="rounded-2xl border border-[var(--border-light)] p-4 mb-6">
          <p className="text-sm text-[var(--text-muted)]">File</p>
          <p className="font-semibold text-[var(--text-primary)]">arra7-v3.0.0-beta.apk</p>
          <p className="text-sm text-[var(--text-secondary)]">Versi 3.0.0 Beta, Android 7+</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={apkFile}
            download="arra7-v3.0.0-beta.apk"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Download APK Sekarang
          </Link>
          <Link
            href="/download-app"
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-[var(--border-light)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
          >
            Lihat Detail Rilis
          </Link>
        </div>
      </div>
    </div>
  );
}
