'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { PlayIcon, ArrowRightIcon } from '@/components/PremiumIcons';
import { useTranslations } from 'next-intl';

const VIDEOS = [
    {
        id: 'aHKaQXNEn4s',
        title: 'ARRA7 System Overview',
        desc: 'Panduan lengkap fitur unggulan dan cara kerja algoritma kami.'
    },
    {
        id: 'vV8xi5jIfA0',
        title: 'Whale Tracking & Heatmap',
        desc: 'Deteksi akumulasi institusi besar dengan fitur Heatmap canggih.'
    },
    {
        id: 'ANgh9e5n0rE',
        title: 'Live Trading Session',
        desc: 'Lihat bagaimana AI mengeksekusi peluang profit secara real-time.'
    },
    {
        id: 'SIZeTRYZFXI',
        title: 'Advanced Risk Management',
        desc: 'Strategi pengelolaan resiko otomatis untuk profit konsisten.'
    }
];

export default function VideoShowcase() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [direction, setDirection] = useState(0);
    const t = useTranslations('videoShowcase');

    // Reset playing state when switching videos
    useEffect(() => {
        setIsPlaying(false);
    }, [currentIndex]);

    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? '100%' : '-100%',
            opacity: 0,
            scale: 0.95,
        }),
    };

    const swipeConfidenceThreshold = 10000;
    const swipePower = (offset: number, velocity: number) => {
        return Math.abs(offset) * velocity;
    };

    const paginate = (newDirection: number) => {
        setDirection(newDirection);
        setCurrentIndex((prevIndex) => (prevIndex + newDirection + VIDEOS.length) % VIDEOS.length);
    };

    return (
        <div className="w-full relative mt-8">
            {/* Background Accents - Removed to blend with Hero */}

            <div className="container-apple relative z-10">
                <div className="text-center mb-16">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="badge-apple mb-4 inline-flex shadow-sm bg-[var(--bg-primary)]/50 backdrop-blur-md"
                    >
                        {t('badge')}
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="headline-lg mb-4"
                    >
                        {t('title')}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="body-lg max-w-2xl mx-auto text-[var(--text-secondary)]"
                    >
                        {t('description')}
                    </motion.p>
                </div>

                {/* MacBook Pro Style Frame */}
                <div className="relative max-w-5xl mx-auto group">
                    {/* Laptop Lid/Screen Frame */}
                    <div className="relative bg-[#1d1d1f] rounded-[2rem] p-2 md:p-4 shadow-2xl ring-1 ring-white/10">
                        {/* Screen Content Area */}
                        <div className="relative aspect-video rounded-[1rem] overflow-hidden bg-black">
                            {/* Navigation Buttons (Desktop) */}
                            <button
                                className="absolute left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 duration-300 translate-x-4 group-hover:translate-x-0 hidden md:flex"
                                onClick={() => paginate(-1)}
                            >
                                <ArrowRightIcon size="sm" className="rotate-180" />
                            </button>
                            <button
                                className="absolute right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 duration-300 -translate-x-4 group-hover:translate-x-0 hidden md:flex"
                                onClick={() => paginate(1)}
                            >
                                <ArrowRightIcon size="sm" />
                            </button>

                            <AnimatePresence initial={false} custom={direction} mode="popLayout">
                                <motion.div
                                    key={currentIndex}
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{
                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                        opacity: { duration: 0.2 },
                                    }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={1}
                                    onDragEnd={(e, { offset, velocity }) => {
                                        const swipe = swipePower(offset.x, velocity.x);
                                        if (swipe < -swipeConfidenceThreshold) {
                                            paginate(1);
                                        } else if (swipe > swipeConfidenceThreshold) {
                                            paginate(-1);
                                        }
                                    }}
                                    className="absolute inset-0 w-full h-full"
                                >
                                    {!isPlaying ? (
                                        <div className="absolute inset-0 z-10 cursor-pointer" onClick={() => setIsPlaying(true)}>
                                            {/* Thumbnail & Gradient */}
                                            <div className="absolute inset-0 bg-black" />
                                            <img
                                                src={`https://img.youtube.com/vi/${VIDEOS[currentIndex].id}/maxresdefault.jpg`}
                                                alt={VIDEOS[currentIndex].title}
                                                className="w-full h-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-60"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                                            {/* Play Button - Apple Style */}
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <motion.div
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="w-20 h-20 md:w-24 md:h-24 bg-[var(--bg-primary)]/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 shadow-2xl transition-all hover:bg-[var(--bg-primary)]/30"
                                                >
                                                    <PlayIcon className="text-white w-8 h-8 md:w-10 md:h-10 ml-1" />
                                                </motion.div>
                                            </div>

                                            {/* Text Overlay (Bottom Left) */}
                                            <div className="absolute bottom-6 left-6 md:bottom-10 md:left-10 text-left">
                                                <motion.div
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.2 }}
                                                >
                                                    <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                        Watching Now
                                                    </div>
                                                    <h3 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                                                        {VIDEOS[currentIndex].title}
                                                    </h3>
                                                    <p className="text-white/70 text-sm md:text-base max-w-md line-clamp-2">
                                                        {VIDEOS[currentIndex].desc}
                                                    </p>
                                                </motion.div>
                                            </div>
                                        </div>
                                    ) : (
                                        <iframe
                                            className="w-full h-full"
                                            src={`https://www.youtube.com/embed/${VIDEOS[currentIndex].id}?autoplay=1&rel=0&modestbranding=1`}
                                            title={VIDEOS[currentIndex].title}
                                            frameBorder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Laptop Bottom (Base) */}
                    <div className="relative mx-auto bg-[#e8e8ed] dark:bg-[#2d2d2d] h-3 w-[95%] rounded-b-xl shadow-inner-lg flex justify-center items-start pt-1 top-[-1px] z-[-1]">
                        <div className="w-1/4 h-1.5 bg-black/10 rounded-b-lg" />
                    </div>


                    {/* Pagination & Controls */}
                    <div className="flex flex-col items-center mt-12 gap-6">
                        {/* Dots */}
                        <div className="flex justify-center gap-3">
                            {VIDEOS.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setIsPlaying(false);
                                        setDirection(i > currentIndex ? 1 : -1);
                                        setCurrentIndex(i);
                                    }}
                                    className={`relative h-2 rounded-full transition-all duration-300 ${i === currentIndex
                                        ? 'w-10 bg-blue-500'
                                        : 'w-2 bg-slate-800 hover:bg-slate-400'
                                        }`}
                                    aria-label={`Go to video ${i + 1}`}
                                />
                            ))}
                        </div>

                        {/* Mobile Navigation (Visible only on small screens) */}
                        <div className="flex md:hidden gap-8 text-[var(--accent-blue)] font-medium text-sm">
                            <button onClick={() => paginate(-1)}>Previous</button>
                            <button onClick={() => paginate(1)}>Next</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
