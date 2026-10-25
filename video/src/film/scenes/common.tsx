// Shared pieces of the animated film's scenes (lane G2a; restyled to docs/PHILOSOPHY.md by lane v2-film): on-screen
// lines placed and coloured as FILM_SPEC §3 and §8 say, the window world's flat paper ground, the stage as a hairline
// frame, the line the pebble stands on, the film pebble with the merged cue list, real recorded UI frames, and the press
// a click draws over a real control. Every scene reads the ABSOLUTE film frame (LaunchFilm wraps each shot so that
// useCurrentFrame() inside is the composition's frame) and adapts to the aspect through useLayout().
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { PebbleCue } from "../../../../shared/pebble";
import { Camera, KineticText, World, blockHeight, topForBaseline } from "../../components";
import { FONT } from "../../fonts";
import type { CamPose, Rect } from "../../motion/camera";
import { useLayout, type AspectId, type Layout, type StageCorners } from "../../motion/layout";
import { COLOR, EASE, SLAM, TYPO, blurOut, fxStyle, ramp, slamPreRoll, type TypoRole } from "../../motion/spec";
import { FRAME, SYSTEM } from "../../motion/system";
import type { Hop } from "../../pebble/acting";
import { PebbleOnFilm } from "../../pebble/PebbleOnFilm";
import type { PebbleColors } from "../../pebble/PebbleSvg";
import { filmCues } from "../gaze";
import { END, HOPS, LIST_DIM, SEAMS, TEXT, textById, type PerAspect, type TextCue } from "../timeline";

/** The film's cuts (every seam that is not a camera move, FILM_SPEC §12). */
const CUTS: readonly number[] = SEAMS.filter((s) => s.kind !== "camera").map((s) => s.frame);

/* ================================================================================================================
 * On-screen lines (FILM_SPEC §3, §8)
 * ============================================================================================================== */

/** PHILOSOPHY's three voices: Fraunces 350 for the lines, Inter for support, Geist Mono for anything with a number. */
const ROLE_TYPO: Record<TextCue["role"], TypoRole> = {
  hero: "display",
  headline: "display",
  side: "display",
  tagline: "display",
  support: "text",
  data: "data",
  cta: "text",
  mono: "mono",
  small: "small",
};

/** The lines as they break in this aspect: the 16:9 breaks, or the narrow compositions' (1:1, 9:16) where given. */
export const linesFor = (c: TextCue, a: AspectId) => (a !== "wide" && c.squareLines ? c.squareLines : c.lines);

/**
 * The window world's text column (16:9) or band (square, vertical), FILM_SPEC §4: a cue's lines start at the block's
 * top; a cue marked `under` sits a gap under its anchor. §3's fit rule: if the group overflows its room (in the narrow
 * aspects, the band ends above the stage), the anchor steps down 4 px at a time; a line is never re-broken.
 */
function columnPlacement(cue: TextCue, L: Layout): { top: number; size: number } {
  const anchor = cue.under ? textById(cue.under) : cue;
  const under = TEXT.filter((c) => c.under === anchor.id);
  const gap = Math.round(L.gap * 0.5);
  const room = L.aspect === "wide" ? L.win.text.h : L.win.stage.y - L.win.text.y - Math.round(10 * L.s);
  const underH = under.reduce((h, u) => h + gap + blockHeight(linesFor(u, L.aspect).length, L.type[u.role], ROLE_TYPO[u.role]), 0);
  let size = L.type[anchor.role];
  while (size > Math.round(64 * L.s) && blockHeight(linesFor(anchor, L.aspect).length, size, ROLE_TYPO[anchor.role]) + underH > room) size -= 4;
  if (cue === anchor) return { top: L.win.text.y, size };
  const anchorH = blockHeight(linesFor(anchor, L.aspect).length, size, ROLE_TYPO[anchor.role]);
  return { top: L.win.text.y + anchorH + gap, size: L.type[cue.role] };
}

export type LineWorld = "sage" | "paper" | "window";

/** Colours by role and ground (motion/system.ts): white on sage (support and data at 80 %); on paper, ink for the lines
 *  and the URL, muted ink for support, the CTA's words and the small print. */
export const lineColour = (cue: TextCue, world: LineWorld) => {
  const strong = cue.role === "headline" || cue.role === "side" || cue.role === "tagline" || cue.role === "mono" || cue.role === "hero";
  if (world === "sage") return strong ? SYSTEM.onSage : SYSTEM.onSageMuted;
  return strong ? SYSTEM.ink : SYSTEM.ink2;
};

