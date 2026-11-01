// S08 Pebble Remote (9 s, Night): "Your Mac, in your pocket." The real Pebble Remote iPhone app (its own code, a DEBUG
// build in the iOS Simulator, talking to the app repository's own stand-in Mac with the film's sample world:
// data/remote.ts) in the motion system's <Device>. Nothing on the phone's screen is redrawn; the only overlay is one
// highlight ring on the Reviews badge.
//
// 0.0   Night; "Your Mac, in your pocket." lands while the phone rises (whoosh), tilted, and flattens. Far behind it, a
//       blurred, dimmed hint of the Mac (RS15-01, the quick chat being typed into) so "your Mac" reads.
// 0.0   The Pebble tab while Pebble works on the Mac (remote-pebble-tab 8.4 s →): Writing, Editing…
// 1.5   The approval arrives (9.9 s): "Needs your review", the red 1 on Reviews (a sage ring on the badge).
// 2.0   The camera pushes into the phone (isolateTop: the hero card and "1 item needs your review · Change slots.py").
// 2.6   "Pebble Remote for iPhone."
// 3.0   Inside the move, the phone cuts to the conversation (remote-approval 16.75 s →): Pebble's diagnosis and the
//       edit card "Change slots.py · Apply Edit"; framed on isolateCard, so the app's lock row stays out of frame.
// 4.75  Apply Edit is pressed (27.05 s; click), the wait ramps through, the system Face ID prompt shows (29.15 s) as the
//       camera arrives on it; "Approve with Face ID."
// 7.0   Approved: the prompt goes (a cut over the app's own re-layout, 32.70 → 33.65 s, the camera holding the card in
//       place; shimmer), the camera settles on the edit card, now "Done · Undo This Edit". 6.4 "Open source. Build it with Xcode." (small).
//
// Retime: longer than nominal → the slack goes to the last hold (the take runs on at 1× to 35.0 s, then holds while the
// camera drifts); shorter → every beat moves earlier by the same factor (the footage plays up to 1.15× fast, never
// slower than 1×).
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Device, FontGate, Headline, ScreenZoom, SfxTrack, Stage, type SfxCue } from "../../components";
import { pick, useLayout, type Layout, type Rect } from "../../layout";
import { timeMap, type TimeMap } from "../../timeMap";
import { C, EASE } from "../../tokens";
import { useWorld } from "../../world";
import { REMOTE_CLIPS } from "../../data/remote";
import { TAKES } from "../../data/takes";
import type { SceneProps } from "../types";

export const S08_NOMINAL = 9;

/** Scene seconds at the nominal length (choreography time). */
export const S08_BEATS = {
  text1: 0.1,
  phoneIn: 0.15,
  approvalArrives: 1.5, // remote-pebble-tab 9.9 s
  pushTop: 2.0,
  text2: 2.6,
  cutToCard: 3.0, // remote-approval 16.75 s
  jumpToApply: 4.5, // remote-approval 26.80 s
  applyEdit: 4.75, // 27.05 s
  pushFace: 4.95,
  text3: 5.25,
  faceId: 5.45, // 29.15 s
  smallLine: 6.4,
  approved: 7.0, // 32.70 → 33.65 s
  holdFrom: 8.35, // 35.0 s, then a held frame and camera drift
} as const;
const B = S08_BEATS;

export const S08_MARKS = [
  { name: "the phone rises (whoosh)", s: B.phoneIn + 0.3 },
  { name: "the approval arrives (Reviews badge 1)", s: B.approvalArrives },
  { name: "Pebble Remote for iPhone. (text hit)", s: B.text2 },
  { name: "the conversation: Change slots.py · Apply Edit", s: B.cutToCard },
  { name: "Apply Edit pressed (click)", s: B.applyEdit },
  { name: "Face ID prompt; Approve with Face ID. (text hit)", s: B.faceId },
  { name: "approved: Done (shimmer)", s: B.approved },
] as const;

/* ---------- sound (exported for the master; placed here only when PLACE_SFX) ---------- */

export const PLACE_SFX = false;
const SFX = {
  whoosh: "launch/audio/sfx/sfx-whoosh-medium.wav",
  click: "launch/audio/sfx/sfx-click-soft-a.wav",
  shimmer: "launch/audio/sfx/sfx-shimmer.wav",
} as const;
/** each file's measured peak (kit.json measure.peak_time_s) */
const PEAK: Record<string, number> = { [SFX.whoosh]: 0.3575, [SFX.click]: 0.0022, [SFX.shimmer]: 0.0007 };
const peakAt = (src: string, event: number, db: number): SfxCue => ({
  src,
  at: +Math.max(0, event + 1 / 120 - (PEAK[src] ?? 0)).toFixed(4),
  db,
});

