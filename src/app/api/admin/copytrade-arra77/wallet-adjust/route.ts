import { NextRequest, NextResponse } from 'next/server';
import { requireCopytrade77Admin } from '@/lib/copytrade77-admin';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    const email = String(body?.email || '').trim().toLowerCase();
    const profileId = String(body?.profileId || '').trim();
    const direction = String(body?.direction || '')
      .trim()
      .toUpperCase();
    const amountCredits = Number(body?.amountCredits);
    const note = body?.note ? String(body.note).trim().slice(0, 300) : null;

    if (!profileId && !email) {
      return NextResponse.json(
        { status: 'error', message: 'Isi profileId atau email user.' },
        { status: 400 }
      );
    }

    if (profileId && !UUID_RE.test(profileId)) {
      return NextResponse.json(
        { status: 'error', message: 'Format profileId tidak valid.' },
        { status: 400 }
      );
    }

    if (!['CREDIT', 'DEBIT'].includes(direction)) {
      return NextResponse.json(
        { status: 'error', message: 'direction harus CREDIT atau DEBIT.' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(amountCredits) || amountCredits <= 0) {
      return NextResponse.json(
        { status: 'error', message: 'amountCredits harus integer > 0.' },
        { status: 400 }
      );
    }

    let profile: { id: string; email: string | null; display_name: string | null } | null = null;

    if (profileId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,display_name')
        .eq('id', profileId)
        .maybeSingle();
      if (error) throw error;
      profile = data;
    } else {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,display_name')
        .ilike('email', email)
        .maybeSingle();
      if (error) throw error;
      profile = data;
    }

    if (!profile) {
      return NextResponse.json(
        { status: 'error', message: 'User copytrade tidak ditemukan.' },
        { status: 404 }
      );
    }

    const idempotencyKey = `manual-adjust-${profile.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const description = note || `Manual ${direction.toLowerCase()} by admin`;

    const { data: balanceAfter, error: adjustError } = await supabase.rpc('adjust_wallet', {
      p_profile_id: profile.id,
      p_direction: direction,
      p_amount_credits: amountCredits,
      p_entry_type: 'ADMIN_ADJUSTMENT',
      p_reference_table: 'profiles',
      p_reference_id: profile.id,
      p_description: description,
      p_idempotency_key: idempotencyKey,
    });

    if (adjustError) throw adjustError;

    return NextResponse.json({
      status: 'success',
      message: `Saldo user berhasil ${direction === 'CREDIT' ? 'ditambah' : 'dikurangi'} ${amountCredits} credit.`,
      result: {
        profileId: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        direction,
        amountCredits,
        balanceAfter,
      },
    });
  } catch (error: unknown) {
    const rawMessage =
      error instanceof Error ? error.message : String(error || 'Failed to adjust wallet.');
    if (rawMessage.includes('INSUFFICIENT_CREDITS')) {
      return NextResponse.json(
        { status: 'error', message: 'Saldo user tidak cukup untuk DEBIT.' },
        { status: 400 }
      );
    }
    const status = rawMessage === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message: rawMessage }, { status });
  }
}
