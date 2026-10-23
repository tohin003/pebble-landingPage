// src/content/release.ts
//
// What the Pebble release session has published, as the page may state it (OVERRIDES §11, §14; the release session's
// posts in the shared sessions status file, quoted in docs/CLAIMS.md). The version, size and download links the page
// offers come from src/lib/release.ts (the GitHub API, with copy.ts `release` as the known-good fallback); this module
// holds the facts that need a human decision to switch on.
//
// Created by the system lane for the Benchmarks gate; the sections lane owns and extends it.

export const benchmark = {
  /**
   * The Benchmarks section ("Measured, not claimed", right after Built like infrastructure) renders only while this is
   * true. It became true with the release session's "1.0.4 published" post (2026-10-23, 20:34 IST), which released
   * the benchmark wording of OVERRIDES §11 for the page. Set it to false to hide the section without touching code.
   */
  public: true,
} as const;
