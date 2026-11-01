// A real take as a floating 3D card: a crop of one source frame, rounded, edge-lit, with a deep soft shadow and a glow
// under it, tilted in perspective. Motion trails (`trail`) draw ghost copies along the move for whips and zooms, the
// cheap, deterministic motion blur (each copy is the same image, decoded once). Never draws UI: only the take's pixels.
import { Img, staticFile } from "remotion";
import type { CSSProperties } from "react";
import { CROPS, REEL_TAKES, framePath, type CropId } from "../takes";
import { REEL } from "./look";

export interface CardPose {
  /** centre, frame px */
  x: number;
  y: number;
  /** device px of the take → frame px */
  k: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  opacity?: number;
}

export interface Trail {
  /** the pose's velocity per frame (px, and the scale's log rate) */
  vx: number;
  vy: number;
  vlk?: number;
  /** how many ghost copies (0 = none) and over how many frames back they spread */
  n: number;
  span?: number;
}

export const Card: React.FC<{
  crop: CropId;
  /** source file frame */
  src: number;
  pose: CardPose;
  trail?: Trail;
  /** the inner camera: `at` (source device px) is shown at the card's centre, zoomed `zoom`× (1 with `at` the crop's centre = the crop as is) */
  inner?: { zoom: number; at: { x: number; y: number } };
  /** a light sweep across the card, 0..1 (undefined: none) */
  sweep?: number;
  /** fade the card's right part out (a crop whose text runs off) */
  fadeRight?: boolean;
  /** an extra glow under the card, 0..1 */
  glow?: number;
  radiusPx?: number;
  shadow?: boolean;
  /** extra blur on the card itself, px (a fast move, or depth of field for a far card) */
  blurPx?: number;
  /**
   * light drawn INSIDE the card over the picture (screen blend), in the card's own box, so it follows the card's 3D
   * pose exactly: `at(sx, sy)` maps a source device-px point to the box. For the aura on a captured pebble.
   */
  overlay?: (at: (sx: number, sy: number) => { x: number; y: number }, scale: number) => React.ReactNode;
  /** a grade on the picture: brightness (1 = as captured), with a touch of contrast (the full reel's screens: close and bright) */
  bright?: number;
}> = ({ crop, src, pose, trail, inner, sweep, fadeRight, glow = 0.6, radiusPx, shadow = true, blurPx = 0, overlay, bright = 1 }) => {
  const c = CROPS[crop];
  const r = c.rect;
  const w = r.w * pose.k;
  const h = r.h * pose.k;
  const radius = radiusPx ?? Math.max(14, Math.min(34, ("radius" in c && c.radius ? c.radius : 40) * pose.k * 0.5));
  const n = trail?.n ?? 0;
  const span = trail?.span ?? 1;
  const copies = Array.from({ length: n + 1 }, (_, i) => i); // 0 is the card itself
  const ghostBlur = trail ? (Math.hypot(trail.vx, trail.vy) * span) / Math.max(1, n) * 0.8 : 0;
  const z = inner?.zoom ?? 1;
  // the inner camera never looks outside the crop (the crop is the privacy boundary): `at` is clamped so the zoomed
  // window stays inside it
  const at0 = inner?.at ?? { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  const hw = r.w / (2 * z);
  const hh = r.h / (2 * z);
  const at = { x: Math.min(r.x + r.w - hw, Math.max(r.x + hw, at0.x)), y: Math.min(r.y + r.h - hh, Math.max(r.y + hh, at0.y)) };
  // the picture inside the card: scaled by k·zoom about `at`, which sits at the card's centre when zoomed
  const pk = pose.k * z;
  // `at` (source device px) sits at the card's centre; the caller moves it from the crop's centre to its target
  const imgLeft = w / 2 - at.x * pk;
  const imgTop = h / 2 - at.y * pk;
  const file = staticFile(framePath(c.take, src));
  const mask: CSSProperties = fadeRight ? { WebkitMaskImage: "linear-gradient(90deg, #000 0%, #000 72%, transparent 98%)", maskImage: "linear-gradient(90deg, #000 0%, #000 72%, transparent 98%)" } : {};

  const body = (key: number, dx: number, dy: number, ds: number, alpha: number) => (
    <div
      key={key}
      style={{
        position: "absolute",
        left: pose.x - w / 2 + dx,
        top: pose.y - h / 2 + dy,
        width: w,
        height: h,
        transform: `perspective(1800px) rotateX(${pose.rotX ?? 0}deg) rotateY(${pose.rotY ?? 0}deg) rotateZ(${pose.rotZ ?? 0}deg) scale(${ds})`,
        opacity: (pose.opacity ?? 1) * alpha,
        borderRadius: radius,
        overflow: "hidden",
        boxShadow:
          key === 0 && shadow
            ? `0 ${h * 0.06}px ${h * 0.16}px -${h * 0.02}px rgba(${REEL.shadeRgb}, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.10), inset 0 1px 0 rgba(255, 255, 255, 0.16)`
            : undefined,
        background: "#111814",
        // ghosts are softened so a trail reads as one smear, not a stack of copies; the card itself blurs with its speed
        filter: [key > 0 ? `blur(${Math.max(2, ghostBlur)}px)` : blurPx > 0.4 ? `blur(${blurPx}px)` : "", bright !== 1 ? `brightness(${bright}) contrast(1.04)` : ""].join(" ").trim() || undefined,
        ...mask,
      }}
    >
      <Img src={file} style={{ position: "absolute", left: imgLeft, top: imgTop, width: REEL_TAKES[c.take].w * pk, maxWidth: "none" }} />
      {key === 0 && overlay && <div style={{ position: "absolute", inset: 0, mixBlendMode: "screen" }}>{overlay((sx, sy) => ({ x: imgLeft + sx * pk, y: imgTop + sy * pk }), pk)}</div>}
      {key === 0 && sweep !== undefined && sweep > 0 && sweep < 1 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(105deg, transparent ${sweep * 160 - 40}%, rgba(255, 255, 255, 0.11) ${sweep * 160 - 25}%, rgba(255, 255, 255, 0.0) ${sweep * 160 - 10}%)`,
            mixBlendMode: "screen",
          }}
        />
      )}
      {key === 0 && (
        // the edge light: a hairline highlight along the top-left edges
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, boxShadow: "inset 1px 1px 0 rgba(255, 255, 255, 0.14)" }} />
      )}
    </div>
  );

  return (
    <>
      {glow > 0 && (
        <div
          style={{
            position: "absolute",
            left: pose.x - w * 0.7,
            top: pose.y - h * 0.7,
            width: w * 1.4,
            height: h * 1.4,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, rgba(${REEL.sage}, ${0.45 * glow}), transparent)`,
            opacity: pose.opacity ?? 1,
            filter: "blur(30px)",
          }}
        />
      )}
      {copies
        .slice()
        .reverse()
        .map((i) => {
          if (i === 0) return body(0, 0, 0, 1, 1);
          const back = (i / n) * span;
          const ds = trail?.vlk ? Math.exp(-(trail.vlk ?? 0) * back) : 1;
          return body(i, -(trail?.vx ?? 0) * back, -(trail?.vy ?? 0) * back, ds, 0.5 * (1 - i / (n + 1)) ** 1.3);
        })}
    </>
  );
};
