/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_PROXY_TARGET || "http://localhost:5000";

const nextConfig = {
  reactStrictMode: true,
  // Pragmatic during the JS->TS migration; tighten later by removing these.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // When NEXT_PUBLIC_API_BASE is blank, proxy /api (+ socket.io) to the backend in dev,
  // mirroring the old Vite proxy. When it's set (e.g. http://localhost:5000), calls go direct.
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_BASE) return [];
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/socket.io/:path*", destination: `${BACKEND}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
