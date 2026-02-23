import { NextRequest, NextResponse } from 'next/server';
import { verifyBridgeRequest } from '@/lib/copytrade77-bridge-security';
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

    const positionId = String(body?.positionId || '').trim();
    const closeReason = body?.closeReason ? String(body.closeReason).trim().toUpperCase() : 'MANUAL';
    const closePrice = Number(body?.closePrice || 0);
    const pipsResult = body?.pipsResult != null ? Number(body.pipsResult) : null;
    const pnlValue = body?.pnlValue != null ? Number(body.pnlValue) : null;
    const closedAt = body?.closedAt ? String(body.closedAt) : new Date().toISOString();

    if (!positionId) {
      return errorJson('INVALID_PAYLOAD', 'positionId wajib diisi.', 400);
    }

    const { data: posRow, error: posError } = await supabase
      .from('positions')
      .select('id,terminal_id,status')
      .eq('id', positionId)
      .maybeSingle();

    if (posError) throw posError;
    if (!posRow || String(posRow.terminal_id) !== auth.terminalId) {
      return errorJson('POSITION_NOT_FOUND', 'Position not found for this terminal.', 404);
    }

    const { error: rpcError } = await supabase.rpc('close_position', {
      p_position_id: positionId,
      p_close_reason: closeReason,
      p_close_price: closePrice,
      p_pips_result: pipsResult,
      p_pnl_value: pnlValue,
      p_closed_at: closedAt,
    });

    if (rpcError) throw rpcError;

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    const message = error?.message || 'Position close failed';
    if (['MISSING_X_ARRA_KEY', 'MISSING_X_ARRA_TS', 'MISSING_X_ARRA_NONCE', 'MISSING_X_ARRA_SIGN', 'INVALID_TIMESTAMP', 'TIMESTAMP_SKEW', 'INVALID_SIGNATURE', 'TERMINAL_NOT_FOUND', 'REPLAY_BLOCKED'].includes(message)) {
      return errorJson(message, message, 401);
    }
    if (message.startsWith('Unexpected token')) {
      return errorJson('INVALID_PAYLOAD', 'Invalid JSON payload', 400);
    }
    return errorJson('INTERNAL_ERROR', message, 500);
  }
}