/** Where a cue's line block sits, frame px (the box KineticText lays its lines into) and its type size. */
export function lineBox(cue: TextCue, L: Layout): { box: Rect; size: number; align: "left" | "center" } {
  const lines = linesFor(cue, L.aspect);
  const typo = ROLE_TYPO[cue.role];
  const column = cue.place === "column" ? columnPlacement(cue, L) : null;
  const size = column ? column.size : L.type[cue.role];
  const h = blockHeight(lines.length, size, typo);
  if (column) return { box: { x: L.win.text.x, y: column.top, w: L.win.text.w, h }, size, align: "left" };
  const y = (cue.y as PerAspect<number>)[L.aspect] * L.s;
  if (cue.x) {
    // a list item: left-aligned on the list's edge, to the safe area's right edge
    const x = cue.x[L.aspect] * L.s;
    const w = L.safe.x + L.safe.w - x;
    if (cue.place === "baseline") return { box: { x, y: topForBaseline(y, size, typo), w, h }, size, align: "left" };
    return { box: { x, y: y - h / 2, w, h }, size, align: "left" };
  }
  if (cue.place === "baseline") return { box: { x: L.safe.x, y: topForBaseline(y, size, typo), w: L.safe.w, h }, size, align: "center" };
  return { box: { x: L.safe.x, y: y - h / 2, w: L.safe.w, h }, size, align: "center" };
}

/**
 * The slam's overscale (ENERGY_SPEC §7): 1.10 in 16:9; in the narrow aspects 1.06 for the lists and the centred
 * end-card line, 1.04 for the window world's band lines (the column's, in 16:9), whose room is smaller.
 */
export const slamK = (cue: TextCue, a: AspectId): number => (a === "wide" ? SLAM.k.wide : cue.place === "column" ? SLAM.k.narrowColumn : SLAM.k.narrow);

/** The first frame a line is drawn: a slam from its pre-roll (3 frames before it lands), unless it lands on a cut, where
 *  its pre-roll would fall in the previous shot, so it appears already landed; the other entrances from in − 1. */
export const firstDrawnFrame = (cue: TextCue, fps: number): number =>
  cue.enter === "slam" ? (CUTS.includes(cue.in) ? cue.in : cue.in - slamPreRoll(fps)) : cue.in - 1;

/**
 * One timeline line. Entrances (A) blur, (B) ink, (C) rise from §3, and (S) the recut's slam; small print fades in over 9 frames (§6 S9). The ink
 * entrance starts from #B0C2AE on paper and from white at 35 % on sage (§3 B). A line is dead still once it has landed
 * and leaves with the 6-frame blur-out, unless a world move takes it (`exit={false}`). A list item (lane G-fix,
 * REVIEW-G2 P1-6) inks whole when `inkTogether`, and from `dimAt` dims to LIST_DIM over 6 frames as the next one
 * arrives; a dimmed item is as still as a landed one (only its opacity changed).
 */
export const FilmLine: React.FC<{ cue: TextCue; world: LineWorld; exit?: boolean; style?: CSSProperties }> = ({ cue, world, exit = true, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  if (frame < firstDrawnFrame(cue, fps) || (exit && frame > cue.out + 8)) return null;
  // a leaving line never survives a cut (T7 and T13 finish their blur-out a frame after a hard cut on the bar); a line
  // that is still holding when the stage cuts (T8 across f1008) stays, as the column does
  if (exit && CUTS.some((c) => c > cue.in && frame >= c && cue.out < c)) return null;
  const { box, size, align } = lineBox(cue, L);
  const color = lineColour(cue, world);
  const lines = linesFor(cue, L.aspect);
  const exitAt = exit && cue.out < END ? cue.out : undefined;
  const dim = cue.dimAt === undefined ? 1 : 1 - (1 - LIST_DIM) * ramp(frame, cue.dimAt, 6, EASE.move);
  // a slam lands whole (about the line's anchor) unless it names its words' landings (T7)
  const wordStarts = cue.enter !== "slam" && cue.inkTogether ? lines.flatMap((l) => l.split(" ").filter((w) => w.length > 0)).map(() => cue.in) : cue.wordStarts;
  if (cue.enter === "fade") {
    // small print: opacity over 9 frames (EASE.enter), the same blur-out if it ever leaves
    const o = ramp(frame, cue.in, 9, EASE.enter);
    const out = exitAt !== undefined ? blurOut(frame, exitAt, fps) : { opacity: 1, blur: 0, dx: 0, dy: 0, scale: 1 };
    const typo = TYPO[ROLE_TYPO[cue.role]];
    return (
      <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, textAlign: align, ...style }}>
        {lines.map((l, i) => (
          <div
            key={i}
            style={{
              fontFamily: FONT[typo.family],
              fontWeight: typo.weight,
              fontSize: size,
              lineHeight: typo.leading,
              letterSpacing: typo.tracking,
              color,
              whiteSpace: "pre",
              ...fxStyle({ ...out, opacity: o * out.opacity }),
            }}
          >
            {l}
          </div>
        ))}
      </div>
    );
  }
  return (
    <KineticText
      lines={lines}
      role={cue.role}
      size={size}
      at={cue.in}
      exitAt={exitAt}
      enter={cue.enter}
      wordStarts={wordStarts}
      slamK={slamK(cue, L.aspect)}
      color={color}
      inkFrom={cue.enter === "ink" ? (world === "sage" ? SYSTEM.inkFromSage : SYSTEM.inkFromPaper) : undefined}
      align={align}
      box={box}
      style={dim < 1 ? { ...style, opacity: dim } : style}
    />
  );
};

