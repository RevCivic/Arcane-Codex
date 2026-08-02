import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Route requests for locally-hosted uploads through the dedicated API
    // handler instead of relying solely on Next.js public-directory serving.
    // This guarantees files written to the uploads volume after the initial
    // build are always found, regardless of any static-asset caching behaviour.
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ]
  },
};

export default nextConfig;
