import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// The repo root, computed from this file's own location. Without it, Next and Turbopack can adopt the home folder (which
// holds a stray package.json and node_modules) as the workspace root.
const root = path.dirname(fileURLToPath(import.meta.url));

// No third-party requests of any kind (MASTER_PLAN §7.8). 'unsafe-inline' allows the tiny theme, motion and platform
// bootstrap script in <head> (src/lib/bootstrap.ts) and the JSON-LD block. `upgrade-insecure-requests` is added only on
// Vercel, where every asset is same-origin HTTPS anyway: locally it can push http://localhost subresources to https
// (WebKit) and break `next start` QA.
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

// Media and UI stills live under versioned folders (public/media/v1, public/ui/v1; critic M2), so they can be cached
// for a year: a re-render goes to v2/, never over v1/. The energetic recut's film is the first such re-render: its
// videos and text tracks are in public/media/v2 (OVERRIDES §35 decision 8; src/lib/media.ts FILM_MEDIA).
const immutable = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];

/**
 * The media files that exist when the build starts, as public paths ("/media/v1/loop-memory.h264.mp4",
 * "/media/v2/film-1080.hevc.mp4"). Inlined into the bundle as process.env.PEBBLE_MEDIA_FILES and read by
 * src/lib/media.ts, so "is this loop rendered yet?" is decided once, at build time. A check at request time would run
 * inside Vercel's functions on each hourly revalidation, where public/ isn't on disk.
 */
function listMediaFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string, prefix: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir).sort()) {
      if (name.startsWith(".")) continue;
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full, `${prefix}/${name}`);
      else out.push(`${prefix}/${name}`);
    }
  };
  walk(path.join(root, "public", "media", "v1"), "/media/v1");
  walk(path.join(root, "public", "media", "v2"), "/media/v2");
  walk(path.join(root, "public", "ui", "v1"), "/ui/v1");
  return out;
}

export default function nextConfig(phase: string): NextConfig {
  // The CSP and the year-long caching apply to production builds only (critic M1): `next dev` needs 'unsafe-eval' for
  // React's dev tooling, and immutable caching would serve stale media while it is being iterated on.
  const dev = phase === PHASE_DEVELOPMENT_SERVER;
  return {
    poweredByHeader: false,
    reactStrictMode: true,
    images: { unoptimized: true },
    turbopack: { root },
    outputFileTracingRoot: root,
    env: {
      PEBBLE_MEDIA_FILES: JSON.stringify(listMediaFiles()),
    },
    async headers() {
      if (dev) return [{ source: "/:path*", headers: securityHeaders }];
      return [
        { source: "/:path*", headers: [...securityHeaders, { key: "Content-Security-Policy", value: contentSecurityPolicy() }] },
        { source: "/media/v1/:path*", headers: immutable },
        { source: "/media/v2/:path*", headers: immutable },
        { source: "/ui/v1/:path*", headers: immutable },
      ];
    },
  };
}
