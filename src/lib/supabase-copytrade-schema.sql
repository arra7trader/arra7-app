-- ============================================================
-- Supabase Schema for ARRA Copytrade Bridge
-- Run this SQL in your Supabase project SQL Editor
-- Project: https://rmeruvivaoypthwzujav.supabase.co
-- ============================================================

-- USER LICENSES & BALANCES
-- We store a reference to users (by email) so we don't need to replicate
-- the full user table, just the copytrade-relevant fields.
CREATE TABLE IF NOT EXISTS ct_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  license_key TEXT UNIQUE,
  copytrade_balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ct_users_updated_at
  BEFORE UPDATE ON ct_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- AI SIGNAL STORE: Signals pushed by the AI Engine or Admin
CREATE TABLE IF NOT EXISTS ai_signal_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair TEXT NOT NULL,
  type TEXT NOT NULL,         -- e.g. 'BUY', 'SELL'
  entry_price NUMERIC NOT NULL,
  tp NUMERIC NOT NULL,
  sl NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI TRADE LOGS: Execution records reported back by EA clients
CREATE TABLE IF NOT EXISTS ai_trade_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ct_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,       -- 'SUCCESS', 'FAILED'
  profit NUMERIC DEFAULT 0,
  pair TEXT,
  client_trade_id TEXT,
  note TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- TOPUP ORDERS: QRIS invoices for bridge credits
CREATE TABLE IF NOT EXISTS ct_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES ct_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount_idr INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|paid|credited|expired|failed
  payment_provider TEXT NOT NULL DEFAULT 'qris.id',
  provider_reference TEXT,
  paid_amount_idr INTEGER,
  proof_sender TEXT,
  proof_channel TEXT,
  proof_note TEXT,
  proof_image_url TEXT,
  proof_submitted_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  qris_image_url TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER update_ct_topups_updated_at
  BEFORE UPDATE ON ct_topups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backfill for existing databases created with older schema
ALTER TABLE ct_topups ADD COLUMN IF NOT EXISTS paid_amount_idr INTEGER;
ALTER TABLE ct_topups ADD COLUMN IF NOT EXISTS proof_sender TEXT;
ALTER TABLE ct_topups ADD COLUMN IF NOT EXISTS proof_channel TEXT;
ALTER TABLE ct_topups ADD COLUMN IF NOT EXISTS proof_note TEXT;
ALTER TABLE ct_topups ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
ALTER TABLE ct_topups ADD COLUMN IF NOT EXISTS proof_submitted_at TIMESTAMPTZ;
ALTER TABLE ct_topups ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE ct_topups ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE ct_topups ADD COLUMN IF NOT EXISTS review_note TEXT;

-- LEDGER: Immutable balance audit trail
CREATE TABLE IF NOT EXISTS ct_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES ct_users(id) ON DELETE CASCADE,
  order_id TEXT,
  entry_type TEXT NOT NULL, -- topup_qris|trade_execution|admin_adjustment
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  amount INTEGER NOT NULL,
  amount_idr INTEGER,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  note TEXT,
  actor_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ct_ledger_order_entry
  ON ct_ledger(order_id, entry_type)
  WHERE order_id IS NOT NULL;

-- PAYMENT EVENTS: raw webhook event store (idempotency)
CREATE TABLE IF NOT EXISTS ct_payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  order_id TEXT,
  status TEXT,
  amount_idr INTEGER,
  signature TEXT,
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, event_id)
);

-- Enable Row Level Security
ALTER TABLE ct_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_signal_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_trade_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ct_payment_events ENABLE ROW LEVEL SECURITY;

-- POLICIES (Allow service_role to bypass, anon can read specific data)
-- For server-side calls using the service role key, RLS is bypassed.
-- For client-side user reads (optional), add policies here.

-- Allow anon to read signals (the EA reads these)
CREATE POLICY "Allow anon read ai_signal_store"
  ON ai_signal_store FOR SELECT
  USING (true);

-- Allow anon to insert trade logs (sent by EA)
CREATE POLICY "Allow anon insert ai_trade_logs"
  ON ai_trade_logs FOR INSERT
  WITH CHECK (true);

-- Allow anon to insert ai signals (admin API writes these)
CREATE POLICY "Allow anon insert ai_signal_store"
  ON ai_signal_store FOR INSERT
  WITH CHECK (true);

-- Allow anon to read and update ct_users (for validate by license_key)
CREATE POLICY "Allow anon read ct_users by license_key"
  ON ct_users FOR SELECT
  USING (true);

CREATE POLICY "Allow anon update ct_users"
  ON ct_users FOR UPDATE
  USING (true);

CREATE POLICY "Allow anon insert ct_users"
  ON ct_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon read ct_topups"
  ON ct_topups FOR SELECT
  USING (true);

CREATE POLICY "Allow anon insert ct_topups"
  ON ct_topups FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon update ct_topups"
  ON ct_topups FOR UPDATE
  USING (true);

CREATE POLICY "Allow anon read ct_ledger"
  ON ct_ledger FOR SELECT
  USING (true);

CREATE POLICY "Allow anon insert ct_ledger"
  ON ct_ledger FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon read ct_payment_events"
  ON ct_payment_events FOR SELECT
  USING (true);

CREATE POLICY "Allow anon insert ct_payment_events"
  ON ct_payment_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anon update ct_payment_events"
  ON ct_payment_events FOR UPDATE
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ct_users_email ON ct_users(email);
CREATE INDEX IF NOT EXISTS idx_ct_users_license_key ON ct_users(license_key);
CREATE INDEX IF NOT EXISTS idx_ai_signal_store_created ON ai_signal_store(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_trade_logs_user_id ON ai_trade_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_trade_logs_timestamp ON ai_trade_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_trade_logs_client_trade_id ON ai_trade_logs(client_trade_id);
CREATE INDEX IF NOT EXISTS idx_ct_topups_user_id ON ct_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_ct_topups_order_id ON ct_topups(order_id);
CREATE INDEX IF NOT EXISTS idx_ct_topups_status_created ON ct_topups(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ct_topups_reviewed_at ON ct_topups(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ct_ledger_user_created ON ct_ledger(user_id, created_at DESC);
