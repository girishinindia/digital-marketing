/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.growupmore.com" },
      { protocol: "https", hostname: "**.bunnycdn.com" },
    ],
  },
};
export default nextConfig;
