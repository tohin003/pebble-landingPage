// Custom @remotion/transitions presentations for the film's seams (TOOLS_TESTS §2.4: adopt custom presentations; swap
// on covered frames; keep grounds outside the scenes' fades, or switch them while hidden). All are pure functions of the
// presentation's progress, so any frame renders on its own. None uses HTML-in-canvas: they run on the headless shell.
//
//   ringIris()     kind 1: the next place opens inside the ring, from the stone, feathered 24–48 px, the sage hairline
//                  riding its edge; E-arrive. An iris between places 20–36 frames, a burst to the edge 60–90.
//   swapInPlace()  kind 5: the blur swap on one stage, 8 frames out (blur 0 → 8 px, opacity → 0), 8 in (8 → 0 px).
//   rackFocus()    kind 6: the outgoing shot defocuses (0 → 10–16 px), the swap happens at full defocus (the frame is
//                  covered by blur), the incoming one focuses in; a 1.00 → 1.01 focus breath. 24–48 frames.
//   zoomThrough()  reserved (TREATMENT §5.1: "zoom-throughs: the tour uses one"): the outgoing shot keeps diving into a
//                  flat fill and the swap happens while the fill covers the frame (the tested KT.tsx seam).
//
// Use them in a <TransitionSeries> with linearTiming(): each presentation applies its own curve to the progress.
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { RING, TRANSITION } from "../tokens";
import { E_ARRIVE, E_LEAVE, E_MOVE, clamp01, smoothstep } from "../motion/ease";
import { radiusToCorners } from "../motion/geometry";

/* ---------------------------------------------------------------- kind 1: the ring iris ----------------------- */

export type RingIrisProps = {
  /** the ring's centre, frame UV (0..1): the stone's place on screen */
  center: [number, number];
  /** feather of the iris edge, px at 1080 (24–48) */
  featherPx?: number;
  /** draw the sage hairline on the edge */
  hairline?: boolean;
  tone?: "light" | "dark";
  /** the radius the iris starts from, px at 1080 (the stone's radius) */
  startRadiusPx?: number;
};

