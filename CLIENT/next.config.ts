import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["antd", "@ant-design/icons", "@ant-design/cssinjs"],
  },
  sassOptions: {
    includePaths: ["./styles"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ibytecdn.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
