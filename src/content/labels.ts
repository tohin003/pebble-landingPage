// src/content/labels.ts
//
// The side labels of the Lexington system (DESIGN-LEXINGTON §3.1, §11): each section after the hero carries a short
// name and a fact that is already true on the page, in the rail beside its heading (a running head on phones).
// Sentence case, never uppercase, never above the heading: a rail label is not an eyebrow.
//
// Every fact repeats an approved string; the CLAIMS rows are C-SYS-1 to C-SYS-15 (docs/CLAIMS.md, "Lexington system").
// Render them with <SectionHead label={labels.x} …> or <RailLabel {...labels.x} /> (src/components/ui).

export type RailLabelText = Readonly<{ name: string; fact: string }>;

export const labels = {
  film: { name: "The film", fact: "Plays with sound." }, // film.playNote [C-SYS-1]
  /** "The film / 1:16, with sound.": the film's length (chapters.ts FILM_DURATION_SECONDS, as data) and film.playNote. [C-SYS-16] */
  filmLength: (duration: string): RailLabelText => ({ name: "The film", fact: `${duration}, with sound.` }),
  agentGuard: { name: "AgentGuard", fact: "The evidence layer" }, // agentGuard.layer[0] "an evidence layer" [C-SYS-2] (C-AG-7)
  desktop: { name: "On your desktop", fact: "Joins every Space" }, // desktop.lead [C-SYS-3] (C-DESK-1)
  project: { name: "In your project", fact: "How a coding task goes" }, // project.rail.label [C-SYS-4]
  /** "Across your Mac / New in 2.0.0": the section's name and the release that brought it (CHANGELOG.md@v2.0.0:83). [C-SYS-19] */
  mac: { name: "Across your Mac", fact: "New in 2.0.0" },
  /** "Workshop / Tools it makes": workshop.then's subject, already on the page. [C-SYS-20] */
  workshop: { name: "Workshop", fact: "Tools it makes" },
  models: { name: "Models", fact: "Three ways in" }, // models.cards: three ways [C-SYS-5] (C-MOD-2..7)
  pace: { name: "Permissions", fact: "Three modes" }, // pace.lead [C-SYS-6] (C-PACE-1)
  memory: { name: "Memory", fact: "Six labelled layers" }, // memory.layers [C-SYS-7] (C-MEM-7)
  views: { name: "Views", fact: "Built from data" }, // views.lead "from data" [C-SYS-8] (C-VIEW-1)
  infrastructure: { name: "Engineering", fact: "Facts, not benchmarks" }, // infrastructure.note [C-SYS-9] (C-INF-6)
  benchmarks: { name: "Benchmarks", fact: "Measured, not claimed" }, // README.md@26d7b19:366; the lead's name [C-SYS-17]
  privacy: { name: "Privacy", fact: "No telemetry" }, // privacy.stays [C-SYS-10] (C-PRIV-5)
  /** "Privacy and focus / New in 1.1.0": the Settings section that holds Stealth Lockdown (App.vue@v1.1.0:1413, :2798)
   *  and the release whose "What's new" brought it (App.vue@v1.1.0:1409-1410). [C-SYS-18] */
  stealth: { name: "Privacy and focus", fact: "New in 1.1.0" },
  limits: { name: "Limits", fact: "Stated plainly" }, // honestLimits.lead [C-SYS-12]
  openSource: { name: "Open source", fact: "Apache-2.0" }, // openSource.repoCard.licence [C-SYS-13] (C-OSS-1)
  /** "Install / Version 1.0.1", from the release the page offers (src/lib/release.ts). [C-SYS-11] (C-REL-1) */
  install: (version: string): RailLabelText => ({ name: "Install", fact: `Version ${version}` }),
  /** "Get Pebble / 72 MB", the zip's size from the same release. [C-SYS-14] (C-REL-2) */
  getPebble: (sizeLabel: string): RailLabelText => ({ name: "Get Pebble", fact: sizeLabel }),
} as const;

/** The footer's column names (DESIGN-LEXINGTON §6 Footer): interface labels. [C-SYS-15] */
export const footerColumns = {
  pebble: "Pebble",
  site: "This site",
  appearance: "Appearance",
} as const;
