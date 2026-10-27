// Slot labels (PLACEHOLDERS: every slot names the capture that fills it): which slots a plane draws, where each label
// is on a frame, and how opaque it is. The view (views/PieceView.tsx, views/StandInViews.tsx) and the checks
// (setpieces/qa.ts slotLabels, readableOn) read the same functions, so a label the checks pass is the label drawn.
//
// Fix round 2 (the verifier's NF-08): a label is whole or not drawn. It shows only while it sits wholly inside the
// frame the viewer sees (the aperture's open part in the Drop), LABEL_EDGE_PX from its edges, fading out over
// LABEL_FADE_FRAMES before it would reach an edge and in again once it is clear of them: a slot drifting across the
// frame's edge no longer shows a label cut mid-word ("n tab, at 1×" sat at the 9:16 receipt's left edge for 4 s). A
// view can also hand its label to a slot entering over it (TakeView.labelOut: the palette over the workspace), so two
// labels never stack.
// Pure; no React.
import { E_MOVE, clamp01 } from "../motion/ease";
import { planePose } from "../motion/camera";
import type { Rect } from "../motion/geometry";
import { apertureRect } from "../carrier/apertureMath";
import { rectInFrame } from "./frame";
import { slotLabelLayout, type SlotStandIn } from "./standins";
import { LABEL_HANDOFF_FRAMES, frameOfSource, sourceFrameAt, sourceTimecode } from "./take";
import type { PlaneSpec, ScenePlan, ShotSpec } from "./scene";

/** A slot as a plane draws it: the slot, its box in world units, its frames, and its caption's state and source time. */
export interface DrawnSlot {
  id: string;
  /** which slot of its plane: "self" (the plane's own slot, or its take view's) or "still:<i>" (a slot among its stills) */
  key: string;
  slot: SlotStandIn;
  box: Rect;
  /** the plane's parallax depth */
  depth: number;
  from: number;
  to: number;
  state: (fr: number) => string | undefined;
  timecode: (fr: number) => string | undefined;
  /** the local frame its label starts handing the frame's naming to a slot entering over it (NF-08) */
  labelOutFrom?: number;
  /** the local frame its label starts to show (TakeView.labelFrom) */
  labelInFrom?: number;
  /** a copy of a label (SlotStandIn.alsoAt): the slot's labels before it, which it gives way to while they show */
  earlier?: readonly DrawnSlot[];
}

/**
 * A slot's label and its copies (SlotStandIn.alsoAt): each copy is a drawn slot of its own, keyed "<key>@<i>", with the
 * copy's place as its focus, so it is whole or not drawn by the same rule and the checks see every label the view draws.
 */
export const withCopies = (d: DrawnSlot): DrawnSlot[] => {
  const out: DrawnSlot[] = [d];
  (d.slot.alsoAt ?? []).forEach((focus, i) => out.push({ ...d, id: `${d.id}@${i + 1}`, key: `${d.key}@${i + 1}`, slot: { ...d.slot, focus, alsoAt: undefined }, earlier: [...out] }));
  return out;
};

/** Every slot a shot's plane draws (a slot stand-in; a take view's own slot; a slot among a view's stills), each label copy its own. */
export const drawnSlots = (p: ScenePlan, s: ShotSpec, pl: PlaneSpec): DrawnSlot[] => drawnSlotsOnce(p, s, pl).flatMap(withCopies);

