import { NextResponse } from 'next/server';
import { answerTelegramCallbackQuery, sendTelegramMessage } from '@/lib/telegram';
import {
  attachPrivateBotTelegramIdentity,
  ensureTelegramContactCampaignSchema,
  getPrivateBotMembershipByUserId,
  getPrivateBotMembershipByTelegramUsername,
  getTelebotUserProfile,
  getTelegramUser,
  getUserMembership,
  linkTelegramUser,
  resetTelebotUserBalance,
  setUserTelegramChatId,
  upsertTelegramContact,
  upsertTelebotUserProfile,
  upsertPrivateBotMembership,
} from '@/lib/turso';
import {
  buildActiveWelcomeMessage,
  buildBalanceKeyboard,
  buildBalanceMessage,
  buildFiboKanjiSignalKeyboard,
  buildFiboKanjiSignalMessage,
  buildApprovedWelcomeMessage,
  buildGuestIntroKeyboard,
  buildHelpMessage,
  buildIntroMessage,
  buildLiveStatusKeyboard,
  buildLiveStatusMessage,
  buildLockedAccessMessage,
  buildMainMenuKeyboard,
  buildPairKeyboard,
  buildRiskSetupKeyboard,
  buildRiskSetupMessage,
  buildSignalCategoryKeyboard,
  buildStatusMessage,
  buildTelegramResultsSummary,
  buildTimeframeKeyboard,
  findSignalPairCategory,
  generateTelegramSignal,
  isSupportedSignalPair,
  parseSignalCallback,
} from '@/lib/telegram-signal-menu';
import { formatTelebotSetupStyle } from '@/lib/telebot-trade-plan';
import { setLatestTelebotActualEntry } from '@/lib/signal-tracker';
import {
  buildTelebotLifetimePriceNoticeKeyboard,
  buildTelebotLifetimePriceNoticeMessage,
  isTelebotLifetimePriceNoticeActive,
} from '@/lib/telebot-price-notice';

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

