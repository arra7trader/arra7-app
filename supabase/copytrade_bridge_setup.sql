-- Copytrade Bridge Supabase Setup (Idempotent)
-- Safe to run multiple times in Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.ct_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  license_key text unique,
  copytrade_balance integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists update_ct_users_updated_at on public.ct_users;
create trigger update_ct_users_updated_at
before update on public.ct_users
for each row execute function public.update_updated_at_column();

create table if not exists public.ai_signal_store (
  id uuid primary key default gen_random_uuid(),
  pair text not null,
  type text not null,
  entry_price numeric not null,
  tp numeric not null,
  sl numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_trade_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ct_users(id) on delete cascade,
  status text not null,
  profit numeric not null default 0,
  pair text,
  client_trade_id text,
  note text,
  "timestamp" timestamptz not null default now()
);

-- Backfill legacy schema columns when table already exists with old structure.
alter table public.ai_trade_logs add column if not exists pair text;
alter table public.ai_trade_logs add column if not exists client_trade_id text;
alter table public.ai_trade_logs add column if not exists note text;
alter table public.ai_trade_logs add column if not exists "timestamp" timestamptz;
alter table public.ai_trade_logs alter column "timestamp" set default now();

create table if not exists public.ct_topups (
  id uuid primary key default gen_random_uuid(),
  order_id text unique not null,
  user_id uuid not null references public.ct_users(id) on delete cascade,
  email text not null,
  plan_id text not null,
  credits integer not null,
  amount_idr integer not null,
  status text not null default 'pending', -- pending|paid|credited|expired|failed
  payment_provider text not null default 'qris.id',
  provider_reference text,
  paid_amount_idr integer,
  proof_sender text,
  proof_channel text,
  proof_note text,
  proof_image_url text,
  proof_submitted_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,
  qris_image_url text,
  expires_at timestamptz,
  paid_at timestamptz,
  credited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ct_topups add column if not exists provider_reference text;
alter table public.ct_topups add column if not exists paid_amount_idr integer;
alter table public.ct_topups add column if not exists proof_sender text;
alter table public.ct_topups add column if not exists proof_channel text;
alter table public.ct_topups add column if not exists proof_note text;
alter table public.ct_topups add column if not exists proof_image_url text;
alter table public.ct_topups add column if not exists proof_submitted_at timestamptz;
alter table public.ct_topups add column if not exists reviewed_by text;
alter table public.ct_topups add column if not exists reviewed_at timestamptz;
alter table public.ct_topups add column if not exists review_note text;
alter table public.ct_topups add column if not exists qris_image_url text;
alter table public.ct_topups add column if not exists expires_at timestamptz;
alter table public.ct_topups add column if not exists paid_at timestamptz;
alter table public.ct_topups add column if not exists credited_at timestamptz;
alter table public.ct_topups add column if not exists updated_at timestamptz;
alter table public.ct_topups alter column updated_at set default now();

drop trigger if exists update_ct_topups_updated_at on public.ct_topups;
create trigger update_ct_topups_updated_at
before update on public.ct_topups
for each row execute function public.update_updated_at_column();

create table if not exists public.ct_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ct_users(id) on delete cascade,
  order_id text,
  entry_type text not null, -- topup_qris|trade_execution|admin_adjustment
  direction text not null check (direction in ('credit', 'debit')),
  amount integer not null,
  amount_idr integer,
  balance_before integer not null,
  balance_after integer not null,
  note text,
  actor_email text,
  created_at timestamptz not null default now()
);

alter table public.ct_ledger add column if not exists amount_idr integer;
alter table public.ct_ledger add column if not exists note text;
alter table public.ct_ledger add column if not exists actor_email text;

create table if not exists public.ct_payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  order_id text,
  status text,
  amount_idr integer,
  signature text,
  payload jsonb,
  processed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(provider, event_id)
);

alter table public.ct_payment_events add column if not exists signature text;
alter table public.ct_payment_events add column if not exists payload jsonb;
alter table public.ct_payment_events add column if not exists processed boolean;
alter table public.ct_payment_events alter column processed set default false;

