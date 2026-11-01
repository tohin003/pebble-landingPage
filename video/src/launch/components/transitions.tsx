// Transitions (TREATMENT §4, in order of preference): a cut on the downbeat; a scale-through (zoom into an element that
// becomes the next scene); the pebble as match shape; a whip (0.2-0.3 s, directional motion blur); and, for a change of
// world (night ↔ daylight, rulings v1.1: never a cut, never a crossfade), the soft wipe: a wide feathered edge that
// sweeps the new world in, so no frame jumps from dark to light. Each is a pure function of progress, usable two ways:
//
// 1. With @remotion/transitions:
//      <TransitionSeries.Transition presentation={whip({ direction: "left" })} timing={linearTiming({ durationInFrames: S(DUR.whip) })} />
//      presentation={scaleThrough({ rect: { x: 1100, y: 420, w: 520, h: 300 }, radius: 22 })}
//      presentation={pebbleWipe({ x: 960, y: 610, body: 120 })}
//      presentation={softWipe({ direction: "left" })}   (0.7-0.9 s)
// 2. By hand, layering two scenes yourself: <WhipLayer progress={p} role="out" direction="left">…</WhipLayer>, and the
//    same for ScaleThroughLayer and PebbleWipeLayer.
//
// Cuts on the beat: <OnBeat map={beats} at={12.3}>…</OnBeat> starts its children on the nearest downbeat
// (timing.ts: snapCut, nearest, punch).
import { useId, type ReactNode } from "react";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { BODY, staticView } from "../../../../shared/pebble";
import type { Rect } from "../layout";
import { snapCut, type BeatMap, type Grid } from "../timing";
import { EASE } from "../tokens";

type Role = "out" | "in";
const roleOf = (d: "entering" | "exiting"): Role => (d === "exiting" ? "out" : "in");
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ---------- whip ---------- */

export interface WhipProps extends Record<string, unknown> {
  /** where the picture travels: "left" = the old scene leaves to the left, the new one comes in from the right */
  direction?: "left" | "right" | "up" | "down";
  /** the motion blur at full speed, px at 1080p (default 70) */
  blur?: number;
}

/** The eased whip's speed, normalised to 1 at its peak (the middle). */
const whipSpeed = (p: number): number => {
  const e = 0.004;
  const v = (EASE.whip(clamp01(p + e)) - EASE.whip(clamp01(p - e))) / (2 * e);
  const peak = (EASE.whip(0.5 + e) - EASE.whip(0.5 - e)) / (2 * e);
  return clamp01(v / peak);
};

export const WhipLayer: React.FC<{ progress: number; role: Role; direction?: WhipProps["direction"]; blur?: number; children: ReactNode }> = ({
  progress,
  role,
  direction = "left",
  blur = 70,
  children,
}) => {
  const id = `whip${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { width, height } = useVideoConfig();
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "left" || direction === "up" ? -1 : 1;
  const dist = horizontal ? width : height;
  const p = EASE.whip(clamp01(progress));
  const off = role === "out" ? sign * p * dist : sign * (p - 1) * dist;
  const b = blur * (height / 1080) * whipSpeed(progress);
  const dx = horizontal ? off : 0;
  const dy = horizontal ? 0 : off;
  return (
    <AbsoluteFill style={{ transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`, filter: b > 0.3 ? `url(#${id})` : undefined }}>
      {b > 0.3 && (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={horizontal ? `${b.toFixed(2)} 0` : `0 ${b.toFixed(2)}`} edgeMode="duplicate" />
          </filter>
        </svg>
      )}
      {children}
    </AbsoluteFill>
  );
};

const WhipPresentation: React.FC<TransitionPresentationComponentProps<WhipProps>> = ({ children, presentationDirection, presentationProgress, passedProps }) => (
  <WhipLayer progress={presentationProgress} role={roleOf(presentationDirection)} direction={passedProps.direction} blur={passedProps.blur}>
    {children}
  </WhipLayer>
);

export const whip = (props: WhipProps = {}): TransitionPresentation<WhipProps> => ({ component: WhipPresentation, props });

/* ---------- scale-through ---------- */

export interface ScaleThroughProps extends Record<string, unknown> {
  /** the element in the outgoing scene that becomes the next scene, px */
  rect: Rect;
  /** its corner radius, px (the clip's radius shrinks to 0 as it fills the frame) */
  radius?: number;
}

