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

    const payload: Record<string, unknown> = {
      status: 'ONLINE',
      last_heartbeat_at: new Date().toISOString(),
      mt5_login: body?.mt5Login ? String(body.mt5Login) : null,
      broker_name: body?.broker ? String(body.broker) : null,
      server_name: body?.server ? String(body.server) : null,
      symbol: body?.symbol ? String(body.symbol) : null,
      timeframe: body?.timeframe ? String(body.timeframe) : null,
      last_seen_version: body?.eaVersion ? String(body.eaVersion) : null,
      last_error: null,
    };

    const { error } = await supabase
      .from('bridge_terminals')
      .update(payload)
      .eq('id', auth.terminalId);

    if (error) throw error;

    return NextResponse.json({
      status: 'ok',
      serverTime: new Date().toISOString(),
    });
  } catch (error: any) {
    const message = error?.message || 'Heartbeat failed';
    if (['MISSING_X_ARRA_KEY', 'MISSING_X_ARRA_TS', 'MISSING_X_ARRA_NONCE', 'MISSING_X_ARRA_SIGN', 'INVALID_TIMESTAMP', 'TIMESTAMP_SKEW', 'INVALID_SIGNATURE', 'TERMINAL_NOT_FOUND', 'REPLAY_BLOCKED'].includes(message)) {
      return errorJson(message, message, 401);
    }
    if (message.startsWith('Unexpected token')) {
      return errorJson('INVALID_PAYLOAD', 'Invalid JSON payload', 400);
    }
    return errorJson('INTERNAL_ERROR', message, 500);
  }
}