const drawnSlotsOnce = (p: ScenePlan, s: ShotSpec, pl: PlaneSpec): DrawnSlot[] => {
  const c = pl.content;
  const depth = pl.depth ?? 1;
  if (c.kind === "standIn") return c.standIn.kind === "slot" ? [{ id: pl.id, key: "self", slot: c.standIn, box: pl.rect, depth, from: s.from, to: s.to, state: () => undefined, timecode: () => undefined }] : [];
  if (c.kind !== "take" || c.use.manifest.pattern) return [];
  const u = c.use;
  const m = u.manifest;
  const v = m.views[c.view];
  if (!v) return [];
  const src = (fr: number) => Math.min(m.frames - 1, sourceFrameAt(fr, u.at, p.fps, m, u.inPoint));
  const state = (fr: number) => [...(v.slotStates ?? [])].reverse().find((x) => src(fr) >= x.from)?.label;
  const timecode = (fr: number) => sourceTimecode(src(fr), m.fps);
  const from = Math.max(s.from, u.at);
  const to = Math.min(s.to, u.until);
  const labelOutFrom = v.labelOut === undefined ? undefined : frameOfSource(v.labelOut, u.at, p.fps, m, u.inPoint);
  const labelInFrom = v.labelFrom === undefined ? undefined : frameOfSource(v.labelFrom, u.at, p.fps, m, u.inPoint);
  const out: DrawnSlot[] = v.slot ? [{ id: `${pl.id}:${v.slot.id}`, key: "self", slot: v.slot, box: pl.rect, depth, from, to, state, timecode, labelOutFrom, labelInFrom }] : [];
  const kx = pl.rect.w / v.w;
  const ky = pl.rect.h / v.h;
  (v.stills ?? []).forEach((vs, i) => {
    if (vs.standIn.kind !== "slot") return;
    const r = vs.rect ?? { x: 0, y: 0, w: v.w, h: v.h };
    const a = Math.max(from, frameOfSource(vs.from, u.at, p.fps, m, u.inPoint));
    const b = Math.min(to, vs.to === undefined ? Infinity : frameOfSource(vs.to, u.at, p.fps, m, u.inPoint));
    out.push({ id: `${pl.id}:${vs.standIn.id}${i ? `#${i}` : ""}`, key: `still:${i}`, slot: vs.standIn, box: { x: pl.rect.x + r.x * kx, y: pl.rect.y + r.y * ky, w: r.w * kx, h: r.h * ky }, depth, from: a, to: b, state, timecode });
  });
  return out;
};

/** The frame a viewer sees on a local frame of a shot: the aperture's open part (the Drop), else the whole frame. */
export const visibleFrameOn = (p: ScenePlan, s: ShotSpec, fr: number): Rect => (s.aperture ? apertureRect(p.frame.w, p.frame.h, s.aperture.open(fr), s.aperture.centerY) : { x: 0, y: 0, w: p.frame.w, h: p.frame.h });

/** Where a slot's label is on a local frame, frame px (at its plane's depth). */
export const labelRectOn = (p: ScenePlan, s: ShotSpec, d: DrawnSlot, fr: number): Rect => {
  const pose = planePose(s.camera.pose(fr - s.from), s.ref, d.depth);
  const L = slotLabelLayout(d.slot, d.box.w, d.box.h, pose.zoom, d.state(fr), d.timecode(fr)).rect;
  return rectInFrame({ x: d.box.x + L.x, y: d.box.y + L.y, w: L.w, h: L.h }, pose, p.frame);
};

/** The inset (px at 1080) a label keeps from the visible frame's edges; nearer, it fades out. */
export const LABEL_EDGE_PX = 12;
/** Frames (at 60 fps) a label takes to fade out before an edge, or in after it. */
export const LABEL_FADE_FRAMES = 10;

/** Is a slot's label wholly inside the visible frame, inset by LABEL_EDGE_PX, on a local frame? */
export const labelClear = (p: ScenePlan, s: ShotSpec, d: DrawnSlot, fr: number): boolean => {
  const r = labelRectOn(p, s, d, fr);
  const v = visibleFrameOn(p, s, fr);
  const m = LABEL_EDGE_PX * p.frame.unit;
  return r.x >= v.x + m && r.y >= v.y + m && r.x + r.w <= v.x + v.w - m && r.y + r.h <= v.y + v.h - m;
};

/**
 * A slot's label's opacity on a local frame: 0 outside the slot's frames; it fades over LABEL_FADE_FRAMES out before it
 * would leave the clear part of the frame and in after it enters it (frames outside the slot's own are not edges: a
 * label already clear on a cut shows at once); and it hands off to a slot entering over it.
 */
export const labelOpacityOn = (p: ScenePlan, s: ShotSpec, d: DrawnSlot, fr: number): number => {
  if (fr < d.from || fr >= d.to) return 0;
  const N = Math.max(1, Math.round((LABEL_FADE_FRAMES * p.fps) / 60));
  const clear = (f: number) => f < Math.max(d.from, s.from) || f >= Math.min(d.to, s.to) || labelClear(p, s, d, f);
  if (!clear(fr)) return 0;
  let ahead = N;
  for (let k = 1; k <= N; k++)
    if (!clear(fr + k)) {
      ahead = k;
      break;
    }
  let behind = N;
  for (let k = 1; k <= N; k++)
    if (!clear(fr - k)) {
      behind = k;
      break;
    }
  const edge = Math.min(1, ahead / N, behind / N);
  const H = Math.max(1, Math.round((LABEL_HANDOFF_FRAMES * p.fps) / 60));
  const handoff = d.labelOutFrom === undefined ? 1 : 1 - E_MOVE(clamp01((fr - d.labelOutFrom) / H));
  const arrive = d.labelInFrom === undefined ? 1 : E_MOVE(clamp01((fr - d.labelInFrom) / H));
  // a copy shows only where the slot's earlier labels do not: one label of a slot at a time, handing over as one
  // leaves the frame's clear part and the other enters it
  const yieldTo = d.earlier?.length ? 1 - Math.max(...d.earlier.map((e) => labelOpacityOn(p, s, e, fr))) : 1;
  return edge * handoff * arrive * yieldTo;
};