/** Several timeline lines by id. */
export const Lines: React.FC<{ ids: readonly string[]; world: LineWorld; exit?: boolean }> = ({ ids, world, exit }) => (
  <>
    {ids.map((id) => (
      <FilmLine key={id} cue={textById(id)} world={world} exit={exit} />
    ))}
  </>
);

/* ================================================================================================================
 * Grounds: one flat ground per world (PHILOSOPHY "Surface": no grain, no glow, no vignette; the riverbed only behind
 * scenes)
 * ============================================================================================================== */

/** A flat ground. The window world's is the page's paper (`SYSTEM.bg`): its moments sit in hairline frames on it. */
export const FlatGround: React.FC<{ color?: string; children?: ReactNode; style?: CSSProperties }> = ({ color = SYSTEM.bg, children, style }) => (
  <AbsoluteFill style={{ backgroundColor: color, ...style }}>{children}</AbsoluteFill>
);

/**
 * The line the pebble stands on (DESIGN-LEXINGTON §3.9, the page's Horizon): the page's hand-drawn path (comp lex-A's,
 * a slight wobble across a 1000 × 12 box) in `SYSTEM.trail`, faded over its first and last 12 %, static (no wobble, no
 * draw-on: the motion budget belongs to the pebble). From x0 to x1 at the foot's y, frame px; drawn at FRAME.horizon
 * (2.5 px at the reference size) so a phone's downscale keeps it.
 */
