// Kinetic type: one to three words that slam in on a beat (scale 1.3 → 1 with an expo-out, blur to sharp, a rise of a
// few px), hold, and leave with the cut. Inter 800, tracking −4.5 %, sentence case with its period (the site's voice).
// A light sweep can cross it (a moving highlight clipped to the letters).
import type { CSSProperties } from "react";
import { INTER_HEAVY, REEL, c01, expoOut } from "./look";

export const Word: React.FC<{
  text: string;
  /** frames since the hit (negative: not yet) */
  dt: number;
  /** frames until it leaves (≤ 0: gone); it leaves with a 3-frame push */
  left?: number;
  size: number;
  x: number;
  y: number;
  align?: "left" | "center" | "right";
  color?: string;
  /** a sweep across the letters, 0..1 */
  sweep?: number;
  /** exit direction for the push-out, px a frame */
  exitV?: { x: number; y: number };
  style?: CSSProperties;
  maxWidth?: number;
}> = ({ text, dt, left = 999, size, x, y, align = "left", color = REEL.ink, sweep, exitV, style, maxWidth }) => {
  if (dt < 0 || left <= 0) return null;
  const p = expoOut(dt / 8);
  const scale = 1.3 - 0.3 * p;
  const blur = 14 * (1 - c01(dt / 5));
  const opacity = c01((dt + 1) / 2); // visible on the hit's own frame
  const out = left < 4 ? (4 - left) : 0;
  const tx = (exitV?.x ?? 0) * out * out;
  const ty = (exitV?.y ?? 0) * out * out + 18 * (1 - p);
  const origin = align === "left" ? "0% 50%" : align === "right" ? "100% 50%" : "50% 50%";
  const anchorX = align === "left" ? 0 : align === "right" ? -100 : -50;
  const s = sweep ?? -1;
  const fill: CSSProperties =
    s > 0 && s < 1
      ? {
          backgroundImage: `linear-gradient(100deg, ${color} ${s * 140 - 30}%, #FFFFFF ${s * 140 - 18}%, ${REEL.accent} ${s * 140 - 10}%, ${color} ${s * 140}%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }
      : { color };
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${anchorX}%, -50%) translate(${tx}px, ${ty}px) scale(${scale})`,
        transformOrigin: origin,
        whiteSpace: "pre",
        fontSize: size,
        lineHeight: 0.98,
        ...INTER_HEAVY,
        opacity: opacity * (out ? Math.max(0, 1 - out / 4) : 1),
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
        textShadow: s > 0 && s < 1 ? undefined : `0 0 ${size * 0.35}px rgba(${REEL.sage}, 0.45)`,
        maxWidth,
        textAlign: align,
        ...fill,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

/** A font size that fits `text` in `width` px (Inter 800 at −4.5 % runs about 0.56 em a character), capped at `max`. */
export const fitSize = (text: string, width: number, max: number): number => {
  const longest = Math.max(...text.split("\n").map((l) => l.length));
  return Math.min(max, width / (Math.max(1, longest) * 0.56));
};
