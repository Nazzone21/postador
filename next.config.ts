import type { NextConfig } from "next";

// Túnel HTTPS usado para testar os logins da Meta no PC (cloudflared).
const TUNNEL_HOSTS = ["*.trycloudflare.com"];

const nextConfig: NextConfig = {
  allowedDevOrigins: TUNNEL_HOSTS,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb", // avatar das páginas
      allowedOrigins: TUNNEL_HOSTS,
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
