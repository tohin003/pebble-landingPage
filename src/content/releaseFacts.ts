// src/content/releaseFacts.ts
//
// The single source of the release facts the page states: the version, its tag and date, the zip's size and its
// SHA-256 line, the test and service-check counts, and whether the benchmark may be shown. Taken from the release
// session's "1.0.4 published" post (PEBBLE_SESSIONS_STATUS.md, 2026-10-23 20:34 IST; OVERRIDES §16), checked against
// the published release (the GitHub API and the release's own SHA256SUMS, read 2026-10-24 00:10 IST) and the README on
// `main` (26d7b19, lines 98 and 358–361). The rows are C-REL-1..6, C-INF-2, C-INF-3 and C-OSS-2 in docs/CLAIMS.md.
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
// that post exists the page keeps the last published release); then update the CLAIMS rows above.
//
// Not to be confused with releaseFacts() in src/lib/release.ts, which splits the line under a Download into a list.

export const releaseFacts = {
  /** "1.0.4" (STATUS 20:34: "v1.0.4 · 72 MB"). [C-REL-1] */
  version: "1.0.4",
  tag: "v1.0.4",
  /** the release's publication date (GitHub: published_at 2026-10-23T15:02:34Z, 20:32 IST). [C-REL-3] */
  publishedOn: "2026-10-23",
  assetName: "Pebble-macos-arm64.zip",
  /** the zip's size in bytes (STATUS 20:34; the GitHub API agrees). Shown as "72 MB" (formatMegabytes). [C-REL-2] */
  sizeBytes: 71_808_389,
  /** the zip's line in the release's own SHA256SUMS (github.com/tohin003/Pebble/releases/download/v1.0.4/SHA256SUMS) */
  sha256: "630af5c1344ab67bbae3f8de313ed260ad0794774d376a21f0b90d8ab856470d", // [C-REL-6]
  /** what `shasum -a 256 -c SHA256SUMS` prints for an intact download (README.md@v1.0.1:53-60, unchanged in 1.0.4) */
  checksumOk: "Pebble-macos-arm64.zip: OK", // [C-INST-11]
  /** automated tests at this version, none skipped (STATUS 20:34; README.md@26d7b19:98, :358). [C-INF-2] */
  tests: 8_653,
  /** service checks, in validator suites, each run on the source and the frozen app (README.md@26d7b19:359). [C-INF-3] */
  serviceChecks: 1_840,
  validatorSuites: 45,
  /**
   * The Benchmarks section ("Measured, not claimed", after Built like infrastructure) renders only while this is true.
   * True since the "1.0.4 published" post, which made the benchmark public (OVERRIDES §11, §16; the wording and the
   * 21:29 correction in OVERRIDES §18). Set it to false to take the section, and every benchmark line in llms.txt, off
   * the site without touching code.
   */
  benchmarksPublic: true,
} as const;

export type ReleaseFacts = typeof releaseFacts;

/** The zip's line as SHA256SUMS prints it: the hash, two spaces, the file name. */
export function sha256Line(facts: Pick<ReleaseFacts, "sha256" | "assetName"> = releaseFacts): string {
  return `${facts.sha256}  ${facts.assetName}`;
}

/** 8653 → "8,653": counts as the README and the release session write them. */
export function formatCount(n: number): string {
  return n.toLocaleString("en-GB");
}

/** "2026-10-23" → "23 October 2026", in a fixed time zone so the build and the browser agree. */
export function formatLongDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
