// The release the page offers (OVERRIDES §1, critic C7). Server-side only.
//
// LIVE by default. At build time, and then at most once an hour (ISR: `next: { revalidate: 3600 }`, plus
// `revalidate = 3600` on the pages), it reads the latest release from the GitHub API: tag, publication date, the
// zip's size and the star count. Any error, timeout, rate limit or odd answer falls back to the known-good values in
// copy.ts `release`, and the page stays LIVE: an API problem never hides the Download button.
//
// The only way to show the "soon" state is by hand: PEBBLE_RELEASE_STATE=soon at build time. It hides Download and
// the install command and keeps "View on GitHub" (copy.ts has no "Soon" copy on purpose).
//
// Optional: GITHUB_TOKEN (a fine-grained, read-only token) lifts the 60-requests-an-hour limit of shared build IPs.

import { cache } from "react";
import { formatMegabytes, release as knownGood, releaseMeta, releaseNotesUrl } from "@/content/copy";

export type ReleaseState = "live" | "soon";

export type ReleaseInfo = Readonly<{
  state: ReleaseState;
  version: string; // "1.0.1"
  tag: string; // "v1.0.1"
  sizeBytes: number;
  sizeLabel: string; // "72 MB"
  publishedOn: string; // "2026-10-22"
  /** Always the `latest/download` URL, so it never points at an old build. */
  downloadUrl: string;
  checksumsUrl: string;
  releaseNotesUrl: string;
  repoUrl: string;
  installCommand: string;
  /** Read for completeness; DESIGN §5 shows no star count while the number is small. */
  stars: number | null;
  /** Where the values came from: the GitHub API, or the known-good fallback. */
  source: "github" | "known-good";
}>;

const API = "https://api.github.com/repos/tohin003/Pebble";
export const RELEASE_REVALIDATE_SECONDS = 3600;
const TIMEOUT_MS = 6000;

/** The manual override. Anything but "soon" means live. */
export function releaseState(): ReleaseState {
  return process.env.PEBBLE_RELEASE_STATE?.trim().toLowerCase() === "soon" ? "soon" : "live";
}

export const KNOWN_GOOD: ReleaseInfo = {
  state: "live",
  version: knownGood.version,
  tag: knownGood.tag,
  sizeBytes: knownGood.sizeBytes,
  sizeLabel: knownGood.sizeLabel,
  publishedOn: knownGood.publishedOn,
  downloadUrl: knownGood.downloadUrl,
  checksumsUrl: knownGood.checksumsUrl,
  releaseNotesUrl: knownGood.releaseNotesUrl,
  repoUrl: knownGood.repoUrl,
  installCommand: knownGood.installCommand,
  stars: null,
  source: "known-good",
};

async function getJson(url: string): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "pebble-landing-page",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  // A slow API must not hold up a build: give up after TIMEOUT_MS and use the known-good values.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), TIMEOUT_MS);
  });
  const request = fetch(url, { headers, next: { revalidate: RELEASE_REVALIDATE_SECONDS } })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null);
  try {
    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

type Parsed = Pick<ReleaseInfo, "version" | "tag" | "sizeBytes" | "publishedOn">;

/** Accepts only a published, non-prerelease vX.Y.Z release that carries the expected zip; anything else is null. */
export function parseLatestRelease(json: unknown): Parsed | null {
  if (!json || typeof json !== "object") return null;
  const r = json as Record<string, unknown>;
  if (r.draft === true || r.prerelease === true) return null;
  const tag = typeof r.tag_name === "string" ? r.tag_name : "";
  const match = /^v(\d+\.\d+\.\d+)$/.exec(tag);
  if (!match) return null;
  const assets = Array.isArray(r.assets) ? (r.assets as Record<string, unknown>[]) : [];
  const zip = assets.find((a) => a && a.name === knownGood.assetName);
  const size = zip && typeof zip.size === "number" ? zip.size : 0;
  if (size < 1_000_000) return null; // missing or implausible: keep the known-good values
  const published = typeof r.published_at === "string" ? r.published_at.slice(0, 10) : "";
  return {
    version: match[1]!,
    tag,
    sizeBytes: size,
    publishedOn: /^\d{4}-\d{2}-\d{2}$/.test(published) ? published : knownGood.publishedOn,
  };
}

function parseStars(json: unknown): number | null {
  if (!json || typeof json !== "object") return null;
  const stars = (json as Record<string, unknown>).stargazers_count;
  return typeof stars === "number" && Number.isFinite(stars) && stars >= 0 ? stars : null;
}

/** The release to offer. Never throws; deduplicated within one render. */
export const getRelease = cache(async (): Promise<ReleaseInfo> => {
  const state = releaseState();
  const [latest, repo] = await Promise.all([getJson(`${API}/releases/latest`), getJson(API)]);
  const parsed = parseLatestRelease(latest);
  const stars = parseStars(repo);
  if (!parsed) return { ...KNOWN_GOOD, state, stars };
  return {
    ...KNOWN_GOOD,
    ...parsed,
    state,
    sizeLabel: formatMegabytes(parsed.sizeBytes),
    releaseNotesUrl: releaseNotesUrl(parsed.tag),
    stars,
    source: "github",
  };
});

/**
 * The facts under a download button as separate items, from copy.ts `releaseMeta()` ("v1.0.1 · 72 MB · Apple silicon ·
 * macOS 12 or later"). DESIGN §3: render them as a list with hairline separators, never as a middle-dot string.
 */
export function releaseFacts(info: Pick<ReleaseInfo, "version" | "sizeLabel">): string[] {
  return releaseMeta(info.version, info.sizeLabel)
    .split(" · ")
    .map((fact) => fact.trim())
    .filter(Boolean);
}
