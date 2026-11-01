// S00 Cold open, "the challenger" (EDIT_PLAN S00, TREATMENT §2.1 and rulings v1.1). Night world.
//
// Frame 0 is the film's thumbnail and the muted autoplay start: the pebble awake, small, centre-low, and
// "This is Pebble." already landed. Then "It's small." with a tiny hop; "It just went up against" and the rivals'
// names as huge mute-grey monoliths, the pebble at their feet looking up; "Same model. Same tasks." in Geist Mono,
// sage, under it. The pebble turns to camera and blinks; the last 3 frames darken about 40 % (a dip before the drop).
// Plain text names only: no rival logos, marks or screenshots.
import { AbsoluteFill } from "remotion";
import { FontGate } from "../../components/FontGate";
import { fitSize, Headline } from "../../components/Headline";
import { PebbleActor, blinksIn, cues, look, lookBack, pose } from "../../components/PebbleActor";
import { Stage } from "../../components/Stage";
import { pick, useLayout, type Layout } from "../../layout";
import { prog, punchAt, tween } from "../../timing";
import { C, EASE, TYPE, rgba } from "../../tokens";
import type { SceneProps } from "../types";
import { BODY_H, INTER, baselineFromTop, lineBox, stagePebble, useClock, type SfxSuggestion } from "./common";

export const S00_NOMINAL = 7.5;

/** Beats, seconds at the nominal length (they scale with the scene's length; `darken` stays the last 3 frames). */
const B = {
  thisExit: 1.05,
  small: 1.2,
  hop: 1.5,
  smallLand: 1.8,
  smallExit: 2.3,
  against: 2.4,
  claude: 2.95,
  codex: 3.45,
  againstExit: 4.55,
  sameModel: 4.8,
  sameTasks: 5.3,
  toCamera: 6.2,
} as const;

export const S00_MARKS = [
  { name: "small", s: B.small },
  { name: "small-land", s: B.smallLand },
  { name: "against", s: B.against },
  { name: "claude-code", s: B.claude },
  { name: "and-codex", s: B.codex },
  { name: "same-model", s: B.sameModel },
  { name: "same-tasks", s: B.sameTasks },
  { name: "to-camera", s: B.toCamera },
  { name: "darken", s: S00_NOMINAL - 3 / 60 },
] as const;

export const S00_SFX: SfxSuggestion[] = [
  { scene: "S00", s: B.smallLand, kind: "pop (soft)", note: "the hop's landing squash" },
  { scene: "S00", s: B.claude, kind: "soft thud (low)", note: "\"Claude Code\" slams" },
  { scene: "S00", s: B.codex, kind: "soft thud (low), second take", note: "\"and Codex.\" slams" },
  { scene: "S00", s: B.sameModel, kind: "riser start", note: "rises to the drop at S01 0.0" },
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

/** Where everything stands on this layout. */
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
  const introSize = pick(L, { "16x9": 64, "4x5": 46 }) * L.u;
  const introBase = capTop1 - L.px(pick(L, { "16x9": 50, "4x5": 44 }));
  const monoSize = pick(L, { "16x9": 56, "4x5": 42 }) * L.u;
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

/** "Same model. Same tasks.": one centred mono line whose halves arrive on two beats (a short fade-rise each). */
const SameLine: React.FC<{ t: number; a: number; b: number; size: number; top: number }> = ({ t, a, b, size, top }) => {
  const L = useLayout();
  const part = (at: number, text: string) => {
    const p = prog(t, at, 0.3, EASE.enter);
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

  // the turn to camera hides in one of the engine's own blinks
  const blink = blinksIn(T(B.toCamera) - 0.1, D - 0.15)[0];
  const toCam = blink !== undefined ? blink - 0.22 : T(B.toCamera);
  const actorCues = cues(
    pose(0, "idle"),
    look(T(B.claude) + 0.08, -0.05, -0.8),
    look(T(B.codex) + 0.08, 0.08, -1),
    look(T(B.sameModel) + 0.1, 0, 0.6),
    lookBack(toCam),
  );
  const hops = [{ at: T(B.hop), to: { x: peb.x, y: peb.y }, duration: T(B.smallLand) - T(B.hop), height: peb.size * BODY_H * 0.42 }];
  const slams = [T(B.claude), T(B.codex)];
  const punch = punchAt(slams, t, 0.03, 0.02, 0.16);
  const monoDim = tween(t, [T(B.sameModel) - 0.1, T(B.sameModel) + 0.4], [1, 0.62], EASE.camera);
  const dip = frame >= frames - 3;

  return (
    <FontGate>
      <AbsoluteFill>
        <Stage keyLight={{ x: 0.5, y: 0.3, r: 0.8 }} energy={1 + 0.25 * (punch - 1) / 0.03}>
          <AbsoluteFill style={{ transform: `scale(${punch.toFixed(5)})`, transformOrigin: `50% ${((peb.y / L.H) * 100).toFixed(1)}%` }}>
            <Headline text="This is Pebble." at={-1} exitAt={T(B.thisExit)} size={L.type.display} align="center" valign="top" fit box={g.title} leading={1} />
            <Headline
              text="It's small."
              at={T(B.small)}
              exitAt={T(B.smallExit)}
              entrance="blur"
              size={L.type.display}
              align="center"
              valign="top"
              box={g.title}
              leading={1}
            />
            <Headline
              text="It just went up against"
              variant="support"
              at={T(B.against)}
              exitAt={T(B.againstExit)}
              exit="fade"
              size={g.intro.size}
              color={C.stone1}
              align="center"
              valign="top"
              box={g.intro.box}
              leading={1}
            />
            {g.lines.map((l) => (
              <Monolith key={l.text} text={l.text} size={l.size} baseline={l.base} at={slams[l.slam]} t={t} dim={monoDim} />
            ))}
            <PebbleActor x={peb.x} y={peb.y} size={peb.size} cues={actorCues} hops={hops} pulses={slams.map((x) => x + 0.02)} pool glow={0.35} />
            <SameLine t={t} a={T(B.sameModel)} b={T(B.sameTasks)} size={g.mono.size} top={g.mono.top} />
          </AbsoluteFill>
        </Stage>
        {dip && <AbsoluteFill style={{ backgroundColor: rgba("ink0", 0.4) }} />}
      </AbsoluteFill>
    </FontGate>
  );
};
