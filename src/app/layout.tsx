import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { DataStreamBackground } from "@/components/DataStreamBackground";
import { BootSequence } from "@/components/BootSequence";
import { ReticleCursor } from "@/components/ReticleCursor";
import { SessionProvider } from "next-auth/react";

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
        <SessionProvider>
          <BootSequence />
          <ReticleCursor />
          <DataStreamBackground />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
