// src/content/stubs.ts
//
// Lane F1 (site shell) kept here the strings its section stubs needed before copy.ts had them. The claims review
// (2026-10-23) moved every one into copy.ts: `infrastructure.h2`, `privacy.h2`, `hero.honestLine` (now with all four
// release limits) and `filmDialog.audioDescription`. This file only re-exports them under the old names, so the stubs
// keep building. TODO(F2): import them from "@/content/copy" instead, then delete this file. Sources: docs/CLAIMS.md
// rows C-F1-1 to C-F1-3.

import { filmDialog, hero, infrastructure, privacy } from "./copy";

export const sectionStubs = {
  infrastructure: { h2: infrastructure.h2 },
  privacy: { h2: privacy.h2 },
} as const;

export const heroStub = {
  honestLine: hero.honestLine,
} as const;

export const filmDialogStub = {
  audioDescription: filmDialog.audioDescription,
} as const;
