// The window world (FILM_SPEC §4, §6 S5–S7a; 648–1665): the paper ground, a stage into Pebble's REAL UI (the
// main-live-film recording for the coding story, lane D's Settings and dashboard stills after it), the text column
// (16:9) or band (square, vertical), the pebble at its spot on its line acting the app's poses, the pointer, the focus
// on Undo this edit (the rest of the frame recedes, FOCUS in common.tsx) and the film's one annotation, the check beside
// the Verified step (16:9 only), drawn outside the UI, never inside it (critic C3).
//
// Lane v2-film (docs/PHILOSOPHY.md, "Imagery"): every shot here is a moment (one card, one step, one tab), so the stage
// is a hairline frame on the page's flat paper, without a shadow, and the riverbed stays behind the one scene (S1). The
// pebble's spot is a short stretch of its line, as on the page.
//
// Seams inside: f720 and f1008 camera moves; f814 match cut on the Apply edit click (the Done card, settling from
// 1.04×); f864 hard cut (chapter `tested`); f1224 match cut on the gear (Settings › Models); f1332, f1404, f1440 tab
// and option clicks (the frame holds, the content changes, as a tab does); f1542 the swap after the record dissolves;
// f1584 hard cut to the dashboard on the payoff's downbeat.
import type { CSSProperties } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CheckMark, Cursor, UiStill, type UiStillName } from "../../components";
import { useLayout, type AspectId } from "../../motion/layout";
import { CLICK, EASE, ramp } from "../../motion/spec";
import { SYSTEM } from "../../motion/system";
import { PEBBLE_LIGHT } from "../../pebble/PebbleSvg";
import { STAGE, STAGE_CUTS, pointerSpans, stageMotionBlur, stagePoseAt, stageToFrame } from "../framing";
import { PEBBLE_INSTANCES, SOURCE_MAPS, sourceAt } from "../timeline";
import { DASHBOARD, LIVE_FILM, SETTINGS, centreOf } from "../ui";
import { FilmPebble, FilmStage, FlatGround, Horizon, Lines, RecordedUi, hopsFor, recordedFrame } from "./common";

/** Clicks whose press is drawn over the real control, on the frozen frame before the click (FILM_SPEC §7.2, §10). */
const PRESSES = [
  { at: 810, control: LIVE_FILM.applyEdit },
  { at: 990, control: LIVE_FILM.runTheTests },
  { at: 1080, control: LIVE_FILM.runTests },
] as const;
const PRESS_FRAMES = 4; // 0.12 s at 30 fps (CLICK.uiPressS)

/**
 * After the f814 match cut, "Undo this edit" comes forward as T7's "undo" lands (f830): the rest of the frame recedes
 * f826–837 (EASE.enter, 0.4 s) and comes back f852–857 (0.2 s), the timing of the ring it replaces (lane v2-film). The
 * region is the text button with 8 css px of air (LIVE_FILM.undoEdit).
 */
const UNDO_FOCUS = { from: 826, inDur: 12, outAt: 852, outDur: 6, pad: 8 } as const;
const undoFocusAmount = (frame: number) =>
  ramp(frame, UNDO_FOCUS.from, UNDO_FOCUS.inDur, EASE.enter) * (1 - ramp(frame, UNDO_FOCUS.outAt, UNDO_FOCUS.outDur, EASE.exit));

/** The Settings still on screen (each click swaps it on its own frame; f1542 after the dissolve). */
const settingsStill = (frame: number): UiStillName =>
  frame < 1332 ? "settings-models" : frame < 1404 ? "settings-permissions" : frame < 1440 ? "settings-permissions-auto" : frame < 1542 ? "settings-memory" : "settings-memory-forgotten";