/** The scene's SFX for a scene length `durS` (seconds from the scene's start; `at` is the file's start). */
export const s08Sfx = (durS: number = S08_NOMINAL): SfxCue[] => {
  const kk = Math.min(1, Math.max(0.8, durS / S08_NOMINAL));
  return [
    peakAt(SFX.whoosh, (B.phoneIn + 0.3) * kk, -14), // the phone's rise, peak as it nears its place
    peakAt(SFX.click, B.applyEdit * kk, -12), // Apply Edit pressed (the button greys on this frame)
    peakAt(SFX.shimmer, B.approved * kk, -15), // approved: the prompt goes, "Done"
  ];
};

/* ---------- the footage ---------- */

const TAB = REMOTE_CLIPS["remote-pebble-tab"];
const APPROVAL = REMOTE_CLIPS["remote-approval"];
const SRC = { w: 1206, h: 2622 } as const;
const BADGE = { x: 791, y: 2416 }; // the red 1 on Reviews (reviewsBadge ROI), source px
const MAC = TAKES["RS15-01"];
const MAC_SRC_START = 4.0; // typing, sending, thinking: well before the usage line (15.38 s)

/** The phone's source time maps, in choreography seconds (scaled by kk at use). */
const tabTime = (kk: number): TimeMap => timeMap([[0, 8.4], [B.cutToCard * kk, 8.4 + B.cutToCard]], { head: 1, tail: 1 / kk });
const cardTime = (kk: number): TimeMap =>
  timeMap([[B.cutToCard * kk, 16.75], [B.jumpToApply * kk, 16.75 + (B.jumpToApply - B.cutToCard)]], { head: 1, tail: 1 / kk });
const applyTime = (kk: number): TimeMap =>
  timeMap(
    [
      [B.jumpToApply * kk, 26.8],
      [B.applyEdit * kk, 27.05],
      [B.faceId * kk, 29.15],
      [(B.approved - 0.05) * kk, 32.7],
    ],
    { head: 1, tail: 0 },
  );
const doneTime = (kk: number): TimeMap => timeMap([[B.approved * kk, 33.65], [B.holdFrom * kk, 35.0]], { head: 1, tail: 0 });

/* ---------- the camera on the phone ---------- */

/** A framing: `s` screen px per source px, the source point `f` placed at the frame point `p`. */
interface Shot {
  s: number;
  f: { x: number; y: number };
  p: { x: number; y: number };
}

const shots = (L: Layout): Record<"full" | "top" | "card" | "face" | "done", Shot> => {
  const u = L.u;
  const P = (x: number, y: number) => ({ x: x * u, y: y * u });
  return pick(L, {
    "16x9": {
      // full: the phone at 85 % of the frame's height (the display is 96.2 % of the device's height)
      full: { s: (0.85 * 1080 * 0.962 * u) / SRC.h, f: { x: 603, y: 1311 }, p: P(1290, 540) },
      top: { s: 0.8 * u, f: { x: 603, y: 760 }, p: P(1370, 560) },
      card: { s: 0.8 * u, f: { x: 603, y: 1000 }, p: P(1370, 560) },
      face: { s: 0.9 * u, f: { x: 604, y: 1306 }, p: P(1350, 680) },
      done: { s: 0.8 * u, f: { x: 603, y: 1430 }, p: P(1370, 560) },
    },
    "4x5": {
      full: { s: (0.75 * 1350 * 0.962 * u) / SRC.h, f: { x: 603, y: 1311 }, p: P(540, 835) },
      top: { s: 0.8 * u, f: { x: 603, y: 760 }, p: P(540, 920) },
      card: { s: 0.8 * u, f: { x: 603, y: 1000 }, p: P(540, 950) },
      face: { s: 0.9 * u, f: { x: 604, y: 1306 }, p: P(540, 990) },
      done: { s: 0.8 * u, f: { x: 603, y: 1430 }, p: P(540, 980) },
    },
  });
};

/** how far the edit card's header moves down in the app's re-layout after the approval (32.70 → 33.65 s), source px */
const CARD_SHIFT = 470;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Shot, b: Shot, t: number): Shot => ({
  s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), t)),
  f: { x: lerp(a.f.x, b.f.x, t), y: lerp(a.f.y, b.f.y, t) },
  p: { x: lerp(a.p.x, b.p.x, t), y: lerp(a.p.y, b.p.y, t) },
});

