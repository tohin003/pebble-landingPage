// Kinetic type: a short line (2–5 words, "\n" breaks it) that slams in on a beat, word by word (a 3-frame cascade:
// each word scales 1.3 → 1 with an expo-out, blur to sharp, a rise of a few px), holds, and leaves with the cut.
// Inter 800, tracking −4.5 %, sentence case with its period (the site's voice). A light sweep can cross it.
import type { CSSProperties } from "react";
import { INTER_HEAVY, REEL, c01, expoOut } from "./look";

export const CASCADE = 3;

export const Word: React.FC<{
  text: string;
  /** frames since the hit (negative: not yet) */
  dt: number;
  /** frames until it leaves (≤ 0: gone); it leaves with a 4-frame push */
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
  /** "top": `y` is the block's top edge (tall frames hang names from a margin); default its centre */
  valign?: "center" | "top";
}> = ({ text, dt, left = 999, size, x, y, align = "left", color = REEL.ink, sweep, exitV, style, valign = "center" }) => {
  if (dt < 0 || left <= 0) return null;
  const out = left < 4 ? 4 - left : 0;
  const tx = (exitV?.x ?? 0) * out * out;
  const ty = (exitV?.y ?? 0) * out * out;
  const anchorX = align === "left" ? 0 : align === "right" ? -100 : -50;
  const s = sweep ?? -1;
  let k = 0;
  const lines = text.split("\n").map((line) =>
    line.split(" ").map((w) => {
      const wdt = dt - CASCADE * k++;
      const p = expoOut(wdt / 8);
      const blur = 12 * (1 - c01(wdt / 5));
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
        <span
          key={k}
          style={{
            display: "inline-block",
            marginRight: "0.24em",
            transform: `translateY(${18 * (1 - p)}px) scale(${wdt < 0 ? 1.3 : 1.3 - 0.3 * p})`,
            transformOrigin: "50% 60%",
            opacity: wdt < -0.5 ? 0 : c01((wdt + 1) / 2), // visible on its own hit frame
            filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
            ...fill,
          }}
        >
          {w}
        </span>
      );
    }),
  );
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(${anchorX}%, ${valign === "top" ? 0 : -50}%) translate(${tx}px, ${ty}px)`,
        whiteSpace: "pre",
        fontSize: size,
        lineHeight: 1.0,
        ...INTER_HEAVY,
        opacity: out ? Math.max(0, 1 - out / 4) : 1,
        textShadow: s > 0 && s < 1 ? undefined : `0 0 ${size * 0.35}px rgba(${REEL.sage}, 0.45)`,
        textAlign: align,
        ...style,
      }}
    >
      {lines.map((ws, i) => (
        <div key={i} style={{ marginRight: "-0.24em" }}>
          {ws}
        </div>
      ))}
    </div>
  );
};

/** A font size that fits `text` in `width` px (Inter 800 at −4.5 % runs about 0.56 em a character), capped at `max`. */
export const fitSize = (text: string, width: number, max: number): number => {
  const longest = Math.max(...text.split("\n").map((l) => l.length));
  return Math.min(max, width / (Math.max(1, longest) * 0.56));
};
