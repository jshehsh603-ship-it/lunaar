/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: (process.env.NODE_ENV === 'production' && !process.env.VERCEL) ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
