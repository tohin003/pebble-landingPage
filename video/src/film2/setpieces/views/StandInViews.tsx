// Drawing the set pieces' PLACEHOLDERS (setpieces/standins.ts, setpieces/take.ts): published stills, labelled slots,
// and takes at 1×. Nothing here draws Pebble's interface: a still is a real capture of a published release (cropped,
// never stretched); a slot is a hatched panel that names the capture which fills it, and shows the take's source time
// ticking at 1× so the edit lane can see where a take's in-point sits.
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLOR, FAMILY } from "../../tokens";
import { askCardLook } from "../../transitions/entrances";
import { SLOT_CAPTION, shownSize, slotLabelLayout, type SlotStandIn, type StandIn } from "../standins";
import { sourceFrameAt, sourceTimecode, stillsAt, takeFramePath, type TakeUse, type ViewStill } from "../take";

/** A published still, cropped, filling a w × h box at a uniform scale (the box keeps the crop's aspect). */
export const StillImage: React.FC<{ standIn: Extract<StandIn, { kind: "still" }>; w: number; h: number }> = ({ standIn, w, h }) => {
  const c = standIn.crop ?? { x: 0, y: 0, w: standIn.w, h: standIn.h };
  const k = Math.min(w / c.w, h / c.h);
  return (
    <div style={{ position: "absolute", left: (w - c.w * k) / 2, top: (h - c.h * k) / 2, width: c.w * k, height: c.h * k, overflow: "hidden" }}>
      <Img src={staticFile(standIn.src)} style={{ position: "absolute", left: -c.x * k, top: -c.y * k, width: standIn.w * k, height: standIn.h * k, maxWidth: "none", display: "block" }} />
    </div>
  );
};

/**
 * A slot: what the 2.0.0 capture will show here, named, on a hatched panel. Sizes are world units; `px` is the frame
 * px per world unit, so the label stays legible whatever the camera does (and stays small: it is a slate, not a line).
 * The label sits at the slot's `focus` (where the shot looks: the menu bar's status icons, a card inside a window),
 * and a take view's `state` names what the take shows at that moment (a placeholder's caption, never drawn UI).
 */
export const SlotPanel: React.FC<{ slot: SlotStandIn; w: number; h: number; px: number; timecode?: string; state?: string; labelOpacity?: number; copyOpacity?: (i: number) => number }> = ({ slot, w, h, px, timecode, state, labelOpacity = 1, copyOpacity = () => 1 }) => {
  const u = 1 / Math.max(0.05, px); // world units per frame px
  // (the stops are not rounded: rounded to 0.01 of a world unit, the period stepped every 15–17 frames of a slow push
  // and the far stripes jumped by up to 2 px at once, a whole-frame step of 2.2–2.8 levels on the 1:1 reel)
  const hatch = `repeating-linear-gradient(135deg, ${COLOR.line} 0px, ${COLOR.line} ${(1.2 * u).toFixed(5)}px, transparent ${(1.2 * u).toFixed(5)}px, transparent ${(14 * u).toFixed(5)}px)`;
  // the label at the slot's focus, and its copies (alsoAt: each whole or not drawn, as labels.ts has it)
  const labels = [slot, ...(slot.alsoAt ?? []).map((focus) => ({ ...slot, focus, alsoAt: undefined }))];
  return (
    <div style={{ position: "absolute", inset: 0, background: `${hatch}, ${COLOR.fill}`, border: `${(1.5 * u).toFixed(2)}px solid ${COLOR.line}`, boxSizing: "border-box", overflow: "hidden" }}>
      {labels.map((at, i) => (
        <SlotLabel key={i} slot={at} w={w} h={h} px={px} timecode={timecode} state={state} opacity={i === 0 ? labelOpacity : copyOpacity(i)} />
      ))}
    </div>
  );
};

/** One slot label at its slot's focus, its size and corner as the checks read them (standins.ts slotLabelLayout). */
const SlotLabel: React.FC<{ slot: SlotStandIn; w: number; h: number; px: number; timecode?: string; state?: string; opacity: number }> = ({ slot, w, h, px, timecode, state, opacity }) => {
  const { fs, left, top } = slotLabelLayout(slot, w, h, px, state, timecode);
  if (opacity <= 0.001) return null;
  return (
    <div style={{ position: "absolute", left, top, right: fs * 0.9, fontFamily: `"${FAMILY.mono}"`, fontSize: fs, color: COLOR.ink2, lineHeight: 1.35, opacity }}>
      <div style={{ fontWeight: 500, color: COLOR.ink }}>{slot.captureId}</div>
      <div style={{ fontFamily: `"${FAMILY.sans}"`, fontSize: fs * 0.92 }}>{slot.label}</div>
      {state ? <div style={{ fontFamily: `"${FAMILY.sans}"`, fontSize: fs * 0.92, color: COLOR.ink }}>{state}</div> : null}
      <div style={{ fontSize: fs * 0.78, opacity: 0.85, marginTop: fs * 0.3 }}>{SLOT_CAPTION}</div>
      {timecode ? <div style={{ fontSize: fs * 0.9, marginTop: fs * 0.3, color: COLOR.accent }}>src {timecode} · 1×</div> : null}
    </div>
  );
};