async function maybeSendTelebotPriceNotice(chatId: string): Promise<void> {
  if (!isTelebotLifetimePriceNoticeActive()) return;

  await reply(chatId, buildTelebotLifetimePriceNoticeMessage(), {
    allowHtml: true,
    replyMarkup: buildTelebotLifetimePriceNoticeKeyboard(),
  });
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

function parseNumericArg(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '').trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

async function consumeQuotaForAccess() {
  return getUnlimitedQuota();
}

async function getQuotaStatusForAccess() {
  return getUnlimitedQuota();
}

async function autoLinkTelebotByUsername(chatId: string, username?: string, firstName?: string) {
  if (!username) return null;

  const membershipByUsername = await getPrivateBotMembershipByTelegramUsername(username);
  if (!membershipByUsername) return null;

  const effectiveMembership = await getEffectivePrivateBotMembership(membershipByUsername.userId);
  if (!effectiveMembership || effectiveMembership.status !== 'active') return null;

  const linkedOk = await linkTelegramUser(effectiveMembership.userId, {
    chatId,
    username,
    firstName: firstName || 'Trader',
  });
  if (!linkedOk) return null;

  await setUserTelegramChatId(effectiveMembership.userId, chatId);
  await attachPrivateBotTelegramIdentity(effectiveMembership.userId, chatId, username);
  return getTelegramUser(chatId);
}

export async function POST(request: Request) {
  try {
    await ensureTelegramContactCampaignSchema();

    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      console.warn('[TELEGRAM_WEBHOOK] TELEGRAM_WEBHOOK_SECRET is not configured');
    } else if (request.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret) {
      return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
    }

    const update = (await request.json()) as TelegramUpdate;
    const callback = update.callback_query;
    if (callback?.id) {
      await answerTelegramCallbackQuery(callback.id);
    }

    if (callback?.message?.chat?.id && typeof callback.data === 'string') {
      const chatId = String(callback.message.chat.id);
      await upsertTelegramContact({
        chatId,
        username: callback.from?.username || '',
        firstName: callback.from?.first_name || 'Trader',
        lastCommand: callback.data,
        lastMessageText: callback.data,
      });

      const linkedUser =
        (await getTelegramUser(chatId)) ||
        (await autoLinkTelebotByUsername(chatId, callback.from?.username || '', callback.from?.first_name || 'Trader'));
      if (!linkedUser) {
        await reply(chatId, 'Username Telegram Anda belum terdaftar sebagai member TELEBOT aktif. Silakan pastikan username Anda sudah di-approve admin.');
        return NextResponse.json({ ok: true });
      }

      const access = await getBotAccess(linkedUser.userId);
      if (!access) {
        await reply(chatId, 'Akses bot Anda tidak aktif.');
        return NextResponse.json({ ok: true });
      }

      if (callback.data === 'tele:live') {
        await reply(chatId, await buildLiveStatusMessage(linkedUser.userId), {
          replyMarkup: buildLiveStatusKeyboard(),
          allowHtml: true,
        });
        return NextResponse.json({ ok: true });
      }

      if (callback.data === 'tele:useentry') {
        const ok = await setLatestTelebotActualEntry(linkedUser.userId, null, true);
        await reply(
          chatId,
          await buildLiveStatusMessage(
            linkedUser.userId,
            ok ? 'Actual entry disamakan dengan recommended entry.' : 'Belum ada setup untuk disamakan actual entry-nya.'
          ),
          {
            replyMarkup: buildLiveStatusKeyboard(),
            allowHtml: true,
          }
        );
        return NextResponse.json({ ok: true });
      }

      const balanceMatch = callback.data.match(/^tele:balance:(\d+(?:\.\d+)?)$/i);
      if (balanceMatch) {
        const amount = Number(balanceMatch[1]);
        await upsertTelebotUserProfile({ userId: linkedUser.userId, balanceAmount: amount });
        await reply(chatId, await buildBalanceMessage(linkedUser.userId, `Balance berhasil diatur ke USD ${amount.toLocaleString('en-US')}.`), {
          replyMarkup: buildBalanceKeyboard(),
          allowHtml: true,
        });
        return NextResponse.json({ ok: true });
      }

      const riskMatch = callback.data.match(/^tele:risk:(\d+(?:\.\d+)?)$/i);
      if (riskMatch) {
        const riskPercent = Number(riskMatch[1]);
        await upsertTelebotUserProfile({ userId: linkedUser.userId, riskPercent });
        await reply(chatId, await buildRiskSetupMessage(linkedUser.userId, `Risk per trade diatur ke ${riskPercent}%.`), {
          replyMarkup: buildRiskSetupKeyboard(),
          allowHtml: true,
        });
        return NextResponse.json({ ok: true });
      }

      const setupMatch = callback.data.match(/^tele:setup:(conservative|standard|aggressive)$/i);
      if (setupMatch) {
        await upsertTelebotUserProfile({ userId: linkedUser.userId, setupStyle: setupMatch[1].toLowerCase() });
        await reply(chatId, await buildRiskSetupMessage(linkedUser.userId, `Setup mode diatur ke ${setupMatch[1].toLowerCase()}.`), {
          replyMarkup: buildRiskSetupKeyboard(),
          allowHtml: true,
        });
        return NextResponse.json({ ok: true });
      }

      if (callback.data === 'tele:resetbalance') {
        const ok = await resetTelebotUserBalance(linkedUser.userId);
        await reply(chatId, await buildBalanceMessage(linkedUser.userId, ok ? 'Balance berhasil di-reset. Anda bisa mulai dari modal baru.' : 'Reset balance gagal dijalankan.'), {
          replyMarkup: buildBalanceKeyboard(),
          allowHtml: true,
        });
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
        const quota = await consumeQuotaForAccess();
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
          signal.ok
            ? `${signal.text}${Number.isFinite(quota.limit) ? `\n\nSisa kuota hari ini: ${quota.remaining}/${quota.limit}` : ''}`
            : signal.message,
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

    await upsertTelegramContact({
      chatId,
      username,
      firstName,
      lastCommand: cmd || null,
      lastMessageText: text,
    });

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

        await maybeSendTelebotPriceNotice(chatId);
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
        await maybeSendTelebotPriceNotice(chatId);
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
      await reply(
        chatId,
        '<b>ARRA7 TELEBOT</b>\n\nTELEBOT tidak lagi memakai kode link. Akses bot sekarang otomatis mengikuti username Telegram yang sudah di-approve admin.',
        { allowHtml: true }
      );
      return NextResponse.json({ ok: true });
    }

    const linkedUser =
      (await getTelegramUser(chatId)) ||
      (await autoLinkTelebotByUsername(chatId, username, firstName));
    if (!linkedUser) {
      await reply(chatId, 'Username Telegram Anda belum terdaftar sebagai member TELEBOT aktif. Silakan pastikan username yang Anda kirim saat pembayaran sudah di-approve admin.');
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

    if (cmd === '/balance' || text.toLowerCase() === 'balance') {
      if (arg) {
        const balanceAmount = parseNumericArg(arg);
        if (!balanceAmount) {
          await reply(chatId, 'Format salah. Gunakan contoh: /balance 1000');
          return NextResponse.json({ ok: true });
        }

        const ok = await upsertTelebotUserProfile({ userId: linkedUser.userId, balanceAmount });
        await reply(chatId, await buildBalanceMessage(linkedUser.userId, ok ? `Balance berhasil diatur ke USD ${balanceAmount.toLocaleString('en-US')}.` : 'Gagal menyimpan balance.'), {
          replyMarkup: buildBalanceKeyboard(),
          allowHtml: true,
        });
        return NextResponse.json({ ok: true });
      }

      await reply(chatId, await buildBalanceMessage(linkedUser.userId), {
        replyMarkup: buildBalanceKeyboard(),
        allowHtml: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/resetbalance' || text.toLowerCase() === 'reset balance') {
      const ok = await resetTelebotUserBalance(linkedUser.userId);
      await reply(chatId, await buildBalanceMessage(linkedUser.userId, ok ? 'Balance berhasil di-reset. Anda bisa mulai dari modal baru.' : 'Reset balance gagal dijalankan.'), {
        replyMarkup: buildBalanceKeyboard(),
        allowHtml: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/risk' || text.toLowerCase() === 'risk setup') {
      if (arg) {
        const riskPercent = parseNumericArg(arg);
        if (!riskPercent) {
          await reply(chatId, 'Format salah. Gunakan contoh: /risk 1');
          return NextResponse.json({ ok: true });
        }

        const ok = await upsertTelebotUserProfile({ userId: linkedUser.userId, riskPercent });
        await reply(chatId, await buildRiskSetupMessage(linkedUser.userId, ok ? `Risk per trade diatur ke ${riskPercent}%.` : 'Gagal menyimpan risk profile.'), {
          replyMarkup: buildRiskSetupKeyboard(),
          allowHtml: true,
        });
        return NextResponse.json({ ok: true });
      }

      await reply(chatId, await buildRiskSetupMessage(linkedUser.userId), {
        replyMarkup: buildRiskSetupKeyboard(),
        allowHtml: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/setup') {
      const value = arg.trim().toLowerCase();
      if (!['conservative', 'standard', 'aggressive'].includes(value)) {
        await reply(chatId, 'Gunakan: /setup conservative, /setup standard, atau /setup aggressive');
        return NextResponse.json({ ok: true });
      }

      const ok = await upsertTelebotUserProfile({ userId: linkedUser.userId, setupStyle: value });
      await reply(chatId, await buildRiskSetupMessage(linkedUser.userId, ok ? `Setup mode diatur ke ${value}.` : 'Gagal menyimpan setup mode.'), {
        replyMarkup: buildRiskSetupKeyboard(),
        allowHtml: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/entry') {
      const actualEntry = parseNumericArg(arg);
      if (!actualEntry) {
        await reply(chatId, 'Format salah. Gunakan contoh: /entry 1932.50');
        return NextResponse.json({ ok: true });
      }

      const ok = await setLatestTelebotActualEntry(linkedUser.userId, actualEntry);
      await reply(chatId, await buildLiveStatusMessage(linkedUser.userId, ok ? `Actual entry disimpan di ${actualEntry}.` : 'Belum ada setup untuk diberi actual entry.'), {
        replyMarkup: buildLiveStatusKeyboard(),
        allowHtml: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/live' || cmd === '/livestatus' || text.toLowerCase() === 'live status') {
      await reply(chatId, await buildLiveStatusMessage(linkedUser.userId), {
        replyMarkup: buildLiveStatusKeyboard(),
        allowHtml: true,
      });
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/status') {
      const profile = await getTelebotUserProfile(linkedUser.userId);
      const usage = await getQuotaStatusForAccess();
      await reply(
        chatId,
        buildStatusMessage({
          accessLabel: access.label,
          chatId,
          balanceText: profile ? `${profile.balanceCurrency} ${Number(profile.balanceAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : undefined,
          riskText: profile ? `${profile.riskPercent}%` : undefined,
          setupText: profile ? formatTelebotSetupStyle(profile.setupStyle) : undefined,
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

    if (text.toLowerCase() === 'signal fibo kanji' || cmd === '/fibokanji') {
      await reply(chatId, buildFiboKanjiSignalMessage(), {
        replyMarkup: buildFiboKanjiSignalKeyboard(),
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
      const profile = await getTelebotUserProfile(linkedUser.userId);
      const usage = await getQuotaStatusForAccess();
      await reply(
        chatId,
        buildStatusMessage({
          accessLabel: access.label,
          chatId,
          balanceText: profile ? `${profile.balanceCurrency} ${Number(profile.balanceAmount || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : undefined,
          riskText: profile ? `${profile.riskPercent}%` : undefined,
          setupText: profile ? formatTelebotSetupStyle(profile.setupStyle) : undefined,
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
