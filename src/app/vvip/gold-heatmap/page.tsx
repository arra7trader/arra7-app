import GoldHeatmap from '@/components/vvip/GoldHeatmap';

export const metadata = {
    title: 'XAUUSD Probability Heatmap | ARRA7 VVIP',
    description: 'Real-time probability zones for Gold trading powered by Swissquote data and LSTM models.',
};

export default function GoldHeatmapPage() {
    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-12">
            <div className="container-wide">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Header Section */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            Gold Probability Heatmap
                        </h1>
                        <p className="text-[var(--text-secondary)] text-lg max-w-2xl">
                            Visualisasi real-time area probabilitas tertinggi untuk XAU/USD menggunakan data Swissquote dan algoritma LSTM.
                        </p>
                    </div>

                    {/* Main Content */}
                    <GoldHeatmap />

                    {/* Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="bg-white p-6 rounded-2xl border border-[var(--border-light)] shadow-sm">
                            <h3 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                📡 Swissquote Data
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                Data harga diambil langsung dari feed Swissquote Bank untuk akurasi presisi tinggi, menghindari lagging yang sering terjadi pada data free tier.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[var(--border-light)] shadow-sm">
                            <h3 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                🧠 LSTM Engine
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                Probability zones dihitung menggunakan ensemble model yang menggabungkan RSI, Volume Profile, dan volatilitas ATR dinamis.
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-[var(--border-light)] shadow-sm">
                            <h3 className="font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                🎯 How to Read
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                                Area <span className="text-green-600 font-bold">Hijau</span> menunjukkan potensi support kuat. Area <span className="text-red-600 font-bold">Merah</span> menunjukkan potensi resistance kuat. Semakin terang warnanya, semakin tinggi probabilitasnya.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
