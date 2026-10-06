import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    // Room for a 10 MB attachment plus multipart overhead.
    serverActions: { bodySizeLimit: "11mb" },
  },
}

export default nextConfig
