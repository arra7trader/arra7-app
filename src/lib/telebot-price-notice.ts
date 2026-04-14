import {
  getTelebotPromoBroadcastRecipients,
  markTelegramCampaignDelivered,
  TelegramCampaignRecipient,
} from './turso';
import { sendTelegramMessage } from './telegram';

const TELEBOT_NOTICE_START_AT = '2026-04-15T00:00:00+07:00';
const TELEBOT_LIFETIME_PRICE_RISE_AT = '2026-04-19T00:00:00+07:00';
const TELEBOT_LIFETIME_LAST_OLD_PRICE_DAY = '18 April 2026';
const TELEBOT_LIFETIME_RISE_DATE_LABEL = '19 April 2026';
const TELEBOT_LIFETIME_NEW_PRICE_LABEL = 'Rp425.000';
const TELEBOT_LIFETIME_CURRENT_PRICE_LABEL = 'Rp375.000';
const TELEBOT_PAGE_URL = 'https://arra7-app.vercel.app/telebot';

export const TELEBOT_LIFETIME_PRICE_NOTICE_CAMPAIGN_KEY = 'telebot_lifetime_price_notice_2026_04_19';

export function isTelebotLifetimePriceNoticeActive(now = new Date()): boolean {
  const startAt = new Date(TELEBOT_NOTICE_START_AT).getTime();
  const riseAt = new Date(TELEBOT_LIFETIME_PRICE_RISE_AT).getTime();
  const nowTime = now.getTime();

  return Number.isFinite(nowTime) && nowTime >= startAt && nowTime < riseAt;
}

export function buildTelebotLifetimePriceNoticeMessage(): string {
  return [
    '<b>INFO PENTING TELEBOT</b>',
    '',
    `Harga <b>TELEBOT Lifetime</b> akan naik menjadi <b>${TELEBOT_LIFETIME_NEW_PRICE_LABEL}</b> pada <b>${TELEBOT_LIFETIME_RISE_DATE_LABEL}</b>.`,
    '',
    `Harga lama <b>${TELEBOT_LIFETIME_CURRENT_PRICE_LABEL}</b> masih berlaku sampai <b>${TELEBOT_LIFETIME_LAST_OLD_PRICE_DAY}</b>.`,
    'Jika ingin lock harga lama, silakan aktivasi sebelum tanggal tersebut.',
  ].join('\n');
}

export function buildTelebotLifetimePriceNoticeKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Aktivasi TELEBOT', url: TELEBOT_PAGE_URL },
      ],
    ],
  };
}

async function sendTelebotLifetimePriceNotice(chatId: string) {
  return sendTelegramMessage(
    buildTelebotLifetimePriceNoticeMessage(),
    'HTML',
    chatId,
    { replyMarkup: buildTelebotLifetimePriceNoticeKeyboard() }
  );
}

export async function broadcastTelebotLifetimePriceNotice(): Promise<{
  campaignKey: string;
  active: boolean;
  totalEligible: number;
  sent: number;
  failed: number;
  failures: Array<{ chatId: string; error: string }>;
  recipients: TelegramCampaignRecipient[];
}> {
  if (!isTelebotLifetimePriceNoticeActive()) {
    return {
      campaignKey: TELEBOT_LIFETIME_PRICE_NOTICE_CAMPAIGN_KEY,
      active: false,
      totalEligible: 0,
      sent: 0,
      failed: 0,
      failures: [],
      recipients: [],
    };
  }

  const recipients = await getTelebotPromoBroadcastRecipients(TELEBOT_LIFETIME_PRICE_NOTICE_CAMPAIGN_KEY);
  const failures: Array<{ chatId: string; error: string }> = [];
  let sent = 0;

  for (const recipient of recipients) {
    const result = await sendTelebotLifetimePriceNotice(recipient.chatId);
    if (result.success) {
      sent += 1;
      await markTelegramCampaignDelivered(
        TELEBOT_LIFETIME_PRICE_NOTICE_CAMPAIGN_KEY,
        recipient.chatId,
        result.messageId
      );
    } else {
      failures.push({
        chatId: recipient.chatId,
        error: result.error || 'Unknown Telegram error',
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return {
    campaignKey: TELEBOT_LIFETIME_PRICE_NOTICE_CAMPAIGN_KEY,
    active: true,
    totalEligible: recipients.length,
    sent,
    failed: failures.length,
    failures,
    recipients,
  };
}
