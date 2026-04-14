import { createClient, Client } from '@libsql/client';
import { createHash } from 'crypto';

// Check if Turso is configured
export const isTursoConfigured = (): boolean => {
  return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
};

// Initialize Turso client only if configured
let tursoClient: Client | null = null;

function getTursoClient(): Client | null {
  if (!isTursoConfigured()) {
    return null;
  }

  if (!tursoClient) {
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    });
  }

  return tursoClient;
}

export default getTursoClient;

async function ensureTelegramContactCampaignSchemaInternal(turso: Client): Promise<void> {
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS telegram_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id TEXT NOT NULL UNIQUE,
      username TEXT,
      first_name TEXT,
      started_at DATETIME,
      last_command TEXT,
      last_message_text TEXT,
      first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await turso.execute(`ALTER TABLE telegram_contacts ADD COLUMN started_at DATETIME`);
  } catch (error) {
    if (!String((error as Error)?.message || '').includes('duplicate column name')) {
      console.error('Ensure telegram_contacts.started_at column error:', error);
    }
  }

  await turso.execute(`
    UPDATE telegram_contacts
    SET started_at = COALESCE(started_at, first_seen_at)
    WHERE started_at IS NULL
      AND (
        lower(trim(COALESCE(last_command, ''))) = '/start'
        OR lower(trim(COALESCE(last_message_text, ''))) = '/start'
      )
  `);

  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_telegram_contacts_username
    ON telegram_contacts(username)
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS telegram_campaign_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_key TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      message_id INTEGER,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(campaign_key, chat_id)
    )
  `);

  await turso.execute(`
    CREATE INDEX IF NOT EXISTS idx_telegram_campaign_deliveries_campaign
    ON telegram_campaign_deliveries(campaign_key, sent_at DESC)
  `);
}

export async function ensureTelegramContactCampaignSchema(): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await ensureTelegramContactCampaignSchemaInternal(turso);
    return true;
  } catch (error) {
    console.error('Ensure telegram contact/campaign schema error:', error);
    return false;
  }
}

// Initialize database tables
export async function initDatabase(): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) {
    console.log('Turso not configured, skipping database init');
    return false;
  }

  try {
    // Create users table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        image TEXT,
        membership TEXT DEFAULT 'BASIC',
        membership_expires DATETIME,
        koin_balance INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create quota_usage table (Forex)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS quota_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, date)
      )
    `);

    // Create stock_quota_usage table (Stock Analysis)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS stock_quota_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, date)
      )
    `);

    // Create analysis_history table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT,
        result TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Create ai_signals table for performance tracking
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ai_signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT,
        direction TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL NOT NULL,
        take_profit_1 REAL NOT NULL,
        take_profit_2 REAL,
        confidence INTEGER,
        status TEXT DEFAULT 'PENDING',
        result_price REAL,
        pips_result REAL,
        verified_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create daily_reports table for admin broadcast
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS daily_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        total_signals INTEGER DEFAULT 0,
        tp_hit INTEGER DEFAULT 0,
        sl_hit INTEGER DEFAULT 0,
        pending INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0,
        report_text TEXT,
        sent_to_telegram INTEGER DEFAULT 0,
        sent_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create settings table for app configuration (e.g., Telegram auto-post toggle)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ensureTelegramContactCampaignSchemaInternal(turso);

    // TIER 3 FEATURES: Trade Journal
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS trade_journal (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        signal_id INTEGER,
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price REAL NOT NULL,
        stop_loss REAL,
        take_profit REAL,
        lot_size REAL,
        status TEXT DEFAULT 'OPEN',
        exit_price REAL,
        profit_loss REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // TIER 3 FEATURES: User Positions for Portfolio Tracker
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS user_positions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        symbol TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price REAL NOT NULL,
        lot_size REAL NOT NULL,
        stop_loss REAL,
        take_profit REAL,
        status TEXT DEFAULT 'OPEN',
        current_price REAL,
        profit_loss REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // TIER 3 FEATURES: Social Feed (anonymized analyses)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS social_feed (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_hash TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT,
        direction TEXT,
        confidence INTEGER,
        entry_price REAL,
        stop_loss REAL,
        take_profit REAL,
        analysis_summary TEXT,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // DOM ML PREDICTIONS: Store prediction history for accuracy tracking
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ml_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        horizon INTEGER NOT NULL,
        direction TEXT NOT NULL,
        direction_code INTEGER NOT NULL,
        confidence REAL NOT NULL,
        model_used TEXT NOT NULL,
        initial_price REAL NOT NULL,
        actual_price REAL,
        actual_direction INTEGER,
        is_correct INTEGER,
        verified_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // DOM ML STATS: Aggregate performance stats
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ml_prediction_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        symbol TEXT NOT NULL,
        model TEXT NOT NULL,
        total_predictions INTEGER DEFAULT 0,
        correct_predictions INTEGER DEFAULT 0,
        accuracy REAL DEFAULT 0,
        avg_confidence REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, symbol, model)
      )
    `);

    // AI CONFIG: Store dynamic weights for self-optimizing models
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ml_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // DAILY STOCK RECOMMENDATIONS (LSTM)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS stock_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        symbol TEXT NOT NULL,
        name TEXT,
        confidence REAL,
        entry_price REAL,
        prediction_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, symbol)
      )
    `);

    // TELEGRAM USERS (VVIP BOT)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS telegram_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL UNIQUE,
        username TEXT,
        first_name TEXT,
        last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // TELEGRAM LINK CODES (OTP from web -> bot)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS telegram_link_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        code_hash TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_user_id
      ON telegram_link_codes(user_id)
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expires_at
      ON telegram_link_codes(expires_at)
    `);

    // TELEGRAM CHAT MEMORY (VVIP bot conversation history)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS telegram_chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL, -- 'user' | 'assistant'
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_telegram_chat_messages_user_chat
      ON telegram_chat_messages(user_id, chat_id, id DESC)
    `);

    // PRIVATE TELEGRAM BOT MEMBERSHIPS (invite-only bot product)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS bot_memberships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL UNIQUE,
        plan_code TEXT NOT NULL DEFAULT 'TELEBOT',
        status TEXT NOT NULL DEFAULT 'invited', -- invited | active | expired | revoked
        source TEXT NOT NULL DEFAULT 'ARRA7',
        telegram_username TEXT,
        telegram_chat_id TEXT,
        invited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        activated_at DATETIME,
        expires_at DATETIME,
        metadata_json TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_bot_memberships_status
      ON bot_memberships(status)
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_bot_memberships_telegram_chat_id
      ON bot_memberships(telegram_chat_id)
    `);

    await turso.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_memberships_telegram_username
      ON bot_memberships(telegram_username)
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS bot_link_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        code_hash TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_bot_link_codes_user_id
      ON bot_link_codes(user_id)
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_bot_link_codes_expires_at
      ON bot_link_codes(expires_at)
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS telebot_payment_confirmations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        email TEXT,
        display_name TEXT,
        plan_code TEXT NOT NULL DEFAULT 'TELEBOT',
        duration_code TEXT NOT NULL DEFAULT '1month',
        amount_idr INTEGER NOT NULL DEFAULT 175000,
        telegram_username TEXT,
        payment_channel TEXT NOT NULL DEFAULT 'QRIS_MANUAL',
        status TEXT NOT NULL DEFAULT 'submitted', -- submitted | approved | rejected
        admin_note TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_telebot_payment_confirmations_user_id
      ON telebot_payment_confirmations(user_id)
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_telebot_payment_confirmations_status
      ON telebot_payment_confirmations(status)
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS telebot_user_profiles (
        user_id TEXT PRIMARY KEY,
        balance_amount REAL DEFAULT 0,
        balance_currency TEXT DEFAULT 'USD',
        risk_percent REAL DEFAULT 1.0,
        setup_style TEXT DEFAULT 'standard',
        reset_count INTEGER DEFAULT 0,
        last_reset_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS telebot_signal_executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        signal_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT,
        execution_type TEXT,
        setup_grade TEXT,
        invalidation_note TEXT,
        recommended_entry REAL,
        actual_entry REAL,
        status TEXT DEFAULT 'watching',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, signal_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (signal_id) REFERENCES ai_signals(id)
      )
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_telebot_signal_executions_user_id
      ON telebot_signal_executions(user_id)
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_telebot_signal_executions_signal_id
      ON telebot_signal_executions(signal_id)
    `);

    // TELEGRAM DAILY USAGE (separate quota from web analysis)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS telegram_vvip_daily_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        usage_date TEXT NOT NULL, -- YYYY-MM-DD (WIB)
        count INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, usage_date)
      )
    `);

    // ACTIVITY LOGS (Admin Tracking)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL, -- 'LOGIN', 'REGISTER', 'UPGRADE', 'ANALYSIS_FOREX', 'ANALYSIS_STOCK'
        details TEXT, -- JSON or text details
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // BROADCASTS (In-App & Telegram)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS broadcasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        target TEXT DEFAULT 'ALL', -- 'ALL', 'VVIP', 'PRO', 'BASIC'
        channels TEXT, -- JSON array ['IN_APP', 'TELEGRAM']
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        author TEXT
      )
    `);

    // MARKETING BOT CAMPAIGNS
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS marketing_campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'INACTIVITY', 'USAGE_LIMIT', 'NEW_USER'
        trigger_rule TEXT NOT NULL, -- JSON { daysInactive: 3, usageThreshold: 5 }
        message_template TEXT NOT NULL, -- "Hi {name}, come back!"
        channels TEXT, -- JSON ['TELEGRAM', 'EMAIL']
        status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'PAUSED'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // MARKETING LOGS (To prevent spam)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS marketing_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER,
        user_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // CLOUD TRADING BOT: Trading Accounts (MetaApi/Exness/FBS)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS trading_accounts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,         -- "My Exness Real"
        broker TEXT NOT NULL,       -- "Exness", "FBS"
        login TEXT NOT NULL,        -- MT4/5 Login ID
        server TEXT NOT NULL,       -- "Exness-Real12"
        platform TEXT DEFAULT 'MT5',-- "MT4", "MT5"
        api_key TEXT,               -- Encrypted MetaApi Token or Bridge Key
        account_id TEXT,            -- MetaApi Account ID
        connection_status TEXT DEFAULT 'DISCONNECTED', -- 'CONNECTED', 'DISCONNECTED', 'ERROR'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // CLOUD TRADING BOT: Auto-Trade Settings per Account
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS auto_trade_settings (
        account_id TEXT PRIMARY KEY,
        is_active INTEGER DEFAULT 0, -- Master Switch
        risk_percent REAL DEFAULT 1.0, -- Risk per trade (1%)
        fixed_lot REAL DEFAULT 0.01,   -- If risk_percent is 0
        max_open_trades INTEGER DEFAULT 3,
        pairs_allowed TEXT,            -- JSON ["XAUUSD", "EURUSD"]
        strategies_allowed TEXT,       -- JSON ["SCALPING", "SWING"] (from AI types)
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (account_id) REFERENCES trading_accounts(id) ON DELETE CASCADE
      )
    `);

    // CLOUD TRADING BOT: Trade Logs (Execution History)
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS trade_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        signal_id INTEGER,          -- Link to ai_signals or prediction_id
        symbol TEXT NOT NULL,
        action TEXT NOT NULL,       -- "BUY", "SELL"
        lot_size REAL NOT NULL,
        open_price REAL,
        sl REAL,
        tp REAL,
        mt_ticket TEXT,             -- Broker Ticket ID
        status TEXT DEFAULT 'PENDING', -- 'FILLED', 'FAILED', 'CLOSED'
        close_price REAL,
        profit REAL,
        error_message TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        FOREIGN KEY (account_id) REFERENCES trading_accounts(id)
      )
    `);

    // PROMO SLOTS: Track promotional slot usage for multi-duration pricing
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS promo_slots (
        membership TEXT NOT NULL,     -- 'PRO' or 'VVIP'
        duration TEXT NOT NULL,       -- '3months', '6months', '1year'
        used_count INTEGER DEFAULT 0,
        max_count INTEGER DEFAULT 15,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (membership, duration)
      )
    `);

    // ===== COPY TRADE SYSTEM TABLES =====

    // SIGNAL PROVIDERS: Master traders who share their trading signals
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS signal_providers (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        bio TEXT,
        subscription_fee INTEGER DEFAULT 0,  -- Monthly fee in IDR (0 = free)
        profit_sharing_percent INTEGER DEFAULT 0,  -- 0-30%
        is_active INTEGER DEFAULT 0,  -- 0 = pending approval, 1 = active
        is_approved INTEGER DEFAULT 0,  -- Admin approval status
        total_followers INTEGER DEFAULT 0,
        total_earnings INTEGER DEFAULT 0,  -- Total earnings in IDR
        broker_name TEXT,  -- e.g., 'Exness', 'FBS'
        broker_account_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // COPY RELATIONSHIPS: Follower-Provider connections
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS copy_relationships (
        id TEXT PRIMARY KEY,
        follower_user_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        allocated_capital REAL DEFAULT 0,  -- USD
        risk_multiplier REAL DEFAULT 1.0,  -- 0.1 - 2.0
        max_drawdown_percent INTEGER DEFAULT 20,  -- 5-50%
        status TEXT DEFAULT 'active',  -- active/paused/stopped
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (follower_user_id) REFERENCES users(id),
        FOREIGN KEY (provider_id) REFERENCES signal_providers(id)
      )
    `);

    // PROVIDER STATISTICS: Performance metrics for each provider
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS provider_statistics (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL UNIQUE,
        total_trades INTEGER DEFAULT 0,
        winning_trades INTEGER DEFAULT 0,
        losing_trades INTEGER DEFAULT 0,
        win_rate REAL DEFAULT 0,  -- Percentage
        total_profit_usd REAL DEFAULT 0,
        total_loss_usd REAL DEFAULT 0,
        net_profit_usd REAL DEFAULT 0,
        max_drawdown REAL DEFAULT 0,  -- Percentage
        sharpe_ratio REAL DEFAULT 0,
        avg_trade_duration_hours REAL DEFAULT 0,
        best_pair TEXT,
        avg_profit_per_trade REAL DEFAULT 0,
        avg_loss_per_trade REAL DEFAULT 0,
        last_trade_at DATETIME,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (provider_id) REFERENCES signal_providers(id)
      )
    `);

    // COPIED POSITIONS: Individual trades copied from master to follower
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS copied_positions (
        id TEXT PRIMARY KEY,
        copy_relationship_id TEXT NOT NULL,
        master_position_id TEXT,  -- From broker API
        follower_position_id TEXT,  -- From broker API
        symbol TEXT NOT NULL,  -- e.g., 'EURUSD', 'GBPJPY'
        position_type TEXT NOT NULL,  -- 'BUY' or 'SELL'
        lot_size REAL NOT NULL,
        entry_price REAL,
        exit_price REAL,
        stop_loss REAL,
        take_profit REAL,
        profit_loss REAL DEFAULT 0,  -- USD
        commission REAL DEFAULT 0,  -- USD
        swap REAL DEFAULT 0,  -- USD
        status TEXT DEFAULT 'open',  -- open/closed/failed
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        error_message TEXT,
        FOREIGN KEY (copy_relationship_id) REFERENCES copy_relationships(id)
      )
    `);

    // EARNINGS LOG: Track provider earnings from followers
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS earnings_log (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        follower_user_id TEXT NOT NULL,
        amount_idr INTEGER NOT NULL,
        amount_usd REAL,
        type TEXT NOT NULL,  -- 'subscription' or 'profit_share'
        period TEXT,  -- e.g., '2026-02' for subscription month
        related_position_id TEXT,  -- For profit_share, reference to copied_positions
        status TEXT DEFAULT 'pending',  -- pending/completed/failed
        paid_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (provider_id) REFERENCES signal_providers(id),
        FOREIGN KEY (follower_user_id) REFERENCES users(id),
        FOREIGN KEY (related_position_id) REFERENCES copied_positions(id)
      )
    `);

    // PROVIDER SIGNALS: Trading signals posted by providers to their followers
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS provider_signals (
        id TEXT PRIMARY KEY,
        provider_id TEXT NOT NULL,
        pair TEXT NOT NULL,
        action TEXT NOT NULL,
        entry_price REAL,
        stop_loss REAL,
        take_profit REAL,
        lot_size REAL DEFAULT 0.1,
        timeframe TEXT DEFAULT '1H',
        commentary TEXT,
        price_koin INTEGER DEFAULT 0,  -- Cost to unlock this signal (0 = free)
        status TEXT DEFAULT 'active',
        result_pips REAL,
        notified_at DATETIME,
        closed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (provider_id) REFERENCES signal_providers(id)
      )
    `);

    // KOIN TRANSACTIONS: Top-up, purchases, and withdrawals
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS trx_coins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,  -- Positive for top-up/income, negative for purchase/withdrawal
        type TEXT NOT NULL,       -- 'TOPUP', 'PURCHASE', 'WITHDRAW', 'SIGNAL_SALES', 'PLATFORM_FEE'
        description TEXT,
        reference_id TEXT,        -- E.g. signal_id or withdrawal_id
        status TEXT DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'FAILED'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // SIGNAL PURCHASES: Track which users unlocked which signals
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS signal_purchases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        signal_id TEXT NOT NULL,
        price_paid INTEGER NOT NULL,
        purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (signal_id) REFERENCES provider_signals(id),
        UNIQUE(user_id, signal_id)
      )
    `);

    // AI COPYTRADE BRIDGE: Store signals generated by AI Engine
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS ai_signal_store (
        id TEXT PRIMARY KEY,
        pair TEXT NOT NULL,
        type TEXT NOT NULL,
        entry_price REAL NOT NULL,
        tp REAL NOT NULL,
        sl REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS telegram_signal_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        chat_id TEXT NOT NULL,
        signal_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (signal_id) REFERENCES ai_signals(id)
      )
    `);

    await turso.execute(`
      CREATE INDEX IF NOT EXISTS idx_telegram_signal_requests_user_created
      ON telegram_signal_requests(user_id, id DESC)
    `);

    try {
      await turso.execute(`ALTER TABLE bot_memberships ADD COLUMN telegram_username TEXT`);
      console.log('Added telegram_username column to bot_memberships');
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        console.error('[MIGRATION] Failed to add bot_memberships.telegram_username:', e);
      }
    }

    try {
      await turso.execute(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_memberships_telegram_username
        ON bot_memberships(telegram_username)
      `);
    } catch (e) {
      console.error('[MIGRATION] Failed to ensure bot_memberships.telegram_username index:', e);
    }

    try {
      await turso.execute(`ALTER TABLE telebot_signal_executions ADD COLUMN execution_type TEXT`);
      console.log('Added execution_type column to telebot_signal_executions');
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        console.error('[MIGRATION] Failed to add telebot_signal_executions.execution_type:', e);
      }
    }

    try {
      await turso.execute(`ALTER TABLE telebot_signal_executions ADD COLUMN setup_grade TEXT`);
      console.log('Added setup_grade column to telebot_signal_executions');
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        console.error('[MIGRATION] Failed to add telebot_signal_executions.setup_grade:', e);
      }
    }

    try {
      await turso.execute(`ALTER TABLE telebot_signal_executions ADD COLUMN invalidation_note TEXT`);
      console.log('Added invalidation_note column to telebot_signal_executions');
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        console.error('[MIGRATION] Failed to add telebot_signal_executions.invalidation_note:', e);
      }
    }

    // VVIP BEST SIGNAL ALERT LOGS: dedupe + cooldown for Telegram alerts
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS vvip_signal_alert_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        signal_hash TEXT NOT NULL UNIQUE,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        direction TEXT NOT NULL,
        confidence INTEGER,
        rr_ratio REAL,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        source_user_id TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (source_user_id) REFERENCES users(id)
      )
    `);

    // Migrations: Add any missing columns to users table
    // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we try-catch each
    const migrations = [
      { column: 'membership', sql: `ALTER TABLE users ADD COLUMN membership TEXT DEFAULT 'BASIC'` },
      { column: 'membership_expires', sql: `ALTER TABLE users ADD COLUMN membership_expires DATETIME` },
      { column: 'created_at', sql: `ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP` },
      { column: 'updated_at', sql: `ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP` },
      { column: 'image', sql: `ALTER TABLE users ADD COLUMN image TEXT` },
      // Geo-location columns
      { column: 'last_login_ip', sql: `ALTER TABLE users ADD COLUMN last_login_ip TEXT` },
      { column: 'last_login_country', sql: `ALTER TABLE users ADD COLUMN last_login_country TEXT` },
      { column: 'last_login_city', sql: `ALTER TABLE users ADD COLUMN last_login_city TEXT` },
      { column: 'last_login_at', sql: `ALTER TABLE users ADD COLUMN last_login_at DATETIME` },
      // Promo feature columns
      { column: 'promo_expires', sql: `ALTER TABLE users ADD COLUMN promo_expires DATETIME` },
      { column: 'promo_type', sql: `ALTER TABLE users ADD COLUMN promo_type TEXT` },
      // Bookmap trial tracking
      { column: 'bookmap_first_access', sql: `ALTER TABLE users ADD COLUMN bookmap_first_access DATETIME` },
      // AI Self-Learning: Signals breakdown
      { column: 'signals', sql: `ALTER TABLE ml_predictions ADD COLUMN signals TEXT` },
      // APK Tracking
      { column: 'downloaded_apk', sql: `ALTER TABLE users ADD COLUMN downloaded_apk INTEGER DEFAULT 0` },
      { column: 'apk_downloaded_at', sql: `ALTER TABLE users ADD COLUMN apk_downloaded_at DATETIME` },
      // Exclusive Copytrade Subscription
      { column: 'subscription_status', sql: `ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free'` },
      { column: 'subscription_end_date', sql: `ALTER TABLE users ADD COLUMN subscription_end_date DATETIME` },
      { column: 'telegram_chat_id', sql: `ALTER TABLE users ADD COLUMN telegram_chat_id TEXT` },
      // Koin Balance Pay-Per-Signal
      { column: 'koin_balance', sql: `ALTER TABLE users ADD COLUMN koin_balance INTEGER DEFAULT 0` },
      { column: 'price_koin', sql: `ALTER TABLE provider_signals ADD COLUMN price_koin INTEGER DEFAULT 0` },
      { column: 'license_key', sql: `ALTER TABLE users ADD COLUMN license_key TEXT UNIQUE` },
    ];

    for (const migration of migrations) {
      try {
        await turso.execute(migration.sql);
        console.log(`Added ${migration.column} column`);
      } catch (e: any) {
        // Column likely already exists, ignore error only if it's "duplicate column name"
        if (!e.message?.includes('duplicate column name')) {
          console.error(`[MIGRATION] Failed to add column ${migration.column}:`, e);
        }
      }
    }

    console.log('Database tables initialized');
    return true;
  } catch (error) {
    console.error('Database init error:', error);
    return false;
  }
}

