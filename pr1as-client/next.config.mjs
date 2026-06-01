import createNextIntlPlugin from "next-intl/plugin"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.2"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "radix-ui"],
  },
  async rewrites() {
    // Proxy /api/* và /socket.io/* qua Next.js server → browser chỉ giao tiếp
    // với frontend domain, không còn cross-domain cookie/CORS issue.
    // Backend URL được suy ra từ NEXT_PUBLIC_API_URL (đã có sẵn, không cần env mới).
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3052/api"
    const backendUrl = apiUrl.replace(/\/api\/?$/, "")
    return [
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/socket.io/:path*", destination: `${backendUrl}/socket.io/:path*` },
    ]
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

export default withNextIntl(nextConfig)
