import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Room for a 10 MB attachment plus multipart overhead.
    serverActions: { bodySizeLimit: "11mb" },
    // Every page is dynamic (per-user session data), so client nav reuses the
    // last RSC payload for 30s instead of refetching across the EU<->BD hop.
    staleTimes: { dynamic: 30 },
  },
}

export default nextConfig
