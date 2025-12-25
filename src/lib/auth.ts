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
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
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
