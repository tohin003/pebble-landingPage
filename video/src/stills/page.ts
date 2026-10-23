// The page's roles, as the stills draw them (docs/DESIGN-LEXINGTON.md §3.3 and §5, light theme; comp lex-A's :root).
// A still that stands for the page (the Open Graph card) uses these values, so a shared link looks like the page it
// opens. The film's own palette lives in motion/spec.ts (COLOR, LOOK); these are the page's, after the system's move.
export const PAGE = {
  /** --bg: the one ground, top to bottom */
  bg: "#F8F9F6",
  /** --ink: headings and values, 14.9:1 on the ground; never black */
  ink: "#1D2520",
  /** --ink-2: second lines, leads, captions, 5.6:1 */
  ink2: "#5D665E",
  /** --trail: the line the pebble stands on (decorative only, never text) */
  trail: "#AABDA7",
  /** --shade: the pebble's contact shadow (the only shadow on the page) */
  shade: "19, 37, 27",
} as const;

/** Fraunces 350 with SOFT 100 and WONK 0 (D14): the H1 and H2 voice, "soft and exact" (PHILOSOPHY.md). */
export const DISPLAY = { weight: 350, axes: '"SOFT" 100, "WONK" 0', tracking: "-0.022em", leading: 1.04 } as const;