/** What the stage shows on a frame, in its world units (CSS px of the capture). */
const StageContent: React.FC<{ frame: number; zoom: number; aspect: AspectId }> = ({ frame, zoom, aspect }) => {
  if (frame < 1224) {
    const s = sourceAt(SOURCE_MAPS["main-live-film"], frame) ?? 3.85;
    const p = PRESSES.find((x) => frame >= x.at && frame < x.at + PRESS_FRAMES);
    const press = p ? { rect: p.control.rect, radius: p.control.radius, ground: p.control.ground, scale: CLICK.uiPressScale, darken: 0.05 } : null;
    const u = LIVE_FILM.undoEdit;
    const focus =
      frame >= UNDO_FOCUS.from && frame < UNDO_FOCUS.outAt + UNDO_FOCUS.outDur
        ? {
            rect: { x: u.rect.x - UNDO_FOCUS.pad, y: u.rect.y - UNDO_FOCUS.pad, w: u.rect.w + 2 * UNDO_FOCUS.pad, h: u.rect.h + 2 * UNDO_FOCUS.pad },
            amount: undoFocusAmount(frame),
            zoom,
            radius: u.radius + UNDO_FOCUS.pad,
          }
        : null;
    return <RecordedUi src={recordedFrame(LIVE_FILM.dir, LIVE_FILM.frames, s)} width={LIVE_FILM.width} height={LIVE_FILM.height} press={press} focus={focus} />;
  }
  if (frame < 1584) {
    const name = settingsStill(frame);
    // S6c: the record dissolves f1530–1541 (opacity 1 → 0, blur 0 → 4 px on screen, EASE.exit), then the app re-renders
    const dissolving = name === "settings-memory" && frame >= 1530;
    if (!dissolving) return <UiStill name={name} />;
    const p = ramp(frame, 1530, 12, EASE.exit);
    const r = SETTINGS.forgetRecord;
    // explicit sizes: the World layer is a 0 × 0 box, so `inset: 0` would clip everything away
    const W = LIVE_FILM.width;
    const H = LIVE_FILM.height;
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
  // S7a opens on the ask (REVIEW-G2 P1-7). In the narrow aspects, the request bubble is the card in focus and the rest
  // of the conversation recedes (its lines run into the stage's bottom edge there) until the camera leaves for the canvas
  const ask = aspect !== "wide" ? 1 - ramp(frame, 1602, 12, EASE.move) : 0;
  return <UiStill name="main-dashboard" focus={ask > 0 ? { rect: DASHBOARD.request, mode: "card", amount: ask, radius: 14, veil: 0.6, blur: 8 } : undefined} />;
};

export const WindowWorld: React.FC<{ style?: CSSProperties }> = ({ style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const s = L.s;
  const pose = stagePoseAt(frame, a, s, fps);
  // motion blur on camera moves only, never on a cut's frame (STAGE_CUTS)
  const blur = STAGE_CUTS.includes(frame) ? { x: 0, y: 0 } : stageMotionBlur(pose, stagePoseAt(frame - 1, a, s, fps), { x: 0, y: 0, w: STAGE[a].w * s, h: STAGE[a].h * s });
  const spans = pointerSpans(a, s);
  const main = PEBBLE_INSTANCES.main;
  const st = STAGE[a];
  const stage = { x: st.x * s, y: st.y * s, w: st.w * s, h: st.h * s };
  // the check beside the Verified step: its centre y is the step's, seen by the camera on f1152 (it holds to f1187)
  const verifiedY = stageToFrame(centreOf(LIVE_FILM.verifiedStep), stagePoseAt(1152, a, s, fps), stage).y;
  const foot = L.win.pebble.foot;
  return (
    <div style={{ position: "absolute", inset: 0, ...style }}>
      <FlatGround />
      <FilmStage
        rect={stage}
        pose={pose}
        blur={blur}
        clipOverlay={a === "vertical"}
        overlay={
          <>
            {spans.map((sp) => (
              <Cursor key={sp.id} space="frame" keys={sp.keys} clicks={sp.clicks} visible={[sp.visible]} />
            ))}
          </>
        }
      >
        <StageContent frame={frame} zoom={pose.zoom} aspect={a} />
      </FilmStage>
      <Lines ids={["T6", "T7", "T8", "T9", "T10", "T11", "T11s", "T12", "T13"]} world="window" />
      <Lines ids={["T14"]} world="window" exit={false} />
      {L.win.checkX !== null && frame >= 1152 && frame < 1192 ? (
        <CheckMark at={{ x: L.win.checkX, y: verifiedY }} space="frame" size={L.win.checkSize} stroke={8 * s} drawAt={1152} outAt={1182} color={SYSTEM.accent} avoid={stage} />
      ) : null}
      {/* the pebble's spot is a short stretch of its line (the page's local ground); the carry lands on it at f652 */}
      <Horizon id="window-ground" x0={L.win.ground.x0} x1={L.win.ground.x1} y={foot.y} />
      <FilmPebble x={main.start[a].x * s} y={main.start[a].y * s} size={L.pebbleSize} hops={hopsFor(main.hops, a, s)} colors={PEBBLE_LIGHT} />
    </div>
  );
};

/** S5 (648–1223) and S6 (1224–1583): the window world as it is. */
export const S5S6Window: React.FC = () => <WindowWorld />;
