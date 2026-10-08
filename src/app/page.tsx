'use client';

import { motion, useScroll, useTransform, AnimatePresence, useInView, animate } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { ArrowRightIcon, ChartIcon, CpuChipIcon, SparklesIcon, StarSolidIcon, RocketIcon, TrophyIcon, BellIcon, CrosshairIcon, CurrencyIcon, CheckCircleSolidIcon, FireIcon, ScaleIcon, SignalIcon } from '@/components/PremiumIcons';
import DownloadAppSection from '@/components/home/DownloadAppSection';
import DailyPerformanceSection from '@/components/home/DailyPerformanceSection';
import AppGrid from '@/components/home/AppGrid';
import NeuralBackground from '@/components/home/NeuralBackground';
import NeuralLabShowcase from '@/components/home/NeuralLabShowcase';
import VideoShowcase from '@/components/home/VideoShowcase';

// Stats Counter Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatsCounter({ tStats }: { tStats: any }) {
  const [stats, setStats] = useState({ users: 100, predictions: 5000, accuracy: 92.5 });
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    fetch('/api/public/stats')
      .then(res => res.json())
      .then(data => {
        if (data && data.users) {
          setStats(data);
        }
      })
      .catch(err => console.error('Failed to fetch stats', err));
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center w-full relative px-6 md:px-20 antialiased">
      <div className="flex flex-wrap md:flex-nowrap justify-between w-full max-w-[1000px] py-10 border-t border-b border-slate-200/90 gap-8 md:gap-0">
        
        <div className="flex flex-col items-center grow shrink basis-1/2 md:basis-[0%]">
          <div className="mb-2 inline-block text-slate-900 font-['Space_Grotesk',system-ui,sans-serif] font-bold text-4xl/11">
            <StatItem value={stats.users} suffix="+" decimals={0} isInView={isInView} />
          </div>
          <div className="tracking-[1.5px] uppercase inline-block text-slate-500 font-['Inter',system-ui,sans-serif] font-semibold text-[11px] text-center">
            {tStats('activeTraders')}
          </div>
        </div>

        <div className="hidden md:block w-px bg-slate-200 shrink-0" />

        <div className="flex flex-col items-center grow shrink basis-1/2 md:basis-[0%]">
          <div className="mb-2 inline-block text-slate-900 font-['Space_Grotesk',system-ui,sans-serif] font-bold text-4xl/11">
            <StatItem value={stats.predictions} suffix="" decimals={0} isInView={isInView} />
          </div>
          <div className="tracking-[1.5px] uppercase inline-block text-slate-500 font-['Inter',system-ui,sans-serif] font-semibold text-[11px] text-center">
            Neural Predictions
          </div>
        </div>

        <div className="hidden md:block w-px bg-slate-200 shrink-0" />

        <div className="flex flex-col items-center grow shrink basis-1/2 md:basis-[0%]">
          <div className="mb-2 inline-block text-blue-600 font-['Space_Grotesk',system-ui,sans-serif] font-bold text-4xl/11">
            <StatItem value={stats.accuracy} suffix="%" decimals={1} isInView={isInView} />
          </div>
          <div className="tracking-[1.5px] uppercase inline-block text-slate-500 font-['Inter',system-ui,sans-serif] font-semibold text-[11px] text-center">
            {tStats('signalAccuracy')}
          </div>
        </div>

        <div className="hidden md:block w-px bg-slate-200 shrink-0" />

        <div className="flex flex-col items-center grow shrink basis-1/2 md:basis-[0%]">
          <div className="mb-2 inline-block text-slate-900 font-['Space_Grotesk',system-ui,sans-serif] font-bold text-4xl/11">
            <StatItem value={50} suffix="+" decimals={0} isInView={isInView} />
          </div>
          <div className="tracking-[1.5px] uppercase inline-block text-slate-500 font-['Inter',system-ui,sans-serif] font-semibold text-[11px] text-center">
            Supported Pairs
          </div>
        </div>

      </div>

      <div className="flex flex-wrap md:flex-nowrap items-center justify-center mt-8 gap-4 md:gap-10">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="inline-block text-slate-600 font-medium text-xs">
            Gratis Selamanya untuk BASIC
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="inline-block text-slate-600 font-medium text-xs">
            Tanpa Kartu Kredit
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="inline-block text-slate-600 font-medium text-xs">
            Daftar dalam 30 Detik
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="inline-block text-slate-600 font-medium text-xs">
            Support via Telegram
          </div>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatItem({ value, suffix, decimals = 0, isInView }: any) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isInView) return;

    const node = nodeRef.current;
    const controls = animate(0, value, {
      duration: 2.5,
      ease: "easeOut",
      onUpdate(v) {
        if (node) node.textContent = v.toFixed(decimals);
      }
    });

    return () => controls.stop();
  }, [value, decimals, isInView]);

  return (
    <span className="flex items-center">
      <span ref={nodeRef}>0</span>
      <span>{suffix}</span>
    </span>
  );
}

