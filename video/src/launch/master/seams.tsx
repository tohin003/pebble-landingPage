// The master's seam layers (master/timeline.ts SeamKind), each a pure function of the seam's progress p (0 → 1 across
// [cut − pre, cut + post]) and the role ("out": the outgoing scene, "in": the incoming one, drawn above it). Every layer
// is the identity at rest (in at 1, out at 0) and keeps one element shape for every p, so wrapping a scene for its whole
// slot never remounts it. None of them dissolves one picture into another (REVIEW-1 M2, BANNED): a picture is either
// carried (moved, scaled) or uncovered behind a moving edge.
import { useId, type ReactNode } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { BODY } from "../../../../shared/pebble";
import { SoftWipeLayer, WhipLayer, pebblePath } from "../components";
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

/* ---------- the pebble opens the next ground ---------- */

/**
 * The incoming scene is uncovered inside Pebble's own outline (the galet, TREATMENT's "the pebble as match shape"),
 * centred on the pebble's body, which both scenes draw at the same place: it grows from inside the body, so the
 * pebble's own colours change only where the wipe has passed (FIXES-1), past the body and out until it clears the
 * frame's farthest corner, evenly in log space. A hard edge: a wipe, never a glow. The outgoing scene dims a little as
 * the new ground opens.
 */
export const PebbleOpenLayer: React.FC<{ seam: Seam; progress: number; role: Role; children: ReactNode }> = ({ seam, progress, role, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const pb = seam.pebble!;
  const p = clamp01(progress);
  if (role === "out") {
    const dim = 1 - 0.2 * EASE.camera(p);
    return <AbsoluteFill style={{ filter: dim < 0.999 ? `brightness(${dim.toFixed(3)})` : undefined }}>{children}</AbsoluteFill>;
  }
  if (p >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const x = pb.x * W;
  const y = pb.y * H;
  const bodyW = ((pb.h * H) / BODY.height) * BODY.width;
  const start = bodyW * 0.45;
  // the galet's inscribed radius is about 0.44 of its width: past the farthest corner, with a margin
  const far = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
  const end = (far / 0.44) * 1.04;
  const e = EASE.move(p);
  const w = Math.exp(Math.log(start) + (Math.log(end) - Math.log(start)) * e);
  return <AbsoluteFill style={{ clipPath: pebblePath(x, y, w) }}>{children}</AbsoluteFill>;
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
