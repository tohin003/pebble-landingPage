// Scene group b's local helpers (the real-take scenes S02, S03, S09). Owned by group b; nothing here belongs to the
// motion system. If the director wants any of it shared, it can move to launch/components.
import { useId, type CSSProperties, type ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { BODY, VIEWBOX_SIZE } from "../../../../../shared/pebble";
import type { Box } from "../../camera";
import { ScreenZoom, type ScreenZoomProps } from "../../components/ScreenZoom";
import { Stage } from "../../components/Stage";
import { TAKES } from "../../data/takes";
import { useLayout, type Layout, type Rect } from "../../layout";
import { realTime, timeMap } from "../../timeMap";
import { EASE } from "../../tokens";
import { DAY } from "../../world";

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** The scene's length in seconds and its retime factor against the nominal length (1 = as choreographed). */
export const useSceneTime = (nominalS: number, durationInFrames?: number) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: compFrames } = useVideoConfig();
  const frames = durationInFrames ?? compFrames;
  const lenS = frames / fps;
  return { t: frame / fps, fps, frames, lenS, k: lenS / nominalS, f: (sec: number) => Math.round(sec * fps) };
};

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const lerpRect = (a: Rect, b: Rect, p: number): Rect => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });

/** A rect from reference px (1920×1080 or 1080×1350) to this frame's px. */
export const R = (L: Layout, x: number, y: number, w: number, h: number): Rect => ({ x: L.px(x), y: L.px(y), w: L.px(w), h: L.px(h) });

/** 0 → 1 over [at, at + dur] on an ease (camera ease by default). */
export const ramp = (t: number, at: number, dur: number, ease = EASE.camera) => ease(clamp01((t - at) / Math.max(1e-6, dur)));

/* ---------- type on the desktop ground ---------- */

/** Type on the Mac's light wallpaper: daylight's ink (the desktop world's palette is for dark grounds). */
export const INK = DAY.ink;

/* ---------- the Desktop world's ground: the Mac's own wallpaper ---------- */

const WALL = TAKES["RS13-03"];
/** RS13-03's desktop is bare and still from 7.7 s; one frame of it, held */
const WALL_TIME = timeMap(
  [
    [0, 9.5],
    [1, 9.5],
  ],
  { tail: 0, head: 0 },
);
/**
 * Clean wallpaper only: under the take's Finder window (it ends at y 1131) and above the Dock (from y 1735), right of
 * the pointer (x 1580) and of the widgets; on 4:5, right of the Finder window (x > 2397).
 */
const wallBox = (L: Layout): Box => (L.portrait ? { x: 2420, y: 1080, w: 520, h: 650 } : { x: 1700, y: 1145, w: 1040, h: 585 });

/**
 * The Desktop world (REVIEW-1 BANNED: "windows on a dark blur, which make the desktop world read as night"): the
 * recordings float on a soft blur of the same Mac's own wallpaper, not darkened, so the world reads as a Mac's desktop.
 * Type on it is ink.
 */
export const DesktopGround: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const L = useLayout();
  return (
    <Stage world="desktop" desktop={{ src: WALL.file, srcSize: { w: WALL.width, h: WALL.height }, time: WALL_TIME, box: wallBox(L), blur: 22, dim: 0 }} vignette={0.1}>
      {children}
    </Stage>
  );
};

/* ---------- masks on a take: fills and blurs that follow the camera ---------- */

/** Something on a take that must not show (TREATMENT §5), in source px, while the source time is inside [s0, s1). */
export interface Mask {
  box: Box;
  s0: number;
  s1: number;
  /** "blur" (default): frosted in place; "fill": painted over in the UI's own colour (a CSS background) */
  kind?: "blur" | "fill";
  /** blur, SOURCE px (default 20): it scales with the camera, so a push never sharpens what it hides */
  px?: number;
  /** kind "blur": the opaque colour under the frosted copy (the UI's own ground; default near-black) */
  backing?: string;
  /** kind "blur": rounded holes left sharp inside the box (Pebble's own pill on a frosted page), source px */
  holes?: readonly { box: Box; r: number }[];
  /** kind "fill": the CSS background */
  fill?: string;
  /** content that moves in the take (a Space sliding in): its offset at source time s, source px */
  track?: (s: number) => { dx: number; dy: number };
  /** kind "fill": corner radius, view px */
  radius?: number;
}

/** The SVG blur a frosted copy uses: edges duplicated, so the copy stays opaque to its own edges. */
const FrostFilter: React.FC<{ id: string; px: number }> = ({ id, px }) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feGaussianBlur stdDeviation={px.toFixed(2)} edgeMode="duplicate" />
    </filter>
  </svg>
);

