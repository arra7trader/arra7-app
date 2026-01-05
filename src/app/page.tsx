'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRef } from 'react';
import { ArrowRightIcon, ChartIcon, CpuChipIcon, SparklesIcon, StarSolidIcon, RocketIcon, TrophyIcon, BellIcon, CrosshairIcon, CurrencyIcon, CheckCircleSolidIcon } from '@/components/PremiumIcons';

export default function Home() {
  const t = useTranslations('hero');
  const tFeatures = useTranslations('features');
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
              {t('badge')}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="headline-xl mb-6"
          >
            {t('headline')}{' '}
            <span className="gradient-text">Whale Order Flow</span>
            <br />
            & AI Analisa Saham
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="body-lg max-w-2xl mx-auto mb-10"
          >
            {t('subheadline')}
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
                DOM Heatmap
                <ArrowRightIcon className="ml-2" size="sm" />
              </button>
            </Link>
            <Link href={session ? '/analisa-saham' : '/login?callbackUrl=/analisa-saham'}>
              <button className="btn-secondary">
                Analisa Saham
              </button>
            </Link>
            <Link href={session ? '/analisa-market' : '/login?callbackUrl=/analisa-market'}>
              <button className="btn-secondary">
                Forex AI
              </button>
            </Link>
            <Link href="/pricing">
              <button className="btn-secondary">
                Lihat Harga
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
              { number: '100+', label: 'Active Traders' },
              { number: '95%', label: 'Akurasi Sinyal' },
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
            <div className="flex items-center gap-2">
              <CheckCircleSolidIcon className="text-green-500" size="md" />
              <span>Gratis Selamanya untuk BASIC</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleSolidIcon className="text-green-500" size="md" />
              <span>Tanpa Kartu Kredit</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleSolidIcon className="text-green-500" size="md" />
              <span>Daftar dalam 30 Detik</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircleSolidIcon className="text-green-500" size="md" />
              <span>Support via Telegram</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section-padding">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-apple mb-4 inline-flex">Mudah & Cepat</span>
            <h2 className="headline-lg mb-4">
              Cara <span className="gradient-text">Kerjanya</span>
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Hanya 3 langkah untuk mendapatkan analisa trading profesional
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Pilih Pair', desc: 'Pilih forex pair, crypto, atau saham Indonesia yang ingin dianalisa', icon: <CrosshairIcon className="text-[var(--accent-blue)]" size="xl" />, color: 'from-blue-500 to-cyan-500' },
              { step: '02', title: 'Klik Analisa', desc: 'ARRA Quantum Strategist akan menganalisa dengan AI dalam hitungan detik', icon: <RocketIcon className="text-[var(--accent-blue)]" size="xl" />, color: 'from-purple-500 to-pink-500' },
              { step: '03', title: 'Trading!', desc: 'Dapatkan entry zone, SL, TP, dan investment thesis lengkap', icon: <CurrencyIcon className="text-[var(--accent-blue)]" size="xl" />, color: 'from-green-500 to-emerald-500' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative bg-white rounded-2xl p-8 border border-[var(--border-light)] text-center group hover:border-[var(--accent-blue)]/30 transition-all hover:shadow-lg"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--accent-blue)] text-white text-sm font-bold flex items-center justify-center">
                  {item.step}
                </div>
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${item.color} bg-opacity-10 flex items-center justify-center mb-4 mt-2`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">{item.title}</h3>
                <p className="text-[var(--text-secondary)]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Updated for AI Analysis */}
      <section className="section-padding bg-[var(--bg-secondary)]">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <span className="badge-apple mb-4 inline-flex">Fitur Unggulan</span>
            <h2 className="headline-lg mb-4">
              Kenapa Trader Pilih <span className="gradient-text">ARRA7</span>?
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <ChartIcon className="text-white" size="lg" />,
                title: 'DOM Heatmap & Whale Tracking',
                desc: 'Lihat limit order raksasa (Whale) dan likuiditas masa depan secara real-time. Data institusional level.',
                color: 'from-amber-500 to-orange-500'
              },
              {
                icon: <SparklesIcon className="text-white" size="lg" />,
                title: 'Analisa Saham Indonesia',
                desc: 'Fundamental & teknikal emiten IDX dengan metodologi institusional',
                color: 'from-green-500 to-emerald-500'
              },
              {
                icon: <CpuChipIcon className="text-white" size="lg" />,
                title: 'AI Quantum Strategist',
                desc: 'Didukung LLM 70B parameter untuk analisa setingkat hedge fund',
                color: 'from-purple-500 to-pink-500'
              },
              {
                icon: <RocketIcon className="text-white" size="lg" />,
                title: 'Entry & Exit Zone',
                desc: 'Rekomendasi entry, stop loss, dan take profit yang jelas',
                color: 'from-amber-500 to-orange-500'
              },
              {
                icon: <TrophyIcon className="text-white" size="lg" />,
                title: 'Investment Thesis',
                desc: 'Alasan logis di balik setiap rekomendasi trading',
                color: 'from-red-500 to-rose-500'
              },
              {
                icon: <BellIcon className="text-white" size="lg" />,
                title: 'Update Setiap Saat',
                desc: 'Analisa selalu fresh dengan data market terbaru',
                color: 'from-indigo-500 to-violet-500'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl p-6 border border-[var(--border-light)] hover:shadow-lg transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
              Apa Kata <span className="gradient-text">Mereka</span>?
            </h2>
            <p className="body-lg max-w-2xl mx-auto">
              Trader Indonesia yang sudah merasakan manfaat ARRA7
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
                text: 'Gila sih ini AI nya. Entry point nya akurat banget, kemarin aja profit 200 pips di XAUUSD. Worth it lah!',
                color: 'from-blue-500 to-cyan-500',
              },
              {
                name: 'Dewi Anggraini',
                role: 'Swing Trader • Surabaya',
                avatar: 'DA',
                text: 'ARRA7 beda dari yang lain, analisanya detail banget pake SMC sama Fibo. Sekarang trading jadi lebih pede.',
                color: 'from-purple-500 to-pink-500',
              },
              {
                name: 'Budi Santoso',
                role: 'Part-time Trader • Bandung',
                avatar: 'BS',
                text: 'Kerja kantoran jadi gak bisa mantau chart terus. Pake ARRA7 tinggal cek analisa AI, simple tapi powerful.',
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
              🔥 Promo Tahun Baru — Diskon hingga 50%!
            </span>
            <h2 className="headline-lg mb-6">
              Siap Meningkatkan Trading Anda?
            </h2>
            <p className="body-lg max-w-xl mx-auto mb-6">
              Bergabung dengan 100+ trader Indonesia yang sudah profit dengan analisa AI ARRA7.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <CheckCircleSolidIcon className="text-green-500" size="md" />
                Akun BASIC gratis selamanya
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <CheckCircleSolidIcon className="text-green-500" size="md" />
                Tidak perlu kartu kredit
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <CheckCircleSolidIcon className="text-green-500" size="md" />
                Cancel kapan saja
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={session ? '/analisa-market' : '/login'}>
                <button className="btn-primary text-lg px-10 py-4">
                  Mulai Sekarang — Gratis
                </button>
              </Link>
              <Link href="/pricing">
                <button className="btn-secondary text-lg">
                  Lihat Paket PRO
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
                AI-Powered Trading Analysis
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-[var(--text-secondary)]">
              <Link href="/privacy" className="hover:text-[var(--accent-blue)] transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-[var(--accent-blue)] transition-colors">
                Terms
              </Link>
              <Link href="/faq" className="hover:text-[var(--accent-blue)] transition-colors">
                FAQ
              </Link>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              © 2026 ARRA7. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
