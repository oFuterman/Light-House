/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable if backend is on different port during dev
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: 'http://localhost:8080/api/:path*',
  //     },
  //   ];
  // },
};

module.exports = nextConfig;
