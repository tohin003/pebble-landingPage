// src/content/releaseFacts.ts
//
// The single source of the release facts the page states: the version, its tag and date, the zip's size and its
// SHA-256 line, the test and service-check counts, and whether the benchmark may be shown. Taken from the release
// session's "1.5.0 published" post (PEBBLE_SESSIONS_STATUS.md, 2026-10-24 18:55 IST; OVERRIDES §32), checked against
// the published release (the GitHub API's `releases/tags/v1.5.0` and the release's own SHA256SUMS, read 2026-10-24
// 20:03 IST) and the README at the tag (`README.md@v1.5.0:98`, `:381-382`). The rows are C-REL-1..6, C-INF-2, C-INF-3
// and C-OSS-2 in docs/CLAIMS.md.
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
// that post exists the page keeps the last published release); then update the CLAIMS rows above. The benchmark
// measured Pebble 1.0.2 (src/content/benchmarks.ts `run.coveredVersions`, 1.0.2 to 1.0.4); later releases were not
// measured (OVERRIDES §32), so the Benchmarks section says so by itself.
//
// Not to be confused with releaseFacts() in src/lib/release.ts, which lists the facts under a Download.

export const releaseFacts = {
  /** "1.5.0" (STATUS 18:55, "1.5.0 published"; OVERRIDES §32), shown as separate facts. [C-REL-1] */
  version: "1.5.0",
  tag: "v1.5.0",
  /**
   * The release's publication date, in UTC as the GitHub API gives it: published_at 2026-10-24T13:24:15Z, which was
   * 18:54 on 24 October in IST. [C-REL-3]
   */
  publishedOn: "2026-10-24",
  assetName: "Pebble-macos-arm64.zip",
  /** the zip's size in bytes (STATUS 18:55; OVERRIDES §32; the GitHub API agrees). Shown as "72 MB". [C-REL-2] */
  sizeBytes: 71_865_249,
  /**
   * the zip's line in the release's own SHA256SUMS (github.com/tohin003/Pebble/releases/download/v1.5.0/SHA256SUMS; the
   * GitHub API's digest of the asset agrees)
   */
  sha256: "2378ae0298923fd76f37f790bf2155a527b0970d435d6776e518048fd0e7e805", // [C-REL-6]
  /** what `shasum -a 256 -c SHA256SUMS` prints for an intact download (README.md@v1.0.1:53-60, unchanged since) */
  checksumOk: "Pebble-macos-arm64.zip: OK", // [C-INST-11]
  /** automated tests at this version, none skipped (OVERRIDES §32; README.md@v1.5.0:98, :381). [C-INF-2] */
  tests: 9_097,
  /** service checks, in validator suites, each run on the source and the frozen app (README.md@v1.5.0:382). [C-INF-3] */
  serviceChecks: 1_948,
  validatorSuites: 51,
  /**
   * The Benchmarks section ("Measured, not claimed", after Built like infrastructure) renders only while this is true.
   * True since the "1.0.4 published" post, which made the benchmark public (OVERRIDES §11, §16; the wording and the
   * 21:29 correction in OVERRIDES §18; unchanged by later releases, §21 to §32). Set it to false to take
   * the section, and every benchmark line in llms.txt, off the site without touching code.
   */
  benchmarksPublic: true,
} as const;

export type ReleaseFacts = typeof releaseFacts;

/** The zip's line as SHA256SUMS prints it: the hash, two spaces, the file name. */
export function sha256Line(facts: Pick<ReleaseFacts, "sha256" | "assetName"> = releaseFacts): string {
  return `${facts.sha256}  ${facts.assetName}`;
}

/** 9097 → "9,097": counts as the README and the release session write them. */
export function formatCount(n: number): string {
  return n.toLocaleString("en-GB");
}

/** "2026-10-24" → "24 October 2026", in a fixed time zone so the build and the browser agree. */
export function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
