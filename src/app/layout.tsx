import type { Metadata } from "next";
import Script from "next/script";
import { Space_Grotesk, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { DataStreamBackground } from "@/components/DataStreamBackground";
import { BootSequence } from "@/components/BootSequence";
import { ReticleCursor } from "@/components/ReticleCursor";
import { TapAnimation } from "@/components/TapAnimation";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SystemToolbar } from "@/components/SystemToolbar";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Brain Stimuli Console",
  description: "High-focus note console with gamified flow",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Brain Stimuli",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover", // For iPhone notch/Dynamic Island support
  },
  themeColor: "#00F5FF",
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
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
        className={`${spaceGrotesk.variable} ${plexMono.variable} ${inter.variable} antialiased min-h-screen bg-neon-grid`}
        style={{
          fontFamily: "var(--font-inter), sans-serif",
        }}
      >
        <ThemeProvider>
          <SessionProvider>
            <BootSequence />
            <ReticleCursor />
            <TapAnimation />
            <DataStreamBackground />
            <SystemToolbar />
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
      <Script src="/register-sw.js" strategy="afterInteractive" />
    </html>
  );
}
