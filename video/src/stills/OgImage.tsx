// The Open Graph / Twitter card (MASTER_PLAN D18, 1200 × 630), matching its alt text in src/content/seo.ts: "The
// Pebble companion, a sage-green pebble with two white eyes, next to the words “A little help, right here.”"
// The words are the hero's H1 from src/content/copy.ts. Large enough to read in a feed at about 500 px wide.
import { AbsoluteFill } from "remotion";
import { hero } from "../../../src/content/copy";
import type { PebbleCue } from "../../../shared/pebble";
import { PaperField, Vignette } from "../components";
import { FONT } from "../fonts";
import { COLOR, TYPO } from "../motion/spec";
import { PebbleOnFilm } from "../pebble/PebbleOnFilm";

const STILL_CUES: readonly PebbleCue[] = [{ at: 0, look: { x: 0.5, y: 0 }, note: "looking at the words" }];

export const OgImage: React.FC = () => {
  // "A little help, right here." on two lines at the comma, as the site's H1 balances it
  const [first, second] = splitAtComma(hero.h1);
  return (
    <PaperField pool={{ x: 0.3, y: 0.46 }}>
      <PebbleOnFilm cues={STILL_CUES} size={430} x={330} y={452} offsetFrames={30} />
      <AbsoluteFill style={{ left: 560, right: 64, justifyContent: "center" }}>
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: TYPO.display.weight,
            fontVariationSettings: TYPO.display.axes,
            fontSize: 86,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            color: COLOR.ink,
          }}
        >
          <div>{first}</div>
          <div>{second}</div>
        </div>
      </AbsoluteFill>
      <Vignette amount={0.045} />
    </PaperField>
  );
};

function splitAtComma(s: string): [string, string] {
  const i = s.indexOf(",");
  return i < 0 ? [s, ""] : [s.slice(0, i + 1), s.slice(i + 1).trim()];
}
