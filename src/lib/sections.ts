// The home page's sections, in the order of docs/DESIGN.md §5, with their anchor ids. The ids are the page's public
// URLs (`/#install`), so keep them stable: the header, the footer, the sticky CTA, the chapter chips and the FAQ link
// to them. Existing ids come from copy.ts `sectionIds`; the two sections added after the copy pass (OVERRIDES §7) get
// theirs here. Stealth Lockdown (Pebble 1.1.0, OVERRIDES §21) sits between Private by default and Install: Privacy
// answers "where does my data go?", Stealth "what do others see on my screen?".

import { sectionIds } from "@/content/copy";

export const SECTIONS = {
  hero: sectionIds.hero, // "top"
  film: sectionIds.film,
  agentGuard: "agentguard",
  desktop: sectionIds.desktop,
  project: sectionIds.project,
  models: sectionIds.models,
  pace: sectionIds.pace, // "permissions"
  memory: sectionIds.memory,
  views: sectionIds.views,
  infrastructure: "infrastructure",
  benchmarks: sectionIds.benchmarks, // shown only while src/content/release.ts says the benchmark is public
  privacy: sectionIds.privacy,
  stealth: sectionIds.stealth, // Stealth Lockdown (Pebble 1.1.0), right after Private by default (OVERRIDES §21)
  install: sectionIds.install,
  limits: sectionIds.limits,
  openSource: sectionIds.openSource,
  faq: sectionIds.faq,
  finalCta: sectionIds.getPebble, // "get-pebble"
} as const;

export type SectionKey = keyof typeof SECTIONS;

/** `/#id`: works from every page, and is a same-page jump on the home page. */
export function sectionHref(key: SectionKey): string {
  return `/#${SECTIONS[key]}`;
}
