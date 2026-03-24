import Link from 'next/link';

const apkFile = '/downloads/arra7-v3.0.0-beta.apk';

const highlights = [
  {
    title: 'Login Google Native',
    desc: 'Masuk langsung dengan Google tanpa webview.',
  },
  {
    title: 'Analisa Market Cepat',
    desc: 'Forex, Gold, dan Crypto dalam satu layar.',
  },
  {
    title: 'Info Akun Real-time',
    desc: 'Tier membership dan quota sinkron dari server.',
  },
  {
    title: 'UI Modern Minimal',
    desc: 'Desain simple, responsif, dan ringan di Android.',
  },
];

const steps = [
  'Download file APK dari tombol di bawah.',
  'Buka file APK dan izinkan install dari sumber ini.',
  'Jalankan aplikasi lalu login dengan akun ARRA7 Anda.',
];

export default function DownloadAppPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pt-32 pb-16">
      <div className="container-apple section-padding max-w-5xl mx-auto">
        <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-8 md:p-10 shadow-sm mb-8">
          <div className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400 mb-4">
            Android APK v3.0.0 Beta
          </div>

          <h1 className="headline-lg mb-3">Download ARRA7 Mobile</h1>
          <p className="body-lg text-[var(--text-secondary)] max-w-2xl mb-6">
            Versi terbaru aplikasi Android sudah tersedia dengan menu lebih simple dan performa lebih ringan.
          </p>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-[var(--border-light)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Versi</p>
              <p className="text-lg font-bold">3.0.0 Beta</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-light)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Ukuran</p>
              <p className="text-lg font-bold">~25 MB</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-light)] p-4">
              <p className="text-xs text-[var(--text-muted)]">Minimum Android</p>
              <p className="text-lg font-bold">Android 7+</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={apkFile}
              download="arra7-v3.0.0-beta.apk"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-6 py-3 font-semibold hover:bg-slate-800 transition-colors"
            >
              Download APK v3.0.0 Beta
            </Link>
            <Link
              href="/download/android"
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border-light)] px-6 py-3 font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              Buka Link Download Alternatif
            </Link>
          </div>

          <p className="mt-4 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Catatan: versi ini adalah build beta terbaru sebelum rilis final Play Store.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Fitur Utama</h2>
            <div className="space-y-4">
              {highlights.map((item) => (
                <div key={item.title} className="rounded-xl bg-[var(--bg-secondary)] p-4">
                  <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-primary)] p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Cara Install</h2>
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl bg-[var(--bg-secondary)] p-4">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
