import Link from 'next/link';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, BellAlertIcon, ChartBarIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import PineScriptViewer from '@/components/arra-cronos/PineScriptViewer';

export const metadata = {
    title: 'ARRA Cronos untuk TradingView',
    description: 'Cara membaca indikator ARRA Cronos pada chart TradingView dari candle pasar yang teramati.',
};

const features = [
    { title: 'Jalur forecast', description: 'Garis proyeksi dan koridor ATR memperlihatkan skenario harga untuk beberapa candle ke depan.', icon: ChartBarIcon },
    { title: 'Setup tetap', description: 'Entry, SL, TP1, TP2, dan jalur forecast dibekukan setelah setup terkonfirmasi pada candle tertutup.', icon: BellAlertIcon },
    { title: 'Audit level', description: 'Penanda di chart mencatat TP, SL, candle ambigu, dan batas waktu setup yang tersentuh.', icon: ShieldCheckIcon },
];

export default function ArraCronosIndicatorPage() {
    return (
        <main className="min-h-screen bg-[#080d14] px-4 pb-16 pt-28 text-white sm:px-8">
            <div className="mx-auto max-w-5xl">
                <Link href="/arra-cronos" className="mb-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-400 transition hover:text-cyan-200">
                    <ArrowLeftIcon className="h-4 w-4" /> Kembali ke ARRA Cronos desk
                </Link>
                
                <section className="relative overflow-hidden rounded-3xl border border-cyan-200/15 bg-gradient-to-br from-[#111c2b] via-[#0d1520] to-[#101126] p-7 sm:p-10">
                    <div className="absolute -right-12 -top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
                    <div className="relative max-w-3xl">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-cyan-100">
                            ARRA CRONOS · TRADINGVIEW
                        </div>
                        <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                            Data pasar yang <span className="text-cyan-200">terbaca jelas.</span>
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">
                            Indikator Pine Script membaca OHLCV dari simbol dan timeframe chart aktif untuk menggambar forecast teknikal, koridor volatilitas, dan level setup. Setup hanya dikonfirmasi dari candle tertutup; level serta jalur yang sudah tercatat tidak bergeser saat candle berikutnya terbentuk. Indikator tidak mengirim order broker.
                        </p>
                        <div className="mt-7 flex flex-wrap gap-3">
                            <Link href="/arra-cronos" className="rounded-xl bg-cyan-200 px-4 py-3 text-xs font-extrabold text-slate-950 transition hover:bg-cyan-100">
                                Buka multi-market desk
                            </Link>
                            <a href="https://www.tradingview.com/chart/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-3 text-xs font-bold text-slate-200 transition hover:border-cyan-200/50 hover:text-cyan-100">
                                Buka TradingView <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                            </a>
                        </div>
                    </div>
                </section>

                <section className="mt-6 grid gap-3 md:grid-cols-3">
                    {features.map(({ title, description, icon: Icon }) => (
                        <article key={title} className="rounded-2xl border border-slate-800 bg-[#0c121c] p-5">
                            <Icon className="h-5 w-5 text-cyan-200" />
                            <h2 className="mt-4 text-sm font-extrabold">{title}</h2>
                            <p className="mt-2 text-xs leading-6 text-slate-500">{description}</p>
                        </article>
                    ))}
                </section>

                {/* Interactive Pine Script Viewer & Downloader */}
                <PineScriptViewer />

                <section className="mt-6 rounded-2xl border border-slate-800 bg-[#0c121c] p-5 sm:p-7">
                    <h2 className="text-lg font-extrabold">Panduan Pasang Indikator di TradingView</h2>
                    <ol className="mt-4 grid gap-4 sm:grid-cols-2">
                        {[
                            ['01', 'Salin Script di Atas', 'Klik tombol "Salin Script (Copy)" di panel atas atau download file .pine.'],
                            ['02', 'Buka Pine Editor', 'Di halaman chart TradingView, buka panel Pine Editor di bagian bawah chart.'],
                            ['03', 'Paste & Simpan', 'Buat script baru di Pine Editor, paste seluruh kode, lalu klik tombol "Save".'],
                            ['04', 'Add to Chart', 'Klik tombol "Add to chart". Atur periode EMA, RSI, dan ATR sesuai kebutuhan.'],
                        ].map(([number, title, detail]) => (
                            <li key={number} className="flex gap-3 rounded-xl border border-slate-800/70 bg-[#080d14] p-4">
                                <span className="font-mono text-xs font-bold text-cyan-200">{number}</span>
                                <span>
                                    <span className="text-xs font-bold text-slate-200">{title}</span>
                                    <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">{detail}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>

                <aside className="mt-6 rounded-2xl border border-amber-200/10 bg-amber-100/[.035] p-5 text-[11px] leading-relaxed text-slate-500">
                    <strong className="text-amber-100">Forecast adalah estimasi teknikal.</strong> Feed TradingView dapat berbeda dari feed web sehingga harga dan hasil pemantauan level tidak selalu identik. Candle OHLC yang menyentuh TP dan SL sekaligus ditandai ambigu karena urutan sentuhannya tidak diketahui. Indikator bukan jaminan akurasi atau keuntungan dan tidak mengirim order broker.
                </aside>
            </div>
        </main>
    );
}
