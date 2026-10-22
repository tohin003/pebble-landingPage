// Modified for the Pebble site.
// Source: Pebble v1.0.1, src/companionState.ts (Apache-2.0, Copyright 2026 Tohin Majumder). Kept: the pose table and
// its lookups (PoseId, Visual, POSES, the alias table, poseId, visualFor) and the tap duration TAP_MS. Left out: the
// reducer over host signals (reduce, pose, nextChange, fromEvent, seedSignals and their helpers) and its statusWords.ts
// import. The kept lines are unchanged apart from this header and the "Pebble site" notes.

export const TAP_MS = 1200; // row 16

export type PoseId =
  | "offline" | "uncertain" | "error" | "review" | "question" | "reconnecting" | "blocked"
  | "reading" | "searching" | "editing" | "testing" | "running" | "delegating" | "viewing" | "working"
  | "writing" | "loading" | "thinking" | "sending" | "paused" | "happy" | "stopped" | "notify"
  | "hover" | "tap" | "sleepy" | "idle";

export interface Visual {
  row: number;
  emotion: string;
  expression: string; // bloub expression id
  engine: "idle" | "alert" | "notify"; // bloub engine state
  cue: string; // avatarMotion cue
  hold: boolean; // may settle to a static frame after 8 s
}

// One row per pose. "row" is the §2.1 priority row (7.5 marks `sending`, the
// local fact that a message is on its way, shown until the host admits a run).
export const POSES: Record<PoseId, Visual> = {
  offline: { row: 1, emotion: "worried", expression: "triste", engine: "idle", cue: "", hold: true },
  uncertain: { row: 2, emotion: "concerned", expression: "mefiant", engine: "alert", cue: "", hold: true },
  error: { row: 3, emotion: "sad", expression: "triste", engine: "idle", cue: "sigh", hold: true },
  review: { row: 4, emotion: "asking", expression: "attentif", engine: "alert", cue: "", hold: true },
  question: { row: 5, emotion: "asking", expression: "curieux", engine: "notify", cue: "", hold: true },
  reconnecting: { row: 6, emotion: "patient", expression: "attentif", engine: "idle", cue: "orbit", hold: false },
  blocked: { row: 7, emotion: "stuck", expression: "confus", engine: "idle", cue: "", hold: true },
  sending: { row: 7.5, emotion: "attentive", expression: "attentif", engine: "idle", cue: "", hold: false },
  reading: { row: 8, emotion: "reading", expression: "attentif", engine: "idle", cue: "scan", hold: false },
  searching: { row: 8, emotion: "searching", expression: "curieux", engine: "idle", cue: "scan", hold: false },
  editing: { row: 8, emotion: "editing", expression: "fier", engine: "idle", cue: "spark", hold: false },
  testing: { row: 8, emotion: "testing", expression: "mefiant", engine: "idle", cue: "orbit", hold: false },
  running: { row: 8, emotion: "running", expression: "attentif", engine: "idle", cue: "orbit", hold: false },
  delegating: { row: 8, emotion: "delegating", expression: "curieux", engine: "idle", cue: "thought", hold: false },
  viewing: { row: 8, emotion: "viewing", expression: "fier", engine: "idle", cue: "spark", hold: false },
  working: { row: 8, emotion: "working", expression: "attentif", engine: "idle", cue: "thought", hold: false },
  writing: { row: 9, emotion: "writing", expression: "fier", engine: "idle", cue: "", hold: false },
  loading: { row: 11, emotion: "loading", expression: "attentif", engine: "idle", cue: "orbit", hold: false },
  thinking: { row: 10, emotion: "thinking", expression: "curieux", engine: "idle", cue: "thought", hold: false },
  paused: { row: 12, emotion: "resting", expression: "blase", engine: "idle", cue: "", hold: true },
  happy: { row: 13, emotion: "happy", expression: "heureux", engine: "idle", cue: "celebrate", hold: true },
  stopped: { row: 14, emotion: "neutral", expression: "blase", engine: "idle", cue: "", hold: true },
  notify: { row: 15, emotion: "neutral", expression: "neutre", engine: "notify", cue: "", hold: true },
  hover: { row: 16, emotion: "attentive", expression: "attentif", engine: "idle", cue: "", hold: true },
  tap: { row: 16, emotion: "happy", expression: "heureux", engine: "idle", cue: "", hold: true },
  sleepy: { row: 17, emotion: "resting", expression: "somnolent", engine: "idle", cue: "sleep", hold: true },
  idle: { row: 18, emotion: "neutral", expression: "neutre", engine: "idle", cue: "", hold: true },
};
// Older names still passed as an Avatar `state` (App.vue's booting avatar uses "loading").
// Pebble site: exported (the source keeps it module-private) so the cue checks can tell an alias from an unknown name.
export const ALIASES: Record<string, PoseId> = Object.assign(Object.create(null), {
  success: "happy", cancelled: "stopped", building: "editing", curious: "thinking", ready: "idle", unloaded: "idle",
});

export function poseId(name: unknown): PoseId {
  if (typeof name !== "string") return "idle";
  if (Object.prototype.hasOwnProperty.call(POSES, name)) return name as PoseId;
  return ALIASES[name] || "idle";
}
export function visualFor(name: unknown): Visual & { id: PoseId } {
  const pid = poseId(name);
  return { id: pid, ...POSES[pid] };
}
