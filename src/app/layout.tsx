import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
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
  metadataBase: new URL('https://frethunt.com'),
  title: "Master the Guitar Fretboard | FretHunt",
  description: "Master the guitar fretboard with FretHunt. The fastest free way to memorize guitar notes using interactive gamification and real audio.",
  keywords: ["guitar fretboard", "learn guitar notes", "fretboard trainer", "music theory game", "guitar notes game"],
  openGraph: {
    title: "FretHunt - Interactive Guitar Fretboard Trainer",
    description: "Master the guitar fretboard with FretHunt. Free, no signup, works on mobile.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FretHunt',
    description: 'Master the guitar fretboard interactively.',
  },
  alternates: {
    canonical: './',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FretHunt',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Master the guitar fretboard with FretHunt. The fastest free way to memorize guitar notes using interactive gamification and real audio.',
  };

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
        <Analytics />
        <GoogleAnalytics gaId="G-3774YNSHKH" />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8193759811585804"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
