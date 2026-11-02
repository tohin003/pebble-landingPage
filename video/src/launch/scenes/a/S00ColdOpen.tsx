// S00 Cold open, "the challenger" (EDIT_PLAN S00, TREATMENT §2.1 and rulings v1.1). Night world.
//
// Frame 0 is the film's thumbnail and the muted autoplay start: the pebble awake, small, centre-low, and
// "This is Pebble." already landed. Then "It's small." with a tiny hop; "It just went up against" and the rivals'
// names as huge mute-grey monoliths, the pebble at their feet looking up (the premise is complete by 2.7 s); "Same
// model. Same tasks." in Geist Mono, sage, under it (landed by 4.0 s). The verb stays to the drop (REVIEW-4 N-1), so
// the hook's longest frame reads as the whole premise, verb, names and terms. The rest is the pebble's, in its own poses: it
// reads the terms, sizes the giants up (one eye narrowed), rears up to look at them (5.0), turns to us, gives a small
// sure squash with its proud squint (6.6) and gathers itself for the drop while the light closes in on it and the set
// (names and pebble) drifts in 0.5 % a second (REVIEW-2 S-5: no 4-s still). The last 3 frames darken about 40 % (a dip before the drop); S01 takes
// off from this exact spot on the drop frame. Plain text names only: no rival logos, marks or screenshots.
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../components/FontGate";
import { fitSize, Headline } from "../../components/Headline";
import { PebbleActor, cues, look, lookBack, pose } from "../../components/PebbleActor";
import { Stage } from "../../components/Stage";
import { pick, useLayout, type Layout } from "../../layout";
import { prog, punchAt, tween } from "../../timing";
import { C, EASE, TYPE, rgba } from "../../tokens";
import type { SceneProps } from "../types";
import { BODY_H, INTER, baselineFromTop, lineBox, onBlink, stagePebble, useClock, type SfxSuggestion } from "./common";
import { ExitWrap } from "./fx";

export const S00_NOMINAL = 8.05;

/**
 * Beats, seconds at the nominal length (music A: a beat every 0.5 s from 0.05; the drop is S01's frame 0 at 8.051).
 * REVIEW-1 S10: "This is Pebble." 0–1.0, "It's small." 1.0–1.8, the rivals landed by 2.7, the terms landed by 4.0;
 * then the tension holds on the pebble until the drop. "This is Pebble." and "It's small." leave in 0.17 s and are
 * gone 2 frames before the next line in their place starts (M2); "It just went up against" stays with the names and
 * the terms to the drop (REVIEW-4 N-1).
 */
export const S00_BEATS = {
  thisExit: 0.8,
  small: 1.05,
  hop: 1.27,
  smallLand: 1.55,
  smallExit: 1.75,
  against: 1.9,
  claude: 2.3,
  codex: 2.55,
  sameModel: 3.55,
  sameTasks: 3.8,
  read: 3.66,
  sizeUp: 4.3,
  lookUp: 5.0,
  toCamera: 5.85,
  squash: 6.6,
  sure: 6.6,
  crouch: 7.3,
} as const;
/** REVIEW-2 S-5: from here the set (the names and the pebble) drifts in 0.5 % a second, about the pebble's foot */
const DRIFT_FROM = 3.9;
const DRIFT_RATE = 0.005;
/** the set's scale at the scene's end: S01's take-off starts at this size (coldOpenGeo's peb.size × this) */
export const S00_END_DRIFT = 1 + DRIFT_RATE * (S00_NOMINAL - DRIFT_FROM);
const B = S00_BEATS;

export const S00_MARKS = [
  { name: "small", s: B.small },
  { name: "small-land", s: B.smallLand },
  { name: "against", s: B.against },
  { name: "claude-code", s: B.claude },
  { name: "and-codex", s: B.codex },
  { name: "same-model", s: B.sameModel },
  { name: "same-tasks", s: B.sameTasks },
  { name: "size-up", s: B.sizeUp },
  { name: "look-up", s: B.lookUp },
  { name: "to-camera", s: B.toCamera },
  { name: "squash", s: B.squash },
  { name: "sure", s: B.sure },
  { name: "crouch", s: B.crouch },
  { name: "darken", s: S00_NOMINAL - 3 / 30 },
] as const;

