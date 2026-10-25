// The window world (bars 15–25, f1008–1799): the page's paper ground, the text column (16:9) or band (1:1, 9:16), and
// the stage, a hairline-framed moment of Pebble's real UI that ends above the caption band (film/framing.ts WIN_STAGE).
// - The montage (bars 15–20), one bar each, each line taken by the next bar's cut: views (the trip budget's chart
//   fills the stage), your model (the three ways in come forward on beats 1, 2 and 3), memory (a record binned on
//   f1170 dissolves; the list closes up on f1182), permissions (1.5.0: Auto in project chosen on f1260, then its own
//   words), your tests stay yours (the waiting test-file card's reason, v1.5.0), the scope challenge (the refused step,
//   Details opened on f1386, the camera locked on it through the person's scroll).
// - The climax (bars 21–25, the held run from main-live-film-150, v1.5.0, retake 2b): the drawer's held state arrives
//   on f1453; f1494 the conversation's Blocked block; Run the tests on f1512 (the press over the frame before the
//   click, a match cut on its rebound to the card); the person reads the card; Run tests on f1584; the card reads
//   Running for exactly 2.4 s (the focus on it); Done on f1656, the Result scrolls into view; up to the steps;
//   Verified on f1723, the focus jumping onto it, held 36 frames; the run completes on f1725 (the one celebration);
//   the pull-back to the final reply. The pebble stands on its line, in the app's own poses, from f1440.
import type { CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CheckMark, Cursor, UiStill, type UiStillName } from "../../components";
import { useLayout } from "../../motion/layout";
import { CLICK, EASE, ramp } from "../../motion/spec";
import { SYSTEM } from "../../motion/system";
import { PEBBLE_LIGHT } from "../../pebble/PebbleSvg";
import { PRESS_RUN_THE_TESTS, STAGE_CUTS, WIN, WIN_STAGE, pointerSpans, stageMotionBlur, stagePoseAt, stageToFrame } from "../framing";
import { MOMENTS, PEBBLE_INSTANCES, SOURCE_MAPS, at, sourceAt } from "../timeline";
import { CHALLENGE_150, LIVE_150, RUN, SETTINGS, centreOf } from "../ui";
import { FilmPebble, FilmStage, FlatGround, Horizon, Lines, RecordedUi, recFrame, type RecordedFocus } from "./common";

/** UiStill's focus at the film's pointing (FOCUS in common.tsx: the window's own colour at 45 %, 2.5 px blur). */
const stillFocus = (rect: { x: number; y: number; w: number; h: number }, amount: number, radius = 8) => ({ rect, mode: "card" as const, amount, radius, veil: 0.45, blur: 2.5 });

/** M2: the three ways in come forward one per beat (f1080, f1098, f1116). */
const WAYS = [
  { from: at(16), rect: SETTINGS.addModelFile },
  { from: at(16, 2), rect: SETTINGS.connectProvider },
  { from: at(16, 3), rect: SETTINGS.continueChatGPT },
] as const;

/** The climax's focus: onto the card reading Running (f1620–1626, held to the tests' end) and, on f1723, a jump onto
 *  "Verified · pytest 42 passed on current files" at full amount, held to f1754 and released before the pull-back. */
function climaxFocus(frame: number, zoom: number): RecordedFocus | null {
  if (frame >= 1620 && frame < at(24, 1, 6)) {
    const amount = ramp(frame, 1620, 6, EASE.enter) * (1 - ramp(frame, at(24), 6, EASE.exit));
    const c = RUN.runningCard;
    return { rect: { x: c.x - 4, y: c.y - 4, w: c.w + 8, h: c.h + 4 }, amount, zoom, radius: 12 };
  }
  if (frame >= MOMENTS.verified.frame && frame < 1760) {
    const v = RUN.verifiedRow;
    const amount = 1 - ramp(frame, 1754, 6, EASE.exit);
    return { rect: { x: v.x - 5, y: v.y - 3, w: v.w + 10, h: v.h + 6 }, amount, zoom, radius: 6 };
  }
  return null;
}

