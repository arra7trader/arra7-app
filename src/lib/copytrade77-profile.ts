import { isAdminEmail } from '@/lib/admin-access';
import { getCopytrade77AdminClient } from '@/lib/supabase-copytrade77';

export interface Copytrade77Profile {
  id: string;
  app_user_id: string;
  email: string;
  display_name: string | null;
  status: 'ACTIVE' | 'BLOCKED';
  is_admin: boolean;
}

interface EnsureProfileInput {
  appUserId: string;
  email: string;
  displayName?: string | null;
}

export async function ensureCopytrade77Profile(input: EnsureProfileInput): Promise<Copytrade77Profile> {
  const supabase = getCopytrade77AdminClient();
  const schema = supabase.schema('copytrade77');

  const email = input.email.trim().toLowerCase();
  const isAdmin = isAdminEmail(email);

  const { error: upsertError } = await schema.from('profiles').upsert(
    {
      app_user_id: input.appUserId,
      email,
      display_name: input.displayName || email,
      is_admin: isAdmin,
    },
    { onConflict: 'app_user_id' }
  );

  if (upsertError) {
    throw upsertError;
  }

  const { data: profile, error: fetchError } = await schema
    .from('profiles')
    .select('id, app_user_id, email, display_name, status, is_admin')
    .eq('app_user_id', input.appUserId)
    .single();

  if (fetchError || !profile) {
    throw fetchError || new Error('Failed to load copytrade profile.');
  }

  const { error: walletEnsureError } = await schema.rpc('ensure_wallet', {
    p_profile_id: profile.id,
  });

  if (walletEnsureError) {
    // Do not block profile provisioning on wallet initialization issue
    console.error('[CT77] ensure_wallet failed:', walletEnsureError);
  }

  return profile as Copytrade77Profile;
}

export async function getSystemAdminCopytradeProfileId(): Promise<string> {
  const supabase = getCopytrade77AdminClient();
  const schema = supabase.schema('copytrade77');

  const { data: existingAdmin, error } = await schema
    .from('profiles')
    .select('id')
    .eq('is_admin', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (existingAdmin?.id) {
    return existingAdmin.id as string;
  }

  const fallbackEmail = process.env.ADMIN_EMAILS?.split(',')[0]?.trim().toLowerCase() || 'apmexplore@gmail.com';
  const pseudoAppUserId = `admin:${fallbackEmail}`;

  const profile = await ensureCopytrade77Profile({
    appUserId: pseudoAppUserId,
    email: fallbackEmail,
    displayName: 'ARRA77 Admin',
  });

  const { error: elevateError } = await schema
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', profile.id);

  if (elevateError) {
    throw elevateError;
  }

  return profile.id;
}

