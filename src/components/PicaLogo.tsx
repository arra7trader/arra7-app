'use client';

import React from 'react';

interface PicaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  className?: string;
  variant?: 'light' | 'dark';
}

export default function PicaLogo({
  size = 'md',
  showWordmark = true,
  className = '',
}: PicaLogoProps) {
  const sizeMap = {
    sm: { icon: 26, text: 'text-lg', badge: 'text-[9px]' },
    md: { icon: 34, text: 'text-2xl', badge: 'text-[10px]' },
    lg: { icon: 44, text: 'text-3xl', badge: 'text-[11px]' },
    xl: { icon: 56, text: 'text-4xl', badge: 'text-xs' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Bespoke Geometric Emblem */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 p-[1.5px] shadow-md shadow-indigo-950/20 group hover:shadow-indigo-500/20 transition-all duration-300"
        style={{ width: currentSize.icon + 4, height: currentSize.icon + 4 }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="picaStemGrad" x1="8" y1="6" x2="22" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="60%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#1E1B4B" />
            </linearGradient>

            <linearGradient id="picaUpperLoop" x1="16" y1="6" x2="40" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="40%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#4F46E5" />
            </linearGradient>

            <linearGradient id="picaCoreFaceted" x1="20" y1="14" x2="36" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>

            <filter id="picaGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Background subtle plate */}
          <rect width="48" height="48" rx="11" fill="#0B1120" />

          {/* Stem (Vertical Pillar with Angled Precision Top & Bottom) */}
          <path
            d="M11 9C11 7.89543 11.8954 7 13 7H20.5C21.6046 7 22.5 7.89543 22.5 9V39C22.5 40.1046 21.6046 41 20.5 41H13C11.8954 41 11 40.1046 11 39V9Z"
            fill="url(#picaStemGrad)"
          />

          {/* Upper Precision Geometric Arch (P Head) */}
          <path
            d="M20 7H31C36.5228 7 41 11.4772 41 17C41 22.5228 36.5228 27 31 27H20V7Z"
            fill="url(#picaUpperLoop)"
          />

          {/* Internal Geometric Core Cutout / Facet */}
          <path
            d="M22.5 13.5H29.5C31.7091 13.5 33.5 15.2909 33.5 17.5C33.5 19.7091 31.7091 21.5 29.5 21.5H22.5V13.5Z"
            fill="#0B1120"
          />

          {/* Dynamic Laser Quant Chevron Accent */}
          <path
            d="M27 10L36 17L27 24"
            stroke="url(#picaCoreFaceted)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />

          {/* Precision Pulse Dot at Apex */}
          <circle cx="36" cy="17" r="2.2" fill="#38BDF8" />
          <circle cx="36" cy="17" r="1" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Typography Wordmark */}
      {showWordmark && (
        <div className="flex items-center gap-2">
          <span
            className={`font-['Space_Grotesk',system-ui,sans-serif] font-black tracking-[-0.03em] ${currentSize.text} text-slate-900 flex items-center`}
          >
            PICA
            <span className="text-blue-600 font-extrabold ml-[1px]">.</span>
          </span>

          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/90 text-slate-600 font-mono font-bold tracking-wider uppercase text-[10px]">
            QUANT
          </span>
        </div>
      )}
    </div>
  );
}
