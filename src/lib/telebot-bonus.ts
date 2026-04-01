import fs from 'fs';
import { getPrivateBotMembershipByUserId, upsertPrivateBotMembership } from './turso';

export const DEFAULT_TELEBOT_BONUS_VIDEO_PATH = 'D:\\LOCAL DOC\\ARRA 7 WEB\\EDUKASI SNIPER ENTRY.mp4';
export const TELEBOT_BONUS_VIDEO_TITLE = 'Edukasi Sniper Entry';

function isExpiredAt(expiresAt?: string | null): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() <= Date.now();
}

export async function getEffectiveTelebotMembership(userId: string) {
  const membership = await getPrivateBotMembershipByUserId(userId);
  if (!membership) return null;

  if (membership.status === 'active' && isExpiredAt(membership.expiresAt)) {
    await upsertPrivateBotMembership({
      userId: membership.userId,
      planCode: membership.planCode,
      status: 'expired',
      expiresAt: membership.expiresAt,
      telegramUsername: membership.telegramUsername,
      telegramChatId: membership.telegramChatId,
    });
    return { ...membership, status: 'expired' as const };
  }

  return membership;
}

export async function hasActiveTelebotAccess(userId: string) {
  const membership = await getEffectiveTelebotMembership(userId);
  return Boolean(membership && membership.status === 'active');
}

export function getTelebotBonusVideoConfig() {
  const externalUrl = String(process.env.TELEBOT_BONUS_VIDEO_URL || '').trim() || null;
  const filePath = String(process.env.TELEBOT_BONUS_VIDEO_PATH || DEFAULT_TELEBOT_BONUS_VIDEO_PATH).trim();
  const localFileExists = !externalUrl && fs.existsSync(filePath);
  const youtubeEmbedUrl = externalUrl ? toYoutubeEmbedUrl(externalUrl) : null;

  return {
    title: TELEBOT_BONUS_VIDEO_TITLE,
    externalUrl,
    youtubeEmbedUrl,
    filePath,
    localFileExists,
    isConfigured: Boolean(externalUrl || localFileExists),
  };
}

export function getTelebotBonusPageUrl() {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://arra7-app.vercel.app');
  return `${baseUrl.replace(/\/$/, '')}/telebot-bonus`;
}

function toYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }

    if (parsed.hostname === 'youtu.be') {
      const id = parsed.pathname.replace(/^\/+/, '').trim();
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }

    return null;
  } catch {
    return null;
  }
}
