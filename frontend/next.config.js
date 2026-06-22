/** @type {import('next').NextConfig} */
const nextConfig = {
  output: (process.env.NODE_ENV === 'production' && !process.env.VERCEL) ? 'export' : undefined,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
