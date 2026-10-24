// Self-hosted fonts (src/fonts, SIL OFL 1.1), loaded with next/font/local: no request leaves the site (DESIGN §8).
// Budget (MASTER_PLAN §7.7, critic M4): at most 160 KB preloaded. Fraunces Display (an instance, 32.9 KB) plus Inter
// (the wght-only file, 48.3 KB) plus Geist Mono (two static weights, about 10 KB each) is about 101 KB. Geist Mono is
// preloaded since the final QA pass: the first screen uses it (the release facts), so every load fetched it anyway, but
// only once the stylesheet had named it, which put HTML → CSS → font on mobile LCP's critical path (2.56 s, over 2.5 s).
// Inter's optical-size file (72.9 KB) was dropped by QA lane F3: on the site Inter is never larger than 25 px (the
// headings are Fraunces; the wordmark is 25 px), so its display cut barely shows, and the 24.6 KB it adds to the first
// screen kept Lighthouse's mobile LCP over the 2.5 s limit (2.63 s → 2.48 s over HTTP/2). The film keeps the opsz file.

import localFont from "next/font/local";

/** Headings: Fraunces at 350, SOFT 100, WONK 0, with only the optical-size axis left (tools/assets/fonts.sh). */
export const fraunces = localFont({
  src: [{ path: "../fonts/Fraunces-Display-latin.woff2", weight: "350", style: "normal" }],
  variable: "--font-fraunces",
  display: "swap",
  preload: true,
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});

/** Text and labels: Inter, weights 100–900 (the text design, opsz 14). */
export const inter = localFont({
  src: [{ path: "../fonts/Inter-Variable-latin.woff2", weight: "100 900", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
  preload: true,
  fallback: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Helvetica", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});

/** Commands and file paths only. */
export const geistMono = localFont({
  src: [
    { path: "../fonts/GeistMono-Regular-latin.woff2", weight: "400", style: "normal" },
    { path: "../fonts/GeistMono-Medium-latin.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-geist-mono",
  display: "swap",
  preload: true,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  adjustFontFallback: false,
});

export const fontVariables = `${fraunces.variable} ${inter.variable} ${geistMono.variable}`;