/** Where the element is on screen at progress p: from `rect` to the full frame, sizes in log space. */
const throughBox = (p: number, rect: Rect, W: number, H: number): Rect => {
  const e = EASE.camera(clamp01(p));
  const w = Math.exp(Math.log(rect.w) + (Math.log(W) - Math.log(rect.w)) * e);
  const h = Math.exp(Math.log(rect.h) + (Math.log(H) - Math.log(rect.h)) * e);
  const cx = rect.x + rect.w / 2 + (W / 2 - rect.x - rect.w / 2) * e;
  const cy = rect.y + rect.h / 2 + (H / 2 - rect.y - rect.h / 2) * e;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
};

export const ScaleThroughLayer: React.FC<{ progress: number; role: Role; rect: Rect; radius?: number; children: ReactNode }> = ({ progress, role, rect, radius = 22, children }) => {
  const { width: W, height: H } = useVideoConfig();
  const box = throughBox(progress, rect, W, H);
  if (role === "out") {
    // the old scene moves with its element: the element's box maps onto `box`
    const k = Math.max(box.w / rect.w, box.h / rect.h);
    const tx = box.x + box.w / 2 - (rect.x + rect.w / 2) * k;
    const ty = box.y + box.h / 2 - (rect.y + rect.h / 2) * k;
    const fade = 1 - clamp01((progress - 0.7) / 0.3);
    return (
      <AbsoluteFill style={{ transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${k.toFixed(5)})`, transformOrigin: "0 0", opacity: fade }}>
        {children}
      </AbsoluteFill>
    );
  }
  // the new scene is inside the element: scaled to cover its box and clipped to it
  const k = Math.max(box.w / W, box.h / H);
  const tx = box.x + box.w / 2 - (W / 2) * k;
  const ty = box.y + box.h / 2 - (H / 2) * k;
  const r = radius * (1 - EASE.camera(clamp01(progress)));
  const right = W - box.x - box.w;
  const bottom = H - box.y - box.h;
  return (
    <AbsoluteFill style={{ clipPath: `inset(${box.y.toFixed(2)}px ${right.toFixed(2)}px ${bottom.toFixed(2)}px ${box.x.toFixed(2)}px round ${r.toFixed(2)}px)` }}>
      <AbsoluteFill style={{ transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${k.toFixed(5)})`, transformOrigin: "0 0" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const ScaleThroughPresentation: React.FC<TransitionPresentationComponentProps<ScaleThroughProps>> = ({ children, presentationDirection, presentationProgress, passedProps }) => (
  <ScaleThroughLayer progress={presentationProgress} role={roleOf(presentationDirection)} rect={passedProps.rect} radius={passedProps.radius}>
    {children}
  </ScaleThroughLayer>
);

export const scaleThrough = (props: ScaleThroughProps): TransitionPresentation<ScaleThroughProps> => ({ component: ScaleThroughPresentation, props });

/* ---------- the pebble as match shape ---------- */

export interface PebbleWipeProps extends Record<string, unknown> {
  /** the pebble's body centre in the outgoing scene, px */
  x: number;
  y: number;
  /** the body's width on screen, px */
  body: number;
}

const BODY_PATH = staticView("idle").frame.bodyPath;
const BODY_CX = (BODY.left + BODY.right) / 2;
const BODY_CY = (BODY.top + BODY.bottom) / 2;

/** The pebble's outline (Pebble's own galet, static frame) centred at (x, y), `w` px wide, as a CSS path(). */
export const pebblePath = (x: number, y: number, w: number): string => {
  const k = w / BODY.width;
  let n = 0;
  const d = BODY_PATH.replace(/-?\d+(?:\.\d+)?/g, (num) => {
    const v = Number(num);
    const out = n % 2 === 0 ? x + (v - BODY_CX) * k : y + (v - BODY_CY) * k;
    n++;
    return out.toFixed(1);
  });
  return `path("${d}")`;
};

export const PebbleWipeLayer: React.FC<{ progress: number; role: Role; x: number; y: number; body: number; children: ReactNode }> = ({ progress, role, x, y, body, children }) => {
  const { width: W, height: H } = useVideoConfig();
  if (role === "out") {
    // the old scene settles back a touch while the pebble opens into the next one
    const p = EASE.camera(clamp01(progress));
    return <AbsoluteFill style={{ transform: `scale(${(1 - 0.04 * p).toFixed(5)})`, transformOrigin: `${x}px ${y}px`, filter: p > 0.02 ? `brightness(${(1 - 0.35 * p).toFixed(3)})` : undefined }}>{children}</AbsoluteFill>;
  }
  // the shape grows from the pebble until it covers the farthest corner (the galet's inscribed radius is ~0.44 × its width)
  const far = Math.max(Math.hypot(x, y), Math.hypot(W - x, y), Math.hypot(x, H - y), Math.hypot(W - x, H - y));
  const wEnd = (far / 0.44) * 1.04;
  const e = EASE.camera(clamp01(progress));
  const w = Math.exp(Math.log(body) + (Math.log(wEnd) - Math.log(body)) * e);
  if (progress >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  return <AbsoluteFill style={{ clipPath: pebblePath(x, y, w) }}>{children}</AbsoluteFill>;
};

const PebbleWipePresentation: React.FC<TransitionPresentationComponentProps<PebbleWipeProps>> = ({ children, presentationDirection, presentationProgress, passedProps }) => (
  <PebbleWipeLayer progress={presentationProgress} role={roleOf(presentationDirection)} x={passedProps.x} y={passedProps.y} body={passedProps.body}>
    {children}
  </PebbleWipeLayer>
);

export const pebbleWipe = (props: PebbleWipeProps): TransitionPresentation<PebbleWipeProps> => ({ component: PebbleWipePresentation, props });

/* ---------- the soft wipe (a change of world) ---------- */

export interface SoftWipeProps extends Record<string, unknown> {
  /** where the edge travels: "left" = the new world comes in from the right */
  direction?: "left" | "right" | "up" | "down";
  /** the edge's softness, as a fraction of the frame (default 0.4) */
  feather?: number;
}

export const SoftWipeLayer: React.FC<{ progress: number; role: Role; direction?: SoftWipeProps["direction"]; feather?: number; children: ReactNode }> = ({
  progress,
  role,
  direction = "left",
  feather = 0.4,
  children,
}) => {
  const p = EASE.camera(clamp01(progress));
  const horizontal = direction === "left" || direction === "right";
  const sign = direction === "left" || direction === "up" ? -1 : 1;
  // a little parallax: the old world drifts on, the new one settles in
  const shift = role === "out" ? sign * 3 * p : -sign * 3 * (1 - p);
  const tr = horizontal ? `translateX(${shift.toFixed(3)}%)` : `translateY(${shift.toFixed(3)}%)`;
  if (role === "out") return <AbsoluteFill style={{ transform: tr }}>{children}</AbsoluteFill>;
  if (progress >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const to = { left: "to left", right: "to right", up: "to top", down: "to bottom" }[direction];
  const edge = p * (100 + feather * 100); // the opaque part's far end, % along the wipe
  const solid = Math.max(0, edge - feather * 100);
  const mask = `linear-gradient(${to}, #000 ${solid.toFixed(2)}%, rgba(0,0,0,0) ${edge.toFixed(2)}%)`;
  return <AbsoluteFill style={{ transform: tr, WebkitMaskImage: mask, maskImage: mask }}>{children}</AbsoluteFill>;
};

const SoftWipePresentation: React.FC<TransitionPresentationComponentProps<SoftWipeProps>> = ({ children, presentationDirection, presentationProgress, passedProps }) => (
  <SoftWipeLayer progress={presentationProgress} role={roleOf(presentationDirection)} direction={passedProps.direction} feather={passedProps.feather}>
    {children}
  </SoftWipeLayer>
);

export const softWipe = (props: SoftWipeProps = {}): TransitionPresentation<SoftWipeProps> => ({ component: SoftWipePresentation, props });

/* ---------- cuts on the beat ---------- */

/** Its children start on the grid time nearest `at` (within `maxShift` s), and last `dur` seconds if given. */
export const OnBeat: React.FC<{ map: BeatMap; at: number; dur?: number; grid?: Grid; maxShift?: number; name?: string; children: ReactNode }> = ({
  map,
  at,
  dur,
  grid = "downbeat",
  maxShift = 0.5,
  name,
  children,
}) => {
  const { fps } = useVideoConfig();
  const start = snapCut(map, at, grid, maxShift);
  return (
    <Sequence from={Math.round(start * fps)} durationInFrames={dur === undefined ? undefined : Math.max(1, Math.round(dur * fps))} name={name ?? `on beat ${start.toFixed(2)} s`}>
      {children}
    </Sequence>
  );
};
