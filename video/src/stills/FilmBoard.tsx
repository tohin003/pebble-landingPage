// The launch film as a board-o-matic (until lane G2's scenes exist): every shot of film/timeline.ts at its frames, the
// built looks where they exist, a slate with the shot's lines elsewhere. It is what LaunchFilm and LaunchFilmSquare
// render today, so a timing review against the music (and the style frames) works now. G2 replaces this component
// in Root.tsx with the animated film; the looks and the timeline stay.
import type { ComponentType } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Slate } from "../components";
import { GRID, SHOTS, STYLE_FRAMES, validateTimeline, type Shot } from "../film/timeline";
import { EndCardLook, HeldLook, HookLook, RevealLook, SageLinesLook, VerifiedLook } from "./looks";

/** Shots that have a built look. */
const QuestionsLook: React.FC = () => <SageLinesLook shotId="questions" />;
const ClaimsLook: React.FC = () => <SageLinesLook shotId="claims" />;

export const LOOKS: Partial<Record<string, ComponentType>> = {
  hook: HookLook,
  questions: QuestionsLook,
  reveal: RevealLook,
  held: HeldLook,
  verified: VerifiedLook,
  claims: ClaimsLook,
  endcard: EndCardLook,
};

let checked = false;
const assertTimeline = () => {
  if (checked) return;
  const problems = validateTimeline();
  if (problems.length) throw new Error(`film/timeline.ts is invalid:\n  ${problems.join("\n  ")}`);
  checked = true;
};

const ShotSlate: React.FC<{ shot: Shot }> = ({ shot }) => (
  <Slate
    tone={shot.world === "sage" ? "sage" : "paper"}
    meta={`${shot.id} · frames ${shot.from}–${shot.to - 1} · bars ${shot.from / GRID.barFrames + 1}–${shot.to / GRID.barFrames}`}
    title={shot.note.split(". ")[0] ?? shot.id}
    detail={shot.note}
    lines={shot.captions.map((c) => c.text)}
  />
);

/** The film at the current (absolute) frame. */
export const FilmBoard: React.FC = () => {
  assertTimeline();
  const frame = useCurrentFrame();
  const shot = SHOTS.find((s) => frame >= s.from && frame < s.to);
  if (!shot) return <AbsoluteFill style={{ background: "#F8F9F6" }} />;
  const Look = LOOKS[shot.id];
  return <AbsoluteFill>{Look ? <Look /> : <ShotSlate shot={shot} />}</AbsoluteFill>;
};

/**
 * Gate G1.5's sampler: frame i shows the film at STYLE_FRAMES[i].frame. A Sequence shifted by (i − target) makes every
 * useCurrentFrame() inside read the film's absolute frame, so these ARE film frames, from whatever component renders
 * the film (`film`, default the board).
 */
export const StyleFrames: React.FC<{ film?: ComponentType }> = ({ film: Film = FilmBoard }) => {
  const i = useCurrentFrame();
  const target = STYLE_FRAMES[Math.min(i, STYLE_FRAMES.length - 1)]!.frame;
  return (
    <Sequence from={i - target} layout="absolute-fill">
      <Film />
    </Sequence>
  );
};
