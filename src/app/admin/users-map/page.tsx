'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamic import for Leaflet (client-side only)
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);

interface UserLocation {
    id: string;
    name: string;
    email: string;
    image: string | null;
    membership: string;
    country: string;
    city: string;
    lastSeen: string;
    lat: number;
    lon: number;
}

export default function UsersMapPage() {
    const { data: session, status } = useSession();
    const [users, setUsers] = useState<UserLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState('all');
    const [mapReady, setMapReady] = useState(false);

    // User Tracker states
    const [searchQuery, setSearchQuery] = useState('');
    const [trackedUser, setTrackedUser] = useState<UserLocation | null>(null);
    const [showTracker, setShowTracker] = useState(false);
    const mapRef = useRef<any>(null);

    // Admin check
    const adminEmails = ['apmexplore@gmail.com'];
    const isAdmin = session?.user?.email && adminEmails.includes(session.user.email);

    useEffect(() => {
        // Load Leaflet CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Fix Leaflet icon issue
        import('leaflet').then((L) => {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
            setMapReady(true);
        });

        return () => {
            document.head.removeChild(link);
        };
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetchUserLocations();
            // Refresh every 30 seconds
            const interval = setInterval(fetchUserLocations, 30000);
            return () => clearInterval(interval);
        }
    }, [isAdmin, period]);

    const fetchUserLocations = async () => {
        try {
            const res = await fetch(`/api/location?period=${period}`);
            const data = await res.json();

            if (data.status === 'success') {
                setUsers(data.users);
                setError('');

                // Update tracked user if exists
                if (trackedUser) {
                    const updated = data.users.find((u: UserLocation) => u.id === trackedUser.id);
                    if (updated) setTrackedUser(updated);
                }
            } else {
                setError(data.message || 'Failed to fetch locations');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    // Filter users by search
    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.country?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Track user - focus map on their location
    const trackUser = (user: UserLocation) => {
        setTrackedUser(user);
        // Map will auto-center via key change
    };

    // Stop tracking
    const stopTracking = () => {
        setTrackedUser(null);
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-2">🚫 Access Denied</h1>
                    <p className="text-[var(--text-muted)]">This page is for administrators only.</p>
                </div>
            </div>
        );
    }

    // Group users by country for stats
    const countryStats = users.reduce((acc, user) => {
        acc[user.country] = (acc[user.country] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Header */}
            <div className="border-b border-[var(--border-light)] bg-white">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-[var(--text-primary)]">🗺️ User Locations Map</h1>
                            <p className="text-[var(--text-secondary)] text-sm">
                                Tracking {users.length} users
                                {trackedUser && <span className="text-green-600 ml-2">• Following: {trackedUser.name}</span>}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* User Tracker Toggle */}
                            <button
                                onClick={() => setShowTracker(!showTracker)}
                                className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${showTracker ? 'bg-green-600 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)]'
                                    }`}
                            >
                                🎯 User Tracker
                            </button>
                            {trackedUser && (
                                <button
                                    onClick={stopTracking}
                                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                                >
                                    ✕ Stop Tracking
                                </button>
                            )}
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                            >
                                <option value="all">All Time</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="24h">Last 24 Hours</option>
                            </select>
                            <button
                                onClick={fetchUserLocations}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                            >
                                🔄
                            </button>
                            <Link href="/admin">
                                <button className="px-3 py-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-light)] rounded-lg text-sm text-[var(--text-primary)]">
                                    ← Admin
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex gap-4">
                    {/* User Tracker Sidebar */}
                    <AnimatePresence>
                        {showTracker && (
                            <motion.div
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 300, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                className="shrink-0 overflow-hidden"
                            >
                                <div className="bg-white rounded-xl border border-[var(--border-light)] p-4 h-[600px] flex flex-col">
                                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                                        🎯 User Tracker
                                        <span className="text-xs text-[var(--text-muted)]">({filteredUsers.length})</span>
                                    </h3>

                                    {/* Search */}
                                    <div className="relative mb-3">
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search user..."
                                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg px-3 py-2 text-sm pr-8 text-[var(--text-primary)]"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">🔍</span>
                                    </div>

                                    {/* User List */}
                                    <div className="flex-1 overflow-y-auto space-y-2">
                                        {filteredUsers.map((user) => (
                                            <motion.button
                                                key={user.id}
                                                onClick={() => trackUser(user)}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className={`w-full text-left p-3 rounded-lg border transition-all ${trackedUser?.id === user.id
                                                    ? 'bg-green-50 border-green-300'
                                                    : 'bg-[var(--bg-secondary)] border-[var(--border-light)] hover:border-blue-300'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {user.image ? (
                                                        <img
                                                            src={user.image}
                                                            alt={user.name}
                                                            className="w-8 h-8 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                                                            {user.name[0]}
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium truncate flex items-center gap-1 text-[var(--text-primary)]">
                                                            {user.name}
                                                            {trackedUser?.id === user.id && (
                                                                <span className="text-green-600">📍</span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-[var(--text-muted)] truncate">{user.city}, {user.country}</div>
                                                    </div>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${user.membership === 'VVIP' ? 'bg-amber-100 text-amber-700' :
                                                        user.membership === 'PRO' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {user.membership}
                                                    </span>
                                                </div>
                                            </motion.button>
                                        ))}

                                        {filteredUsers.length === 0 && (
                                            <div className="text-center text-[var(--text-muted)] py-8">
                                                No users found
                                            </div>
                                        )}
                                    </div>

                                    {/* Tracked User Detail */}
                                    {trackedUser && (
                                        <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
                                            <div className="text-xs text-[var(--text-muted)] mb-1">Currently Tracking:</div>
                                            <div className="text-sm font-medium text-green-700">{trackedUser.name}</div>
                                            <div className="text-xs text-[var(--text-muted)]">{trackedUser.email}</div>
                                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                                📍 {trackedUser.city}, {trackedUser.country}
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)]">
                                                🕐 {new Date(trackedUser.lastSeen).toLocaleString('id-ID')}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Map */}
                    <div className="flex-1">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl overflow-hidden border border-[var(--border-light)]"
                            style={{ height: '600px' }}
                        >
                            {mapReady && !loading ? (
                                <MapContainer
                                    key={trackedUser ? `track-${trackedUser.id}` : 'default'}
                                    center={trackedUser ? [trackedUser.lat, trackedUser.lon] : [-2.5, 118]}
                                    zoom={trackedUser ? 10 : 4}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {users.map((user) => (
                                        <Marker
                                            key={user.id}
                                            position={[user.lat, user.lon]}
                                        >
                                            <Popup>
                                                <div className="text-black">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {user.image && (
                                                            <img
                                                                src={user.image}
                                                                alt={user.name}
                                                                className="w-8 h-8 rounded-full"
                                                            />
                                                        )}
                                                        <div>
                                                            <div className="font-bold">{user.name}</div>
                                                            <div className="text-xs text-gray-600">{user.email}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm">
                                                        <div>📍 {user.city}, {user.country}</div>
                                                        <div>💳 {user.membership}</div>
                                                        <div>🕐 {new Date(user.lastSeen).toLocaleString('id-ID')}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => trackUser(user)}
                                                        className="mt-2 w-full bg-green-500 text-white text-xs py-1 rounded hover:bg-green-600"
                                                    >
                                                        🎯 Track User
                                                    </button>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}
                                </MapContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
                                </div>
                            )}
                        </motion.div>
                    </div>

                    {/* Stats Sidebar */}
                    <div className="hidden xl:block w-64 space-y-4">
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-white rounded-xl p-4 border border-[var(--border-light)]"
                        >
                            <h3 className="text-[var(--text-muted)] text-sm mb-2">Total Users</h3>
                            <div className="text-3xl font-bold text-[var(--text-primary)]">{users.length}</div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-xl p-4 border border-[var(--border-light)]"
                        >
                            <h3 className="text-[var(--text-muted)] text-sm mb-3">By Country</h3>
                            <div className="space-y-2">
                                {Object.entries(countryStats)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 8)
                                    .map(([country, count]) => (
                                        <div key={country} className="flex items-center justify-between">
                                            <span className="text-sm truncate text-[var(--text-secondary)]">{country}</span>
                                            <span className="text-blue-600 font-medium">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl p-4 border border-[var(--border-light)]"
                        >
                            <h3 className="text-[var(--text-muted)] text-sm mb-3">Recent Activity</h3>
                            <div className="space-y-2">
                                {users.slice(0, 4).map((user) => (
                                    <button
                                        key={user.id}
                                        onClick={() => { setShowTracker(true); trackUser(user); }}
                                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
                                    >
                                        {user.image ? (
                                            <img src={user.image} alt={user.name} className="w-6 h-6 rounded-full" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white">
                                                {user.name[0]}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="text-xs font-medium truncate text-[var(--text-primary)]">{user.name}</div>
                                            <div className="text-[10px] text-[var(--text-muted)]">{user.city}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