export const S00_SFX: SfxSuggestion[] = [
  { scene: "S00", s: B.smallLand, kind: "pop (soft)", note: "the tiny hop's landing squash" },
  { scene: "S00", s: B.claude, kind: "soft thud (low)", note: "\"Claude Code\" slams" },
  { scene: "S00", s: B.codex, kind: "soft thud (low), second take", note: "\"and Codex.\" slams" },
  { scene: "S00", s: B.squash, kind: "pop (soft), second take", note: "the pebble's small, sure squash" },
  { scene: "S00", s: B.sameModel, kind: "riser start", note: "rises to the drop at S01 0.0; the crouch from 7.3 rides its last bar" },
];

const MONO_WEIGHT = 800;
const RIVAL_1 = "Claude Code";
const RIVAL_2 = "and Codex.";

/** The rivals' names, line by line, and which slam each line belongs to (16:9: two lines; 4:5: three, so they fill the width). */
const rivalLines = (L: Layout): { text: string; slam: 0 | 1 }[] =>
  L.portrait
    ? [
        { text: "Claude", slam: 0 },
        { text: "Code", slam: 0 },
        { text: RIVAL_2, slam: 1 },
      ]
    : [
        { text: RIVAL_1, slam: 0 },
        { text: RIVAL_2, slam: 1 },
      ];

/** Where everything stands on this layout. S01 takes off from `peb` (the pebble's foot and size). */
export const coldOpenGeo = (L: Layout) => {
  // 4:5 (REVIEW-2 N-1): the group sits 30 px lower than in draft 3, so frame 0's optical centre (the cover in the
  // feed) is at 50 % of the height and the rivals' block at about 48 %
  const peb = { ...stagePebble(L), ...(L.portrait ? { y: L.px(980) } : {}) };
  const pebbleTop = peb.y - peb.size * BODY_H;
  // the monoliths: each line as wide as the content allows, capped so the block stands on the pebble's head-height;
  // the lines are stacked upward from the last one's baseline, just above the pebble
  const cap = pick(L, { "16x9": 280, "4x5": 236 }) * L.u;
  const lines = rivalLines(L).map((l) => ({ ...l, size: fitSize(l.text, cap, L.content.w, "headline", MONO_WEIGHT), base: 0 }));
  let base = pebbleTop - L.px(30);
  for (let i = lines.length - 1; i >= 0; i--) {
    lines[i].base = base;
    if (i > 0) base -= lines[i].size * 0.97 * (i === lines.length - 1 ? 1 : 1.02);
  }
  const capTop1 = lines[0].base - INTER.cap * lines[0].size;
  // story-critical, read on a phone (REVIEW-3 S-3, FIXES-3): measured as the rendered cap height at 1080p, "It just went
  // up against" is 56 px (16:9) / 48 px (4:5) and "Same model. Same tasks." 60 / 48 px (Inter's caps are 0.727 em,
  // Geist Mono's about 0.72 em). The giant rival names stay as they are: the contrast in size is the joke.
  const introSize = pick(L, { "16x9": 77, "4x5": 66 }) * L.u;
  // REVIEW-4 N-1: the verb holds to the drop, a landed line (dead still) over the set's drift, which lifts the names'
  // top by (peb.y − capTop1) × (S00_END_DRIFT − 1) by the end (about 13 px in 16:9, 16 in 4:5). The line sits that much
  // higher from its entrance, so its descenders keep their draft-5 clearance over "Claude" to the last frame.
  const driftRise = (peb.y - capTop1) * (S00_END_DRIFT - 1);
  const introBase = capTop1 - L.px(pick(L, { "16x9": 50, "4x5": 44 })) - driftRise;
  const monoSize = pick(L, { "16x9": 86, "4x5": 69 }) * L.u;
  return {
    peb,
    pebbleTop,
    lines,
    intro: { size: introSize, box: lineBox(L.content.x, L.content.w, introBase, introSize, 1) },
    // "This is Pebble." and "It's small.": one display line above the pebble (frame 0's composition)
    title: lineBox(L.content.x, L.content.w, pick(L, { "16x9": 560, "4x5": 690 }) * L.u, L.type.display, 1),
    mono: { size: monoSize, top: peb.y + L.px(pick(L, { "16x9": 46, "4x5": 50 })) },
  };
};

/**
 * The pebble's cue list (local seconds through `T`, an actor with lead 1). S01 replays it, shifted, so the engine runs
 * on across the drop: the face, the blinks and the bob on S01's frame 0 are the ones S00 left.
 */
