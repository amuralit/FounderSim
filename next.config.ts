import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@google/genai', 'v0-sdk'],
};

export default nextConfig;
