// The master's sound lane (EDIT_PLAN "Sound map"; TREATMENT rulings v1.1 "Sound sync"). Pure data: every cue is placed
// by its PEAK on the picture's contact frame, one 120th of a second late at most, and its file starts that much earlier
// (the kit's measured peak offsets, video/public/launch/audio/sfx/kit.json). Levels start from the kit's mix hints.
//
// Sources, in order:
//   1. the scene groups' own suggestions, retimed to their slots (A_SFX; s06Sfx, s07Sfx, s10Sfx while group D doesn't
//      place them itself; S02's click and Return from its exported moments);
//   2. the seams' whooshes (master/timeline.ts);
//   3. the master's own accents (the drop, the payoff's first chart).
// Group C places its SFX inside its scenes (Sfx in S04/S05): they are listed here for the density count only. The
// music-only variant (final.sh --music-only) muxes the bare music under the picture, so it has none of them.
import { ALL_SCENES } from "../scenes/Previews";
import { A_SFX } from "../scenes/a";
import { C_SFX } from "../scenes/c";
import { PLACE_SFX as D_PLACES_SFX } from "../scenes/d/common";
import { s06Sfx } from "../scenes/d/S06Memory";
import { s07Sfx } from "../scenes/d/S07ContextWarping";
import { s10Sfx, S10_MARKS } from "../scenes/d/S10Benchmarks";
import { s02Moments } from "../scenes/b/S02OnYourMac";
import { S03_SFX } from "../scenes/b/S03UsesYourMac";
import { S09_SFX } from "../scenes/b/S09Stealth";
import { FILM_FPS, SEAMS, TIMELINE } from "./timeline";

export const SFX_DIR = "launch/audio/sfx/";

/** The kit's "ready" files (no hand-download alternates): peak offset (s) and starting level (dB, from mix_hint − lufs_m_max). */
export const KIT = {
  "sfx-whoosh-short.wav": { peak: 0.2809, db: -13.2 },
  "sfx-whoosh-short-b.wav": { peak: 0.2401, db: -12.4 },
  "sfx-whoosh-medium.wav": { peak: 0.3575, db: -13.1 },
  "sfx-whoosh-medium-b.wav": { peak: 0.351, db: -13.2 },
  "sfx-whoosh-long.wav": { peak: 1.1257, db: -14.2 },
  "sfx-click-soft-a.wav": { peak: 0.0022, db: -7.4 },
  "sfx-click-soft-b.wav": { peak: 0.0005, db: -3.9 },
  "sfx-key-tap-a.wav": { peak: 0.001, db: -7.0 },
  "sfx-key-tap-b.wav": { peak: 0.001, db: -7.9 },
  "sfx-key-tap-c.wav": { peak: 0.002, db: -8.9 },
  "sfx-pop-soft.wav": { peak: 0.0005, db: -5.8 },
  "sfx-pop-soft-b.wav": { peak: 0.0006, db: -6.6 },
  "sfx-tick.wav": { peak: 0.0006, db: -8.6 },
  "sfx-tick-b.wav": { peak: 0.0006, db: -6.5 },
  "sfx-impact-low.wav": { peak: 0.0039, db: -1.8 },
  "sfx-shimmer.wav": { peak: 0.0007, db: -21.3 },
  "sfx-shimmer-b.wav": { peak: 1.4196, db: -16.7 },
  "sfx-riser.wav": { peak: 2.5149, db: -14.1 },
  "sfx-swell-soft.wav": { peak: 1.5715, db: -18.2 },
  "sfx-swell-soft-b.wav": { peak: 1.8476, db: -19.9 },
} as const;
export type KitFile = keyof typeof KIT;

export type Role = "whoosh-short" | "whoosh-medium" | "click" | "key" | "pop" | "tick" | "impact" | "thud" | "shimmer" | "riser" | "swell";

