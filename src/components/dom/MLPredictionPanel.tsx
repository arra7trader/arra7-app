'use client';

import { motion } from 'framer-motion';
import { MLPrediction, getPredictionColor, getPredictionArrow } from '@/types/ml-prediction';
import { SparklesIcon, ChartIcon } from '@/components/PremiumIcons';

interface MLPredictionPanelProps {
    prediction: MLPrediction | null;
    isLoading?: boolean;
}

export default function MLPredictionPanel({ prediction, isLoading = false }: MLPredictionPanelProps) {
    if (isLoading) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <SparklesIcon size="sm" className="text-purple-500" />
                    ML Prediction
                </h3>
                <div className="flex items-center justify-center h-32">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    if (!prediction) {
        return (
            <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <SparklesIcon size="sm" className="text-purple-500" />
                    ML Prediction
                </h3>
                <p className="text-[var(--text-muted)] text-center">Menunggu data...</p>
            </div>
        );
    }

    const color = getPredictionColor(prediction.direction);
    const arrow = getPredictionArrow(prediction.direction);
    const confidencePct = Math.round(prediction.confidence * 100);

    return (
        <div className="bg-white rounded-2xl p-6 border border-[var(--border-light)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <SparklesIcon size="sm" className="text-purple-500" />
                ML Prediction
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${prediction.source === 'ml-backend'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                    {prediction.source === 'ml-backend' ? '🤖 AI' : '📊 Heuristic'}
                </span>
            </h3>

            {/* Direction Badge */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                key={prediction.timestamp}
                className="rounded-xl p-4 mb-4 text-white relative overflow-hidden"
                style={{ backgroundColor: color }}
            >
                {/* Animated background pulse */}
                <motion.div
                    className="absolute inset-0 opacity-30"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.1, 0.3]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{ backgroundColor: 'white' }}
                />

                <div className="relative flex items-center gap-4">
                    <motion.span
                        className="text-4xl"
                        animate={{
                            y: prediction.direction === 'UP' ? [-2, 2, -2] :
                                prediction.direction === 'DOWN' ? [2, -2, 2] :
                                    [0, 0, 0]
                        }}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        {arrow}
                    </motion.span>
                    <div>
                        <p className="text-xl font-bold">{prediction.direction}</p>
                        <p className="text-sm opacity-90">
                            {prediction.horizon}s Prediction
                        </p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-3xl font-bold">{confidencePct}%</p>
                        <p className="text-xs opacity-80">confidence</p>
                    </div>
                </div>
            </motion.div>

            {/* Probability bars */}
            <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs w-16 text-green-600">↑ UP</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-green-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${prediction.probabilities.UP * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <span className="text-xs w-10 text-right text-[var(--text-muted)]">
                        {Math.round(prediction.probabilities.UP * 100)}%
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs w-16 text-amber-600">→ NEU</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-amber-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${prediction.probabilities.NEUTRAL * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <span className="text-xs w-10 text-right text-[var(--text-muted)]">
                        {Math.round(prediction.probabilities.NEUTRAL * 100)}%
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs w-16 text-red-600">↓ DOWN</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-red-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${prediction.probabilities.DOWN * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                    <span className="text-xs w-10 text-right text-[var(--text-muted)]">
                        {Math.round(prediction.probabilities.DOWN * 100)}%
                    </span>
                </div>
            </div>

            {/* Model Info */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Model: <span className="font-medium text-[var(--text-secondary)]">{prediction.model_used}</span></span>
                {prediction.inference_time_ms && (
                    <span>⚡ {prediction.inference_time_ms.toFixed(0)}ms</span>
                )}
            </div>
        </div>
    );
}