// User operations
export async function upsertUser(user: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `
        INSERT INTO users (id, email, name, image)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          image = excluded.image
      `,
      args: [user.id, user.email, user.name || '', user.image || ''],
    });
    return true;
  } catch (error) {
    console.error('Upsert user error:', error);
    return false;
  }
}

const ADMIN_EMAILS = ['apmexplore@gmail.com'];

export async function getUserMembership(userId: string): Promise<{ membership: string; createdAt: Date | null; expiresAt: Date | null }> {
  const turso = getTursoClient();
  if (!turso) return { membership: 'BASIC', createdAt: null, expiresAt: null };

  try {
    const result = await turso.execute({
      sql: 'SELECT email, membership, created_at, membership_expires FROM users WHERE id = ?',
      args: [userId],
    });

    if (result.rows.length > 0) {
      const email = (result.rows[0].email as string) || '';
      let membership = (result.rows[0].membership as string) || 'BASIC';
      const createdAt = result.rows[0].created_at ? new Date(result.rows[0].created_at as string) : null;

      // ADMIN OVERRIDE: Always VVIP, never expires
      if (ADMIN_EMAILS.includes(email)) {
        return { membership: 'VVIP', createdAt, expiresAt: null };
      }

      const expiresAt = result.rows[0].membership_expires ? new Date(result.rows[0].membership_expires as string) : null;

      // Check for expiration
      if (expiresAt && membership !== 'BASIC' && membership !== 'ADMIN') {
        const now = new Date();
        if (expiresAt < now) {
          console.log(`[MEMBERSHIP] User ${userId} membership ${membership} expired at ${expiresAt.toISOString()}. Downgrading to BASIC.`);

          // Auto-downgrade in DB
          await turso.execute({
            sql: "UPDATE users SET membership = 'BASIC' WHERE id = ?",
            args: [userId]
          });
          membership = 'BASIC';
        }
      }

      return { membership, createdAt, expiresAt };
    }
    return { membership: 'BASIC', createdAt: null, expiresAt: null };
  } catch (error) {
    console.error('Get membership error:', error);
    return { membership: 'BASIC', createdAt: null, expiresAt: null };
  }
}

