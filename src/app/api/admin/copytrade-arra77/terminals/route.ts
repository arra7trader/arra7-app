import { NextResponse } from 'next/server';
import { requireCopytrade77Admin } from '@/lib/copytrade77-admin';
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
    await requireCopytrade77Admin();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const [terminalsRes, logsRes] = await Promise.all([
      supabase
        .from('bridge_terminals')
        .select(`
          id,
          terminal_label,
          mt5_login,
          broker_name,
          server_name,
          status,
          symbol,
          timeframe,
          last_heartbeat_at,
          last_seen_version,
          last_error,
          profiles!bridge_terminals_profile_id_fkey (
            id,
            email,
            display_name
          )
        `)
        .order('updated_at', { ascending: false })
        .limit(100),
      supabase
        .from('bridge_logs')
        .select('id,terminal_id,level,message,metadata,created_at')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (terminalsRes.error) throw terminalsRes.error;
    if (logsRes.error) throw logsRes.error;

    return NextResponse.json({
      status: 'success',
      terminals: terminalsRes.data || [],
      logs: logsRes.data || [],
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to fetch bridge terminals.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

