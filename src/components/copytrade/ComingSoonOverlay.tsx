'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function ComingSoonOverlay() {
    return (
        <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center p-6 text-center">
            {/* Background Effects */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 max-w-2xl"
            >
                <div className="mb-8 inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 backdrop-blur-xl">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-6">
                    COMING SOON
                </h1>

                <p className="text-gray-400 text-lg md:text-xl mb-12 leading-relaxed">
                    We are building something extraordinary. The Copy Trade platform is in final testing and will be available to everyone shortly.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/">
                        <button className="px-8 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all border border-white/10 w-full sm:w-auto">
                            Back to Home
                        </button>
                    </Link>
                    <button className="px-8 py-3 rounded-xl bg-[var(--accent-blue)] hover:bg-blue-600 text-white font-bold transition-all shadow-lg shadow-blue-500/20 w-full sm:w-auto opacity-50 cursor-not-allowed">
                        Notify Me
                    </button>
                </div>

                <div className="mt-16 pt-8 border-t border-white/5">
                    <p className="text-sm text-gray-500 uppercase tracking-widest font-medium">Launching Q1 2026</p>
                </div>
            </motion.div>
        </div>
    );
}