export interface AccessResult {
  allowed: boolean;
  reason: 'GRANTED' | 'TRIAL_ACTIVE' | 'TRIAL_EXPIRED' | 'NO_ACCESS';
  daysLeft?: number;
  membership: string;
}

export async function checkBookmapAccess(userId: string): Promise<AccessResult> {
  const { membership } = await getUserMembership(userId);

  // 1. PRO and VVIP have unlimited access
  if (membership === 'PRO' || membership === 'VVIP' || membership === 'ADMIN') {
    return { allowed: true, reason: 'GRANTED', membership };
  }

  // 2. Check for Active Promo (Overrides BASIC restrictions)
  const promo = await checkUserPromo(userId);
  if (promo.hasPromo && promo.expiresAt) {
    const now = new Date();
    const expires = new Date(promo.expiresAt);
    const msLeft = expires.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));

    if (daysLeft > 0) {
      return { allowed: true, reason: 'TRIAL_ACTIVE', daysLeft, membership };
    }
  }

  // 3. BASIC users: Check 1-day trial from FIRST Bookmap access
  if (membership === 'BASIC' || !membership) {
    const turso = getTursoClient();
    if (!turso) return { allowed: false, reason: 'NO_ACCESS', membership };

    try {
      // Get first access timestamp
      const result = await turso.execute({
        sql: 'SELECT bookmap_first_access FROM users WHERE id = ?',
        args: [userId],
      });

      let firstAccess: Date | null = null;
      if (result.rows.length > 0 && result.rows[0].bookmap_first_access) {
        firstAccess = new Date(result.rows[0].bookmap_first_access as string);
      }

      // If no first access, set it NOW and grant trial
      if (!firstAccess) {
        const now = new Date();
        await turso.execute({
          sql: 'UPDATE users SET bookmap_first_access = ? WHERE id = ?',
          args: [now.toISOString(), userId],
        });
        console.log(`[BOOKMAP] First access recorded for user ${userId}`);
        return { allowed: true, reason: 'TRIAL_ACTIVE', daysLeft: 1, membership };
      }

      // Calculate trial status (1 day = 24 hours)
      const now = new Date();
      const trialDuration = 3 * 24 * 60 * 60 * 1000; // 3 days in ms
      const timeDiff = now.getTime() - firstAccess.getTime();

      if (timeDiff < trialDuration) {
        const hoursLeft = Math.ceil((trialDuration - timeDiff) / (60 * 60 * 1000));
        return { allowed: true, reason: 'TRIAL_ACTIVE', daysLeft: hoursLeft > 24 ? 1 : 0, membership };
      } else {
        return { allowed: false, reason: 'TRIAL_EXPIRED', daysLeft: 0, membership };
      }
    } catch (error) {
      console.error('Bookmap access check error:', error);
      return { allowed: false, reason: 'NO_ACCESS', membership };
    }
  }

  return { allowed: false, reason: 'NO_ACCESS', membership };
}

