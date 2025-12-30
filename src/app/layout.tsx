import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "FretHunt - Master the Guitar Fretboard | Interactive Trainer",
  description: "Master the guitar fretboard with FretHunt. The fastest free way to memorize guitar notes using interactive gamification and real audio.",
  keywords: ["guitar fretboard", "learn guitar notes", "fretboard trainer", "music theory game", "guitar notes game"],
  openGraph: {
    title: "FretHunt - Interactive Guitar Fretboard Trainer",
    description: "Master the guitar fretboard with FretHunt. Free, no signup, works on mobile.",
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
