
import React, { useState } from 'react';

// Define User Interface here effectively reusing from page.tsx logic
// But cleaner
export interface User {
    id: string;
    email: string;
    name: string;
    membership: string;
    membershipExpires: string | null;
    createdAt: string;
    todayUsage: number;
    forexUsage: number;
    stockUsage: number;
    // Geo-location
    lastLoginIp: string | null;
    lastLoginCountry: string | null;
    lastLoginCity: string | null;
    lastLoginAt: string | null;
    downloadedApk: boolean;
}

interface UserTableProps {
    users: User[];
    loading: boolean;
    onUpdateMembership: (user: User, membership: string) => void;
    updating: string | null;
    onUserClick?: (user: User) => void;
    selectedIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
}

export default function UserTable({
    users,
    loading,
    onUpdateMembership,
    updating,
    onUserClick,
    selectedIds = [],
    onSelectionChange
}: UserTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: keyof User; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: keyof User) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            onSelectionChange?.(users.map(u => u.id));
        } else {
            onSelectionChange?.([]);
        }
    };

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            onSelectionChange?.(selectedIds.filter(sid => sid !== id));
        } else {
            onSelectionChange?.([...selectedIds, id]);
        }
    };

    // Sorting Logic
    const sortedUsers = React.useMemo(() => {
        let sortableUsers = [...users];
        if (sortConfig !== null) {
            sortableUsers.sort((a, b) => {
                if (sortConfig.key === 'membership') {
                    // Custom priority: VVIP > PRO > BASIC
                    const priority: any = { VVIP: 3, PRO: 2, BASIC: 1, FREE: 0 };
                    const valA = priority[a.membership] || 0;
                    const valB = priority[b.membership] || 0;

                    if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                }

                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

                if (valA === null) return 1;
                if (valB === null) return -1;

                if (valA! < valB!) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (valA! > valB!) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableUsers;
    }, [users, sortConfig]);

    if (loading) {
        return <div className="p-8 text-center">Loading users...</div>;
    }

    return (
        <div className="bg-white rounded-2xl border border-[var(--border-light)] overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-[var(--bg-secondary)]">
                        <tr>
                            <th className="px-4 py-4 w-12 border-b border-[var(--border-light)]">
                                <input
                                    type="checkbox"
                                    checked={users.length > 0 && selectedIds.length === users.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                            </th>
                            {[
                                { label: 'User', key: 'email' },
                                { label: 'Lokasi Login', key: 'lastLoginCity' },
                                { label: 'Tanggal Daftar', key: 'createdAt' },
                                { label: 'Membership', key: 'membership' },
                                { label: 'Expires', key: 'membershipExpires' },
                                { label: 'Usage Today', key: 'todayUsage' },
                            ].map((head) => (
                                <th
                                    key={head.key}
                                    onClick={() => handleSort(head.key as keyof User)}
                                    className="text-left p-4 text-sm text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-primary)] transition-colors border-b border-[var(--border-light)]"
                                >
                                    <div className="flex items-center gap-1">
                                        {head.label}
                                        {sortConfig?.key === head.key && (
                                            <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th className="text-left p-4 text-sm text-[var(--text-muted)] border-b border-[var(--border-light)]">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map((user) => (
                            <tr key={user.id} className="border-b border-[var(--border-light)] hover:bg-[var(--bg-secondary)] last:border-b-0">
                                <td className="px-4 py-4">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(user.id)}
                                        onChange={() => handleSelectOne(user.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </td>
                                <td className="p-4">
                                    <div>
                                        <p className="font-medium text-[var(--text-primary)] flex items-center gap-2 cursor-pointer hover:underline" onClick={() => onUserClick?.(user)}>
                                            {user.name || 'No Name'}
                                            {user.downloadedApk && (
                                                <span title="User sudah download APK">🤖</span>
                                            )}
                                        </p>
                                        <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
                                    </div>
                                </td>
                                <td className="p-4 text-sm">
                                    {user.lastLoginCity || user.lastLoginCountry ? (
                                        <div className="flex flex-col">
                                            <span className="text-[var(--text-primary)]">
                                                📍 {user.lastLoginCity}{user.lastLoginCity && user.lastLoginCountry ? ', ' : ''}{user.lastLoginCountry}
                                            </span>
                                            {user.lastLoginAt && (
                                                <span className="text-xs text-[var(--text-muted)]">
                                                    {new Date(user.lastLoginAt).toLocaleDateString('id-ID', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[var(--text-muted)]">-</span>
                                    )}
                                </td>
                                <td className="p-4 text-sm text-[var(--text-secondary)]">
                                    {user.createdAt
                                        ? new Date(user.createdAt).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        : '-'
                                    }
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${user.membership === 'VVIP' ? 'bg-amber-500/20 text-amber-400' :
                                        user.membership === 'PRO' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-slate-500/20 text-slate-400'
                                        }`}>
                                        {user.membership}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-[var(--text-secondary)]">
                                    {user.membershipExpires
                                        ? new Date(user.membershipExpires).toLocaleDateString('id-ID')
                                        : '-'
                                    }
                                </td>
                                <td className="p-4 text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[var(--text-primary)]">{user.todayUsage}x total</span>
                                        <span className="text-xs text-[var(--text-muted)]">
                                            Forex: {user.forexUsage || 0} | Saham: {user.stockUsage || 0}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onUserClick?.(user); // Or handleEdit(user)
                                            }}
                                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-xs transition-colors"
                                        >
                                            View/Edit
                                        </button>
                                        {user.membership !== 'PRO' && (
                                            <button
                                                onClick={() => onUpdateMembership(user, 'PRO')}
                                                disabled={updating === user.id}
                                                className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded text-xs disabled:opacity-50"
                                            >
                                                {updating === user.id ? '...' : '→ PRO'}
                                            </button>
                                        )}
                                        {user.membership !== 'VVIP' && (
                                            <button
                                                onClick={() => onUpdateMembership(user, 'VVIP')}
                                                disabled={updating === user.id}
                                                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded text-xs disabled:opacity-50"
                                            >
                                                {updating === user.id ? '...' : '→ VVIP'}
                                            </button>
                                        )}
                                        {user.membership !== 'BASIC' && (
                                            <button
                                                onClick={() => onUpdateMembership(user, 'BASIC')}
                                                disabled={updating === user.id}
                                                className="px-3 py-1 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 rounded text-xs disabled:opacity-50"
                                            >
                                                {updating === user.id ? '...' : '→ BASIC'}
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {
                users.length === 0 && (
                    <div className="p-8 text-center text-[var(--text-muted)]">
                        Belum ada users terdaftar
                    </div>
                )
            }
        </div >
    );
}
