/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_PROXY_TARGET || "http://localhost:5000";

const nextConfig = {
  reactStrictMode: true,
  // Pragmatic during the JS->TS migration; tighten later by removing these.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // When no API base is configured, proxy /api (+ socket.io) to the backend in dev,
  // mirroring the old Vite proxy. When one is set — the single NEXT_PUBLIC_API_BASE
  // or the dual-deployment Render/AWS pair (see src/lib/backend.ts) — calls go direct.
  async rewrites() {
    if (
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_BASE_RENDER ||
      process.env.NEXT_PUBLIC_API_BASE_AWS
    )
      return [];
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/socket.io/:path*", destination: `${BACKEND}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
