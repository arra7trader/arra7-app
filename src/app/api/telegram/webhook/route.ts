import { NextResponse } from 'next/server';
import { answerTelegramCallbackQuery, sendTelegramMessage } from '@/lib/telegram';
import {
  attachPrivateBotTelegramIdentity,
  findValidPrivateBotLinkCode,
  getPrivateBotMembershipByUserId,
  getPrivateBotMembershipByTelegramUsername,
  getTelegramUser,
  getUserMembership,
  linkTelegramUser,
  markPrivateBotLinkCodeUsed,
  setUserTelegramChatId,
  upsertPrivateBotMembership,
} from '@/lib/turso';
import {
  buildActiveWelcomeMessage,
  buildApprovedWelcomeMessage,
  buildGuestIntroKeyboard,
  buildHelpMessage,
  buildIntroMessage,
  buildLockedAccessMessage,
  buildMainMenuKeyboard,
  buildPairKeyboard,
  buildSignalCategoryKeyboard,
  buildStatusMessage,
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

function getUnlimitedQuota() {
  return {
    allowed: true,
    limit: Number.POSITIVE_INFINITY,
    used: 0,
    remaining: Number.POSITIVE_INFINITY,
    usageDate: '',
    resetText: 'Tidak ada batas harian',
  };
}

function isExpiredAt(expiresAt?: string | null): boolean {
  return !!expiresAt && new Date(expiresAt).getTime() <= Date.now();
}

async function getEffectivePrivateBotMembership(userId: string) {
  const privateBot = await getPrivateBotMembershipByUserId(userId);
  if (!privateBot) return null;

  if (privateBot.status === 'active' && isExpiredAt(privateBot.expiresAt)) {
    await upsertPrivateBotMembership({
      userId: privateBot.userId,
      planCode: privateBot.planCode,
      status: 'expired',
      expiresAt: privateBot.expiresAt,
      telegramUsername: privateBot.telegramUsername,
      telegramChatId: privateBot.telegramChatId
    });
    return { ...privateBot, status: 'expired' as const };
  }

  return privateBot;
}

async function getBotAccess(userId: string): Promise<{ kind: 'private_bot'; label: string } | null> {
  const privateBot = await getEffectivePrivateBotMembership(userId);
  if (!privateBot) return null;
  if (privateBot.status !== 'active') return null;

  return { kind: 'private_bot', label: 'TELEBOT aktif' };
}

async function consumeQuotaForAccess(_userId: string, _kind: 'private_bot') {
  return getUnlimitedQuota();
}

async function getQuotaStatusForAccess(_userId: string, _kind: 'private_bot') {
  return getUnlimitedQuota();
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
        await reply(chatId, '<b>Signal Desk</b>\nPilih kategori market yang ingin Anda analisa.', {
          replyMarkup: buildSignalCategoryKeyboard(),
          allowHtml: true,
        });
        return NextResponse.json({ ok: true });
      }

      if (parsed.type === 'category') {
        await reply(chatId, `<b>Signal Desk</b>\nKategori <b>${escapeHtml(parsed.categoryId.toUpperCase())}</b> dipilih. Sekarang tentukan pair yang ingin dianalisa.`, {
          replyMarkup: buildPairKeyboard(parsed.categoryId),
          allowHtml: true,
        });
        return NextResponse.json({ ok: true });
      }

      if (parsed.type === 'pair') {
        await reply(chatId, `<b>Signal Desk</b>\nPair <b>${escapeHtml(parsed.symbol)}</b> dipilih. Silakan tentukan timeframe.`, {
          replyMarkup: buildTimeframeKeyboard(parsed.categoryId, parsed.symbol),
          allowHtml: true,
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
        const quota = await consumeQuotaForAccess(linkedUser.userId, access.kind);
        if (!quota.allowed) {
          await reply(
            chatId,
            [
              '<b>ARRA7 TELEBOT</b>',
              '',
              'Kuota signal harian Anda sudah habis.',
              `Limit: ${quota.limit}/hari`,
              `Reset: ${quota.resetText}`,
            ].join('\n'),
            { replyMarkup: buildMainMenuKeyboard(), allowHtml: true }
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
        const effectivePreapprovedPrivateBot =
          preapprovedPrivateBot ? await getEffectivePrivateBotMembership(preapprovedPrivateBot.userId) : null;

        if (
          effectivePreapprovedPrivateBot &&
          effectivePreapprovedPrivateBot.status === 'active'
        ) {
          const linkedOk = await linkTelegramUser(effectivePreapprovedPrivateBot.userId, {
            chatId,
            username,
            firstName,
          });

          if (linkedOk) {
            await setUserTelegramChatId(effectivePreapprovedPrivateBot.userId, chatId);
            await attachPrivateBotTelegramIdentity(effectivePreapprovedPrivateBot.userId, chatId, username);

            await reply(
              chatId,
              buildApprovedWelcomeMessage(firstName),
              { replyMarkup: buildMainMenuKeyboard(), allowHtml: true }
            );
            return NextResponse.json({ ok: true });
          }
        }

        await reply(
          chatId,
          buildIntroMessage(firstName),
          { allowHtml: true, replyMarkup: buildGuestIntroKeyboard() }
        );
        return NextResponse.json({ ok: true });
      }

      const access = await getBotAccess(linked.userId);
      if (!access) {
        const { membership } = await getUserMembership(linked.userId);
        const privateBot = await getEffectivePrivateBotMembership(linked.userId);
        await reply(
          chatId,
          buildLockedAccessMessage(
            membership,
            privateBot?.status === 'expired'
              ? 'Masa aktif TELEBOT Anda sudah berakhir. Silakan perpanjang paket untuk menggunakan bot kembali.'
              : privateBot?.status === 'revoked'
                ? 'Akses TELEBOT Anda sedang dinonaktifkan admin.'
                : undefined
          ),
          { allowHtml: true }
        );
        return NextResponse.json({ ok: true });
      }

      await reply(
        chatId,
        buildActiveWelcomeMessage(firstName, access.label),
        { replyMarkup: buildMainMenuKeyboard(), allowHtml: true }
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/help') {
      await reply(
        chatId,
        buildHelpMessage(),
        { replyMarkup: buildMainMenuKeyboard(), allowHtml: true }
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
        const privateBotMembership = await getEffectivePrivateBotMembership(privateBotLinkCode.userId);
        if (!privateBotMembership || privateBotMembership.status !== 'active') {
          await reply(
            chatId,
            privateBotMembership?.status === 'expired'
              ? '<b>ARRA7 TELEBOT</b>\n\nKode link valid, namun masa aktif TELEBOT Anda sudah berakhir. Silakan perpanjang paket Anda.'
              : '<b>ARRA7 TELEBOT</b>\n\nKode link valid, namun akses TELEBOT Anda belum aktif. Silakan tunggu approval admin.',
            { allowHtml: true }
          );
          return NextResponse.json({ ok: true });
        }

        const linked = await linkTelegramUser(privateBotLinkCode.userId, {
          chatId,
          username,
          firstName,
        });
        if (!linked) {
          await reply(chatId, '<b>ARRA7 TELEBOT</b>\n\nAkun belum berhasil dihubungkan. Silakan coba lagi beberapa saat lagi.', {
            allowHtml: true,
          });
          return NextResponse.json({ ok: true });
        }

        await setUserTelegramChatId(privateBotLinkCode.userId, chatId);
        await attachPrivateBotTelegramIdentity(privateBotLinkCode.userId, chatId, username);
        await markPrivateBotLinkCodeUsed(privateBotLinkCode.id);

        await reply(
          chatId,
          [
            '<b>ARRA7 TELEBOT</b>',
            '',
            'Akun berhasil terhubung.',
            'Akses TELEBOT Anda sudah aktif.',
            'Silakan gunakan menu utama untuk membuka Signal atau Hasil.',
          ].join('\n'),
          { replyMarkup: buildMainMenuKeyboard(), allowHtml: true }
        );
        return NextResponse.json({ ok: true });
      }

      await reply(
        chatId,
        '<b>ARRA7 TELEBOT</b>\n\nKode tidak valid atau tidak berlaku untuk TELEBOT. Silakan gunakan akses TELEBOT yang aktif.',
        { allowHtml: true }
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
      const privateBot = await getEffectivePrivateBotMembership(linkedUser.userId);
      await reply(
        chatId,
        buildLockedAccessMessage(
          membership,
          privateBot?.status === 'expired'
            ? 'Masa aktif TELEBOT Anda sudah berakhir. Silakan perpanjang paket untuk membuka akses kembali.'
            : privateBot?.status === 'revoked'
              ? 'Akses TELEBOT Anda sedang dinonaktifkan admin.'
              : undefined
        ),
        { allowHtml: true }
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/status') {
      const usage = await getQuotaStatusForAccess(linkedUser.userId, access.kind);
      await reply(
        chatId,
        buildStatusMessage({
          accessLabel: access.label,
          chatId,
          remaining: usage.remaining,
          limit: usage.limit,
          resetText: usage.resetText,
        }),
        { replyMarkup: buildMainMenuKeyboard(), allowHtml: true }
      );
      return NextResponse.json({ ok: true });
    }

    if (text.toLowerCase() === 'signal' || cmd === '/signal') {
      await reply(chatId, '<b>Signal Desk</b>\nPilih kategori market yang ingin Anda analisa.', {
        replyMarkup: buildSignalCategoryKeyboard(),
        allowHtml: true,
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

    if (text.toLowerCase() === 'status') {
      const usage = await getQuotaStatusForAccess(linkedUser.userId, access.kind);
      await reply(
        chatId,
        buildStatusMessage({
          accessLabel: access.label,
          chatId,
          remaining: usage.remaining,
          limit: usage.limit,
          resetText: usage.resetText,
        }),
        { replyMarkup: buildMainMenuKeyboard(), allowHtml: true }
      );
      return NextResponse.json({ ok: true });
    }

    if (text.toLowerCase() === 'bantuan' || text.toLowerCase() === 'help') {
      await reply(chatId, buildHelpMessage(), {
        replyMarkup: buildMainMenuKeyboard(),
        allowHtml: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (isSupportedSignalPair(text.toUpperCase())) {
      const symbol = text.toUpperCase();
      const categoryId = findSignalPairCategory(symbol) || 'major';
      await reply(chatId, `<b>Signal Desk</b>\nPair <b>${escapeHtml(symbol)}</b> dipilih. Silakan tentukan timeframe.`, {
        replyMarkup: buildTimeframeKeyboard(categoryId, symbol),
        allowHtml: true,
      });
      return NextResponse.json({ ok: true });
    }

    await reply(
      chatId,
      [
        '<b>ARRA7 TELEBOT</b>',
        '',
        'Chat bebas saat ini dinonaktifkan agar alur tetap fokus dan profesional.',
        'Silakan gunakan menu Signal, Hasil, Status, atau Bantuan di bawah.',
      ].join('\n'),
      { replyMarkup: buildMainMenuKeyboard(), allowHtml: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[TELEGRAM_WEBHOOK] Error:', error);
    return NextResponse.json({ ok: false, message: 'Internal server error' }, { status: 500 });
  }
}
