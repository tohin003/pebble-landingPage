// Every explainer's labels and the beat each lands on (REVIEW B2: at most three labels, about six label words, each held
// 0.4 s a word). The explainers draw these; check.ts proves the holds. Pure; no React.
export interface HeroLabel {
  text: string;
  /** the beat it lands on, from the hero's start */
  at: number;
  /** the beat it fades on, if before the hero's end */
  until?: number;
}

export const HERO_LABELS: Readonly<Record<string, readonly HeroLabel[]>> = {
  // the chip's two words ("done", "verified") are its states; the rows land on beats 1 and 1¼
  agentguard: [
    { text: "the tests", at: 1 },
    { text: "the files", at: 1.25 },
    { text: "verified", at: 4 },
  ],
  workshop: [
    { text: "a small tool", at: 0.1 },
    { text: "a blind check", at: 1 },
  ],
  // the table's rows land on the eighths, it sorts on beat 2 and its bars rise one per eighth from beat 2½; "a table"
  // fades as they do (REVIEW-v2 S11, N8)
  visual: [
    { text: "a table", at: 0.1, until: 2.5 },
    { text: "becomes a chart", at: 2.5 },
  ],
  longtasks: [
    { text: "older tool results", at: 0.5 },
    { text: "sealed", at: 1.8 },
    { text: "returned exactly", at: 3.15 },
  ],
  remote: [
    { text: "Wi-Fi or Tailscale", at: 0.65 },
    { text: "approve with Face ID", at: 1.5 },
  ],
};
