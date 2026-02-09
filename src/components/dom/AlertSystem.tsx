'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrderBook, DOMPrediction, DOMSignal } from '@/types/dom';
import { MLPrediction } from '@/types/ml-prediction';

// Alert types
export type AlertType =
    | 'WHALE_WALL'
    | 'EXTREME_IMBALANCE'
    | 'SUPPORT_TEST'
    | 'RESISTANCE_TEST'
    | 'ML_HIGH_CONFIDENCE'
    | 'DIVERGENCE'
    | 'ABSORPTION';

export interface Alert {
    id: string;
    type: AlertType;
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    message: string;
    timestamp: number;
    price?: number;
    dismissed: boolean;
}

interface AlertSettings {
    enabled: boolean;
    soundEnabled: boolean;
    whaleThreshold: number;      // Volume threshold for whale alerts
    imbalanceThreshold: number;  // Imbalance % threshold
    mlConfidenceThreshold: number; // ML confidence threshold
}

const DEFAULT_ALERT_SETTINGS: AlertSettings = {
    enabled: true,
    soundEnabled: false,
    whaleThreshold: 5,    // 5x average volume
    imbalanceThreshold: 70, // 70% imbalance
    mlConfidenceThreshold: 85, // 85% ML confidence
};

// Alert icon and color mapping
const ALERT_CONFIG: Record<AlertType, { icon: string; color: string; bgColor: string }> = {
    WHALE_WALL: { icon: '🐋', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
    EXTREME_IMBALANCE: { icon: '⚡', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    SUPPORT_TEST: { icon: '🟢', color: 'text-green-400', bgColor: 'bg-green-500/20' },
    RESISTANCE_TEST: { icon: '🔴', color: 'text-red-400', bgColor: 'bg-red-500/20' },
    ML_HIGH_CONFIDENCE: { icon: '🤖', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    DIVERGENCE: { icon: '📊', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    ABSORPTION: { icon: '🧲', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
};

// Hook for managing alerts
export function useAlertSystem(
    orderBook: OrderBook | null,
    prediction: DOMPrediction | null,
    mlPrediction: MLPrediction | null,
    settings: AlertSettings = DEFAULT_ALERT_SETTINGS
) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const lastAlertTimeRef = useRef<Record<AlertType, number>>({} as Record<AlertType, number>);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio
    useEffect(() => {
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio('/sounds/alert.mp3');
            audioRef.current.volume = 0.3;
        }
    }, []);

    // Play alert sound
    const playSound = useCallback(() => {
        if (settings.soundEnabled && audioRef.current) {
            audioRef.current.play().catch(e => console.log('Audio blocked:', e));
        }
    }, [settings.soundEnabled]);

    // Add new alert with cooldown
    const addAlert = useCallback((type: AlertType, level: Alert['level'], title: string, message: string, price?: number) => {
        if (!settings.enabled) return;

        // Cooldown: prevent same alert type within 10 seconds
        const now = Date.now();
        const lastTime = lastAlertTimeRef.current[type] || 0;
        if (now - lastTime < 10000) return;

        lastAlertTimeRef.current[type] = now;

        const newAlert: Alert = {
            id: `${type}-${now}`,
            type,
            level,
            title,
            message,
            timestamp: now,
            price,
            dismissed: false,
        };

        setAlerts(prev => [newAlert, ...prev].slice(0, 20)); // Keep last 20 alerts

        if (level === 'HIGH') {
            playSound();
        }
    }, [settings.enabled, playSound]);

    // Dismiss alert
    const dismissAlert = useCallback((alertId: string) => {
        setAlerts(prev => prev.map(a =>
            a.id === alertId ? { ...a, dismissed: true } : a
        ));
    }, []);

    // Clear all alerts
    const clearAlerts = useCallback(() => {
        setAlerts([]);
    }, []);

    // Monitor for alert conditions
    useEffect(() => {
        if (!orderBook || !settings.enabled) return;

        // Calculate average volume
        const allVolumes = [...orderBook.bids, ...orderBook.asks].map(l => l.volume);
        const avgVolume = allVolumes.reduce((a, b) => a + b, 0) / (allVolumes.length || 1);
        const whaleThreshold = avgVolume * settings.whaleThreshold;

        // Check for whale walls
        const bigBids = orderBook.bids.filter(b => b.volume > whaleThreshold);
        const bigAsks = orderBook.asks.filter(a => a.volume > whaleThreshold);

        if (bigBids.length > 0) {
            const biggest = bigBids.reduce((max, b) => b.volume > max.volume ? b : max, bigBids[0]);
            const size = (biggest.volume / avgVolume).toFixed(1);
            addAlert(
                'WHALE_WALL',
                biggest.volume > avgVolume * 10 ? 'HIGH' : 'MEDIUM',
                `Large Buy Wall Detected`,
                `${size}x average volume at $${biggest.price.toLocaleString()}`,
                biggest.price
            );
        }

        if (bigAsks.length > 0) {
            const biggest = bigAsks.reduce((max, a) => a.volume > max.volume ? a : max, bigAsks[0]);
            const size = (biggest.volume / avgVolume).toFixed(1);
            addAlert(
                'WHALE_WALL',
                biggest.volume > avgVolume * 10 ? 'HIGH' : 'MEDIUM',
                `Large Sell Wall Detected`,
                `${size}x average volume at $${biggest.price.toLocaleString()}`,
                biggest.price
            );
        }

        // Check for extreme imbalance
        if (Math.abs(orderBook.imbalance) > settings.imbalanceThreshold) {
            const direction = orderBook.imbalance > 0 ? 'Buyers' : 'Sellers';
            addAlert(
                'EXTREME_IMBALANCE',
                Math.abs(orderBook.imbalance) > 85 ? 'HIGH' : 'MEDIUM',
                `Extreme ${direction} Pressure`,
                `Order book imbalance at ${Math.abs(orderBook.imbalance).toFixed(1)}%`
            );
        }

    }, [orderBook, settings, addAlert]);

    // Monitor DOM signals
    useEffect(() => {
        if (!prediction || !settings.enabled) return;

        prediction.signals.forEach(signal => {
            if (signal.type === 'SUPPORT' && signal.level === 'HIGH') {
                addAlert(
                    'SUPPORT_TEST',
                    'MEDIUM',
                    'Strong Support Detected',
                    signal.description,
                    signal.price
                );
            }
            if (signal.type === 'RESISTANCE' && signal.level === 'HIGH') {
                addAlert(
                    'RESISTANCE_TEST',
                    'MEDIUM',
                    'Strong Resistance Detected',
                    signal.description,
                    signal.price
                );
            }
            if (signal.type === 'ABSORPTION' && signal.level === 'HIGH') {
                addAlert(
                    'ABSORPTION',
                    'HIGH',
                    'Heavy Absorption Detected',
                    signal.description
                );
            }
        });
    }, [prediction, settings.enabled, addAlert]);

    // Monitor ML predictions
    useEffect(() => {
        if (!mlPrediction || !settings.enabled) return;

        const confidencePct = mlPrediction.confidence * 100;
        if (confidencePct >= settings.mlConfidenceThreshold) {
            const direction = mlPrediction.direction;
            addAlert(
                'ML_HIGH_CONFIDENCE',
                confidencePct >= 90 ? 'HIGH' : 'MEDIUM',
                `AI High Confidence: ${direction}`,
                `ML model predicts ${direction} with ${confidencePct.toFixed(0)}% confidence`
            );
        }
    }, [mlPrediction, settings, addAlert]);

    return {
        alerts,
        activeAlerts: alerts.filter(a => !a.dismissed),
        addAlert,
        dismissAlert,
        clearAlerts,
    };
}

// Alert Toast Component
interface AlertToastProps {
    alert: Alert;
    onDismiss: () => void;
}

function AlertToast({ alert, onDismiss }: AlertToastProps) {
    const config = ALERT_CONFIG[alert.type];

    useEffect(() => {
        // Auto-dismiss after 8 seconds for non-high alerts
        if (alert.level !== 'HIGH') {
            const timer = setTimeout(onDismiss, 8000);
            return () => clearTimeout(timer);
        }
    }, [alert.level, onDismiss]);

    return (
        <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className={`${config.bgColor} backdrop-blur-sm border border-white/10 rounded-xl p-3 shadow-lg max-w-sm`}
        >
            <div className="flex items-start gap-3">
                <span className="text-2xl">{config.icon}</span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h4 className={`font-semibold text-sm ${config.color}`}>
                            {alert.title}
                        </h4>
                        {alert.level === 'HIGH' && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded font-bold animate-pulse">
                                HIGH
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                        {alert.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-slate-500">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                        {alert.price && (
                            <span className="text-[10px] text-slate-400">
                                @ ${alert.price.toLocaleString()}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    onClick={onDismiss}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                    <span className="text-slate-400 text-sm">✕</span>
                </button>
            </div>
        </motion.div>
    );
}

// Alert Panel Component
interface AlertPanelProps {
    alerts: Alert[];
    onDismiss: (id: string) => void;
    onClear: () => void;
}

export function AlertPanel({ alerts, onDismiss, onClear }: AlertPanelProps) {
    const [expanded, setExpanded] = useState(false);
    const activeAlerts = alerts.filter(a => !a.dismissed);
    const highPriorityCount = activeAlerts.filter(a => a.level === 'HIGH').length;

    return (
        <div className="bg-white rounded-2xl border border-[var(--border-light)] overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">🔔</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                        Alerts
                    </span>
                    {activeAlerts.length > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${highPriorityCount > 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                            {activeAlerts.length}
                        </span>
                    )}
                </div>
                <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-gray-400"
                >
                    ▼
                </motion.span>
            </button>

            {/* Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 border-t border-gray-100 pt-2">
                            {activeAlerts.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-4">
                                    No active alerts
                                </p>
                            ) : (
                                <>
                                    <div className="flex justify-end mb-2">
                                        <button
                                            onClick={onClear}
                                            className="text-xs text-gray-400 hover:text-gray-600"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {activeAlerts.slice(0, 10).map(alert => {
                                            const config = ALERT_CONFIG[alert.type];
                                            return (
                                                <div
                                                    key={alert.id}
                                                    className={`${config.bgColor} rounded-lg p-2 flex items-start gap-2`}
                                                >
                                                    <span>{config.icon}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs font-medium ${config.color}`}>
                                                            {alert.title}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 truncate">
                                                            {alert.message}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => onDismiss(alert.id)}
                                                        className="text-gray-400 hover:text-gray-600 text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Alert Toast Container - for floating alerts
interface AlertToastContainerProps {
    alerts: Alert[];
    onDismiss: (id: string) => void;
}

export function AlertToastContainer({ alerts, onDismiss }: AlertToastContainerProps) {
    const activeAlerts = alerts.filter(a => !a.dismissed).slice(0, 3);

    return (
        <div className="fixed top-24 right-4 z-50 space-y-2">
            <AnimatePresence>
                {activeAlerts.map(alert => (
                    <AlertToast
                        key={alert.id}
                        alert={alert}
                        onDismiss={() => onDismiss(alert.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

export { DEFAULT_ALERT_SETTINGS };
export type { AlertSettings };