const RingIris: React.FC<TransitionPresentationComponentProps<RingIrisProps>> = ({ children, presentationDirection, presentationProgress, passedProps }) => {
  const { width, height } = useVideoConfig();
  if (presentationDirection === "exiting") return <AbsoluteFill>{children}</AbsoluteFill>;
  const unit = Math.min(width, height) / 1080;
  const feather = (passedProps.featherPx ?? 36) * unit;
  const cx = passedProps.center[0] * width;
  const cy = passedProps.center[1] * height;
  const R0 = (passedProps.startRadiusPx ?? 40) * unit;
  const Rmax = radiusToCorners({ x: cx, y: cy }, width, height) + feather;
  const e = E_ARRIVE(clamp01(presentationProgress));
  const R = R0 + (Rmax - R0) * e;
  const inner = Math.max(0, R - feather);
  const mask = `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, #000 ${inner.toFixed(1)}px, transparent ${R.toFixed(1)}px)`;
  const lineOpacity = smoothstep(0, 0.08, presentationProgress) * (1 - smoothstep(0.85, 1, presentationProgress));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>{children}</AbsoluteFill>
      {passedProps.hairline !== false && lineOpacity > 0.002 ? (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <circle
            cx={cx}
            cy={cy}
            r={Math.max(0.5, R - feather / 2)}
            fill="none"
            stroke={RING.color[passedProps.tone ?? "light"]}
            strokeWidth={RING.hairlinePx * unit}
            opacity={lineOpacity}
          />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

export const ringIris = (props: RingIrisProps): TransitionPresentation<RingIrisProps> => ({ component: RingIris, props });

/* ---------------------------------------------------------------- kind 5: the swap in place ------------------- */

export type SwapProps = { blurPx?: number };

const Swap: React.FC<TransitionPresentationComponentProps<SwapProps>> = ({ children, presentationDirection, presentationProgress: p, passedProps }) => {
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const B = (passedProps.blurPx ?? TRANSITION.swap.blurPx) * unit;
  if (presentationDirection === "exiting") {
    // out over the first half: blur 0 → 8 px, opacity → 0, accelerating away
    const u = E_LEAVE(clamp01(p * 2));
    return <AbsoluteFill style={{ opacity: 1 - u, filter: u > 0.005 ? `blur(${(B * u).toFixed(2)}px)` : undefined }}>{children}</AbsoluteFill>;
  }
  // in over the second half: blur 8 → 0 px, opacity from 0, landing
  const u = E_ARRIVE(clamp01(p * 2 - 1));
  return <AbsoluteFill style={{ opacity: u, filter: u < 0.995 ? `blur(${(B * (1 - u)).toFixed(2)}px)` : undefined }}>{children}</AbsoluteFill>;
};

export const swapInPlace = (props: SwapProps = {}): TransitionPresentation<SwapProps> => ({ component: Swap, props });

/* ---------------------------------------------------------------- kind 6: rack focus -------------------------- */

export type RackProps = {
  /** peak defocus, px at 1080 (10–16) */
  blurPx?: number;
  /** focus breathing: scale at full defocus (1.01) */
  breathe?: number;
};

const Rack: React.FC<TransitionPresentationComponentProps<RackProps>> = ({ children, presentationDirection, presentationProgress: p, passedProps }) => {
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const B = (passedProps.blurPx ?? 12) * unit;
  const breathe = passedProps.breathe ?? 1.01;
  // focus pulls ease both ways (E-move); the swap is a short cross at full defocus, where neither shot is readable.
  // The outgoing shot stays opaque under the incoming one, so the cross never dips toward the background
  // (TOOLS_TESTS §2.3 finding 3: a double fade over a third layer darkened the seam by up to 34 levels).
  if (presentationDirection === "exiting") {
    const u = E_MOVE(clamp01(p / 0.5));
    return <AbsoluteFill style={{ filter: `blur(${(B * u).toFixed(2)}px)`, transform: `scale(${(1 + (breathe - 1) * u).toFixed(5)})` }}>{children}</AbsoluteFill>;
  }
  const u = 1 - E_MOVE(clamp01((p - 0.5) / 0.5));
  const o = smoothstep(0.44, 0.56, p);
  return (
    <AbsoluteFill style={{ opacity: o, filter: u > 0.003 ? `blur(${(B * u).toFixed(2)}px)` : undefined, transform: u > 0.001 ? `scale(${(1 + (breathe - 1) * u).toFixed(5)})` : undefined }}>
      {children}
    </AbsoluteFill>
  );
};

export const rackFocus = (props: RackProps = {}): TransitionPresentation<RackProps> => ({ component: Rack, props });

/* ---------------------------------------------------------------- reserved: the zoom-through ------------------ */

export type ZoomThroughProps = { exitScale?: number; swapAt?: number; swapLen?: number; origin?: [number, number] };

const ZoomThrough: React.FC<TransitionPresentationComponentProps<ZoomThroughProps>> = ({ children, presentationDirection, presentationProgress: p, passedProps }) => {
  const { exitScale = 2.5, swapAt = 0.45, swapLen = 0.2, origin = [0.5, 0.5] } = passedProps;
  const o = clamp01((p - swapAt) / swapLen);
  if (presentationDirection === "exiting") {
    // keeps accelerating into the fill; stays opaque under the incoming shot (no dip toward the background)
    const s = Math.exp(Math.log(exitScale) * p * p);
    return <AbsoluteFill style={{ transform: `scale(${s.toFixed(5)})`, transformOrigin: `${origin[0] * 100}% ${origin[1] * 100}%` }}>{children}</AbsoluteFill>;
  }
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

export const zoomThrough = (props: ZoomThroughProps = {}): TransitionPresentation<ZoomThroughProps> => ({ component: ZoomThrough, props });