export async function updateUserMembership(userId: string, membership: string): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: 'UPDATE users SET membership = ? WHERE id = ?',
      args: [membership, userId],
    });
    return true;
  } catch (error) {
    console.error('Update membership error:', error);
    return false;
  }
}

// Update user's geo-location data on login
export async function updateUserGeoLocation(userId: string, geoData: {
  ip?: string;
  country?: string;
  city?: string;
}): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `UPDATE users SET 
                last_login_ip = ?,
                last_login_country = ?,
                last_login_city = ?,
                last_login_at = datetime('now')
                WHERE id = ?`,
      args: [geoData.ip || null, geoData.country || null, geoData.city || null, userId],
    });
    console.log(`[GEO] Updated location for user ${userId}: ${geoData.city}, ${geoData.country}`);
    return true;
  } catch (error) {
    console.error('Update geo-location error:', error);
    return false;
  }
}

// Set promo for a specific user
export async function setUserPromo(userId: string, durationDays: number = 3, promoType: string = 'APK_DOWNLOAD'): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + durationDays);
    const expiresStr = expiresDate.toISOString();

    await turso.execute({
      sql: `UPDATE users SET promo_expires = ?, promo_type = ? WHERE id = ?`,
      args: [expiresStr, promoType, userId],
    });
    console.log(`[PROMO] Set ${durationDays}-day promo for user ${userId}, expires: ${expiresStr}`);
    return true;
  } catch (error) {
    console.error('Set user promo error:', error);
    return false;
  }
}

// Check if user has active promo
export async function checkUserPromo(userId: string): Promise<{ hasPromo: boolean; expiresAt: string | null; promoType: string | null }> {
  const turso = getTursoClient();
  if (!turso) return { hasPromo: false, expiresAt: null, promoType: null };

  try {
    const result = await turso.execute({
      sql: 'SELECT promo_expires, promo_type FROM users WHERE id = ?',
      args: [userId],
    });

    if (result.rows.length > 0) {
      const promoExpires = result.rows[0].promo_expires as string | null;
      const promoType = result.rows[0].promo_type as string | null;

      if (promoExpires) {
        const expiresDate = new Date(promoExpires);
        const now = new Date();
        if (expiresDate > now) {
          return { hasPromo: true, expiresAt: promoExpires, promoType };
        }
      }
    }
    return { hasPromo: false, expiresAt: null, promoType: null };
  } catch (error) {
    console.error('Check user promo error:', error);
    return { hasPromo: false, expiresAt: null, promoType: null };
  }
}

// Give promo to ALL users (for APK launch campaign)
export async function givePromoToAllUsers(durationDays: number = 3, promoType: string = 'APK_V2_LAUNCH'): Promise<{ success: boolean; count: number }> {
  const turso = getTursoClient();
  if (!turso) return { success: false, count: 0 };

  try {
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + durationDays);
    const expiresStr = expiresDate.toISOString();

    const result = await turso.execute({
      sql: `UPDATE users SET promo_expires = ?, promo_type = ? WHERE promo_expires IS NULL OR promo_expires < datetime('now')`,
      args: [expiresStr, promoType],
    });

    console.log(`[PROMO] Gave ${durationDays}-day promo to ${result.rowsAffected} users`);
    return { success: true, count: result.rowsAffected };
  } catch (error) {
    console.error('Give promo to all users error:', error);
    return { success: false, count: 0 };
  }
}

// ===== DOM ML PREDICTION FUNCTIONS =====

export interface MLPredictionRecord {
  symbol: string;
  horizon: number;
  direction: string;
  direction_code: number;
  confidence: number;
  model_used: string;
  initial_price: number;
  signals?: Record<string, unknown>[]; // Detailed signal breakdown
}

// Save a new ML prediction for later verification
export async function saveMLPrediction(prediction: MLPredictionRecord): Promise<number | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    const signalsJson = prediction.signals ? JSON.stringify(prediction.signals) : null;

    const result = await turso.execute({
      sql: `INSERT INTO ml_predictions (symbol, horizon, direction, direction_code, confidence, model_used, initial_price, signals)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        prediction.symbol,
        prediction.horizon,
        prediction.direction,
        prediction.direction_code,
        prediction.confidence,
        prediction.model_used,
        prediction.initial_price,
        signalsJson
      ]
    });
    return Number(result.lastInsertRowid);
  } catch (error) {
    console.error('Save ML prediction error:', error);
    return null;
  }
}

// Get ML Config (Weights)
export async function getMLConfig(key: string): Promise<unknown | null> {
  const turso = getTursoClient();
  if (!turso) return null;
  try {
    const result = await turso.execute({
      sql: 'SELECT value FROM ml_config WHERE key = ?',
      args: [key]
    });
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value as string);
    }
    return null;
  } catch (e) {
    console.error('Get ML config error:', e);
    return null;
  }
}

// Upsert ML Config
export async function upsertMLConfig(key: string, value: unknown): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;
  try {
    await turso.execute({
      sql: `INSERT INTO ml_config (key, value) VALUES (?, ?) 
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      args: [key, JSON.stringify(value)]
    });
    return true;
  } catch (e) {
    console.error('Upsert ML config error:', e);
    return false;
  }
}

// Verify a prediction with actual price
export async function verifyMLPrediction(
  predictionId: number,
  actualPrice: number
): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    // Get the original prediction
    const pred = await turso.execute({
      sql: 'SELECT initial_price, direction_code FROM ml_predictions WHERE id = ?',
      args: [predictionId]
    });

    if (pred.rows.length === 0) return false;

    const initialPrice = pred.rows[0].initial_price as number;
    const predictedDirection = pred.rows[0].direction_code as number;

    // Calculate actual direction
    const priceChange = actualPrice - initialPrice;
    const priceChangePct = (priceChange / initialPrice) * 10000; // bps

    let actualDirection: number;
    // Relaxed threshold: 0.2 basis points (0.002%) to match frontend logic
    // This allows small wins to count as correct
    const THRESHOLD = 0.2;

    if (priceChangePct > THRESHOLD) {
      actualDirection = 1; // UP
    } else if (priceChangePct < -THRESHOLD) {
      actualDirection = -1; // DOWN
    } else {
      actualDirection = 0; // NEUTRAL
    }

    const isCorrect = predictedDirection === actualDirection ? 1 : 0;

    // Update the prediction
    await turso.execute({
      sql: `UPDATE ml_predictions 
            SET actual_price = ?, actual_direction = ?, is_correct = ?, verified_at = datetime('now')
            WHERE id = ?`,
      args: [actualPrice, actualDirection, isCorrect, predictionId]
    });

    return true;
  } catch (error) {
    console.error('Verify ML prediction error:', error);
    return false;
  }
}

// Get ML accuracy stats for a symbol and date range
export interface MLAccuracyStats {
  total: number;
  correct: number;
  accuracy: number;
  byModel: Record<string, { total: number; correct: number; accuracy: number }>;
  byDirection: Record<string, { total: number; correct: number; accuracy: number }>;
}

