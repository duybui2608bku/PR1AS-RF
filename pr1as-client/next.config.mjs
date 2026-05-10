/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "radix-ui"],
  },
  async redirects() {
    return [
      {
        source: "/auth/verify-email",
        destination: "/verify-email",
        permanent: false,
      },
      {
        source: "/auth/reset-password",
        destination: "/reset-password",
        permanent: false,
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
}

export default nextConfig
