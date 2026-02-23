import { NextRequest, NextResponse } from 'next/server';
import { requireCopytrade77SessionProfile } from '@/lib/copytrade77-session';
import { getCopytrade77AdminClient, isCopytrade77Configured } from '@/lib/supabase-copytrade77';

export const dynamic = 'force-dynamic';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
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
    const displayName = String(body?.displayName || '').trim();
    const bio = body?.bio ? String(body.bio).trim() : null;
    const riskLevel = body?.riskLevel ? String(body.riskLevel).trim().toUpperCase() : 'MEDIUM';

    if (!displayName) {
      return NextResponse.json(
        { status: 'error', message: 'displayName wajib diisi.' },
        { status: 400 }
      );
    }

    const slugBase = slugify(displayName) || `provider-${Date.now()}`;
    const slug = `${slugBase}-${profile.id.slice(0, 6)}`;
    const supabase = getCopytrade77AdminClient().schema('copytrade77');

    const { error } = await supabase.from('providers').upsert(
      {
        profile_id: profile.id,
        display_name: displayName,
        slug,
        bio,
        risk_level: ['LOW', 'MEDIUM', 'HIGH'].includes(riskLevel) ? riskLevel : 'MEDIUM',
        status: 'PENDING',
      },
      { onConflict: 'profile_id' }
    );

    if (error) throw error;

    return NextResponse.json({
      status: 'success',
      message: 'Pengajuan provider berhasil dikirim. Menunggu review admin.',
    });
  } catch (error: any) {
    const message = error?.message || 'Failed to submit provider application.';
    const status = message === 'UNAUTHORIZED' ? 401 : 500;
    return NextResponse.json({ status: 'error', message }, { status });
  }
}

