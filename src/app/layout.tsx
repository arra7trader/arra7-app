import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import AuthProvider from "@/components/providers/AuthProvider";
import Navbar from "@/components/Navbar";
import TelegramWidget from "@/components/TelegramWidget";
import LocationTracker from "@/components/LocationTracker";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Viewport configuration (separated from metadata in Next.js 16+)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#3B82F6",
};

export const metadata: Metadata = {
  title: "ARRA7 - AI Trading Analysis",
  description: "Analisa Trading Forex & Saham Indonesia dengan AI Level Institusional. Entry, SL, TP otomatis. Smart Money Concepts.",
  keywords: ["forex", "saham", "trading", "analisa", "AI", "indonesia", "XAUUSD", "gold", "IDX", "indicators", "expert advisors"],
  authors: [{ name: "ARRA7" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ARRA7",
  },
  openGraph: {
    title: "ARRA7 - AI Trading Analysis",
    description: "Analisa Trading Forex & Saham Indonesia dengan AI Level Institusional",
    type: "website",
    siteName: "ARRA7",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARRA7 - AI Trading Analysis",
    description: "Analisa Trading Forex & Saham Indonesia dengan AI",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B0C10] text-white min-h-screen`}
      >
        <AuthProvider>
          <NextIntlClientProvider messages={messages}>
            <Navbar />
            <LocationTracker />
            <ServiceWorkerRegistration />
            <main className="relative">
              {children}
            </main>
            <TelegramWidget />
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

