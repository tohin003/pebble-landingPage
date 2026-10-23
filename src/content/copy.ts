// src/content/copy.ts
//
// Every user-facing string on the Pebble site, typed and grouped by section (MASTER_PLAN §7.2 to §7.4, §7.8).
//
// Rules (U1 §2.7, MASTER_PLAN §9.3, OVERRIDES §1 and §2):
// - plain words, second person, the feature sentence first and then its limit;
// - British spelling ("licence" for the noun); no exclamation marks; none of the words banned in MASTER_PLAN §9.3;
// - Pebble's own interface strings are copied word for word from the Pebble repo at tag v1.0.1;
// - every factual sentence has a row in docs/CLAIMS.md. The [C-…] tags in the comments are those row IDs.
//
// Release copy is for the Live state only (OVERRIDES §1). src/lib/release.ts reads the latest tag, the asset size and
// the star count at build time; the values in `release` are the known-good fallbacks it uses on any error.
//
// Inline code: in prose strings, a span in backticks (`~/.pebble`) is meant to render as <code>. Command strings
// (`command`, `installCommand`) and diff lines are literal: render them as they are.
//
// Sample data: everything about Maya, invoice-kit, the Lisbon trip and the datetime quiz is fictional (MASTER_PLAN
// D21) and must sit next to the words "Shown with sample data."

import { formatCount, releaseFacts } from "./releaseFacts";

export type Link = Readonly<{ label: string; href: string; external?: boolean }>;
export type TitledText = Readonly<{ title: string; body: string }>;

// ---------------------------------------------------------------------------------------------------------------
// Release facts: the values come from src/content/releaseFacts.ts, the one source (OVERRIDES §1, §16)
// ---------------------------------------------------------------------------------------------------------------

export const release = {
  version: releaseFacts.version, // [C-REL-1]
  tag: releaseFacts.tag,
  assetName: releaseFacts.assetName,
  sizeBytes: releaseFacts.sizeBytes, // [C-REL-2]
  sizeLabel: formatMegabytes(releaseFacts.sizeBytes), // "72 MB" [C-REL-2]
  publishedOn: releaseFacts.publishedOn, // [C-REL-3]
  repoUrl: "https://github.com/tohin003/Pebble",
  releaseNotesUrl: `https://github.com/tohin003/Pebble/releases/tag/${releaseFacts.tag}`,
  releasesUrl: "https://github.com/tohin003/Pebble/releases",
  latestReleaseUrl: "https://github.com/tohin003/Pebble/releases/latest",
  downloadUrl: "https://github.com/tohin003/Pebble/releases/latest/download/Pebble-macos-arm64.zip",
  checksumsUrl: "https://github.com/tohin003/Pebble/releases/latest/download/SHA256SUMS",
  installScriptUrl: "https://raw.githubusercontent.com/tohin003/Pebble/main/install.sh",
  // Show exactly this (OVERRIDES §1). [C-REL-4]
  installCommand: "curl -fsSL https://raw.githubusercontent.com/tohin003/Pebble/main/install.sh | bash",
} as const;

/** "72 MB" from a byte count, in decimal megabytes as the release session asked for (71,808,389 bytes → "72 MB"). */
export function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / 1_000_000)} MB`;
}

/** The line under the download button: "v1.0.4 · 72 MB · Apple silicon · macOS 12 or later". [C-REL-5] */
export function releaseMeta(version: string = release.version, sizeLabel: string = release.sizeLabel): string {
  return `v${version} · ${sizeLabel} · Apple silicon · macOS 12 or later`;
}

/** The release notes page for a tag such as "v1.0.4". */
export function releaseNotesUrl(tag: string = release.tag): string {
  return `https://github.com/tohin003/Pebble/releases/tag/${tag}`;
}

