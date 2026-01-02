'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ChartIcon, DevicePhoneIcon } from '@/components/PremiumIcons';

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

              <Link href={session ? '/analisa-saham' : '/login?callbackUrl=/analisa-saham'}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-4 rounded-xl border border-[#1F2937] hover:border-green-500/50 bg-[#12141A]/50 hover:bg-green-500/10 text-white font-semibold text-lg transition-all flex items-center gap-2"
                >
                  <ChartIcon className="inline mr-2" size="md" /> Analisa Saham
                </motion.button>
              </Link>
            </motion.div>

            {/* Android App Banner */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8"
            >
              <Link href="/download/android">
                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 hover:border-green-500/60 transition-all cursor-pointer group">
                  <DevicePhoneIcon className="text-green-400" size="lg" />
                  <span className="text-green-400 font-medium">Download Android App</span>
                  <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
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

      {/* Testimonials Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Apa Kata <span className="gradient-text">Mereka</span>?
            </h2>
            <p className="text-[#94A3B8] max-w-2xl mx-auto">
              Trader Indonesia yang sudah merasakan manfaat ARRA7
            </p>
          </motion.div>

          {/* Scrolling Testimonials */}
          <div className="relative overflow-hidden">
            <motion.div
              className="flex gap-6"
              animate={{ x: [0, -1800] }}
              transition={{
                x: {
                  repeat: Infinity,
                  repeatType: "loop",
                  duration: 30,
                  ease: "linear",
                },
              }}
            >
              {[
                {
                  name: 'Rizky Pratama',
                  role: 'Day Trader • Jakarta',
                  avatar: 'RP',
                  rating: 5,
                  text: 'Gila sih ini AI nya. Gue udah lama nyari tools yang bisa bantu analisa tanpa ribet. Entry point nya akurat banget, kemarin aja profit 200 pips di XAUUSD. Worth it lah 149k/bulan mah.',
                  color: 'from-blue-500 to-cyan-500',
                },
                {
                  name: 'Dewi Anggraini',
                  role: 'Swing Trader • Surabaya',
                  avatar: 'DA',
                  rating: 5,
                  text: 'Awalnya skeptis karena udah sering kena tipu tools abal-abal. Tapi ARRA7 beda, analisanya detail banget pake SMC sama Fibo. Sekarang trading jadi lebih pede dan gak asal entry.',
                  color: 'from-purple-500 to-pink-500',
                },
                {
                  name: 'Budi Santoso',
                  role: 'Part-time Trader • Bandung',
                  avatar: 'BS',
                  rating: 5,
                  text: 'Kerja kantoran jadi gak bisa mantau chart terus. Pake ARRA7 tinggal cek analisa AI, langsung tau mau entry di mana. Simple tapi powerful. Profitnya lumayan buat tambahan gaji 😂',
                  color: 'from-amber-500 to-orange-500',
                },
                {
                  name: 'Andi Wijaya',
                  role: 'Crypto Trader • Medan',
                  avatar: 'AW',
                  rating: 5,
                  text: 'Yang VVIP mantap! Bisa analisa crypto juga. Kemarin BTC sama ETH signal dari AI nya bener semua. Support resistance nya akurat, SL TP nya udah dikasih. Tinggal eksekusi aja.',
                  color: 'from-green-500 to-emerald-500',
                },
                {
                  name: 'Siti Nurhaliza',
                  role: 'Newbie Trader • Yogyakarta',
                  avatar: 'SN',
                  rating: 5,
                  text: 'Baru belajar trading 3 bulan. Berkat analisa AI ARRA7 jadi ngerti kapan harus entry sama exit. Penjelasannya gampang dimengerti, cocok banget buat pemula kayak gue.',
                  color: 'from-red-500 to-rose-500',
                },
                {
                  name: 'Fajar Rahman',
                  role: 'Full-time Trader • Bali',
                  avatar: 'FR',
                  rating: 5,
                  text: 'Udah pake dari awal launching. AI analisanya makin akurat, support nya fast respond. Sekarang gak perlu buka banyak chart, tinggal minta analisa sesuai pair yang mau ditrade.',
                  color: 'from-indigo-500 to-violet-500',
                },
                // Duplicate for seamless loop
                {
                  name: 'Rizky Pratama',
                  role: 'Day Trader • Jakarta',
                  avatar: 'RP',
                  rating: 5,
                  text: 'Gila sih ini AI nya. Gue udah lama nyari tools yang bisa bantu analisa tanpa ribet. Entry point nya akurat banget, kemarin aja profit 200 pips di XAUUSD. Worth it lah 149k/bulan mah.',
                  color: 'from-blue-500 to-cyan-500',
                },
                {
                  name: 'Dewi Anggraini',
                  role: 'Swing Trader • Surabaya',
                  avatar: 'DA',
                  rating: 5,
                  text: 'Awalnya skeptis karena udah sering kena tipu tools abal-abal. Tapi ARRA7 beda, analisanya detail banget pake SMC sama Fibo. Sekarang trading jadi lebih pede dan gak asal entry.',
                  color: 'from-purple-500 to-pink-500',
                },
                {
                  name: 'Budi Santoso',
                  role: 'Part-time Trader • Bandung',
                  avatar: 'BS',
                  rating: 5,
                  text: 'Kerja kantoran jadi gak bisa mantau chart terus. Pake ARRA7 tinggal cek analisa AI, langsung tau mau entry di mana. Simple tapi powerful. Profitnya lumayan buat tambahan gaji 😂',
                  color: 'from-amber-500 to-orange-500',
                },
              ].map((testimonial, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-[350px] glass rounded-2xl p-6 border border-[#1F2937] hover:border-[#374151] transition-colors"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.color} flex items-center justify-center text-white font-semibold`}>
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{testimonial.name}</h4>
                      <p className="text-sm text-[#64748B]">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-[#94A3B8] text-sm leading-relaxed">&ldquo;{testimonial.text}&rdquo;</p>
                </div>
              ))}
            </motion.div>
          </div>
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
