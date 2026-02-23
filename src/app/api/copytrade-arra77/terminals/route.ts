import { NextRequest, NextResponse } from 'next/server';
import { generateBridgeCredentials } from '@/lib/copytrade77-bridge-security';
import { requireCopytrade77SessionProfile } from '@/lib/copytrade77-session';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const { profile } = await requireCopytrade77SessionProfile();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const { data, error } = await supabase
      .from('bridge_terminals')
      .select('id,terminal_label,mt5_login,broker_name,server_name,symbol,timeframe,status,last_heartbeat_at,last_seen_version,last_error,created_at')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ status: 'success', terminals: data || [] });
  } catch (error: any) {
    const message = error?.message || 'Failed to load terminals.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

export async function POST(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    const { profile } = await requireCopytrade77SessionProfile();
    const body = await request.json();

    const terminalLabel = String(body?.terminalLabel || '').trim();
    const mt5Login = body?.mt5Login ? String(body.mt5Login).trim() : null;
    const brokerName = body?.brokerName ? String(body.brokerName).trim() : null;
    const serverName = body?.serverName ? String(body.serverName).trim() : null;
    const symbol = body?.symbol ? String(body.symbol).trim() : null;
    const timeframe = body?.timeframe ? String(body.timeframe).trim() : null;
    const followId = body?.followId ? String(body.followId).trim() : null;

    if (!terminalLabel) {
      return NextResponse.json(
        { status: 'error', message: 'terminalLabel wajib diisi.' },
        { status: 400 }
      );
    }

    const { bridgeKey, bridgeSecret } = generateBridgeCredentials();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const insertPayload: Record<string, unknown> = {
      profile_id: profile.id,
      terminal_label: terminalLabel,
      mt5_login: mt5Login,
      broker_name: brokerName,
      server_name: serverName,
      symbol,
      timeframe,
      bridge_key: bridgeKey,
      bridge_secret: bridgeSecret,
      status: 'OFFLINE',
    };

    if (followId) {
      insertPayload.follow_id = followId;
    }

    const { data, error } = await supabase
      .from('bridge_terminals')
      .insert(insertPayload)
      .select('id,terminal_label,bridge_key,status,created_at')
      .single();

    if (error) throw error;

    return NextResponse.json({
      status: 'success',
      message: 'Terminal bridge berhasil dibuat.',
      terminal: data,
      credentials: {
        bridgeKey,
        bridgeSecret,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to create terminal bridge.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

