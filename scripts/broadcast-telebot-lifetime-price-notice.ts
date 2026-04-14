import { config } from 'dotenv';

config({ path: '.env.local' });

import { ensureTelegramContactCampaignSchema } from '../src/lib/turso';
import { broadcastTelebotLifetimePriceNotice } from '../src/lib/telebot-price-notice';

async function main() {
  await ensureTelegramContactCampaignSchema();

  const result = await broadcastTelebotLifetimePriceNotice();

  console.log(JSON.stringify({
    campaignKey: result.campaignKey,
    active: result.active,
    totalEligible: result.totalEligible,
    sent: result.sent,
    failed: result.failed,
    failures: result.failures,
  }, null, 2));
}

main().catch((error) => {
  console.error('[TELEBOT_NOTICE_BROADCAST] Fatal error:', error);
  process.exit(1);
});
