import type { NextConfig } from 'next';

/**
 * Ask Juice Doctor AI — Next.js configuration.
 *
 * Prototype note: no remote image hosts, analytics, or backend integrations are
 * wired here. When the platform moves to production (Phase 2), remote image
 * patterns (Supabase Storage) and headers are added in this single file.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root (a stray parent lockfile otherwise confuses inference).
  turbopack: { root: import.meta.dirname },
  images: {
    // Prototype ships with local/graded placeholder imagery only.
    // Phase 2: add Supabase Storage remotePatterns here.
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
