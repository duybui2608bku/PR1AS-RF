/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "radix-ui"],
  },
}

export default nextConfig
