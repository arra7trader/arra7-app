import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEffectiveTelebotMembership, getTelebotBonusVideoConfig, TELEBOT_BONUS_VIDEO_TITLE } from '@/lib/telebot-bonus';

export const dynamic = 'force-dynamic';

export default async function TelebotBonusPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/telebot-bonus');
  }

  const membership = await getEffectiveTelebotMembership(session.user.id);
  const config = getTelebotBonusVideoConfig();
  const isActive = membership?.status === 'active';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/60 p-8 md:p-10 mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400 mb-3">Exclusive Bonus</p>
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Bonus Video TELEBOT</h1>
          <p className="text-[var(--text-secondary)] max-w-3xl leading-relaxed">
            Member TELEBOT aktif mendapatkan bonus materi eksklusif <strong>{TELEBOT_BONUS_VIDEO_TITLE}</strong>.
            Video ini dibuat khusus untuk membantu Anda membaca entry yang lebih tajam dan lebih rapi.
          </p>
        </div>

        {!isActive ? (
          <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-8">
            <h2 className="text-2xl font-semibold mb-3">Akses Belum Aktif</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Bonus video ini hanya terbuka untuk member TELEBOT yang statusnya masih aktif.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/telebot" className="px-5 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors">
                Aktivasi TELEBOT
              </Link>
              <Link href="/pricing" className="px-5 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-light)] hover:bg-[var(--bg-tertiary)] transition-colors">
                Lihat Pricing
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/60 p-5">
              {config.isConfigured ? (
                <div className="space-y-4">
                  <div className="relative aspect-video overflow-hidden rounded-2xl bg-black">
                    {config.youtubeEmbedUrl ? (
                      <iframe
                        className="h-full w-full"
                        src={config.youtubeEmbedUrl}
                        title={TELEBOT_BONUS_VIDEO_TITLE}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    ) : (
                      <video
                        className="h-full w-full"
                        controls
                        preload="metadata"
                        controlsList="nodownload"
                        playsInline
                        src="/api/user/telebot/bonus-video"
                      />
                    )}
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    Video ini bersifat eksklusif untuk member TELEBOT aktif. Akses akan mengikuti status membership Anda.
                  </p>
                  {config.externalUrl ? (
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={config.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors"
                      >
                        Buka Video di Tab Baru
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6">
                  <h2 className="text-xl font-semibold mb-2">Video Sedang Disiapkan</h2>
                  <p className="text-[var(--text-secondary)]">
                    Akses bonus video untuk member TELEBOT sudah aktif, tetapi file videonya masih belum terhubung ke storage server.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)]/60 p-6">
              <h2 className="text-xl font-semibold mb-4">Yang Anda Dapat</h2>
              <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                <p>1. Video edukasi eksklusif khusus member TELEBOT.</p>
                <p>2. Materi fokus untuk sniper entry dan pembacaan setup yang lebih presisi.</p>
                <p>3. Akses mengikuti status TELEBOT aktif, jadi tetap eksklusif.</p>
              </div>
              <div className="mt-6 rounded-2xl bg-[var(--bg-primary)]/70 border border-[var(--border-light)] p-4 text-sm text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--text-primary)] mb-2">Status Membership</p>
                <p>Plan: {membership?.planCode || 'TELEBOT'}</p>
                <p>Status: {membership?.status || 'inactive'}</p>
                <p>Masa aktif: {membership?.expiresAt ? new Date(membership.expiresAt).toLocaleDateString('id-ID') : '-'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
