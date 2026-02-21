import { NextResponse } from 'next/server';

// QRIS credit packages for CT Bridge
// Payment is manual: user scans QRIS, confirms via Telegram, admin adds credits
export const CT_QRIS_PLANS = [
    { id: 'CT_50', credits: 50, price: 50000, priceLabel: 'Rp 50.000', label: '50 Kredit' },
    { id: 'CT_100', credits: 100, price: 90000, priceLabel: 'Rp 90.000', label: '100 Kredit', badge: 'Hemat 10%' },
    { id: 'CT_200', credits: 200, price: 160000, priceLabel: 'Rp 160.000', label: '200 Kredit', badge: 'Hemat 20%' },
];

export async function GET() {
    return NextResponse.json({ success: true, plans: CT_QRIS_PLANS });
}
