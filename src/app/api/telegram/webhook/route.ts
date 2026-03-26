import { NextResponse } from 'next/server';
import { answerTelegramCallbackQuery, sendTelegramMessage } from '@/lib/telegram';
import {
  attachPrivateBotTelegramIdentity,
  findValidPrivateBotLinkCode,
  getPrivateBotMembershipByUserId,
  getPrivateBotMembershipByTelegramUsername,
  findValidTelegramLinkCode,
  getTelegramUser,
  getUserMembership,
  isVvipActive,
  linkTelegramUser,
  markPrivateBotLinkCodeUsed,
  markTelegramLinkCodeUsed,
  setUserTelegramChatId,
} from '@/lib/turso';
import { consumeTelegramVvipQuota, getTelegramVvipQuotaStatus } from '@/lib/telegram-vvip-quota';
import {
  buildMainMenuKeyboard,
  buildPairKeyboard,
  buildSignalCategoryKeyboard,
  buildTelegramResultsSummary,
  buildTimeframeKeyboard,
  findSignalPairCategory,
  generateTelegramSignal,
  isSupportedSignalPair,
  parseSignalCallback,
} from '@/lib/telegram-signal-menu';

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
  callback_query?: {
    id?: string;
    data?: string;
    from?: {
      username?: string;
      first_name?: string;
    };
    message?: {
      chat?: {
        id?: number;
      };
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

async function reply(
  chatId: string,
  text: string,
  options?: { replyMarkup?: Record<string, unknown>; allowHtml?: boolean }
): Promise<void> {
  await sendTelegramMessage(options?.allowHtml ? text : escapeHtml(text), 'HTML', chatId, options);
}

function extractCommand(text: string): { cmd: string; arg: string } {
  const trimmed = text.trim();
  const parts = trimmed.split(/\s+/);
  const cmd = (parts[0] || '').toLowerCase();
  const arg = parts.slice(1).join(' ').trim();
  return { cmd, arg };
}

async function getBotAccess(userId: string): Promise<{ kind: 'vvip' | 'private_bot'; label: string } | null> {
  const { membership } = await getUserMembership(userId);
  if (membership === 'VVIP') {
    return { kind: 'vvip', label: 'VVIP aktif' };
  }

  const privateBot = await getPrivateBotMembershipByUserId(userId);
  if (!privateBot) return null;
  if (privateBot.status !== 'active') return null;
  if (privateBot.expiresAt && new Date(privateBot.expiresAt).getTime() <= Date.now()) return null;

  return { kind: 'private_bot', label: 'TELEBOT aktif' };
}

export async function POST(request: Request) {
  try {
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incoming = request.headers.get('x-telegram-bot-api-secret-token');
      if (incoming && incoming !== webhookSecret) {
        return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
      }
    }

    const update = (await request.json()) as TelegramUpdate;
    const callback = update.callback_query;
    if (callback?.id) {
      await answerTelegramCallbackQuery(callback.id);
    }

    if (callback?.message?.chat?.id && typeof callback.data === 'string') {
      const chatId = String(callback.message.chat.id);
      const linkedUser = await getTelegramUser(chatId);
      if (!linkedUser) {
        await reply(chatId, 'Akun belum terhubung. Silakan kirim /link KODE_OTP dari web ARRA7.');
        return NextResponse.json({ ok: true });
      }

      const access = await getBotAccess(linkedUser.userId);
      if (!access) {
        await reply(chatId, 'Akses bot Anda tidak aktif.');
        return NextResponse.json({ ok: true });
      }

      const parsed = parseSignalCallback(callback.data);
      if (!parsed) return NextResponse.json({ ok: true });

      if (parsed.type === 'categories') {
        await reply(chatId, 'Pilih kategori pair:', {
          replyMarkup: buildSignalCategoryKeyboard(),
        });
        return NextResponse.json({ ok: true });
      }

      if (parsed.type === 'category') {
        await reply(chatId, `Pilih pair dari kategori ${parsed.categoryId.toUpperCase()}:`, {
          replyMarkup: buildPairKeyboard(parsed.categoryId),
        });
        return NextResponse.json({ ok: true });
      }

      if (parsed.type === 'pair') {
        await reply(chatId, `Pilih timeframe untuk ${parsed.symbol}:`, {
          replyMarkup: buildTimeframeKeyboard(parsed.categoryId, parsed.symbol),
        });
        return NextResponse.json({ ok: true });
      }

      if (parsed.type === 'results') {
        const resultsText = await buildTelegramResultsSummary(linkedUser.userId);
        await reply(chatId, resultsText, {
          replyMarkup: buildMainMenuKeyboard(),
          allowHtml: true,
        });
        return NextResponse.json({ ok: true });
      }

      if (parsed.type === 'timeframe') {
        const quota = await consumeTelegramVvipQuota(linkedUser.userId);
        if (!quota.allowed) {
          await reply(
            chatId,
            [
              'Kuota signal bot hari ini sudah habis.',
              `Limit: ${quota.limit}/hari`,
              `Reset: ${quota.resetText}`,
            ].join('\n'),
            { replyMarkup: buildMainMenuKeyboard() }
          );
          return NextResponse.json({ ok: true });
        }

        const signal = await generateTelegramSignal({
          userId: linkedUser.userId,
          chatId,
          symbol: parsed.symbol,
          timeframe: parsed.timeframe,
        });

        await reply(
          chatId,
          signal.ok ? `${signal.text}\n\nSisa kuota hari ini: ${quota.remaining}/${quota.limit}` : signal.message,
          { replyMarkup: buildMainMenuKeyboard(), allowHtml: signal.ok }
        );
        return NextResponse.json({ ok: true });
      }
    }

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
        const preapprovedPrivateBot = username
          ? await getPrivateBotMembershipByTelegramUsername(username)
          : null;

        if (
          preapprovedPrivateBot &&
          preapprovedPrivateBot.status === 'active' &&
          (!preapprovedPrivateBot.expiresAt || new Date(preapprovedPrivateBot.expiresAt).getTime() > Date.now())
        ) {
          const linkedOk = await linkTelegramUser(preapprovedPrivateBot.userId, {
            chatId,
            username,
            firstName,
          });

          if (linkedOk) {
            await setUserTelegramChatId(preapprovedPrivateBot.userId, chatId);
            await attachPrivateBotTelegramIdentity(preapprovedPrivateBot.userId, chatId, username);

            await reply(
              chatId,
              [
                `Halo ${firstName}, username Telegram Anda sudah di-approve.`,
                'Akses TELEBOT aktif dan akun berhasil terhubung otomatis.',
                'Gunakan menu di bawah untuk memilih Signal atau Hasil.',
              ].join('\n'),
              { replyMarkup: buildMainMenuKeyboard() }
            );
            return NextResponse.json({ ok: true });
          }
        }

        await reply(
          chatId,
          [
            `Halo ${firstName}, selamat datang di ARRA7 Telegram Bot.`,
            '',
            'Akses bot ini untuk member yang sudah aktif.',
            'Hubungkan akun Anda dari web ARRA7 lalu kirim:',
            '/link KODE_OTP',
          ].join('\n')
        );
        return NextResponse.json({ ok: true });
      }

      const access = await getBotAccess(linked.userId);
      if (!access) {
        const { membership } = await getUserMembership(linked.userId);
        await reply(
          chatId,
          [
            'Akun Anda terhubung, tetapi akses bot terkunci.',
            `Status membership saat ini: ${membership}.`,
            'Bot hanya untuk akses aktif yang valid.',
          ].join('\n')
        );
        return NextResponse.json({ ok: true });
      }

      await reply(
        chatId,
        [
          `Halo ${firstName}, akses ${access.label} Anda aktif.`,
          'Gunakan menu di bawah untuk memilih Signal atau Hasil.',
        ].join('\n')
        , { replyMarkup: buildMainMenuKeyboard() }
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/help') {
      await reply(
        chatId,
        [
          'Menu bot:',
          'Signal - pilih pair dan timeframe',
          'Hasil - lihat progress TP/SL signal terakhir',
          '',
          'Perintah:',
          '/start - tampilkan menu',
          '/link KODE - hubungkan akun',
          '/status - cek status akses',
        ].join('\n'),
        { replyMarkup: buildMainMenuKeyboard() }
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/link') {
      const code = arg.replace(/\s+/g, '').toUpperCase();
      if (!code) {
        await reply(chatId, 'Format salah. Gunakan: /link KODE_OTP');
        return NextResponse.json({ ok: true });
      }

      const privateBotLinkCode = await findValidPrivateBotLinkCode(code);
      if (privateBotLinkCode) {
        const privateBotMembership = await getPrivateBotMembershipByUserId(privateBotLinkCode.userId);
        if (!privateBotMembership || privateBotMembership.status !== 'active') {
          await reply(chatId, 'Kode valid, tetapi akses TELEBOT belum aktif.');
          return NextResponse.json({ ok: true });
        }

        const linked = await linkTelegramUser(privateBotLinkCode.userId, {
          chatId,
          username,
          firstName,
        });
        if (!linked) {
          await reply(chatId, 'Gagal menghubungkan akun TELEBOT. Silakan coba lagi.');
          return NextResponse.json({ ok: true });
        }

        await setUserTelegramChatId(privateBotLinkCode.userId, chatId);
        await attachPrivateBotTelegramIdentity(privateBotLinkCode.userId, chatId, username);
        await markPrivateBotLinkCodeUsed(privateBotLinkCode.id);

        await reply(
          chatId,
          [
            'Akun berhasil terhubung.',
            'Akses TELEBOT aktif.',
            'Gunakan menu Signal atau Hasil untuk mulai.',
          ].join('\n'),
          { replyMarkup: buildMainMenuKeyboard() }
        );
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
          'Gunakan menu Signal atau Hasil untuk mulai.',
        ].join('\n'),
        { replyMarkup: buildMainMenuKeyboard() }
      );
      return NextResponse.json({ ok: true });
    }

    const linkedUser = await getTelegramUser(chatId);
    if (!linkedUser) {
      await reply(chatId, 'Akun belum terhubung. Silakan kirim /link KODE_OTP dari web ARRA7.');
      return NextResponse.json({ ok: true });
    }

    const access = await getBotAccess(linkedUser.userId);
    if (!access) {
      const { membership } = await getUserMembership(linkedUser.userId);
      await reply(
        chatId,
        `Akses bot ditolak. Status membership Anda saat ini: ${membership}. Bot hanya untuk akses aktif yang valid.`
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/status') {
      const usage = await getTelegramVvipQuotaStatus(linkedUser.userId);
      await reply(
        chatId,
        [
          'Status bot:',
          `Membership: ${access.label}`,
          `Linked chat: ${chatId}`,
          `Sisa kuota chat hari ini: ${usage.remaining}/${usage.limit}`,
          `Reset kuota: ${usage.resetText}`,
        ].join('\n'),
        { replyMarkup: buildMainMenuKeyboard() }
      );
      return NextResponse.json({ ok: true });
    }

    if (text.toLowerCase() === 'signal' || cmd === '/signal') {
      await reply(chatId, 'Pilih kategori pair:', {
        replyMarkup: buildSignalCategoryKeyboard(),
      });
      return NextResponse.json({ ok: true });
    }

    if (text.toLowerCase() === 'hasil' || cmd === '/hasil' || cmd === '/results') {
      const resultsText = await buildTelegramResultsSummary(linkedUser.userId);
      await reply(chatId, resultsText, {
        replyMarkup: buildMainMenuKeyboard(),
        allowHtml: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (isSupportedSignalPair(text.toUpperCase())) {
      const symbol = text.toUpperCase();
      const categoryId = findSignalPairCategory(symbol) || 'major';
      await reply(chatId, `Pilih timeframe untuk ${symbol}:`, {
        replyMarkup: buildTimeframeKeyboard(categoryId, symbol),
      });
      return NextResponse.json({ ok: true });
    }

    await reply(
      chatId,
      [
        'Chat bebas sudah dinonaktifkan.',
        'Gunakan menu Signal untuk pilih pair dan timeframe, atau menu Hasil untuk melihat progres TP/SL.',
      ].join('\n'),
      { replyMarkup: buildMainMenuKeyboard() }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[TELEGRAM_WEBHOOK] Error:', error);
    return NextResponse.json({ ok: false, message: 'Internal server error' }, { status: 500 });
  }
}