/** Each role's takes, rotated in order of use, and its trim against the kit level (dB). */
const ROLES: Record<Role, { takes: KitFile[]; trim: number; rates?: number[] }> = {
  "whoosh-short": { takes: ["sfx-whoosh-short.wav", "sfx-whoosh-short-b.wav"], trim: 0 },
  "whoosh-medium": { takes: ["sfx-whoosh-medium.wav", "sfx-whoosh-medium-b.wav"], trim: 0 },
  click: { takes: ["sfx-click-soft-a.wav", "sfx-click-soft-b.wav"], trim: 0 },
  key: { takes: ["sfx-key-tap-a.wav", "sfx-key-tap-b.wav", "sfx-key-tap-c.wav"], trim: 0 },
  pop: { takes: ["sfx-pop-soft.wav", "sfx-pop-soft-b.wav"], trim: 0 },
  tick: { takes: ["sfx-tick.wav", "sfx-tick-b.wav"], trim: -2 },
  impact: { takes: ["sfx-impact-low.wav"], trim: 0, rates: [1, 0.94] },
  // a soft thud: the low impact, well under its full level, pitched a touch up so it reads small
  thud: { takes: ["sfx-impact-low.wav"], trim: -11, rates: [1.06, 1.0, 1.12] },
  shimmer: { takes: ["sfx-shimmer.wav", "sfx-shimmer-b.wav"], trim: 0 },
  riser: { takes: ["sfx-riser.wav"], trim: 0 },
  swell: { takes: ["sfx-swell-soft.wav", "sfx-swell-soft-b.wav"], trim: 0 },
};

/** The SFX bus against the kit's hints: the edit's music sits at −16 LUFS integrated, about 2 dB over the hints' −18. */
export const SFX_BUS_DB = 2;

export interface Cue {
  /** seconds on the master where the effect's peak lands (the contact frame) */
  peak: number;
  role: Role;
  /** extra dB on top of the role's level */
  trim?: number;
  scene: string;
  what: string;
  /** placed by a scene itself (group C): listed, never played by the master */
  sceneOwned?: boolean;
}

export interface PlacedCue extends Cue {
  file: KitFile;
  /** the file's start on the master, s */
  at: number;
  db: number;
  rate: number;
}

const slotOf = (id: string) => TIMELINE.find((s) => s.id === id);
const nominalOf = (id: string) => ALL_SCENES.find((s) => s.id === id)?.nominalS;
/** a scene's retime factor on its slot (its own clocks: useClock's k = D / nominal) */
const kOf = (id: string, clamp = false) => {
  const s = slotOf(id);
  const n = nominalOf(id);
  if (!s || !n) return 1;
  const k = (s.out - s.in) / n;
  return clamp ? Math.max(0.8, Math.min(1.25, k)) : k;
};

const sceneIdOf = (short: string) => TIMELINE.find((s) => s.id.startsWith(`${short}-`))?.id ?? short;

/** A's suggestion kinds → roles (scenes/a: SfxSuggestion.kind is free text). */
const rolesForKind = (kind: string): { role: Role; trim?: number }[] => {
  const k = kind.toLowerCase();
  // the drop: the impact alone (the riser and the music's own drop carry the rest; a whoosh there was clutter)
  if (k.startsWith("low impact + short whoosh")) return [{ role: "impact" }];
  if (k.includes("riser")) return [{ role: "riser" }];
  if (k.includes("thud")) return [{ role: "thud" }];
  if (k.includes("pop")) return [{ role: "pop" }];
  if (k.includes("shimmer")) return [{ role: "shimmer", trim: k.includes("quiet") ? -4 : 0 }];
  if (k.includes("whoosh (medium)")) return [{ role: "whoosh-medium" }];
  if (k.includes("whoosh")) return [{ role: "whoosh-short" }];
  if (k.includes("swell")) return [{ role: "swell" }];
  return [];
};

/** Group A: its suggestions are at nominal seconds; ones in a scene's last half second are anchored to its end. */
const groupA = (): Cue[] =>
  A_SFX.flatMap((c) => {
    const id = sceneIdOf(c.scene);
    const slot = slotOf(id);
    const n = nominalOf(id);
    if (!slot || !n) return [];
    let local = c.s * kOf(id);
    if (n - c.s <= 0.5) local = slot.out - slot.in - (n - c.s);
    let peak = slot.in + local;
    const roles = rolesForKind(c.kind);
    // the riser rises INTO the drop: its peak meets S01's first frame, not the suggestion's start
    if (roles[0]?.role === "riser") peak = slotOf("S01-Title")?.in ?? peak;
    return roles.map((r) => ({ peak, role: r.role, trim: r.trim, scene: id, what: `${c.kind}: ${c.note}` }));
  });

