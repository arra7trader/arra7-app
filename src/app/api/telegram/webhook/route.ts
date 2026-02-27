import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import {
  findValidTelegramLinkCode,
  getTelegramUser,
  getUserMembership,
  isVvipActive,
  linkTelegramUser,
  markTelegramLinkCodeUsed,
  setUserTelegramChatId,
} from '@/lib/turso';
import { consumeTelegramVvipQuota, getTelegramVvipQuotaStatus } from '@/lib/telegram-vvip-quota';
import { handleTelegramVvipMessage } from '@/lib/telegram-vvip-chat';

type TelegramUpdate = {
  message?: {
    chat?: {
      id?: number;
    };
    text?: string;
    from?: {
      username?: string;
      first_name?: string;
    };
  };
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function reply(chatId: string, text: string): Promise<void> {
  await sendTelegramMessage(escapeHtml(text), 'HTML', chatId);
}

function extractCommand(text: string): { cmd: string; arg: string } {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = (parts[0] || '').toLowerCase();
  const arg = parts.slice(1).join(' ').trim();
  return { cmd, arg };
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incoming = request.headers.get('x-telegram-bot-api-secret-token');
      if (incoming !== webhookSecret) {
        return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
      }
    }

    const update = (await request.json()) as TelegramUpdate;
    const msg = update.message;
    if (!msg?.chat?.id || typeof msg.text !== 'string') {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(msg.chat.id);
    const text = msg.text.trim();
    const firstName = msg.from?.first_name || 'Trader';
    const username = msg.from?.username || '';
    const { cmd, arg } = extractCommand(text);

    if (!text) return NextResponse.json({ ok: true });

    if (cmd === '/start') {
      const linked = await getTelegramUser(chatId);
      if (!linked) {
        await reply(
          chatId,
          [
            `Halo ${firstName}, selamat datang di ARRA7 VVIP Bot.`,
            '',
            'Akses bot ini khusus VVIP aktif.',
            'Hubungkan akun Anda dari web ARRA7 lalu kirim:',
            '/link KODE_OTP',
          ].join('\n')
        );
        return NextResponse.json({ ok: true });
      }

      const { membership } = await getUserMembership(linked.userId);
      if (membership !== 'VVIP') {
        await reply(
          chatId,
          [
            'Akun Anda terhubung, tetapi akses bot terkunci.',
            `Status membership saat ini: ${membership}.`,
            'Bot hanya untuk VVIP aktif.',
          ].join('\n')
        );
        return NextResponse.json({ ok: true });
      }

      await reply(
        chatId,
        [
          `Halo ${firstName}, akses VVIP Anda aktif.`,
          'Anda bisa chat natural, contoh:',
          'Aku minta signal XAUUSD di TF M5 dong',
          '',
          'Ketik /help untuk daftar perintah.',
        ].join('\n')
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/help') {
      await reply(
        chatId,
        [
          'Perintah bot:',
          '/start - Mulai bot',
          '/link KODE - Hubungkan akun web',
          '/status - Cek status akun',
          '/help - Bantuan',
          '',
          'Contoh chat:',
          'Aku minta signal xauusd tf m5 dong',
          'Analisa eurusd tf h1',
        ].join('\n')
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/link') {
      const code = arg.replace(/\s+/g, '').toUpperCase();
      if (!code) {
        await reply(chatId, 'Format salah. Gunakan: /link KODE_OTP');
        return NextResponse.json({ ok: true });
      }

      const linkCode = await findValidTelegramLinkCode(code);
      if (!linkCode) {
        await reply(chatId, 'Kode tidak valid atau sudah expired. Generate ulang dari web ARRA7.');
        return NextResponse.json({ ok: true });
      }

      const active = await isVvipActive(linkCode.userId);
      if (!active) {
        await reply(chatId, 'Kode valid, tetapi akun bukan VVIP aktif. Bot hanya untuk VVIP aktif.');
        return NextResponse.json({ ok: true });
      }

      const linked = await linkTelegramUser(linkCode.userId, {
        chatId,
        username,
        firstName,
      });
      if (!linked) {
        await reply(chatId, 'Gagal menghubungkan akun. Silakan coba lagi.');
        return NextResponse.json({ ok: true });
      }

      await setUserTelegramChatId(linkCode.userId, chatId);
      await markTelegramLinkCodeUsed(linkCode.id);

      await reply(
        chatId,
        [
          'Akun berhasil terhubung.',
          'Akses VVIP aktif.',
          'Sekarang Anda bisa minta signal atau analisa langsung lewat chat.',
        ].join('\n')
      );
      return NextResponse.json({ ok: true });
    }

    const linkedUser = await getTelegramUser(chatId);
    if (!linkedUser) {
      await reply(chatId, 'Akun belum terhubung. Silakan kirim /link KODE_OTP dari web ARRA7.');
      return NextResponse.json({ ok: true });
    }

    const { membership } = await getUserMembership(linkedUser.userId);
    if (membership !== 'VVIP') {
      await reply(
        chatId,
        `Akses bot ditolak. Status membership Anda saat ini: ${membership}. Bot hanya untuk VVIP aktif.`
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/status') {
      const usage = await getTelegramVvipQuotaStatus(linkedUser.userId);
      await reply(
        chatId,
        [
          'Status bot:',
          'Membership: VVIP aktif',
          `Linked chat: ${chatId}`,
          `Sisa kuota chat hari ini: ${usage.remaining}/${usage.limit}`,
          `Reset kuota: ${usage.resetText}`,
        ].join('\n')
      );
      return NextResponse.json({ ok: true });
    }

    const quota = await consumeTelegramVvipQuota(linkedUser.userId);
    if (!quota.allowed) {
      await reply(
        chatId,
        [
          'Kuota chat bot hari ini sudah habis.',
          `Limit: ${quota.limit}/hari`,
          `Reset: ${quota.resetText}`,
        ].join('\n')
      );
      return NextResponse.json({ ok: true });
    }

    const aiReply = await handleTelegramVvipMessage({
      userId: linkedUser.userId,
      chatId,
      text,
      firstName,
    });

    const quotaFooter = `\n\nSisa kuota hari ini: ${quota.remaining}/${quota.limit}`;
    await reply(chatId, `${aiReply}${quotaFooter}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[TELEGRAM_WEBHOOK] Error:', error);
    return NextResponse.json({ ok: false, message: 'Internal server error' }, { status: 500 });
  }
}