type TutorialTab = 'neural' | 'bookmap' | 'forex' | 'stock' | 'doctor' | 'sentiment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TutorialTabs({ tHowItWorks }: { tHowItWorks: any }) {
  const [activeTab, setActiveTab] = useState<TutorialTab>('neural');

  const tabConfig = {
    neural: {
      color: 'from-blue-600 to-indigo-600',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      icon: <CpuChipIcon className="text-blue-600" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <CrosshairIcon key="1" className="text-blue-600" size="lg" />,
        <ChartIcon key="2" className="text-blue-600" size="lg" />,
        <CpuChipIcon key="3" className="text-blue-600" size="lg" />,
        <SparklesIcon key="4" className="text-blue-600" size="lg" />,
      ],
    },
    bookmap: {
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50/70',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-800',
      icon: <FireIcon className="text-amber-600" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <CrosshairIcon key="1" className="text-amber-600" size="lg" />,
        <ChartIcon key="2" className="text-amber-600" size="lg" />,
        <SignalIcon key="3" className="text-amber-600" size="lg" />,
        <SparklesIcon key="4" className="text-amber-600" size="lg" />,
      ],
    },
    forex: {
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      icon: <CurrencyIcon className="text-blue-600" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <ScaleIcon key="1" className="text-blue-600" size="lg" />,
        <ChartIcon key="2" className="text-blue-600" size="lg" />,
        <CpuChipIcon key="3" className="text-blue-600" size="lg" />,
        <CheckCircleSolidIcon key="4" className="text-blue-600" size="lg" />,
      ],
    },
    stock: {
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-800',
      icon: <TrophyIcon className="text-emerald-600" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <CrosshairIcon key="1" className="text-emerald-600" size="lg" />,
        <ScaleIcon key="2" className="text-emerald-600" size="lg" />,
        <RocketIcon key="3" className="text-emerald-600" size="lg" />,
        <SparklesIcon key="4" className="text-emerald-600" size="lg" />,
      ],
    },
    doctor: {
      color: 'from-rose-500 to-red-500',
      bgColor: 'bg-rose-50/70',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-800',
      icon: <FireIcon className="text-rose-600" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <TrophyIcon key="1" className="text-rose-600" size="lg" />,
        <ChartIcon key="2" className="text-rose-600" size="lg" />,
        <CheckCircleSolidIcon key="3" className="text-rose-600" size="lg" />,
        <RocketIcon key="4" className="text-rose-600" size="lg" />,
      ],
    },
    sentiment: {
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50/70',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-800',
      icon: <SparklesIcon className="text-purple-600" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <ScaleIcon key="1" className="text-purple-600" size="lg" />,
        <BellIcon key="2" className="text-purple-600" size="lg" />,
        <SignalIcon key="3" className="text-purple-600" size="lg" />,
        <CrosshairIcon key="4" className="text-purple-600" size="lg" />,
      ],
    },
  };

  const config = tabConfig[activeTab];

  return (
    <div>
      {/* Tab Buttons */}
      <div className="flex flex-wrap justify-center gap-2.5 mb-10">
        {(['neural', 'bookmap', 'forex', 'stock', 'doctor', 'sentiment'] as TutorialTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer ${activeTab === tab
              ? `bg-gradient-to-r ${tabConfig[tab].color} text-white shadow-md scale-102`
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
          >
            {tHowItWorks(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Step Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {config.steps.map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative ${config.bgColor} ${config.borderColor} border rounded-2xl p-6 text-center hover:shadow-md transition-all`}
            >
              {/* Step Number Badge */}
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r ${config.color} text-white text-sm font-bold flex items-center justify-center shadow-md`}>
                {i + 1}
              </div>

              {/* Icon */}
              <div className="w-14 h-14 mx-auto rounded-xl bg-white border border-slate-200/80 flex items-center justify-center mb-4 mt-2 shadow-xs">
                {config.stepIcons[i]}
              </div>

              {/* Title & Description */}
              <h3 className={`text-base font-bold ${config.textColor} mb-2`}>
                {tHowItWorks(`${activeTab}.${step}.title`)}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {tHowItWorks(`${activeTab}.${step}.desc`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* CTA Button for current feature */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-10"
      >
        <Link href={
          activeTab === 'neural' ? '/xauusd-neural-lab' :
          activeTab === 'bookmap' ? '/dom-arra' :
          activeTab === 'forex' ? '/analisa-market' :
          activeTab === 'stock' ? '/analisa-saham' :
          activeTab === 'doctor' ? '/ai-trade-doctor' : '/sentiment-sniffer'
        }>
          <button className={`btn-primary bg-gradient-to-r ${config.color} border-none shadow-md cursor-pointer`}>
            Buka {tHowItWorks(`tabs.${activeTab}`)} Sekarang
            <ArrowRightIcon className="ml-2" size="sm" />
          </button>
        </Link>
      </motion.div>
    </div>
  );
}

export default function Home() {
  const tHero = useTranslations('hero');
  const tStats = useTranslations('stats');
  const tTrust = useTranslations('trust');
  const tHowItWorks = useTranslations('howItWorks');
  const tFeatures = useTranslations('features');
  const tTestimonials = useTranslations('testimonials');
  const tCta = useTranslations('ctaSection');
  const tFooter = useTranslations('footer');

  const { data: session } = useSession();
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.97]);

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[90vh] flex flex-col items-center justify-center section-padding pt-28 sm:pt-36 overflow-hidden">

        {/* Neural Network Background */}
        <NeuralBackground />

        {/* Subtle Light Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/40 via-transparent to-slate-50 pointer-events-none z-0" />

        <motion.div
          style={{ scale: heroScale }}
          className="container-apple text-center relative z-10 flex flex-col items-center"
        >
          {/* Live Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6"
          >
            <div className="flex items-center rounded-full py-1.5 px-4 gap-2 bg-blue-50 border border-blue-200/80 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full bg-blue-600 h-2 w-2" />
              </span>
              <div className="tracking-[1px] uppercase inline-block text-blue-700 font-['Inter',system-ui,sans-serif] font-bold text-xs">
                {tHero('badge')}
              </div>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[44px] md:text-[68px] text-center tracking-tight leading-[1.08] mb-2 text-slate-900 font-['Space_Grotesk',system-ui,sans-serif] font-bold"
          >
            {tHero('headline')}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-[44px] md:text-[68px] text-center tracking-tight leading-[1.08] mb-6 bg-clip-text text-transparent font-['Space_Grotesk',system-ui,sans-serif] font-bold" 
            style={{ backgroundImage: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #7C3AED 100%)' }}
          >
            {tHero('headlineHighlight')}
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-base sm:text-lg leading-relaxed text-center max-w-[640px] mx-auto mb-8 text-slate-600 font-['Inter',system-ui,sans-serif]"
          >
            {tHero('subheadline')}
          </motion.p>

          {/* System Status Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 mb-8"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
              </svg>
              <div className="font-mono font-semibold text-xs text-slate-700">
                NEURAL CORE: BI-LSTM ONLINE
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <div className="font-mono font-semibold text-xs text-slate-700">
                LATENCY: 12ms
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-xs">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#7C3AED" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              <div className="font-mono font-semibold text-xs text-slate-700">
                22 FEATURES INGESTION
              </div>
            </div>
          </motion.div>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3.5 mb-8"
          >
            <Link href="/xauusd-neural-lab">
              <button className="px-8 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 hover:shadow-xl transition-all cursor-pointer flex items-center gap-2">
                <span>🧠</span>
                <span>Buka PICA Neural Lab</span>
                <ArrowRightIcon size="sm" />
              </button>
            </Link>
            <Link href="/analisa-market">
              <button className="px-8 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-base shadow-xs hover:shadow-md transition-all cursor-pointer">
                Analisa Market
              </button>
            </Link>
          </motion.div>

          {/* App Grid Launcher */}
          <AppGrid />

          {/* Neural Lab Showcase - Placed prominently on the Homepage */}
          <div className="w-full mt-4">
            <NeuralLabShowcase />
          </div>

          {/* Daily Performance Section */}
          <div className="w-full mt-4 mb-4">
            <DailyPerformanceSection />
          </div>

          {/* Video Showcase */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6 mb-4 w-full"
          >
            <VideoShowcase />
          </motion.div>

        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-slate-200/80 relative overflow-hidden">
        <div className="container-wide relative z-10">
          <StatsCounter tStats={tStats} />
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-6 border-b border-slate-200 bg-slate-50/50">
        <div className="container-wide">
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-slate-600 text-sm font-medium">
            {[
              tTrust('freeBasic'), tTrust('noCreditCard'), tTrust('fastSignup'), tTrust('telegramSupport')
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircleSolidIcon className="text-emerald-600" size="md" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Interactive Tutorial Section */}
      <section className="section-padding bg-slate-50">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="badge-apple mb-4 inline-flex">{tHowItWorks('badge')}</span>
            <h2 className="headline-lg mb-3">
              {tHowItWorks('title')}
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              {tHowItWorks('desc')}
            </p>
          </motion.div>

          <TutorialTabs tHowItWorks={tHowItWorks} />
        </div>
      </section>

      {/* Features Section - Institutional Edge */}
      <section className="w-full relative py-20 px-6 md:px-20 antialiased bg-white border-t border-slate-200/80 overflow-hidden">
        <div className="container-wide relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center mb-14"
          >
            <div className="flex items-center mb-4 rounded-full py-1.5 px-4 gap-2 bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs uppercase tracking-wider">
              <SparklesIcon size="sm" className="text-blue-600 w-3.5 h-3.5" />
              <span>{tFeatures('badge')}</span>
            </div>
            <div className="text-center mb-3 text-slate-900 font-['Space_Grotesk',system-ui,sans-serif] font-bold text-3xl md:text-5xl tracking-tight">
              {tFeatures('title')}
            </div>
            <div className="text-base sm:text-lg text-center max-w-[600px] text-slate-600 font-['Inter',system-ui,sans-serif]">
              {tFeatures('subtitle')}
            </div>
          </motion.div>

          {/* Grid Layout in Pure Light Design */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full max-w-[1100px] gap-6">
            {[
              {
                icon: <FireIcon className="text-amber-600 w-7 h-7" />,
                title: tFeatures('items.heatmap.title'),
                desc: tFeatures('items.heatmap.desc'),
                badge: tFeatures('items.heatmap.badge'),
                borderColor: 'border-amber-200',
                iconBg: 'bg-amber-50',
              },
              {
                icon: <TrophyIcon className="text-emerald-600 w-7 h-7" />,
                title: tFeatures('items.stock.title'),
                desc: tFeatures('items.stock.desc'),
                badge: tFeatures('items.stock.badge'),
                borderColor: 'border-emerald-200',
                iconBg: 'bg-emerald-50',
              },
              {
                icon: <CpuChipIcon className="text-blue-600 w-7 h-7" />,
                title: tFeatures('items.ai.title'),
                desc: tFeatures('items.ai.desc'),
                badge: tFeatures('items.ai.badge'),
                borderColor: 'border-blue-200',
                iconBg: 'bg-blue-50',
              },
              {
                icon: <CrosshairIcon className="text-cyan-600 w-7 h-7" />,
                title: tFeatures('items.zones.title'),
                desc: tFeatures('items.zones.desc'),
                badge: tFeatures('items.zones.badge'),
                borderColor: 'border-cyan-200',
                iconBg: 'bg-cyan-50',
              },
              {
                icon: <ChartIcon className="text-rose-600 w-7 h-7" />,
                title: tFeatures('items.thesis.title'),
                desc: tFeatures('items.thesis.desc'),
                badge: tFeatures('items.thesis.badge'),
                borderColor: 'border-rose-200',
                iconBg: 'bg-rose-50',
              },
              {
                icon: <SignalIcon className="text-indigo-600 w-7 h-7" />,
                title: tFeatures('items.updates.title'),
                desc: tFeatures('items.updates.desc'),
                badge: tFeatures('items.updates.badge'),
                borderColor: 'border-indigo-200',
                iconBg: 'bg-indigo-50',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="relative rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-lg p-8 transition-all duration-300 group hover:border-blue-300"
              >
                <div className={`flex items-center justify-center mb-6 rounded-2xl size-14 ${feature.iconBg} ${feature.borderColor} border`}>
                  {feature.icon}
                </div>
                <div className="mb-2 text-slate-900 font-['Inter',system-ui,sans-serif] font-bold text-xl group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </div>
                <div className="text-sm leading-relaxed text-slate-600 font-['Inter',system-ui,sans-serif]">
                  {feature.desc}
                </div>
                <div className="absolute top-6 right-6 inline-block rounded-lg py-1 px-2.5 bg-slate-100 border border-slate-200">
                  <div className="inline-block tracking-[0.5px] text-slate-600 font-bold text-[10px] uppercase">
                    {feature.badge}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App Download Section */}
      <DownloadAppSection />

      {/* Testimonials Section */}
      <section className="section-padding bg-slate-50 border-t border-slate-200">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wider mb-4">
              <StarSolidIcon size="sm" className="text-amber-500" />
              {tTestimonials('title')}
            </span>
            <h2 className="headline-lg mb-3">
              {tTestimonials('title')}
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              {tTestimonials('desc')}
            </p>
          </motion.div>

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              {
                name: 'Rizky Pratama',
                role: 'Day Trader • Jakarta',
                avatar: 'RP',
                text: tTestimonials('items.0.text'),
                color: 'from-blue-600 to-indigo-600',
              },
              {
                name: 'Dewi Anggraini',
                role: 'Swing Trader • Surabaya',
                avatar: 'DA',
                text: tTestimonials('items.1.text'),
                color: 'from-purple-600 to-pink-600',
              },
              {
                name: 'Budi Santoso',
                role: 'Part-time Trader • Bandung',
                avatar: 'BS',
                text: tTestimonials('items.2.text'),
                color: 'from-amber-600 to-orange-600',
              },
              {
                name: 'Andi Setiawan',
                role: 'Full-time Trader • Jakarta',
                avatar: 'AS',
                text: 'PICA Neural Lab sangat membantu membaca manipulasi pasar Gold. Heatmap dan probability zone nya luar biasa akurat.',
                color: 'from-emerald-600 to-green-600',
              },
              {
                name: 'Siti Nurhaliza',
                role: 'Investor • Yogyakarta',
                avatar: 'SN',
                text: 'Analisa saham PICA menghemat waktu riset saya. Insight kuantitatifnya sangat tajam, portofolio saya konsisten bertumbuh.',
                color: 'from-rose-600 to-red-600',
              },
              {
                name: 'Ahmad Fauzi',
                role: 'Scalper • Medan',
                avatar: 'AF',
                text: 'Bi-LSTM neural prediction di XAUUSD memberikan konfirmasi entry sebelum pergerakan besar dimulai. Tool wajib trader!',
                color: 'from-indigo-600 to-blue-600',
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{testimonial.name}</h4>
                    <p className="text-xs text-slate-500">{testimonial.role}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                      VERIFIED
                    </span>
                  </div>
                </div>

                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <StarSolidIcon key={i} className="text-amber-400" size="sm" />
                  ))}
                </div>

                <p className="text-slate-600 leading-relaxed text-sm">
                  &ldquo;{testimonial.text}&rdquo;
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 md:px-20 bg-slate-50">
        <div className="w-full max-w-[1000px] mx-auto rounded-[2.5rem] p-10 md:p-16 text-center bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
          
          <div className="relative z-10 flex flex-col items-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold mb-4 tracking-wide">
              {tCta('promoBadge')}
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
              {tCta('title')}
            </h2>
            <p className="text-base md:text-lg text-blue-100 max-w-xl mx-auto mb-8">
              {tCta('desc')}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mb-8 text-sm text-blue-100">
              <div className="flex items-center gap-2">
                <CheckCircleSolidIcon className="text-emerald-400" size="sm" />
                <span>Akun BASIC Gratis Selamanya</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleSolidIcon className="text-emerald-400" size="sm" />
                <span>Tanpa Kartu Kredit</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleSolidIcon className="text-emerald-400" size="sm" />
                <span>Bisa Upgrade Kapan Saja</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <Link href={session ? '/xauusd-neural-lab' : '/login'}>
                <button className="px-8 py-3.5 rounded-xl bg-white text-blue-700 font-bold text-base hover:bg-blue-50 transition-all shadow-md cursor-pointer flex items-center gap-2">
                  <span>Mulai Sekarang — Gratis</span>
                  <ArrowRightIcon size="sm" />
                </button>
              </Link>
              <Link href="/pricing">
                <button className="px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/30 font-semibold text-base transition-all cursor-pointer">
                  Lihat Paket PRO &amp; VVIP
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-12 border-t border-slate-200 bg-white antialiased px-6 md:px-20">
        <div className="flex flex-col md:flex-row justify-between mb-12 gap-8 max-w-[1200px] mx-auto">
          <div className="flex flex-col max-w-[320px] gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                P
              </div>
              <span className="tracking-tight text-blue-700 font-['Space_Grotesk',system-ui,sans-serif] font-bold text-2xl">
                PICA
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              Platform kuantitatif trading AI terdepan di Indonesia. Didukung oleh PICA Neural Lab &amp; Deep Learning Multi-Layer.
            </p>
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap gap-10 md:gap-20">
            <div className="flex flex-col gap-3">
              <span className="uppercase tracking-[1.5px] text-slate-900 font-bold text-xs">
                Fitur Unggulan
              </span>
              <div className="flex flex-col gap-2.5">
                <Link href="/xauusd-neural-lab" className="text-slate-600 text-sm hover:text-blue-600 font-medium">PICA Neural Lab</Link>
                <Link href="/analisa-market" className="text-slate-600 text-sm hover:text-blue-600">Analisa Market</Link>
                <Link href="/dom-arra" className="text-slate-600 text-sm hover:text-blue-600">Bookmap PICA</Link>
                <Link href="/analisa-saham" className="text-slate-600 text-sm hover:text-blue-600">AI Doctor</Link>
                <Link href="/journal" className="text-slate-600 text-sm hover:text-blue-600">Trade Journal</Link>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <span className="uppercase tracking-[1.5px] text-slate-900 font-bold text-xs">
                Legal
              </span>
              <div className="flex flex-col gap-2.5">
                <Link href="/terms" className="text-slate-600 text-sm hover:text-blue-600">{tFooter('terms')}</Link>
                <Link href="/privacy" className="text-slate-600 text-sm hover:text-blue-600">{tFooter('privacy')}</Link>
                <Link href="/faq" className="text-slate-600 text-sm hover:text-blue-600">{tFooter('faq')}</Link>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <span className="uppercase tracking-[1.5px] text-slate-900 font-bold text-xs">
                Hubungi Kami
              </span>
              <div className="flex flex-col gap-2.5">
                <a href="https://t.me/arrareborn" target="_blank" rel="noreferrer" className="text-slate-600 text-sm hover:text-blue-600">Telegram Community</a>
                <Link href="/pricing" className="text-slate-600 text-sm hover:text-blue-600">Upgrade Plan</Link>
                <Link href="/faq" className="text-slate-600 text-sm hover:text-blue-600">Bantuan Support</Link>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-100 gap-4 max-w-[1200px] mx-auto text-sm text-slate-500">
          <div>
            {tFooter('copyright')}
          </div>
          <div>
            Platform AI Analisis Pasar Kuantitatif • High Precision Intelligence
          </div>
        </div>
      </footer>
    </div>
  );
}
