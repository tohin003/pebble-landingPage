// <GradeLayer>: a grade (light/grades.ts) applied to everything inside it, in CSS: the filter chain on the picture,
// then soft-light washes (warmth, the dusk tint), the key light's pool above left (screen) and a vignette in the
// brand's shade green (never black), each gradient spread over many eased stops so it reads as light, not as an edge.
//
// Film type sits outside the grade (its ink stays the brand's ink); the master LUT (light/lut.ts) then grades the
// whole frame once, at the finish, in FFmpeg.
import { useId, type ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { COLOR } from "../tokens";
import { KEY_LIGHT, type Grade } from "./grades";

/**
 * <GroundLight>: the grade's own light on the GROUND only (CR-14): its linear-light gains (`grade.ground`) as an SVG
 * colour matrix in linearRGB (light/grades.ts applyGroundLight models exactly this), around the riverbed's world, so
 * warm, day, dusk and evening read on the ground while the UI planes above it keep their own colours.
 */
export const GroundLight: React.FC<{ gains: readonly [number, number, number]; children: ReactNode }> = ({ gains, children }) => {
  const id = `f2gl${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const neutral = gains.every((g) => Math.abs(g - 1) < 1e-4);
  if (neutral) return <AbsoluteFill>{children}</AbsoluteFill>;
  const [r, g, b] = gains.map((v) => v.toFixed(5));
  return (
    <AbsoluteFill style={{ filter: `url(#${id})` }}>
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={`${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`} />
          </filter>
        </defs>
      </svg>
      {children}
    </AbsoluteFill>
  );
};

/** `n` eased colour stops from alpha a0 to a1 (smoothstep), no Mach bands on large grounds. */
export function easedStops(rgb: string, a0: number, a1: number, from = 0, to = 100, n = 12): string {
  const out: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = t * t * (3 - 2 * t);
    out.push(`rgba(${rgb}, ${(a0 + (a1 - a0) * s).toFixed(4)}) ${(from + (to - from) * t).toFixed(2)}%`);
  }
  return out.join(", ");
}

export const gradeFilter = (g: Grade): string =>
  `brightness(${g.brightness.toFixed(4)}) contrast(${g.contrast.toFixed(4)}) saturate(${g.saturate.toFixed(4)})`;

const WARM = "255, 179, 107";
const COOL = "143, 182, 217";

export const GradeLayer: React.FC<{ grade: Grade; children: ReactNode; vignette?: boolean; keyLight?: boolean }> = ({
  grade: g,
  children,
  vignette = true,
  keyLight = true,
}) => {
  const warmA = Math.abs(g.warmth) * 0.14;
  const tintRgb = g.tint.replace("#", "");
  const tint = `${parseInt(tintRgb.slice(0, 2), 16)}, ${parseInt(tintRgb.slice(2, 4), 16)}, ${parseInt(tintRgb.slice(4, 6), 16)}`;
  return (
    <AbsoluteFill style={{ isolation: "isolate" }}>
      <AbsoluteFill style={{ filter: gradeFilter(g) }}>{children}</AbsoluteFill>
      {warmA > 0.001 ? <AbsoluteFill style={{ background: `rgb(${g.warmth >= 0 ? WARM : COOL})`, opacity: warmA, mixBlendMode: "soft-light" }} /> : null}
      {g.tintAmount > 0.001 ? <AbsoluteFill style={{ background: `rgb(${tint})`, opacity: g.tintAmount, mixBlendMode: "soft-light" }} /> : null}
      {keyLight && g.keyLight > 0.001 ? (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse ${(KEY_LIGHT.reach * 100).toFixed(0)}% ${(KEY_LIGHT.reach * 120).toFixed(0)}% at ${(KEY_LIGHT.u * 100).toFixed(1)}% ${(KEY_LIGHT.v * 100).toFixed(1)}%, ${easedStops("255, 255, 255", g.keyLight, 0)})`,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      {vignette && g.vignette > 0.001 ? (
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 74% 74% at 50% 46%, ${easedStops(COLOR.shadeRgb, 0, g.vignette, 45, 100)})` }} />
      ) : null}
    </AbsoluteFill>
  );
};
