import type { NextConfig } from "next";

// Dev-only CORS proxy. Set API_PROXY_TARGET to the API Gateway URL (no NEXT_PUBLIC
// prefix — server-side only) when running from a Codespace or any origin not in the
// API Gateway CORS allowlist. The Next.js dev server proxies /api/v1/* server-to-server,
// bypassing browser CORS entirely. Do NOT set this in production builds.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(API_PROXY_TARGET && {
    async rewrites() {
      return [
        {
          source: "/api/v1/:path*",
          destination: `${API_PROXY_TARGET}/api/v1/:path*`,
        },
      ];
    },
  }),
};

export default nextConfig;
