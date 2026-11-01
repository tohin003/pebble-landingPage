// The master's seam layers (master/timeline.ts SeamKind), each a pure function of the seam's progress p (0 → 1 across
// [cut − pre, cut + post]) and the role ("out": the outgoing scene, "in": the incoming one, drawn above it). Every layer
// is the identity at rest (in at 1, out at 0) and keeps one element shape for every p, so wrapping a scene for its whole
// slot never remounts it. None of them dissolves one picture into another (REVIEW-1 M2, BANNED): a picture is either
// carried (moved, scaled) or uncovered behind a moving edge.
import { useId, type ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { SoftWipeLayer, WhipLayer } from "../components";
import type { Rect } from "../layout";
import { EASE } from "../tokens";
import { rectFor, type Seam } from "./timeline";

type Role = "out" | "in";
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** the cut's place in the seam's progress */
const cutAt = (seam: Seam) => (seam.pre + seam.post > 0 ? seam.pre / (seam.pre + seam.post) : 0);

/** A blur filter as an inline SVG (separable: dx, dy px), or none under 0.3 px. */
const useBlur = (dx: number, dy: number) => {
  const id = `mb${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const on = dx > 0.3 || dy > 0.3;
  const svg = on ? (
    <svg width={0} height={0} style={{ position: "absolute" }}>
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation={`${dx.toFixed(2)} ${dy.toFixed(2)}`} edgeMode="duplicate" />
      </filter>
    </svg>
  ) : null;
  return { filter: on ? `url(#${id})` : undefined, svg };
};

/* ---------- zoom-through: a window carries the change of world ---------- */

/** The scale at which `r` (centred at the frame's middle) covers the whole frame, with `over` to spare. */
const coverScale = (r: Rect, W: number, H: number, over: number) => Math.max(W / r.w, H / r.h) * over;

/**
 * The outgoing scene scales up about its last window until the window has gone through the frame (accelerating, its
 * centre drawn to the frame's centre); the incoming scene starts scaled up about its first window (which then covers
 * the frame) and settles to rest (decelerating), so its ground comes in behind the window from the edges. Both carry a
 * blur that follows the zoom's speed, peaking at the cut, where the content swaps.
 */
export const ZoomThroughLayer: React.FC<{ seam: Seam; progress: number; role: Role; children: ReactNode }> = ({ seam, progress, role, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const c = cutAt(seam);
  const u = H / 1080;
  const r = rectFor(role === "out" ? seam.outRect! : seam.inRect!, W, H);
  const k1 = coverScale(r, W, H, role === "out" ? seam.over?.out ?? 1.35 : seam.over?.in ?? 1.25);
  // q: 0 at rest → 1 at the cut (the out role runs over [0, c], the in role over [c, 1] backwards)
  const q = role === "out" ? (c > 0 ? clamp01(progress / c) : 1) : c < 1 ? 1 - clamp01((progress - c) / (1 - c)) : 0;
  const ease = (x: number) => (role === "out" ? EASE.exit(x) : 1 - EASE.push(1 - x));
  const e = ease(q);
  const k = Math.exp(Math.log(k1) * e);
  // the window's centre moves to the frame's centre as it grows
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const tx = cx + (W / 2 - cx) * e;
  const ty = cy + (H / 2 - cy) * e;
  // the blur follows the zoom's speed (de/dq, largest at the cut on both sides), so the settled window is sharp at once
  const d = 0.01;
  const slope = (x: number) => (ease(clamp01(x + d)) - ease(clamp01(x - d))) / (clamp01(x + d) - clamp01(x - d));
  const speed = clamp01(slope(q) / slope(1));
  const b = 22 * u * speed;
  const { filter, svg } = useBlur(b, b);
  // the incoming scene is hidden until the cut (its frozen first frame waits under the outgoing one)
  const hidden = role === "in" && progress < c - 1e-6;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${(tx - cx * k).toFixed(2)}px, ${(ty - cy * k).toFixed(2)}px) scale(${k.toFixed(5)})`,
        transformOrigin: "0 0",
        filter,
        opacity: hidden ? 0 : 1,
      }}
    >
      {svg}
      {children}
    </AbsoluteFill>
  );
};

/* ---------- push: one camera move across the same ground ---------- */

/** Both pictures travel one frame's width (or height) together on the camera ease, with a light directional blur. */
export const PushLayer: React.FC<{ seam: Seam; progress: number; role: Role; children: ReactNode }> = ({ seam, progress, role, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const dir = seam.direction ?? "left";
  const horizontal = dir === "left" || dir === "right";
  const sign = dir === "left" || dir === "up" ? -1 : 1;
  const dist = horizontal ? W : H;
  const p = clamp01(progress);
  const e = EASE.camera(p);
  const off = role === "out" ? sign * e * dist : sign * (e - 1) * dist;
  // the camera ease's speed, normalised to 1 at its middle
  const d = 0.004;
  const v = (EASE.camera(clamp01(p + d)) - EASE.camera(clamp01(p - d))) / (2 * d) / ((EASE.camera(0.5 + d) - EASE.camera(0.5 - d)) / (2 * d));
  const b = 16 * (H / 1080) * clamp01(v);
  const { filter, svg } = useBlur(horizontal ? b : 0, horizontal ? 0 : b);
  return (
    <AbsoluteFill style={{ transform: horizontal ? `translateX(${off.toFixed(2)}px)` : `translateY(${off.toFixed(2)}px)`, filter }}>
      {svg}
      {children}
    </AbsoluteFill>
  );
};

/* ---------- the pebble opens the next ground ---------- */

/** The galet's body: about 1.13 times as wide as it is tall (PebbleActor: 0.59 × 0.52 of its size). */
const BODY_ASPECT = 0.59 / 0.52;

/**
 * The incoming scene is uncovered inside a soft-edged ellipse of the pebble's proportions, centred on the pebble's body,
 * that grows from just round the body (so the pebble, which both scenes draw at the same place, never changes size or
 * place) until it clears the frame's farthest corner. The outgoing scene dims a little as the new ground opens.
 */
export const PebbleOpenLayer: React.FC<{ seam: Seam; progress: number; role: Role; children: ReactNode }> = ({ seam, progress, role, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const pb = seam.pebble!;
  const p = clamp01(progress);
  if (role === "out") {
    const dim = 1 - 0.22 * EASE.camera(p);
    return <AbsoluteFill style={{ filter: dim < 0.999 ? `brightness(${dim.toFixed(3)})` : undefined }}>{children}</AbsoluteFill>;
  }
  const x = pb.x * W;
  const y = pb.y * H;
  const ry0 = (pb.h * H) / 2;
  const feather = 0.14;
  // solid from (1 − feather) r: start with the body's half-height (+6 %) solid
  const start = (ry0 * 1.06) / (1 - feather);
  const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([cx, cy]) => Math.hypot((cx - x) / BODY_ASPECT, cy - y)));
  const end = far / (1 - feather) + 2;
  const e = EASE.camera(p);
  const ry = Math.exp(Math.log(start) + (Math.log(end) - Math.log(start)) * e);
  const rx = ry * BODY_ASPECT;
  const mask = p >= 1 ? undefined : `radial-gradient(${rx.toFixed(1)}px ${ry.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, #000 ${((1 - feather) * 100).toFixed(1)}%, rgba(0,0,0,0) 100%)`;
  return <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>{children}</AbsoluteFill>;
};

/* ---------- the dispatcher ---------- */

/** Wraps a scene in its seam's layer (cuts and in-scene seams: the identity). */
export const SeamLayer: React.FC<{ seam: Seam; role: Role; progress: number; children: ReactNode }> = ({ seam, role, progress, children }) => {
  switch (seam.kind) {
    case "whip":
      return (
        <WhipLayer progress={progress} role={role} direction={seam.direction}>
          {children}
        </WhipLayer>
      );
    case "softWipe":
      return (
        <SoftWipeLayer progress={progress} role={role} direction={seam.direction} feather={seam.feather}>
          {children}
        </SoftWipeLayer>
      );
    case "zoomThrough":
      return (
        <ZoomThroughLayer seam={seam} progress={progress} role={role}>
          {children}
        </ZoomThroughLayer>
      );
    case "push":
      return (
        <PushLayer seam={seam} progress={progress} role={role}>
          {children}
        </PushLayer>
      );
    case "pebbleWipe":
      return (
        <PebbleOpenLayer seam={seam} progress={progress} role={role}>
          {children}
        </PebbleOpenLayer>
      );
    default:
      return <AbsoluteFill>{children}</AbsoluteFill>;
  }
};
