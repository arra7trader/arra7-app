import { NextRequest, NextResponse } from 'next/server';
import { CT77_CONFIG } from '@/lib/copytrade77-config';
import { requireCopytrade77Admin } from '@/lib/copytrade77-admin';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

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

async function getOrCreateArraSystemProviderId(adminProfileId: string): Promise<string> {
  const supabase = getCopytrade77AdminClient().schema('copytrade77');
  const systemSlug = 'arra77-system-ai';

  const existing = await supabase
    .from('providers')
    .select('id')
    .eq('slug', systemSlug)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data?.id) return String(existing.data.id);

  const created = await supabase
    .from('providers')
    .insert({
      profile_id: adminProfileId,
      display_name: 'ARRA77 System AI',
      slug: systemSlug,
      bio: 'System provider untuk auto-publish signal AI ARRA7.',
      status: 'APPROVED',
      risk_level: 'MEDIUM',
      approved_by_profile_id: adminProfileId,
      approved_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (created.error || !created.data?.id) {
    throw created.error || new Error('Failed to create system provider.');
  }

  return String(created.data.id);
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
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const providerId = body?.providerId ? String(body.providerId).trim() : await getOrCreateArraSystemProviderId(adminProfileId);
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

    const validUntil = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const signalInsertRes = await supabase
      .from('signals')
      .insert({
        provider_id: providerId,
        source: 'ARRA_AI',
        symbol,
        timeframe,
        side,
        order_type: orderType,
        entry_price: entryPrice,
        stop_loss: stopLoss,
        take_profit_1: takeProfit1,
        take_profit_2: takeProfit2,
        take_profit_3: takeProfit3,
        min_stop_distance_pips: CT77_CONFIG.minSlPips,
        confidence,
        raw_analysis: rawAnalysis,
        status: 'PUBLISHED',
        valid_from: new Date().toISOString(),
        valid_until: validUntil,
        created_by_profile_id: adminProfileId,
      })
      .select('id')
      .single();

    if (signalInsertRes.error || !signalInsertRes.data?.id) {
      throw signalInsertRes.error || new Error('Failed to publish signal.');
    }

    const signalId = String(signalInsertRes.data.id);

    const activeFollowsRes = await supabase
      .from('follow_relations')
      .select('id,status')
      .eq('provider_id', providerId)
      .eq('status', 'ACTIVE');

    if (activeFollowsRes.error) throw activeFollowsRes.error;

    const followIds = (activeFollowsRes.data || []).map((row) => String(row.id));
    if (followIds.length === 0) {
      return NextResponse.json({
        status: 'success',
        signalId,
        queuedDispatches: 0,
        message: 'Signal dipublish, belum ada follower aktif.',
      });
    }

    const terminalRes = await supabase
      .from('bridge_terminals')
      .select('id,follow_id,status')
      .in('follow_id', followIds)
      .neq('status', 'BLOCKED');

    if (terminalRes.error) throw terminalRes.error;

    const dispatchRows = (terminalRes.data || []).map((terminal) => ({
      signal_id: signalId,
      follow_id: terminal.follow_id,
      terminal_id: terminal.id,
      status: 'QUEUED',
      requested_at: new Date().toISOString(),
    }));

    if (dispatchRows.length > 0) {
      const dispatchInsertRes = await supabase
        .from('signal_dispatches')
        .insert(dispatchRows)
        .select('id');

      if (dispatchInsertRes.error) throw dispatchInsertRes.error;
    }

    return NextResponse.json({
      status: 'success',
      signalId,
      queuedDispatches: dispatchRows.length,
      message: 'Signal berhasil dipublish ke queue copytrade.',
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to publish signal.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

