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

    const dispatchId = String(body?.dispatchId || '').trim();
    const reasonCode = body?.reasonCode ? String(body.reasonCode).trim() : 'REJECTED';
    const reason = body?.reason ? String(body.reason).trim() : null;

    if (!dispatchId) {
      return errorJson('INVALID_PAYLOAD', 'dispatchId wajib diisi.', 400);
    }

    const { error } = await supabase
      .from('signal_dispatches')
      .update({
        status: 'REJECTED',
        skip_reason: reasonCode,
        error_message: reason,
      })
      .eq('id', dispatchId)
      .eq('terminal_id', auth.terminalId)
      .in('status', ['QUEUED', 'SENT', 'ACKED']);

    if (error) throw error;

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    const message = error?.message || 'Rejected reporting failed';
    if (['MISSING_X_ARRA_KEY', 'MISSING_X_ARRA_TS', 'MISSING_X_ARRA_NONCE', 'MISSING_X_ARRA_SIGN', 'INVALID_TIMESTAMP', 'TIMESTAMP_SKEW', 'INVALID_SIGNATURE', 'TERMINAL_NOT_FOUND', 'REPLAY_BLOCKED'].includes(message)) {
      return errorJson(message, message, 401);
    }
    if (message.startsWith('Unexpected token')) {
      return errorJson('INVALID_PAYLOAD', 'Invalid JSON payload', 400);
    }
    return errorJson('INTERNAL_ERROR', message, 500);
  }
}

