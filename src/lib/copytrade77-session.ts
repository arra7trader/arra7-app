import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureCopytrade77Profile, Copytrade77Profile } from '@/lib/copytrade77-profile';

export interface Copytrade77SessionProfile {
  userId: string;
  email: string;
  name: string | null;
  profile: Copytrade77Profile;
}

export async function requireCopytrade77SessionProfile(): Promise<Copytrade77SessionProfile> {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id || !user.email) {
    throw new Error('UNAUTHORIZED');
  }

  const profile = await ensureCopytrade77Profile({
    appUserId: user.id,
    email: user.email,
    displayName: user.name || user.email,
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name || null,
    profile,
  };
}

