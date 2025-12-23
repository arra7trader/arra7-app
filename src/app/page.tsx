'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Home() {
  const t = useTranslations('hero');
  const tFeatures = useTranslations('features');
  const { data: session } = useSession();

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hero Background Image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/hero-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.6,
        }}
      />

      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-30" />

      {/* Orb Images */}
      <img
        src="/images/orb-blue.png"
        alt=""
        className="absolute -top-20 -left-20 w-[500px] h-[500px] opacity-40 blur-sm pointer-events-none"
      />
      <img
        src="/images/orb-purple.png"
        alt=""
        className="absolute top-1/3 -right-20 w-[400px] h-[400px] opacity-30 blur-sm pointer-events-none"
      />

      {/* Floating Decorative Images */}
      <motion.img
        src="/images/chart-glow.png"
        alt=""
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 0.4, x: 0 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="absolute top-40 right-10 w-[300px] hidden lg:block pointer-events-none"
      />
      <motion.img
        src="/images/gold-bar.png"
        alt=""
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 0.5, y: 0 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-40 left-10 w-[200px] hidden lg:block pointer-events-none"
      />
      <motion.img
        src="/images/crypto-coins.png"
        alt=""
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 0.4, y: 0 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-20 right-20 w-[250px] hidden lg:block pointer-events-none"
      />

      {/* Radial Gradient Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)',
        }}
      />

      {/* Hero Content */}
      <section className="relative pt-32 lg:pt-44 pb-20 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1F2937] bg-[#12141A]/50 backdrop-blur-sm mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              <span className="text-sm text-[#94A3B8]">{t('badge')}</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
            >
              {t('headline')}{' '}
              <span className="gradient-text">{t('headlineHighlight')}</span>
              <br />
              {t('headlineEnd')}
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg sm:text-xl text-[#94A3B8] max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              {t('subheadline')}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                href={session ? '/analisa-market' : '/login?callbackUrl=/analisa-market'}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="glow-button px-8 py-4 rounded-xl text-white font-semibold text-lg"
                >
                  {t('cta')}
                </motion.button>
              </Link>

              <Link href="/products/indicators">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 rounded-xl border border-[#1F2937] hover:border-[#374151] bg-[#12141A]/50 hover:bg-[#12141A] text-white font-semibold text-lg transition-all"
                >
                  {t('ctaSecondary')}
                </motion.button>
              </Link>
            </motion.div>
          </div>

          {/* Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-24 lg:mt-32 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Indicators Card */}
            <motion.div
              whileHover={{ y: -8 }}
              className="card-hover rounded-2xl p-6 bg-[#12141A]/50 backdrop-blur-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{tFeatures('indicators')}</h3>
              <p className="text-[#64748B]">{tFeatures('indicatorsDesc')}</p>
            </motion.div>

            {/* EA Card */}
            <motion.div
              whileHover={{ y: -8 }}
              className="card-hover rounded-2xl p-6 bg-[#12141A]/50 backdrop-blur-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{tFeatures('ea')}</h3>
              <p className="text-[#64748B]">{tFeatures('eaDesc')}</p>
            </motion.div>

            {/* Analysis Card */}
            <motion.div
              whileHover={{ y: -8 }}
              className="card-hover rounded-2xl p-6 bg-[#12141A]/50 backdrop-blur-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">{tFeatures('analysis')}</h3>
              <p className="text-[#64748B]">{tFeatures('analysisDesc')}</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Bottom Gradient Fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, #0B0C10 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
