import { NextRequest, NextResponse } from 'next/server';
import { CT77_CONFIG } from '@/lib/copytrade77-config';
import { verifyBridgeRequest } from '@/lib/copytrade77-bridge-security';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

function errorJson(code: string, message: string, status = 400) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

export async function GET(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return errorJson('NOT_CONFIGURED', 'Copytrade ARRA77 belum dikonfigurasi.', 503);
  }

  try {
    const auth = await verifyBridgeRequest(request, '');
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    await supabase
      .from('bridge_terminals')
      .update({
        status: 'ONLINE',
        last_heartbeat_at: new Date().toISOString(),
        last_error: null,
      })
      .eq('id', auth.terminalId);

    const { data: dispatchRow, error: dispatchError } = await supabase
      .from('signal_dispatches')
      .select(`
        id,
        signal_id,
        follow_id,
        terminal_id,
        status,
        requested_at,
        signals!signal_dispatches_signal_id_fkey (
          id,
          provider_id,
          symbol,
          timeframe,
          side,
          order_type,
          entry_price,
          stop_loss,
          take_profit_1,
          take_profit_2,
          take_profit_3,
          valid_until
        )
      `)
      .eq('terminal_id', auth.terminalId)
      .eq('status', 'QUEUED')
      .order('requested_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (dispatchError) throw dispatchError;
    if (!dispatchRow) {
      return NextResponse.json({ status: 'ok', hasSignal: false });
    }

    const signal = (dispatchRow as any).signals;
    if (!signal) {
      return NextResponse.json({ status: 'ok', hasSignal: false });
    }

    const validUntil = signal.valid_until ? new Date(signal.valid_until) : null;
    if (validUntil && validUntil.getTime() < Date.now()) {
      await supabase
        .from('signal_dispatches')
        .update({ status: 'EXPIRED', error_message: 'Signal expired before dispatch' })
        .eq('id', dispatchRow.id);

      return NextResponse.json({ status: 'ok', hasSignal: false });
    }

    const { data: followRow, error: followError } = await supabase
      .from('follow_relations')
      .select('one_trade_at_a_time,max_concurrent_positions')
      .eq('id', dispatchRow.follow_id)
      .maybeSingle();

    if (followError) throw followError;

    await supabase
      .from('signal_dispatches')
      .update({
        status: 'SENT',
        sent_at: new Date().toISOString(),
      })
      .eq('id', dispatchRow.id)
      .eq('status', 'QUEUED');

    return NextResponse.json({
      status: 'ok',
      hasSignal: true,
      dispatch: {
        dispatchId: dispatchRow.id,
        signalId: signal.id,
        providerId: signal.provider_id,
        symbol: signal.symbol,
        timeframe: signal.timeframe,
        side: signal.side,
        orderType: signal.order_type,
        entryPrice: signal.entry_price,
        stopLoss: signal.stop_loss,
        takeProfit1: signal.take_profit_1,
        takeProfit2: signal.take_profit_2,
        takeProfit3: signal.take_profit_3,
        expiresAt: signal.valid_until,
        creditCost: CT77_CONFIG.signalCostCredits,
        risk: {
          oneTradeAtATime: Boolean(followRow?.one_trade_at_a_time ?? true),
          maxConcurrentPositions: Number(followRow?.max_concurrent_positions ?? 1),
        },
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Signal polling failed';
    if (['MISSING_X_ARRA_KEY', 'MISSING_X_ARRA_TS', 'MISSING_X_ARRA_NONCE', 'MISSING_X_ARRA_SIGN', 'INVALID_TIMESTAMP', 'TIMESTAMP_SKEW', 'INVALID_SIGNATURE', 'TERMINAL_NOT_FOUND', 'REPLAY_BLOCKED'].includes(message)) {
      return errorJson(message, message, 401);
    }
    return errorJson('INTERNAL_ERROR', message, 500);
  }
}

