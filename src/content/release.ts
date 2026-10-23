// src/content/release.ts
//
// The gate of the Benchmarks section, under the name the system lane gave it. The value lives in
// src/content/releaseFacts.ts (`benchmarksPublic`), the single source of the release facts: change it there, never here.
// The version, size and download links the page offers come from src/lib/release.ts (the GitHub API, with copy.ts
// `release`, itself read from releaseFacts.ts, as the known-good fallback).
//
// Created by the system lane for the Benchmarks gate; the sections lane owns it.
import { releaseFacts } from "./releaseFacts";

export const benchmark = {
  /** The Benchmarks section renders only while this is true: releaseFacts.benchmarksPublic. */
  public: releaseFacts.benchmarksPublic,
} as const;
