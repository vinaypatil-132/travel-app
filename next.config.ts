import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.backblazeb2.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
