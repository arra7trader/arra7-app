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
import CopytradeBridgeSection from '@/components/home/CopytradeBridgeSection';

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
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-8 divider-x-gradient">
      <StatItem
        icon={<UsersIcon className="text-blue-500" size="lg" />}
        value={stats.users}
        label={tStats('activeTraders')}
        suffix="+"
        isInView={isInView}
      />
      <StatItem
        icon={<SignalIcon className="text-purple-500" size="lg" />}
        value={stats.predictions}
        label="AI Predictions"
        suffix=""
        isInView={isInView}
      />
      <StatItem
        icon={<CrosshairIcon className="text-green-500" size="lg" />}
        value={stats.accuracy}
        label={tStats('signalAccuracy')}
        suffix="%"
        decimals={1}
        isInView={isInView}
      />
      <StatItem
        icon={<GlobeIcon className="text-amber-500" size="lg" />}
        value={50}
        label="Supported Pairs"
        suffix="+"
        isInView={isInView}
      />
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
    <div className="text-center p-6 group hover:bg-white/50 hover:dark:bg-white/5 rounded-2xl transition-all duration-500">
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
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      textColor: 'text-amber-700',
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
      bgColor: 'bg-blue-50',
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
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      icon: <TrophyIcon className="text-green-600" size="lg" />,
      steps: ['step1', 'step2', 'step3', 'step4'],
      stepIcons: [
        <CrosshairIcon key="1" className="text-green-600" size="lg" />,
        <ScaleIcon key="2" className="text-green-600" size="lg" />,
        <RocketIcon key="3" className="text-green-600" size="lg" />,
        <SparklesIcon key="4" className="text-green-600" size="lg" />,
      ],
    },
    doctor: {
      color: 'from-rose-500 to-red-500',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-700',
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
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
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
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {(['bookmap', 'forex', 'stock', 'doctor', 'sentiment'] as TutorialTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${activeTab === tab
              ? `bg-gradient-to-r ${tabConfig[tab].color} text-white shadow-lg scale-105`
              : 'bg-white border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
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
              <div className="w-14 h-14 mx-auto rounded-xl bg-white/80 flex items-center justify-center mb-4 mt-2 shadow-sm">
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
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center section-padding pt-32 overflow-hidden">

        {/* Neural Network Background */}
        <NeuralBackground />

        {/* Gradient Overlay for Depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--bg-primary)]/50 to-[var(--bg-primary)] z-0 pointer-events-none" />

        <motion.div
          style={{ scale: heroScale }}
          className="container-apple text-center relative z-10"
        >
          {/* Live Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm font-semibold text-blue-400 tracking-wide uppercase">{tHero('badge')}</span>
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="headline-xl mb-6 relative"
          >
            {tHero('headline')}{' '}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 animate-pulse-slow">
              {tHero('headlineHighlight')}
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="body-lg max-w-3xl mx-auto mb-12 text-slate-400"
          >
            {tHero('subheadline')}
          </motion.p>

          {/* System Status Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap justify-center gap-6 mb-12 text-xs font-mono text-slate-500"
          >
            <span className="flex items-center gap-2">
              <CpuChipIcon className="text-blue-500" size="sm" />
              NEURAL CORE: ONLINE
            </span>
            <span className="flex items-center gap-2">
              <SignalIcon className="text-green-500" size="sm" />
              LATENCY: 12ms
            </span>
            <span className="flex items-center gap-2">
              <GlobeIcon className="text-purple-500" size="sm" />
              NODES: 5.2M
            </span>
          </motion.div>

          {/* App Grid Launcher - Replaces CTA Buttons */}
          <AppGrid />

          {/* Daily Performance Section - Placed below menu buttons */}
          <div className="mt-12 mb-8 relative z-20">
            <DailyPerformanceSection />
          </div>

          {/* Video Showcase - Moved here for better visibility */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12 mb-8"
          >
            <VideoShowcase />
          </motion.div>

        </motion.div>
      </section>
      <CopytradeBridgeSection />
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
      <section className="section-padding bg-[var(--bg-secondary)] relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl mix-blend-screen" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl mix-blend-screen" />
        </div>

        <div className="container-wide relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold tracking-wider mb-6">
              <SparklesIcon size="sm" className="text-blue-400" />
              {tFeatures('badge')}
            </span>
            <h2 className="headline-lg mb-6">
              {tFeatures('title')}
            </h2>
            <p className="body-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              {tFeatures('subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <FireIcon className="text-white" size="lg" />,
                title: tFeatures('items.heatmap.title'),
                desc: tFeatures('items.heatmap.desc'),
                badge: tFeatures('items.heatmap.badge'),
                color: 'from-amber-500 to-orange-600',
                glow: 'shadow-amber-500/20'
              },
              {
                icon: <TrophyIcon className="text-white" size="lg" />,
                title: tFeatures('items.stock.title'),
                desc: tFeatures('items.stock.desc'),
                badge: tFeatures('items.stock.badge'),
                color: 'from-emerald-500 to-green-600',
                glow: 'shadow-emerald-500/20'
              },
              {
                icon: <CpuChipIcon className="text-white" size="lg" />,
                title: tFeatures('items.ai.title'),
                desc: tFeatures('items.ai.desc'),
                badge: tFeatures('items.ai.badge'),
                color: 'from-purple-500 to-violet-600',
                glow: 'shadow-purple-500/20'
              },
              {
                icon: <CrosshairIcon className="text-white" size="lg" />,
                title: tFeatures('items.zones.title'),
                desc: tFeatures('items.zones.desc'),
                badge: tFeatures('items.zones.badge'),
                color: 'from-cyan-500 to-blue-600',
                glow: 'shadow-cyan-500/20'
              },
              {
                icon: <ChartIcon className="text-white" size="lg" />,
                title: tFeatures('items.thesis.title'),
                desc: tFeatures('items.thesis.desc'),
                badge: tFeatures('items.thesis.badge'),
                color: 'from-rose-500 to-red-600',
                glow: 'shadow-rose-500/20'
              },
              {
                icon: <SignalIcon className="text-white" size="lg" />,
                title: tFeatures('items.updates.title'),
                desc: tFeatures('items.updates.desc'),
                badge: tFeatures('items.updates.badge'),
                color: 'from-indigo-500 to-blue-600',
                glow: 'shadow-indigo-500/20'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
                className="relative bg-[var(--bg-primary)]/50 backdrop-blur-xl rounded-3xl p-8 border border-[var(--border-light)] hover:border-blue-500/30 transition-all duration-300 group overflow-hidden"
              >
                {/* Hover Glow Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                {/* Badge */}
                <span className="absolute top-6 right-6 text-[10px] font-bold px-2 py-1 rounded bg-[var(--bg-secondary)] border border-[var(--border-light)] text-[var(--text-secondary)] opacity-70 group-hover:opacity-100 transition-opacity">
                  {feature.badge}
                </span>

                {/* Icon */}
                <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 shadow-lg ${feature.glow} group-hover:scale-110 transition-transform duration-300`}>
                  <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  {feature.icon}
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3 group-hover:text-blue-400 transition-colors">{feature.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feature.desc}</p>
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
      <section className="section-padding cta-section">
        <div className="container-apple text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold mb-6">
              {tCta('promoBadge')}
            </span>
            <h2 className="headline-lg mb-6">
              {tCta('title')}
            </h2>
            <p className="body-lg max-w-xl mx-auto mb-6">
              {tCta('desc')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              {[tCta('list.freeBasic'), tCta('list.noCreditCard'), tCta('list.cancelAnytime')].map((text, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <CheckCircleSolidIcon className="text-green-500" size="md" />
                  {text}
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={session ? '/analisa-market' : '/login'}>
                <button className="btn-primary text-lg px-10 py-4">
                  {tCta('btnStart')}
                </button>
              </Link>
              <Link href="/pricing">
                <button className="btn-secondary text-lg">
                  {tCta('btnPro')}
                  <ArrowRightIcon className="ml-2" size="sm" />
                </button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-apple py-12">
        <div className="container-wide">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <span className="text-xl font-bold">
                <span className="gradient-text">ARRA</span>7
              </span>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {tFooter('subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
              <Link href="/privacy" className="hover:text-[var(--accent-blue)] transition-colors">
                {tFooter('privacy')}
              </Link>
              <Link href="/terms" className="hover:text-[var(--accent-blue)] transition-colors">
                {tFooter('terms')}
              </Link>
              <Link href="/faq" className="hover:text-[var(--accent-blue)] transition-colors">
                {tFooter('faq')}
              </Link>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              {tFooter('copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
