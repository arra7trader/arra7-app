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

    const [profilesRes, providersRes, topupsPendingRes, terminalsOnlineRes, dispatchQueuedRes, positionsOpenRes, followsActiveRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('providers').select('id,status', { count: 'exact' }),
      supabase.from('topup_orders').select('id', { count: 'exact', head: true }).in('status', ['SUBMITTED', 'DRAFT']),
      supabase.from('bridge_terminals').select('id', { count: 'exact', head: true }).eq('status', 'ONLINE'),
      supabase.from('signal_dispatches').select('id', { count: 'exact', head: true }).in('status', ['QUEUED', 'SENT', 'ACKED']),
      supabase.from('positions').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
      supabase.from('follow_relations').select('id', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (providersRes.error) throw providersRes.error;
    if (topupsPendingRes.error) throw topupsPendingRes.error;
    if (terminalsOnlineRes.error) throw terminalsOnlineRes.error;
    if (dispatchQueuedRes.error) throw dispatchQueuedRes.error;
    if (positionsOpenRes.error) throw positionsOpenRes.error;
    if (followsActiveRes.error) throw followsActiveRes.error;

    const providerRows = providersRes.data || [];
    const providerApproved = providerRows.filter((row: any) => row.status === 'APPROVED').length;
    const providerPending = providerRows.filter((row: any) => row.status === 'PENDING').length;

    return NextResponse.json({
      status: 'success',
      stats: {
        profilesTotal: profilesRes.count || 0,
        providersApproved: providerApproved,
        providersPending: providerPending,
        pendingTopups: topupsPendingRes.count || 0,
        terminalsOnline: terminalsOnlineRes.count || 0,
        followsActive: followsActiveRes.count || 0,
        queuedDispatches: dispatchQueuedRes.count || 0,
        openPositions: positionsOpenRes.count || 0,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to load copytrade admin stats.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}
