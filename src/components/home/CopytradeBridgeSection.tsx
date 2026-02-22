import Link from 'next/link';
import { ArrowRightIcon, CheckCircleSolidIcon, CpuChipIcon, SignalIcon } from '@/components/PremiumIcons';

const STEPS = [
  {
    title: '1. Generate License Key',
    desc: 'Login ke ARRA7, buka Copytrade Bridge, lalu generate license key untuk akun MT5 Anda.',
  },
  {
    title: '2. Download & Pasang EA',
    desc: 'Download file .ex5, copy ke folder Experts MT5, lalu attach EA ke chart pair yang Anda gunakan.',
  },
  {
    title: '3. Topup Kredit via QRIS',
    desc: 'Pilih paket kredit, bayar QRIS, kirim bukti bayar dari dashboard, lalu tunggu approve admin.',
  },
  {
    title: '4. Jalankan Auto Copytrade',
    desc: 'EA otomatis tarik sinyal terbaru, eksekusi order, dan kirim log hasil trade ke bridge Anda.',
  },
];

export default function CopytradeBridgeSection() {
  return (
    <section className="section-padding bg-[var(--bg-secondary)] border-y border-[var(--border-light)]">
      <div className="container-wide">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-[var(--border-light)] bg-white p-6 md:p-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold tracking-wide text-blue-700">
              <SignalIcon className="text-blue-600" size="sm" />
              COPYTRADE BRIDGE EA
            </span>
            <h2 className="mt-4 text-3xl font-black text-[var(--text-primary)] md:text-4xl">
              Auto Eksekusi Signal ke MT5, Lebih Mudah untuk Pemula
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)] md:text-base">
              Halaman ini khusus untuk user yang ingin copytrade memakai EA. Anda cukup setup sekali, setelah itu sistem akan sinkron otomatis
              antara dashboard ARRA7 dan terminal MT5.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {STEPS.map((step) => (
                <div key={step.title} className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border-light)] bg-white p-6 md:p-8">
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Ready To Start</p>
              <p className="mt-1 text-sm text-indigo-900">
                Download EA resmi ARRA7 lalu lanjut setup dari dashboard copytrade bridge.
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <Link
                href="/copytrade-bridge"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Buka Copytrade Bridge
                <ArrowRightIcon size="sm" />
              </Link>

              <a
                href="/downloads/Arra-Copytrade-Bridge.ex5"
                download
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-light)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary)]"
              >
                Download EA MT5 (.ex5)
              </a>

              <Link
                href="/copytrade/system"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-light)] bg-white px-4 py-3 text-sm font-bold text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary)]"
              >
                Lihat Panduan Setup
              </Link>
            </div>

            <div className="mt-6 space-y-2 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] p-4 text-xs text-[var(--text-secondary)]">
              <p className="flex items-start gap-2">
                <CheckCircleSolidIcon className="mt-0.5 text-green-600" size="sm" />
                Topup bridge menggunakan QRIS dengan verifikasi admin.
              </p>
              <p className="flex items-start gap-2">
                <CheckCircleSolidIcon className="mt-0.5 text-green-600" size="sm" />
                Satu kredit digunakan untuk satu eksekusi trade oleh EA.
              </p>
              <p className="flex items-start gap-2">
                <CpuChipIcon className="mt-0.5 text-blue-600" size="sm" />
                Mendukung mode keamanan signed request melalui secret bridge.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
