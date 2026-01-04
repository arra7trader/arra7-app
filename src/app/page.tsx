'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRef } from 'react';
import { ArrowRightIcon, ChartIcon, CpuChipIcon, SparklesIcon, StarSolidIcon, AndroidIcon } from '@/components/PremiumIcons';

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
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center section-padding pt-32">
        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="container-apple text-center"
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
            <span className="gradient-text">{t('headlineHighlight')}</span>
            <br />
            {t('headlineEnd')}
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
            <Link href={session ? '/analisa-market' : '/login?callbackUrl=/analisa-market'}>
              <button className="btn-primary">
                {t('cta')}
                <ArrowRightIcon className="ml-2" size="sm" />
              </button>
            </Link>
            <Link href="/pricing">
              <button className="btn-secondary">
                Lihat Harga
              </button>
            </Link>
          </motion.div>

          {/* Product Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative max-w-4xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-[var(--bg-secondary)] p-2">
              <div className="rounded-xl overflow-hidden bg-white">
                <img
                  src="/images/hero-bg.png"
                  alt="ARRA7 Dashboard"
                  className="w-full h-auto"
                  style={{ aspectRatio: '16/9', objectFit: 'cover' }}
                />
              </div>
            </div>
            {/* Glow effect behind */}
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 blur-3xl -z-10 opacity-60" />
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
            className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center"
          >
            {[
              { number: '1,000+', label: 'Active Traders' },
              { number: '95%', label: 'Akurasi Sinyal' },
              { number: '24/7', label: 'AI Support' },
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

      {/* Features Section */}
      <section className="section-padding">
        <div className="container-wide">
          {/* Feature 1 */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-32"
          >
            <div className="order-2 lg:order-1">
              <h2 className="headline-lg mb-6">{tFeatures('indicators')}</h2>
              <p className="body-lg mb-8">{tFeatures('indicatorsDesc')}</p>
              <Link href="/products/indicators">
                <button className="btn-secondary">
                  Pelajari Lebih Lanjut
                  <ArrowRightIcon className="ml-2" size="sm" />
                </button>
              </Link>
            </div>
            <div className="order-1 lg:order-2">
              <div className="card-feature">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-6">
                  <ChartIcon className="text-white" size="xl" />
                </div>
                <h3 className="headline-md mb-4">Premium Indicators</h3>
                <p className="body-md">Indikator teknikal profesional untuk analisa chart yang akurat</p>
              </div>
            </div>
          </motion.div>

          {/* Feature 2 */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-32"
          >
            <div>
              <div className="card-feature">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6">
                  <CpuChipIcon className="text-white" size="xl" />
                </div>
                <h3 className="headline-md mb-4">Expert Advisors</h3>
                <p className="body-md">Robot trading otomatis yang bekerja 24/7 untuk Anda</p>
              </div>
            </div>
            <div>
              <h2 className="headline-lg mb-6">{tFeatures('ea')}</h2>
              <p className="body-lg mb-8">{tFeatures('eaDesc')}</p>
              <Link href="/products/expert-advisors">
                <button className="btn-secondary">
                  Pelajari Lebih Lanjut
                  <ArrowRightIcon className="ml-2" size="sm" />
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Feature 3 */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
          >
            <div className="order-2 lg:order-1">
              <h2 className="headline-lg mb-6">{tFeatures('analysis')}</h2>
              <p className="body-lg mb-8">{tFeatures('analysisDesc')}</p>
              <Link href={session ? '/analisa-market' : '/login?callbackUrl=/analisa-market'}>
                <button className="btn-primary">
                  Coba Sekarang
                  <ArrowRightIcon className="ml-2" size="sm" />
                </button>
              </Link>
            </div>
            <div className="order-1 lg:order-2">
              <div className="card-feature">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-6">
                  <SparklesIcon className="text-white" size="xl" />
                </div>
                <h3 className="headline-md mb-4">AI Analysis</h3>
                <p className="body-md">Analisa market real-time dengan kecerdasan buatan</p>
              </div>
            </div>
          </motion.div>
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

      {/* CTA Section */}
      <section className="section-padding cta-section">
        <div className="container-apple text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="headline-lg mb-6">
              Siap Memulai Trading?
            </h2>
            <p className="body-lg max-w-xl mx-auto mb-10">
              Bergabung dengan ribuan trader Indonesia yang sudah merasakan manfaat analisa AI ARRA7.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href={session ? '/analisa-market' : '/login'}>
                <button className="btn-primary text-lg px-10 py-4">
                  Mulai Sekarang — Gratis
                </button>
              </Link>
              <Link href="/download/android">
                <button className="btn-secondary text-lg">
                  <AndroidIcon className="mr-2" size="md" />
                  Download Android
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
