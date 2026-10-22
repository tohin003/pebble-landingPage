// Self-hosted fonts (src/fonts, SIL OFL 1.1), loaded with next/font/local: no request leaves the site (DESIGN §8).
// Budget (MASTER_PLAN §7.7, critic M4): at most 160 KB preloaded. Fraunces Display (an instance, 32.9 KB) plus Inter
// with its optical-size axis (72.9 KB) is 105.8 KB; Geist Mono (two static weights, about 10 KB each) loads on demand.

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

/** Text and labels: Inter, weights 100–900, optical sizes 14–32. */
export const inter = localFont({
  src: [{ path: "../fonts/Inter-Variable-opsz-latin.woff2", weight: "100 900", style: "normal" }],
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
  preload: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  adjustFontFallback: false,
});

export const fontVariables = `${fraunces.variable} ${inter.variable} ${geistMono.variable}`;