/** A rounded rect as an SVG path (view px), for a hole in a clip path. */
const roundRect = (r: Rect, rad: number) => {
  const k = Math.max(0, Math.min(rad, r.w / 2, r.h / 2));
  const f = (v: number) => v.toFixed(1);
  return `M${f(r.x + k)} ${f(r.y)}H${f(r.x + r.w - k)}A${f(k)} ${f(k)} 0 0 1 ${f(r.x + r.w)} ${f(r.y + k)}V${f(r.y + r.h - k)}A${f(k)} ${f(k)} 0 0 1 ${f(r.x + r.w - k)} ${f(r.y + r.h)}H${f(r.x + k)}A${f(k)} ${f(k)} 0 0 1 ${f(r.x)} ${f(r.y + r.h - k)}V${f(r.y + k)}A${f(k)} ${f(k)} 0 0 1 ${f(r.x + k)} ${f(r.y)}Z`;
};

/**
 * A take on a ScreenZoom with its hazards hidden in place (TREATMENT §5). A "blur" mask shows a second, frosted copy
 * of the same picture (same time map, same camera) over an opaque backing, clipped to the mask's box: nothing under it
 * can read through, even at the view's edges (a CSS backdrop-filter proved unreliable here: one box drew sharp, the
 * others thinned at their edges). Its strength is in source px, so a push never sharpens what it hides. A "fill" mask
 * paints over in the UI's own colour. Both follow the camera exactly (ScreenZoom's own source → view mapping); a
 * tracked box follows content that moves inside the take.
 */
export const MaskedZoom: React.FC<ScreenZoomProps & { masks: readonly Mask[] }> = ({ masks, ...zoom }) => {
  const id = `fz${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const map = zoom.time ?? realTime(zoom.srcStart ?? 0);
  const overlay = (toView: (p: { x: number; y: number }) => { x: number; y: number }, scale: number, t: number): ReactNode => {
    const src = map.at(t);
    const active = masks.filter((m) => src >= m.s0 && src < m.s1);
    const toRect = (b: Box, o = { dx: 0, dy: 0 }): Rect => {
      const a = toView({ x: b.x + o.dx, y: b.y + o.dy });
      const c = toView({ x: b.x + b.w + o.dx, y: b.y + b.h + o.dy });
      return { x: a.x, y: a.y, w: c.x - a.x, h: c.y - a.y };
    };
    const view = (m: Mask) => toRect(m.box, m.track ? m.track(src) : undefined);
    // one frosted copy per blur strength (view px, rounded), clipped to the union of its boxes minus their holes
    const groups = new Map<number, { paths: string[]; backing: string }>();
    for (const m of active) {
      if (m.kind === "fill") continue;
      const sigma = Math.max(2, Math.round((m.px ?? 20) * scale));
      const g = groups.get(sigma) ?? { paths: [], backing: m.backing ?? "#141615" };
      const r = view(m);
      g.paths.push(`M${r.x.toFixed(1)} ${r.y.toFixed(1)}h${r.w.toFixed(1)}v${r.h.toFixed(1)}h${(-r.w).toFixed(1)}Z`);
      for (const h of m.holes ?? []) g.paths.push(roundRect(toRect(h.box), h.r * scale));
      groups.set(sigma, g);
    }
    return (
      <>
        {[...groups.entries()].map(([sigma, g]) => (
          <div key={`b${sigma}`} style={{ position: "absolute", inset: 0, clipPath: `path(evenodd, "${g.paths.join(" ")}")` }}>
            <div style={{ position: "absolute", inset: 0, background: g.backing }} />
            <FrostFilter id={`${id}-${sigma}`} px={sigma} />
            <div style={{ position: "absolute", inset: 0, filter: `url(#${id}-${sigma})` }}>
              <ScreenZoom {...zoom} overlay={undefined} motionBlur={false} edgeFade={false} />
            </div>
          </div>
        ))}
        {active
          .filter((m) => m.kind === "fill")
          .map((m, i) => {
            const r = view(m);
            const st: CSSProperties = { position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: m.radius ?? 0, background: m.fill ?? "#000" };
            return <div key={`f${i}`} style={st} />;
          })}
      </>
    );
  };
  return <ScreenZoom {...zoom} overlay={overlay} />;
};

/* ---------- the whip across S02 → S03 ---------- */