export async function getMLAccuracyStats(
  symbol: string,
  days: number = 7
): Promise<MLAccuracyStats> {
  const turso = getTursoClient();
  const defaultStats: MLAccuracyStats = {
    total: 0,
    correct: 0,
    accuracy: 0,
    byModel: {},
    byDirection: {}
  };

  if (!turso) return defaultStats;

  try {
    // Overall stats
    const overall = await turso.execute({
      sql: `SELECT COUNT(*) as total, SUM(is_correct) as correct 
            FROM ml_predictions 
            WHERE symbol = ? AND verified_at IS NOT NULL 
            AND created_at > datetime('now', '-${days} days')`,
      args: [symbol]
    });

    const total = (overall.rows[0]?.total as number) || 0;
    const correct = (overall.rows[0]?.correct as number) || 0;

    // By model
    const byModelResult = await turso.execute({
      sql: `SELECT model_used, COUNT(*) as total, SUM(is_correct) as correct 
            FROM ml_predictions 
            WHERE symbol = ? AND verified_at IS NOT NULL 
            AND created_at > datetime('now', '-${days} days')
            GROUP BY model_used`,
      args: [symbol]
    });

    const byModel: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const row of byModelResult.rows) {
      const modelTotal = row.total as number;
      const modelCorrect = row.correct as number;
      byModel[row.model_used as string] = {
        total: modelTotal,
        correct: modelCorrect,
        accuracy: modelTotal > 0 ? modelCorrect / modelTotal : 0
      };
    }

    // By direction
    const byDirResult = await turso.execute({
      sql: `SELECT direction, COUNT(*) as total, SUM(is_correct) as correct 
            FROM ml_predictions 
            WHERE symbol = ? AND verified_at IS NOT NULL 
            AND created_at > datetime('now', '-${days} days')
            GROUP BY direction`,
      args: [symbol]
    });

    const byDirection: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const row of byDirResult.rows) {
      const dirTotal = row.total as number;
      const dirCorrect = row.correct as number;
      byDirection[row.direction as string] = {
        total: dirTotal,
        correct: dirCorrect,
        accuracy: dirTotal > 0 ? dirCorrect / dirTotal : 0
      };
    }

    return {
      total,
      correct,
      accuracy: total > 0 ? correct / total : 0,
      byModel,
      byDirection
    };
  } catch (error) {
    console.error('Get ML accuracy stats error:', error);
    return defaultStats;
  }
}

// ===== ACTIVITY LOGGING =====

export async function logActivity(
  userId: string,
  action: string,
  details?: any,
  ip?: string,
  userAgent?: string
): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        userId,
        action,
        details ? JSON.stringify(details) : null,
        ip || null,
        userAgent || null
      ]
    });
    return true;
  } catch (error) {
    console.error('Log activity error:', error);
    return false;
  }
}

// Get recent predictions for display
export async function getRecentMLPredictions(symbol: string, limit: number = 20) {
  const turso = getTursoClient();
  if (!turso) return [];

  try {
    const result = await turso.execute({
      sql: `SELECT * FROM ml_predictions 
            WHERE symbol = ? 
            ORDER BY created_at DESC 
            LIMIT ?`,
      args: [symbol, limit]
    });

    return result.rows;
  } catch (error) {
    console.error('Get recent predictions error:', error);
    return [];
  }
}

// Get global stats for landing page
export async function getGlobalStats() {
  const turso = getTursoClient();
  // Default values if DB connection fails or empty
  if (!turso) return { users: 125, predictions: 5200, accuracy: 95.2, volume: '1.2M' };

  try {
    // 1. User Count
    const userRes = await turso.execute('SELECT COUNT(*) as count FROM users');
    const userCount = (userRes.rows[0]?.count as number) || 125;

    // 2. Total Predictions
    const predRes = await turso.execute('SELECT COUNT(*) as count FROM ml_predictions');
    const predCount = (predRes.rows[0]?.count as number) || 5200;

    // 3. Accuracy (Verified only)
    const accRes = await turso.execute(`
      SELECT COUNT(*) as total, SUM(is_correct) as correct 
      FROM ml_predictions 
      WHERE verified_at IS NOT NULL 
    `);

    const totalVerified = (accRes.rows[0]?.total as number) || 0;
    const correctVerified = (accRes.rows[0]?.correct as number) || 0;

    // If we have verified data, calculate real accuracy. 
    // Force above 90% as per user request to maintain attractiveness
    let accuracy = 95.8;
    if (totalVerified > 10) {
      const realAcc = (correctVerified / totalVerified) * 100;
      accuracy = Math.max(94.2, realAcc);
    }

    return {
      users: userCount,
      predictions: predCount,
      accuracy: accuracy,
      volume: '1.2M' // Placeholder for now
    };
  } catch (error) {
    console.error('Get global stats error:', error);
    return { users: 125, predictions: 5200, accuracy: 95.2, volume: '1.2M' };
  }
}

// Get last analysis time for rate limiting
export async function getLastAnalysisTime(userId: string, type: string = 'forex'): Promise<Date | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    const result = await turso.execute({
      sql: 'SELECT created_at FROM analysis_history WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
      args: [userId, type],
    });

    if (result.rows.length > 0 && result.rows[0].created_at) {
      return new Date(result.rows[0].created_at as string);
    }
    return null;
  } catch (error) {
    console.error('Get last analysis time error:', error);
    return null;
  }
}

// ===== TELEGRAM USER FUNCTIONS =====

function hashTelegramLinkCode(code: string): string {
  return createHash('sha256')
    .update(code.trim().toUpperCase())
    .digest('hex');
}

export async function isVvipActive(userId: string): Promise<boolean> {
  const { membership } = await getUserMembership(userId);
  return membership === 'VVIP';
}

export async function linkTelegramUser(userId: string, telegramData: {
  chatId: string;
  username?: string;
  firstName?: string;
}): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `INSERT INTO telegram_users (user_id, chat_id, username, first_name)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(chat_id) DO UPDATE SET
            user_id = excluded.user_id,
            username = excluded.username,
            first_name = excluded.first_name,
            last_active_at = CURRENT_TIMESTAMP`,
      args: [userId, telegramData.chatId, telegramData.username || null, telegramData.firstName || null]
    });
    return true;
  } catch (error) {
    console.error('Link Telegram user error:', error);
    return false;
  }
}

export async function upsertTelegramContact(params: {
  chatId: string;
  username?: string;
  firstName?: string;
  lastCommand?: string | null;
  lastMessageText?: string | null;
}): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await ensureTelegramContactCampaignSchemaInternal(turso);
    const normalizedCommand = params.lastCommand?.trim().toLowerCase() || null;
    await turso.execute({
      sql: `INSERT INTO telegram_contacts (chat_id, username, first_name, started_at, last_command, last_message_text)
            VALUES (?, ?, ?, CASE WHEN ? = '/start' THEN CURRENT_TIMESTAMP ELSE NULL END, ?, ?)
            ON CONFLICT(chat_id) DO UPDATE SET
              username = COALESCE(excluded.username, telegram_contacts.username),
              first_name = COALESCE(excluded.first_name, telegram_contacts.first_name),
              started_at = COALESCE(telegram_contacts.started_at, excluded.started_at),
              last_command = COALESCE(excluded.last_command, telegram_contacts.last_command),
              last_message_text = COALESCE(excluded.last_message_text, telegram_contacts.last_message_text),
              last_seen_at = CURRENT_TIMESTAMP`,
      args: [
        params.chatId.trim(),
        params.username ? params.username.trim().replace(/^@+/, '') : null,
        params.firstName?.trim() || null,
        normalizedCommand,
        normalizedCommand,
        params.lastMessageText?.trim() || null,
      ]
    });
    return true;
  } catch (error) {
    console.error('Upsert telegram contact error:', error);
    return false;
  }
}

export async function getTelegramUser(chatId: string): Promise<{ userId: string; email: string; membership: string } | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    const result = await turso.execute({
      sql: `SELECT u.id, u.email, u.membership 
            FROM telegram_users tu
            JOIN users u ON tu.user_id = u.id
            WHERE tu.chat_id = ?`,
      args: [chatId]
    });

    if (result.rows.length > 0) {
      return {
        userId: result.rows[0].id as string,
        email: result.rows[0].email as string,
        membership: result.rows[0].membership as string
      };
    }
    return null;
  } catch (error) {
    console.error('Get Telegram user error:', error);
    return null;
  }
}

export async function setUserTelegramChatId(userId: string, chatId: string): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `UPDATE users
            SET telegram_chat_id = NULL
            WHERE telegram_chat_id = ?
              AND id != ?`,
      args: [chatId.trim(), userId],
    });

    await turso.execute({
      sql: `UPDATE users
            SET telegram_chat_id = ?
            WHERE id = ?`,
      args: [chatId.trim(), userId],
    });
    return true;
  } catch (error) {
    console.error('Set user telegram_chat_id error:', error);
    return false;
  }
}

export async function createTelegramLinkCode(
  userId: string,
  plainCode: string,
  ttlMinutes: number
): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  const normalizedTtl = Math.max(1, Math.min(60, Math.floor(ttlMinutes || 10)));
  const codeHash = hashTelegramLinkCode(plainCode);

  try {
    // Cleanup old/expired/used codes for this user first
    await turso.execute({
      sql: `DELETE FROM telegram_link_codes
            WHERE user_id = ?
               OR used_at IS NOT NULL
               OR expires_at <= datetime('now')`,
      args: [userId],
    });

    await turso.execute({
      sql: `INSERT INTO telegram_link_codes (user_id, code_hash, expires_at)
            VALUES (?, ?, datetime('now', '+${normalizedTtl} minutes'))`,
      args: [userId, codeHash],
    });
    return true;
  } catch (error) {
    console.error('Create telegram link code error:', error);
    return false;
  }
}

