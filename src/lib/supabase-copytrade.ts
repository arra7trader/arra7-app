import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.COPYTRADE_SUPABASE_URL!;
const supabaseAnonKey = process.env.COPYTRADE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase Copytrade env vars: COPYTRADE_SUPABASE_URL and COPYTRADE_SUPABASE_ANON_KEY');
}

// Dedicated Supabase client for the Copytrade feature
export const copytradeSupabase = createClient(supabaseUrl, supabaseAnonKey);