export const s00ActorCues = (T: (s: number) => number) =>
  cues(
    pose(0, "idle"),
    // up at each name as it slams
    look(T(B.claude) + 0.08, -0.05, -0.8),
    look(T(B.codex) + 0.08, 0.08, -1),
    // it reads the terms under it
    look(T(B.read), 0, 0.65),
    // and sizes the giants up: one eye narrowed (Pebble's "testing" face), in the engine's blink at 4.22
    pose(onBlink(T(B.sizeUp)), "testing"),
    look(onBlink(T(B.sizeUp)) + 0.05, -0.1, -0.9),
    // REVIEW-2 S-5: it rears up to look the names over (Pebble's own attentive "sending" face and its small bob; the
    // gaze straight up). Not "review" (its engine state "alert" morphs the body into a "!") and not "searching" (its
    // scan cue touches the names' baseline)
    pose(T(B.lookUp), "sending"),
    look(T(B.lookUp), 0.05, -1),
    // to us, attentive
    pose(T(B.toCamera), "hover"),
    lookBack(T(B.toCamera)),
    // a small, sure squash and Pebble's proud squint ("writing"), held through the crouch and the take-off
    pose(T(B.sure), "writing"),
  );

/** A rival's name as a monolith: it slams in (a 0-frame set, then 7 % of scale and a little blur settle in 0.14 s). */
const Monolith: React.FC<{ text: string; size: number; baseline: number; at: number; t: number; dim: number }> = ({ text, size, baseline, at, t, dim }) => {
  const L = useLayout();
  if (t < at) return null;
  const p = prog(t, at, 0.14, EASE.enter);
  const blur = 7 * L.u * (1 - prog(t, at, 0.09, EASE.enter));
  const box = lineBox(0, L.W, baseline, size, 1);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: box.y,
        width: L.W,
        height: box.h,
        textAlign: "center",
        whiteSpace: "nowrap",
        fontFamily: TYPE.headline.fontFamily,
        fontWeight: MONO_WEIGHT,
        fontVariationSettings: TYPE.headline.fontVariationSettings,
        letterSpacing: "-0.045em",
        lineHeight: 1,
        fontSize: size,
        color: C.mute,
        opacity: dim,
        transform: `scale(${(1.07 - 0.07 * p).toFixed(5)})`,
        transformOrigin: `50% ${(baselineFromTop(1) * 100).toFixed(1)}%`,
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined,
      }}
    >
      {text}
    </div>
  );
};

/** "Same model. Same tasks.": one centred mono line whose halves arrive on two beats (a 0.2 s fade-rise each). */
const SameLine: React.FC<{ t: number; a: number; b: number; size: number; top: number }> = ({ t, a, b, size, top }) => {
  const L = useLayout();
  const part = (at: number, text: string) => {
    const p = prog(t, at, 0.2, EASE.enter);
    return (
      <span style={{ display: "inline-block", opacity: p, transform: `translateY(${((1 - p) * 0.35 * size).toFixed(2)}px)` }}>{text}</span>
    );
  };
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        width: L.W,
        top,
        textAlign: "center",
        whiteSpace: "pre",
        fontFamily: TYPE.mono.fontFamily,
        fontWeight: 500,
        fontVariantNumeric: "tabular-nums",
        fontSize: size,
        lineHeight: 1.2,
        color: C.sage,
      }}
    >
      {part(a, "Same model.")}
      {" "}
      {part(b, "Same tasks.")}
    </div>
  );
};

