// T0 FilmTeaser (1280 × 720, 240 frames, 8 s, silent, seamless; docs/FILM_SPEC.md §15): a recomposed excerpt of the
// approve → test → Verified chain, playing in the film poster's frame on the page. Pebble's real window (the
// main-live-film recording) on the riverbed desktop at m 0.75; the camera moves into the edit card, the pointer
// clicks Apply edit, a match cut shows Done with Undo this edit, a hard cut to the "Run isolated tests" card, Run
// tests, the drawer's newest steps, "Verified · pytest 42 passed on current files", the camera back to the wide frame
// and a time-passage dissolve to frame 0's picture. No pebble (the page's live pebble may still be in view; one
// animated pebble at a time) and no text (the page's label and chapter list carry the words). In the close framings
// the conversation recedes under a veil and, at the payoff, so do the drawer's rows above the newest ones (lane G-fix,
// REVIEW-G2 P1-9).
// Frame 0 is the film poster (stills/FilmPoster.tsx renders this component at frame 0). Data: loops/plans.ts T0.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Cursor, Desktop, MacWindow, Vignette, World } from "../components";
import { cameraAt, type CamPose } from "../motion/camera";
import { EASE, ramp } from "../motion/spec";
import { DISSOLVE_BLUR, PressShade, RECORDINGS, RecFocus, dissolveAt, settleScale, srcAt, zoomAbout } from "../loops/kit";
import { T0 } from "../loops/plans";

const REC = RECORDINGS.mainLiveFilm;
/** The desktop behind the window, in window CSS px: 16:10, centred on the window, covering the wide frame at m 0.75. */
const DESK = { x: 580 - 1707 / 2, y: 400 - 1067 / 2, w: 1707, h: 1067 };

/** How far the conversation has receded: 0 at the wide frame (m 0.75), 1 from the close framings' m 1.8 (log zoom). */
const veilFor = (zoom: number) => Math.max(0, Math.min(1, (Math.log(zoom) - Math.log(0.75)) / (Math.log(1.8) - Math.log(0.75))));

const Scene: React.FC<{ pose: CamPose; t: number; payoff?: number; children?: React.ReactNode }> = ({ pose, t, payoff = 0, children }) => {
  const veil = veilFor(pose.zoom);
  return (
    <Camera pose={pose}>
      <World>
        <Desktop rect={DESK} />
        <MacWindow x={0} y={0} width={REC.width} height={REC.height}>
          <RecFocus rec={REC} t={t} rect={T0.drawer} amount={veil} zoom={pose.zoom} />
          {payoff > 0.001 ? (
            // the same frame with only the drawer's newest rows sharp, faded in over the first: only the rows above
            // "Requesting isolated tests" change
            <div style={{ position: "absolute", left: 0, top: 0, width: REC.width, height: REC.height, opacity: Math.min(1, payoff) }}>
              <RecFocus rec={REC} t={t} rect={T0.payoff.rect} amount={Math.max(veil, payoff)} zoom={pose.zoom} />
            </div>
          ) : null}
          {children}
        </MacWindow>
      </World>
    </Camera>
  );
};

export const FilmTeaser: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const base = cameraAt(frame, T0.plan.camera.wide, fps, width);
  const cut = T0.src[5]![0]; // f64: the match cut on the Apply edit click
  const pose = frame >= cut && frame < 96 ? zoomAbout(base, T0.clickPoint, settleScale(frame, cut, fps)) : base;
  const [d0, d1] = T0.plan.dissolves[0]!;
  const back = dissolveAt(frame, d0, d1 - d0);
  const t = srcAt(frame, T0.src);
  const [applyClick, runClick] = T0.plan.clicks;
  // the payoff's spotlight comes in with Verified (f150) and leaves with the pull-back (f186–209)
  const payoff = ramp(frame, T0.payoff.at, T0.payoff.dur, EASE.move) * veilFor(pose.zoom);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, filter: back > 0 && back < 1 ? `blur(${(DISSOLVE_BLUR * back).toFixed(2)}px)` : undefined }}>
        <Scene pose={pose} t={back >= 1 ? T0.poster : t} payoff={back >= 1 ? 0 : payoff}>
          <PressShade rect={T0.applyRect} at={applyClick!} radius={8} />
          <PressShade rect={T0.runRect} at={runClick!} radius={8} />
        </Scene>
      </div>
      {back > 0 && back < 1 ? (
        <div style={{ position: "absolute", inset: 0, opacity: back, filter: `blur(${(DISSOLVE_BLUR * (1 - back)).toFixed(2)}px)` }}>
          <Scene pose={T0.plan.camera.wide[0]!} t={T0.poster} />
        </div>
      ) : null}
      {/* the desktop world's 6 % vignette (FILM_SPEC §4), on the wide frame only: it fades out as the camera moves
          in, so it never lies over the white UI of a punch-in, and it is a function of the pose, so the loop stays
          seamless */}
      <Vignette amount={0.06 * Math.max(0, Math.min(1, (1.5 - pose.zoom) / 0.75))} />
      <Camera pose={pose} background="transparent" clip={false}>
        <Cursor keys={T0.cursor} clicks={T0.plan.clicks} visible={T0.plan.cursorVisible} />
      </Camera>
    </>
  );
};
