-- Copytrade ARRA77 Schema (Supabase / Postgres)
-- Version: v1 draft
-- Notes:
-- 1) Dedicated schema for copytrade module
-- 2) Event-driven architecture, no cron dependency
-- 3) Immutable wallet ledger + idempotent settlement functions

create extension if not exists pgcrypto;

create schema if not exists copytrade77;

-- =========================================================
-- Core Tables
-- =========================================================

create table if not exists copytrade77.profiles (
  id uuid primary key default gen_random_uuid(),
  app_user_id text not null unique,
  email text not null unique,
  display_name text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'BLOCKED')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists copytrade77.wallets (
  profile_id uuid primary key references copytrade77.profiles(id) on delete cascade,
  balance_credits integer not null default 0 check (balance_credits >= 0),
  total_topup_credits integer not null default 0 check (total_topup_credits >= 0),
  total_spent_credits integer not null default 0 check (total_spent_credits >= 0),
  total_earned_credits integer not null default 0 check (total_earned_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists copytrade77.providers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references copytrade77.profiles(id) on delete cascade,
  display_name text not null,
  slug text not null unique,
  bio text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')),
  risk_level text not null default 'MEDIUM' check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  revenue_share_admin_credits integer not null default 1 check (revenue_share_admin_credits >= 0),
  revenue_share_provider_credits integer not null default 2 check (revenue_share_provider_credits >= 0),
  approved_by_profile_id uuid references copytrade77.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists copytrade77.provider_challenges (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null unique references copytrade77.providers(id) on delete cascade,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'PASSED', 'FAILED')),
  target_trades integer not null default 50 check (target_trades > 0),
  min_win_rate_pct numeric(5,2) not null default 60 check (min_win_rate_pct >= 0 and min_win_rate_pct <= 100),
  total_trades integer not null default 0 check (total_trades >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  breakeven_count integer not null default 0 check (breakeven_count >= 0),
  win_rate_pct numeric(5,2) not null default 0 check (win_rate_pct >= 0 and win_rate_pct <= 100),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_trade_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists copytrade77.provider_challenge_trades (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references copytrade77.provider_challenges(id) on delete cascade,
  provider_id uuid not null references copytrade77.providers(id) on delete cascade,
  terminal_id uuid references copytrade77.bridge_terminals(id) on delete set null,
  external_trade_id text not null,
  symbol text not null,
  side text check (side in ('BUY', 'SELL')),
  volume_lots numeric(10,2),
  entry_price numeric(18,8),
  close_price numeric(18,8),
  opened_at timestamptz,
  closed_at timestamptz not null default now(),
  pips_result numeric(12,4),
  pnl_value numeric(18,2),
  result text not null check (result in ('WIN', 'LOSS', 'BE')),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider_id, external_trade_id)
);

create table if not exists copytrade77.follow_relations (
  id uuid primary key default gen_random_uuid(),
  follower_profile_id uuid not null references copytrade77.profiles(id) on delete cascade,
  provider_id uuid not null references copytrade77.providers(id) on delete cascade,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'STOPPED')),
  risk_mode text not null default 'FIXED_LOT' check (risk_mode in ('FIXED_LOT', 'MULTIPLIER', 'RISK_PERCENT')),
  fixed_lot numeric(10,2) not null default 0.01 check (fixed_lot > 0),
  lot_multiplier numeric(10,4) not null default 1.0000 check (lot_multiplier > 0),
  risk_percent numeric(6,3) not null default 1.000 check (risk_percent > 0),
  max_concurrent_positions integer not null default 1 check (max_concurrent_positions >= 1),
  one_trade_at_a_time boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (follower_profile_id, provider_id)
);

create table if not exists copytrade77.bridge_terminals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references copytrade77.profiles(id) on delete cascade,
  follow_id uuid references copytrade77.follow_relations(id) on delete set null,
  terminal_label text not null,
  mt5_login text,
  broker_name text,
  server_name text,
  symbol text,
  timeframe text,
  bridge_key text not null unique,
  bridge_secret text not null,
  status text not null default 'OFFLINE' check (status in ('ONLINE', 'OFFLINE', 'BLOCKED')),
  last_heartbeat_at timestamptz,
  last_seen_ip text,
  last_seen_version text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists copytrade77.bridge_nonces (
  id bigint generated always as identity primary key,
  bridge_key text not null,
  nonce text not null,
  ts bigint not null,
  created_at timestamptz not null default now(),
  unique (bridge_key, nonce)
);