export const StandInView: React.FC<{ standIn: StandIn; w: number; h: number; px: number; labelOpacity?: number; copyOpacity?: (i: number) => number }> = ({ standIn, w, h, px, labelOpacity, copyOpacity }) =>
  standIn.kind === "still" ? <StillImage standIn={standIn} w={w} h={h} /> : <SlotPanel slot={standIn} w={w} h={h} px={px} labelOpacity={labelOpacity} copyOpacity={copyOpacity} />;

/**
 * The card entrance on a still inside a view (rise 24 px and an 8 px blur clearing over 24 frames on E-arrive, the
 * opacity on E-move over the first 10: transitions/entrances.tsx askCardLook), in view units.
 */
const entranceStyle = (frameSinceFrom: number, fps: number, px: number): React.CSSProperties | null => {
  const l = askCardLook(frameSinceFrom, 0, fps);
  if (l.dy < 0.01 && l.blur < 0.01 && l.opacity >= 1) return {};
  const k = 1 / Math.max(0.05, px);
  return { opacity: l.opacity, transform: `translateY(${(l.dy * k).toFixed(2)}px)`, filter: `blur(${(l.blur * k).toFixed(2)}px)` };
};

/**
 * One view of a take, at 1×: the real frame sequence (cropped to the view) when the take has one; otherwise its
 * placeholder stills and slot. `px`: frame px per world unit (for the slot's label and the entrance's rise).
 */
export const TakeViewContent: React.FC<{ use: TakeUse; view: string; w: number; h: number; px: number; offset?: number; planeEntrance?: boolean; labelOpacity?: (key: string) => number }> = ({ use, view, w, h, px, offset = 0, planeEntrance = false, labelOpacity = () => 1 }) => {
  const frame = useCurrentFrame() + offset;
  const { fps } = useVideoConfig();
  const m = use.manifest;
  const v = m.views[view];
  if (!v) throw new Error(`take ${m.id} has no view "${view}"`);
  if (frame < use.at) return null;
  const src = Math.min(m.frames - 1, sourceFrameAt(frame, use.at, fps, m, use.inPoint));
  if (m.pattern) {
    // a real take: the view is a crop of the recording's frame, at a uniform scale
    const c = v.crop ?? { x: 0, y: 0, w: m.w, h: m.h };
    const k = w / c.w;
    return <Img src={staticFile(takeFramePath(m, src))} style={{ position: "absolute", left: -c.x * k, top: -c.y * k, width: m.w * k, height: m.h * k, maxWidth: "none" }} />;
  }
  const kx = w / v.w;
  const ky = h / v.h;
  const state = [...(v.slotStates ?? [])].reverse().find((x) => src >= x.from)?.label;
  // (each label's opacity is the plan's: whole or not drawn near the frame's edge, handed to a slot entering over it:
  // setpieces/labels.ts, NF-08)
  return (
    <>
      {v.slot ? <SlotPanel slot={v.slot} w={w} h={h} px={px} timecode={sourceTimecode(src, m.fps)} state={state} labelOpacity={labelOpacity("self")} copyOpacity={(i) => labelOpacity(`self@${i}`)} /> : null}
      {stillsAt(v, src).map((s: ViewStill, i) => {
        const r = s.rect ?? { x: 0, y: 0, w: v.w, h: v.h };
        // the frame on which this still first showed, for its entrance; a still with no entrance switches in with a
        // hard cut on its source frame, as a recording's own change does (CR-18: placeholder states never dissolve)
        // (when the plane itself arrives with its one still, PlaneView draws the entrance, shadow and all)
        const since = s.entrance ? Math.floor(((src - s.from) * fps) / m.fps) : Infinity;
        const look = s.entrance && !planeEntrance ? entranceStyle(since, fps, px) : {};
        if (look === null) return null;
        return (
          <div key={i} style={{ position: "absolute", left: r.x * kx, top: r.y * ky, width: r.w * kx, height: r.h * ky, ...look }}>
            {s.standIn.kind === "still" ? <StillImage standIn={s.standIn} w={r.w * kx} h={r.h * ky} /> : <SlotPanel slot={s.standIn} w={r.w * kx} h={r.h * ky} px={px} timecode={sourceTimecode(src, m.fps)} state={state} labelOpacity={labelOpacity(`still:${(v.stills ?? []).indexOf(s)}`)} copyOpacity={(i) => labelOpacity(`still:${(v.stills ?? []).indexOf(s)}@${i}`)} />}
          </div>
        );
      })}
    </>
  );
};

/** A published image at a uniform scale (the companion's panel, a wall cell). */
export const ImageContent: React.FC<{ src: string; w: number; h: number }> = ({ src, w, h }) => <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 0, width: w, height: h, maxWidth: "none" }} />;

/** The set pieces' slate: on every frame of the demo, that the UI is a placeholder. Internal reels only; never in a film. */
export const SetPiecesSlate: React.FC<{ piece: string }> = ({ piece }) => {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  return (
    <div style={{ position: "absolute", right: 16 * u, bottom: 12 * u, padding: `${3 * u}px ${8 * u}px`, background: "rgba(248, 249, 246, 0.82)", fontFamily: `"${FAMILY.mono}"`, fontSize: 15 * u, color: COLOR.ink2, textAlign: "right", pointerEvents: "none" }}>
      F2 set pieces · {piece} · placeholder UI: published Pebble releases, and slots for the 2.0.0 captures
    </div>
  );
};

export { shownSize };
