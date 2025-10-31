import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Required for AWS Amplify deployment
  typescript: {
    ignoreBuildErrors: false, // Keep TypeScript checking enabled
  },
};

export default nextConfig;
