import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // App used to live at /app; keep old links and bookmarks working.
    return [{ source: "/app", destination: "/", permanent: true }];
  },
  async headers() {
    // Plan API is called from third-party origins with a Bearer token (no
    // cookies), so any origin may call it.
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default nextConfig;