create table if not exists copytrade77.topup_orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references copytrade77.profiles(id) on delete cascade,
  amount_idr integer not null check (amount_idr > 0),
  credit_amount integer not null check (credit_amount > 0),
  rate_idr_per_credit integer not null default 1000 check (rate_idr_per_credit > 0),
  payment_channel text not null default 'QRIS_MANUAL',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
  proof_image_url text,
  proof_note text,
  admin_note text,
  approved_by_profile_id uuid references copytrade77.profiles(id),
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists copytrade77.signals (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references copytrade77.providers(id) on delete cascade,
  source text not null default 'ARRA_AI' check (source in ('ARRA_AI', 'PROVIDER_MANUAL', 'ADMIN_MANUAL')),
  source_ref text,
  symbol text not null,
  timeframe text not null,
  side text not null check (side in ('BUY', 'SELL')),
  order_type text not null default 'MARKET' check (order_type in ('MARKET', 'BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP')),
  entry_price numeric(18,8) not null,
  stop_loss numeric(18,8) not null,
  take_profit_1 numeric(18,8) not null,
  take_profit_2 numeric(18,8),
  take_profit_3 numeric(18,8),
  min_stop_distance_pips integer not null default 70 check (min_stop_distance_pips > 0),
  confidence numeric(5,2),
  raw_analysis jsonb not null default '{}'::jsonb,
  status text not null default 'PUBLISHED' check (status in ('DRAFT', 'PUBLISHED', 'EXPIRED', 'CANCELLED', 'COMPLETED')),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_by_profile_id uuid references copytrade77.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ct77_signal_structure_check check (
    (side = 'BUY' and stop_loss < entry_price and take_profit_1 > entry_price) or
    (side = 'SELL' and stop_loss > entry_price and take_profit_1 < entry_price)
  )
);

create table if not exists copytrade77.signal_dispatches (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references copytrade77.signals(id) on delete cascade,
  follow_id uuid not null references copytrade77.follow_relations(id) on delete cascade,
  terminal_id uuid not null references copytrade77.bridge_terminals(id) on delete cascade,
  status text not null default 'QUEUED' check (status in ('QUEUED', 'SENT', 'ACKED', 'EXECUTED', 'REJECTED', 'SKIPPED', 'EXPIRED')),
  skip_reason text,
  error_message text,
  mt5_ticket bigint,
  execution_price numeric(18,8),
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  acked_at timestamptz,
  executed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (signal_id, terminal_id)
);

