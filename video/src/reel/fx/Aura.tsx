// The pebble's aura: light AROUND the pebble that follows the score (the lead, 02:55: "pebbles aura should match the
// music"). A soft glow that breathes, light rays and motes for a burst, a warm tint for the logo. It is a film effect
// drawn around the pebble, never on it: the pebble itself is always Pebble's own engine frame (or a real capture).
// Tasteful by construction: levels are smoothed (energy.py), pulses decay, and nothing strobes.
import { REEL, c01, expoOut } from "./look";

export interface AuraState {
  /** the steady glow, 0..1.5 (the score's energy plus the beat's pulse) */
  level: number;
  /** frames since the last burst (undefined: none), for the rays and the motes flying out */
  burstAge?: number;
  /** 0..1: how much of the burst's light remains (rays) */
  rays?: number;
  /** 0..1: warm (clay) light mixed in, for the logo */
  warmth?: number;
  /** 0..1: dim it right down (the rival silence's wait) */
  dim?: number;
}

/** Mixes the sage core with clay by `w`, as "r, g, b". */
const tintRgb = (w: number): string => {
  const a = REEL.sageCore.split(",").map(Number);
  const b = REEL.clay.split(",").map(Number);
  return a.map((v, i) => Math.round(v + (b[i] - v) * w)).join(", ");
};

export const Aura: React.FC<{ x: number; y: number; r: number; state: AuraState; frame: number; motes?: number; glow?: boolean }> = ({ x, y, r, state, frame, motes = 18, glow = true }) => {
  const level = Math.max(0, state.level) * (1 - 0.85 * (state.dim ?? 0));
  const warm = c01(state.warmth ?? 0);
  const core = tintRgb(warm * 0.7);
  const rays = c01(state.rays ?? 0);
  const age = state.burstAge;
  const R = r * (1.5 + 1.5 * level);
  const t = frame / 60;
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < motes; i++) {
    const g = (i * 0.618034) % 1;
    const dir = i % 2 ? 1 : -1;
    // calm motes drift on slow orbits around the pebble and twinkle with the level
    const th = i * 2.39996 + t * (0.18 + 0.12 * g) * dir;
    let rho = r * (1.35 + 1.1 * g + 0.08 * Math.sin(t * 1.3 + i));
    let a = (0.12 + 0.5 * c01(level - 0.2)) * (0.5 + 0.5 * Math.sin(t * 2.1 + i * 1.7));
    let size = r * (0.025 + 0.025 * g);
    // a burst throws them out and fades them
    if (age !== undefined && age >= 0 && age < 50) {
      const u = expoOut(age / 40);
      rho = r * (1.0 + (2.2 + 2.5 * g) * u);
      a = Math.max(a, 0.9 * (1 - age / 50));
      size *= 1.4;
    }
    dots.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: x + Math.cos(th) * rho - size,
          top: y + Math.sin(th) * rho * 0.85 - size,
          width: size * 2,
          height: size * 2,
          borderRadius: "50%",
          background: `rgba(${core}, ${c01(a)})`,
          boxShadow: `0 0 ${size * 3}px rgba(${core}, ${c01(a) * 0.8})`,
        }}
      />,
    );
  }
  const rot = t * 9 + (age ?? 0) * 0.4;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* the glow */}
      {glow && <div
        style={{
          position: "absolute",
          left: x - R,
          top: y - R,
          width: R * 2,
          height: R * 2,
          borderRadius: "50%",
          background: `radial-gradient(closest-side, rgba(${core}, ${c01(0.1 + 0.32 * level)}), rgba(${warm > 0.3 ? REEL.clay : REEL.sage}, ${c01(0.06 + 0.22 * level)}) 50%, transparent)`,
        }}
      />}
      {/* the rays (a burst, the logo) */}
      {rays > 0.02 && (
        <div
          style={{
            position: "absolute",
            left: x - r * 6,
            top: y - r * 6,
            width: r * 12,
            height: r * 12,
            borderRadius: "50%",
            background: `repeating-conic-gradient(from ${rot}deg, rgba(${core}, ${0.26 * rays}) 0deg 1.6deg, transparent 1.6deg 9deg)`,
            WebkitMaskImage: `radial-gradient(circle, transparent ${r * 0.9}px, #000 ${r * 1.2}px, rgba(0, 0, 0, 0.3) ${r * 2.4}px, transparent ${r * 4.2}px)`,
            maskImage: `radial-gradient(circle, transparent ${r * 0.9}px, #000 ${r * 1.2}px, rgba(0, 0, 0, 0.3) ${r * 2.4}px, transparent ${r * 4.2}px)`,
            filter: "blur(5px)",
            mixBlendMode: "screen",
          }}
        />
      )}
      {dots}
    </div>
  );
};

/** The rim light for the pebble's own SVG: a glow that hugs its silhouette (squash included), as a CSS filter. */
export const rimLight = (r: number, level: number, warmth = 0): string =>
  level > 0.02 ? `drop-shadow(0 0 ${r * (0.08 + 0.14 * level)}px rgba(${tintRgb(warmth * 0.7)}, ${c01(0.25 + 0.45 * level)}))` : "none";
