// S00 Cold open, "the challenger" (EDIT_PLAN S00, TREATMENT §2.1 and rulings v1.1). Night world.
//
// Frame 0 is the film's thumbnail and the muted autoplay start: the pebble awake, small, centre-low, and
// "This is Pebble." already landed. Then "It's small." with a tiny hop; "It just went up against" and the rivals'
// names as huge mute-grey monoliths, the pebble at their feet looking up (the premise is complete by 2.7 s); "Same
// model. Same tasks." in Geist Mono, sage, under it (landed by 4.0 s). The rest is the pebble's, in its own poses: it
// reads the terms, sizes the giants up (one eye narrowed), turns to us, settles into a sure squint and gathers itself
// for the drop while the light closes in on it. The last 3 frames darken about 40 % (a dip before the drop); S01 takes
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
 * then the tension holds on the pebble until the drop. Every line leaves in 0.17 s and is gone 2 frames before the
 * next line in its place starts (M2).
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
  againstExit: 3.45,
  sameModel: 3.55,
  sameTasks: 3.8,
  read: 3.66,
  sizeUp: 4.3,
  toCamera: 5.55,
  bounce1: 6.05,
  bounce2: 6.55,
  sure: 6.55,
  crouch: 7.3,
} as const;
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
  { name: "to-camera", s: B.toCamera },
  { name: "bounce", s: B.bounce1 },
  { name: "sure", s: B.sure },
  { name: "crouch", s: B.crouch },
  { name: "darken", s: S00_NOMINAL - 3 / 30 },
] as const;

export const S00_SFX: SfxSuggestion[] = [
  { scene: "S00", s: B.smallLand, kind: "pop (soft)", note: "the tiny hop's landing squash" },
  { scene: "S00", s: B.claude, kind: "soft thud (low)", note: "\"Claude Code\" slams" },
  { scene: "S00", s: B.codex, kind: "soft thud (low), second take", note: "\"and Codex.\" slams" },
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
  const peb = { ...stagePebble(L), ...(L.portrait ? { y: L.px(950) } : {}) };
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
  // story-critical, read on a phone: at least 64 / 48 px (the director's review)
  const introSize = pick(L, { "16x9": 68, "4x5": 50 }) * L.u;
  const introBase = capTop1 - L.px(pick(L, { "16x9": 50, "4x5": 44 }));
  const monoSize = pick(L, { "16x9": 62, "4x5": 46 }) * L.u;
  return {
    peb,
    pebbleTop,
    lines,
    intro: { size: introSize, box: lineBox(L.content.x, L.content.w, introBase, introSize, 1) },
    // "This is Pebble." and "It's small.": one display line above the pebble (frame 0's composition)
    title: lineBox(L.content.x, L.content.w, pick(L, { "16x9": 560, "4x5": 660 }) * L.u, L.type.display, 1),
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
    // to us, attentive
    pose(T(B.toCamera), "hover"),
    lookBack(T(B.toCamera)),
    // a sure squint ("writing": Pebble's proud face), held through the crouch and the take-off
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

  // the tiny hop on "It's small."; two small bounces on its toes, landing on the 6.05 and 6.55 beats (it squares up;
  // low enough to keep ≥ 10 px under "and Codex.");
  // then the take-off itself at the scene's end: S00 shows only its anticipation squash (the last 0.15 s), S01 draws
  // the flight from its frame 0
  const bodyPx = peb.size * BODY_H;
  const BOUNCE = 0.22;
  const hops = [
    { at: T(B.hop), to: { x: peb.x, y: peb.y }, duration: T(B.smallLand) - T(B.hop), height: bodyPx * 0.42 },
    { at: T(B.bounce1) - BOUNCE, to: { x: peb.x, y: peb.y }, duration: BOUNCE, height: bodyPx * 0.16 },
    { at: T(B.bounce2) - BOUNCE, to: { x: peb.x, y: peb.y }, duration: BOUNCE, height: bodyPx * 0.16 },
    { at: D, to: { x: peb.x, y: peb.y - L.px(100) }, duration: 0.45 },
  ];
  const slams = [T(B.claude), T(B.codex)];
  const punch = punchAt(slams, t, 0.03, 0.02, 0.16);
  // the giants dim when the terms arrive, then sink further while the light closes in on the pebble
  const monoDim = tween(t, [T(B.sameModel) - 0.1, T(B.sameModel) + 0.4, T(B.toCamera), D - 0.2], [1, 0.62, 0.62, 0.48], EASE.camera);
  const close = tween(t, [T(B.sizeUp), D - 0.1], [0, 1], EASE.camera);
  // the wind-up: the pebble gathers itself (a slow squash about its foot) before the anticipation of the leap
  const crouch = tween(t, [T(B.crouch), D - 0.15], [0, 1], EASE.camera);
  const csy = 1 - 0.07 * crouch;
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
              <Headline text="It's small." at={T(B.small)} entrance="blur" size={L.type.display} align="center" valign="top" box={g.title} leading={1} />
            </ExitWrap>
            <ExitWrap at={T(B.againstExit)} t={t}>
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
            </ExitWrap>
            {g.lines.map((l) => (
              <Monolith key={l.text} text={l.text} size={l.size} baseline={l.base} at={slams[l.slam]} t={t} dim={monoDim} />
            ))}
            <div style={{ position: "absolute", inset: 0, transform: `scale(${(1 / csy).toFixed(5)}, ${csy.toFixed(5)})`, transformOrigin: `${peb.x.toFixed(2)}px ${peb.y.toFixed(2)}px` }}>
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
            <SameLine t={t} a={T(B.sameModel)} b={T(B.sameTasks)} size={g.mono.size} top={g.mono.top} />
          </AbsoluteFill>
        </Stage>
        {dip && <AbsoluteFill style={{ backgroundColor: rgba("ink0", 0.4) }} />}
      </AbsoluteFill>
    </FontGate>
  );
};
