/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d2nxc0csvl68au.cloudfront.net",
      },
    ],
  },
};

export default nextConfig;
