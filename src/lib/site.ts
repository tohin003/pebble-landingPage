// The site's own address, for metadataBase, the sitemap, robots.txt and canonical links (MASTER_PLAN §2.2).
// VERCEL_PROJECT_PRODUCTION_URL is a Vercel system variable available at build time: the production domain without
// the scheme (for example "pebble.example.com"). Locally it falls back to http://localhost:3000. No domain is
// hard-coded anywhere.

export function siteOrigin(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (host) return `https://${host.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

export function siteUrl(path = "/"): URL {
  return new URL(path, siteOrigin());
}
