// <Stage>: the ground every scene stands on, in one of the film's three worlds (world.ts; TREATMENT §4 and rulings v1.1).
//
// - world="night" (default): ink-1 lit by a slow, soft sage key light (8-14 %), a faint warm clay light opposite, an
//   optional pool of light on the floor, a gentle vignette, film grain. tint="dusk" swaps the key light for the Veil's
//   dusk blue: Stealth Lockdown ONLY.
// - world="daylight": warm stone (#ECE8DF) under a soft warm light from the top left, a warm shade opposite, a light
//   vignette and fine grain. Type is ink; Pebble is deep sage; rivals mute.
// - world="desktop": a real take as the ground, full-bleed (`sharp`) or as a soft, dimmed blur of itself for a window
//   of the same take to float over. Pass the same time map to both, so the ground moves with the window.
//
// The lights drift and breathe slowly, and the lit ground pushes in about 0.8 % a second (REVIEW-1 N4: no hold is dead
// still; the type and the UI on it never drift from here). The grain (3 % at most, REVIEW-1 S11) dithers the ground's
// gradients and sits UNDER everything inside the stage, so large flat type stays clean. It provides the world's palette
// to everything inside (useWorld()).
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Box, Size } from "../camera";
import type { TimeMap } from "../timeMap";
import { C, LIGHT, RGB } from "../tokens";
import { WORLDS, WorldProvider, type World } from "../world";
import { Grain } from "./Grain";
import { ScreenZoom } from "./ScreenZoom";

export interface StageLight {
  /** centre, as fractions of the frame (0..1) */
  x: number;
  y: number;
  /** radius as a fraction of the frame's larger side */
  r: number;
}

export interface DesktopGround {
  /** the take (a path under video/public) and its size */
  src: string;
  srcSize: Size;
  /** the same time map as the window's (or srcStart for real time) */
  time?: TimeMap;
  srcStart?: number;
  /** the part of the take behind (source px; default all of it) */
  box?: Box;
  /** full-bleed and sharp: the take itself is the frame */
  sharp?: boolean;
  /** blur, px at 1080p (default 34) */
  blur?: number;
  /** how much darker the blurred take is, 0..1 (default 0.5) */
  dim?: number;
}

export interface StageProps {
  world?: World;
  /** night only: "dusk" for Stealth Lockdown */
  tint?: "sage" | "dusk";
  /** the key light (default: high, a little left of centre) */
  keyLight?: StageLight;
  /** the counter light (default: low, opposite the key) */
  counter?: StageLight;
  /** multiplies the lights (1 = the treatment's levels; a hit may push it to ~1.4) */
  energy?: number;
  /** a pool of light on the floor, px: its centre and width (night) */
  pool?: { x: number; y: number; w: number; strength?: number };
  /** world="desktop": the take behind */
  desktop?: DesktopGround;
  /** film grain on the ground, per cent (default 3 at night and on the desktop, 2.5 in daylight; at most 3; 0 = off) */
  grain?: number;
  /** vignette strength 0..1 */
  vignette?: number;
  /** slow drift and breathing of the lights, and the ground's push (default on) */
  drift?: boolean;
  children?: ReactNode;
}

/** A Gaussian-like radial falloff: `rgba` stops that never show an edge. */
const soft = (rgb: string, a: number): string => {
  const stops = [
    [0, 1],
    [0.18, 0.86],
    [0.36, 0.6],
    [0.55, 0.33],
    [0.72, 0.14],
    [0.86, 0.04],
    [1, 0],
  ] as const;
  return stops.map(([p, k]) => `rgba(${rgb}, ${(a * k).toFixed(4)}) ${(p * 100).toFixed(0)}%`).join(", ");
};

/** The lit ground's push, per second of the scene (REVIEW-1 N4: 0.5–1 %/s). */
const GROUND_PUSH = 0.008;
/** The most grain any stage draws, per cent (REVIEW-1 S11: 3 % at most; LinkedIn's re-encode turns more into blocking). */
const GRAIN_MAX = 3;

const ellipse = (rx: number, ry: number, x: number, y: number, rgb: string, a: number) =>
  `radial-gradient(${rx.toFixed(1)}px ${ry.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, ${soft(rgb, a)})`;

