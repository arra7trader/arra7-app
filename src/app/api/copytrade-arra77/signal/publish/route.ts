import { NextRequest, NextResponse } from 'next/server';
import { requireCopytrade77Admin } from '@/lib/copytrade77-admin';
import { isCopytrade77Configured } from '@/lib/supabase-copytrade77';
import {
  getOrCreateSystemProviderId,
  normalizeTradeSignal,
  publishSignalAndQueue,
} from '@/lib/copytrade77-signal-engine';

export const dynamic = 'force-dynamic';

function validateSignalShape(side: string, entry: number, sl: number, tp1: number): string | null {
  if (!Number.isFinite(entry) || !Number.isFinite(sl) || !Number.isFinite(tp1)) {
    return 'ENTRY/SL/TP1 wajib angka valid.';
  }
  if (side === 'BUY') {
    if (!(sl < entry && tp1 > entry)) return 'BUY harus punya SL < entry dan TP > entry.';
  } else if (side === 'SELL') {
    if (!(sl > entry && tp1 < entry)) return 'SELL harus punya SL > entry dan TP < entry.';
  } else {
    return 'side harus BUY atau SELL.';
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const { adminProfileId } = await requireCopytrade77Admin();
    const body = await request.json();

    const providerId = body?.providerId ? String(body.providerId).trim() : await getOrCreateSystemProviderId();
    const symbol = String(body?.symbol || 'XAUUSD').trim().toUpperCase();
    const timeframe = String(body?.timeframe || 'M15').trim().toUpperCase();
    const side = String(body?.side || '').trim().toUpperCase();
    const orderType = String(body?.orderType || 'MARKET').trim().toUpperCase();
    const entryPrice = Number(body?.entryPrice);
    const stopLoss = Number(body?.stopLoss);
    const takeProfit1 = Number(body?.takeProfit1);
    const takeProfit2 = body?.takeProfit2 != null ? Number(body.takeProfit2) : null;
    const takeProfit3 = body?.takeProfit3 != null ? Number(body.takeProfit3) : null;
    const confidence = body?.confidence != null ? Number(body.confidence) : null;
    const rawAnalysis = body?.rawAnalysis && typeof body.rawAnalysis === 'object' ? body.rawAnalysis : {};

    const shapeError = validateSignalShape(side, entryPrice, stopLoss, takeProfit1);
    if (shapeError) {
      return NextResponse.json({ status: 'error', message: shapeError }, { status: 400 });
    }

    const normalized = normalizeTradeSignal({
      symbol,
      timeframe,
      side: side as 'BUY' | 'SELL',
      orderType,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      confidence,
    });

    const published = await publishSignalAndQueue({
      providerId,
      signal: normalized,
      source: 'ARRA_AI',
      sourceRef: 'admin_manual_publish',
      rawAnalysis,
      createdByProfileId: adminProfileId,
    });

    return NextResponse.json({
      status: 'success',
      signalId: published.signalId,
      queuedDispatches: published.queuedDispatches,
      message: 'Signal berhasil dipublish ke queue copytrade.',
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to publish signal.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
