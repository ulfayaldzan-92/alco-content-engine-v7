import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    ...(isDev ? { distDir: '.next-dev' } : {}),
    reactStrictMode: true,
    transpilePackages: [
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
    ],
    serverExternalPackages: ['@google/genai'],
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    allowedDevOrigins: [
      '*',
      '*.run.app',
      '*.googleusercontent.com',
      'aistudio.google.com',
      'localhost:*',
      '127.0.0.1:*',
    ],
  };
};

export default nextConfig;

