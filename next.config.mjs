/** @type {import('next').NextConfig} */
// Server-side proxy targets. Any deployment whose NEXT_PUBLIC_API_BASE* is set
// to the literal "proxy" (see src/lib/backend.ts) is reached same-origin
// through these rewrites — the browser only ever talks to this app's origin,
// so an http-only backend (the bare-IP AWS box) still works from an https
// site, and its Secure refresh cookie is stored first-party.
const BACKEND = process.env.BACKEND_PROXY_TARGET || "http://localhost:5000";
// Socket.IO lives in chat-service (5001), NOT api-service — give it its own target.
const CHAT = process.env.CHAT_PROXY_TARGET || BACKEND;

const nextConfig = {
  reactStrictMode: true,
  // Pragmatic during the JS->TS migration; tighten later by removing these.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  // Always registered: they only receive traffic when the client calls
  // same-origin paths (proxied deployment or no API base configured at all).
  // Direct https deployments (e.g. Render) use absolute URLs and never hit
  // these. /health is proxied so the liveness probe can check the proxied
  // backend; on Vercel the websocket upgrade isn't proxied, so socket.io
  // stays on long-polling there (transports are polling-first already).
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND}/api/:path*` },
      { source: "/health", destination: `${BACKEND}/health` },
      { source: "/socket.io/:path*", destination: `${CHAT}/socket.io/:path*` },
    ];
  },
};

export default nextConfig;