/** Group C: placed inside its scenes (listed for the count). */
const groupC = (): Cue[] =>
  C_SFX.map((c) => {
    const id = sceneIdOf(c.scene);
    const slot = slotOf(id);
    const role: Role = c.file.includes("click") ? "click" : c.file.includes("shimmer") ? "shimmer" : c.file.includes("tick") ? "tick" : "pop";
    return { peak: (slot?.in ?? 0) + c.s * kOf(id) + 1 / 120, role, scene: id, what: c.note, sceneOwned: true };
  });

/** Group D: cue lists in the kit's files, `at` meant as the peak; mapped onto roles (so the master rotates the takes). */
const roleOfFile = (src: string): Role | null => {
  const f = src.split("/").pop() ?? "";
  if (f.includes("tick")) return "tick";
  if (f.includes("click")) return "click";
  if (f.includes("key-tap")) return "key";
  if (f.includes("impact") || f.includes("thud")) return "thud";
  if (f.includes("whoosh-medium")) return "whoosh-medium";
  if (f.includes("whoosh")) return "whoosh-short";
  if (f.includes("shimmer")) return "shimmer";
  if (f.includes("swell")) return "swell";
  if (f.includes("pop")) return "pop";
  if (f.includes("riser")) return "riser";
  return null;
};
const groupD = (): Cue[] => {
  if (D_PLACES_SFX) return [];
  const lists: [string, (k: number) => { src: string; at: number }[]][] = [
    ["S06-Memory", s06Sfx],
    ["S07-ContextWarping", s07Sfx],
    ["S10-Benchmarks", s10Sfx],
  ];
  return lists.flatMap(([id, fn]) => {
    const slot = slotOf(id);
    if (!slot) return [];
    return fn(kOf(id, true)).flatMap((c) => {
      const role = roleOfFile(c.src);
      return role ? [{ peak: slot.in + c.at, role, scene: id, what: c.src.split("/").pop() ?? "" }] : [];
    });
  });
};

/** Group B places its SFX inside its scenes (S02's click, S03_SFX, S09_SFX): listed for the count only. */
const groupB = (): Cue[] => {
  const out: Cue[] = [];
  const s02 = slotOf("S02-OnYourMac");
  if (s02 && ALL_SCENES.some((s) => s.id === s02.id))
    out.push({ peak: s02.in + s02Moments(s02.out - s02.in).click, role: "click", scene: s02.id, what: "the pointer clicks the pebble (RS15-01)", sceneOwned: true });
  const lists: [string, typeof S03_SFX][] = [
    ["S03-UsesYourMac", S03_SFX],
    ["S09-Stealth", S09_SFX],
  ];
  for (const [id, fn] of lists) {
    const slot = slotOf(id);
    if (!slot || !ALL_SCENES.some((s) => s.id === id)) continue;
    for (const c of fn(slot.out - slot.in)) {
      const role = roleOfFile(`sfx-${c.name.replace(/^key[ABC]$/, "key-tap").replace(/B$/, "")}`) ?? "click";
      out.push({ peak: slot.in + c.s, role, scene: id, what: c.what, sceneOwned: true });
    }
  }
  return out;
};

const seams = (): Cue[] =>
  SEAMS.flatMap((seam, i) => {
    if (!seam.whoosh) return [];
    const at = TIMELINE[i].out;
    // the whoosh's peak meets the moment the picture moves fastest: the seam's middle (a cut's own frame)
    const mid = at + (seam.post - seam.pre) / 2;
    return [{ peak: mid, role: seam.whoosh === "short" ? "whoosh-short" : "whoosh-medium", trim: -2, scene: seam.from, what: `seam: ${seam.kind} → ${TIMELINE[i + 1].id}` } as Cue];
  });

