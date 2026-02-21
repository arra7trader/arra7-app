import { createClient } from '@supabase/supabase-js';

// Fallback to placeholder during Vercel build if env vars aren't set yet.
// This prevents Next.js from crashing with "Missing Supabase Copytrade env vars" during npm run build.
const supabaseUrl = process.env.COPYTRADE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.COPYTRADE_SUPABASE_ANON_KEY || 'placeholder';

// Dedicated Supabase client for the Copytrade feature
export const copytradeSupabase = createClient(supabaseUrl, supabaseAnonKey);
