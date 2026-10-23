// src/content/credits.ts
//
// What /credits shows, and the one-line character credit for the footer (MASTER_PLAN §4.4, §6.5; OVERRIDES §2).
// CREDITS.md at the repository root says the same in Markdown; keep the two in step.
//
// An entry with a `todo` is unfinished: the credits page hides it, so no placeholder ever ships. The music and sound
// entries are final (Lane C, 2026-10-23; the instrument samples added by Lane C2 the same day); sources, hashes and
// the music choice are in docs/media-provenance.json and tools/audio/sample_kit.json.

import { links } from "./copy";

export type CreditItem = Readonly<{
  name: string;
  by?: string;
  licence: string;
  licenceUrl?: string;
  url?: string;
  /** What it is used for, in a sentence. */
  use?: string;
  /** The copyright line from the licence file that ships. */
  notice?: string;
  /** Set while an entry is unfinished. Entries with a todo are not shown. */
  todo?: string;
}>;

export type CreditSection = Readonly<{
  id: string;
  title: string;
  intro?: string;
  items: readonly CreditItem[];
}>;

/** Word for word from OVERRIDES §2. Shown in the footer, on /credits and in CREDITS.md wherever the pebble appears. */
export const bloubCredit = "Pebble's character engine: bloub by Jérémy Perret (MIT)";

export const codeLicenceNote = "This site's code is licensed under the Apache License 2.0.";

export const mediaNotice =
  "The films and images on this site are © 2026 Tohin Majumder. They are not covered by the site's code licence.";