/** The master's own accents. */
const accents = (): Cue[] => {
  const s10 = slotOf("S10-Benchmarks");
  const card1 = S10_MARKS.find((m) => m.name.startsWith("card 1"));
  const out: Cue[] = [];
  if (s10 && card1) out.push({ peak: s10.in + card1.s * kOf(s10.id, true), role: "impact", trim: -3, scene: s10.id, what: "the payoff: the first chart lands" });
  return out;
};

/**
 * The master's own thinning (the craft rule: about 8–15 effects per 30 s). Within one scene, a cue of a role closer
 * than its gap to the last one kept is dropped: six slab thuds on six beats become two, four seal clicks become one.
 * Scene-owned cues (groups B and C) are never touched here: notes for their builders go in the report.
 */
const GAP: Partial<Record<Role, number>> = { click: 0.3, shimmer: 1.0, "whoosh-short": 0.3, "whoosh-medium": 0.3, pop: 0.3 };
/** per scene: S06's slab thuds on every third beat (1, 4), S07's seals as one click (the whoosh carries the warp) */
const GAP_SCENE: Record<string, Partial<Record<Role, number>>> = { "S06-Memory": { thud: 1.4 }, "S07-ContextWarping": { click: 10 } };
const thin = (cues: Cue[]): Cue[] => {
  const last = new Map<string, number>();
  return cues.filter((c) => {
    const gap = GAP_SCENE[c.scene]?.[c.role] ?? GAP[c.role];
    if (c.sceneOwned || gap === undefined) return true;
    const key = `${c.scene}|${c.role}`;
    const prev = last.get(key);
    if (prev !== undefined && c.peak - prev < gap - 1e-6) return false;
    last.set(key, c.peak);
    return true;
  });
};

/** Ticks closer than 3 frames to the one before are dropped (the count-ups' rate limit), across every source. */
const rateLimitTicks = (cues: Cue[]): Cue[] => {
  let last = -Infinity;
  return cues.filter((c) => {
    if (c.role !== "tick") return true;
    if (c.peak - last < 3 / FILM_FPS - 1e-6) return false;
    last = c.peak;
    return true;
  });
};

/** Every cue on the master, sorted, with its file (takes rotated per role), start and level. */
export const masterCues = (): PlacedCue[] => {
  const all = thin(rateLimitTicks([...groupA(), ...groupB(), ...groupC(), ...groupD(), ...seams(), ...accents()].sort((a, b) => a.peak - b.peak)));
  const used: Partial<Record<Role, number>> = {};
  return all.map((c) => {
    const r = ROLES[c.role];
    const n = used[c.role] ?? 0;
    used[c.role] = n + 1;
    const file = r.takes[n % r.takes.length];
    const rate = r.rates ? r.rates[n % r.rates.length] : 1;
    const late = 1 / 120; // half a frame late at 60 fps: the peak lands on the contact frame or just after
    return { ...c, file, rate, at: c.peak + late - KIT[file].peak / rate, db: KIT[file].db + r.trim + (c.trim ?? 0) + SFX_BUS_DB };
  });
};

/** The music's ducks: 2.5 dB for ~0.25 s under every full impact (kit.json's mix hint). */
export const ducks = (cues: readonly PlacedCue[]): { at: number; db: number; len: number }[] =>
  cues.filter((c) => c.role === "impact").map((c) => ({ at: c.peak, db: -2.5, len: 0.25 }));

/**
 * Effects per 30 s window (the craft rule: about 8–15). Cues closer than 0.3 s to the one before join its cluster and
 * count once (a count-up's ticks, a run of key taps, a whoosh on an impact): what the ear takes as one event.
 */
export const density = (cues: readonly Cue[], window = 30): { from: number; to: number; count: number }[] => {
  const events: number[] = [];
  let prev = -Infinity;
  for (const c of [...cues].sort((a, b) => a.peak - b.peak)) {
    if (c.peak - prev > 0.3) events.push(c.peak);
    prev = c.peak;
  }
  const out = [];
  for (let from = 0; from < 100; from += window / 2) {
    const to = Math.min(100, from + window);
    out.push({ from, to, count: events.filter((t) => t >= from && t < to).length });
    if (to >= 100) break;
  }
  return out;
};
