import { NextRequest, NextResponse } from 'next/server';
import { verifyBridgeRequest } from '@/lib/copytrade77-bridge-security';
import { getCopytrade77PricingConfig } from '@/lib/copytrade77-pricing';
import { getSystemAdminCopytradeProfileId } from '@/lib/copytrade77-profile';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

function errorJson(code: string, message: string, status = 400) {
  return NextResponse.json({ status: 'error', code, message }, { status });
}

export async function POST(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return errorJson('NOT_CONFIGURED', 'Copytrade ARRA77 belum dikonfigurasi.', 503);
  }

  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const auth = await verifyBridgeRequest(request, rawBody);
    const supabase = getCopytrade77AdminClient().schema('copytrade77');
    const pricing = await getCopytrade77PricingConfig();

    const dispatchId = String(body?.dispatchId || '').trim();
    const mt5Ticket = Number(body?.mt5Ticket);
    const executedPrice = Number(body?.executedPrice);
    const volumeLots = Number(body?.volumeLots || 0.01);
    const idempotencyKey = body?.idempotencyKey ? String(body.idempotencyKey).trim() : null;

    if (!dispatchId || !Number.isFinite(mt5Ticket) || !Number.isFinite(executedPrice)) {
      return errorJson('INVALID_PAYLOAD', 'dispatchId/mt5Ticket/executedPrice wajib valid.', 400);
    }

    if (!Number.isFinite(volumeLots) || volumeLots <= 0) {
      return errorJson('INVALID_PAYLOAD', 'volumeLots tidak valid.', 400);
    }

    const adminProfileId = await getSystemAdminCopytradeProfileId();

    const { data: positionId, error: rpcError } = await supabase.rpc('apply_signal_execution', {
      p_dispatch_id: dispatchId,
      p_terminal_id: auth.terminalId,
      p_mt5_ticket: mt5Ticket,
      p_execution_price: executedPrice,
      p_volume_lots: volumeLots,
      p_admin_profile_id: adminProfileId,
      p_idempotency_key: idempotencyKey,
    });

    if (rpcError) {
      const message = rpcError.message || 'Execution settlement failed';
      if (message.includes('INSUFFICIENT_CREDITS')) {
        return errorJson('INSUFFICIENT_CREDITS', 'Follower credit is not enough.', 409);
      }
      if (message.includes('ONE_TRADE_LOCK_ACTIVE')) {
        return errorJson('ONE_TRADE_LOCK_ACTIVE', 'One-trade lock is active.', 409);
      }
      return errorJson('SETTLEMENT_FAILED', message, 500);
    }

    const { data: dispatchRow, error: dispatchError } = await supabase
      .from('signal_dispatches')
      .select('follow_id')
      .eq('id', dispatchId)
      .maybeSingle();
    if (dispatchError) throw dispatchError;

    let remainingCredits = null;
    if (dispatchRow?.follow_id) {
      const { data: followRow } = await supabase
        .from('follow_relations')
        .select('follower_profile_id')
        .eq('id', dispatchRow.follow_id)
        .maybeSingle();

      if (followRow?.follower_profile_id) {
        const walletRes = await supabase
          .from('wallets')
          .select('balance_credits')
          .eq('profile_id', followRow.follower_profile_id)
          .maybeSingle();
        remainingCredits = walletRes.data?.balance_credits ?? null;
      }
    }

    return NextResponse.json({
      status: 'ok',
      positionId,
      wallet: {
        debitedCredits: pricing.signalCostCredits,
        remainingCredits,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Executed reporting failed';
    if (['MISSING_X_ARRA_KEY', 'MISSING_X_ARRA_TS', 'MISSING_X_ARRA_NONCE', 'MISSING_X_ARRA_SIGN', 'INVALID_TIMESTAMP', 'TIMESTAMP_SKEW', 'INVALID_SIGNATURE', 'TERMINAL_NOT_FOUND', 'REPLAY_BLOCKED'].includes(message)) {
      return errorJson(message, message, 401);
    }
    if (message.startsWith('Unexpected token')) {
      return errorJson('INVALID_PAYLOAD', 'Invalid JSON payload', 400);
    }
    return errorJson('INTERNAL_ERROR', message, 500);
  }
}
