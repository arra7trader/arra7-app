import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import getTursoClient from '@/lib/turso';

// DELETE: Remove a connected account
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const turso = getTursoClient();
    if (!turso) {
        return NextResponse.json({ status: 'error', message: 'Database configuration error' }, { status: 500 });
    }

    try {
        // Verify ownership before deleting
        const check = await turso.execute({
            sql: 'SELECT id FROM trading_accounts WHERE id = ? AND user_id = ?',
            args: [id, session.user.id]
        });

        if (check.rows.length === 0) {
            return NextResponse.json({ status: 'error', message: 'Account not found or unauthorized' }, { status: 404 });
        }

        // Delete account (Cascade will handle settings, but let's be safe if no cascade)
        await turso.execute({
            sql: 'DELETE FROM trading_accounts WHERE id = ?',
            args: [id]
        });

        return NextResponse.json({ status: 'success', message: 'Account removed successfully' });

    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to remove account' }, { status: 500 });
    }
}

// PATCH: Update account settings (e.g. rename)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await req.json();
        const { name } = body; // Only allow renaming for now

        if (!name) {
            return NextResponse.json({ status: 'error', message: 'Nothing to update' }, { status: 400 });
        }

        const turso = getTursoClient();
        if (!turso) {
            return NextResponse.json({ status: 'error', message: 'Database configuration error' }, { status: 500 });
        }

        await turso.execute({
            sql: 'UPDATE trading_accounts SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            args: [name, id, session.user.id]
        });

        return NextResponse.json({ status: 'success', message: 'Account updated successfully' });

    } catch (error) {
        console.error('Update account error:', error);
        return NextResponse.json({ status: 'error', message: 'Failed to update account' }, { status: 500 });
    }
}
