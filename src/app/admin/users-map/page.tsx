'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';

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
            } else {
                setError(data.message || 'Failed to fetch locations');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-2">🚫 Access Denied</h1>
                    <p className="text-gray-400">This page is for administrators only.</p>
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
        <div className="min-h-screen bg-[#0B0C10] text-white">
            {/* Header */}
            <div className="border-b border-[#1F2937] bg-[#12141A]">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">🗺️ User Locations Map</h1>
                            <p className="text-gray-400 text-sm mt-1">
                                Real-time tracking of {users.length} active users
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* Period Filter */}
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="bg-[#1F2937] border border-[#374151] rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="all">All Time</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="24h">Last 24 Hours</option>
                            </select>
                            {/* Refresh Button */}
                            <button
                                onClick={fetchUserLocations}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Map */}
                    <div className="lg:col-span-3">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-[#12141A] rounded-xl overflow-hidden border border-[#1F2937]"
                            style={{ height: '600px' }}
                        >
                            {mapReady && !loading ? (
                                <MapContainer
                                    center={[-2.5, 118]} // Indonesia center
                                    zoom={4}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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

                    {/* Sidebar Stats */}
                    <div className="space-y-4">
                        {/* Total Users */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-[#12141A] rounded-xl p-4 border border-[#1F2937]"
                        >
                            <h3 className="text-gray-400 text-sm mb-2">Total Users</h3>
                            <div className="text-3xl font-bold">{users.length}</div>
                        </motion.div>

                        {/* By Country */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-[#12141A] rounded-xl p-4 border border-[#1F2937]"
                        >
                            <h3 className="text-gray-400 text-sm mb-3">By Country</h3>
                            <div className="space-y-2">
                                {Object.entries(countryStats)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 10)
                                    .map(([country, count]) => (
                                        <div key={country} className="flex items-center justify-between">
                                            <span className="text-sm">{country}</span>
                                            <span className="text-blue-400 font-medium">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        </motion.div>

                        {/* Recent Users */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-[#12141A] rounded-xl p-4 border border-[#1F2937]"
                        >
                            <h3 className="text-gray-400 text-sm mb-3">Recent Activity</h3>
                            <div className="space-y-3">
                                {users.slice(0, 5).map((user) => (
                                    <div key={user.id} className="flex items-center gap-2">
                                        {user.image ? (
                                            <img
                                                src={user.image}
                                                alt={user.name}
                                                className="w-8 h-8 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs">
                                                {user.name[0]}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium truncate">{user.name}</div>
                                            <div className="text-xs text-gray-500">{user.city}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
}
