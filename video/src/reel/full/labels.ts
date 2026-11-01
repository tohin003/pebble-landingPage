// Every explainer's labels and the beat each lands on (REVIEW B2: at most three labels, about six label words, each held
// 0.4 s a word). The explainers draw these; check.ts proves the holds. Pure; no React.
export interface HeroLabel {
  text: string;
  /** the beat it lands on, from the hero's start */
  at: number;
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
  visual: [
    { text: "a table", at: 0.1 },
    { text: "becomes a chart", at: 2 },
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
