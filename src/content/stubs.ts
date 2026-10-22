// src/content/stubs.ts
//
// Strings the section stubs need that copy.ts doesn't have yet: the sections OVERRIDES §7 added after the copy pass,
// and the hero's short honest line as docs/DESIGN.md §5 words it. Lane F1 (site shell) put them here so it never edits
// another lane's namespace. The claims pass should move them into copy.ts (and delete this file); each line has its
// source, and docs/CLAIMS.md has a row for each under "Site shell (lane F1)".

export const sectionStubs = {
  /** OVERRIDES §7 names the section "Built like infrastructure". [C-F1-1] */
  infrastructure: { h2: "Built like infrastructure." },
  /** OVERRIDES §8 C1: the heading may be "Private by default" (the release session's wording). [C-F1-2] */
  privacy: { h2: "Private by default." },
} as const;

export const heroStub = {
  /** DESIGN §5 row 1, the short honest line under the call to action (OVERRIDES §2 limits 1, 2 and 4). [C-F1-3] */
  honestLine: "Signed with its own identity, not an Apple Developer ID, and not notarized. No independent security audit yet.",
} as const;

export const filmDialogStub = {
  /** The film theatre's toggle that reads the text descriptions aloud (critic H4a). A control label, not a claim. */
  audioDescription: "Audio description",
} as const;