/** What the stage shows on a frame, in its world units (CSS px of the capture). */
const StageContent: React.FC<{ frame: number; zoom: number }> = ({ frame, zoom }) => {
  if (frame < at(16)) return <UiStill name="main-dashboard" />;
  if (frame < at(17)) {
    const i = WAYS.findIndex((w, k) => frame >= w.from && (k === WAYS.length - 1 || frame < WAYS[k + 1]!.from));
    const way = WAYS[Math.max(0, i)]!;
    const amount = i <= 0 ? ramp(frame, at(16), 6, EASE.enter) : 1;
    return <UiStill name="settings-models" focus={stillFocus({ x: way.rect.x - 4, y: way.rect.y - 4, w: way.rect.w + 8, h: way.rect.h + 8 }, amount, 10)} />;
  }
  if (frame < at(18)) {
    // the record dissolves f1170–1181 (opacity 1 → 0, blur 0 → 4 px on screen, EASE.exit); the app re-renders on f1182
    const name: UiStillName = frame < at(17, 2, 12) ? "settings-memory" : "settings-memory-forgotten";
    const dissolving = name === "settings-memory" && frame >= at(17, 2);
    if (!dissolving) return <UiStill name={name} />;
    const p = ramp(frame, at(17, 2), 12, EASE.exit);
    const r = SETTINGS.forgetRecord;
    const W = 1160;
    const H = 800;
    const cut: CSSProperties = { position: "absolute", left: 0, top: 0, width: W, height: H, clipPath: `inset(${r.y}px ${W - r.x - r.w}px ${H - r.y - r.h}px ${r.x}px)` };
    return (
      <>
        <UiStill name={name} />
        <div style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, background: SETTINGS.modalGround }} />
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, opacity: 1 - p, filter: p > 0.001 ? `blur(${((4 * p) / zoom).toFixed(3)}px)` : undefined }}>
          <div style={cut}>
            <UiStill name={name} />
          </div>
        </div>
      </>
    );
  }
  if (frame < at(19)) return <UiStill name={frame < at(18, 3) ? "v150/settings-permissions" : "v150/settings-permissions-auto"} />;
  if (frame < at(20)) {
    const s = (sourceAt(SOURCE_MAPS.m5, frame) ?? 9.5) * 30;
    return <RecordedUi src={recFrame(LIVE_150, s)} width={LIVE_150.width} height={LIVE_150.height} />;
  }
  if (frame < at(21)) {
    const s = (sourceAt(SOURCE_MAPS.m6, frame) ?? 8.4) * 30;
    return <RecordedUi src={recFrame(CHALLENGE_150, s)} width={CHALLENGE_150.width} height={CHALLENGE_150.height} />;
  }
  // the climax; on f1512–1515 the press on Run the tests, drawn over the last frame before the click (479)
  const pressing = frame >= PRESS_RUN_THE_TESTS.from && frame < PRESS_RUN_THE_TESTS.to;
  const s = pressing ? PRESS_RUN_THE_TESTS.src : (sourceAt(SOURCE_MAPS.climax, frame) ?? 13.6) * 30;
  const press = pressing ? { rect: RUN.runTheTests.rect, radius: RUN.runTheTests.radius, ground: RUN.runTheTests.ground, scale: CLICK.uiPressScale, darken: 0.05 } : null;
  return <RecordedUi src={recFrame(LIVE_150, s)} width={LIVE_150.width} height={LIVE_150.height} press={press} focus={climaxFocus(frame, zoom)} />;
};

export const WindowWorld: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const s = L.s;
  const st = WIN_STAGE[a];
  const stage = { x: st.x * s, y: st.y * s, w: st.w * s, h: st.h * s };
  const pose = stagePoseAt(frame, a, s, fps);
  const blur = STAGE_CUTS.includes(frame) ? { x: 0, y: 0 } : stageMotionBlur(pose, stagePoseAt(frame - 1, a, s, fps), stage);
  const spans = pointerSpans(a, s);
  const climax = PEBBLE_INSTANCES.climax;
  const foot = L.win.pebble.foot;
  // the check beside Verified (16:9 only), outside the UI, at the row's frame y under the steps' framing
  const verifiedY = stageToFrame(centreOf(RUN.verifiedRow), stagePoseAt(MOMENTS.verified.frame, a, s, fps), stage).y;
  return (
    <FlatGround>
      <FilmStage
        id="window-stage"
        rect={stage}
        pose={pose}
        blur={blur}
        corners={st.corners}
        clipOverlay
        overlay={
          <>
            {spans.map((sp) => (
              <Cursor key={sp.id} space="frame" keys={sp.keys} clicks={sp.clicks} visible={[sp.visible]} />
            ))}
          </>
        }
      >
        <StageContent frame={frame} zoom={pose.zoom} />
      </FilmStage>
      <Lines ids={["MV", "MM", "MMEM", "MP", "MT", "AG", "ISO", "EVD"]} world="window" />
      {L.win.checkX !== null && frame >= MOMENTS.verified.frame && frame < 1762 ? (
        <CheckMark at={{ x: L.win.checkX, y: verifiedY }} space="frame" size={L.win.checkSize} stroke={8 * s} drawAt={MOMENTS.verified.frame} outAt={1754} color={SYSTEM.accent} avoid={stage} />
      ) : null}
      {frame >= climax.from ? (
        <>
          <Horizon id="window-ground" x0={L.win.ground.x0} x1={L.win.ground.x1} y={foot.y} />
          <FilmPebble x={foot.x} y={foot.y} size={L.pebbleSize} colors={PEBBLE_LIGHT} />
        </>
      ) : null}
    </FlatGround>
  );
};

/** The framings' names, for the review tools. */
export const WINDOW_FRAMINGS = Object.keys(WIN);