export const S00ColdOpen: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const { t, T, D, frame, frames } = useClock(S00_NOMINAL, durationInFrames);
  const g = coldOpenGeo(L);
  const { peb } = g;

  // the tiny hop on "It's small."; then the take-off itself at the scene's end: S00 shows only its anticipation squash (the last 0.15 s), S01 draws
  // the flight from its frame 0
  const bodyPx = peb.size * BODY_H;
  const hops = [
    { at: T(B.hop), to: { x: peb.x, y: peb.y }, duration: T(B.smallLand) - T(B.hop), height: bodyPx * 0.42 },
    { at: D, to: { x: peb.x, y: peb.y - L.px(100) }, duration: 0.45 },
  ];
  const slams = [T(B.claude), T(B.codex)];
  const punch = punchAt(slams, t, 0.03, 0.02, 0.16);
  // the giants dim when the terms arrive, then sink further while the light closes in on the pebble
  const monoDim = tween(t, [T(B.sameModel) - 0.1, T(B.sameModel) + 0.4, T(B.toCamera), D - 0.2], [1, 0.62, 0.62, 0.48], EASE.camera);
  const close = tween(t, [T(B.sizeUp), D - 0.1], [0, 1], EASE.camera);
  // the wind-up: the pebble gathers itself (a slow squash about its foot) before the anticipation of the leap
  const crouch = tween(t, [T(B.crouch), D - 0.15], [0, 1], EASE.camera);
  // REVIEW-2 S-5: rearing up to look at the names (a stretch about the foot, in 0.2 s; it settles back as it turns to
  // us), and the small squash on 6.6 (0.07 s down, then a damped jelly rebound)
  const rear = tween(t, [T(B.lookUp) - 0.05, T(B.lookUp) + 0.2, T(B.toCamera) - 0.05, T(B.toCamera) + 0.25], [0, 1, 1, 0], EASE.camera);
  const ds = t - T(B.squash);
  const sq = ds < 0 ? 0 : ds < 0.07 ? ds / 0.07 : Math.exp(-(ds - 0.07) / 0.13) * Math.cos((ds - 0.07) * 2 * Math.PI * 2.4);
  const csy = (1 - 0.07 * crouch) * (1 + 0.08 * rear) * (1 - 0.13 * sq);
  const csx = (1 / (1 - 0.07 * crouch)) * (1 - 0.055 * rear) * (1 + 0.11 * sq);
  // the set's drift (the names and the pebble; never "Same model. Same tasks.", a landed line)
  const drift = 1 + DRIFT_RATE * Math.max(0, (t * S00_NOMINAL) / D - DRIFT_FROM);
  const dip = frame >= frames - 3;

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage
          keyLight={{ x: 0.5, y: 0.3 + 0.2 * close, r: 0.8 - 0.14 * close }}
          energy={(1 + 0.25 * (punch - 1) / 0.03) * (1 - 0.08 * close)}
          pool={{ x: peb.x, y: peb.y, w: peb.size * 2.4, strength: 0.35 * close }}
        >
          <AbsoluteFill style={{ transform: `scale(${punch.toFixed(5)})`, transformOrigin: `50% ${((peb.y / L.H) * 100).toFixed(1)}%` }}>
            <ExitWrap at={T(B.thisExit)} t={t} rise={L.px(14)}>
              <Headline text="This is Pebble." at={-1} size={L.type.display} align="center" valign="top" fit box={g.title} leading={1} />
            </ExitWrap>
            <ExitWrap at={T(B.smallExit)} t={t} rise={L.px(14)}>
              <Headline text="It’s small." at={T(B.small)} entrance="blur" size={L.type.display} align="center" valign="top" box={g.title} leading={1} />
            </ExitWrap>
            {/* REVIEW-4 N-1: no exit; it goes with the names and the terms on the drop */}
            <Headline
              text="It just went up against"
              variant="support"
              at={T(B.against)}
              entrance="blur"
              size={g.intro.size}
              color={C.stone1}
              align="center"
              valign="top"
              box={g.intro.box}
              leading={1}
            />
            <div style={{ position: "absolute", inset: 0, transform: drift > 1 ? `scale(${drift.toFixed(6)})` : undefined, transformOrigin: `${peb.x.toFixed(2)}px ${peb.y.toFixed(2)}px` }}>
              {g.lines.map((l) => (
                <Monolith key={l.text} text={l.text} size={l.size} baseline={l.base} at={slams[l.slam]} t={t} dim={monoDim} />
              ))}
              <div style={{ position: "absolute", inset: 0, transform: `scale(${csx.toFixed(5)}, ${csy.toFixed(5)})`, transformOrigin: `${peb.x.toFixed(2)}px ${peb.y.toFixed(2)}px` }}>
                <PebbleActor
                  x={peb.x}
                  y={peb.y}
                  size={peb.size}
                  cues={s00ActorCues(T)}
                  hops={hops}
                  pulses={slams.map((x) => x + 0.02)}
                  pool
                  glow={0.35 + 0.3 * close}
                />
              </div>
            </div>
            <SameLine t={t} a={T(B.sameModel)} b={T(B.sameTasks)} size={g.mono.size} top={g.mono.top} />
          </AbsoluteFill>
        </Stage>
        {dip && <AbsoluteFill style={{ backgroundColor: rgba("ink0", 0.4) }} />}
      </AbsoluteFill>
    </FontGate>
  );
};
