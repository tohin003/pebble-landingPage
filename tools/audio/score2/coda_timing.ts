// score2 lane, revision 3 (OVERRIDES §65): the post-credit scene's sound timing, read from the coda's own plan at
// build time, never typed in. The coda lane owns the plan (video/src/film2/setpieces/coda.ts: extra.timing and
// extra.coda.sound, through the demo reel's plans, setpieces/demo/plans.ts); this file only reads it.
//
//   bun tools/audio/score2/coda_timing.ts .work/score2/cuesheet/plan_main.json OUT.json
//
// OUT.json: the coda's local frames (L0 = the end card's true ending; the bed under [0, end), the tap's peak on
// L-C2's landing) in all three aspects, whether they agree (one timeline, setpieces/align.ts), and the same frames on
// the film's timeline from the cue plan's coda.L0_frame. Light work, as setpieces/tools/check-setpieces.ts: it plans the
// demo reel in memory; nothing is rendered and no audio is touched.
import { readFileSync, writeFileSync } from "node:fs";
import { CODA_SOUND, codaOf, codaOneShots, type CodaTiming } from "../../../video/src/film2/setpieces/coda";
import { demoPlans } from "../../../video/src/film2/setpieces/demo/plans";

const [planPath, outPath] = process.argv.slice(2);
if (!planPath || !outPath) throw new Error("usage: bun tools/audio/score2/coda_timing.ts PLAN_MAIN.json OUT.json");
const plan = JSON.parse(readFileSync(planPath, "utf8")) as { coda?: { L0_frame: number; L0_film_s: number }; end_film_s: number };
if (!plan.coda) throw new Error(`${planPath} has no coda span (a revision 3 plan names the coda's L0)`);
const L0 = plan.coda.L0_frame;
const ASPECTS = ["16:9", "1:1", "9:16"] as const;

const per: Record<string, { duration: number; fps: number; timing: CodaTiming; builtBy: string | null; layers: unknown[] }> = {};
for (const a of ASPECTS) {
  const e = demoPlans(a).find((x) => codaOf(x.plan));
  if (!e) throw new Error(`the ${a} reel has no coda`);
  const x = codaOf(e.plan)!;
  per[a] = { duration: e.plan.duration, fps: e.plan.fps, timing: e.plan.extra!.timing as CodaTiming, builtBy: x.sound.builtBy, layers: [...x.sound.layers] };
}
const ref = per["16:9"]!;
const fps = ref.fps;
const shots = (ref.layers as { kind: string; at?: number; from?: number; to?: number; take: string; licence: string; lufs: number }[]);
const tap = shots.filter((l) => l.kind === "oneShot");
const beds = shots.filter((l) => l.kind === "bed");
const same = ASPECTS.every((a) => JSON.stringify([per[a]!.duration, per[a]!.fps, per[a]!.timing, per[a]!.layers]) === JSON.stringify([ref.duration, ref.fps, ref.timing, ref.layers]));
const git = (args: string[]) => new TextDecoder().decode(Bun.spawnSync(["/usr/bin/git", ...args]).stdout).trim();
const end = ref.timing.end;
const tapAt = tap[0]?.at ?? null;
const out = {
  read_at: new Date().toISOString(),
  source: "video/src/film2/setpieces/coda.ts (planCoda: extra.timing, extra.coda.sound) through setpieces/demo/plans.ts",
  git_head: git(["rev-parse", "HEAD"]),
  coda_ts_uncommitted: git(["status", "--porcelain", "--", "video/src/film2/setpieces/coda.ts"]) || null,
  fps,
  aspects_agree: same,
  duration: ref.duration,
  timing: ref.timing,
  line2: ref.timing.line2,
  end,
  builtBy: ref.builtBy,
  CODA_SOUND,
  one_shots: tap,
  beds,
  bed_covers_every_frame: beds.some((b) => (b.from ?? 0) <= 0 && (b.to ?? 0) >= ref.duration),
  tap_on_line2: tapAt !== null && Math.abs(tapAt - ref.timing.line2) <= 1,
  L0_frame: L0,
  L0_film_s: L0 / fps,
  tap_local: tapAt,
  tap_frame: tapAt === null ? null : L0 + tapAt,
  tap_film_s: tapAt === null ? null : (L0 + tapAt) / fps,
  end_frame: L0 + end,
  end_film_s: (L0 + end) / fps,
  per_aspect: per,
};
if (fps !== 60) throw new Error(`the coda plans at ${fps} fps; the cue plan's frames are at 60`);
if (!same) throw new Error("the coda's timing differs across the aspects: its one timeline (setpieces/align.ts) is broken; the lead and the coda lane decide");
if (tap.length !== 1) throw new Error(`the coda plans ${tap.length} one-shots, not one (OVERRIDES §65)`);
writeFileSync(outPath, JSON.stringify(out, null, 1) + "\n");
console.log(JSON.stringify({ L0, line2: ref.timing.line2, end, duration: ref.duration, tap_frame: out.tap_frame, end_frame: out.end_frame, tap_film_s: out.tap_film_s, end_film_s: out.end_film_s, builtBy: ref.builtBy, aspects_agree: same }));
