import Link from 'next/link';

export default function DownloadAppPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-20">
            <div className="container-apple section-padding">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="headline-lg mb-4">
                        Download ARRA7 Mobile
                    </h1>
                    <p className="body-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                        Analisa pasar di genggaman Anda! Akses fitur PRO langsung dari smartphone.
                    </p>
                </div>

                {/* App Preview */}
                <div className="max-w-4xl mx-auto mb-12">
                    <div className="relative bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl p-8 text-white overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center justify-center mb-6">
                                <img
                                    src="/icons/a7-icon.jpg"
                                    alt="ARRA7 Logo"
                                    className="w-24 h-24 rounded-2xl shadow-xl"
                                />
                            </div>
                            <h2 className="text-3xl font-bold text-center mb-2">ARRA7</h2>
                            <p className="text-center text-white/90 mb-6">AI Trading Analytics Platform</p>

                            {/* Version Info */}
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold">v1.0.0</div>
                                        <div className="text-sm text-white/80">Version</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">~15MB</div>
                                        <div className="text-sm text-white/80">Size</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold">7.0+</div>
                                        <div className="text-sm text-white/80">Android</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="max-w-4xl mx-auto mb-12">
                    <h3 className="text-2xl font-bold text-center mb-8">Fitur Unggulan</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="card-glass p-6 text-center">
                            <div className="flex justify-center mb-4">
                                <svg className="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                </svg>
                            </div>
                            <h4 className="font-semibold mb-2">Analisa Forex</h4>
                            <p className="text-sm text-[var(--text-secondary)]">
                                AI-powered analysis untuk semua pasangan forex populer
                            </p>
                        </div>

                        <div className="card-glass p-6 text-center">
                            <div className="flex justify-center mb-4">
                                <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                                </svg>
                            </div>
                            <h4 className="font-semibold mb-2">Analisa Saham</h4>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Analisis mendalam untuk saham global favorit
                            </p>
                        </div>

                        <div className="card-glass p-6 text-center">
                            <div className="flex justify-center mb-4">
                                <svg className="w-16 h-16 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                                </svg>
                            </div>
                            <h4 className="font-semibold mb-2">Fibonacci Kanji</h4>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Calculator dengan visualisasi chart interaktif
                            </p>
                        </div>
                    </div>
                </div>

                {/* Download Section */}
                <div className="max-w-md mx-auto text-center mb-8">
                    <a
                        href="/downloads/arra7-v1.0.0.apk"
                        download
                        className="block"
                    >
                        <button className="btn-primary w-full text-lg py-4 px-8 mb-4">
                            <span className="flex items-center justify-center gap-3">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Download APK</span>
                            </span>
                        </button>
                    </a>

                    {/* Requirements */}
                    <div className="card-glass p-6">
                        <h4 className="font-semibold mb-3 flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Persyaratan</span>
                        </h4>
                        <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
                            <li className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Android 7.0 (Nougat) atau lebih tinggi</span>
                            </li>
                            <li className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Koneksi internet untuk analisis</span>
                            </li>
                            <li className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                <span className="font-semibold text-[var(--primary)]">
                                    Langganan PRO atau VVIP diperlukan
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Installation Guide */}
                <div className="max-w-2xl mx-auto mb-12">
                    <h3 className="text-2xl font-bold text-center mb-6">Cara Install</h3>
                    <div className="space-y-4">
                        <div className="card-glass p-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                    1
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1">Download APK</h4>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Klik tombol download di atas untuk mengunduh file APK ke perangkat Anda
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-glass p-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                    2
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1">Izinkan Instalasi</h4>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Buka Settings → Security → Aktifkan "Unknown Sources" atau "Install Unknown Apps"
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="card-glass p-6">
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                                    3
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1">Install & Login</h4>
                                    <p className="text-sm text-[var(--text-secondary)]">
                                        Buka file APK yang sudah didownload, install, lalu login dengan akun ARRA7 Anda
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ */}
                <div className="max-w-2xl mx-auto mb-12">
                    <h3 className="text-2xl font-bold text-center mb-6">FAQ</h3>
                    <div className="space-y-4">
                        <details className="card-glass p-6 cursor-pointer">
                            <summary className="font-semibold flex justify-between">
                                <span>Apakah aplikasi ini gratis?</span>
                                <span>▼</span>
                            </summary>
                            <p className="text-sm text-[var(--text-secondary)] mt-3">
                                Download gratis, namun Anda memerlukan langganan PRO atau VVIP untuk mengakses semua fitur analisis.
                            </p>
                        </details>

                        <details className="card-glass p-6 cursor-pointer">
                            <summary className="font-semibold flex justify-between">
                                <span>Apakah tersedia di Google Play Store?</span>
                                <span>▼</span>
                            </summary>
                            <p className="text-sm text-[var(--text-secondary)] mt-3">
                                Saat ini hanya tersedia via direct download. Versi Play Store akan segera hadir.
                            </p>
                        </details>

                        <details className="card-glass p-6 cursor-pointer">
                            <summary className="font-semibold flex justify-between">
                                <span>Bagaimana cara upgrade ke PRO?</span>
                                <span>▼</span>
                            </summary>
                            <p className="text-sm text-[var(--text-secondary)] mt-3">
                                Login ke website ARRA7, buka halaman Pricing, dan pilih paket PRO atau VVIP. Setelah berlangganan, login di aplikasi dengan akun yang sama.
                            </p>
                        </details>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center">
                    <Link href="/">
                        <button className="btn-secondary">
                            ← Kembali ke Beranda
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
