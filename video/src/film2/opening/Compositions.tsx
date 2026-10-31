// The opening's compositions (folder "Film2/Film"): each act alone per aspect (F2-Act-<act>-<aspect>), the whole film
// per aspect under the score's master (F2-Film-<aspect>, 8802 frames) and its X cut (F2-Film-X-<aspect>, 8334).
import { Composition, Folder } from "remotion";
import type { Aspect } from "../tokens";
import { DEMO_SIZE } from "../setpieces/demo/SetPiecesDemo";
import { ActView } from "./ActView";
import { FilmView, filmLength } from "./FilmView";
import { ACTS, SCORE } from "./film";
import { actFrames } from "./kit";

const ASPECTS: readonly [Aspect, string][] = [
  ["16:9", "16x9"],
  ["1:1", "1x1"],
  ["9:16", "9x16"],
];

/** The film's length, or the score's when a piece's plan can't be built right now (another lane mid-edit): never a throw at registration. */
const lengthOr = (a: Aspect, x: boolean): number => {
  try {
    return filmLength(a, x);
  } catch {
    return x ? SCORE.trueEnd : SCORE.codaEnd;
  }
};

export const OpeningCompositions: React.FC = () => (
  <Folder name="Film">
    {ACTS.flatMap((act) =>
      ASPECTS.map(([a, tag]) => (
        <Composition key={`${act.id}-${tag}`} id={`F2-Act-${act.id}-${tag}`} component={ActView} defaultProps={{ act }} durationInFrames={actFrames(act)} fps={60} width={DEMO_SIZE[a].w} height={DEMO_SIZE[a].h} />
      )),
    )}
    {ASPECTS.flatMap(([a, tag]) => [
      <Composition key={`film-${tag}`} id={`F2-Film-${tag}`} component={FilmView} defaultProps={{ aspect: a, x: false, audio: true }} durationInFrames={lengthOr(a, false)} fps={60} width={DEMO_SIZE[a].w} height={DEMO_SIZE[a].h} />,
      <Composition key={`x-${tag}`} id={`F2-Film-X-${tag}`} component={FilmView} defaultProps={{ aspect: a, x: true, audio: true }} durationInFrames={lengthOr(a, true)} fps={60} width={DEMO_SIZE[a].w} height={DEMO_SIZE[a].h} />,
    ])}
  </Folder>
);
