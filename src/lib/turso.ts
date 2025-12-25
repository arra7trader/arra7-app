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

        // Migrations: Add any missing columns to users table
        // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we try-catch each
        const migrations = [
            { column: 'membership', sql: `ALTER TABLE users ADD COLUMN membership TEXT DEFAULT 'BASIC'` },
            { column: 'membership_expires', sql: `ALTER TABLE users ADD COLUMN membership_expires DATETIME` },
            { column: 'created_at', sql: `ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP` },
            { column: 'updated_at', sql: `ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP` },
            { column: 'image', sql: `ALTER TABLE users ADD COLUMN image TEXT` },
            // Geo-location columns
            { column: 'last_login_ip', sql: `ALTER TABLE users ADD COLUMN last_login_ip TEXT` },
            { column: 'last_login_country', sql: `ALTER TABLE users ADD COLUMN last_login_country TEXT` },
            { column: 'last_login_city', sql: `ALTER TABLE users ADD COLUMN last_login_city TEXT` },
            { column: 'last_login_at', sql: `ALTER TABLE users ADD COLUMN last_login_at DATETIME` },
        ];

        for (const migration of migrations) {
            try {
                await turso.execute(migration.sql);
                console.log(`Added ${migration.column} column`);
            } catch (alterError) {
                // Column likely already exists, ignore error
                console.log(`${migration.column} column already exists or migration skipped`);
            }
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

// Update user's geo-location data on login
export async function updateUserGeoLocation(userId: string, geoData: {
    ip?: string;
    country?: string;
    city?: string;
}): Promise<boolean> {
    const turso = getTursoClient();
    if (!turso) return false;

    try {
        await turso.execute({
            sql: `UPDATE users SET 
                last_login_ip = ?,
                last_login_country = ?,
                last_login_city = ?,
                last_login_at = datetime('now')
                WHERE id = ?`,
            args: [geoData.ip || null, geoData.country || null, geoData.city || null, userId],
        });
        console.log(`[GEO] Updated location for user ${userId}: ${geoData.city}, ${geoData.country}`);
        return true;
    } catch (error) {
        console.error('Update geo-location error:', error);
        return false;
    }
}