export const Horizon: React.FC<{ x0: number; x1: number; y: number; stroke?: number; color?: string; id: string; style?: CSSProperties }> = ({
  x0,
  x1,
  y,
  stroke,
  color = SYSTEM.trail,
  id,
  style,
}) => {
  const L = useLayout();
  const w = Math.max(1, x1 - x0);
  const sw = stroke ?? FRAME.horizon * L.s;
  const d = "M0 6.6C70 5.4 150 7.2 230 6.4S390 5.3 470 6S560 6.2 640 6.1S800 7.3 880 6.4S960 5.6 1000 6.2";
  return (
    <svg
      width={w}
      height={12 * L.s}
      viewBox="0 0 1000 12"
      preserveAspectRatio="none"
      style={{ position: "absolute", left: x0, top: y - 6 * L.s, overflow: "visible", ...style }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={color} stopOpacity={0} />
          <stop offset="0.12" stopColor={color} />
          <stop offset="0.88" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke={`url(#${id})`} strokeWidth={sw} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

/* ================================================================================================================
 * The film pebble
 * ============================================================================================================== */

/** Hops of an instance in the aspect's frame px (with each hop's timing: H2 hangs at its apex). */
export const hopsFor = (ids: readonly string[], a: AspectId, s: number): Hop[] =>
  HOPS.filter((h) => ids.includes(h.id)).map((h) => ({ at: h.at, to: { x: h.to[a].x * s, y: h.to[a].y * s }, duration: h.duration, timing: h.timing }));

/** PebbleOnFilm with the film's merged cue list (timeline cues + pointer-driven looks) for this aspect. */
export const FilmPebble: React.FC<{
  x: number;
  y: number;
  size: number;
  hops?: readonly Hop[];
  colors?: PebbleColors;
  shadow?: boolean;
  cues?: readonly PebbleCue[];
}> = ({ x, y, size, hops, colors, shadow, cues }) => {
  const L = useLayout();
  return <PebbleOnFilm cues={cues ?? filmCues(L.aspect)} size={size} x={x} y={y} hops={hops} colors={colors} shadow={shadow} />;
};

/* ================================================================================================================
 * Real recorded UI (record.mjs vclock frames) and presses drawn over it
 * ============================================================================================================== */

const pad5 = (n: number) => String(n).padStart(5, "0");

/**
 * How the film points (lane v2-film, as the loops do: video/src/loops/kit.tsx SYSTEM.focus): the rest of the same
 * picture recedes under a veil of the window's own colour (#F7F8F5) at 45 % and 2.5 px of on-screen blur (the loops' 50 % and
 * 4 px at their smaller page size; at the film's 1080 px the card's "Done" stays legible as context), and the region
 * in focus keeps its own pixels. Nothing drawn on top has a colour of its own, so a pointer never reads as UI state:
 * the accent ring that stood 15 px off "Undo this edit" still read as that text button's own outline (REVIEW-G2
 * P2-12), and pointing is not one of the accent's three jobs (PHILOSOPHY).
 */
export const FOCUS = { veil: 0.45, blur: 2.5, color: "#F7F8F5" } as const;
export interface RecordedFocus {
  /** the sharp region, CSS px of the recording */
  rect: Rect;
  /** 0..1 */
  amount: number;
  /** the camera's zoom (the blur is given on screen) */
  zoom: number;
  radius?: number;
}
/** The PNG of a recorded sequence showing source second `s` (index = round(s × 30)). */
export const recordedFrame = (dir: string, frames: number, s: number) =>
  staticFile(`${dir}/${pad5(Math.max(0, Math.min(frames - 1, Math.round(s * 30))) + 1)}.png`);

/**
 * A recorded frame placed in world units (one unit = one CSS px of the recorded viewport), with an optional press
 * drawn over one control (FILM_SPEC §10: the target at 0.97 and about 4 % darker while held). The press re-uses the
 * frame's own pixels: the control is cut out of the same image and scaled about its centre over a patch of its ground,
 * so nothing is redrawn.
 */
export const RecordedUi: React.FC<{
  src: string;
  width: number;
  height: number;
  x?: number;
  y?: number;
  press?: { rect: Rect; radius: number; ground: string; scale: number; darken: number } | null;
  /** one region in focus (R5 §5.3's spotlight, FOCUS below): the rest of the same frame recedes */
  focus?: RecordedFocus | null;
  children?: ReactNode;
  style?: CSSProperties;
}> = ({ src, width, height, x = 0, y = 0, press, focus, children, style }) => {
  const img = <Img src={src} style={{ position: "absolute", left: 0, top: 0, width, height, display: "block" }} />;
  const a = focus ? Math.max(0, Math.min(1, focus.amount)) : 0;
  const box: CSSProperties = { position: "absolute", left: 0, top: 0, width, height };
  return (
    <div style={{ position: "absolute", left: x, top: y, width, height, ...style }}>
      {focus && a > 0.001 ? (
        <>
          <div style={{ ...box, filter: `blur(${((FOCUS.blur * a) / Math.max(0.01, focus.zoom)).toFixed(3)}px)` }}>{img}</div>
          <div style={{ ...box, background: FOCUS.color, opacity: FOCUS.veil * a }} />
          <div
            style={{
              ...box,
              clipPath: `inset(${focus.rect.y}px ${width - focus.rect.x - focus.rect.w}px ${height - focus.rect.y - focus.rect.h}px ${focus.rect.x}px round ${focus.radius ?? 0}px)`,
            }}
          >
            {img}
          </div>
        </>
      ) : (
        img
      )}
      {press ? (
        <>
          <div
            style={{
              position: "absolute",
              left: press.rect.x - 1.5,
              top: press.rect.y - 1.5,
              width: press.rect.w + 3,
              height: press.rect.h + 3,
              borderRadius: press.radius + 1.5,
              background: press.ground,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformOrigin: `${press.rect.x + press.rect.w / 2}px ${press.rect.y + press.rect.h / 2}px`,
              transform: `scale(${press.scale.toFixed(4)})`,
              clipPath: `inset(${press.rect.y}px ${width - press.rect.x - press.rect.w}px ${height - press.rect.y - press.rect.h}px ${press.rect.x}px round ${press.radius}px)`,
            }}
          >
            {img}
            <div style={{ position: "absolute", left: press.rect.x, top: press.rect.y, width: press.rect.w, height: press.rect.h, background: `rgba(${COLOR.shadowRgb}, ${press.darken.toFixed(3)})` }} />
          </div>
        </>
      ) : null}
      {children}
    </div>
  );
};

/* ================================================================================================================
 * The stage: a moment in a hairline frame, with motion blur
 * ============================================================================================================== */

/** CSS border-radius for the stage's rounded corners (the others bleed off the frame). */
export const stageRadii = (corners: StageCorners, r: number) =>
  corners === "left" ? `${r}px 0 0 ${r}px` : corners === "top" ? `${r}px ${r}px 0 0` : corners === "topLeft" ? `${r}px 0 0 0` : `${r}px`;

/**
 * The window world's stage (FILM_SPEC §4; PHILOSOPHY "Imagery": a moment sits in a hairline frame): a rounded viewport
 * into the real UI on the paper ground, its edge a 2 px ring in `SYSTEM.line` drawn OVER the picture's edge (the
 * page's ::after ring), no shadow (the pebble casts the only one). Plus motion blur on its content only (R5 §6.3: fast
 * camera moves only, ≤ 20 px on the frame, ≤ 12 px on text): an axis-aligned Gaussian (SVG feGaussianBlur, duplicate
 * edges) in frame px, sized from how far the content moved since the last frame. The ring and the overlay (pointer,
 * callout ring) stay sharp. `clipOverlay` keeps the pointer inside the frame (the vertical, whose stage has a visible
 * bottom edge).
 */
export const FilmStage: React.FC<{
  rect: Rect;
  pose: CamPose;
  /** stdDeviation in frame px along x and y (0 = none) */
  blur?: { x: number; y: number };
  background?: string;
  children: ReactNode;
  overlay?: ReactNode;
  clipOverlay?: boolean;
}> = ({ rect, pose, blur, background = "#F7F8F5", children, overlay, clipOverlay = false }) => {
  const L = useLayout();
  const viewport = { width: rect.w, height: rect.h };
  const on = !!blur && (blur.x > 0.15 || blur.y > 0.15);
  const id = "film-stage-motion-blur";
  const radius = stageRadii(L.win.stageCorners, L.win.stageRadius);
  const ring = Math.max(1, FRAME.ring * L.s);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: rect.x,
          top: rect.y,
          width: rect.w,
          height: rect.h,
          borderRadius: radius,
          overflow: "hidden",
          background,
        }}
      >
        {on ? (
          <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
            <defs>
              <filter id={id} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation={`${blur!.x.toFixed(2)} ${blur!.y.toFixed(2)}`} edgeMode="duplicate" />
              </filter>
            </defs>
          </svg>
        ) : null}
        <div style={{ position: "absolute", left: 0, top: 0, width: rect.w, height: rect.h, filter: on ? `url(#${id})` : undefined }}>
          <Camera pose={pose} viewport={viewport} background={background}>
            <World>{children}</World>
          </Camera>
        </div>
        {/* the hairline, over the picture's edge */}
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: `inset 0 0 0 ${ring}px ${SYSTEM.line}`, pointerEvents: "none" }} />
      </div>
      {overlay ? (
        <div
          style={{
            position: "absolute",
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            pointerEvents: "none",
            overflow: clipOverlay ? "hidden" : undefined,
            borderRadius: clipOverlay ? radius : undefined,
          }}
        >
          <Camera pose={pose} viewport={viewport} background="transparent" clip={false}>
            {overlay}
          </Camera>
        </div>
      ) : null}
    </>
  );
};

