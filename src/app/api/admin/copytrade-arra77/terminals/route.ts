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
          follow_id,
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

    const terminals = terminalsRes.data || [];
    const logs = logsRes.data || [];

    const terminalIds = terminals
      .map((row: any) => String(row?.id || '').trim())
      .filter(Boolean);
    const followIds = terminals
      .map((row: any) => String(row?.follow_id || '').trim())
      .filter(Boolean);

    const followerProfileByFollowId = new Map<string, string>();
    if (followIds.length > 0) {
      const followRes = await supabase
        .from('follow_relations')
        .select('id,follower_profile_id')
        .in('id', followIds);
      if (followRes.error) throw followRes.error;
      for (const row of followRes.data || []) {
        const followId = String((row as any)?.id || '').trim();
        const followerProfileId = String((row as any)?.follower_profile_id || '').trim();
        if (followId && followerProfileId) {
          followerProfileByFollowId.set(followId, followerProfileId);
        }
      }
    }

    const followerProfileIds = Array.from(new Set(Array.from(followerProfileByFollowId.values())));

    const openCountByTerminal = new Map<string, number>();
    if (terminalIds.length > 0) {
      const openByTerminalRes = await supabase
        .from('positions')
        .select('terminal_id')
        .eq('status', 'OPEN')
        .in('terminal_id', terminalIds);
      if (openByTerminalRes.error) throw openByTerminalRes.error;
      for (const row of openByTerminalRes.data || []) {
        const terminalId = String((row as any)?.terminal_id || '').trim();
        if (!terminalId) continue;
        openCountByTerminal.set(terminalId, (openCountByTerminal.get(terminalId) || 0) + 1);
      }
    }

    const openCountByFollower = new Map<string, number>();
    if (followerProfileIds.length > 0) {
      const openByFollowerRes = await supabase
        .from('positions')
        .select('follower_profile_id')
        .eq('status', 'OPEN')
        .in('follower_profile_id', followerProfileIds);
      if (openByFollowerRes.error) throw openByFollowerRes.error;
      for (const row of openByFollowerRes.data || []) {
        const followerId = String((row as any)?.follower_profile_id || '').trim();
        if (!followerId) continue;
        openCountByFollower.set(followerId, (openCountByFollower.get(followerId) || 0) + 1);
      }
    }

    const lockLogCountByTerminal = new Map<string, number>();
    const lastLockLogAtByTerminal = new Map<string, string>();
    if (terminalIds.length > 0) {
      const sinceIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const lockLogsRes = await supabase
        .from('bridge_logs')
        .select('terminal_id,created_at,message')
        .in('terminal_id', terminalIds)
        .ilike('message', '%ONE_TRADE_LOCK_ACTIVE%')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(2000);
      if (lockLogsRes.error) throw lockLogsRes.error;
      for (const row of lockLogsRes.data || []) {
        const terminalId = String((row as any)?.terminal_id || '').trim();
        if (!terminalId) continue;
        lockLogCountByTerminal.set(terminalId, (lockLogCountByTerminal.get(terminalId) || 0) + 1);
        if (!lastLockLogAtByTerminal.has(terminalId)) {
          lastLockLogAtByTerminal.set(terminalId, String((row as any)?.created_at || ''));
        }
      }
    }

    const now = Date.now();
    const terminalsWithDiagnostics = terminals.map((row: any) => {
      const terminalId = String(row?.id || '').trim();
      const followId = String(row?.follow_id || '').trim();
      const followerProfileId = followerProfileByFollowId.get(followId) || null;

      const openPositionsTerminal = openCountByTerminal.get(terminalId) || 0;
      const openPositionsFollower = followerProfileId
        ? openCountByFollower.get(followerProfileId) || 0
        : openPositionsTerminal;
      const lockEvents5m = lockLogCountByTerminal.get(terminalId) || 0;
      const lastLockAt = lastLockLogAtByTerminal.get(terminalId) || null;

      const heartbeatMs = row?.last_heartbeat_at ? new Date(row.last_heartbeat_at).getTime() : NaN;
      const heartbeatAgeSec = Number.isFinite(heartbeatMs)
        ? Math.max(0, Math.floor((now - heartbeatMs) / 1000))
        : null;
      const heartbeatOnline = heartbeatAgeSec !== null && heartbeatAgeSec <= 180;

      let reasonCode = 'HEALTHY';
      let recommendation = 'Tidak perlu reset lock.';
      let shouldReset = false;

      if (openPositionsFollower > 0) {
        reasonCode = 'LOCK_EXPECTED_OPEN_POSITION';
        recommendation = 'Normal: masih ada posisi OPEN. Tunggu TP/SL/close.';
      } else if (lockEvents5m >= 3 && heartbeatOnline) {
        reasonCode = 'STALE_LOCK_SUSPECT';
        recommendation = 'Disarankan reset lock: lock berulang padahal posisi OPEN = 0.';
        shouldReset = true;
      } else if (lockEvents5m > 0) {
        reasonCode = 'LOCK_OBSERVED_WAIT_SYNC';
        recommendation = 'Tunggu sinkronisasi 1-2 menit lalu cek ulang.';
      } else if (!heartbeatOnline) {
        reasonCode = 'HEARTBEAT_STALE';
        recommendation = 'EA/terminal belum heartbeat stabil. Minta user nyalakan EA.';
      }

      return {
        ...row,
        lock_diagnostics: {
          reasonCode,
          recommendation,
          shouldReset,
          openPositionsTerminal,
          openPositionsFollower,
          lockEvents5m,
          lastLockAt,
          heartbeatAgeSec,
        },
      };
    });

    return NextResponse.json({
      status: 'success',
      terminals: terminalsWithDiagnostics,
      logs,
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to fetch bridge terminals.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
