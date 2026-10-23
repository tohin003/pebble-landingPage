// S7, the payoff (1584–1799), FILM_SPEC §6 S7: the "Lisbon trip budget" dashboard in the stage (S7a, the window world);
// on f1656 the "Spending by category" panel grows from its place in the stage to full bleed (20 frames, EASE.move,
// its corner radius → 0) while everything else blurs to 15 px and fades over 9 frames: the object becomes the world
// (S7b), then holds dead still (data never bounces; the app draws no growth). f1728 is a hard cut, on the bar, to the
// datetime quiz full frame (S7c), and f1786–1799 the camera dives into the selected answer's "A" badge until its
// #506E54 fills the frame on f1799 (lane G-fix, REVIEW-G2 P1-2: the fill lands on the bar's last frame, the world
// changes on f1800 with the whoosh): the seam into S8.
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, UiStill, World } from "../../components";
import { blendPose, poseAt, type CamPose, type Rect } from "../../motion/camera";
import { useLayout } from "../../motion/layout";
import { EASE, ramp } from "../../motion/spec";
import { FULL_FRAME, FRAMINGS, STAGE, pose } from "../framing";
import { DASHBOARD, QUIZ } from "../ui";
import { FrameBlur, Solid } from "./common";
import { WindowWorld } from "./WindowWorld";

/** S7b's growth: f1656 → f1675. */
const GROW = { at: 1656, dur: 20, fadeDur: 9 } as const;

/** A frame-centred pose for a framing (full-frame worlds). */
const framePose = (f: { m: number; cx: number; cy: number }, s: number): CamPose => ({ x: f.cx, y: f.cy, zoom: f.m * s });

/** The stage camera's S7a framing expressed as a full-frame pose (the same world point under the same frame point). */
function stageAsFramePose(a: "wide" | "square", width: number, height: number, s: number): CamPose {
  const st = STAGE[a];
  const sp = pose(FRAMINGS[a].s7a!, s);
  const stageCentre = { x: (st.x + st.w / 2) * s, y: (st.y + st.h / 2) * s };
  return { x: sp.x + (width / 2 - stageCentre.x) / sp.zoom, y: sp.y + (height / 2 - stageCentre.y) / sp.zoom, zoom: sp.zoom };
}

const intersect = (r: Rect, b: Rect): Rect => {
  const x0 = Math.max(r.x, b.x);
  const y0 = Math.max(r.y, b.y);
  const x1 = Math.min(r.x + r.w, b.x + b.w);
  const y1 = Math.min(r.y + r.h, b.y + b.h);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRect = (a: Rect, b: Rect, t: number): Rect => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) });

/** S7a + S7b (1584–1727). */
export const S7Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const s = L.s;
  if (frame < GROW.at) return <WindowWorld />;
  const p0 = stageAsFramePose(a, width, height, s);
  const p1 = framePose(FULL_FRAME.chart[a], s);
  const growth = (f: number) => blendPose(p0, p1, EASE.move(Math.min(1, Math.max(0, (f - GROW.at) / GROW.dur))), width, "direct");
  const t = EASE.move(Math.min(1, (frame - GROW.at) / GROW.dur));
  const k = ramp(frame, GROW.at, GROW.fadeDur, EASE.enter);
  const cam = growth(frame);
  const panel = DASHBOARD.chartPanel.rect;
  const mapped: Rect = { x: width / 2 + (panel.x - cam.x) * cam.zoom, y: height / 2 + (panel.y - cam.y) * cam.zoom, w: panel.w * cam.zoom, h: panel.h * cam.zoom };
  // motion blur while it grows (R5 §6.3: ≤ 12 px on text): from how far the panel's corner moved since the last frame
  const prev = growth(frame - 1);
  const step = Math.hypot((panel.x - cam.x) * cam.zoom - (panel.x - prev.x) * prev.zoom, (panel.y - cam.y) * cam.zoom - (panel.y - prev.y) * prev.zoom);
  const mblur = Math.min(5, step / 28);
  const st = STAGE[a];
  const stageRect = { x: st.x * s, y: st.y * s, w: st.w * s, h: st.h * s };
  const clip = intersect(mapped, lerpRect(stageRect, { x: 0, y: 0, w: width, h: height }, t));
  const radius = DASHBOARD.chartPanel.radius * cam.zoom * (1 - t);
  return (
    <>
      {/* the panel's own white is the world the rest dissolves into */}
      <Solid color="#FFFFFF" />
      {k < 1 ? <WindowWorld style={{ filter: `blur(${(15 * k).toFixed(2)}px)`, opacity: 1 - k }} /> : null}
      <AbsoluteFill
        style={{
          clipPath: `inset(${clip.y.toFixed(2)}px ${(width - clip.x - clip.w).toFixed(2)}px ${(height - clip.y - clip.h).toFixed(2)}px ${clip.x.toFixed(2)}px round ${radius.toFixed(2)}px)`,
          filter: mblur > 0.2 ? `blur(${mblur.toFixed(2)}px)` : undefined,
        }}
      >
        <Camera pose={cam} background="#FFFFFF">
          <World>
            <UiStill name="main-dashboard" />
          </World>
        </Camera>
      </AbsoluteFill>
    </>
  );
};

