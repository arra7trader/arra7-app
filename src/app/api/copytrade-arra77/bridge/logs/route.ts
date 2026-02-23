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

    const level = body?.level ? String(body.level).trim().toUpperCase() : 'INFO';
    const message = body?.message ? String(body.message).trim() : '';
    const metadata = typeof body?.metadata === 'object' && body.metadata ? body.metadata : {};

    if (!message) {
      return errorJson('INVALID_PAYLOAD', 'message wajib diisi.', 400);
    }

    const { error } = await supabase.from('bridge_logs').insert({
      terminal_id: auth.terminalId,
      level,
      message,
      metadata,
    });

    if (error) throw error;

    if (level === 'ERROR') {
      await supabase
        .from('bridge_terminals')
        .update({ last_error: message, status: 'ONLINE', last_heartbeat_at: new Date().toISOString() })
        .eq('id', auth.terminalId);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    const message = error?.message || 'Bridge log failed';
    if (['MISSING_X_ARRA_KEY', 'MISSING_X_ARRA_TS', 'MISSING_X_ARRA_NONCE', 'MISSING_X_ARRA_SIGN', 'INVALID_TIMESTAMP', 'TIMESTAMP_SKEW', 'INVALID_SIGNATURE', 'TERMINAL_NOT_FOUND', 'REPLAY_BLOCKED'].includes(message)) {
      return errorJson(message, message, 401);
    }
    if (message.startsWith('Unexpected token')) {
      return errorJson('INVALID_PAYLOAD', 'Invalid JSON payload', 400);
    }
    return errorJson('INTERNAL_ERROR', message, 500);
  }
}

