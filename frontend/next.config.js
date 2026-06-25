/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const backendUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lunaar-backend.onrender.com');

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
