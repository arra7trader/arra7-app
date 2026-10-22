'use client';

import { motion } from 'framer-motion';

interface OGScoreGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function OGScoreGauge({ score, size = 'md', showLabel = true }: OGScoreGaugeProps) {
  const getColor = () => {
    if (score >= 90) return { ring: '#06B6D4', bg: 'bg-cyan-50', text: 'text-cyan-700', glow: 'shadow-cyan-500/30' };
    if (score >= 75) return { ring: '#F97316', bg: 'bg-orange-50', text: 'text-orange-700', glow: 'shadow-orange-500/30' };
    if (score >= 60) return { ring: '#EAB308', bg: 'bg-yellow-50', text: 'text-yellow-700', glow: 'shadow-yellow-500/30' };
    if (score >= 40) return { ring: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', glow: 'shadow-amber-500/20' };
    return { ring: '#EF4444', bg: 'bg-red-50', text: 'text-red-700', glow: 'shadow-red-500/20' };
  };

  const getGrade = () => {
    if (score >= 90) return { emoji: '💎', label: 'DIAMOND' };
    if (score >= 75) return { emoji: '🔥', label: 'HOT' };
    if (score >= 60) return { emoji: '⚡', label: 'INTERESTING' };
    if (score >= 40) return { emoji: '⚠️', label: 'CAUTION' };
    return { emoji: '🚫', label: 'AVOID' };
  };

  const sizeConfig = {
    sm: { dim: 48, stroke: 4, font: 'text-xs', labelFont: 'text-[8px]' },
    md: { dim: 64, stroke: 5, font: 'text-sm', labelFont: 'text-[9px]' },
    lg: { dim: 88, stroke: 6, font: 'text-lg', labelFont: 'text-[10px]' },
  };

  const config = sizeConfig[size];
  const color = getColor();
  const grade = getGrade();
  const radius = (config.dim - config.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`relative inline-flex items-center justify-center ${color.glow} shadow-lg rounded-full`}>
        <svg width={config.dim} height={config.dim} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={config.dim / 2}
            cy={config.dim / 2}
            r={radius}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={config.stroke}
          />
          {/* Score ring */}
          <motion.circle
            cx={config.dim / 2}
            cy={config.dim / 2}
            r={radius}
            fill="none"
            stroke={color.ring}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.font} font-black ${color.text}`}>{score}</span>
        </div>
      </div>
      {showLabel && (
        <div className={`flex items-center gap-0.5 ${config.labelFont} font-bold ${color.text}`}>
          <span>{grade.emoji}</span>
          <span>{grade.label}</span>
        </div>
      )}
    </div>
  );
}
