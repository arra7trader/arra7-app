import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { upsertUser, initDatabase } from './turso';

// Initialize database on first load
let dbInitialized = false;

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            authorization: {
                params: {
                    prompt: "select_account",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        CredentialsProvider({
            id: 'admin-passkey',
            name: 'Admin Passkey',
            credentials: {
                passkey: { label: 'Admin Passkey', type: 'password' },
                targetEmail: { label: 'Admin Email', type: 'text' }
            },
            async authorize(credentials) {
                const correctPin = process.env.ADMIN_PIN || 'Aoyamapm7@';
                if (credentials?.passkey === correctPin) {
                    const chosenEmail = credentials?.targetEmail?.trim() || 'arlandpratama@gmail.com';
                    return {
                        id: 'admin_master_1',
                        name: 'PICA Administrator',
                        email: chosenEmail,
                        tier: 'VVIP',
                    };
                }
                return null;
            }
        }),
    ],
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        async signIn({ user }) {
            console.log('[AUTH] SignIn callback triggered');
            console.log('[AUTH] User:', user.email, 'ID:', user.id);

            // Initialize database if not done
            if (!dbInitialized && process.env.TURSO_DATABASE_URL) {
                try {
                    await initDatabase();
                    dbInitialized = true;
                } catch (e) {
                    console.warn('[AUTH] DB init error:', e);
                }
            }

            // Sync user to Turso database
            if (user.id && user.email && process.env.TURSO_DATABASE_URL) {
                try {
                    await upsertUser({
                        id: user.id,
                        email: user.email,
                        name: user.name || 'User',
                        image: user.image || undefined,
                    });
                } catch (e) {
                    console.warn('[AUTH] Upsert error:', e);
                }
            }
            return true;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;

                // Admin accounts override: always VVIP
                if (token.email && (token.email === 'arlandpratama@gmail.com' || token.email === 'apmexplore@gmail.com')) {
                    session.user.tier = 'VVIP';
                    return session;
                }

                // DATA FETCHER: Always fetch fresh membership status
                if (process.env.TURSO_DATABASE_URL) {
                    try {
                        const { getUserMembership, getUserSubscription } = await import('./turso');
                        const { membership, expiresAt } = await getUserMembership(token.sub);
                        const subscription = await getUserSubscription(token.sub);
                        session.user.tier = (membership as 'BASIC' | 'PRO' | 'VVIP') || 'BASIC';

                        if (expiresAt) {
                            session.user.membershipExpires = expiresAt.toISOString();
                            const now = new Date();
                            const msLeft = expiresAt.getTime() - now.getTime();
                            const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
                            session.user.daysUntilExpiry = daysLeft;
                            session.user.isExpired = daysLeft <= 0 && membership === 'BASIC';
                        }

                        if (subscription) {
                            session.user.subscriptionStatus = subscription.status;
                            session.user.subscriptionEndDate = subscription.endDate;
                            session.user.telegramChatId = subscription.telegramChatId;
                        }
                    } catch (e) {
                        session.user.tier = token.tier || 'BASIC';
                    }
                } else {
                    session.user.tier = token.tier || 'BASIC';
                }
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.tier = (user as any).tier || 'BASIC';
            }
            return token;
        },
        async redirect({ url, baseUrl }) {
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
    },
    session: {
        strategy: 'jwt',
    },
    secret: process.env.NEXTAUTH_SECRET,
};
