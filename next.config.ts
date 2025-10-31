import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove standalone mode - Amplify handles Next.js SSR natively
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checking enabled
  },
};

export default nextConfig;
