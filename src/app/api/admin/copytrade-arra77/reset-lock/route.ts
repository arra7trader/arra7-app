import { NextRequest, NextResponse } from 'next/server';
import { requireCopytrade77Admin } from '@/lib/copytrade77-admin';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

type OpenPositionRow = {
  id: string;
  entry_price: number | null;
};

export async function POST(request: NextRequest) {
  if (!isCopytrade77Configured()) {
    return NextResponse.json(
      { status: 'error', message: 'Copytrade ARRA77 belum dikonfigurasi.' },
      { status: 503 }
    );
  }

  try {
    await requireCopytrade77Admin();
    const supabase = getCopytrade77AdminClient().schema('copytrade77');
    const body = await request.json();

    const terminalId = String(body?.terminalId || '').trim();
    if (!terminalId) {
      return NextResponse.json(
        { status: 'error', message: 'terminalId wajib diisi.' },
        { status: 400 }
      );
    }

    const terminalRes = await supabase
      .from('bridge_terminals')
      .select('id,follow_id,terminal_label')
      .eq('id', terminalId)
      .maybeSingle();
    if (terminalRes.error) throw terminalRes.error;
    if (!terminalRes.data?.id) {
      return NextResponse.json(
        { status: 'error', message: 'Terminal tidak ditemukan.' },
        { status: 404 }
      );
    }

    let followerProfileId: string | null = null;
    if (terminalRes.data.follow_id) {
      const followRes = await supabase
        .from('follow_relations')
        .select('follower_profile_id')
        .eq('id', String(terminalRes.data.follow_id))
        .maybeSingle();
      if (followRes.error) throw followRes.error;
      if (followRes.data?.follower_profile_id) {
        followerProfileId = String(followRes.data.follower_profile_id);
      }
    }

    let openPositionsQuery = supabase
      .from('positions')
      .select('id,entry_price')
      .eq('status', 'OPEN')
      .limit(300);

    if (followerProfileId) {
      openPositionsQuery = openPositionsQuery.eq('follower_profile_id', followerProfileId);
    } else {
      openPositionsQuery = openPositionsQuery.eq('terminal_id', terminalId);
    }

    const openPositionsRes = await openPositionsQuery;
    if (openPositionsRes.error) throw openPositionsRes.error;
    const openRows = (openPositionsRes.data || []) as OpenPositionRow[];

    if (openRows.length === 0) {
      return NextResponse.json({
        status: 'success',
        message: 'Tidak ada posisi OPEN yang perlu di-reset.',
        closedCount: 0,
      });
    }

    let closedCount = 0;
    for (const row of openRows) {
      const closePrice = Number(row.entry_price || 0);
      const closeRes = await supabase.rpc('close_position', {
        p_position_id: row.id,
        p_close_reason: 'MANUAL',
        p_close_price: closePrice > 0 ? closePrice : 0,
        p_pips_result: 0,
        p_pnl_value: 0,
        p_closed_at: new Date().toISOString(),
      });
      if (closeRes.error) throw closeRes.error;
      closedCount += 1;
    }

    await supabase.from('bridge_logs').insert({
      terminal_id: terminalId,
      level: 'WARN',
      message: `Admin reset lock menutup ${closedCount} posisi OPEN.`,
      metadata: {
        source: 'admin_reset_lock',
        terminalId,
        followerProfileId,
      },
    });

    return NextResponse.json({
      status: 'success',
      message: `Reset lock selesai. ${closedCount} posisi OPEN ditutup.`,
      closedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reset lock.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