create unique index if not exists idx_ct_ledger_order_entry
  on public.ct_ledger(order_id, entry_type)
  where order_id is not null;

create index if not exists idx_ct_users_email on public.ct_users(email);
create index if not exists idx_ct_users_license_key on public.ct_users(license_key);
create index if not exists idx_ai_signal_store_created on public.ai_signal_store(created_at desc);
create index if not exists idx_ai_trade_logs_user_id on public.ai_trade_logs(user_id);
create index if not exists idx_ai_trade_logs_timestamp on public.ai_trade_logs("timestamp" desc);
create index if not exists idx_ai_trade_logs_client_trade_id on public.ai_trade_logs(client_trade_id);
create index if not exists idx_ct_topups_user_id on public.ct_topups(user_id);
create index if not exists idx_ct_topups_order_id on public.ct_topups(order_id);
create index if not exists idx_ct_topups_status_created on public.ct_topups(status, created_at desc);
create index if not exists idx_ct_topups_reviewed_at on public.ct_topups(reviewed_at desc);
create index if not exists idx_ct_ledger_user_created on public.ct_ledger(user_id, created_at desc);

alter table public.ct_users enable row level security;
alter table public.ai_signal_store enable row level security;
alter table public.ai_trade_logs enable row level security;
alter table public.ct_topups enable row level security;
alter table public.ct_ledger enable row level security;
alter table public.ct_payment_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_signal_store' and policyname = 'Allow anon read ai_signal_store'
  ) then
    create policy "Allow anon read ai_signal_store"
      on public.ai_signal_store for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_trade_logs' and policyname = 'Allow anon insert ai_trade_logs'
  ) then
    create policy "Allow anon insert ai_trade_logs"
      on public.ai_trade_logs for insert with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_signal_store' and policyname = 'Allow anon insert ai_signal_store'
  ) then
    create policy "Allow anon insert ai_signal_store"
      on public.ai_signal_store for insert with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_users' and policyname = 'Allow anon read ct_users by license_key'
  ) then
    create policy "Allow anon read ct_users by license_key"
      on public.ct_users for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_users' and policyname = 'Allow anon update ct_users'
  ) then
    create policy "Allow anon update ct_users"
      on public.ct_users for update using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_users' and policyname = 'Allow anon insert ct_users'
  ) then
    create policy "Allow anon insert ct_users"
      on public.ct_users for insert with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_topups' and policyname = 'Allow anon read ct_topups'
  ) then
    create policy "Allow anon read ct_topups"
      on public.ct_topups for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_topups' and policyname = 'Allow anon insert ct_topups'
  ) then
    create policy "Allow anon insert ct_topups"
      on public.ct_topups for insert with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_topups' and policyname = 'Allow anon update ct_topups'
  ) then
    create policy "Allow anon update ct_topups"
      on public.ct_topups for update using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_ledger' and policyname = 'Allow anon read ct_ledger'
  ) then
    create policy "Allow anon read ct_ledger"
      on public.ct_ledger for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_ledger' and policyname = 'Allow anon insert ct_ledger'
  ) then
    create policy "Allow anon insert ct_ledger"
      on public.ct_ledger for insert with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_payment_events' and policyname = 'Allow anon read ct_payment_events'
  ) then
    create policy "Allow anon read ct_payment_events"
      on public.ct_payment_events for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_payment_events' and policyname = 'Allow anon insert ct_payment_events'
  ) then
    create policy "Allow anon insert ct_payment_events"
      on public.ct_payment_events for insert with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ct_payment_events' and policyname = 'Allow anon update ct_payment_events'
  ) then
    create policy "Allow anon update ct_payment_events"
      on public.ct_payment_events for update using (true);
  end if;
end $$;

-- Quick verification
select
  (select count(*) from information_schema.tables where table_schema='public' and table_name='ct_users') as has_ct_users,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='ct_topups') as has_ct_topups,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='ct_ledger') as has_ct_ledger,
  (select count(*) from information_schema.tables where table_schema='public' and table_name='ct_payment_events') as has_ct_payment_events;