/** S7c's dive: the aim is the badge's point farthest from its edge and from the white "A" (5.1 CSS px clear, above and
 *  left of the letter; §6's (764, 469) is 2.2 px from the edge), ×1 → ×90 in log space on EASE.exit by f1799, when the
 *  badge's flat colour covers the frame (needs ×83 in 16:9, ×62 in the square); the aim drifts to the frame centre on
 *  EASE.camera. Zoom blur on f1794–1799 only. From f1794 the badge's colour is painted over its white "A" (REVIEW-G2
 *  P2-7): at ×28 the blurred glyph swept the frame as a giant white shape; under the blur nobody sees it go. */
export const BADGE_DIVE = { from: 1786, fill: 1799, aim: { x: 765, y: 457.3 }, scale: 90, blurFrom: 1794, blurMax: 16 } as const;
/** the selected answer's white "A" (QUIZ.badge), painted over during the dive's blur */
const BADGE_GLYPH = { x: 766, y: 456, w: 10.5, h: 11.5 } as const;

export const S7Quiz: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  if (frame > BADGE_DIVE.fill) return <Solid color={QUIZ.badgeColour} />;
  const base = framePose(FULL_FRAME.quiz[a], L.s);
  let cam = base;
  if (frame >= BADGE_DIVE.from) {
    const u = (frame - BADGE_DIVE.from) / (BADGE_DIVE.fill - BADGE_DIVE.from);
    const A = BADGE_DIVE.aim;
    const p0 = { x: width / 2 + (A.x - base.x) * base.zoom, y: height / 2 + (A.y - base.y) * base.zoom };
    const d = EASE.camera(u);
    const where = { x: p0.x + (width / 2 - p0.x) * d, y: p0.y + (height / 2 - p0.y) * d };
    cam = poseAt(A, where, base.zoom * Math.exp(Math.log(BADGE_DIVE.scale) * EASE.exit(u)), width, height);
  }
  const blur = frame < BADGE_DIVE.blurFrom ? 0 : interpolate(frame, [BADGE_DIVE.blurFrom, BADGE_DIVE.fill], [2, BADGE_DIVE.blurMax], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // 16:9 shows the conversation left of the canvas: it recedes under a paper veil and a blur (R5 §5.3's spotlight on
  // the capture's own pixels), so no cut line of its text competes with the quiz
  const focus = a === "wide" ? { rect: QUIZ.canvas, mode: "card" as const, amount: 1, veil: 0.6, blur: 10, radius: 0 } : undefined;
  return (
    <FrameBlur px={blur}>
      {(viewport) => (
        <Camera pose={cam} viewport={viewport} background="#FFFFFF">
          <World>
            <UiStill name="main-quiz" focus={focus} veil="#F8F9F6" />
            {frame >= BADGE_DIVE.blurFrom ? (
              <div style={{ position: "absolute", left: BADGE_GLYPH.x, top: BADGE_GLYPH.y, width: BADGE_GLYPH.w, height: BADGE_GLYPH.h, background: QUIZ.badgeColour }} />
            ) : null}
          </World>
        </Camera>
      )}
    </FrameBlur>
  );
};