/**
 * Half a whip at a scene's edge: "out" over the last `dur` seconds (the picture accelerates away to the left in a
 * directional blur), "in" over the first `dur` seconds (the next picture arrives at speed and sharpens). The two halves
 * either side of a hard cut read as one whip. The travel is short (8 % of the width) and the picture overscales to
 * cover it, so no edge or empty ground ever shows; the blur carries the speed. The element tree never changes shape
 * (the blur filter is always there, at 0 when idle), so nothing inside remounts when the whip starts or ends.
 */
export const EdgeWhip: React.FC<{ role: "out" | "in"; start: number; dur: number; children: ReactNode }> = ({ role, start, dur, children }) => {
  const id = `ew${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const p = dur <= 0 ? (role === "out" ? 0 : 1) : clamp01((t - start) / dur);
  // speed: 0 → 1 across the out half (accelerating), 1 → 0 across the in half (settling)
  const v = role === "out" ? p * p : (1 - p) * (1 - p);
  const on = v > 0.001;
  const dx = role === "out" ? -0.08 * width * p * p : 0.08 * width * (1 - p) * (1 - p);
  const k = 1 + 0.17 * v;
  const b = on ? 90 * (height / 1080) * v : 0;
  return (
    <AbsoluteFill style={{ transform: on ? `translateX(${dx.toFixed(2)}px) scale(${k.toFixed(4)})` : undefined, filter: on ? `url(#${id})` : undefined }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${b.toFixed(2)} 0`} edgeMode="duplicate" />
        </filter>
      </svg>
      {children}
    </AbsoluteFill>
  );
};

/* ---------- a picture scaled about one of its points ---------- */

/**
 * Its content scaled by `s` about the content point `from`, which lands at `to` (frame px). At s = 1 and to = from it is
 * the identity. Used for S02's opening: the screen window starts scaled up about the pebble (centred, sharp) and
 * settles into its place.
 */
export const ZoomAbout: React.FC<{ s: number; from: { x: number; y: number }; to: { x: number; y: number }; children: ReactNode }> = ({ s, from, to, children }) => (
  <AbsoluteFill
    style={{
      transform: `translate(${(to.x - from.x * s).toFixed(2)}px, ${(to.y - from.y * s).toFixed(2)}px) scale(${s.toFixed(5)})`,
      transformOrigin: "0 0",
    }}
  >
    {children}
  </AbsoluteFill>
);

/* ---------- the pebble's hand-off to S10 ---------- */

/**
 * S09's last frame → S10's first (FIXES-1, the persistent actor): the Veil pebble with its BODY centred at
 * (0.5 W, 0.5 H) and the body 12 % of the frame's height (scenes/d S10_PEBBLE_IN; master/timeline.ts's pebbleWipe).
 */
export const VEIL_HANDOFF = { x: 0.5, y: 0.5, h: 0.12 } as const;
/** A body placement (centre and height as fractions of the frame) → VeilPebble's foot and viewBox size, px. */
export const pebbleAt = (p: { x: number; y: number; h: number }, W: number, H: number) => {
  const bodyH = p.h * H;
  const size = (bodyH * VIEWBOX_SIZE) / BODY.height;
  return { x: p.x * W, y: p.y * H + bodyH / 2, size, bodyH };
};

/* ---------- SFX (video/public/launch/audio/sfx, kit.json) ---------- */

const SFX_DIR = "launch/audio/sfx/";
/** group b's effects and each file's peak time (kit.json `peak_time_s`): place the peak, not the file start */
export const SFX = {
  click: "sfx-click-soft-a.wav",
  clickB: "sfx-click-soft-b.wav",
  keyA: "sfx-key-tap-a.wav",
  keyB: "sfx-key-tap-b.wav",
  keyC: "sfx-key-tap-c.wav",
  shimmer: "sfx-shimmer.wav",
  whoosh: "sfx-whoosh-short.wav",
  whooshB: "sfx-whoosh-short-b.wav",
  pop: "sfx-pop-soft-b.wav",
} as const;
export type SfxName = keyof typeof SFX;
const PEAK: Record<SfxName, number> = {
  click: 0.0022,
  clickB: 0.0005,
  keyA: 0.001,
  keyB: 0.001,
  keyC: 0.002,
  shimmer: 0.0007,
  whoosh: 0.2809,
  whooshB: 0.2401,
  pop: 0.0006,
};
/** the file's start so that its peak lands half a frame (60 fps) after the visual contact at `t` */
export const sfxAt = (name: SfxName, t: number) => t + 1 / 120 - PEAK[name];
export const sfxSrc = (name: SfxName) => SFX_DIR + SFX[name];

export interface SfxNote {
  name: SfxName;
  /** the visual contact, scene seconds */
  s: number;
  db: number;
  what: string;
}
