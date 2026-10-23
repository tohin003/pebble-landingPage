// Pebble's design system on film (docs/PHILOSOPHY.md, "A precise world, and one soft stone"; the tokens are
// docs/DESIGN-LEXINGTON.md §3.3's, light theme). The film uses the page's identity so that any film frame could sit on
// the page without restyling (PHILOSOPHY principle 8):
// - one flat ground per world: no grain, no glow, no vignette, no pool of light. Colour and texture live only in
//   imagery (the riverbed, behind scenes; the pebble);
// - three voices: Fraunces 350 for the lines (the stone's voice), Inter 400/500 for support (the app's voice), Geist
//   Mono with tabular numerals for anything with a number in it (the data's voice);
// - a scene (the pebble on its desktop) sits on the riverbed; a moment (one card, one step, one row of Settings) sits in
//   a hairline frame on the paper ground; the pebble is the only thing that casts a shadow;
// - sage is the single accent, with three jobs on film: the check beside "Verified" (a state mark), the callout ring
//   (focus) and nothing else; the wordmark's full stop is the pebble itself.
//
// Every value says what it is for and how it reads, so a reviewer can check a frame against this sheet.

export const SYSTEM = {
  /** page: the paper ground of the reveal, the window world and the end card. #F8F9F6, oklch 98.1 % .004 122 */
  bg: "#F8F9F6",
  /** ink: Fraunces lines on paper, the wordmark, the URL. #1D2520, 14.9:1 on bg (DESIGN-LEXINGTON's ink, not the app's
   *  #252C28: the film follows the page) */
  ink: "#1D2520",
  /** muted ink: support lines, the CTA's words and the small print on paper. #5D665E, 5.6:1 on bg */
  ink2: "#5D665E",
  /** rule: the one hairline, drawn around a moment's frame. #DBE1D9, 1.26:1 on bg: a line, not a box */
  line: "#DBE1D9",
  /** action, on film: the check beside "Verified" (a state mark) and the callout ring (focus). #506E54, 5.4:1 on bg */
  accent: "#506E54",
  /** the pebble's world, decorative only: its body, the line it stands on */
  pebble: "#536B54",
  trail: "#AABDA7",
  /**
   * The sage field the type worlds sit on (S2, S3, S8 and outside the floods): FLAT #425643, one hue with the pebble.
   * White type reads at 7.9:1 on it (the lead's ≥ 7:1 rule from REVIEW-G2); white at 80 % (support) at 5.8:1. A field
   * still ARRIVES on the colour it is entered through (the pebble's #536B54, the quiz badge's #506E54) and settles on
   * this within 12 frames, a colour change, never a gradient.
   */
  sage: "#425643",
  onSage: "#FFFFFF",
  onSageMuted: "rgba(255, 255, 255, 0.8)",
  /** the colour a list item's words ink from on the sage field (entrance B) */
  inkFromSage: "rgba(255, 255, 255, 0.35)",
  /** the colour a word inks from on paper (entrance B): #B0C2AE, the accent's soft tint */
  inkFromPaper: "#B0C2AE",
} as const;

/**
 * Frames (PHILOSOPHY "Imagery"; DESIGN-LEXINGTON §3.5, §3.8), at the film's reference sizes (multiply by the layout's
 * `s`). A moment's frame: radius 16 (the page's media radius; its 12 px panel radius × 1920 / 1440), a 2 px ring in
 * `line` drawn OVER the picture's edge (the page's 1 px ::after ring; 2 px so it survives a 1080p encode, R5 §8), no
 * shadow. The line the pebble stands on: `trail`, 2.5 px (the page's 1.35 px at the film's scale and a phone's
 * downscale), the page's hand-drawn path, faded over its first and last 12 %.
 */
export const FRAME = {
  radius: 16,
  ring: 2,
  horizon: 2.5,
} as const;
