// The Open Graph / X card (1200 × 630), in the design system (docs/PHILOSOPHY.md; lane v2-loops): the hero's first
// screen, distilled to what a shared link needs. A flat ground (--bg, nothing else: no pool of light, no vignette), the
// H1 "A little help, right here." in Fraunces 350 and ink on the left, and the pebble on the right, standing on its
// hand-drawn line with its contact shadow, the card's one picture and its loudest thing (PHILOSOPHY principle 7: the
// H1 is never larger than the pebble beside it). No numbers: no version, size or count that could go stale.
// It matches its alt text in src/content/seo.ts: "The Pebble companion, a sage-green pebble with two white eyes, next to
// the words “A little help, right here.”" The words are the hero's H1 from src/content/copy.ts.
//
// The grid is the page's, scaled to the card: 12 columns with 64 px sides and 24 px gaps; the words in columns 1–6, the
// pebble's field in columns 7–12, as in comp lex-A's hero. The H1's last baseline sits on the pebble's line, so the
// words and the stone share one ground; the group is centred on the card's height. Feeds show the card at 500–600 px
// wide: the H1 is then 30–36 px, the line about 1 px.
import { AbsoluteFill } from "remotion";
import { hero } from "../../../src/content/copy";
import type { PebbleCue } from "../../../shared/pebble";
import { FACE_METRICS } from "../components";
import { FONT } from "../fonts";
import { PebbleOnFilm } from "../pebble/PebbleOnFilm";
import { Horizon } from "./Horizon";
import { DISPLAY, PAGE } from "./page";

/** At rest, the eyes straight ahead, at the person who opened the link (DESIGN.md §9, the site's resting gaze). */
const STILL_CUES: readonly PebbleCue[] = [{ at: 0, look: { x: 0, y: 0 }, note: "resting, straight ahead" }];

const W = 1200;
const H = 630;
const PAD = 64;
const GAP = 24;
const COL = (W - 2 * PAD - 11 * GAP) / 12;
/** the left edge of column n (1-based) and the right edge of column n */
const colX = (n: number) => PAD + (n - 1) * (COL + GAP);
const colEnd = (n: number) => colX(n) + COL;

const TYPE = 72; // px; two lines of about 500 px in a 524 px column
const BODY_W = 300; // the pebble's body, px (0.59 of its 220-unit box)
const SIZE = BODY_W / 0.5896;
const BODY_H = SIZE * 0.5186;
/** the ground: the pebble's foot and the H1's last baseline; the group (pebble top to line) is centred on the card */
const GROUND = Math.round((H + BODY_H) / 2);

export const OgImage: React.FC = () => {
  // "A little help, right here." on two lines at the comma, as the site's H1 balances it
  const [first, second] = splitAtComma(hero.h1);
  const field = { x: colX(7), w: colEnd(12) - colX(7) };
  const lineH = DISPLAY.leading * TYPE;
  // the top of the first line box, so the SECOND line's baseline sits on the ground
  const top = GROUND - (FACE_METRICS.display.baseline + (DISPLAY.leading - 1) / 2) * TYPE - lineH;
  return (
    <AbsoluteFill style={{ backgroundColor: PAGE.bg }}>
      <div
        style={{
          position: "absolute",
          left: colX(1),
          top,
          width: colEnd(6) - colX(1),
          fontFamily: FONT.display,
          fontWeight: DISPLAY.weight,
          fontVariationSettings: DISPLAY.axes,
          fontSize: TYPE,
          lineHeight: DISPLAY.leading,
          letterSpacing: DISPLAY.tracking,
          color: PAGE.ink,
          whiteSpace: "nowrap",
        }}
      >
        <div>{first}</div>
        <div>{second}</div>
      </div>
      <Horizon x={field.x} y={GROUND} width={field.w} stroke={2.25} />
      <PebbleOnFilm cues={STILL_CUES} size={SIZE} x={field.x + field.w / 2} y={GROUND} offsetFrames={30} />
    </AbsoluteFill>
  );
};

function splitAtComma(s: string): [string, string] {
  const i = s.indexOf(",");
  return i < 0 ? [s, ""] : [s.slice(0, i + 1), s.slice(i + 1).trim()];
}
