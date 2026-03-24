'use client';
// Force deployment trigger

import { motion, useScroll, useTransform, AnimatePresence, useInView, animate } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { ArrowRightIcon, ChartIcon, CpuChipIcon, SparklesIcon, StarSolidIcon, RocketIcon, TrophyIcon, BellIcon, CrosshairIcon, CurrencyIcon, CheckCircleSolidIcon, FireIcon, ScaleIcon, SignalIcon, UsersIcon, GlobeIcon } from '@/components/PremiumIcons';
import DownloadAppSection from '@/components/home/DownloadAppSection';
import DailyPerformanceSection from '@/components/home/DailyPerformanceSection';
import AppGrid from '@/components/home/AppGrid';
import NeuralBackground from '@/components/home/NeuralBackground';
import VideoShowcase from '@/components/home/VideoShowcase';

// Stats Counter Component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatsCounter({ tStats }: { tStats: any }) {
  const [stats, setStats] = useState({ users: 100, predictions: 5000, accuracy: 92.5 });
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    // Fetch real stats
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
    <div ref={ref} className="[font-synthesis:none] flex flex-col items-center w-full relative px-6 md:px-20 antialiased text-xs/4">
      <div className="flex flex-wrap md:flex-nowrap justify-between w-full max-w-[1000px] py-10 border-t border-t-solid border-t-[#FFFFFF0D] border-b border-b-solid border-b-[#FFFFFF0D] gap-8 md:gap-0">
        
        <div className="flex flex-col items-center grow shrink basis-1/2 md:basis-[0%]">
          <div className="[letter-spacing:-1px] mb-2 inline-block text-[#F8FAFC] font-['Space_Grotesk',system-ui,sans-serif] font-bold text-4xl/11">
            <StatItem value={stats.users} suffix="+" decimals={0} isInView={isInView} />
          </div>
          <div className="tracking-[1.5px] uppercase inline-block text-[#64748B] font-['Inter',system-ui,sans-serif] font-semibold text-[11px]/3.5 text-center">
            {tStats('activeTraders')}
          </div>
        </div>

        <div className="hidden md:block w-px bg-[#FFFFFF0D] shrink-0" />

        <div className="flex flex-col items-center grow shrink basis-1/2 md:basis-[0%]">
          <div className="[letter-spacing:-1px] mb-2 inline-block text-[#F8FAFC] font-['Space_Grotesk',system-ui,sans-serif] font-bold text-4xl/11">
            <StatItem value={stats.predictions} suffix="" decimals={0} isInView={isInView} />
          </div>
          <div className="tracking-[1.5px] uppercase inline-block text-[#64748B] font-['Inter',system-ui,sans-serif] font-semibold text-[11px]/3.5 text-center">
            AI Predictions
          </div>
        </div>

        <div className="hidden md:block w-px bg-[#FFFFFF0D] shrink-0" />

        <div className="flex flex-col items-center grow shrink basis-1/2 md:basis-[0%]">
          <div className="[letter-spacing:-1px] mb-2 inline-block text-[#F8FAFC] font-['Space_Grotesk',system-ui,sans-serif] font-bold text-4xl/11">
            <StatItem value={stats.accuracy} suffix="%" decimals={1} isInView={isInView} />
          </div>
          <div className="tracking-[1.5px] uppercase inline-block text-[#64748B] font-['Inter',system-ui,sans-serif] font-semibold text-[11px]/3.5 text-center">
            {tStats('signalAccuracy')}
          </div>
        </div>

        <div className="hidden md:block w-px bg-[#FFFFFF0D] shrink-0" />

        <div className="flex flex-col items-center grow shrink basis-1/2 md:basis-[0%]">
          <div className="[letter-spacing:-1px] mb-2 inline-block text-[#F8FAFC] font-['Space_Grotesk',system-ui,sans-serif] font-bold text-4xl/11">
            <StatItem value={50} suffix="+" decimals={0} isInView={isInView} />
          </div>
          <div className="tracking-[1.5px] uppercase inline-block text-[#64748B] font-['Inter',system-ui,sans-serif] font-semibold text-[11px]/3.5 text-center">
            Supported Pairs
          </div>
        </div>

      </div>

      <div className="flex flex-wrap md:flex-nowrap items-center justify-center mt-8 gap-4 md:gap-10">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22C55E" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="inline-block text-[#94A3B8] font-['Inter',system-ui,sans-serif] font-medium text-xs/4">
            Gratis Selamanya untuk BASIC
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22C55E" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="inline-block text-[#94A3B8] font-['Inter',system-ui,sans-serif] font-medium text-xs/4">
            Tanpa Kartu Kredit
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22C55E" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="inline-block text-[#94A3B8] font-['Inter',system-ui,sans-serif] font-medium text-xs/4">
            Daftar dalam 30 Detik
          </div>
        </div>
        <div className="flex items-center gap-2">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22C55E" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="inline-block text-[#94A3B8] font-['Inter',system-ui,sans-serif] font-medium text-xs/4">
            Support via Telegram
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, value, label, suffix, decimals = 0, isInView }: any) {
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
    <div className="text-center p-6 group hover:bg-[var(--bg-primary)]/50 hover:dark:bg-[var(--bg-primary)]/5 rounded-2xl transition-all duration-500">
      <div className="mb-4 flex justify-center group-hover:scale-110 transition-transform duration-500">{icon}</div>
      <div className="text-3xl md:text-4xl font-bold text-[var(--text-primary)] mb-1 flex justify-center items-center gap-0.5">
        <span ref={nodeRef}>0</span>
        <span>{suffix}</span>
      </div>
      <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider">{label}</p>
    </div>
  );
}

type TutorialTab = 'bookmap' | 'forex' | 'stock' | 'doctor' | 'sentiment';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TutorialTabs({ tHowItWorks }: { tHowItWorks: any }) {
  const [activeTab, setActiveTab] = useState<TutorialTab>('bookmap');

  const tabConfig = {
    bookmap: {
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      textColor: 'text-amber-400',
      icon: <FireIcon className="text-amber-400" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <CrosshairIcon key="1" className="text-amber-400" size="lg" />,
        <ChartIcon key="2" className="text-amber-400" size="lg" />,
        <SignalIcon key="3" className="text-amber-400" size="lg" />,
        <SparklesIcon key="4" className="text-amber-400" size="lg" />,
      ],
    },
    forex: {
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400',
      icon: <CurrencyIcon className="text-blue-400" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <ScaleIcon key="1" className="text-blue-400" size="lg" />,
        <ChartIcon key="2" className="text-blue-400" size="lg" />,
        <CpuChipIcon key="3" className="text-blue-400" size="lg" />,
        <CheckCircleSolidIcon key="4" className="text-blue-400" size="lg" />,
      ],
    },
    stock: {
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20',
      textColor: 'text-green-400',
      icon: <TrophyIcon className="text-green-400" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <CrosshairIcon key="1" className="text-green-400" size="lg" />,
        <ScaleIcon key="2" className="text-green-400" size="lg" />,
        <RocketIcon key="3" className="text-green-400" size="lg" />,
        <SparklesIcon key="4" className="text-green-400" size="lg" />,
      ],
    },
    doctor: {
      color: 'from-rose-500 to-red-500',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      textColor: 'text-rose-400',
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
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      textColor: 'text-purple-400',
      icon: <SparklesIcon className="text-purple-400" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <ScaleIcon key="1" className="text-purple-400" size="lg" />,
        <BellIcon key="2" className="text-purple-400" size="lg" />,
        <SignalIcon key="3" className="text-purple-400" size="lg" />,
        <CrosshairIcon key="4" className="text-purple-400" size="lg" />,
      ],
    },
  };

  const config = tabConfig[activeTab];

  return (
    <div>
      {/* Tab Buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {(['bookmap', 'forex', 'stock', 'doctor', 'sentiment'] as TutorialTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === tab
              ? `bg-gradient-to-r ${tabConfig[tab].color} text-white shadow-lg scale-105`
              : 'bg-[var(--bg-primary)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
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
              className={`relative ${config.bgColor} ${config.borderColor} border rounded-2xl p-6 text-center hover:shadow-lg transition-all`}
            >
              {/* Step Number Badge */}
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-r ${config.color} text-white text-sm font-bold flex items-center justify-center shadow-md`}>
                {i + 1}
              </div>

              {/* Icon */}
              <div className="w-14 h-14 mx-auto rounded-xl bg-[var(--bg-primary)]/80 flex items-center justify-center mb-4 mt-2 shadow-sm">
                {config.stepIcons[i]}
              </div>

              {/* Title & Description */}
              <h3 className={`text-lg font-semibold ${config.textColor} mb-2`}>
                {tHowItWorks(`${activeTab}.${step}.title`)}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
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
        <Link href={activeTab === 'bookmap' ? '/dom-arra' : activeTab === 'forex' ? '/analisa-market' : '/analisa-saham'}>
          <button className={`btn-primary bg-gradient-to-r ${config.color} border-none shadow-lg`}>
            Coba {tHowItWorks(`tabs.${activeTab}`)} Sekarang
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


  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

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
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center section-padding pt-32 overflow-hidden">

        {/* Neural Network Background */}
        <NeuralBackground />

        {/* Gradient Overlay for Depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080A0F]/50 to-[#080A0F] z-0 pointer-events-none" />

        <motion.div
          style={{ scale: heroScale }}
           className="container-apple text-center relative z-10 flex flex-col items-center"
        >
          {/* Live Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div className="flex items-center rounded-full py-1.5 px-4.5 gap-2 bg-[#3B82F60F] border border-solid border-[#3B82F626] backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-[50%] bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.5)] shrink-0 h-2 w-2" />
              </span>
              <div className="tracking-[1.5px] uppercase inline-block text-[#60A5FA] font-['Inter',system-ui,sans-serif] font-semibold text-xs/4">
                {tHero('badge')}
              </div>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[50px] md:text-[72px] text-center tracking-tight md:-tracking-[3px] leading-tight md:leading-[100%] mb-1 text-[#F8FAFC] font-['Space_Grotesk',system-ui,sans-serif] font-bold"
          >
            {tHero('headline')}
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-[50px] md:text-[72px] text-center tracking-tight md:-tracking-[3px] leading-tight md:leading-[100%] mb-7 bg-clip-text text-transparent font-['Space_Grotesk',system-ui,sans-serif] font-bold" 
            style={{ backgroundImage: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 50%, #8B5CF6 100%)' }}
          >
            {tHero('headlineHighlight')}
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-[17px] leading-[175%] text-center max-w-[620px] mx-auto mb-10 text-[#94A3B8] font-['Inter',system-ui,sans-serif]"
          >
            {tHero('subheadline')}
          </motion.p>

          {/* System Status Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center items-center gap-6 md:gap-8 mb-12"
          >
            <div className="flex items-center gap-2">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#3B82F6" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
              </svg>
              <div className="tracking-[0.5px] inline-block text-[#475569] font-['JetBrains_Mono',monospace,system-ui] font-medium text-[10px]/3">
                NEURAL CORE: ONLINE
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#22C55E" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.008v.007H12V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <div className="tracking-[0.5px] inline-block text-[#475569] font-['JetBrains_Mono',monospace,system-ui] font-medium text-[10px]/3">
                LATENCY: 12ms
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#8B5CF6" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
              <div className="tracking-[0.5px] inline-block text-[#475569] font-['JetBrains_Mono',monospace,system-ui] font-medium text-[10px]/3">
                NODES: 5.2M
              </div>
            </div>
          </motion.div>

          {/* App Grid Launcher - Replaces CTA Buttons */}
          <AppGrid />

          {/* Daily Performance Section - Placed below menu buttons */}
          <div className="mt-16 mb-8 w-full relative z-20">
            <DailyPerformanceSection />
          </div>

          {/* Video Showcase - Moved here for better visibility */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 mb-8 w-full"
          >
            <VideoShowcase />
          </motion.div>

        </motion.div>
      </section>
      {/* Stats Section - Dynamic & Premium */}
      <section className="py-20 bg-[var(--bg-secondary)] relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="container-wide relative z-10">
          <StatsCounter tStats={tStats} />
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 border-y border-[var(--border-light)]">
        <div className="container-wide">
          <div className="flex flex-wrap items-center justify-center gap-8 text-[var(--text-muted)] text-sm">
            {[
              tTrust('freeBasic'), tTrust('noCreditCard'), tTrust('fastSignup'), tTrust('telegramSupport')
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircleSolidIcon className="text-green-500" size="md" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Interactive Tutorial Section */}
      <section className="section-padding">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="badge-apple mb-4 inline-flex">{tHowItWorks('badge')}</span>
            <h2 className="headline-lg mb-4">
              {tHowItWorks('title')}
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              {tHowItWorks('desc')}
            </p>
          </motion.div>

          {/* Tutorial Tabs Component */}
          <TutorialTabs tHowItWorks={tHowItWorks} />
        </div>
      </section>

      {/* Features Section - Institutional Edge */}
      <section className="[font-synthesis:none] w-full relative py-25 md:px-20 antialiased text-xs/4 bg-[#080A0F] overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl mix-blend-screen" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl mix-blend-screen" />
        </div>

        <div className="container-wide relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center mb-16"
          >
            <div className="flex items-center mb-6 rounded-[999px] py-1.5 px-4 gap-2 bg-[#3B82F60F] border border-solid border-[#3B82F626]">
              <SparklesIcon size="sm" className="text-blue-400 w-[14px] h-[14px]" />
              <div className="tracking-[1px] inline-block text-[#60A5FA] font-['Inter',system-ui,sans-serif] font-bold text-[11px]/3.5 uppercase">
                {tFeatures('badge')}
              </div>
            </div>
            <div className="[letter-spacing:-2px] text-center mb-4 text-[#F8FAFC] font-['Space_Grotesk',system-ui,sans-serif] font-bold text-4xl md:text-5xl/14.5">
              {tFeatures('title')}
            </div>
            <div className="text-[18px] text-center max-w-[580px] leading-[round(up,160%,1px)] text-[#94A3B8] font-['Inter',system-ui,sans-serif]">
              {tFeatures('subtitle')}
            </div>
          </motion.div>

          {/* Grid Layout matching Paper but using responsive tailwind grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full max-w-[1100px] gap-6">
            {[
              {
                icon: <FireIcon className="text-[#F59E0B] w-7 h-7" />,
                title: tFeatures('items.heatmap.title'),
                desc: tFeatures('items.heatmap.desc'),
                badge: tFeatures('items.heatmap.badge'),
                borderColor: 'border-[#F59E0B4D]',
                bgGradient: 'radial-gradient(circle farthest-corner at 50% 50% in oklab, oklab(76.9% 0.056 0.155 / 10%) 0%, oklab(0% 0 .0001 / 0%) 70%)',
                iconBg: 'linear-gradient(in oklab 135deg, oklab(76.9% 0.056 0.155 / 15%) 0%, oklab(66.6% 0.083 0.134 / 15%) 100%)'
              },
              {
                icon: <TrophyIcon className="text-[#10B981] w-7 h-7" />,
                title: tFeatures('items.stock.title'),
                desc: tFeatures('items.stock.desc'),
                badge: tFeatures('items.stock.badge'),
                borderColor: 'border-[#10B9814D]',
                bgGradient: 'radial-gradient(circle farthest-corner at 50% 50% in oklab, oklab(69.6% -0.142 0.045 / 10%) 0%, oklab(0% -.0001 0 / 0%) 70%)',
                iconBg: 'linear-gradient(in oklab 135deg, oklab(69.6% -0.142 0.045 / 15%) 0%, oklab(59.6% -0.122 0.037 / 15%) 100%)'
              },
              {
                icon: <CpuChipIcon className="text-[#8B5CF6] w-7 h-7" />,
                title: tFeatures('items.ai.title'),
                desc: tFeatures('items.ai.desc'),
                badge: tFeatures('items.ai.badge'),
                borderColor: 'border-[#8B5CF64D]',
                bgGradient: 'radial-gradient(circle farthest-corner at 50% 50% in oklab, oklab(60.6% 0.085 -0.202 / 10%) 0%, oklab(0% 0 -.0001 / 0%) 70%)',
                iconBg: 'linear-gradient(in oklab 135deg, oklab(60.6% 0.085 -0.202 / 15%) 0%, oklab(54.1% 0.096 -0.227 / 15%) 100%)'
              },
              {
                icon: <CrosshairIcon className="text-[#06B6D4] w-7 h-7" />,
                title: tFeatures('items.zones.title'),
                desc: tFeatures('items.zones.desc'),
                badge: tFeatures('items.zones.badge'),
                borderColor: 'border-[#06B6D44D]',
                bgGradient: 'radial-gradient(circle farthest-corner at 50% 50% in oklab, oklab(71.5% -0.103 -0.073 / 10%) 0%, oklab(0% -.0001 -.0001 / 0%) 70%)',
                iconBg: 'linear-gradient(in oklab 135deg, oklab(71.5% -0.103 -0.073 / 15%) 0%, oklab(60.9% -0.083 -0.074 / 15%) 100%)'
              },
              {
                icon: <ChartIcon className="text-[#F43F5E] w-7 h-7" />,
                title: tFeatures('items.thesis.title'),
                desc: tFeatures('items.thesis.desc'),
                badge: tFeatures('items.thesis.badge'),
                borderColor: 'border-[#F43F5E4D]',
                bgGradient: 'radial-gradient(circle farthest-corner at 50% 50% in oklab, oklab(64.5% 0.207 0.061 / 10%) 0%, oklab(0% .0001 0 / 0%) 70%)',
                iconBg: 'linear-gradient(in oklab 135deg, oklab(64.5% 0.207 0.061 / 15%) 0%, oklab(58.6% 0.212 0.067 / 15%) 100%)'
              },
              {
                icon: <SignalIcon className="text-[#6366F1] w-7 h-7" />,
                title: tFeatures('items.updates.title'),
                desc: tFeatures('items.updates.desc'),
                badge: tFeatures('items.updates.badge'),
                borderColor: 'border-[#6366F14D]',
                bgGradient: 'radial-gradient(circle farthest-corner at 50% 50% in oklab, oklab(58.5% 0.025 -0.202 / 10%) 0%, oklab(0% 0 -.0001 / 0%) 70%)',
                iconBg: 'linear-gradient(in oklab 135deg, oklab(58.5% 0.025 -0.202 / 15%) 0%, oklab(51.1% 0.028 -0.228 / 15%) 100%)'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="relative rounded-3xl overflow-clip bg-[#FFFFFF05] border border-solid border-[#FFFFFF0D] [box-shadow:#00000033_0px_10px_40px] p-8 md:p-10 transition-all duration-300 group hover:border-[#FFFFFF26]"
              >
                <div 
                  className={`flex items-center justify-center mb-6 rounded-2xl bg-origin-border border border-solid size-14 ${feature.borderColor}`} 
                  style={{ backgroundImage: feature.iconBg }}
                >
                  {feature.icon}
                </div>
                <div className="mb-3 [letter-spacing:-0.5px] text-[#F8FAFC] font-['Inter',system-ui,sans-serif] font-bold text-xl/6 group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </div>
                <div className="text-[14px] leading-[round(up,160%,1px)] text-[#94A3B8] font-['Inter',system-ui,sans-serif]">
                  {feature.desc}
                </div>
                <div className="absolute top-0 right-0 w-37.5 h-37.5 rounded-tr-3xl pointer-events-none" style={{ backgroundImage: feature.bgGradient }} />
                <div className="absolute top-6 right-6 inline-block rounded-lg py-1 px-2.5 bg-[#FFFFFF0D] border border-solid border-[#FFFFFF1A]">
                  <div className="inline-block tracking-[0.5px] text-[#64748B] font-['Inter',system-ui,sans-serif] font-bold text-[10px]/3 uppercase">
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

      {/* Testimonials Section - Enhanced with Screenshots */}
      <section className="section-padding bg-[var(--bg-secondary)]">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold tracking-wider mb-6">
              <StarSolidIcon size="sm" className="text-purple-400" />
              {tTestimonials('title')}
            </span>
            <h2 className="headline-lg mb-4">
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {[
              {
                name: 'Rizky Pratama',
                role: 'Day Trader • Jakarta',
                avatar: 'RP',
                text: tTestimonials('items.0.text'),
                color: 'from-blue-500 to-cyan-500',
                image: '/testimonials/1.jpg',
              },
              {
                name: 'Dewi Anggraini',
                role: 'Swing Trader • Surabaya',
                avatar: 'DA',
                text: tTestimonials('items.1.text'),
                color: 'from-purple-500 to-pink-500',
                image: '/testimonials/2.jpg',
              },
              {
                name: 'Budi Santoso',
                role: 'Part-time Trader • Bandung',
                avatar: 'BS',
                text: tTestimonials('items.2.text'),
                color: 'from-amber-500 to-orange-500',
                image: '/testimonials/3.jpg',
              },
              {
                name: 'Andi Setiawan',
                role: 'Full-time Trader • Jakarta',
                avatar: 'AS',
                text: 'ARRA7 helped me identify market manipulation. The heatmap is insane, I can see exactly where the whales are placing orders!',
                color: 'from-emerald-500 to-green-500',
                image: '/testimonials/4.jpg',
              },
              {
                name: 'Siti Nurhaliza',
                role: 'Investor • Yogyakarta',
                avatar: 'SN',
                text: 'The stock analysis feature saved me hours of research. AI picks are incredibly accurate, my portfolio is up 35% this quarter.',
                color: 'from-rose-500 to-red-500',
                image: '/testimonials/5.jpg',
              },
              {
                name: 'Ahmad Fauzi',
                role: 'Scalper • Medan',
                avatar: 'AF',
                text: 'Real-time sentiment analysis is a game changer. I can enter trades before the news hits mainstream media. Unfair advantage!',
                color: 'from-indigo-500 to-blue-500',
                image: '/testimonials/6.jpg',
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group relative bg-[var(--bg-primary)] rounded-3xl overflow-hidden border border-[var(--border-light)] hover:border-blue-500/30 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2"
              >
                {/* Screenshot Image */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={testimonial.image}
                    alt={`${testimonial.name} testimonial screenshot`}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  {/* Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent`} />

                  {/* Floating Avatar */}
                  <div className={`absolute top-4 left-4 w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-bold shadow-xl ring-4 ring-white/20`}>
                    {testimonial.avatar}
                  </div>
                </div>

                {/* Content Card Overlay */}
                <div className="relative p-6">
                  {/* Stars */}
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <StarSolidIcon key={i} className="text-amber-400" size="sm" />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-[var(--text-secondary)] leading-relaxed mb-4 text-sm line-clamp-4">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>

                  {/* User Info */}
                  <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-light)]">
                    <div>
                      <h4 className="font-semibold text-[var(--text-primary)] text-sm">{testimonial.name}</h4>
                      <p className="text-xs text-[var(--text-muted)]">{testimonial.role}</p>
                    </div>
                  </div>

                  {/* Verified Badge */}
                  <div className="absolute top-6 right-6">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-bold">
                      <CheckCircleSolidIcon size="sm" />
                      VERIFIED
                    </span>
                  </div>
                </div>

                {/* Decorative Glow */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${testimonial.color} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10`} />
              </motion.div>
            ))}
          </motion.div>

          {/* CTA to See More Testimonials */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center mt-12"
          >
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Join 100+ profitable traders using ARRA7 AI
            </p>
            <Link href="/login">
              <button className="btn-primary bg-gradient-to-r from-blue-500 to-purple-500 border-none shadow-lg">
                Start Free Trial
                <ArrowRightIcon className="ml-2" size="sm" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section with Urgency */}
      <section className="[font-synthesis:none] flex flex-col items-center w-full relative py-12 md:pt-15 md:pb-25 antialiased text-xs/4 px-6 md:px-20 bg-[#080A0F]">
        <div className="w-full max-w-[1000px] flex flex-col items-center relative rounded-[2rem] py-16 px-6 md:px-10 overflow-clip border border-solid border-[#3B82F633] shadow-[0_20px_60px_rgba(0,0,0,0.3)]" style={{ backgroundImage: 'linear-gradient(180deg, rgba(30,58,138,0.5) 0%, rgba(15,23,42,0.8) 100%)' }}>
          
          {/* Top Edge Glow */}
          <div className="absolute -top-[100px] left-1/2 w-[400px] h-[150px] rounded-full bg-blue-500/30 blur-[80px] -translate-x-1/2 pointer-events-none" />
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center relative z-10 w-full"
          >
            <span className="inline-block px-4 py-2 rounded-full bg-[#FFFFFF1A] border border-[#FFFFFF26] text-[#F8FAFC] text-sm font-semibold mb-6 tracking-wide">
              {tCta('promoBadge')}
            </span>
            <div className="text-center mb-4 text-[#F8FAFC] font-['Space_Grotesk',system-ui,sans-serif] font-bold text-3xl md:text-[40px] md:leading-[1.2] tracking-tight">
              {tCta('title')}
            </div>
            <p className="text-base md:text-[18px] text-center max-w-[600px] leading-relaxed mb-8 text-[#94A3B8] font-['Inter',system-ui,sans-serif]">
              {tCta('desc')}
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-10 w-full">
              {[tCta('list.freeBasic'), tCta('list.noCreditCard'), tCta('list.cancelAnytime')].map((text, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#E2E8F0] font-medium">
                  <CheckCircleSolidIcon className="text-green-400" size="sm" />
                  {text}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full md:w-auto">
              <Link href={session ? '/analisa-market' : '/login'} className="w-full sm:w-auto">
                <div className="flex items-center justify-center rounded-[14px] py-3.5 px-9 gap-2 bg-[#E2E8F0] hover:bg-white transition-colors cursor-pointer shadow-[0_4px_20px_rgba(255,255,255,0.15)] w-full sm:w-auto">
                  <div className="text-[#0F172A] font-['Inter',system-ui,sans-serif] font-bold text-base">
                    {tCta('btnStart')}
                  </div>
                  <ArrowRightIcon className="text-[#0F172A]" size="sm" />
                </div>
              </Link>
              <Link href="/pricing" className="w-full sm:w-auto">
                <div className="flex items-center justify-center rounded-[14px] py-3.5 px-9 gap-2 bg-[#FFFFFF0D] hover:bg-[#FFFFFF1A] transition-colors cursor-pointer border border-solid border-[#FFFFFF1A] w-full sm:w-auto">
                  <div className="text-[#F8FAFC] font-['Inter',system-ui,sans-serif] font-semibold text-base">
                    {tCta('btnPro')}
                  </div>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#F8FAFC" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.48-3.903-7.174-6.208l1.293-.97c.362-.271.527-.733.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full relative py-12 border-t border-t-solid border-t-[#FFFFFF0D] bg-[#080A0F] antialiased px-6 md:px-20 overflow-hidden">
        {/* Subtle Background Elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between mb-16 gap-10 max-w-[1200px] mx-auto relative z-10 mt-6">
          <div className="flex flex-col max-w-[320px] gap-5">
            <div className="flex items-center">
              <div className="tracking-tight inline-block text-[#60A5FA] font-['Space_Grotesk',system-ui,sans-serif] font-bold text-3xl">
                ARRA
              </div>
              <div className="inline-block text-[#F8FAFC] font-['Space_Grotesk',system-ui,sans-serif] font-bold text-3xl">
                7
              </div>
            </div>
            <div className="text-[14px] leading-relaxed text-[#94A3B8] font-['Inter',system-ui,sans-serif]">
              {tFooter('subtitle') || 'Platform trading kuantitatif institusional pertama untuk retail di Indonesia. Didukung oleh AI dan Data Science.'}
            </div>
          </div>
          
          <div className="flex flex-wrap md:flex-nowrap gap-12 md:gap-24">
            <div className="flex flex-col gap-5">
              <div className="uppercase tracking-[1.5px] text-[#E2E8F0] font-['Inter',system-ui,sans-serif] font-bold text-[13px]">
                Produk
              </div>
              <div className="flex flex-col gap-4">
                <Link href="/analisa-market" className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-sm hover:text-blue-400 transition-colors">Analisa Market</Link>
                <Link href="/analisa-saham" className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-sm hover:text-blue-400 transition-colors">AI Doctor</Link>
                <Link href="/dom-arra" className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-sm hover:text-blue-400 transition-colors">Bookmap ARRA7</Link>
                <Link href="/journal" className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-sm hover:text-blue-400 transition-colors">Trade Journal</Link>
              </div>
            </div>
            
            <div className="flex flex-col gap-5">
              <div className="uppercase tracking-[1.5px] text-[#E2E8F0] font-['Inter',system-ui,sans-serif] font-bold text-[13px]">
                Legal
              </div>
              <div className="flex flex-col gap-4">
                <Link href="/terms" className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-sm hover:text-blue-400 transition-colors">{tFooter('terms')}</Link>
                <Link href="/privacy" className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-sm hover:text-blue-400 transition-colors">{tFooter('privacy')}</Link>
                <Link href="/faq" className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-sm hover:text-blue-400 transition-colors">{tFooter('faq')}</Link>
              </div>
            </div>
            
            <div className="flex flex-col gap-5">
              <div className="uppercase tracking-[1.5px] text-[#E2E8F0] font-['Inter',system-ui,sans-serif] font-bold text-[13px]">
                Hubungi Kami
              </div>
              <div className="flex flex-col gap-4">
                <a href="#" className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-sm hover:text-blue-400 transition-colors">Bantuan Support</a>
                <a href="#" className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-sm hover:text-blue-400 transition-colors">Telegram Community</a>
                <a href="#" className="text-[#94A3B8] font-['Inter',system-ui,sans-serif] text-sm hover:text-blue-400 transition-colors">Email Sales</a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center py-8 border-t border-t-solid border-[#FFFFFF0D] gap-6 md:gap-0 max-w-[1200px] mx-auto relative z-10">
          <div className="inline-block text-[#64748B] font-['Inter',system-ui,sans-serif] text-sm text-center md:text-left">
            {tFooter('copyright')}
          </div>
          <div className="flex gap-4">
            <div className="flex items-center justify-center rounded-lg bg-[#FFFFFF0D] hover:bg-[#FFFFFF1A] transition-colors cursor-pointer w-10 h-10 shadow-sm border border-[#FFFFFF1A]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
              </svg>
            </div>
            <div className="flex items-center justify-center rounded-lg bg-[#FFFFFF0D] hover:bg-[#FFFFFF1A] transition-colors cursor-pointer w-10 h-10 shadow-sm border border-[#FFFFFF1A]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <div className="flex items-center justify-center rounded-lg bg-[#FFFFFF0D] hover:bg-[#FFFFFF1A] transition-colors cursor-pointer w-10 h-10 shadow-sm border border-[#FFFFFF1A]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