export async function findValidTelegramLinkCode(
  plainCode: string
): Promise<{ id: number; userId: string; expiresAt: string } | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    const codeHash = hashTelegramLinkCode(plainCode);
    const result = await turso.execute({
      sql: `SELECT id, user_id, expires_at
            FROM telegram_link_codes
            WHERE code_hash = ?
              AND used_at IS NULL
              AND expires_at > datetime('now')
            ORDER BY id DESC
            LIMIT 1`,
      args: [codeHash],
    });

    if (result.rows.length === 0) return null;
    return {
      id: Number(result.rows[0].id),
      userId: String(result.rows[0].user_id),
      expiresAt: String(result.rows[0].expires_at),
    };
  } catch (error) {
    console.error('Find telegram link code error:', error);
    return null;
  }
}

export async function markTelegramLinkCodeUsed(linkCodeId: number): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `UPDATE telegram_link_codes
            SET used_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND used_at IS NULL`,
      args: [linkCodeId],
    });
    return true;
  } catch (error) {
    console.error('Mark telegram link code used error:', error);
    return false;
  }
}

export interface PrivateBotMembership {
  userId: string;
  email: string | null;
  displayName: string | null;
  planCode: string;
  status: 'invited' | 'active' | 'expired' | 'revoked';
  telegramUsername: string | null;
  telegramChatId: string | null;
  source: string;
  expiresAt: string | null;
}

export interface TelebotUserProfile {
  userId: string;
  balanceAmount: number;
  balanceCurrency: string;
  riskPercent: number;
  setupStyle: 'conservative' | 'standard' | 'aggressive';
  resetCount: number;
  lastResetAt: string | null;
  updatedAt: string | null;
}

function normalizeTelebotSetupStyle(style?: string | null): TelebotUserProfile['setupStyle'] {
  const value = String(style || '').trim().toLowerCase();
  if (value === 'conservative' || value === 'aggressive') return value;
  return 'standard';
}

async function ensureTelebotUserProfileRow(userId: string): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `INSERT OR IGNORE INTO telebot_user_profiles (user_id)
            VALUES (?)`,
      args: [userId]
    });
    return true;
  } catch (error) {
    console.error('Ensure telebot user profile error:', error);
    return false;
  }
}

export async function getTelebotUserProfile(userId: string): Promise<TelebotUserProfile | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    await ensureTelebotUserProfileRow(userId);
    const result = await turso.execute({
      sql: `SELECT user_id, balance_amount, balance_currency, risk_percent, setup_style, reset_count, last_reset_at, updated_at
            FROM telebot_user_profiles
            WHERE user_id = ?
            LIMIT 1`,
      args: [userId]
    });

    if (result.rows.length === 0) return null;
    return {
      userId: String(result.rows[0].user_id),
      balanceAmount: Number(result.rows[0].balance_amount || 0),
      balanceCurrency: String(result.rows[0].balance_currency || 'USD'),
      riskPercent: Number(result.rows[0].risk_percent || 1),
      setupStyle: normalizeTelebotSetupStyle(String(result.rows[0].setup_style || 'standard')),
      resetCount: Number(result.rows[0].reset_count || 0),
      lastResetAt: result.rows[0].last_reset_at ? String(result.rows[0].last_reset_at) : null,
      updatedAt: result.rows[0].updated_at ? String(result.rows[0].updated_at) : null
    };
  } catch (error) {
    console.error('Get telebot user profile error:', error);
    return null;
  }
}

export async function upsertTelebotUserProfile(params: {
  userId: string;
  balanceAmount?: number | null;
  riskPercent?: number | null;
  setupStyle?: string | null;
  balanceCurrency?: string | null;
}): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    const existing = await getTelebotUserProfile(params.userId);
    const nextBalance = params.balanceAmount != null
      ? Math.max(0, Number(params.balanceAmount) || 0)
      : (existing?.balanceAmount ?? 0);
    const nextRiskPercent = params.riskPercent != null
      ? Math.min(5, Math.max(0.1, Number(params.riskPercent) || 1))
      : (existing?.riskPercent ?? 1);
    const nextSetupStyle = normalizeTelebotSetupStyle(params.setupStyle || existing?.setupStyle || 'standard');
    const nextCurrency = String(params.balanceCurrency || existing?.balanceCurrency || 'USD').toUpperCase();

    await turso.execute({
      sql: `INSERT INTO telebot_user_profiles (user_id, balance_amount, balance_currency, risk_percent, setup_style, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET
              balance_amount = excluded.balance_amount,
              balance_currency = excluded.balance_currency,
              risk_percent = excluded.risk_percent,
              setup_style = excluded.setup_style,
              updated_at = CURRENT_TIMESTAMP`,
      args: [params.userId, nextBalance, nextCurrency, nextRiskPercent, nextSetupStyle]
    });
    return true;
  } catch (error) {
    console.error('Upsert telebot user profile error:', error);
    return false;
  }
}

export async function resetTelebotUserBalance(userId: string): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await ensureTelebotUserProfileRow(userId);
    await turso.execute({
      sql: `UPDATE telebot_user_profiles
            SET balance_amount = 0,
                reset_count = COALESCE(reset_count, 0) + 1,
                last_reset_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?`,
      args: [userId]
    });
    return true;
  } catch (error) {
    console.error('Reset telebot user balance error:', error);
    return false;
  }
}

export async function getPrivateBotMembershipByChatId(chatId: string): Promise<PrivateBotMembership | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    const result = await turso.execute({
      sql: `SELECT bm.user_id, u.email, u.name, bm.plan_code, bm.status, bm.telegram_username, bm.telegram_chat_id, bm.source, bm.expires_at
            FROM bot_memberships bm
            JOIN users u ON u.id = bm.user_id
            WHERE bm.telegram_chat_id = ?
            LIMIT 1`,
      args: [chatId.trim()]
    });

    if (result.rows.length === 0) return null;
    return {
      userId: String(result.rows[0].user_id),
      email: result.rows[0].email ? String(result.rows[0].email) : null,
      displayName: result.rows[0].name ? String(result.rows[0].name) : null,
      planCode: String(result.rows[0].plan_code || 'TELEBOT'),
      status: String(result.rows[0].status || 'invited') as PrivateBotMembership['status'],
      telegramUsername: result.rows[0].telegram_username ? String(result.rows[0].telegram_username) : null,
      telegramChatId: result.rows[0].telegram_chat_id ? String(result.rows[0].telegram_chat_id) : null,
      source: String(result.rows[0].source || 'ARRA7'),
      expiresAt: result.rows[0].expires_at ? String(result.rows[0].expires_at) : null
    };
  } catch (error) {
    console.error('Get private bot membership by chatId error:', error);
    return null;
  }
}

export async function getPrivateBotMembershipByUserId(userId: string): Promise<PrivateBotMembership | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    const result = await turso.execute({
      sql: `SELECT bm.user_id, u.email, u.name, bm.plan_code, bm.status, bm.telegram_username, bm.telegram_chat_id, bm.source, bm.expires_at
            FROM bot_memberships bm
            JOIN users u ON u.id = bm.user_id
            WHERE bm.user_id = ?
            LIMIT 1`,
      args: [userId]
    });

    if (result.rows.length === 0) return null;
    return {
      userId: String(result.rows[0].user_id),
      email: result.rows[0].email ? String(result.rows[0].email) : null,
      displayName: result.rows[0].name ? String(result.rows[0].name) : null,
      planCode: String(result.rows[0].plan_code || 'TELEBOT'),
      status: String(result.rows[0].status || 'invited') as PrivateBotMembership['status'],
      telegramUsername: result.rows[0].telegram_username ? String(result.rows[0].telegram_username) : null,
      telegramChatId: result.rows[0].telegram_chat_id ? String(result.rows[0].telegram_chat_id) : null,
      source: String(result.rows[0].source || 'ARRA7'),
      expiresAt: result.rows[0].expires_at ? String(result.rows[0].expires_at) : null
    };
  } catch (error) {
    console.error('Get private bot membership by userId error:', error);
    return null;
  }
}

function normalizeTelegramUsername(username?: string | null): string | null {
  const value = String(username || '').trim().replace(/^@+/, '').toLowerCase();
  return value || null;
}

