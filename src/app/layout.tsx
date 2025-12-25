import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import AuthProvider from "@/components/providers/AuthProvider";
import Navbar from "@/components/Navbar";
import TelegramWidget from "@/components/TelegramWidget";
import LocationTracker from "@/components/LocationTracker";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARRA7 - Premium Forex Trading Tools",
  description: "Professional-grade Forex indicators and Expert Advisors designed to give you the edge in the market. Powered by advanced algorithms and real-time analysis.",
  keywords: ["forex", "trading", "indicators", "expert advisors", "EA", "MT4", "MT5", "technical analysis"],
  authors: [{ name: "ARRA7" }],
  openGraph: {
    title: "ARRA7 - Premium Forex Trading Tools",
    description: "Professional-grade Forex indicators and Expert Advisors",
    type: "website",
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

