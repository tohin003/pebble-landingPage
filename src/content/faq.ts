// src/content/faq.ts
//
// The FAQ on the home page (MASTER_PLAN §7.2 row 11). Each answer is a list of short paragraphs. A span in backticks
// is inline code. Every factual sentence has a row in docs/CLAIMS.md under "FAQ" ([C-FAQ-…] tags below).
// Same voice rules as copy.ts: plain words, British spelling, no exclamation marks.

import type { Link } from "./copy";
import { installCommands, links, sectionIds, stealth } from "./copy";

export type FaqItem = Readonly<{
  /** Anchor id, e.g. "faq-notarized". Stable: other copy links to some of these. */
  id: string;
  question: string;
  answer: readonly string[];
  links?: readonly Link[];
}>;

export const faqHeading = "Questions";

export const faq: readonly FaqItem[] = [
  {
    id: "faq-free",
    question: "Is Pebble free?",
    answer: [
      "Yes. Pebble is free and open source, under the Apache License 2.0.", // [C-FAQ-1]
      "A cloud model's costs depend on your provider. Continue with ChatGPT needs an eligible Plus or Pro plan through OpenAI's preview, with that plan's limits, and API billing is separate.", // [C-FAQ-2] (OVERRIDES §8 H14)
    ],
  },
  {
    id: "faq-macs",
    question: "Which Macs does it run on?",
    answer: [
      "A Mac with Apple silicon (M1 or later), on macOS 12 or later. Pebble 1.0 was built and tested on macOS 27.", // [C-FAQ-3]
      "There is no version for Intel Macs, Windows or Linux, and the installer won't run under Rosetta.", // [C-FAQ-4]
    ],
  },
  {
    id: "faq-notarized",
    question: "Why isn't it notarized?",
    answer: [
      "Pebble 1.0 is signed with the project's own stable identity, not an Apple Developer ID, and it is not notarized by Apple. Signed, notarized installers are on the list of work still to do.", // [C-FAQ-5]
      "So the first time you open a copy downloaded in a browser, macOS may say it cannot verify the app. Allow Pebble alone: Control-click `Pebble.app`, choose Open, then Open again, or click Open Anyway in System Settings › Privacy & Security. Never turn Gatekeeper off.", // [C-FAQ-6]
      "The one-line installer downloads with curl, which doesn't quarantine files, so macOS opens Pebble without that warning. Before it installs anything, it checks the download's SHA-256 and the app's signature.", // [C-FAQ-7]
    ],
  },
  {
    id: "faq-models",
    question: "Which models can I use?",
    answer: [
      "There are three ways in, all in Settings › Models.", // [C-FAQ-8]
      "Continue with ChatGPT signs in with your ChatGPT account. It needs an eligible Plus or Pro plan through OpenAI's preview for open-source and approved clients.", // [C-MOD-2] [C-MOD-3]
      "Connect provider adds an API key for an OpenAI-compatible service, such as OpenAI, Ollama or LM Studio, an Anthropic key, or a Responses API endpoint.", // [C-MOD-4]
      "Add a model file runs a GGUF model on your Mac with the bundled llama.cpp. Pebble downloads no model by itself; the project tests with Microsoft's FrogNano-4B-2609, a file of about 2.8 GB.", // [C-FAQ-9]
      "Local models read text only. To work with images, use a model that can see images.", // [C-FAQ-10]
    ],
    links: [{ label: "How the project chose its test model", href: links.modelSelection, external: true }],
  },
  {
    id: "faq-data",
    question: "Does it send my data anywhere?",
    answer: [
      "Your conversations and memories are stored on your Mac, and your keys stay in the macOS Keychain. Pebble has no telemetry: it sends no analytics.", // [C-FAQ-11]
      "What leaves your Mac: with a cloud model, your message and the context Pebble sends with it, such as the recent conversation and the memories Pebble recalls for it, go to the provider you chose. Your search words go to Microsoft Bing's RSS feed, the web pages Pebble reads for you are fetched from their own sites, weather lookups go to Open-Meteo, and calls go to the connectors you add.", // [C-PRIV-6..9] [C-PRIV-12] (OVERRIDES §8 C1: five destinations)
      "With a local model, the conversation stays on your Mac.", // [C-MOD-8]
    ],
    links: [{ label: "Where Pebble keeps your things", href: links.dataFolders, external: true }],
  },
  {
    // Pebble 1.1.0 (OVERRIDES §21): the facts in Pebble's own words (copy.ts `stealth`), and the honest line word for
    // word, as everywhere Stealth Lockdown is named (src/content/stealth.test.ts checks it).
    id: "faq-screen-share",
    question: "Can people see Pebble when I share my screen?",
    answer: [
      "By default, yes: Stealth Lockdown is off, and Pebble shows in screen shares, the Dock and ⌘Tab as usual.", // [C-FAQ-22] (C-STL-2, C-STL-8)
      `${stealth.summary} ${stealth.turnOn} ${stealth.hideAll}`, // [C-STL-3] [C-STL-4]
      stealth.honest, // [C-STL-7]
    ],
    links: [{ label: stealth.name, href: `/#${sectionIds.stealth}` }],
  },
  {
    id: "faq-offline",
    question: "Can I use it without an internet connection?",
    answer: [
      "Yes, for chat with a model file on your Mac: its replies are made on this Mac. Web search, weather, ChatGPT and other providers need a connection.", // [C-FAQ-12]
    ],
  },
  {
    id: "faq-agentguard",
    question: "Is AgentGuard a security feature?",
    answer: [
      "No. AgentGuard is a reliability check, not a security layer. Before Pebble calls a task finished, it checks the evidence: when tests cover the code the task changed, they must have passed since the change, and written JSON or CSV files must parse. Changed code without covering tests is not held.", // [C-FAQ-13] (1.0.3)
      "It also indexes your project, grounds each request in the files it reaches, and challenges an agent that drifts outside that scope.", // [C-FAQ-14]
      "When the evidence is missing, the task is held at “verification required”, and you choose: run the covering tests, ask Pebble to finish, or accept the change as not verified.", // [C-FAQ-15]
      "Protection comes from elsewhere: the permission mode you pick, approvals that happen only in Pebble's main window, and macOS's sandbox, which limits commands and tests but is not a promise against every attack.", // [C-FAQ-16]
    ],
  },
  {
    id: "faq-update",
    question: "How do I update Pebble?",
    answer: [
      "Quit Pebble and run the installer again. It keeps the previous app in `~/PebbleBackups` and leaves your data where it is. When an update changes how Pebble stores its data, Pebble backs up its database first.", // [C-FAQ-17]
      "Pebble 1.0 doesn't check for updates by itself. To hear about new releases, watch the repository on GitHub: Watch › Custom › Releases.", // [C-FAQ-18]
    ],
    links: [{ label: "Releases on GitHub", href: links.releases, external: true }],
  },
  {
    id: "faq-uninstall",
    question: "How do I uninstall?",
    answer: [
      `Run the installer with \`--uninstall\`: \`${installCommands.uninstall}\``, // [C-INST-13]
      "It moves `Pebble.app` to `~/PebbleBackups` and lists what Pebble keeps on your Mac. Your data is never touched.", // [C-INST-13]
      "To remove everything, including your data and Keychain items, follow “Remove Pebble completely” in the data folders guide.", // [C-FAQ-19]
    ],
    links: [{ label: "Remove Pebble completely", href: links.removeCompletely, external: true }],
  },
  {
    id: "faq-who",
    question: "Who makes Pebble?",
    answer: [
      "Pebble is an independent open-source project by Tohin Majumder, maintained by one person. It is not affiliated with OpenAI, Anthropic, Apple, Google or Microsoft, or with Pebble smartwatches.", // [C-FAQ-20]
      "For anything larger than a small fix, open an issue on GitHub first. Report security problems privately, as the security policy describes.", // [C-FAQ-21]
    ],
    links: [
      { label: "Issues on GitHub", href: links.issues, external: true },
      { label: "Security policy", href: links.security, external: true },
    ],
  },
];