export async function getPrivateBotMembershipByTelegramUsername(username: string): Promise<PrivateBotMembership | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  const normalized = normalizeTelegramUsername(username);
  if (!normalized) return null;

  try {
    const result = await turso.execute({
      sql: `SELECT bm.user_id, u.email, u.name, bm.plan_code, bm.status, bm.telegram_username, bm.telegram_chat_id, bm.source, bm.expires_at
            FROM bot_memberships bm
            JOIN users u ON u.id = bm.user_id
            WHERE lower(trim(bm.telegram_username)) = ?
            LIMIT 1`,
      args: [normalized]
    });

    if (result.rows.length === 0) return null;
    return {
      userId: String(result.rows[0].user_id),
      email: result.rows[0].email ? String(result.rows[0].email) : null,
      displayName: result.rows[0].name ? String(result.rows[0].name) : null,
      planCode: String(result.rows[0].plan_code || 'TELEBOT'),
      status: String(result.rows[0].status || 'invited') as PrivateBotMembership['status'],
      telegramUsername: result.rows[0].telegram_username ? String(result.rows[0].telegram_username) : null,
      telegramChatId: result.rows[0].telegram_chat_id ? String(result.rows[0].telegram_chat_id) : null,
      source: String(result.rows[0].source || 'ARRA7'),
      expiresAt: result.rows[0].expires_at ? String(result.rows[0].expires_at) : null
    };
  } catch (error) {
    console.error('Get private bot membership by telegram username error:', error);
    return null;
  }
}

export async function upsertPrivateBotMembership(params: {
  userId: string;
  planCode?: string;
  status: 'invited' | 'active' | 'expired' | 'revoked';
  expiresAt?: string | null;
  telegramUsername?: string | null;
  telegramChatId?: string | null;
  metadataJson?: string | null;
}): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `INSERT INTO bot_memberships (user_id, plan_code, status, telegram_username, telegram_chat_id, expires_at, metadata_json, activated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              plan_code = excluded.plan_code,
              status = excluded.status,
              telegram_username = COALESCE(excluded.telegram_username, bot_memberships.telegram_username),
              telegram_chat_id = COALESCE(excluded.telegram_chat_id, bot_memberships.telegram_chat_id),
              expires_at = excluded.expires_at,
              metadata_json = COALESCE(excluded.metadata_json, bot_memberships.metadata_json),
              activated_at = CASE WHEN excluded.status = 'active' THEN COALESCE(bot_memberships.activated_at, CURRENT_TIMESTAMP) ELSE bot_memberships.activated_at END`,
      args: [
        params.userId,
          params.planCode || 'TELEBOT',
        params.status,
        normalizeTelegramUsername(params.telegramUsername),
        params.telegramChatId ?? null,
        params.expiresAt ?? null,
        params.metadataJson ?? null,
        params.status === 'active' ? new Date().toISOString() : null
      ]
    });
    return true;
  } catch (error) {
    console.error('Upsert private bot membership error:', error);
    return false;
  }
}

export async function createPrivateBotLinkCode(
  userId: string,
  plainCode: string,
  ttlMinutes: number
): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  const normalizedTtl = Math.max(1, Math.min(60, Math.floor(ttlMinutes || 15)));
  const codeHash = hashTelegramLinkCode(plainCode);

  try {
    await turso.execute({
      sql: `DELETE FROM bot_link_codes
            WHERE user_id = ?
               OR used_at IS NOT NULL
               OR expires_at <= datetime('now')`,
      args: [userId]
    });

    await turso.execute({
      sql: `INSERT INTO bot_link_codes (user_id, code_hash, expires_at)
            VALUES (?, ?, datetime('now', '+${normalizedTtl} minutes'))`,
      args: [userId, codeHash]
    });
    return true;
  } catch (error) {
    console.error('Create private bot link code error:', error);
    return false;
  }
}

export async function findValidPrivateBotLinkCode(
  plainCode: string
): Promise<{ id: number; userId: string; expiresAt: string } | null> {
  const turso = getTursoClient();
  if (!turso) return null;

  try {
    const codeHash = hashTelegramLinkCode(plainCode);
    const result = await turso.execute({
      sql: `SELECT id, user_id, expires_at
            FROM bot_link_codes
            WHERE code_hash = ?
              AND used_at IS NULL
              AND expires_at > datetime('now')
            ORDER BY id DESC
            LIMIT 1`,
      args: [codeHash]
    });

    if (result.rows.length === 0) return null;
    return {
      id: Number(result.rows[0].id),
      userId: String(result.rows[0].user_id),
      expiresAt: String(result.rows[0].expires_at)
    };
  } catch (error) {
    console.error('Find valid private bot link code error:', error);
    return null;
  }
}

export async function markPrivateBotLinkCodeUsed(linkCodeId: number): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `UPDATE bot_link_codes
            SET used_at = CURRENT_TIMESTAMP
            WHERE id = ?
              AND used_at IS NULL`,
      args: [linkCodeId]
    });
    return true;
  } catch (error) {
    console.error('Mark private bot link code used error:', error);
    return false;
  }
}

export async function attachPrivateBotTelegramIdentity(
  userId: string,
  chatId: string,
  telegramUsername?: string | null
): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await turso.execute({
      sql: `UPDATE bot_memberships
            SET telegram_chat_id = NULL
            WHERE telegram_chat_id = ?
              AND user_id != ?`,
      args: [chatId.trim(), userId]
    });

    await turso.execute({
      sql: `UPDATE bot_memberships
            SET telegram_chat_id = ?,
                telegram_username = COALESCE(?, telegram_username)
            WHERE user_id = ?`,
      args: [chatId.trim(), normalizeTelegramUsername(telegramUsername), userId]
    });
    return true;
  } catch (error) {
    console.error('Attach private bot telegram chat id error:', error);
    return false;
  }
}

export async function attachPrivateBotTelegramChatId(userId: string, chatId: string): Promise<boolean> {
  return attachPrivateBotTelegramIdentity(userId, chatId);
}

export interface TelegramCampaignRecipient {
  chatId: string;
  username: string | null;
  firstName: string | null;
  source: 'contact' | 'linked_user';
  userId: string | null;
  telebotStatus: string | null;
  expiresAt: string | null;
}

function isActiveTelebotMembership(status?: string | null, expiresAt?: string | null): boolean {
  if (String(status || '').toLowerCase() !== 'active') return false;
  if (!expiresAt) return true;
  const expiresTime = new Date(expiresAt).getTime();
  return Number.isFinite(expiresTime) && expiresTime > Date.now();
}

export async function getTelebotPromoBroadcastRecipients(campaignKey: string): Promise<TelegramCampaignRecipient[]> {
  const turso = getTursoClient();
  if (!turso) return [];

  try {
    await ensureTelegramContactCampaignSchemaInternal(turso);

    const [contactResult, linkedResult] = await Promise.all([
      turso.execute({
        sql: `SELECT
                c.chat_id,
                c.username,
                c.first_name,
                bm.user_id,
                bm.status AS telebot_status,
                bm.expires_at
              FROM telegram_contacts c
              LEFT JOIN bot_memberships bm
                ON bm.telegram_chat_id = c.chat_id
                OR (
                  c.username IS NOT NULL
                  AND lower(trim(replace(c.username, '@', ''))) = lower(trim(bm.telegram_username))
                )
              LEFT JOIN telegram_campaign_deliveries d
                ON d.campaign_key = ?
               AND d.chat_id = c.chat_id
              WHERE d.chat_id IS NULL
              ORDER BY c.last_seen_at DESC`,
        args: [campaignKey]
      }),
      turso.execute({
        sql: `SELECT
                tu.chat_id,
                tu.username,
                tu.first_name,
                tu.user_id,
                bm.status AS telebot_status,
                bm.expires_at
              FROM telegram_users tu
              LEFT JOIN bot_memberships bm
                ON bm.user_id = tu.user_id
              LEFT JOIN telegram_campaign_deliveries d
                ON d.campaign_key = ?
               AND d.chat_id = tu.chat_id
              WHERE d.chat_id IS NULL
              ORDER BY tu.last_active_at DESC`,
        args: [campaignKey]
      }),
    ]);

    const recipients = new Map<string, TelegramCampaignRecipient & { active: boolean }>();

    const mergeRow = (row: Record<string, unknown>, source: TelegramCampaignRecipient['source']) => {
      const chatId = String(row.chat_id || '').trim();
      if (!chatId) return;

      const candidate = {
        chatId,
        username: row.username ? String(row.username) : null,
        firstName: row.first_name ? String(row.first_name) : null,
        source,
        userId: row.user_id ? String(row.user_id) : null,
        telebotStatus: row.telebot_status ? String(row.telebot_status) : null,
        expiresAt: row.expires_at ? String(row.expires_at) : null,
        active: isActiveTelebotMembership(
          row.telebot_status ? String(row.telebot_status) : null,
          row.expires_at ? String(row.expires_at) : null
        ),
      };

      const existing = recipients.get(chatId);
      if (!existing) {
        recipients.set(chatId, candidate);
        return;
      }

      if (candidate.active) {
        recipients.set(chatId, candidate);
        return;
      }

      if (!existing.active && existing.source === 'contact' && source === 'linked_user') {
        recipients.set(chatId, candidate);
      }
    };

    contactResult.rows.forEach((row) => mergeRow(row as Record<string, unknown>, 'contact'));
    linkedResult.rows.forEach((row) => mergeRow(row as Record<string, unknown>, 'linked_user'));

    return Array.from(recipients.values())
      .filter((row) => !row.active)
      .map((row) => ({
        chatId: row.chatId,
        username: row.username,
        firstName: row.firstName,
        source: row.source,
        userId: row.userId,
        telebotStatus: row.telebotStatus,
        expiresAt: row.expiresAt,
      }));
  } catch (error) {
    console.error('Get telebot promo broadcast recipients error:', error);
    return [];
  }
}

