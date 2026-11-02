// src/content/releaseFacts.ts
//
// The single source of the release facts the page states: the version, its tag and date, the zip's size and its
// SHA-256 line, the test and service-check counts, and whether the benchmark may be shown. Pebble 2.0.3: every value
// read from GitHub by the site worker on 2 November 2026, after the Pebble side's "20:21 Published" post
// (PEBBLE_SESSIONS_STATUS.md): the API's `releases/tags/v2.0.3` (published_at 2026-11-02T14:50:23Z, not a draft or a
// prerelease; `releases/latest` is v2.0.3), the release's own SHA256SUMS (the API's asset digest agrees), and the
// README at the tag (`README.md@v2.0.3:16`, `:98`, `:382`, `:383`, `:496`). The rows are C-REL-1..6, C-INF-2, C-INF-3,
// C-OSS-2, C-SYS-11 and C-SYS-14 in docs/CLAIMS.md ("Release facts for 2.0.3").
//
// Everything that prints one of these facts reads it from here, never from a copy:
// - copy.ts `release`, the known-good fallback of src/lib/release.ts, so: the hero's facts list, the calls to action
//   and their labels, the sticky pill, the header's sheet, Install and the final call to action;
// - copy.ts `infrastructure` and `openSource.tested` (the counts), `installCommands.version` (the --version example);
// - seo.ts: llms.txt and the JSON-LD record's defaults;
// - the Benchmarks section's gate (`benchmarksPublic`) and src/content/release.ts.
// At build time src/lib/release.ts may replace the version and the size with the latest release's (an hourly read of
// the GitHub API); the counts, the hash and the benchmark gate are about this release and stay as written here.
//
// Before the next release: change this file only, and only from the release session's "x.y.z published" post (until
// that post exists the page keeps the last published release); then update the CLAIMS rows above. The Benchmarks
// section leads with golden set 2.0, which measured 1.9.29, 2.0.0's source (src/content/benchmarks.ts `golden`), and
// keeps the 1.0.2 run below it as history (`run.coveredVersions`, 1.0.2 to 1.0.4); for any release that run doesn't
// cover, its "This run measured Pebble 1.0.2, not …" line says so by itself.
//
// Not to be confused with releaseFacts() in src/lib/release.ts, which lists the facts under a Download.

export const releaseFacts = {
  /** "2.0.3" (the API's tag_name v2.0.3, `releases/latest`), shown as separate facts. [C-REL-1] */
  version: "2.0.3",
  tag: "v2.0.3",
  /**
   * The release's publication date, in UTC as the GitHub API gives it: published_at 2026-11-02T14:50:23Z, which was
   * 20:20 on 2 November in IST. [C-REL-3]
   */
  publishedOn: "2026-11-02",
  assetName: "Pebble-macos-arm64.zip",
  /** the zip's size in bytes (the GitHub API's asset size, 73,288,105). Shown as "73 MB". [C-REL-2] */
  sizeBytes: 73_288_105,
  /**
   * the zip's line in the release's own SHA256SUMS (github.com/tohin003/Pebble/releases/download/v2.0.3/SHA256SUMS; the
   * GitHub API's digest of the asset, sha256:88bb2e7d…6fe9, and the notes' last line agree)
   */
  sha256: "88bb2e7dfd6f55fdefbf9c83b7afe67eaffa817e2b2a237ca1a5f197d2f76fe9", // [C-REL-6]
  /** what `shasum -a 256 -c SHA256SUMS` prints for an intact download (README.md@v1.0.1:53-60; README.md@v2.0.3:496) */
  checksumOk: "Pebble-macos-arm64.zip: OK", // [C-INST-11]
  /** automated tests at this version, none skipped (README.md@v2.0.3:16, :98, :382). [C-INF-2] */
  tests: 13_758,
  /** service checks, in validator suites, each run on the source and the frozen app (README.md@v2.0.3:98, :383). [C-INF-3] */
  serviceChecks: 2_160,
  validatorSuites: 62,
  /**
   * The Benchmarks section ("Measured, not claimed", after Built like infrastructure) renders only while this is true.
   * True since the "1.0.4 published" post, which made the benchmark public (OVERRIDES §11, §16; the wording and the
   * 21:29 correction in OVERRIDES §18; unchanged by later releases, §21 to §32). The "2.0.0 published" post (STATUS
   * 14:53) made golden set 2.0's figures public too, as the README's tables give them. Neither patch since changes
   * anything the run measured: 2.0.1 keeps 2.0.0's model routes, tools and AgentGuard (CHANGELOG.md@v2.0.1:9-10), and
   * 2.0.3 keeps 2.0.1's (CHANGELOG.md@v2.0.3:9-10: "Nothing else changes from 2.0.1: the same model routes, tools and
   * AgentGuard, and the same data."). Set it to false to take
   * the section, and every benchmark line in llms.txt, off the site without touching code.
   */
  benchmarksPublic: true,
} as const;

export type ReleaseFacts = typeof releaseFacts;

/** The zip's line as SHA256SUMS prints it: the hash, two spaces, the file name. */
export function sha256Line(facts: Pick<ReleaseFacts, "sha256" | "assetName"> = releaseFacts): string {
  return `${facts.sha256}  ${facts.assetName}`;
}

/** 13269 → "13,269": counts as the README and the release session write them. */
export function formatCount(n: number): string {
  return n.toLocaleString("en-GB");
}

/** "2026-10-24" → "24 October 2026", in a fixed time zone so the build and the browser agree. */
export function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