/** The camera at choreography time `tc`: one push per action (rulings v1.1), drift between. */
const cameraAt = (L: Layout, tc: number): { shot: Shot; zoom: number } => {
  const S = shots(L);
  const moves: { at: number; dur: number; from: Shot; to: Shot }[] = [
    { at: B.pushTop, dur: 0.6, from: S.full, to: S.top },
    { at: B.cutToCard - 0.05, dur: 0.6, from: S.top, to: S.card },
    { at: B.pushFace, dur: 0.6, from: S.card, to: S.face },
    // approved: the picture cuts to the settled transcript with the camera offset by the card's own move in the
    // re-layout, so the edit card stays in place while the prompt goes and "Done" appears; then it settles
    { at: B.approved, dur: 0.75, from: { ...S.face, f: { x: S.face.f.x, y: S.face.f.y + CARD_SHIFT } }, to: S.done },
  ];
  let shot = S.full;
  for (const m of moves) {
    if (tc < m.at) break;
    shot = mix(m.from, m.to, EASE.push(clamp01((tc - m.at) / m.dur)));
  }
  // a slow push (0.5 %/s) so nothing holds dead still; it never reaches the lock row's margin
  const drift = 1 + 0.005 * tc;
  const zoom = clamp01((Math.log(shot.s) - Math.log(S.full.s)) / (Math.log(S.top.s) - Math.log(S.full.s)));
  return { shot: { ...shot, s: shot.s * drift }, zoom };
};

/** The Device's centre and height for a framing (the display is the device minus the band and bezel, 3.8 % of H). */
const deviceFor = (shot: Shot) => {
  const sw = SRC.w * shot.s;
  const sh = SRC.h * shot.s;
  const cx = shot.p.x - (shot.f.x - SRC.w / 2) * shot.s;
  const cy = shot.p.y - (shot.f.y - SRC.h / 2) * shot.s;
  return { centre: { x: cx, y: cy }, height: sh / 0.962, sw };
};

/* ---------- pieces ---------- */

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/** The Mac, far behind: a blurred, dimmed crop of a real take (RS15-01), clearly secondary. */
const MacHint: React.FC<{ zoom: number }> = ({ zoom }) => {
  const L = useLayout();
  const t = useT();
  const r: Rect = pick(L, {
    "16x9": { x: 520 * L.u, y: 70 * L.u, w: 1300 * L.u, h: 845 * L.u },
    "4x5": { x: 20 * L.u, y: 360 * L.u, w: 1040 * L.u, h: 676 * L.u },
  });
  const pin = EASE.enter(clamp01(t / 0.5));
  const sc = (1 + 0.004 * t) * lerp(1, 1.06, zoom);
  return (
    <div
      style={{
        position: "absolute",
        left: r.x,
        top: r.y,
        width: r.w,
        height: r.h,
        borderRadius: 18 * L.u,
        overflow: "hidden",
        opacity: pin * lerp(0.2, 0.12, zoom),
        transform: `scale(${sc.toFixed(5)})`,
        filter: `blur(${(22 * L.u).toFixed(1)}px)`,
      }}
    >
      <ScreenZoom
        src={MAC.file}
        srcSize={{ w: MAC.width, h: MAC.height }}
        srcStart={MAC_SRC_START}
        width={r.w}
        height={r.h}
        drift={0}
        motionBlur={false}
        edgeFade={false}
        grade={{ brightness: 0.55, saturate: 0.7 }}
      />
    </div>
  );
};

/** The sage ring on the Reviews badge as the approval arrives (a highlight over the real screen, never a redraw). */
const badgeRing = (kk: number) => (toView: (p: { x: number; y: number }) => { x: number; y: number }, scale: number, t: number) => {
  const p = clamp01((t - B.approvalArrives * kk) / 0.75);
  if (p <= 0 || p >= 1) return null;
  const c = toView(BADGE);
  const r = (70 + 90 * EASE.enter(p)) * scale;
  return (
    <div
      style={{
        position: "absolute",
        left: c.x - r,
        top: c.y - r,
        width: 2 * r,
        height: 2 * r,
        borderRadius: "50%",
        border: `${Math.max(1.5, 9 * scale).toFixed(2)}px solid ${C.sage}`,
        opacity: (1 - p) * 0.9,
      }}
    />
  );
};

