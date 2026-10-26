// One timeline for all three aspects (TREATMENT §3.12: "one timeline and one score for all three aspects; each aspect
// has its own framing"). A piece's framing can move a timed event in one aspect (a line waits longer for a ring to
// clear it; a reading takes longer to reach), so the edit lane plans every aspect, takes the latest frame of each timed
// event, and plans them again with those frames as minimums: every aspect then cuts, lands and ends on the same frames.
// Pure.
import type { Aspect } from "../tokens";
import type { ScenePlan } from "./scene";

export const ASPECTS: readonly Aspect[] = ["16:9", "1:1", "9:16"];

/** The timed events a plan exposes for alignment (plan.extra.timing). */
export const timingOf = (p: ScenePlan): Record<string, number> => ((p.extra?.timing as Record<string, number> | undefined) ?? {});

/**
 * Plans a piece in every aspect with one timeline. `make(aspect, align)` plans one aspect; `align` holds the minimum
 * frame of each timed event. Repeats until no event moves (an aligned event can push a later one), at most 4 rounds.
 */
export function alignAspects<A = Record<string, number>>(make: (aspect: Aspect, align?: Partial<A>) => ScenePlan): Record<Aspect, ScenePlan> {
  let plans = ASPECTS.map((a) => make(a));
  for (let round = 0; round < 4; round++) {
    const latest: Record<string, number> = {};
    for (const p of plans) for (const [k, v] of Object.entries(timingOf(p))) latest[k] = Math.max(latest[k] ?? -Infinity, v);
    const next = ASPECTS.map((a) => make(a, latest as unknown as Partial<A>));
    const same = next.every((p) => Object.entries(latest).every(([k, v]) => timingOf(p)[k] === v));
    plans = next;
    if (same) break;
  }
  return { "16:9": plans[0]!, "1:1": plans[1]!, "9:16": plans[2]! };
}

/** Differences between aspects in what must be shared: duration, seams, takes and every music event. */
export function timelineDiffs(plans: Record<Aspect, ScenePlan>): string[] {
  const out: string[] = [];
  const ref = plans["16:9"];
  const key = (p: ScenePlan) => ({
    duration: p.duration,
    seams: p.seams.map((s) => `${s.at}+${s.frames}`).join(","),
    takes: p.takes.map((u) => `${u.manifest.id}@${u.at}:${u.inPoint}-${u.until}`).join(","),
    music: p.music.map((m) => `${m.event}@${m.frame}`).join(","),
    timing: JSON.stringify(timingOf(p)),
  });
  const k0 = key(ref);
  for (const a of ASPECTS) {
    const k = key(plans[a]);
    for (const f of Object.keys(k0) as (keyof typeof k0)[]) if (k[f] !== k0[f]) out.push(`${ref.id} ${a}: ${f} differs from 16:9 (${k[f]} vs ${k0[f]})`);
  }
  return out;
}
