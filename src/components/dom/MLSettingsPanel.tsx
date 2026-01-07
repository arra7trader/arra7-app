'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PredictionSettings {
    horizon: 5 | 10 | 30;  // Prediction horizon in seconds
    model: 'ensemble' | 'bilstm' | 'lstm' | 'gru' | 'conv1d' | 'auto';
    showOverlay: boolean;  // Show prediction on heatmap
    confidenceThreshold: number;  // Min confidence to show (0-1)
    refreshInterval: number;  // Refresh in seconds
}

interface MLSettingsPanelProps {
    settings: PredictionSettings;
    onSettingsChange: (settings: PredictionSettings) => void;
    isExpanded?: boolean;
}

const DEFAULT_SETTINGS: PredictionSettings = {
    horizon: 10,
    model: 'ensemble',
    showOverlay: true,
    confidenceThreshold: 0.5,
    refreshInterval: 3
};

export { DEFAULT_SETTINGS };
export type { PredictionSettings };

export default function MLSettingsPanel({
    settings,
    onSettingsChange,
    isExpanded = false
}: MLSettingsPanelProps) {
    const [expanded, setExpanded] = useState(isExpanded);

    const updateSetting = <K extends keyof PredictionSettings>(
        key: K,
        value: PredictionSettings[K]
    ) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className="bg-white rounded-2xl border border-[var(--border-light)] overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-lg">⚙️</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                        ML Settings
                    </span>
                </div>
                <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-gray-400"
                >
                    ▼
                </motion.span>
            </button>

            {/* Expandable Content */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-4">

                            {/* Prediction Horizon */}
                            <div>
                                <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">
                                    Prediction Horizon
                                </label>
                                <div className="flex gap-2">
                                    {[5, 10, 30].map((h) => (
                                        <button
                                            key={h}
                                            onClick={() => updateSetting('horizon', h as 5 | 10 | 30)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${settings.horizon === h
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {h}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Model Selection */}
                            <div>
                                <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">
                                    Model
                                </label>
                                <select
                                    value={settings.model}
                                    onChange={(e) => updateSetting('model', e.target.value as PredictionSettings['model'])}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                >
                                    <option value="ensemble">🤖 Ensemble (Recommended)</option>
                                    <option value="auto">🎯 Auto (Select Best)</option>
                                    <option value="bilstm">Bi-LSTM</option>
                                    <option value="lstm">LSTM</option>
                                    <option value="gru">GRU (Fastest)</option>
                                    <option value="conv1d">Conv1D</option>
                                </select>
                            </div>

                            {/* Confidence Threshold */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                                        Min Confidence
                                    </label>
                                    <span className="text-xs text-purple-600 font-medium">
                                        {Math.round(settings.confidenceThreshold * 100)}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={settings.confidenceThreshold * 100}
                                    onChange={(e) => updateSetting('confidenceThreshold', parseInt(e.target.value) / 100)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                    Hanya tampilkan prediksi dengan confidence di atas threshold ini
                                </p>
                            </div>

                            {/* Refresh Interval */}
                            <div>
                                <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block">
                                    Refresh Interval
                                </label>
                                <div className="flex gap-2">
                                    {[1, 3, 5, 10].map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => updateSetting('refreshInterval', s)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${settings.refreshInterval === s
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {s}s
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Show Overlay Toggle */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">
                                        Show on Heatmap
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Tampilkan prediction overlay di heatmap
                                    </p>
                                </div>
                                <button
                                    onClick={() => updateSetting('showOverlay', !settings.showOverlay)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.showOverlay ? 'bg-purple-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <motion.div
                                        className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow"
                                        animate={{ x: settings.showOverlay ? 24 : 0 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                </button>
                            </div>

                            {/* Reset Button */}
                            <button
                                onClick={() => onSettingsChange(DEFAULT_SETTINGS)}
                                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                Reset to Defaults
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
