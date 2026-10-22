// Gradient stops without Mach bands. A CSS gradient with two or three stops changes slope abruptly at each stop, and
// on large flat grounds the eye sees that kink as a ring (measured on the first sage-field style frame). These helpers
// spread an eased falloff over many stops, so the ground's light reads as light, not as a drawn edge. Chrome then
// dithers the result, which also keeps 8-bit banding down before the encode.

/** `n` colour stops from alpha a0 at `from` % to alpha a1 at `to` %, eased with smoothstep. `rgb` is "r, g, b". */
export function easedStops(rgb: string, a0: number, a1: number, from = 0, to = 100, n = 10): string {
  const out: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s = t * t * (3 - 2 * t);
    const a = a0 + (a1 - a0) * s;
    out.push(`rgba(${rgb}, ${a.toFixed(4)}) ${(from + (to - from) * t).toFixed(2)}%`);
  }
  return out.join(", ");
}

/** A radial glow: alpha `a` at the centre falling smoothly to 0 at `r` (px), at (x, y) px. */
export const glow = (rgb: string, a: number, x: number, y: number, rx: number, ry = rx) =>
  `radial-gradient(${rx.toFixed(0)}px ${ry.toFixed(0)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, ${easedStops(rgb, a, 0)})`;
