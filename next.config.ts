import type { NextConfig } from 'next';

const config: NextConfig = {
  devIndicators: false,
  experimental: { optimizePackageImports: ['lucide-react'] },
};
export default config;
