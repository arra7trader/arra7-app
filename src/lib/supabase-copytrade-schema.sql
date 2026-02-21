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
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE ct_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_signal_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_trade_logs ENABLE ROW LEVEL SECURITY;

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ct_users_email ON ct_users(email);
CREATE INDEX IF NOT EXISTS idx_ct_users_license_key ON ct_users(license_key);
CREATE INDEX IF NOT EXISTS idx_ai_signal_store_created ON ai_signal_store(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_trade_logs_user_id ON ai_trade_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_trade_logs_timestamp ON ai_trade_logs(timestamp DESC);