/** A full-frame flat colour (the solid frames at the end of a zoom-through). */
export const Solid: React.FC<{ color: string; opacity?: number }> = ({ color, opacity = 1 }) => (
  <AbsoluteFill style={{ backgroundColor: color, opacity }} />
);

/**
 * A frame-sized blur for the zoom-throughs (FILM_SPEC §6: only on their last frames, ≤ 20 px). Its content is drawn
 * BLEED px past every frame edge (the child camera gets a viewport that much larger), so the blur's soft edge falls
 * outside the frame: blurring a frame-sized layer pulls transparency in at the edges, a light rim around a dive into a
 * dark colour (Chrome ignores feGaussianBlur's edgeMode). `children(viewport)` renders the camera for that viewport.
 */
export const BLEED = 48;
export const FrameBlur: React.FC<{ px: number; children: (viewport: { width: number; height: number }) => ReactNode }> = ({ px, children }) => {
  const { width, height } = useVideoConfig();
  const viewport = { width: width + 2 * BLEED, height: height + 2 * BLEED };
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", left: -BLEED, top: -BLEED, width: viewport.width, height: viewport.height, filter: px > 0.15 ? `blur(${(px / 2).toFixed(2)}px)` : undefined }}>
        {children(viewport)}
      </div>
    </AbsoluteFill>
  );
};
