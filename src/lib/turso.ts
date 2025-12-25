import { createClient, Client } from '@libsql/client';

// Check if Turso is configured
export const isTursoConfigured = (): boolean => {
    return !!(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
};

// Initialize Turso client only if configured
let tursoClient: Client | null = null;

function getTursoClient(): Client | null {
    if (!isTursoConfigured()) {
        return null;
    }

    if (!tursoClient) {
        tursoClient = createClient({
            url: process.env.TURSO_DATABASE_URL!,
            authToken: process.env.TURSO_AUTH_TOKEN!,
        });
    }

    return tursoClient;
}

export default getTursoClient;

// Initialize database tables
export async function initDatabase(): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) {
        console.log('Turso not configured, skipping database init');
        return false;
    }

    try {
        // Create users table
        await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        image TEXT,
        membership TEXT DEFAULT 'BASIC',
        membership_expires DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create quota_usage table (Forex)
        await turso.execute(`
      CREATE TABLE IF NOT EXISTS quota_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, date)
      )
    `);

        // Create stock_quota_usage table (Stock Analysis)
        await turso.execute(`
      CREATE TABLE IF NOT EXISTS stock_quota_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, date)
      )
    `);

        // Migration: Add membership_expires column if it doesn't exist
        // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we try-catch
        try {
            await turso.execute(`
                ALTER TABLE users ADD COLUMN membership_expires DATETIME
            `);
            console.log('Added membership_expires column');
        } catch (alterError) {
            // Column likely already exists, ignore error
            console.log('membership_expires column already exists or migration skipped');
        }

        console.log('Database tables initialized');
        return true;
    } catch (error) {
        console.error('Database init error:', error);
        return false;
    }
}

// User operations
export async function upsertUser(user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
}): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `
        INSERT INTO users (id, email, name, image)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          email = excluded.email,
          name = excluded.name,
          image = excluded.image
      `,
            args: [user.id, user.email, user.name || '', user.image || ''],
        });
        return true;
    } catch (error) {
        console.error('Upsert user error:', error);
        return false;
    }
}

export async function getUserMembership(userId: string): Promise<string> {
    const turso = getTursoClient();
    if (!turso) return 'BASIC';

    try {
        const result = await turso.execute({
            sql: 'SELECT membership FROM users WHERE id = ?',
            args: [userId],
        });

        if (result.rows.length > 0) {
            return (result.rows[0].membership as string) || 'BASIC';
        }
        return 'BASIC';
    } catch (error) {
        console.error('Get membership error:', error);
        return 'BASIC';
    }
}

export async function updateUserMembership(userId: string, membership: string): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: 'UPDATE users SET membership = ? WHERE id = ?',
            args: [membership, userId],
        });
        return true;
    } catch (error) {
        console.error('Update membership error:', error);
        return false;
    }
}