const Screen: React.FC<{ kk: number }> = ({ kk }) => {
  const t = useT();
  const tc = t / kk;
  const common = { srcSize: SRC, drift: 0, motionBlur: false as const, edgeFade: false as const };
  if (tc < B.cutToCard) {
    return <ScreenZoom {...common} src={TAB.file} time={tabTime(kk)} srcDuration={TAB.durationS} overlay={badgeRing(kk)} />;
  }
  if (tc < B.jumpToApply) {
    return <ScreenZoom {...common} src={APPROVAL.file} time={cardTime(kk)} srcDuration={APPROVAL.durationS} />;
  }
  // approved: a cut from the prompt's last held frame (32.70) to the settled transcript (33.65), over the app's own
  // fade and re-layout, so no frame from the middle of the re-layout shows (the camera keeps the card in place)
  if (tc < B.approved) {
    return <ScreenZoom {...common} src={APPROVAL.file} time={applyTime(kk)} srcDuration={APPROVAL.durationS} />;
  }
  return <ScreenZoom {...common} src={APPROVAL.file} time={doneTime(kk)} srcDuration={APPROVAL.durationS} />;
};

/* ---------- the scene ---------- */

export const S08Remote: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const { fps, durationInFrames: compFrames } = useVideoConfig();
  const t = useT();
  const durS = (durationInFrames ?? compFrames) / fps;
  // shorter than nominal: everything earlier by the same factor; longer: the slack is the last hold
  const kk = Math.min(1, Math.max(0.8, durS / S08_NOMINAL));
  const tc = t / kk;
  const at = (s: number) => s * kk;

  const { shot, zoom } = cameraAt(L, tc);
  const dev = deviceFor(shot);

  // where the zoomed phone is cut by the frame (and, on 4:5, by the text above it), its edges feather
  const fTop = pick(L, { "16x9": { a: 0, b: 110 * L.u }, "4x5": { a: 410 * L.u, b: 570 * L.u } });
  const fBot = 130 * L.u;
  const z = zoom;
  const mask = `linear-gradient(to bottom, rgba(0,0,0,${(1 - z).toFixed(3)}) ${fTop.a.toFixed(1)}px, #000 ${lerp(
    fTop.a,
    fTop.b,
    z,
  ).toFixed(1)}px, #000 ${(L.H - fBot * z).toFixed(1)}px, rgba(0,0,0,${(1 - z).toFixed(3)}) ${L.H}px)`;

  const text: { head: Rect; small: Rect; size: number; small_size: number } = pick(L, {
    "16x9": {
      head: { x: 128 * L.u, y: 250 * L.u, w: 700 * L.u, h: 400 * L.u },
      small: { x: 128 * L.u, y: 690 * L.u, w: 700 * L.u, h: 120 * L.u },
      size: L.type.title,
      small_size: L.type.sub,
    },
    "4x5": {
      head: { x: 64 * L.u, y: 70 * L.u, w: 952 * L.u, h: 250 * L.u },
      small: { x: 64 * L.u, y: 338 * L.u, w: 952 * L.u, h: 60 * L.u },
      size: L.type.title,
      small_size: L.type.sub,
    },
  });

  return (
    <FontGate>
      <Stage world="night" keyLight={pick(L, { "16x9": { x: 0.7, y: 0.36, r: 0.5 }, "4x5": { x: 0.5, y: 0.5, r: 0.6 } })}>
        <MacHint zoom={zoom} />
        <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>
          <Device
            centre={dev.centre}
            height={dev.height}
            screenAspect={SRC.w / SRC.h}
            at={at(B.phoneIn)}
            flattenAt={at(B.phoneIn + 0.35)}
          >
            <Screen kk={kk} />
          </Device>
        </AbsoluteFill>
        <Headline
          text={"Your Mac,\nin your pocket."}
          at={at(B.text1)}
          exitAt={at(B.text2 - 0.17)}
          box={text.head}
          size={text.size}
          align="left"
          valign="bottom"
        />
        <Headline
          text={"Pebble Remote\nfor iPhone."}
          at={at(B.text2)}
          exitAt={at(B.text3 - 0.2)}
          entrance="blur"
          box={text.head}
          size={text.size}
          align="left"
          valign="bottom"
        />
        <Headline text={"Approve with\nFace ID."} at={at(B.text3)} box={text.head} size={text.size} align="left" valign="bottom" />
        <SmallLine text="Open source. Build it with Xcode." at={at(B.smallLine)} box={text.small} size={text.small_size} />
        {PLACE_SFX && <SfxTrack cues={s08Sfx(durS)} />}
      </Stage>
    </FontGate>
  );
};

const SmallLine: React.FC<{ text: string; at: number; box: Rect; size: number }> = ({ text, at, box, size }) => {
  const W = useWorld();
  return (
    <Headline
      text={text}
      at={at}
      entrance="blur"
      variant="support"
      box={box}
      size={size}
      color={W.ink2}
      align="left"
      valign="top"
    />
  );
};