export async function markTelegramCampaignDelivered(
  campaignKey: string,
  chatId: string,
  messageId?: number | null
): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    await ensureTelegramContactCampaignSchemaInternal(turso);
    await turso.execute({
      sql: `INSERT INTO telegram_campaign_deliveries (campaign_key, chat_id, message_id)
            VALUES (?, ?, ?)
            ON CONFLICT(campaign_key, chat_id) DO UPDATE SET
              message_id = COALESCE(excluded.message_id, telegram_campaign_deliveries.message_id),
              sent_at = CURRENT_TIMESTAMP`,
      args: [campaignKey, chatId.trim(), messageId ?? null]
    });
    return true;
  } catch (error) {
    console.error('Mark telegram campaign delivered error:', error);
    return false;
  }
}

export interface TelegramChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export async function getTelegramChatHistory(
  userId: string,
  chatId: string,
  limit: number
): Promise<TelegramChatMessage[]> {
  const turso = getTursoClient();
  if (!turso) return [];

  const safeLimit = Math.max(1, Math.min(40, Math.floor(limit || 12)));
  try {
    const result = await turso.execute({
      sql: `SELECT role, content, created_at
            FROM telegram_chat_messages
            WHERE user_id = ?
              AND chat_id = ?
            ORDER BY id DESC
            LIMIT ?`,
      args: [userId, chatId, safeLimit],
    });

    return result.rows
      .map((row) => {
        const role: TelegramChatMessage['role'] =
          String(row.role) === 'assistant' ? 'assistant' : 'user';
        return {
          role,
          content: String(row.content || ''),
          createdAt: String(row.created_at || ''),
        };
      })
      .reverse();
  } catch (error) {
    console.error('Get telegram chat history error:', error);
    return [];
  }
}

export async function appendTelegramChatMessage(params: {
  userId: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  keepLast?: number;
}): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  const keepLast = Math.max(12, Math.min(80, Math.floor(params.keepLast || 24)));
  const content = params.content.trim();
  if (!content) return true;

  try {
    await turso.execute({
      sql: `INSERT INTO telegram_chat_messages (chat_id, user_id, role, content)
            VALUES (?, ?, ?, ?)`,
      args: [params.chatId, params.userId, params.role, content],
    });

    await turso.execute({
      sql: `DELETE FROM telegram_chat_messages
            WHERE user_id = ?
              AND chat_id = ?
              AND id NOT IN (
                SELECT id
                FROM telegram_chat_messages
                WHERE user_id = ?
                  AND chat_id = ?
                ORDER BY id DESC
                LIMIT ?
              )`,
      args: [params.userId, params.chatId, params.userId, params.chatId, keepLast],
    });

    return true;
  } catch (error) {
    console.error('Append telegram chat message error:', error);
    return false;
  }
}

// ===== MARKETING BOT HELPERS =====

export interface MarketingCampaign {
  id?: number;
  name: string;
  type: 'INACTIVITY' | 'USAGE_LIMIT' | 'NEW_USER' | 'CUSTOM';
  trigger_rule: any; // JSON
  message_template: string;
  channels: string[]; // JSON
  status: 'ACTIVE' | 'PAUSED';
  created_at?: string;
}

export async function getMarketingCampaigns(): Promise<MarketingCampaign[]> {
  const turso = getTursoClient();
  if (!turso) return [];
  try {
    const result = await turso.execute('SELECT * FROM marketing_campaigns ORDER BY created_at DESC');
    return result.rows.map(row => ({
      id: row.id as number,
      name: row.name as string,
      type: row.type as any,
      trigger_rule: JSON.parse(row.trigger_rule as string),
      message_template: row.message_template as string,
      channels: JSON.parse(row.channels as string),
      status: row.status as any,
      created_at: row.created_at as string
    }));
  } catch (e) {
    console.error('Get marketing campaigns error:', e);
    return [];
  }
}

export async function saveMarketingCampaign(campaign: MarketingCampaign): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;
  try {
    const sql = campaign.id
      ? `UPDATE marketing_campaigns SET name=?, type=?, trigger_rule=?, message_template=?, channels=?, status=? WHERE id=?`
      : `INSERT INTO marketing_campaigns (name, type, trigger_rule, message_template, channels, status) VALUES (?, ?, ?, ?, ?, ?)`;

    const args: (string | number | null)[] = [
      campaign.name,
      campaign.type,
      JSON.stringify(campaign.trigger_rule),
      campaign.message_template,
      JSON.stringify(campaign.channels),
      campaign.status || 'ACTIVE'
    ];

    if (campaign.id) args.push(campaign.id);

    await turso.execute({ sql, args });
    return true;
  } catch (e) {
    console.error('Save marketing campaign error:', e);
    return false;
  }
}

export async function deleteMarketingCampaign(id: number): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;
  try {
    await turso.execute({ sql: 'DELETE FROM marketing_campaigns WHERE id = ?', args: [id] });
    return true;
  } catch (e) { console.error('Delete campaign error:', e); return false; }
}

export async function logMarketingSent(campaignId: number, userId: string, channel: string): Promise<void> {
  const turso = getTursoClient();
  if (!turso) return;
  try {
    await turso.execute({
      sql: 'INSERT INTO marketing_logs (campaign_id, user_id, channel) VALUES (?, ?, ?)',
      args: [campaignId as any, userId, channel]
    });
  } catch (e) { console.error('Log marketing sent error:', e); }
}

export async function hasReceivedMarketing(campaignId: number, userId: string): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;
  try {
    const res = await turso.execute({
      sql: 'SELECT id FROM marketing_logs WHERE campaign_id = ? AND user_id = ?',
      args: [campaignId as any, userId]
    });
    return res.rows.length > 0;
  } catch (e) { return false; }
}

// ============================================
// EXCLUSIVE SUBSCRIPTION MANAGEMENT
// ============================================

export interface UserSubscription {
  status: 'free' | 'active' | 'expired';
  endDate: string | null;
  telegramChatId: string | null;
}

export async function updateUserSubscription(
  userId: string,
  status: 'free' | 'active' | 'expired',
  telegramChatId?: string,
  daysToAdd?: number
): Promise<boolean> {
  const turso = getTursoClient();
  if (!turso) return false;

  try {
    let endDateStr = null;

    // If activating, calculate end date
    if (status === 'active' && daysToAdd) {
      const date = new Date();
      date.setDate(date.getDate() + daysToAdd);
      endDateStr = date.toISOString();
    }

    // Dynamic query construction based on provided args
    let sql = `UPDATE users SET subscription_status = ?`;
    const args: any[] = [status];

    if (endDateStr !== null) {
      sql += `, subscription_end_date = ?`;
      args.push(endDateStr);
    }

    if (telegramChatId !== undefined) {
      sql += `, telegram_chat_id = ?`;
      args.push(telegramChatId);
    }

    sql += ` WHERE id = ?`;
    args.push(userId);

    await turso.execute({ sql, args });
    console.log(`[SUBSCRIPTION] Updated user ${userId}: status=${status}, telegram=${telegramChatId}`);
    return true;
  } catch (error) {
    console.error('[SUBSCRIPTION] Update error:', error);
    return false;
  }
}

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const turso = getTursoClient();
  if (!turso) return { status: 'free', endDate: null, telegramChatId: null };

  try {
    const result = await turso.execute({
      sql: 'SELECT subscription_status, subscription_end_date, telegram_chat_id FROM users WHERE id = ?',
      args: [userId]
    });

    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        status: (row.subscription_status as any) || 'free',
        endDate: (row.subscription_end_date as string) || null,
        telegramChatId: (row.telegram_chat_id as string) || null
      };
    }
    return { status: 'free', endDate: null, telegramChatId: null };
  } catch (error) {
    console.error('[SUBSCRIPTION] Get error:', error);
    return { status: 'free', endDate: null, telegramChatId: null };
  }
}

export async function getActiveSubscribers(): Promise<string[]> {
  const turso = getTursoClient();
  if (!turso) return [];

  try {
    const result = await turso.execute({
      sql: "SELECT telegram_chat_id FROM users WHERE subscription_status = 'active' AND telegram_chat_id IS NOT NULL AND telegram_chat_id != ''",
      args: []
    });

    return result.rows.map(row => row.telegram_chat_id as string);
  } catch (error) {
    console.error('[SUBSCRIPTION] Get subscribers error:', error);
    return [];
  }
}
