import { createClient, SupabaseClient } from '@supabase/supabase-js';

type AnySupabase = SupabaseClient<any, any, any>;

let cachedAdminClient: AnySupabase | null = null;

export function isCopytrade77Configured(): boolean {
  return Boolean(
    process.env.COPYTRADE77_SUPABASE_URL &&
    process.env.COPYTRADE77_SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getCopytrade77AdminClient(): AnySupabase {
  const url = process.env.COPYTRADE77_SUPABASE_URL;
  const serviceRoleKey = process.env.COPYTRADE77_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Copytrade ARRA77 Supabase env is missing. Set COPYTRADE77_SUPABASE_URL and COPYTRADE77_SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }) as AnySupabase;

  return cachedAdminClient;
}
