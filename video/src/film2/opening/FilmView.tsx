// The whole film in one aspect (opening/film.ts): the opening's acts, the reel's pieces at their local frames, the end
// card's held last frame and the post-credit scene, under the score's master. The slate is off everywhere (D157: no
// version on screen). The master is muted where an act cuts the score out (RS-9's beat), with 2-frame edges; the X cut
// ends on the coda's first frame with a short fade of the room tone (MASTER_NOTES, R3-06).
import { AbsoluteFill, Audio, Freeze, Sequence, staticFile } from "remotion";
import type { Aspect } from "../tokens";
import { PieceView } from "../setpieces/views/PieceView";
import { CodaView, EndCardCarriedOn } from "../setpieces/views/CodaView";
import { carriedEndCardFrames, carriesEndCard, codaOf } from "../setpieces/coda";
import { ActView } from "./ActView";
import { MASTER_AUDIO, filmFrames, filmSegments, masterGain, xSegments, type FilmSegment } from "./film";

const Segment: React.FC<{ s: FilmSegment; carried?: boolean }> = ({ s, carried = false }) => {
  if (s.kind === "act") return <ActView act={s.act} />;
  const body = codaOf(s.plan) ? <CodaView plan={s.plan} slate={false} endCard={carried ? "carried" : "own"} /> : <PieceView plan={s.plan} slate={false} />;
  if (s.kind === "hold") return <Freeze frame={s.frame}>{body}</Freeze>;
  return (
    <Sequence from={-s.from} name={`${s.id} local`}>
      {body}
    </Sequence>
  );
};

export const FilmView: React.FC<{ aspect: Aspect; x?: boolean; audio?: boolean }> = ({ aspect, x = false, audio = true }) => {
  const segs = x ? xSegments(aspect) : filmSegments(aspect);
  const end = filmFrames(segs);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {segs.map((s, i) => {
        const next = segs[i + 1];
        const prev = segs[i - 1];
        // the end card a coda carries on is drawn once, from its start through the closing iris (the coda lane's F2,
        // views/CodaView.tsx EndCardCarriedOn), as SetPiecesDemo draws it; the coda then draws over it
        if (s.kind === "piece" && s.from === 0 && next?.kind === "piece" && carriesEndCard(s.plan, next.plan))
          return (
            <Sequence key={s.id} from={s.at} durationInFrames={carriedEndCardFrames(next.plan)} name={`${s.id}, carried on`}>
              <EndCardCarriedOn coda={next.plan} />
            </Sequence>
          );
        const carried = s.kind === "piece" && prev?.kind === "piece" && carriesEndCard(prev.plan, s.plan);
        return (
          <Sequence key={s.id} from={s.at} durationInFrames={s.frames} name={s.id}>
            <Segment s={s} carried={carried} />
          </Sequence>
        );
      })}
      {audio ? <Audio src={staticFile(MASTER_AUDIO[aspect])} volume={(f) => masterGain(segs, f, x ? end : undefined)} /> : null}
    </AbsoluteFill>
  );
};

/** The film's length in an aspect (the main cut, or the X cut). */
export const filmLength = (aspect: Aspect, x = false): number => filmFrames(x ? xSegments(aspect) : filmSegments(aspect));
