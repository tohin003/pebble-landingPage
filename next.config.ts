import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// The repo root, computed from this file's own location. Without it, Next and Turbopack can adopt the home folder (which
// holds a stray package.json and node_modules) as the workspace root.
const root = path.dirname(fileURLToPath(import.meta.url));

// No third-party requests of any kind (MASTER_PLAN §7.8). 'unsafe-inline' allows the tiny theme and motion bootstrap
// script in <head>. `upgrade-insecure-requests` is added only on Vercel, where every asset is same-origin HTTPS anyway:
// locally it can push http://localhost subresources to https (WebKit) and break `next start` QA.
function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.VERCEL ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

// Media and UI stills live under versioned paths (public/media/v1/…), so they can be cached for a year.
const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];

export default function nextConfig(phase: string): NextConfig {
  // The CSP and the year-long caching apply to production builds only: `next dev` needs 'unsafe-eval' for React's
  // dev tooling, and immutable caching would serve stale media while it is being iterated on.
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    poweredByHeader: false,
    reactStrictMode: true,
    images: { unoptimized: true },
    turbopack: { root },
    outputFileTracingRoot: root,
    async headers() {
      if (dev) return [{ source: "/:path*", headers: securityHeaders }];
      return [
        { source: "/:path*", headers: [...securityHeaders, { key: "Content-Security-Policy", value: contentSecurityPolicy() }] },
        { source: "/media/:path*", headers: immutable },
        { source: "/ui/:path*", headers: immutable },
      ];
    },
  };
}