/** Install-command variants (README.md@v1.0.1:43-49, 96). [C-INST-9] */
export const installCommands = {
  install: release.installCommand,
  dryRun: "curl -fsSL https://raw.githubusercontent.com/tohin003/Pebble/main/install.sh | bash -s -- --dry-run",
  version: `curl -fsSL https://raw.githubusercontent.com/tohin003/Pebble/main/install.sh | bash -s -- --version ${releaseFacts.version}`,
  uninstall: "curl -fsSL https://raw.githubusercontent.com/tohin003/Pebble/main/install.sh | bash -s -- --uninstall",
  downloadFirst: "curl -fsSL -o install.sh https://raw.githubusercontent.com/tohin003/Pebble/main/install.sh",
  runDownloaded: "bash install.sh",
  checksum: "shasum -a 256 -c SHA256SUMS",
  checksumExpected: releaseFacts.checksumOk,
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Links (every one checked: HTTP 200 on 2026-10-22, 23:45 IST)
// ---------------------------------------------------------------------------------------------------------------

export const links = {
  repo: "https://github.com/tohin003/Pebble",
  releases: "https://github.com/tohin003/Pebble/releases",
  releaseNotes: `https://github.com/tohin003/Pebble/releases/tag/${releaseFacts.tag}`,
  changelog: "https://github.com/tohin003/Pebble/blob/main/CHANGELOG.md",
  userGuide: "https://github.com/tohin003/Pebble/blob/main/docs/USER_GUIDE.md",
  security: "https://github.com/tohin003/Pebble/blob/main/SECURITY.md",
  contributing: "https://github.com/tohin003/Pebble/blob/main/CONTRIBUTING.md",
  building: "https://github.com/tohin003/Pebble/blob/main/BUILDING.md",
  codeOfConduct: "https://github.com/tohin003/Pebble/blob/main/CODE_OF_CONDUCT.md",
  licence: "https://github.com/tohin003/Pebble/blob/main/LICENSE",
  notice: "https://github.com/tohin003/Pebble/blob/main/NOTICE.md",
  dataFolders: "https://github.com/tohin003/Pebble/blob/main/docs/DATA_FOLDERS.md",
  removeCompletely: "https://github.com/tohin003/Pebble/blob/main/docs/DATA_FOLDERS.md#remove-pebble-completely",
  modelSelection: "https://github.com/tohin003/Pebble/blob/main/docs/MODEL_SELECTION.md",
  architecture: "https://github.com/tohin003/Pebble/blob/main/docs/ARCHITECTURE.md",
  issues: "https://github.com/tohin003/Pebble/issues",
  installScriptRaw: "https://raw.githubusercontent.com/tohin003/Pebble/main/install.sh",
  installScriptSource: "https://github.com/tohin003/Pebble/blob/main/install.sh",
  maintainer: "https://github.com/tohin003",
  landingRepo: "https://github.com/tohin003/pebble-landingPage",
  bloub: "https://github.com/jeremy-prt/bloub",
  apacheLicence: "https://www.apache.org/licenses/LICENSE-2.0",
  vercelPrivacy: "https://vercel.com/legal/privacy-policy",
} as const;

/** Section anchors, shared by the header, the sticky CTA, chapter chips and the FAQ links. */
export const sectionIds = {
  main: "main",
  hero: "top",
  film: "film",
  desktop: "desktop",
  models: "models",
  project: "project",
  pace: "permissions",
  memory: "memory",
  views: "views",
  more: "more",
  privacy: "privacy",
  limits: "limits",
  install: "install",
  openSource: "open-source",
  faq: "faq",
  getPebble: "get-pebble",
} as const;

/** Labels used in more than one place. */
export const common = {
  sampleData: "Shown with sample data.",
  interactiveExample: "Interactive example",
  opensOnGitHub: "Opens on GitHub",
  copy: "Copy",
} as const;

function plural(count: number, one: string, many: string): string {
  return count === 1 ? `1 ${one}` : `${count.toLocaleString("en-GB")} ${many}`;
}

// ---------------------------------------------------------------------------------------------------------------
// Honest limits (OVERRIDES §2: short form near the download button, in full in the Install and limits area)
// ---------------------------------------------------------------------------------------------------------------

export const honestLimits = {
  /** The four release limits, word for word from OVERRIDES §2. [C-LIM-1..4] */
  release: [
    "Pebble is signed with its own stable identity, not an Apple Developer ID.",
    "Pebble is not notarized.",
    "`SHA256SUMS` shows the download is intact. It does not prove who made it.",
    "No independent security audit has been done yet.",
  ],
  /** The same four, short. Render them as a list, never as a middle-dot string (DESIGN §3). [C-LIM-1..4] */
  short: [
    "Signed with Pebble's own identity, not an Apple Developer ID",
    "not notarized",
    "the checksum shows the download is intact, not who made it",
    "no independent security audit yet",
  ],
  shortLink: "Read the limits",
  heading: "What Pebble isn’t (yet)", // a typographic apostrophe: the H2 is set large, in Fraunces (comps 2 and 3)
  lead: "Pebble states its limits plainly. These are the ones to know before you install it.",
  /** The plan's other limits (MASTER_PLAN §7.2 row 9, OVERRIDES §2). */
  product: [
    {
      title: "Apple silicon only",
      body: "Pebble runs on Macs with Apple silicon (M1 or later). There is no version for Intel Macs, Windows or Linux.", // [C-LIM-5]
    },
    {
      title: "No automatic updates",
      body: "Pebble 1.0 doesn't check for updates by itself. To update, run the installer again.", // [C-LIM-6]
    },
    {
      title: "Models make mistakes",
      body: "Models make mistakes, including confident ones, so check the evidence Pebble shows you.", // [C-LIM-7]
    },
    {
      title: "AgentGuard is not a security layer",
      body: "AgentGuard checks evidence such as test runs. It is not a security layer, and it cannot make every answer right.", // [C-LIM-8]
    },
    {
      title: "The sandbox limits, but doesn't promise",
      body: "Commands and parsers run in macOS's sandbox, which limits them but is not a promise against every attack. Prompt injection from web pages or files is limited, not impossible.", // [C-LIM-9]
    },
    {
      title: "Pebble for Chrome needs Developer mode",
      body: "For 1.0, Pebble for Chrome isn't in the Chrome Web Store: you load it in Chrome's Developer mode. It has been tested against a simulated Chrome, not yet in a real one. Pebble's own built-in browser is not available yet.", // [C-LIM-10] (OVERRIDES §12)
    },
    {
      title: "Other apps",
      body: "Pebble can't see or operate other apps yet. It can only open one, which in the default mode waits for your approval.", // [C-LIM-15] (OVERRIDES §12)
    },
    {
      title: "Schedules need Pebble open",
      body: "Scheduled tasks run only while Pebble is open. Their results show in Pebble; macOS notifications are off until you turn them on.", // [C-LIM-11] (OVERRIDES §12)
    },
    {
      title: "Web search depends on Bing",
      body: "Web search uses Bing's RSS feed, which may change or stop without notice. The free Open-Meteo weather service is for non-commercial use.", // [C-LIM-12]
    },
    {
      title: "Other software on your Mac",
      body: "Pebble doesn't defend against other software running as your own macOS user. Such software can read Pebble's data folder and change its settings, and it could make Pebble's backend use a saved key or sign-in without a prompt.", // [C-LIM-14] SECURITY.md@v1.0.1:57
    },
    {
      title: "Accessibility audit still to come",
      body: "Pebble honours Reduce Motion, and VoiceOver hears the state of every switch, tab and permission mode, but an accessibility audit is still to come.", // [C-LIM-13]
    },
  ] satisfies readonly TitledText[],
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 0. Header, skip link, theme and motion controls
// ---------------------------------------------------------------------------------------------------------------

export const header = {
  wordmarkLabel: "Pebble, back to the top",
  navLabel: "Main",
  nav: [
    { label: "Features", href: "#agentguard" }, // the first feature section (DESIGN §5 row 3; src/lib/sections.ts)
    { label: "Privacy", href: "#privacy" },
    { label: "Install", href: "#install" },
    { label: "GitHub", href: links.repo, external: true },
  ] satisfies readonly Link[],
  cta: "Download for Mac",
  ctaNonMac: "Get the link",
  menuOpen: "Menu",
  menuClose: "Close menu",
  skipLink: "Skip to content",
} as const;

export const controls = {
  theme: {
    label: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",
    toLight: "Use the light theme",
    toDark: "Use the dark theme",
  },
  motion: {
    pause: "Pause motion",
    resume: "Resume motion",
    pausedNote: "Motion is paused on this site.",
  },
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 1. Hero and the call-to-action cluster (Live state, OVERRIDES §1)
// ---------------------------------------------------------------------------------------------------------------

export const hero = {
  h1: "A little help, right here.", // [C-HERO-1] Pet.vue:692
  lead:
    "Pebble is a small, free, open-source AI companion that lives on your Mac's screen. Click it to chat, or open the full window to work in a project under your review, read the web, keep memory you control and build small interactive views.", // [C-HERO-2] (aligned with the showcase brief, OVERRIDES §7)
  requirements: ["Free and open source", "Apache-2.0", "Macs with Apple silicon (M1 or later)", "macOS 12 or later"], // [C-HERO-3]
  requirementsLine: "Free and open source · Apache-2.0 · Macs with Apple silicon (M1 or later) · macOS 12 or later", // [C-HERO-3]
  /**
   * The short honest line under every Download button (DESIGN §5 row 1): the three trust limits. Lead decision
   * (2026-10-23): the checksum limit sits next to the checksum instructions in Install (install.checksumNote) and in
   * the full limits list, where it applies, instead of lengthening this line. [C-F1-3]
   */
  honestLine:
    "Signed with its own identity, not an Apple Developer ID, and not notarized. No independent security audit yet.",
  filmLink: "Watch the film",
  filmLinkAria: (duration: string) => `Watch the film, ${duration}, with sound`,
  pebble: {
    sayHi: "Say hi to Pebble",
    bubble: "Hi, I'm Pebble.",
    note: "The pebble on this page uses the same animation engine as the app.", // [C-HERO-4]
    noteLive: "Move your pointer, and its eyes follow.",
  },
} as const;

/** The small pill above the H1 that links to the release notes. */
export function releasePill(version: string = release.version) {
  return {
    label: `New · Pebble ${version}`,
    ariaLabel: `New: Pebble ${version}. Read the release notes on GitHub.`,
  } as const;
}

export const cta = {
  download: "Download for Mac",
  downloadAria: (version: string, sizeLabel: string) =>
    `Download Pebble ${version} for Mac with Apple silicon, a ${sizeLabel} zip file`,
  github: "View on GitHub",
  githubStars: (stars: number) => plural(stars, "star", "stars"),
  installLink: "Or install in one line",
  nonMac: {
    notice: "Pebble is for Macs with Apple silicon.", // [C-HERO-5]
    share: "Send yourself the link",
    copyLink: "Copy link",
    copied: "Link copied",
    shareTitle: "Pebble",
    shareText: "Pebble, a small AI companion for Macs with Apple silicon",
  },
} as const;

/** The panel shown after a click on Download (MASTER_PLAN §7.4). */
export const downloadNotice = {
  title: "Before you open Pebble",
  body: [
    "Pebble is not notarized, so the first time you open it, macOS may say it cannot verify the app.", // [C-DL-1]
    "Allow Pebble alone: Control-click `Pebble.app`, choose Open, then Open again. On recent macOS versions, open System Settings › Privacy & Security and click Open Anyway next to the message about Pebble.", // [C-DL-2]
    "Never turn Gatekeeper off.", // [C-DL-3]
  ],
  installerTip:
    "Prefer Terminal? The one-line installer checks the download's SHA-256 and the app's signature for you.", // [C-DL-4]
  whyLink: "Why isn't it notarized?",
  close: "Close",
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 2. Film
// ---------------------------------------------------------------------------------------------------------------

export const film = {
  h2: "Watch Pebble at work.",
  lead:
    "A short film with music and no voiceover: one small bug fix, from a question to a tested change, then a quick tour.", // [C-FILM-1]
  play: "Play the film",
  playNote: "Plays with sound.",
  chaptersHeading: "Chapters",
  transcriptLink: "Read the transcript",
  sampleData: common.sampleData,
  posterAlt: "The Pebble film. Pebble's window on a sage-green desktop, with an edit waiting for approval.", // FILM_SPEC §15, §18: the poster is T0's frame 0
  teaserLabel: "A silent preview of the film",
  /** Lane F2a: the teaser's short name in its pause button ("Pause the film preview clip"). A label, not a claim. */
  teaserName: "film preview",
} as const;

export const filmDialog = {
  label: "The Pebble film",
  close: "Close the film",
  captionsNote: "Captions describe the sounds and the on-screen text. Turn them on in the player.",
  noVideo: "This browser can't play the film. The transcript describes every part of it.",
  transcriptLink: "Read the transcript",
  chaptersHeading: "Chapters",
  /** The toggle that reads the text descriptions aloud (critic H4a). A control label, not a claim. From stubs.ts. */
  audioDescription: "Audio description",
} as const;

/** The "▷ Watch this in the film · m:ss" chip next to a section heading (MASTER_PLAN D11). */
export const chapterChip = {
  label: (time: string) => `Watch this in the film · ${time}`,
  aria: (chapterTitle: string, time: string) => `Watch the “${chapterTitle}” part of the film, from ${time}, with sound`,
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 3. On your desktop
// ---------------------------------------------------------------------------------------------------------------

export const desktop = {
  h2: "On your screen, out of your way.",
  lead:
    "A small animated pebble stays on top of your other windows and joins every Space. Drag it to move it. Click it for a quick chat, or use its arrow to open the full window.", // [C-DESK-1]
  points: [
    "⌘⇧Space brings Pebble forward from any app.", // [C-DESK-2]
    "Its expression follows what Pebble is doing, such as reading, writing, testing or waiting, without asking the model anything.", // [C-DESK-3]
    "Close the main window and the pebble stays on screen. Quit Pebble stops it, and the model with it.", // [C-DESK-4]
  ],
  limit: "Reduce motion, in Pebble's Settings or in macOS, keeps it still.", // [C-DESK-5]
  /** Lane F2a: the text alternative of the desktop vignette's quick chat (Pebble 1.0.1, sample data). [C-F2A-1] */
  vignette:
    "Pebble's quick chat open above the pebble, in the corner of a sage-green desktop. Asked “What does 'day is out of range for month' mean?”, Pebble answers: “Python is being asked for a date that doesn't exist, like 31 February. If it's from your invoice export, open invoice-kit and I'll look.”",
  chapterId: "desktop",
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 4. Your model
// ---------------------------------------------------------------------------------------------------------------

export const models = {
  h2: "Your model, your choice.",
  lead: "Connect a model in Settings › Models. One model runs at a time: switch it or its effort at any time, and the choice applies to every conversation.", // [C-MOD-1] (OVERRIDES §12)
  cards: [
    {
      id: "chatgpt",
      title: "Continue with ChatGPT", // AdvancedSettings.vue:1171
      body: "Sign in with your ChatGPT account in your browser.", // [C-MOD-2]
      limit:
        "Needs an eligible Plus or Pro plan through OpenAI's preview for open-source and approved clients. Plan limits apply, and API billing is separate.", // [C-MOD-3]
    },
    {
      id: "provider",
      title: "Connect provider", // AdvancedSettings.vue:1156
      body:
        "Add an API key for an OpenAI-compatible service, such as OpenAI, Ollama or LM Studio, an Anthropic key, or a Responses API endpoint. Keys are kept in the macOS Keychain.", // [C-MOD-4]
      limit:
        "Your message goes to that provider, with the context Pebble sends with it, such as the recent conversation and the memories Pebble recalls for it.", // [C-MOD-5] (OVERRIDES §8 C1)
    },
    {
      id: "local",
      title: "Add a model file", // AdvancedSettings.vue:1150
      body: "Run a GGUF model on your Mac with the bundled llama.cpp. Replies are made on this Mac.", // [C-MOD-6]
      limit: "Pebble downloads no model by itself: you choose the file. Local models read text only.", // [C-MOD-7]
    },
  ],
  caption: "With a local model, the conversation stays on your Mac.", // [C-MOD-8]
  switchNote:
    "A conversation you had with a local model is not sent to a cloud model unless you review and release it.", // [C-MOD-9]
  /** Lane F2a: the text alternative of the Settings › Models crop (shown until loop L2 exists). [C-F2A-2] */
  mediaAlt:
    "Pebble's Settings, on the Models tab: a GGUF model file on this Mac, the buttons Add a model file and Connect provider, and Continue with ChatGPT.",
  chapterId: "model",
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 5. Works in your project (sticky story) and AgentGuard
// ---------------------------------------------------------------------------------------------------------------

export const project = {
  h2: "Works in your project, under your review.", // lead decision: "Asks first" is true only in the default mode
  note: "In the default mode, every edit, test run, terminal command and Git change is a card you approve.", // [C-PROJ-1]
  connect:
    "Connect a project to give Pebble one folder. Paths outside it, links that leave it, `.git` internals and credential files are refused.", // [C-PROJ-2]
  steps: [
    {
      n: "01",
      title: "In the default mode, every edit is a card you approve, with Undo.", // OVERRIDES §8 C2
      body:
        "Each card shows the exact change. Choose Apply edit or Don't allow. After you apply it, Undo this edit puts the file back.", // [C-PROJ-3]
      limit: "Pebble refuses to apply an edit if the file changed since it read it.", // [C-PROJ-4]
    },
    {
      n: "02",
      title: "Tests run in an isolated copy.",
      body:
        "Your project files don't change. Tests run in a filtered temporary copy of the project, without network access. Pebble recognises common test setups, such as Python, Node, Go and Cargo.", // [C-PROJ-5]
      limit: "It asks before preparing a project's dependencies.", // [C-PROJ-6]
    },
    {
      n: "03",
      title:
        "Terminal commands beyond a short read-only list, and Git changes that delete or publish work, always wait for your review.", // OVERRIDES §8 C2: true in every mode
      body:
        "In the default mode, each terminal command and Git change waits for your approval. Commands run without a shell, confined to the project by macOS's sandbox, with a time and output limit. Git changes arrive as a plan you approve.", // [C-PROJ-7]
      limit: "Pebble can't undo a command.", // [C-PROJ-8]
    },
    {
      n: "04",
      kicker: "AgentGuard",
      // 1.0.3 Corrections: AgentGuard holds changed code only when tests cover it; the old title said more.
      title: "Tests that cover a change must pass.", // [C-PROJ-9]
      body:
        "Before Pebble calls a task finished, tests that cover the code it changed must have passed since the change, and written JSON and CSV files must parse. When the evidence is missing, the task is held at “verification required”, and you choose what happens next.", // [C-PROJ-9] (1.0.3)
      limit: "Changed code without covering tests is not held. AgentGuard checks evidence; it is not a security layer.", // [C-PROJ-9] [C-PROJ-10]
    },
  ],
  chapterIds: { steps01to03: "project", step04: "tested" },
  /** Lane F2a: the rail's step names (comp 3), the tabs of the story. Labels, not claims. */
  rail: {
    label: "How a coding task goes",
    steps: ["Edits", "Tests", "Commands and Git", "AgentGuard"],
  },
  /** Step 03's stage: the first sentence of a command card that can change files, word for word. [C-F2A-3] */
  commandCard: {
    intro: "A command card that can change files says first:",
    text: "Runs this command in your project, where it can change files. Pebble can't undo a command.", // App.vue@v1.0.1:731
  },
  /** Step 04's stage: the one-line results (agentGuard.result and notVerifiedExamples), and a link to section 3. [C-F2A-4] */
  verdict: {
    intro: "When a task changed code, its reply carries a one-line result, such as:",
    link: "How AgentGuard holds a task",
  },
  /** Text alternative of the real-UI crop in step 02 (shown until loop L4 exists). [C-F2A-5] */
  media: {
    steps:
      "The steps of a finished task in Pebble's Activity tab, from the two approved edits through “Requesting isolated tests · 11 s” to “Verified · pytest 42 passed on current files · 2 s”.",
  },
} as const;

/**
 * AgentGuard, the headline difference: section 3, right after the film (OVERRIDES §7 and §9, DESIGN §5 row 3), and the
 * full-width verdict of the project story's step 04. Framed as reliability, never as security (OVERRIDES §7).
 */
export const agentGuard = {
  kicker: "AgentGuard",
  heading: "Evidence before “done”.", // [C-AG-5] the heading of the README's AgentGuard section (OVERRIDES §7: one story)
  lead:
    "AgentGuard reads the evidence before Pebble calls a task finished. Its one-line result says which tests ran and whether they passed on the current files.", // [C-AG-1]
  /** The one comparative framing the release session allows, and only as intent (OVERRIDES §2). [C-AG-6] */
  intent: "An agent shouldn’t grade its own work.", // a typographic apostrophe: it is set in the display serif
  /**
   * What the evidence layer does (OVERRIDES §7, the release session's brief), with the scope the 1.0.3 Corrections
   * give it: the invented-API check reads Python code only, and only changed code that tests cover is held.
   * [C-AG-7] [C-AG-8] [C-AG-9]
   */
  layer: [
    "AgentGuard is built into Pebble as an evidence layer between the model and your project.",
    "It indexes your project and grounds each request in the files that request reaches. It challenges an agent that drifts outside that scope. It also challenges an invented API, such as a call to a function that doesn't exist, but that check reads Python code only.",
    "It reads test results as Pebble observed them, never as the model reports them. When tests cover the code a task changed and haven't passed since the change, Pebble holds the task at “verification required”: you run the tests, ask Pebble to finish, or accept it as unverified. Changed code without covering tests is not held.",
  ],
  /**
   * The scope challenge. There is no card for it: it is the refused step's error in Details › Activity, and the
   * proposed write never runs (OVERRIDES §9). The engine's words are verbatim; the numbers and files are sample data.
   */
  challenge: {
    caption:
      "When a task keeps changing files its request doesn't reach, AgentGuard stops the next write. The model must explain what connects them, or split them into a separate change.", // [C-AG-10]
    header: "AgentGuard: AgentGuard — evidence check", // guard.py:1139 prefix + challenge/renderer.py:32
    summary: (n: number) => `${n} file(s) changed that the task does not reach`, // validate/checks.py:81
    suggestion: "Either explain what connects these to the task, or split them into a separate change.", // validate/checks.py
  },
  /** Reliability, not security (OVERRIDES §7): where protection comes from instead. [C-AG-11] */
  reliability: {
    title: "Reliability, not security.",
    body: "AgentGuard checks evidence; it is not a sandbox and not a security layer. Protection comes from Pebble itself:",
    points: [
      "Approvals happen only in Pebble's main window.",
      "Commands run without a shell in macOS's sandbox, which limits them but is not a promise against every attack.",
      "Nothing a model, a web page, a file or a generated view says can widen what Pebble may do.",
    ],
  },
  result: "Verified · pytest 42 passed on current files", // [C-AG-2] sample numbers, format from run_activity.py:62
  resultCaption: common.sampleData,
  held: {
    message: "Pebble's change isn't verified yet.", // [C-AG-3] RunPanel.vue:57
    runTests: "Run the tests", // RunPanel.vue:121
    askToFinish: "Ask Pebble to finish", // RunPanel.vue:122
    acceptUnverified: "Accept as unverified", // RunPanel.vue:123
    acceptConfirm: "Keep this change without verification? Pebble records that you decided.", // RunPanel.vue:126
  },
  notVerifiedExamples: [
    "Not verified · 1 changed file, no tests run", // [C-AG-4] run_activity.py:72
    "Not verified · pytest 2 failed", // run_activity.py:66, sample number
    "Not verified · a changed file doesn't parse", // run_activity.py:68
    "Not verified · tests ran before the last change", // run_activity.py:71
  ],
  toggle: {
    label: "Show the task",
    held: "Verification required", // docs/USER_GUIDE.md:122
    verified: "Verified",
  },
  notSecurity: "AgentGuard checks evidence; it is not a security layer.", // [C-PROJ-10]
  /** Lane F2a: text alternatives of the real-UI crops in section 3 (what each crop shows). [C-F2A-6] */
  media: {
    challenge:
      "Pebble's Activity steps. The edit to invoice_kit/templates/statement.html is refused, and its details read “AgentGuard — evidence check” and “5 file(s) changed that the task does not reach”, name the request and the files outside it, and say “Either explain what connects these to the task, or split them into a separate change.”",
    held: "A reply in Pebble after two edits: “Not verified · 2 changed files, no tests run”, then “Blocked” and “Pebble's change isn't verified yet.”, with the buttons Run the tests, Ask Pebble to finish and Accept as unverified.",
    // the crop is the reply's head (lane v2-sections-a): the list under it is wider than the ledger can show legibly
    verified: "The head of a reply in Pebble after the tests ran: “Verified · pytest 42 passed on current files”, then “Done, and verified:”.",
  },
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Interactive explainers (MASTER_PLAN §7.3). App strings are word for word; sample data is fictional.
// ---------------------------------------------------------------------------------------------------------------

export const explainers = {
  label: common.interactiveExample,
  sampleData: common.sampleData,
  reset: "Reset the example",

  /** ApprovalCardDemo: an edit card as Pebble shows it (App.vue:717-748, 2458-2598). [C-EXP-1..3] */
  approvalCard: {
    intro: "Try the approval card. Its words are the ones Pebble shows.",
    path: "invoice_kit/dates.py", // sample
    status: {
      pending: "Needs your review", // App.vue:718
      applied: "Done", // App.vue:718
      rejected: "Not allowed", // App.vue:718
      undone: "Undone", // App.vue:718
    },
    lead: "Changes this file in your project. You can undo it afterwards.", // App.vue:726
    description: "Proposed source edit · original stays intact until approval", // App.vue:2492-2495
    viewDiff: "View diff", // App.vue:2498
    reject: "Don't allow", // App.vue:2553
    apply: "Apply edit", // App.vue:2565
    undo: "Undo this edit", // App.vue:2588
    statusAnnouncement: (status: string) => `Card status: ${status}`,
    // Sample diff, the same one the captured UI shows (capture/mock/fixtures.js DIFF_DATES). Literal lines.
    diff: [
      "@@ -1,14 +1,17 @@",
      ' """Date helpers for invoice terms."""',
      "+import calendar",
      " from datetime import date, timedelta",
      " ",
      " ",
      " def add_months(start: date, months: int) -> date:",
      '-    """Return the same day `months` later."""',
      '+    """Return the same day `months` later, clamped to that month\'s last day."""',
      "     index = start.month - 1 + months",
      "     year, month = start.year + index // 12, index % 12 + 1",
      "-    return date(year, month, start.day)",
      "+    last_day = calendar.monthrange(year, month)[1]",
      "+    return date(year, month, min(start.day, last_day))",
      " ",
      " ",
      " def due_date(issued: date, terms_days: int = 30) -> date:",
    ],
  },

  /** PermissionDial: the three modes, word for word from Pebble 1.0.4's src/permissionModes.ts. [C-EXP-4..7] */
  permissionDial: {
    legend: "How Pebble acts", // AdvancedSettings.vue:1365 ("HOW PEBBLE ACTS"), in sentence case
    defaultTag: "The default", // [C-EXP-8]
    runsWithoutAsking: "Runs without asking", // AdvancedSettings.vue:1383
    alwaysAsks: "Always asks", // AdvancedSettings.vue:1384
    modes: [
      {
        id: "ask",
        name: "Ask for approval",
        runsWithoutAsking: "Nothing that changes your project or your Mac.",
        alwaysAsks: "Every edit, test run, terminal command, app launch, Git change and connector call.",
      },
      {
        id: "auto",
        name: "Auto in project",
        runsWithoutAsking:
          "Edits to project files, test runs, and a short list of read-only commands (ls, cat, rg, head, tail, wc and a few more) in this project.",
        alwaysAsks:
          "Other terminal commands (including grep and builds), app launches, Git changes, connector calls, installs, and network or dangerous commands.",
      },
      {
        id: "full",
        name: "Full access",
        runsWithoutAsking: "Everything Auto runs, plus app launches and Git changes that neither delete work nor publish it.",
        alwaysAsks:
          "Other terminal commands (including grep and builds), connector calls, installs, presses in a Chrome tab, network or dangerous commands, and Git changes that delete work or publish it.", // permissionModes.ts@v1.0.4:36
      },
    ],
    everyMode:
      "In every mode, reading project files, searching and reading the web, and creating views run without asking while their switches below are on. Connector calls, installs and every press in a Chrome tab you granted always ask; looking, typing and choosing in that tab run under your grant. Protected credentials stay blocked.", // permissionModes.ts@v1.0.4:42
    switchesNote: "Below the modes, in Settings › Permissions, a switch for each kind of tool turns it off entirely.", // [C-EXP-9]
    /**
     * Under the quoted sentence (Pace.tsx). 1.0.4's words above no longer name app windows, but each mode still lists
     * app launches; this says what a launch is, so it never reads as app control (OVERRIDES §12). [C-EXP-14]
     */
    appsNote: "Pebble can't see or operate other apps yet: an app launch only opens one.",
    fullAccessNote:
      "Full access increases the impact of mistakes and prompt injection. AgentGuard is a reliability check; it cannot guarantee that every command or answer is safe.", // [C-EXP-10] AdvancedSettings.vue:1390-1392
    /** Lane F2a: the line under the "Interactive example" label (like approvalCard.intro). [C-F2A-7] */
    intro: "Choose a mode. The words are the ones Pebble shows.",
  },

  /** MemoryForgetDemo: the "forget …" card in a conversation (App.vue:2055-2084). [C-EXP-11..13] */
  memoryForget: {
    request: "Forget what you know about invoice-kit.", // sample message
    subject: "invoice-kit", // sample
    heading: (subject: string) => `Saved memories about “${subject}”`, // App.vue:2057
    note:
      "Nothing is forgotten until you choose Forget. These are records Pebble saved; forgetting one removes it for good.", // App.vue:2059
    forget: "Forget", // App.vue:2075
    forgetAria: (content: string) => `Forget: ${content.slice(0, 60)}`, // App.vue:2071
    forgotten: "Forgotten", // App.vue:2066
    allInSettings: "All memories in Settings", // App.vue:2081
    done: "Done", // App.vue:2082
    // Sample records, from the captured UI's demo memories (capture/mock/fixtures.js). "where" words: App.vue:1479.
    items: [
      {
        id: "mem-pref-4",
        content: "In invoice-kit, keep public function names stable; add a changelog line for every fix.",
        where: "In this project",
      },
      { id: "mem-fact-1", content: "Invoices are due 30 days after issue unless terms say otherwise.", where: "In this project" },
      { id: "mem-proc-1", content: "Tests for invoice-kit run with python -m pytest -q.", where: "In this project" },
    ],
  },
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 6. You set the pace (the PermissionDial lives in `explainers.permissionDial`)
// ---------------------------------------------------------------------------------------------------------------

export const pace = {
  h2: "You set the pace.",
  lead:
    "Pick one of three modes in Settings › Permissions. Each one says plainly what runs without asking and what always asks.", // [C-PACE-1]
  fixed: [
    "Approvals happen only in Pebble's main window.", // [C-PACE-2]
    "A task keeps the permissions it started with: a running task can never gain access.", // [C-PACE-3]
    "The pebble, a generated view, a file, a web page, a memory or a skill can never approve anything or widen a permission.", // [C-PACE-4]
  ],
  /** Lane F2a: introduces explainers.permissionDial.everyMode, quoted (DESIGN §5 row 7). [C-F2A-8] */
  attribution: "In Pebble's Settings, under the three modes:",
  chapterId: "pace",
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 7. Memory and Views
// ---------------------------------------------------------------------------------------------------------------

export const memory = {
  h2: "Memory you can read and forget.",
  // The section lists the six layers by name right below, so the lead doesn't repeat them (lane F2b).
  lead:
    "Pebble keeps six kinds of memory on your Mac, each with its own switch in Settings › Memory, where you can see, search and forget every one.", // [C-MEM-1] [C-MEM-2] [C-PRIV-1]
  /** The caption under the cropped Settings › Memory still (the lane shots' Pebble 1.0.4 retake of public/ui/v1). [C-F2B-1] */
  settingsCaption: "Settings › Memory in Pebble 1.0.4.",
  /** Under MemoryForgetDemo, after "Interactive example." (checked word for word against App.vue:2055-2084). [C-F2B-2] */
  demoWords: "The card's words are the ones Pebble shows.",
  kinds: [
    "Your preferences",
    "Facts & knowledge",
    "Procedures",
    "Past experiences",
    "Time-sensitive information",
    "Working context",
  ],
  /**
   * The six layers with the README's labels (OVERRIDES §10); `name` is the app's own name for each. In the order of
   * the Settings › Memory sheet shown beside the list (its grid, read row by row), so the two can be matched. [C-MEM-7]
   */
  layers: [
    { layer: "Working", name: "Working context", holds: "Where the current conversation's task stands." },
    { layer: "Episodic", name: "Past experiences", holds: "What earlier tasks asked for and how they went, up to 1,500 kept automatically." },
    { layer: "Semantic", name: "Facts & knowledge", holds: "Facts about your projects and the world." },
    { layer: "Procedural", name: "Procedures", holds: "How things are done here, such as how a project's tests run." },
    { layer: "Temporal", name: "Time-sensitive information", holds: "Dates and temporary arrangements, each with an expiry." },
    { layer: "Profile", name: "Your preferences", holds: "How you like to work, and what you asked Pebble to remember about you." },
  ],
  /**
   * How recalled memory reaches the model (OVERRIDES §10). "Recalls": PEBBLE.md is the exception, followed as your
   * standing instructions (points below; 1.0.3 Corrections). [C-MEM-8]
   */
  recall:
    "Each memory Pebble recalls for a task reaches the model as labelled data, with where it came from and when, never as an instruction or a permission.",
  relearn: "A memory you forget isn't learnt again from the same place. Forget all memories starts over, so Pebble can learn again.", // [C-MEM-9] (1.0.3)
  points: [
    "See and search every memory in Settings › Memory, with where it came from. Forget one, or all of them.", // [C-MEM-2]
    "Start a message with “Remember that …” to save something right away: a preference when it is about you, otherwise a fact. Pebble still answers the rest.", // [C-MEM-3] (1.0.3)
    "Ask Pebble to forget something and it shows the memories that match. Nothing is forgotten until you confirm it in the main window.", // [C-MEM-4]
    "Write what Pebble should know about you in `~/.pebble/PEBBLE.md`, in your own words. Pebble follows it as your standing instructions, and it never grants a permission.", // [C-MEM-5] (1.0.3)
  ],
  limit: "One switch, Remember useful context, turns memory off. Forgetting removes a memory for good.", // [C-MEM-6]
  chapterId: "memory",
} as const;

export const views = {
  h2: "Views, not just text.",
  lead:
    "Ask for a dashboard, a table, a chart, a plan, a diagram, a quiz or an app demo. Pebble builds it as a view in the conversation, from data, and keeps its earlier versions.", // [C-VIEW-1]
  points: [
    "A quiz keeps its timer and your answers.", // [C-VIEW-2]
    "Export a view as Word, Excel, CSV or HTML. Saving always goes through the macOS Save dialog, and nothing is uploaded.", // [C-VIEW-3] (OVERRIDES §12: the four export formats)
  ],
  limit: "A view can show and collect things, but it can never approve, run or change anything.", // [C-VIEW-4]
  chapterId: "views",
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 8. And a little more
// ---------------------------------------------------------------------------------------------------------------

export const more = {
  h2: "And a little more.",
  tiles: [
    {
      id: "web",
      icon: "Globe",
      title: "The web, read with care",
      body:
        "Pebble reads public pages as text; their scripts never run. Searches send your search words to Microsoft Bing's RSS results feed.", // [C-MORE-1]
      limit:
        "Everything read from the web is untrusted data: a page can never give Pebble an instruction or a permission.", // [C-MORE-2]
    },
    {
      id: "bigger",
      icon: "ListChecks",
      title: "Bigger tasks",
      body:
        "Pebble can hand parts of a larger task to agents, track a goal with criteria, and run reviewed schedules. Agents read and propose (a worktree agent writes only in its own copy); only the main task changes your project, through your normal review.", // [C-MORE-3] (1.0.3)
      limit: "Scheduled tasks run only while Pebble is open. Their results show in Pebble; macOS notifications are off until you turn them on.", // [C-LIM-11] (OVERRIDES §12)
    },
    {
      id: "skills",
      icon: "Plugs",
      title: "Skills and connectors",
      body:
        "Add skills, reusable instructions in Markdown, and connectors, MCP servers over HTTP. Each one starts turned off until you review it.", // [C-MORE-4]
      limit: "Every connector call asks for your approval. Servers started through npx, uvx or Node aren't supported yet.", // [C-MORE-5]
    },
    {
      id: "chrome",
      icon: "Browser",
      title: "Pebble for Chrome",
      body:
        "Pebble can look at and act in one Chrome tab you share and then grant, on that tab's site, for up to 30 minutes. It can't open, close, list or switch tabs, or leave the site. Every press asks first, and pages that look like sign-in, password or payment pages are handed back to you unread.", // [C-MORE-6] (OVERRIDES §12)
      limit:
        "For 1.0 you load it in Chrome's Developer mode; it isn't in the Chrome Web Store. It has been tested against a simulated Chrome, not yet in a real one.", // [C-LIM-10] (OVERRIDES §12)
    },
    {
      id: "stop",
      icon: "ArrowCounterClockwise",
      title: "Stop and rewind",
      body:
        "⌘. stops a task, and nothing Pebble already did is replayed when you continue. Rewind files puts back the files a task changed.", // [C-MORE-7]
      limit: "Rewind files skips files that changed since, and lists what it can't undo, such as commands that ran.", // [C-MORE-8]
    },
  ],
} as const;

/**
 * Bigger tasks, and the rest of the tour: DESIGN §5 row 9 puts these after the views paragraph (OVERRIDES §10). They
 * can replace the `more` tiles above. Same facts as Pebble's README (main, 207ec74), in the page's voice.
 */
export const orchestration = {
  title: "Bigger tasks, kept in bounds",
  points: [
    "A task can hand parts to agents, each with steps, time and tokens reserved from the task. Agents read, search, ask and propose. They never change your project, run commands or call connectors themselves; a worktree agent writes only in its own copy.", // [C-ORC-1] (1.0.3)
    "The main task re-checks each proposal against the latest files, then applies it through AgentGuard and your normal review. You can watch, message or stop each agent.", // [C-ORC-2]
    "`/goal` gives a conversation a checklist of criteria and blockers. A goal tracks progress; it is never a permission.", // [C-ORC-3]
    "Reviewed schedules run a task at set times with the model, permissions and project you approved, and wait for your review again if the model or permissions change.", // [C-ORC-4]
    "If Pebble quits mid-task, it marks what was interrupted and asks before anything resumes. Rewind files puts back what a task changed, unless the files changed since.", // [C-ORC-5]
  ],
  limit: "Scheduled tasks run only while Pebble is open. Their results show in Pebble; macOS notifications are off until you turn them on.", // [C-LIM-11] (OVERRIDES §12)
} as const;

export const tour = {
  title: "Also inside",
  // OVERRIDES §10's tour opens with "views and exports"; on the page the views paragraph right above says it, so the
  // list starts with research (lane F2b).
  items: [
    {
      title: "Research with sources",
      body: "Pebble searches the web and reads the pages behind an answer. Sources open in your browser, and everything read online is untrusted data.", // [C-TOUR-1]
    },
    {
      title: "Projects and Git",
      body: "Edit cards with Undo, tests in an isolated copy, and Git changes prepared as a plan. A Git change that deletes or publishes work always asks.", // [C-TOUR-2]
    },
    {
      title: "Skills, hooks and connectors",
      body: "Reusable skills in Markdown, hooks that can narrow but never widen what a task does, and MCP connectors. Each starts off until you review it.", // [C-TOUR-3]
    },
    {
      title: "Pebble for Chrome",
      body: "Share a Chrome tab and Pebble can look at it and act in it, one site at a time, with your grant. For 1.0 it loads in Chrome's Developer mode.", // [C-MORE-6] [C-LIM-10]
    },
    {
      title: "Local and cloud, with a handoff",
      body: "Run a GGUF model on your Mac, or a cloud model. A conversation you had on your Mac reaches a cloud model only after you review and release it.", // [C-MOD-9]
    },
    {
      title: "Documents and images",
      body: "Drop in PDFs, documents and screenshots. Images are cleaned of metadata before they reach a model.", // [C-TOUR-4]
    },
    {
      title: "Fast to drive",
      body: "A command palette, `/` commands in the message box, and ⌘. to stop a task.", // [C-TOUR-5]
    },
  ] satisfies readonly TitledText[],
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Built like infrastructure (OVERRIDES §7, §16; DESIGN §5 row 10): engineering facts about the release, not benchmarks.
// The counts and the version come from src/content/releaseFacts.ts.
// ---------------------------------------------------------------------------------------------------------------

export const infrastructure = {
  h2: "Built like infrastructure.", // [C-F1-1] (moved from stubs.ts)
  stack:
    "Pebble is a Tauri 2 shell in Rust, a Vue 3 interface and a frozen Python service, which talk over a private stdio channel.", // [C-INF-1]
  /** A ledger on the page, with the README's own row names as the terms (README.md@26d7b19:358-361). */
  facts: [
    {
      term: "Tests",
      text: `${formatCount(releaseFacts.tests)} automated tests at v${releaseFacts.version}, none skipped. They never call a model or the network.`,
    }, // [C-INF-2]
    {
      term: "Service checks",
      text: `${formatCount(releaseFacts.serviceChecks)} service checks across ${releaseFacts.validatorSuites} validator suites, each run against the source and the frozen, signed app.`,
    }, // [C-INF-3]
    {
      term: "Reproducible build",
      text: "The shipped backend is byte-identical to the tested one, apart from its signature.",
    }, // [C-INF-4]
    {
      term: "Release gates",
      text: "A secret scan, a licence inventory, a scan for personal paths, and every published test run in a fresh clone.",
    }, // [C-INF-5]
  ],
  /** True whether or not the benchmark is shown (C-SYS-9's "Facts, not benchmarks" repeats it). [C-INF-6] */
  note: "These are facts about how Pebble is built and tested, not benchmarks.",
  /** The section's link to the next one, shown only while the benchmark is (releaseFacts.benchmarksPublic). */
  benchmarkLink: "Read the benchmark",
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 9. Private by default: what is stored on your Mac and what leaves it (the honest limits live in `honestLimits`)
// ---------------------------------------------------------------------------------------------------------------

export const privacy = {
  /** The release session's wording, allowed only with the two columns below beside it (OVERRIDES §7, §8 C1). [C-F1-2] */
  h2: "Private by default.",
  lead: "Your conversations and memories are stored on your Mac. Here is what Pebble keeps there, and what it sends.", // [C-PRIV-1]
  stays: {
    title: "Stored on your Mac", // OVERRIDES §8 C1 (never "Stays on your Mac")
    items: [
      "`~/.pebble` holds Pebble's database, settings, `PEBBLE.md` and logs.", // [C-PRIV-2]
      "`~/Documents/Pebble` holds readable copies of your conversations, memories and files, which you can turn off.", // [C-PRIV-3]
      "Passwords, keys and sign-ins stay in the macOS Keychain.", // [C-PRIV-4]
      "No telemetry. Pebble sends no analytics. Optional usage counters are off by default, stay on your Mac, and can be exported or cleared.", // [C-PRIV-5]
    ],
  },
  leaves: {
    title: "What leaves your Mac",
    // Five destinations (OVERRIDES §8 C1). Not "only when you ask": web search and reading can run without a prompt
    // while their switch is on (C-PRIV-10).
    items: [
      "The model provider you chose. With a cloud model, it receives your message and the context Pebble sends with it, such as the recent conversation and the memories Pebble recalls for it.", // [C-PRIV-6]
      "Your search words, to Microsoft Bing's RSS results feed.", // [C-PRIV-7]
      "The web pages Pebble reads for you, fetched from their own sites.", // [C-PRIV-8]
      "Weather lookups, to Open-Meteo.", // [C-PRIV-12]
      "Calls to connectors you add.", // [C-PRIV-9]
    ],
    localNote:
      "With a local model, the conversation stays on your Mac. A conversation you had with a local model is not sent to a cloud model unless you review and release it.", // [C-MOD-8] [C-MOD-9]
  },
  searchNote:
    "In every mode, searching and reading the web run without asking while that switch is on. Turn it off with Search and read the web in Settings › Permissions.", // [C-PRIV-10]
  toolsNote:
    "Pebble's own tools can never read or change `~/.pebble` or `~/Documents/Pebble`, even when your project contains them.", // [C-PRIV-11]
  dataFoldersLink: { label: "Where Pebble keeps your things", href: links.dataFolders, external: true } satisfies Link,
  diagram: {
    title: "Where Pebble's requests go",
    mac: "Your Mac",
    macDetail: "Conversations, memories, settings and keys", // [C-PRIV-1] [C-PRIV-4]
    destinations: [
      {
        id: "provider",
        label: "Your model provider",
        detail: "with a cloud model: your message and its context, such as the recent conversation and recalled memories",
      }, // [C-PRIV-6]
      { id: "bing", label: "Microsoft Bing", detail: "your search words, through its RSS feed" }, // [C-PRIV-7]
      { id: "web", label: "Websites", detail: "the pages Pebble reads for you" }, // [C-PRIV-8]
      { id: "weather", label: "Open-Meteo", detail: "weather lookups" }, // [C-PRIV-12]
      { id: "connectors", label: "Your connectors", detail: "calls to connectors you add" }, // [C-PRIV-9]
    ],
    localNote: "With a local model, the conversation stays on your Mac.", // [C-MOD-8]
  },
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 10. Install (Live only)
// ---------------------------------------------------------------------------------------------------------------

export const install = {
  h2: "Install Pebble.",
  lead: "One line in Terminal, or the zip by hand. Both install the same app from the GitHub release.", // [C-INST-1]
  /** Four cells, each a value and a note under it (design comp 2). The download cell's value is the release's size. */
  requirements: {
    title: "What you need",
    mac: { label: "Mac", value: "Apple silicon", note: "M1 or later" }, // [C-INST-2]
    system: { label: "macOS", value: "macOS 12 or later", note: "Built and tested on macOS 27" }, // [C-INST-2] (OVERRIDES §8 H14)
    download: { label: "Download", note: (version: string) => `Version ${version}` }, // [C-REL-1] [C-REL-2]
    price: { label: "Price", value: "Free", note: "A cloud model's costs depend on your provider." }, // [C-INST-3]
  },
  oneLine: {
    title: "Install in one line",
    lead: "In Terminal, on your Mac:",
    command: release.installCommand, // [C-REL-4]
    copy: common.copy,
    copyAria: "Copy the install command",
    copied: "Copied, paste it in Terminal",
    copyFailed: "Couldn't copy automatically. The command is selected: copy it with ⌘C.", // the pill selects it (Install.pill.tsx)
    /** The line under the pill (design comps 2 and 3): the installer's source, then two of its options, short. */
    readFirst: { label: "Read the installer first", href: links.installScriptSource }, // [C-INST-9]
    preview: "Add `-s -- --dry-run` after `bash` to see what it would do. Nothing changes.", // [C-INST-9] README.md@v1.0.1:40-43
    uninstall: "Add `-s -- --uninstall` after `bash` to uninstall it later. The app is moved aside, and your data stays.", // [C-INST-13]
    whatItDoesTitle: "What the installer does",
    whatItDoes: [
      "Runs only on macOS on Apple silicon, not under Rosetta.", // [C-INST-4]
      "Downloads the zip and `SHA256SUMS` from the latest GitHub release over HTTPS, and checks the zip's SHA-256.", // [C-INST-5]
      "Checks the app's identifier, version and code signature before it changes anything.", // [C-INST-6]
      "Moves any earlier `Pebble.app` to `~/PebbleBackups`. It never deletes one.", // [C-INST-7]
      "Never uses `sudo`, never changes Gatekeeper and never removes quarantine flags.", // [C-INST-8]
      "Never touches your data in `~/.pebble` or `~/Documents/Pebble`.", // [C-INST-8]
    ],
    quarantineNote:
      "The installer downloads with curl, which doesn't quarantine files, so macOS opens Pebble without the first-run warning.", // [C-INST-10]
  },
  byHand: {
    title: "Or download it and check it",
    downloadZip: "Download the zip",
    downloadChecksums: "SHA256SUMS",
    /** Three steps; the checksum note sits under the first, where it applies (DESIGN §9). [C-INST-11] [C-DL-1] [C-DL-2] */
    steps: [
      "Download both into one folder. In Terminal, in that folder, run `shasum -a 256 -c SHA256SUMS`. It should print `Pebble-macos-arm64.zip: OK`.",
      "Double-click the zip and drag `Pebble.app` to Applications.",
      "The first time you open it, macOS may say it cannot verify the app, because Pebble is not notarized. Allow Pebble alone: Control-click `Pebble.app`, choose Open, then Open again. On recent macOS versions, open System Settings › Privacy & Security and click Open Anyway next to the message about Pebble.",
    ],
    checksumNote: "The checksum shows the download arrived intact. It does not prove who made it.", // [C-LIM-3]
    gatekeeper: "Never turn Gatekeeper off.", // [C-DL-3]
  },
  firstRun: {
    title: "First run",
    body:
      "The first time, with no model connected, Pebble opens its full window with a welcome: Connect your ChatGPT account, or Use a local model. After that, Pebble starts as the pebble.", // [C-INST-12]
  },
  update: {
    title: "Update",
    body:
      "Quit Pebble and run the installer again. It keeps the previous app in `~/PebbleBackups` and leaves your data where it is. Pebble 1.0 doesn't check for updates by itself, so watch the releases on GitHub.", // [C-INST-14]
    link: { label: "Releases on GitHub", href: links.releases, external: true } satisfies Link,
  },
  /** After the short honest line next to the downloads: a link to the full list, the next section. */
  limitsLink: "All of Pebble's limits",
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 11. Open source (the FAQ is in faq.ts)
// ---------------------------------------------------------------------------------------------------------------

export const openSource = {
  h2: "Free and open source.",
  lead:
    "Pebble's code is on GitHub under the Apache License 2.0. Read it, build it yourself from a clean clone, or help improve it.", // [C-OSS-1]
  tested: `Before release, Pebble ${releaseFacts.version} passed ${formatCount(releaseFacts.tests)} automated tests and ${formatCount(releaseFacts.serviceChecks)} service checks. The tests never call a model or the network.`, // [C-OSS-2]
  maintainer: "Pebble is maintained by one person. Please allow time for a reply.", // [C-OSS-3]
  repoCard: {
    name: "tohin003/Pebble",
    licence: "Apache-2.0",
    latest: (version: string) => `Latest release: v${version}`,
    released: (date: string) => `Released ${date}`,
    stars: (stars: number) => plural(stars, "star", "stars"),
    builtNote: "Read from GitHub when this page was built.",
  },
  links: [
    { label: "Read the source", href: links.repo, external: true },
    { label: "Build it yourself", href: links.building, external: true },
    { label: "Contribute", href: links.contributing, external: true },
    { label: "Report a security issue", href: links.security, external: true },
    { label: "Code of conduct", href: links.codeOfConduct, external: true },
    { label: "What's new", href: links.changelog, external: true },
  ] satisfies readonly Link[],
  chapterId: "open-source",
} as const;

export const faqSection = {
  h2: "Questions",
} as const;

// ---------------------------------------------------------------------------------------------------------------
// 12. Final call to action and footer
// ---------------------------------------------------------------------------------------------------------------

export const finalCta = {
  h2: "Say hi to Pebble.",
  lead: "Free and open source, for Macs with Apple silicon.", // [C-HERO-3]
  chapterId: "get",
} as const;

export const footer = {
  navLabel: "Footer",
  links: [
    { label: "GitHub", href: links.repo, external: true },
    { label: "Releases", href: links.releases, external: true },
    { label: "Film transcript", href: "/film" },
    { label: "Credits", href: "/credits" },
    { label: "Privacy", href: "/privacy" },
  ] satisfies readonly Link[],
  /** Word for word from OVERRIDES §2. Show wherever the pebble appears. */
  credit: "Pebble's character engine: bloub by Jérémy Perret (MIT)",
  resting: "Pebble is resting. No telemetry.", // [C-FOOT-1] ("It never phones home" dropped: OVERRIDES §8 H14)
  /**
   * The honesty stamp, counted live in the browser (src/components/shell/Footer.stamp.tsx) and shown as a list, never
   * as a middle-dot string (DESIGN §3). Nothing is shown until it has been counted. [I: C-F2B-3]
   */
  honestyStamp: {
    lead: "This page:",
    cookies: (n: number) => plural(n, "cookie", "cookies"),
    trackers: (n: number) => plural(n, "tracker", "trackers"),
    thirdParty: (n: number) => plural(n, "third-party request", "third-party requests"),
  },
  honestyDetails: {
    summary: "How this is counted",
    body: "Your browser counts these live, from the list of files this page loaded and from `document.cookie`. Nothing is sent anywhere.",
    trackers:
      "A tracker is any request to a known analytics or advertising service, including Vercel's own analytics, and any beacon.",
    listHeading: "Files this page loaded",
    otherSites: "Files from other sites",
    allSameOrigin: "Every file came from this site.",
  },
  trademarks: [
    "ChatGPT and OpenAI are trademarks of OpenAI. Claude and Anthropic are trademarks of Anthropic. Mac, macOS and Apple silicon are trademarks of Apple Inc. Chrome is a trademark of Google LLC. Bing is a trademark of Microsoft.",
    "Pebble is an independent open-source project, not affiliated with any of them, or with Pebble smartwatches. Other names are trademarks of their owners.",
  ],
  licence: "Site code: Apache-2.0. Films and images © 2026 Tohin Majumder.",
} as const;

/** The compact pill that appears once the hero leaves view (MASTER_PLAN §7.4). */
export const stickyCta = {
  label: "Get Pebble",
  download: "Download for Mac",
  meta: (version: string = release.version, sizeLabel: string = release.sizeLabel) => `v${version} · ${sizeLabel}`,
  github: "GitHub",
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Media: text alternatives for the real-UI stills, the loops and the teaser
// ---------------------------------------------------------------------------------------------------------------

export const media = {
  stills: {
    mainDone:
      "Pebble's main window after a bug fix in the invoice-kit project. The reply lists the changes, and the check reads “Verified · pytest 42 passed on current files”.",
    settingsPermissions:
      "Pebble's Settings, on the Permissions tab: Ask for approval, Auto in project and Full access, each with what runs without asking and what always asks.",
    settingsModels:
      "Pebble's Settings, on the Models tab, with the three ways to connect a model: Add a model file, Connect provider and Continue with ChatGPT.",
    mainQuiz: "A five-question quiz on Python's datetime module, built by Pebble as a view in the conversation, with a timer.",
    mainDashboard:
      "A “Lisbon trip budget” dashboard built by Pebble: money spent and left, bookings confirmed, spending by category and what is still to book.",
    // Alt texts for the other stills in public/ui/v1 (lane D), written from the captures themselves.
    mainApproval:
      "Pebble's main window on the invoice-kit project, with two edit cards waiting for approval, each with its diff.",
    heldUnverified:
      "A reply in Pebble held by AgentGuard: “Blocked” and “Pebble's change isn't verified yet.”, because two files changed and the tests that cover them weren't run, with the buttons Run the tests, Ask Pebble to finish and Accept as unverified.",
    mainChallenge:
      "Pebble's Details drawer on the Activity tab. After edits to five files the request doesn't reach, the next edit is refused: “AgentGuard — evidence check”, “5 file(s) changed that the task does not reach” and “Either explain what connects these to the task, or split them into a separate change.”",
    settingsMemory:
      "Pebble's Settings, on the Memory tab: the Remember useful context switch, the six kinds of memory and the saved records, each with a button to forget it.",
  },
  loops: {
    companion: {
      name: "desktop",
      label:
        "The pebble on a desktop. The pointer moves in, the pebble's eyes follow it, and a click opens a quick chat where a reply appears.",
    },
    models: {
      name: "models",
      label: "Pebble's Models settings. The view moves across the three ways to connect a model and stops on Add a model file.",
    },
    approveUndo: {
      name: "approval",
      label: "An approval card for invoice_kit/dates.py. Apply edit is pressed, the card shows Done, and Undo this edit appears.",
    },
    isolatedTests: {
      name: "tests",
      label: "A task's timeline: “Requesting isolated tests”, then the check “Verified · pytest 42 passed on current files”.",
    },
    reviewCommands: {
      name: "commands",
      label: "A terminal command waits for approval, then runs. A Git plan follows, with its Run Git plan button.",
    },
    agentGuard: {
      name: "AgentGuard",
      label: "A task held with “Pebble's change isn't verified yet.” Run the tests is pressed, and the task becomes Verified.",
    },
    memory: {
      name: "memory",
      label: "Pebble's Memory settings. The pointer chooses Forget this memory, and the record disappears.",
    },
    views: {
      name: "views",
      label:
        "The Lisbon trip budget dashboard Pebble built as a view. The view moves into its chart, cuts to a Python quiz, then returns to the dashboard.", // FILM_SPEC §16 L8
    },
  },
  teaser: "A silent preview: an edit is approved, the tests run, and the check reads Verified.",
  loopControls: {
    pause: (name: string) => `Pause the ${name} clip`,
    play: (name: string) => `Play the ${name} clip`,
  },
  caption: common.sampleData,
} as const;

// ---------------------------------------------------------------------------------------------------------------
// Other pages: 404, /film, /credits, /privacy
// ---------------------------------------------------------------------------------------------------------------

export const notFound = {
  title: "Page not found",
  h1: "This page isn’t here.", // a typographic apostrophe: the H1 is set in the display serif
  body: "The address may have a typo, or the page may have moved.",
  home: "Go to the home page",
} as const;

export const filmPage = {
  title: "Film transcript",
  h1: "The Pebble film",
  lead:
    "A short film with music and no voiceover. This page describes it part by part, with every line of on-screen text.", // [C-FILM-1]
  play: "Play the film",
  sampleData: common.sampleData,
  transcriptHeading: "Transcript",
  onScreenLabel: "On screen",
  descriptionLabel: "What you see",
  soundLabel: "Sound",
  durationLabel: (duration: string) => `Length: ${duration}`,
  backHome: "Back to the home page",
} as const;

export const creditsPage = {
  title: "Credits",
  h1: "Credits",
  lead: "Pebble and this site are built on other people's work. Thank you.",
  licenceNote:
    "This site's code is licensed under the Apache License 2.0. That licence doesn't cover the work below: each piece keeps its own licence.",
  /** Above bloub's MIT notice, in full (critic M10). [C-F2B-4] */
  bloubLicenceTitle: "bloub's licence",
  bloubLicenceIntro: "bloub's code runs in this site's JavaScript, to draw the live pebble, so its MIT licence is reproduced here in full.",
  backHome: "Back to the home page",
} as const;

export const privacyPage = {
  title: "Privacy",
  h1: "Privacy on this site",
  paragraphs: [
    "This site sets no cookies and runs no analytics or trackers. Everything it loads, including the fonts, the images and the film, comes from this site.", // [C-PAGE-1]
    "The site is hosted by Vercel. To deliver the pages, Vercel's servers receive your IP address and the details of each request, as every website's servers do. Vercel's privacy policy explains how it handles them.", // [C-PAGE-2]
    "The Pebble app is separate from this site. It has no telemetry, and the home page lists what it keeps on your Mac and what it sends.", // [C-PAGE-3]
  ],
  links: [
    { label: "Vercel's privacy policy", href: links.vercelPrivacy, external: true },
    { label: "What Pebble stores, and what it sends", href: "/#privacy" },
  ] satisfies readonly Link[],
  backHome: "Back to the home page",
} as const;
