// F2-SetPieces-Demo: every set piece, at half size, on PLACEHOLDER UI (setpieces/standins.ts), each fitted to a real
// measured stretch of an audition track (demo/grids.ts) and checked by setpieces/qa.ts. One reel per aspect, each framed
// on its own (TREATMENT §3.12). The pieces play one after another with plain cuts between them (the slate in the corner
// names the piece on every frame); in the film the edit lane joins them with the seams §5.1 names (film2/README.md,
// "The set pieces"). The wall hands its camera to the convergence without a cut.
import { AbsoluteFill, Sequence } from "remotion";
import type { Aspect } from "../../tokens";
import { PieceView } from "../views/PieceView";
import { CodaView, EndCardCarriedOn } from "../views/CodaView";
import { SetPiecesSlate } from "../views/StandInViews";
import { carriedEndCardFrames, carriesEndCard, codaOf } from "../coda";
import { demoPlans, type DemoEntry } from "./plans";

export const DEMO_SIZE: Record<Aspect, { w: number; h: number }> = { "16:9": { w: 1920, h: 1080 }, "1:1": { w: 1080, h: 1080 }, "9:16": { w: 1080, h: 1920 } };

export const demoLength = (entries: readonly DemoEntry[]): number => entries.reduce((n, e) => n + e.plan.duration, 0);

/** `slate`: the placeholder slate in the corner (default on; --props '{"slate":false}' renders the pieces as a film draws them). */
export const SetPiecesDemo: React.FC<{ aspect: Aspect; only?: string; slate?: boolean }> = ({ aspect, only, slate = true }) => {
  const entries = demoPlans(aspect).filter((e) => !only || e.plan.id === only);
  let at = 0;
  return (
    <AbsoluteFill>
      {entries.map((e, i) => {
        const from = at;
        at += e.plan.duration;
        const next = entries[i + 1]?.plan;
        const prev = entries[i - 1]?.plan;
        // the end card a coda carries on is drawn once, from its start through the closing iris, so its type layers
        // live on across L0 (views/CodaView.tsx EndCardCarriedOn; the review's F2, 1 Nov)
        if (next && carriesEndCard(e.plan, next))
          return (
            <Sequence key={e.plan.id} from={from} durationInFrames={carriedEndCardFrames(next)} name={`${e.plan.name}, carried on`}>
              <EndCardCarriedOn coda={next} />
              {slate ? (
                <Sequence durationInFrames={e.plan.duration} layout="none">
                  <SetPiecesSlate piece={e.plan.name} />
                </Sequence>
              ) : null}
            </Sequence>
          );
        return (
          <Sequence key={e.plan.id} from={from} durationInFrames={e.plan.duration} name={e.plan.name}>
            {codaOf(e.plan) ? <CodaView plan={e.plan} slate={slate} endCard={prev && carriesEndCard(prev, e.plan) ? "carried" : "own"} /> : <PieceView plan={e.plan} slate={slate} />}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
