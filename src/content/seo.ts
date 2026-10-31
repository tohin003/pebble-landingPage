// src/content/seo.ts
//
// Titles, descriptions, Open Graph text, the JSON-LD SoftwareApplication record and the text of public/llms.txt
// (MASTER_PLAN §7.8). Same voice and claim rules as copy.ts; sources in docs/CLAIMS.md under "SEO" ([C-SEO-…]).
// metadataBase comes from VERCEL_PROJECT_PRODUCTION_URL in layout.tsx (§2.2); nothing here hard-codes a domain.

import { benchmarkLinks, benchmarkLlmsLinesFor } from "./benchmarks";
import { formatMegabytes, links, release, stealth } from "./copy";
import { formatLongDate, releaseFacts } from "./releaseFacts";

export const seo = {
  siteName: "Pebble",
  /** The home page's <title>. The descriptor keeps it apart from the smartwatch brand (U1 §1.5). */
  title: "Pebble — a small AI companion for your Mac",
  titleTemplate: "%s – Pebble", // an en dash, never a middle-dot meta string (PHILOSOPHY; OVERRIDES §28 CL-13)
  description:
    "Pebble is a free, open-source AI companion for Macs with Apple silicon. Chat with the model you choose; you decide what it may change.", // [C-SEO-1]
  openGraph: {
    title: "Pebble: a little help, right here",
    description:
      "A free, open-source AI companion for Macs with Apple silicon. Chat with the model you choose; you decide what it may change.", // [C-SEO-1]
    imageAlt: "The Pebble companion, a sage-green pebble with two white eyes, next to the words “A little help, right here.”",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
  },
  themeColor: { light: "#F8F9F6", dark: "#191E1B" },
  pages: {
    film: {
      title: "Film transcript",
      description: "The Pebble launch film, described part by part, with every line of on-screen text.",
    },
    credits: {
      title: "Credits",
      description: "The people and projects behind Pebble's site and film: the character engine, fonts, music and tools.",
    },
    privacy: {
      title: "Privacy",
      description: "This site sets no cookies, runs no analytics and loads nothing from other websites.", // [C-PAGE-1]
    },
    notFound: {
      title: "Page not found",
      description: "This page isn't here.",
    },
  },
} as const;

export type JsonLdInput = Readonly<{
  version: string;
  sizeBytes: number;
  /** ISO date of the release, e.g. "2026-10-22". */
  datePublished: string;
  /** True when the release exists (always, unless PEBBLE_RELEASE_STATE=soon is set by hand). */
  live: boolean;
}>;

const defaultJsonLdInput: JsonLdInput = {
  version: release.version,
  sizeBytes: release.sizeBytes,
  datePublished: release.publishedOn,
  live: true,
};

/**
 * The SoftwareApplication record. No aggregateRating or review: Pebble has none, and none may be invented (§7.8).
 * downloadUrl and fileSize are included only when the release is live.
 */
/**
 * The card's picture, src/app/opengraph-image.png, named here because a page that sets its own `openGraph` or `twitter`
 * fields loses the file-based picture: Next.js attaches it only to the segment the file sits in (the layout, whose own
 * hashed URL wins over this one).
 */
const cardImage = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: seo.openGraph.imageAlt,
};

/**
 * One page's Open Graph fields: the site's card, with og:url set to the page's own canonical path. A page's `openGraph`
 * replaces the layout's whole object rather than merging into it, so each route sets all of it. Without this, /film,
 * /credits and /privacy inherited the layout's url "/", and a shared /film link opened the home page.
 */
export function openGraphFor(path: string) {
  return {
    type: seo.openGraph.type,
    siteName: seo.siteName,
    locale: seo.openGraph.locale,
    url: path,
    title: seo.openGraph.title,
    description: seo.openGraph.description,
    images: [cardImage],
  };
}

/** The X card for every page: the site's text and picture (see cardImage). */
export function twitterCard() {
  return {
    card: seo.twitter.card,
    title: seo.openGraph.title,
    description: seo.openGraph.description,
    images: [cardImage],
  };
}

export function softwareApplicationJsonLd(input: JsonLdInput = defaultJsonLdInput): Record<string, unknown> {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Pebble",
    description:
      "A free, open-source AI companion for Macs with Apple silicon. Chat with the model you choose; you decide what it may change.", // [C-SEO-1]
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "macOS 12 or later on Apple silicon", // [C-SEO-2] (OVERRIDES §28)
    processorRequirements: "Apple silicon (M1 or later)", // [C-SEO-2]
    softwareVersion: input.version, // [C-REL-1]
    datePublished: input.datePublished, // [C-REL-3]
    isAccessibleForFree: true, // [C-FAQ-1]
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    license: links.apacheLicence, // [C-OSS-1]
    author: { "@type": "Person", name: "Tohin Majumder", url: links.maintainer }, // [C-FAQ-20]
    releaseNotes: `https://github.com/tohin003/Pebble/releases/tag/v${input.version}`,
    sameAs: [links.repo],
  };
  return input.live
    ? { ...base, downloadUrl: release.downloadUrl, fileSize: formatMegabytes(input.sizeBytes) } // [C-REL-2]
    : base;
}

