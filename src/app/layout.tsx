import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import AuthProvider from "@/components/providers/AuthProvider";
import Navbar from "@/components/Navbar";
import TelegramWidget from "@/components/TelegramWidget";
import PicaBot from "@/components/chat/PicaBot";
import LocationTracker from "@/components/LocationTracker";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import SubscriptionChecker from "@/components/SubscriptionChecker";
import WinningTicker from "@/components/WinningTicker";
import LowBalancePopup from "@/components/LowBalancePopup";
import AIEngineTrigger from "@/components/AIEngineTrigger";
import { PicaDeviceProvider } from "@/context/PicaDeviceContext";
import ActivationModal from "@/components/license/ActivationModal";
import "./globals.css";

// Viewport configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563EB",
};

export const metadata: Metadata = {
  title: {
    default: "PICA - AI Quantitative Trading Platform",
    template: "%s | PICA"
  },
  description: "Platform trading kuantitatif Indonesia #1 dengan PICA Neural Lab 90%+ akurasi. Bi-LSTM Multi-Layer, Bookmap Order Flow, Analisa Forex & Saham IDX profesional.",
  keywords: [
    "trading indonesia", "analisa forex", "analisa saham", "PICA AI", "PICA trading",
    "XAUUSD", "gold trading", "neural lab", "IDX saham", "bookmap", "order flow",
    "smart money concepts", "trading signals", "neural network trading"
  ],
  authors: [{ name: "PICA", url: "https://arra7-app.vercel.app" }],
  creator: "PICA",
  publisher: "PICA",
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
    statusBarStyle: "default",
    title: "PICA",
  },
  openGraph: {
    title: "PICA - AI Quantitative Trading Platform",
    description: "Platform trading kuantitatif Indonesia dengan PICA Neural Lab & Bi-LSTM 90%+ akurasi. Bookmap Order Flow, Forex & Saham Analysis.",
    type: "website",
    siteName: "PICA",
    locale: "id_ID",
    url: "https://arra7-app.vercel.app",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PICA AI Trading Platform",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PICA - AI Quantitative Trading",
    description: "Analisa Trading Forex & Saham Indonesia dengan PICA Neural Lab 90%+ akurasi",
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
    <html lang={locale} className="light">
      <body
        className="antialiased bg-[#F8FAFC] text-slate-900 min-h-screen selection:bg-blue-100 selection:text-blue-900 font-sans"
      >
        <AuthProvider>
          <NextIntlClientProvider messages={messages}>
            <PicaDeviceProvider>
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
              <PicaBot />
              <AIEngineTrigger />
              <ActivationModal />
            </PicaDeviceProvider>
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
