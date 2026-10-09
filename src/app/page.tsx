'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRef } from 'react';
import { ArrowRightIcon } from '@/components/PremiumIcons';
import DailyPerformanceSection from '@/components/home/DailyPerformanceSection';
import AppGrid from '@/components/home/AppGrid';
import NeuralBackground from '@/components/home/NeuralBackground';
import PicaLogo from '@/components/PicaLogo';

export default function Home() {
  const { data: session } = useSession();
  const tHero = useTranslations('hero');
  const tFooter = useTranslations('footer');

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.98]);

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-500 selection:text-white overflow-hidden">
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-24 sm:pt-32 pb-8 sm:pb-12 px-4 sm:px-6 md:px-12 flex flex-col items-center justify-center overflow-hidden">

        {/* Neural Network Background Canvas */}
        <NeuralBackground />

        {/* Subtle Light Gradient Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 via-transparent to-[#F8FAFC] pointer-events-none z-0" />

        <motion.div
          style={{ scale: heroScale }}
          className="w-full max-w-5xl mx-auto text-center relative z-10 flex flex-col items-center"
        >
          {/* Live System Status Pill */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-5"
          >
            <div className="inline-flex items-center rounded-full py-1.5 px-4 gap-2.5 bg-white border border-slate-200/90 shadow-xs hover:border-blue-300 transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full bg-emerald-600 h-2 w-2" />
              </span>
              <span className="tracking-[1px] uppercase text-slate-700 font-['Inter',system-ui,sans-serif] font-bold text-xs">
                PICA QUANT ENGINE · V4.2 ACTIVE
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-[36px] sm:text-[54px] md:text-[64px] text-center tracking-tight leading-[1.1] mb-2 text-slate-900 font-['Space_Grotesk',system-ui,sans-serif] font-extrabold max-w-4xl"
          >
            {tHero('headline')}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[36px] sm:text-[54px] md:text-[64px] text-center tracking-tight leading-[1.1] mb-5 bg-clip-text text-transparent font-['Space_Grotesk',system-ui,sans-serif] font-extrabold" 
            style={{ backgroundImage: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 40%, #4F46E5 100%)' }}
          >
            {tHero('headlineHighlight')}
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-base sm:text-lg leading-relaxed text-center max-w-[620px] mx-auto mb-7 text-slate-600 font-['Inter',system-ui,sans-serif]"
          >
            {tHero('subheadline')}
          </motion.p>

          {/* Telemetry Chips */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 mb-7"
          >
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-xs backdrop-blur-xs">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
              </svg>
              <span className="font-mono font-semibold text-xs text-slate-800">
                NEURAL CORE: BI-LSTM
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-xs backdrop-blur-xs">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span className="font-mono font-semibold text-xs text-slate-800">
                LATENCY: 12ms
              </span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/90 shadow-xs backdrop-blur-xs">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#4F46E5" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              <span className="font-mono font-semibold text-xs text-slate-800">
                22 QUANT FEATURES
              </span>
            </div>
          </motion.div>

          {/* Menu Tombol Aplikasi (4 Menu Utama) */}
          <div className="w-full">
            <AppGrid />
          </div>

          {/* Live Engine Performance Section */}
          <div className="w-full mt-6">
            <DailyPerformanceSection />
          </div>

        </motion.div>
      </section>

      {/* Clean Minimalist Terminal Footer */}
      <footer className="w-full py-8 border-t border-slate-200/80 bg-white/80 backdrop-blur-md antialiased px-6 md:px-12 mt-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 max-w-5xl mx-auto">
          {/* Logo & Slogan */}
          <div className="flex items-center gap-3">
            <PicaLogo size="sm" />
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500 font-medium">
              High Precision Institutional AI Platform
            </span>
          </div>
          
          {/* Quick Footer Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-600 font-medium">
            <Link href="/xauusd-neural-lab" className="hover:text-blue-600 transition-colors">Neural Lab</Link>
            <Link href="/analisa-market" className="hover:text-blue-600 transition-colors">Market</Link>
            <Link href="/dom-arra" className="hover:text-blue-600 transition-colors">Bookmap</Link>
            <Link href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Privacy</Link>
            <Link href="/faq" className="hover:text-blue-600 transition-colors">FAQ</Link>
          </div>
          
          {/* Copyright */}
          <div className="text-xs text-slate-400 font-mono">
            © 2026 PICA Quant · All Rights Reserved
          </div>
        </div>
      </footer>

    </div>
  );
}
