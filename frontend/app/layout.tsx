import type { Metadata, Viewport } from "next";
import { Shippori_Mincho, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import GrainOverlay from "@/components/GrainOverlay";

const mincho = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-mincho",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Kabuka · 株価 — Rice-Paper Market Research",
  description:
    "Kabuka is a stock research app that returns market data to its visual homeland — candlestick charts, reimagined with a Japanese woodblock-print aesthetic.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mincho.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body
        style={{
          minHeight: "100vh",
          minWidth: 320,
          maxWidth: 1440,
          margin: "0 auto",
          background: "#F5F0E5",
          color: "#211C15",
          fontFamily: "var(--font-sans), sans-serif",
          position: "relative",
          overflowX: "hidden",
        }}
      >
        <GrainOverlay />
        <Header />
        {children}
        <footer
          style={{
            borderTop: "1px solid rgba(33,28,21,0.2)",
            margin: "40px var(--kbk-header-pr) 0 var(--kbk-header-pl)",
            padding: "16px 0 28px 0",
            fontFamily: "var(--font-mono)",
            fontSize: 10.5,
            lineHeight: 1.7,
            opacity: 0.55,
          }}
        >
          <div style={{ letterSpacing: "0.08em" }}>
            Research and educational use only — not investment advice. Kabuka is
            not a licensed financial advisor.
          </div>
          <div>
            Market data may be delayed and can fall back to illustrative sample
            data when a live source is unavailable. Sources: Finnhub, SEC EDGAR,
            Yahoo Finance, CNN, ApeWisdom — each under its own terms.
          </div>
        </footer>
      </body>
    </html>
  );
}