create table if not exists copytrade77.positions (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null unique references copytrade77.signal_dispatches(id) on delete cascade,
  signal_id uuid not null references copytrade77.signals(id) on delete cascade,
  follower_profile_id uuid not null references copytrade77.profiles(id) on delete cascade,
  provider_id uuid not null references copytrade77.providers(id) on delete cascade,
  terminal_id uuid not null references copytrade77.bridge_terminals(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('BUY', 'SELL')),
  volume_lots numeric(10,2) not null check (volume_lots > 0),
  entry_price numeric(18,8) not null,
  stop_loss numeric(18,8),
  take_profit numeric(18,8),
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED_TP', 'CLOSED_SL', 'CLOSED_MANUAL', 'CLOSED_ERROR')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  close_price numeric(18,8),
  pips_result numeric(12,4),
  pnl_value numeric(18,2),
  close_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists copytrade77.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references copytrade77.profiles(id) on delete cascade,
  direction text not null check (direction in ('CREDIT', 'DEBIT')),
  amount_credits integer not null check (amount_credits > 0),
  balance_before integer not null check (balance_before >= 0),
  balance_after integer not null check (balance_after >= 0),
  entry_type text not null check (entry_type in (
    'TOPUP_APPROVED',
    'SIGNAL_EXECUTION_COST',
    'PROVIDER_REVENUE',
    'ADMIN_REVENUE',
    'ADMIN_ADJUSTMENT',
    'REFUND',
    'REVERSAL'
  )),
  reference_table text,
  reference_id uuid,
  description text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists copytrade77.bridge_logs (
  id bigint generated always as identity primary key,
  terminal_id uuid references copytrade77.bridge_terminals(id) on delete cascade,
  level text not null default 'INFO' check (level in ('DEBUG', 'INFO', 'WARN', 'ERROR')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists copytrade77.events (
  id bigint generated always as identity primary key,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists copytrade77.system_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- Defaults
-- =========================================================

insert into copytrade77.system_config(key, value)
values
  ('pricing', '{"credit_value_idr":1000,"signal_cost_credits":3,"admin_share_credits":1,"provider_share_credits":2}'::jsonb),
  ('risk', '{"min_sl_pips":70,"enforce_one_trade_lock":true,"signal_expiry_minutes":30}'::jsonb),
  ('bridge', '{"poll_interval_seconds":3,"heartbeat_timeout_seconds":30,"max_skew_seconds":60}'::jsonb)
on conflict (key) do nothing;

-- =========================================================
-- Indexes
-- =========================================================

create index if not exists idx_ct77_follow_provider_status on copytrade77.follow_relations(provider_id, status);
create index if not exists idx_ct77_follow_follower_status on copytrade77.follow_relations(follower_profile_id, status);
create index if not exists idx_ct77_provider_challenge_status on copytrade77.provider_challenges(status, updated_at desc);
create index if not exists idx_ct77_provider_challenge_trade_provider_closed on copytrade77.provider_challenge_trades(provider_id, closed_at desc);
create index if not exists idx_ct77_terminals_profile_status on copytrade77.bridge_terminals(profile_id, status);
create index if not exists idx_ct77_terminals_heartbeat on copytrade77.bridge_terminals(last_heartbeat_at desc);
create index if not exists idx_ct77_bridge_nonces_created on copytrade77.bridge_nonces(created_at desc);
create index if not exists idx_ct77_topup_status_created on copytrade77.topup_orders(status, created_at desc);
create index if not exists idx_ct77_signals_provider_status on copytrade77.signals(provider_id, status, created_at desc);
create index if not exists idx_ct77_signals_symbol_tf on copytrade77.signals(symbol, timeframe, created_at desc);
create index if not exists idx_ct77_dispatch_terminal_status on copytrade77.signal_dispatches(terminal_id, status, created_at desc);
create index if not exists idx_ct77_dispatch_follow_status on copytrade77.signal_dispatches(follow_id, status, created_at desc);
create index if not exists idx_ct77_positions_follower_status on copytrade77.positions(follower_profile_id, status, opened_at desc);
create index if not exists idx_ct77_positions_provider_status on copytrade77.positions(provider_id, status, opened_at desc);
create index if not exists idx_ct77_wallet_ledger_profile_created on copytrade77.wallet_ledger(profile_id, created_at desc);

-- =========================================================
-- Updated-at trigger helpers
-- =========================================================

create or replace function copytrade77.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_ct77_profiles_updated_at') then
    create trigger trg_ct77_profiles_updated_at before update on copytrade77.profiles
      for each row execute procedure copytrade77.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_ct77_wallets_updated_at') then
    create trigger trg_ct77_wallets_updated_at before update on copytrade77.wallets
      for each row execute procedure copytrade77.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_ct77_providers_updated_at') then
    create trigger trg_ct77_providers_updated_at before update on copytrade77.providers
      for each row execute procedure copytrade77.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_ct77_provider_challenge_updated_at') then
    create trigger trg_ct77_provider_challenge_updated_at before update on copytrade77.provider_challenges
      for each row execute procedure copytrade77.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_ct77_follow_updated_at') then
    create trigger trg_ct77_follow_updated_at before update on copytrade77.follow_relations
      for each row execute procedure copytrade77.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_ct77_terminal_updated_at') then
    create trigger trg_ct77_terminal_updated_at before update on copytrade77.bridge_terminals
      for each row execute procedure copytrade77.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_ct77_topup_updated_at') then
    create trigger trg_ct77_topup_updated_at before update on copytrade77.topup_orders
      for each row execute procedure copytrade77.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_ct77_signals_updated_at') then
    create trigger trg_ct77_signals_updated_at before update on copytrade77.signals
      for each row execute procedure copytrade77.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_ct77_dispatch_updated_at') then
    create trigger trg_ct77_dispatch_updated_at before update on copytrade77.signal_dispatches
      for each row execute procedure copytrade77.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_ct77_positions_updated_at') then
    create trigger trg_ct77_positions_updated_at before update on copytrade77.positions
      for each row execute procedure copytrade77.set_updated_at();
  end if;
end $$;

-- =========================================================
-- Wallet functions (idempotent)
-- =========================================================

create or replace function copytrade77.ensure_wallet(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = copytrade77, public
as $$
begin
  insert into copytrade77.wallets(profile_id)
  values (p_profile_id)
  on conflict (profile_id) do nothing;
end;
$$;

create or replace function copytrade77.adjust_wallet(
  p_profile_id uuid,
  p_direction text,
  p_amount_credits integer,
  p_entry_type text,
  p_reference_table text default null,
  p_reference_id uuid default null,
  p_description text default null,
  p_idempotency_key text default null
)
returns integer
language plpgsql
security definer
set search_path = copytrade77, public
as $$
declare
  v_before integer;
  v_after integer;
  v_existing integer;
begin
  if p_direction not in ('CREDIT', 'DEBIT') then
    raise exception 'INVALID_DIRECTION';
  end if;

  if p_amount_credits is null or p_amount_credits <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_idempotency_key is not null then
    select balance_after into v_existing
    from copytrade77.wallet_ledger
    where idempotency_key = p_idempotency_key;

    if found then
      return v_existing;
    end if;
  end if;

  perform copytrade77.ensure_wallet(p_profile_id);

  select balance_credits
  into v_before
  from copytrade77.wallets
  where profile_id = p_profile_id
  for update;

  if p_direction = 'DEBIT' and v_before < p_amount_credits then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  if p_direction = 'CREDIT' then
    v_after := v_before + p_amount_credits;
  else
    v_after := v_before - p_amount_credits;
  end if;

  update copytrade77.wallets
  set
    balance_credits = v_after,
    total_topup_credits = total_topup_credits + case when p_entry_type = 'TOPUP_APPROVED' and p_direction = 'CREDIT' then p_amount_credits else 0 end,
    total_spent_credits = total_spent_credits + case when p_direction = 'DEBIT' then p_amount_credits else 0 end,
    total_earned_credits = total_earned_credits + case when p_entry_type in ('PROVIDER_REVENUE', 'ADMIN_REVENUE') and p_direction = 'CREDIT' then p_amount_credits else 0 end
  where profile_id = p_profile_id;

  insert into copytrade77.wallet_ledger(
    profile_id,
    direction,
    amount_credits,
    balance_before,
    balance_after,
    entry_type,
    reference_table,
    reference_id,
    description,
    idempotency_key
  )
  values (
    p_profile_id,
    p_direction,
    p_amount_credits,
    v_before,
    v_after,
    p_entry_type,
    p_reference_table,
    p_reference_id,
    p_description,
    p_idempotency_key
  );

  return v_after;
end;
$$;

-- =========================================================
-- Approval & Settlement functions
-- =========================================================

create or replace function copytrade77.approve_topup_order(
  p_order_id uuid,
  p_admin_profile_id uuid,
  p_idempotency_key text default null
)
returns integer
language plpgsql
security definer
set search_path = copytrade77, public
as $$
declare
  v_order copytrade77.topup_orders%rowtype;
  v_balance integer;
  v_idempotency text;
begin
  select * into v_order
  from copytrade77.topup_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'TOPUP_NOT_FOUND';
  end if;

  if v_order.status = 'APPROVED' then
    select balance_credits into v_balance from copytrade77.wallets where profile_id = v_order.profile_id;
    return coalesce(v_balance, 0);
  end if;

  if v_order.status not in ('SUBMITTED', 'DRAFT') then
    raise exception 'TOPUP_STATUS_INVALID';
  end if;

  v_idempotency := coalesce(p_idempotency_key, 'topup-approve-' || p_order_id::text);

  v_balance := copytrade77.adjust_wallet(
    v_order.profile_id,
    'CREDIT',
    v_order.credit_amount,
    'TOPUP_APPROVED',
    'topup_orders',
    p_order_id,
    'Topup approved by admin',
    v_idempotency
  );

  update copytrade77.topup_orders
  set
    status = 'APPROVED',
    approved_by_profile_id = p_admin_profile_id,
    approved_at = now()
  where id = p_order_id;

  insert into copytrade77.events(event_type, aggregate_type, aggregate_id, payload)
  values (
    'TOPUP_APPROVED',
    'topup_orders',
    p_order_id::text,
    jsonb_build_object(
      'profile_id', v_order.profile_id,
      'credit_amount', v_order.credit_amount,
      'approved_by', p_admin_profile_id
    )
  );

  return v_balance;
end;
$$;

create or replace function copytrade77.apply_signal_execution(
  p_dispatch_id uuid,
  p_terminal_id uuid,
  p_mt5_ticket bigint,
  p_execution_price numeric,
  p_volume_lots numeric,
  p_admin_profile_id uuid,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = copytrade77, public
as $$
declare
  v_dispatch copytrade77.signal_dispatches%rowtype;
  v_follow copytrade77.follow_relations%rowtype;
  v_signal copytrade77.signals%rowtype;
  v_provider copytrade77.providers%rowtype;
  v_position_id uuid;
  v_pricing jsonb;
  v_signal_cost integer := 3;
  v_admin_share integer := 1;
  v_provider_share integer := 2;
  v_exec_key text;
  v_lock_enabled boolean := true;
  v_open_exists boolean := false;
begin
  if p_volume_lots is null or p_volume_lots <= 0 then
    raise exception 'INVALID_VOLUME';
  end if;

  select * into v_dispatch
  from copytrade77.signal_dispatches
  where id = p_dispatch_id and terminal_id = p_terminal_id
  for update;

  if not found then
    raise exception 'DISPATCH_NOT_FOUND';
  end if;

  if v_dispatch.status = 'EXECUTED' then
    select id into v_position_id from copytrade77.positions where dispatch_id = p_dispatch_id;
    return v_position_id;
  end if;

  if v_dispatch.status not in ('QUEUED', 'SENT', 'ACKED') then
    raise exception 'DISPATCH_STATUS_INVALID';
  end if;

  select * into v_follow from copytrade77.follow_relations where id = v_dispatch.follow_id;
  select * into v_signal from copytrade77.signals where id = v_dispatch.signal_id;
  select * into v_provider from copytrade77.providers where id = v_signal.provider_id;

  if v_follow.status <> 'ACTIVE' then
    raise exception 'FOLLOW_NOT_ACTIVE';
  end if;

  select value into v_pricing from copytrade77.system_config where key = 'pricing';
  if v_pricing is not null then
    v_signal_cost := coalesce((v_pricing->>'signal_cost_credits')::integer, v_signal_cost);
    v_admin_share := coalesce((v_pricing->>'admin_share_credits')::integer, v_admin_share);
    v_provider_share := coalesce((v_pricing->>'provider_share_credits')::integer, v_provider_share);
  end if;

  select value->>'enforce_one_trade_lock' into strict v_lock_enabled
  from copytrade77.system_config
  where key = 'risk';

  if coalesce(v_lock_enabled, true) and v_follow.one_trade_at_a_time then
    select exists(
      select 1
      from copytrade77.positions p
      where p.follower_profile_id = v_follow.follower_profile_id
        and p.status = 'OPEN'
    ) into v_open_exists;

    if v_open_exists then
      raise exception 'ONE_TRADE_LOCK_ACTIVE';
    end if;
  end if;

  v_exec_key := coalesce(p_idempotency_key, 'dispatch-exec-' || p_dispatch_id::text);

  perform copytrade77.adjust_wallet(
    v_follow.follower_profile_id,
    'DEBIT',
    v_signal_cost,
    'SIGNAL_EXECUTION_COST',
    'signal_dispatches',
    p_dispatch_id,
    'Credit deduction for executed signal',
    v_exec_key || '-debit'
  );

  perform copytrade77.adjust_wallet(
    v_provider.profile_id,
    'CREDIT',
    v_provider_share,
    'PROVIDER_REVENUE',
    'signal_dispatches',
    p_dispatch_id,
    'Provider revenue share from executed signal',
    v_exec_key || '-provider'
  );

  perform copytrade77.adjust_wallet(
    p_admin_profile_id,
    'CREDIT',
    v_admin_share,
    'ADMIN_REVENUE',
    'signal_dispatches',
    p_dispatch_id,
    'Admin revenue share from executed signal',
    v_exec_key || '-admin'
  );

  update copytrade77.signal_dispatches
  set
    status = 'EXECUTED',
    mt5_ticket = p_mt5_ticket,
    execution_price = p_execution_price,
    executed_at = now()
  where id = p_dispatch_id;

  insert into copytrade77.positions(
    dispatch_id,
    signal_id,
    follower_profile_id,
    provider_id,
    terminal_id,
    symbol,
    side,
    volume_lots,
    entry_price,
    stop_loss,
    take_profit
  )
  values (
    p_dispatch_id,
    v_signal.id,
    v_follow.follower_profile_id,
    v_provider.id,
    p_terminal_id,
    v_signal.symbol,
    v_signal.side,
    p_volume_lots,
    p_execution_price,
    v_signal.stop_loss,
    v_signal.take_profit_1
  )
  returning id into v_position_id;

  insert into copytrade77.events(event_type, aggregate_type, aggregate_id, payload)
  values (
    'SIGNAL_EXECUTED',
    'signal_dispatches',
    p_dispatch_id::text,
    jsonb_build_object(
      'signal_id', v_signal.id,
      'position_id', v_position_id,
      'follower_profile_id', v_follow.follower_profile_id,
      'provider_id', v_provider.id,
      'mt5_ticket', p_mt5_ticket,
      'execution_price', p_execution_price
    )
  );

  return v_position_id;
end;
$$;

create or replace function copytrade77.close_position(
  p_position_id uuid,
  p_close_reason text,
  p_close_price numeric,
  p_pips_result numeric,
  p_pnl_value numeric,
  p_closed_at timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = copytrade77, public
as $$
declare
  v_position copytrade77.positions%rowtype;
  v_dispatch_id uuid;
  v_status text;
begin
  select * into v_position
  from copytrade77.positions
  where id = p_position_id
  for update;

  if not found then
    raise exception 'POSITION_NOT_FOUND';
  end if;

  if v_position.status <> 'OPEN' then
    return;
  end if;

  v_status := case
    when upper(p_close_reason) = 'TP' then 'CLOSED_TP'
    when upper(p_close_reason) = 'SL' then 'CLOSED_SL'
    when upper(p_close_reason) = 'MANUAL' then 'CLOSED_MANUAL'
    else 'CLOSED_ERROR'
  end;

  update copytrade77.positions
  set
    status = v_status,
    closed_at = p_closed_at,
    close_price = p_close_price,
    pips_result = p_pips_result,
    pnl_value = p_pnl_value,
    close_reason = p_close_reason
  where id = p_position_id;

  v_dispatch_id := v_position.dispatch_id;
  update copytrade77.signal_dispatches
  set closed_at = p_closed_at
  where id = v_dispatch_id;

  insert into copytrade77.events(event_type, aggregate_type, aggregate_id, payload)
  values (
    'POSITION_CLOSED',
    'positions',
    p_position_id::text,
    jsonb_build_object(
      'dispatch_id', v_dispatch_id,
      'status', v_status,
      'close_reason', p_close_reason,
      'close_price', p_close_price,
      'pips_result', p_pips_result,
      'pnl_value', p_pnl_value
    )
  );
end;
$$;

-- =========================================================
-- Views
-- =========================================================

create or replace view copytrade77.provider_stats as
select
  p.id as provider_id,
  p.display_name,
  count(pos.id) as total_closed_positions,
  count(*) filter (where pos.status = 'CLOSED_TP') as tp_hits,
  count(*) filter (where pos.status = 'CLOSED_SL') as sl_hits,
  round(
    case
      when count(pos.id) = 0 then 0
      else (count(*) filter (where pos.status = 'CLOSED_TP')::numeric / count(pos.id)::numeric) * 100
    end, 2
  ) as win_rate_pct,
  coalesce(sum(pos.pips_result), 0) as total_pips
from copytrade77.providers p
left join copytrade77.positions pos
  on pos.provider_id = p.id
  and pos.status in ('CLOSED_TP', 'CLOSED_SL', 'CLOSED_MANUAL', 'CLOSED_ERROR')
group by p.id, p.display_name;

create or replace view copytrade77.provider_revenue_stats as
select
  p.id as provider_id,
  p.profile_id,
  coalesce(sum(wl.amount_credits), 0)::integer as total_provider_revenue_credits,
  max(wl.created_at) as last_provider_revenue_at
from copytrade77.providers p
left join copytrade77.wallet_ledger wl
  on wl.profile_id = p.profile_id
  and wl.direction = 'CREDIT'
  and wl.entry_type = 'PROVIDER_REVENUE'
group by p.id, p.profile_id;

-- =========================================================
-- RLS Baseline (deny by default, server uses service role)
-- =========================================================

alter table copytrade77.profiles enable row level security;
alter table copytrade77.wallets enable row level security;
alter table copytrade77.providers enable row level security;
alter table copytrade77.provider_challenges enable row level security;
alter table copytrade77.provider_challenge_trades enable row level security;
alter table copytrade77.follow_relations enable row level security;
alter table copytrade77.bridge_terminals enable row level security;
alter table copytrade77.topup_orders enable row level security;
alter table copytrade77.signals enable row level security;
alter table copytrade77.signal_dispatches enable row level security;
alter table copytrade77.positions enable row level security;
alter table copytrade77.wallet_ledger enable row level security;
alter table copytrade77.bridge_logs enable row level security;
alter table copytrade77.bridge_nonces enable row level security;
alter table copytrade77.events enable row level security;
alter table copytrade77.system_config enable row level security;

drop policy if exists ct77_profiles_deny_all on copytrade77.profiles;
create policy ct77_profiles_deny_all on copytrade77.profiles for all using (false) with check (false);

drop policy if exists ct77_wallets_deny_all on copytrade77.wallets;
create policy ct77_wallets_deny_all on copytrade77.wallets for all using (false) with check (false);

drop policy if exists ct77_providers_deny_all on copytrade77.providers;
create policy ct77_providers_deny_all on copytrade77.providers for all using (false) with check (false);

drop policy if exists ct77_provider_challenges_deny_all on copytrade77.provider_challenges;
create policy ct77_provider_challenges_deny_all on copytrade77.provider_challenges for all using (false) with check (false);

drop policy if exists ct77_provider_challenge_trades_deny_all on copytrade77.provider_challenge_trades;
create policy ct77_provider_challenge_trades_deny_all on copytrade77.provider_challenge_trades for all using (false) with check (false);

drop policy if exists ct77_follow_deny_all on copytrade77.follow_relations;
create policy ct77_follow_deny_all on copytrade77.follow_relations for all using (false) with check (false);

drop policy if exists ct77_terminals_deny_all on copytrade77.bridge_terminals;
create policy ct77_terminals_deny_all on copytrade77.bridge_terminals for all using (false) with check (false);

drop policy if exists ct77_topups_deny_all on copytrade77.topup_orders;
create policy ct77_topups_deny_all on copytrade77.topup_orders for all using (false) with check (false);

drop policy if exists ct77_signals_deny_all on copytrade77.signals;
create policy ct77_signals_deny_all on copytrade77.signals for all using (false) with check (false);

drop policy if exists ct77_dispatch_deny_all on copytrade77.signal_dispatches;
create policy ct77_dispatch_deny_all on copytrade77.signal_dispatches for all using (false) with check (false);

drop policy if exists ct77_positions_deny_all on copytrade77.positions;
create policy ct77_positions_deny_all on copytrade77.positions for all using (false) with check (false);

drop policy if exists ct77_wallet_ledger_deny_all on copytrade77.wallet_ledger;
create policy ct77_wallet_ledger_deny_all on copytrade77.wallet_ledger for all using (false) with check (false);

drop policy if exists ct77_bridge_logs_deny_all on copytrade77.bridge_logs;
create policy ct77_bridge_logs_deny_all on copytrade77.bridge_logs for all using (false) with check (false);

drop policy if exists ct77_bridge_nonces_deny_all on copytrade77.bridge_nonces;
create policy ct77_bridge_nonces_deny_all on copytrade77.bridge_nonces for all using (false) with check (false);

drop policy if exists ct77_events_deny_all on copytrade77.events;
create policy ct77_events_deny_all on copytrade77.events for all using (false) with check (false);

drop policy if exists ct77_system_config_deny_all on copytrade77.system_config;
create policy ct77_system_config_deny_all on copytrade77.system_config for all using (false) with check (false);