export const creditSections: readonly CreditSection[] = [
  {
    id: "character",
    title: "The pebble",
    items: [
      {
        name: "bloub",
        by: "Jérémy Perret",
        licence: "MIT",
        licenceUrl: "https://github.com/jeremy-prt/bloub/blob/main/LICENSE",
        url: links.bloub,
        use: "Pebble's character engine. It draws the pebble in the app, on this site and in the film. Its MIT licence text is kept with the copy of the engine in this site's source code.",
        notice: "Copyright (c) 2026 Jérémy Perret",
      },
    ],
  },
  {
    id: "music",
    title: "Film music",
    items: [
      {
        name: "Pebble launch cue",
        by: "Composed for this film",
        licence: "Part of the film media, © 2026 Tohin Majumder",
        use: "An original score for the launch film, played on recorded instrument samples. It uses no third-party music.",
      },
      {
        name: "Versilian Community Sample Library (VCSL)",
        by: "Versilian Studios",
        licence: "CC0 1.0",
        licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
        url: "https://github.com/sgossner/VCSL",
        use: "Recorded marimba, vibraphone, glockenspiel, upright piano, bass drum and shaker samples that play the score. Credited as a courtesy: CC0 asks for none.",
      },
      {
        name: "VS Chamber Orchestra: Community Edition (VSCO 2 CE)",
        by: "Versilian Studios (Sam Gossner) and Ivy Audio (Simon Dalzell)",
        licence: "CC0 1.0",
        licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
        url: "http://vis.versilstudios.net/vsco-community.html",
        use: "Recorded viola and violin section and double bass samples that play the score. Credited as a courtesy: CC0 asks for none.",
      },
    ],
  },
  {
    id: "sound",
    title: "Film sound effects",
    items: [
      {
        name: "Original sound effects",
        by: "Made for this project",
        licence: "CC0 1.0",
        licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
        use: "The whooshes, the riser, the soft hit and the shimmer, synthesised in code for the launch film.",
      },
      {
        name: "Impact Sounds and Interface Sounds",
        by: "Kenney",
        licence: "CC0 1.0",
        licenceUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
        url: "https://kenney.nl",
        use: "Recorded clicks, ticks, drops and soft thuds, trimmed and tuned for the launch film.",
      },
    ],
  },
  {
    id: "fonts",
    title: "Fonts",
    intro: "All three are under the SIL Open Font License 1.1, served from this site.",
    items: [
      {
        name: "Fraunces",
        by: "The Fraunces Project Authors (Undercase Type)",
        licence: "SIL Open Font License 1.1",
        licenceUrl: "https://openfontlicense.org",
        url: "https://github.com/undercasetype/Fraunces",
        use: "Headings, on this site and in the film.",
        notice: "Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces)",
      },
      {
        name: "Inter",
        by: "The Inter Project Authors",
        licence: "SIL Open Font License 1.1",
        licenceUrl: "https://openfontlicense.org",
        url: "https://github.com/rsms/inter",
        use: "Text and labels, on this site and in the film.",
        notice: "Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)",
      },
      {
        name: "Geist Mono",
        by: "The Geist Project Authors (Vercel)",
        licence: "SIL Open Font License 1.1",
        licenceUrl: "https://openfontlicense.org",
        url: "https://github.com/vercel/geist-font",
        use: "Commands, file paths and the numbers on this site: versions, sizes, counts and rates.",
        notice: "Copyright 2024 The Geist Project Authors (https://github.com/vercel/geist-font.git)",
      },
    ],
  },
  {
    id: "software",
    title: "Software in this site",
    // Notices copied from each package's licence file in node_modules (versions pinned in package.json).
    items: [
      { name: "Next.js", by: "Vercel, Inc.", licence: "MIT", url: "https://nextjs.org", notice: "Copyright (c) 2025 Vercel, Inc." },
      {
        name: "React",
        by: "Meta Platforms, Inc. and affiliates",
        licence: "MIT",
        url: "https://react.dev",
        notice: "Copyright (c) Meta Platforms, Inc. and affiliates.",
      },
      {
        name: "Motion",
        by: "Motion B.V.",
        licence: "MIT",
        url: "https://motion.dev",
        notice: "Copyright (c) 2024 Motion B.V.; Copyright (c) 2018 Framer B.V.",
      },
      {
        name: "Tailwind CSS",
        by: "Tailwind Labs, Inc.",
        licence: "MIT",
        url: "https://tailwindcss.com",
        notice: "Copyright (c) Tailwind Labs, Inc.",
      },
      {
        name: "Phosphor Icons",
        by: "Phosphor Icons",
        licence: "MIT",
        url: "https://phosphoricons.com",
        notice: "Copyright (c) 2020 Phosphor Icons",
      },
    ],
  },
  {
    id: "tools",
    title: "Tools used to make the film and images",
    intro: "Used to make the media; not part of what this site sends you.",
    items: [
      {
        name: "Remotion",
        licence: "Remotion License (Free License)",
        licenceUrl: "https://www.remotion.dev/docs/license",
        url: "https://www.remotion.dev",
      },
      { name: "FFmpeg", licence: "LGPL 2.1 or later, with GPL parts", licenceUrl: "https://ffmpeg.org/legal.html", url: "https://ffmpeg.org" },
      { name: "librosa", licence: "ISC", url: "https://librosa.org" },
      { name: "pedalboard", by: "Spotify", licence: "GPL-3.0", url: "https://github.com/spotify/pedalboard" },
      { name: "pyloudnorm", licence: "MIT", url: "https://github.com/csteinmetz1/pyloudnorm" },
      { name: "sharp", licence: "Apache-2.0", url: "https://sharp.pixelplumbing.com" },
      { name: "Playwright", by: "Microsoft", licence: "Apache-2.0", url: "https://playwright.dev" },
    ],
  },
  {
    id: "pebble",
    title: "Pebble itself",
    items: [
      {
        name: "Pebble",
        by: "Tohin Majumder",
        licence: "Apache-2.0",
        licenceUrl: links.licence,
        url: links.repo,
        use: "The app this site is about. Every picture of Pebble's interface is the real interface, shown with sample data.",
      },
      {
        name: "AgentGuard",
        licence: "Apache-2.0",
        licenceUrl: links.notice,
        use: "Reliability: the engine built into Pebble that checks a task's evidence before Pebble calls it finished.",
      },
    ],
  },
];
