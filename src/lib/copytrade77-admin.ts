import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin-access';
import { ensureCopytrade77Profile } from '@/lib/copytrade77-profile';

export interface Copytrade77AdminContext {
  userId: string;
  email: string;
  adminProfileId: string;
}

export async function requireCopytrade77Admin(): Promise<Copytrade77AdminContext> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email || !isAdminEmail(session.user.email)) {
    throw new Error('UNAUTHORIZED');
  }

  const profile = await ensureCopytrade77Profile({
    appUserId: session.user.id,
    email: session.user.email,
    displayName: session.user.name || session.user.email,
  });

  return {
    userId: session.user.id,
    email: session.user.email,
    adminProfileId: profile.id,
  };
}

