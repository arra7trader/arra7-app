'use client';

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { ArrowRightIcon, ChartIcon, CpuChipIcon, SparklesIcon, StarSolidIcon, RocketIcon, TrophyIcon, BellIcon, CrosshairIcon, CurrencyIcon, CheckCircleSolidIcon, FireIcon, ScaleIcon, SignalIcon } from '@/components/PremiumIcons';
import DownloadAppSection from '@/components/home/DownloadAppSection';

type TutorialTab = 'bookmap' | 'forex' | 'stock';

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
  };

  const config = tabConfig[activeTab];

  return (
    <div>
      {/* Tab Buttons */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {(['bookmap', 'forex', 'stock'] as TutorialTab[]).map((tab) => (
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

  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
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
        {/* Subtle Background Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/3 -right-32 w-80 h-80 bg-gradient-to-br from-purple-400/15 to-pink-400/15 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-br from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl" />
        </div>

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="container-apple text-center relative z-10"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6"
          >
            <span className="badge-apple">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {tHero('badge')}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="headline-xl mb-6"
          >
            {tHero('headline')}{' '}
            <span className="gradient-text">{tHero('titleSuffix')}</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="body-lg max-w-2xl mx-auto mb-10"
          >
            {tHero('subheadline')}
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href={session ? '/dom-arra' : '/login?callbackUrl=/dom-arra'}>
              <button className="btn-primary bg-gradient-to-r from-amber-500 to-orange-600 border-none shadow-amber-500/20">
                <span className="mr-2">🔥</span>
                {tHero('ctaBookmap')}
                <ArrowRightIcon className="ml-2" size="sm" />
              </button>
            </Link>
            <Link href={session ? '/analisa-saham' : '/login?callbackUrl=/analisa-saham'}>
              <button className="btn-secondary">
                {tHero('ctaStock')}
              </button>
            </Link>
            <Link href={session ? '/analisa-market' : '/login?callbackUrl=/analisa-market'}>
              <button className="btn-secondary">
                {tHero('ctaForex')}
              </button>
            </Link>
            <Link href="/pricing">
              <button className="btn-secondary">
                {tHero('ctaPricing')}
              </button>
            </Link>
          </motion.div>


        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="section-padding bg-[var(--bg-secondary)]">
        <div className="container-wide">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center max-w-2xl mx-auto"
          >
            {[
              { number: '100+', label: tStats('activeTraders') },
              { number: '95%', label: tStats('signalAccuracy') },
            ].map((stat, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="p-8"
              >
                <div className="stat-number mb-2">{stat.number}</div>
                <p className="body-md">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
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

      {/* Features Section - Premium Trading Suite */}
      <section className="section-padding bg-gradient-to-b from-[var(--bg-primary)] to-[var(--bg-secondary)]">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-apple mb-4 inline-flex bg-gradient-to-r from-purple-100 to-blue-100 border-purple-200">{tFeatures('badge')}</span>
            <h2 className="headline-lg mb-4">
              {tFeatures('title')}
            </h2>
            <p className="body-lg text-[var(--text-secondary)] max-w-xl mx-auto">
              {tFeatures('subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <FireIcon className="text-white" size="lg" />,
                title: tFeatures('items.heatmap.title'),
                desc: tFeatures('items.heatmap.desc'),
                badge: tFeatures('items.heatmap.badge'),
                color: 'from-amber-500 to-orange-600',
                badgeColor: 'bg-amber-100 text-amber-700 border-amber-200'
              },
              {
                icon: <TrophyIcon className="text-white" size="lg" />,
                title: tFeatures('items.stock.title'),
                desc: tFeatures('items.stock.desc'),
                badge: tFeatures('items.stock.badge'),
                color: 'from-green-500 to-emerald-600',
                badgeColor: 'bg-green-100 text-green-700 border-green-200'
              },
              {
                icon: <CpuChipIcon className="text-white" size="lg" />,
                title: tFeatures('items.ai.title'),
                desc: tFeatures('items.ai.desc'),
                badge: tFeatures('items.ai.badge'),
                color: 'from-purple-500 to-violet-600',
                badgeColor: 'bg-purple-100 text-purple-700 border-purple-200'
              },
              {
                icon: <CrosshairIcon className="text-white" size="lg" />,
                title: tFeatures('items.zones.title'),
                desc: tFeatures('items.zones.desc'),
                badge: tFeatures('items.zones.badge'),
                color: 'from-blue-500 to-cyan-600',
                badgeColor: 'bg-blue-100 text-blue-700 border-blue-200'
              },
              {
                icon: <ChartIcon className="text-white" size="lg" />,
                title: tFeatures('items.thesis.title'),
                desc: tFeatures('items.thesis.desc'),
                badge: tFeatures('items.thesis.badge'),
                color: 'from-rose-500 to-red-600',
                badgeColor: 'bg-rose-100 text-rose-700 border-rose-200'
              },
              {
                icon: <SignalIcon className="text-white" size="lg" />,
                title: tFeatures('items.updates.title'),
                desc: tFeatures('items.updates.desc'),
                badge: tFeatures('items.updates.badge'),
                color: 'from-indigo-500 to-violet-600',
                badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative bg-white rounded-3xl p-8 border border-[var(--border-light)] hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300 group"
              >
                {/* Badge */}
                <span className={`absolute top-4 right-4 text-[10px] font-bold px-2.5 py-1 rounded-full border ${feature.badgeColor}`}>
                  {feature.badge}
                </span>

                {/* Icon with Glow */}
                <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} blur-xl opacity-40 group-hover:opacity-60 transition-opacity`} />
                  <div className="relative z-10">{feature.icon}</div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">{feature.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mobile App Download Section */}
      <DownloadAppSection />

      {/* Testimonials Section */}
      <section className="section-padding bg-[var(--bg-secondary)]">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              {
                name: 'Rizky Pratama',
                role: 'Day Trader • Jakarta',
                avatar: 'RP',
                text: tTestimonials('items.0.text'),
                color: 'from-blue-500 to-cyan-500',
              },
              {
                name: 'Dewi Anggraini',
                role: 'Swing Trader • Surabaya',
                avatar: 'DA',
                text: tTestimonials('items.1.text'),
                color: 'from-purple-500 to-pink-500',
              },
              {
                name: 'Budi Santoso',
                role: 'Part-time Trader • Bandung',
                avatar: 'BS',
                text: tTestimonials('items.2.text'),
                color: 'from-amber-500 to-orange-500',
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="testimonial-card"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-semibold`}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-semibold text-[var(--text-primary)]">{testimonial.name}</h4>
                    <p className="text-sm text-[var(--text-muted)]">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <StarSolidIcon key={i} className="text-amber-400" size="sm" />
                  ))}
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed">&ldquo;{testimonial.text}&rdquo;</p>
              </motion.div>
            ))}
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