/** JSON for a <script type="application/ld+json">, with "<" escaped as Next.js recommends. */
export function jsonLdString(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * public/llms.txt: a short, factual summary so AI assistants describe Pebble accurately (llmstxt.org format).
 * Every line is sourced in docs/CLAIMS.md under "SEO" and "Honest limits". The "## Benchmark" block is there only while
 * the benchmark is public (releaseFacts.benchmarksPublic, the same gate as the page's section); the tests build the
 * closed version with llmsTxtFor(false). Stealth Lockdown (Pebble 1.1.0) is one line, in Pebble's own words, and it
 * carries the honest line word for word (OVERRIDES §21; src/content/stealth.test.ts). Pebble 2.0.0's lines (Projects'
 * Auto and Git, Across your Mac, Pebble's Workshop, AgentGuard's request checks, Memory, and the two limits) are rows
 * C-200-23 to C-200-27; the "## Benchmark" block leads with golden set 2.0 (C-GS-12).
 */
export function llmsTxtFor(benchmarksPublic: boolean): string {
  return `# Pebble

> Pebble is a free, open-source (Apache-2.0) AI companion for Macs with Apple silicon (M1 or later), on macOS 12 or later. A small animated pebble stays on your screen; click it to chat, or open the full window to work on a project with the model you choose, under your review.

Pebble ${releaseFacts.version} came out on ${formatLongDate(releaseFacts.publishedOn)}. Pebble is made by Tohin Majumder and maintained by one person.

## What it does

- Models: Continue with ChatGPT (an eligible Plus or Pro plan, through OpenAI's preview), an API key for an OpenAI-compatible service or Anthropic, a Responses API endpoint, or a GGUF model file run on the Mac by the bundled llama.cpp. Pebble downloads no model by itself.
- Permissions: three modes, Ask for approval (the default), Auto in project and Full access. Approvals happen only in Pebble's main window.
- Projects: in the default mode, every edit, test run, terminal command and Git change is a card you approve. Edits come with Undo. Tests run in a temporary copy of the project, without network access. In Auto in project, a command that stays in the project without network, and a Git step Pebble can undo, run without a card; pushes, deletions and history rewrites still ask. Everyday Git (revert, stash, rebase, merge, bisect and more) shows the exact command before it runs.
- Across your Mac: in a conversation without a project, Pebble can run commands, read and write files and take a screenshot when a request needs one. Each command runs in a sandbox that writes only in the Pebble Workbench folder and the folders you allowed, with no network unless you allowed the site. With Screen control on (off until you turn it on), Pebble can use one window of an open app after you allow it, through macOS Accessibility, and the websites you approve, in its own tab with Pebble for Chrome or in a browser window it reads through Accessibility. It never reads or types into a password, code or card field.
- Pebble's Workshop: Pebble can make a small tool, a pure calculation with no network, files or processes, validate it in a fresh sandbox and use it at once. It keeps a tool in its Toolbox on its own only when the tool passed every check, and tells you, with View code and Remove. Code Mode runs a short script that calls Pebble's tools; every call is checked, approved and recorded like a direct call.
- AgentGuard: an evidence layer between the model and the project. Before Pebble calls a task finished, tests that cover the code it changed must have passed since the change; changed code without covering tests is not held. An agent that drifts outside the files a request reaches is challenged. It also checks what you asked for, such as output that must match a file, and when something can't be confirmed, Pebble says the work is unverified instead of done. AgentGuard checks evidence; it is not a security layer.
- Memory: six kinds of memory. You can see, search and forget memories, and change or stop a saved preference in plain words. What you ask Pebble to remember reaches later conversations as your standing instructions; ~/.pebble/PEBBLE.md holds instructions in your own words. One switch turns memory off.
- Views: dashboards, tables, charts, plans, diagrams, quizzes and app demos, built from data. A view can never approve, run or change anything.
- Privacy: no telemetry. Conversations and memories are stored on the Mac, and keys stay in the macOS Keychain. With a local model, the conversation stays on the Mac.
- ${stealth.summary} ${stealth.offByDefault} ${stealth.turnOn} ${stealth.honest}
- What leaves the Mac: with a cloud model, your message and the context sent with it (such as the recent conversation and recalled memories) go to the provider you chose; search words go to Microsoft Bing's RSS feed; web pages Pebble reads are fetched from their own sites; weather lookups go to Open-Meteo; calls go to the connectors you add.

## Limits

- Pebble is signed with its own stable identity, not an Apple Developer ID, and it is not notarized.
- SHA256SUMS shows the download is intact. It does not prove who made it.
- No independent security audit has been done yet.
- Apple silicon only: there is no Intel, Windows or Linux version. No automatic updates.
- Models make mistakes.
- Pebble for Chrome loads in the browser's Developer mode. It has been checked end to end in Google Chrome. In a browser that keeps extensions out of its pages, such as Comet, Pebble works in a new window through Accessibility.
- Pebble uses another app's window only after you allow it, and never operates terminals, System Settings, Keychain Access, password managers, apps that run code or erase disks, or itself.
- Scheduled tasks run only while Pebble is open. Their results show in Pebble; macOS notifications are off until you turn them on.
- Commands run in macOS's sandbox, which limits them but is not a promise against every attack. Prompt injection from web pages or files is limited, not impossible.
${
  benchmarksPublic
    ? `
## Benchmark

${benchmarkLlmsLinesFor(releaseFacts.version).map((line) => `- ${line}`).join("\n")}
- [Golden set 2.0: the setup, the gates and what was not run](${benchmarkLinks.releaseNotes200})
- [The 1.0.2 run: the full results](${benchmarkLinks.results})
`
    : `- This site makes no speed or quality comparison with other tools.
`
}
## Install

- One line in Terminal: ${release.installCommand}
- Or download ${release.assetName} and SHA256SUMS from the latest release, and check them with: shasum -a 256 -c SHA256SUMS

## Links

- [Source code](${links.repo})
- [Release ${release.version}](${release.releaseNotesUrl})
- [Download for Mac (zip)](${release.downloadUrl})
- [User guide](${links.userGuide})
- [Changelog](${links.changelog})
- [Security policy](${links.security})
`;
}

export const llmsTxt = llmsTxtFor(releaseFacts.benchmarksPublic);