export const Stage: React.FC<StageProps> = ({
  world = "night",
  tint = "sage",
  keyLight,
  counter,
  energy = 1,
  pool,
  desktop,
  grain,
  vignette,
  drift = true,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const t = frame / fps;
  const R = Math.max(W, H);
  const u = H / 1080;
  const e = Math.max(0, energy);
  const w = (2 * Math.PI) / LIGHT.driftS;
  const breathe = drift ? 1 + 0.06 * Math.sin(w * t * 0.9 + 0.7) : 1;
  const dx = drift ? 0.025 * Math.sin(w * t) : 0;
  const dy = drift ? 0.018 * Math.cos(w * t * 0.8 + 1.1) : 0;
  // the ground's push: 0.8 % a second about the frame's centre (the lights' sizes and their offsets from the centre)
  const push = drift ? 1 + GROUND_PUSH * Math.max(0, t) : 1;
  const pushed = (x: number, y: number, r: number) => ({ x: W / 2 + (x - W / 2) * push, y: H / 2 + (y - H / 2) * push, r: r * push });
  const palette = WORLDS[world];

  let ground: ReactNode;
  let v = vignette ?? (world === "daylight" ? 0.35 : LIGHT.vignette);
  let vigRgb = RGB.ink0;
  let vigA = 0.92;
  if (world === "daylight") {
    const kl = keyLight ?? { x: 0.3, y: 0.05, r: 0.95 };
    const k = pushed((kl.x + dx) * W, (kl.y + dy) * H, kl.r * R);
    const cl = counter ?? { x: 0.88, y: 1.05, r: 0.7 };
    const c = pushed((cl.x - dx) * W, (cl.y - dy) * H, cl.r * R);
    vigRgb = "120, 106, 84";
    vigA = 0.32;
    ground = (
      <AbsoluteFill
        style={{
          backgroundColor: palette.ground,
          background: [
            ellipse(k.r * 0.7, k.r * 0.5, k.x, k.y, "255, 252, 246", 0.75 * e * breathe),
            ellipse(c.r, c.r * 0.6, c.x, c.y, "168, 150, 120", 0.14 * e),
          ].join(", ") + `, ${palette.ground}`,
        }}
      />
    );
  } else if (world === "desktop") {
    const d = desktop;
    const blur = (d?.blur ?? 34) * u;
    const dim = d?.dim ?? 0.5;
    v = vignette ?? 0.45;
    ground = (
      <AbsoluteFill style={{ backgroundColor: palette.ground, overflow: "hidden" }}>
        {d && (
          <AbsoluteFill
            style={
              d.sharp
                ? undefined
                : { transform: "scale(1.08)", filter: `blur(${blur.toFixed(1)}px) saturate(0.85) brightness(${(1 - dim).toFixed(3)})` }
            }
          >
            <ScreenZoom
              src={d.src}
              srcSize={d.srcSize}
              time={d.time}
              srcStart={d.srcStart}
              keys={d.box ? [{ t: 0, box: d.box }] : []}
              drift={d.sharp ? 0.008 : 0.004}
              motionBlur={false}
              edgeFade={false}
              width={W}
              height={H}
            />
          </AbsoluteFill>
        )}
      </AbsoluteFill>
    );
  } else {
    const kl = keyLight ?? { x: 0.42, y: 0.18, r: 0.72 };
    const k = pushed((kl.x + dx) * W, (kl.y + dy) * H, kl.r * R);
    const cl = counter ?? { x: 1 - kl.x + 0.18, y: 0.95, r: 0.5 };
    const c = pushed((cl.x - dx * 1.4) * W, (cl.y - dy) * H, cl.r * R);
    const dusk = tint === "dusk";
    // the sage light is a pale, luminous sage over a quieter sage-grey spill: light on a dark stage, not green paint
    const broadRgb = dusk ? RGB.dusk : "62, 80, 66";
    const coreRgb = dusk ? RGB.duskHi : "214, 228, 204";
    const broadA = (dusk ? 0.4 : 0.34) * e * breathe;
    const coreA = (dusk ? LIGHT.dusk * 0.7 : LIGHT.sage * 0.72) * e * breathe;
    const clayA = (dusk ? 0.02 : LIGHT.clay) * e * (drift ? 1 + 0.08 * Math.sin(w * t * 0.7 + 2.3) : 1);
    const layers = [
      ellipse(k.r * 0.55, k.r * 0.42, k.x, k.y, coreRgb, coreA),
      ellipse(k.r, k.r * 0.78, k.x, k.y, broadRgb, broadA),
      ellipse(c.r, c.r * 0.7, c.x, c.y, RGB.clay, clayA),
    ];
    if (pool) {
      const pa = (pool.strength ?? 1) * 0.16 * e;
      layers.unshift(
        ellipse(pool.w * 0.5, pool.w * 0.13, pool.x, pool.y, dusk ? RGB.duskHi : RGB.sage, pa),
        ellipse(pool.w * 1.1, pool.w * 0.34, pool.x, pool.y, dusk ? RGB.dusk : RGB.sageDeep, pa * 0.9),
      );
    }
    ground = <AbsoluteFill style={{ backgroundColor: C.ink1, background: layers.join(", ") + `, ${C.ink1}` }} />;
  }

  v = Math.max(0, Math.min(1, v));
  const grainPct = Math.min(GRAIN_MAX, grain ?? (world === "daylight" ? 2.5 : GRAIN_MAX));
  return (
    <WorldProvider value={palette}>
      <AbsoluteFill style={{ backgroundColor: palette.ground, overflow: "hidden" }}>
        {ground}
        {/* the grain dithers the ground only: under the type and the UI (REVIEW-1 S11) */}
        <Grain amountPct={grainPct} />
        {children}
        {v > 0 && (
          <AbsoluteFill
            style={{
              pointerEvents: "none",
              background: `radial-gradient(${(W * 0.78).toFixed(1)}px ${(H * 0.82).toFixed(1)}px at 50% 46%, rgba(${vigRgb}, 0) 52%, rgba(${vigRgb}, ${(0.5 * vigA * v).toFixed(3)}) 80%, rgba(${vigRgb}, ${(vigA * v).toFixed(3)}) 100%)`,
            }}
          />
        )}
      </AbsoluteFill>
    </WorldProvider>
  );
};
