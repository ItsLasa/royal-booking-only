/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  // Memory optimization for constrained hosting environments (cPanel, shared Docker, low RAM containers)
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:4000/api/v1/:path*',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/book',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
