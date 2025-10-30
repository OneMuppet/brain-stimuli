import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checking enabled
  },
};

export default nextConfig;
