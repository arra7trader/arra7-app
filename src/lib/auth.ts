import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { upsertUser, initDatabase } from './turso';

// Initialize database on first load
let dbInitialized = false;

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
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
            console.log('[AUTH] TURSO_DATABASE_URL configured:', !!process.env.TURSO_DATABASE_URL);

            // Initialize database if not done
            if (!dbInitialized && process.env.TURSO_DATABASE_URL) {
                console.log('[AUTH] Initializing database...');
                const initResult = await initDatabase();
                console.log('[AUTH] Database init result:', initResult);
                dbInitialized = true;
            }

            // Sync user to Turso database
            if (user.id && user.email && process.env.TURSO_DATABASE_URL) {
                console.log('[AUTH] Attempting to upsert user to database...');
                const upsertResult = await upsertUser({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                });
                console.log('[AUTH] Upsert result:', upsertResult);
            } else {
                console.log('[AUTH] SKIPPING user save - missing requirements:', {
                    hasId: !!user.id,
                    hasEmail: !!user.email,
                    hasTursoUrl: !!process.env.TURSO_DATABASE_URL
                });
            }
            return true;
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub;

                // DATA FETCHER: Always fetch fresh membership status
                // This allows instant access updates without re-login
                if (process.env.TURSO_DATABASE_URL) {
                    try {
                        const { getUserMembership } = await import('./turso');
                        const { membership, expiresAt } = await getUserMembership(token.sub);
                        session.user.tier = (membership as 'BASIC' | 'PRO' | 'VVIP') || 'BASIC';

                        // Pass expiration data to client
                        if (expiresAt) {
                            session.user.membershipExpires = expiresAt.toISOString();

                            // Calculate days until expiry
                            const now = new Date();
                            const msLeft = expiresAt.getTime() - now.getTime();
                            const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
                            session.user.daysUntilExpiry = daysLeft;

                            // isExpired flag (though getUserMembership already downgrades, 
                            // this helps UI show specific messages)
                            session.user.isExpired = daysLeft <= 0 && membership === 'BASIC';
                        }
                    } catch (e) {
                        console.error('Error fetching membership in session:', e);
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
                // Init tier in token
                token.tier = 'BASIC';
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
