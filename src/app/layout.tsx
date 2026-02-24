import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import AuthProvider from "@/components/providers/AuthProvider";
import Navbar from "@/components/Navbar";
import TelegramWidget from "@/components/TelegramWidget";
import ArraBot from "@/components/chat/ArraBot";
import LocationTracker from "@/components/LocationTracker";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import SubscriptionChecker from "@/components/SubscriptionChecker";
import WinningTicker from "@/components/WinningTicker";
import LowBalancePopup from "@/components/LowBalancePopup";
import AIEngineTrigger from "@/components/AIEngineTrigger";
import "./globals.css";

// Viewport configuration (separated from metadata in Next.js 16+)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3B82F6",
};

export const metadata: Metadata = {
  title: {
    default: "ARRA7 - AI Trading Analysis Platform",
    template: "%s | ARRA7"
  },
  description: "Platform trading Indonesia #1 dengan AI Neural Ensemble 90%+ akurasi. Bookmap Whale Order Flow, Analisa Forex & Saham IDX profesional. Entry, SL, TP otomatis.",
  keywords: [
    "trading indonesia", "analisa forex", "analisa saham", "AI trading",
    "XAUUSD", "gold trading", "IDX saham", "bookmap", "order flow",
    "whale tracking", "smart money concepts", "trading signals",
    "forex indonesia", "crypto trading", "neural network trading"
  ],
  authors: [{ name: "ARRA7", url: "https://arra7-app.vercel.app" }],
  creator: "ARRA7",
  publisher: "ARRA7",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ARRA7",
  },
  openGraph: {
    title: "ARRA7 - AI Trading Analysis Platform",
    description: "Platform trading Indonesia dengan AI 90%+ akurasi. Bookmap Order Flow, Forex & Saham Analysis.",
    type: "website",
    siteName: "ARRA7",
    locale: "id_ID",
    url: "https://arra7-app.vercel.app",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ARRA7 AI Trading Platform",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ARRA7 - AI Trading Analysis",
    description: "Analisa Trading Forex & Saham Indonesia dengan AI 90%+ akurasi",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  verification: {
    google: "your-google-verification-code", // TODO: Add actual verification code
  },
  category: "Finance",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body
        className="antialiased bg-[#0B0C10] text-white min-h-screen"
      >
        <AuthProvider>
          <NextIntlClientProvider messages={messages}>
            <Navbar />
            <LocationTracker />
            <ServiceWorkerRegistration />
            <SubscriptionChecker />
            <WinningTicker />
            <LowBalancePopup />
            <main className="relative">
              {children}
            </main>
            <TelegramWidget />
            <ArraBot />
            <AIEngineTrigger />
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

