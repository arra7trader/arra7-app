import { NextResponse } from 'next/server';
import { CT_QRIS_PLANS } from '@/lib/copytrade-topup-plans';

export async function GET() {
    return NextResponse.json({ success: true, plans: CT_QRIS_PLANS });
}
