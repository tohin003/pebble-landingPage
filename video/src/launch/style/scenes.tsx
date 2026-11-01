// The six style frames of "Riverstone" (TREATMENT §4), each a short scene that animates in and settles, laid out for
// 16:9 and 4:5 from the layout layer. They are the look's reference, not the film's scenes: scene workers copy their
// arrangements and build the real beats with the same components. Every scene takes its length from props and places
// its beats relative to its own start.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { BarCompare } from "../components/BarCompare";
import { FloatingWindow } from "../components/FloatingWindow";
import { Headline, textWidth } from "../components/Headline";
import { PebbleActor, VeilPebble, cues, look, lookBack, pose } from "../components/PebbleActor";
import { ScreenZoom } from "../components/ScreenZoom";
import { Stage } from "../components/Stage";
import { useLayout, type Layout } from "../layout";
import { rampTo } from "../timeMap";
import { tween } from "../timing";
import { C, EASE, TYPE } from "../tokens";
import { useWorld } from "../world";

export interface SceneProps {
  /** the scene's length, seconds */
  dur: number;
}

const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/* Inter's vertical metrics (Inter 4.0: ascender 1984, descender −494, cap height 1490 of 2048 units). */
const INTER = { asc: 1984 / 2048, desc: 494 / 2048, cap: 1490 / 2048 };
/** The baseline's distance from the top of a one-line block with line-height `lh`, in em. */
const baselineFromTop = (lh: number) => INTER.asc + (lh - (INTER.asc + INTER.desc)) / 2;
/** The pebble's body height and width as fractions of its viewBox size. */
const BODY_H = 0.5186;
const BODY_W = 0.5896;

/* ---------- (1) the cold open ---------- */

/** The cold open's arrangement: the pebble's foot and size, and the line's box. */
export const coldOpenGeometry = (L: Layout) => ({
  pebble: { x: L.centre.x, y: L.portrait ? L.px(870) : L.px(735), size: L.px(L.portrait ? 176 : 164) },
  textBox: L.portrait ? { x: L.content.x, y: L.px(450), w: L.content.w, h: L.px(250) } : { x: L.content.x, y: L.px(330), w: L.content.w, h: L.px(220) },
});

/**
 * Frame 0 is the thumbnail (rulings v1.1): a finished composition, the pebble awake and "This is Pebble." already
 * landed. From there the scene lives: the pebble glances up at its name and blinks; the light breathes.
 */
export const ColdOpen: React.FC<SceneProps> = () => {
  const L = useLayout();
  const g = coldOpenGeometry(L);
  return (
    <Stage keyLight={{ x: 0.5, y: 0.26, r: 0.78 }}>
      <PebbleActor x={g.pebble.x} y={g.pebble.y} size={g.pebble.size} cues={cues(pose(0, "idle"), look(0.55, 0, -0.75), lookBack(1.6))} pool />
      <Headline text="This is Pebble." at={-1} size={L.type.display} align="center" box={g.textBox} />
    </Stage>
  );
};

/* ---------- (2) the title lockup ---------- */

export const TITLE_TEXT = "Pebble *2.0*";
export const TITLE_SUB = "The desktop companion that does real work,\nand shows its evidence.";

/** Where the lockup's parts go on this layout: the pebble (foot and size), the name's box, the line's top. */
export const lockupGeometry = (L: Layout) => {
  const fs = L.type.hero;
  const lh = TYPE.title.lineHeight;
  const tw = textWidth(TITLE_TEXT, fs, "title", undefined, "same");
  const subSize = L.type.sub;
  const subH = 2 * subSize * TYPE.support.lineHeight;
  const capH = INTER.cap * fs;
  if (!L.portrait) {
    // [pebble] Pebble 2.0: the pebble's body as tall as the capitals, standing on the baseline
    const size = (capH / BODY_H) * 1.06;
    const gap = fs * 0.3;
    const groupW = size * BODY_W + gap + tw;
    const left = (L.W - groupW) / 2;
    const groupH = capH + fs * 0.5 + subH;
    const baseline = L.H / 2 - groupH / 2 + capH - L.px(10);
    return {
      fs,
      subSize,
      subH,
      pebble: { x: left + (size * BODY_W) / 2, y: baseline, size },
      titleBox: { x: left + size * BODY_W + gap, y: baseline - baselineFromTop(lh) * fs, w: tw + fs * 0.2, h: fs * lh },
      subTop: baseline + fs * 0.5,
      align: "left" as const,
    };
  }
  // 4:5: the pebble above, the name, the line
  const size = L.px(250);
  const bodyH = size * BODY_H;
  const groupH = bodyH + L.px(56) + capH + fs * 0.42 + subH;
  const pebbleTop = L.H / 2 - groupH / 2 - L.px(20);
  const baseline = pebbleTop + bodyH + L.px(56) + capH;
  return {
    fs,
    subSize,
    subH,
    pebble: { x: L.centre.x, y: pebbleTop + bodyH, size },
    titleBox: { x: L.content.x, y: baseline - baselineFromTop(lh) * fs, w: L.content.w, h: fs * lh },
    subTop: baseline + fs * 0.42,
    align: "center" as const,
  };
};

/** The name and the README's line, entering from `at` (the pebble is the scene's). */
export const LockupType: React.FC<{ at: number; subAt?: number }> = ({ at, subAt }) => {
  const L = useLayout();
  const W = useWorld();
  const g = lockupGeometry(L);
  return (
    <>
      <Headline
        text={TITLE_TEXT}
        variant="title"
        size={g.fs}
        accentFace="same"
        entrance="letters"
        at={at}
        align={g.align}
        valign="top"
        fit={false}
        box={g.titleBox}
      />
      <Headline
        text={TITLE_SUB}
        variant="support"
        size={g.subSize}
        color={W.ink2}
        at={subAt ?? at + 0.33}
        stagger={0.025}
        lineStagger={0.06}
        align="center"
        valign="top"
        fit={false}
        box={{ x: L.content.x, y: g.subTop, w: L.content.w, h: g.subH + L.px(20) }}
      />
    </>
  );
};

export const TitleLockup: React.FC<SceneProps> = () => {
  const L = useLayout();
  const t = useT();
  const g = lockupGeometry(L);
  return (
    <Stage energy={tween(t, [0, 0.35, 1.2], [0.7, 1.45, 1.15], EASE.camera)} keyLight={{ x: 0.5, y: 0.36, r: 0.8 }}>
      <PebbleActor x={g.pebble.x} y={g.pebble.y} size={g.pebble.size} cues={cues(pose(0, "idle"), pose(0.5, "happy"), pose(1.55, "idle"))} enter={{ at: 0.05, kind: "drop" }} glow={0.6} />
      <LockupType at={0.42} />
    </Stage>
  );
};

/* ---------- (3) a feature beat: real UI, zoomed ---------- */

/** RS4-07 (2048 × 1332, 60 fps): Calculator, driven by Pebble; "=" gives 600 at 56.43 s (frame 3386). */
const RS4 = {
  src: "launch/takes/RS4-07.mp4",
  size: { w: 2048, h: 1332 },
  equals: 56.43,
  /** the whole screen (the establishing framing) */
  screen: { x: 0, y: 0, w: 2048, h: 1332 },
  /** the Calculator window, with the task and the pebble in Pebble's activity panel beside it (≈1.8×) */
  calcAndPebble: { x: 548, y: 286, w: 1160, h: 820 },
  /** the keypad and the display alone (≈2.2×) */
  keys: { x: 560, y: 380, w: 900, h: 730 },
} as const;

export const FeatureApps: React.FC<SceneProps> = () => {
  const L = useLayout();
  const media = L.feature.media;
  const text = L.feature.text;
  // fast through the wait, 1× for the last presses; "=" (600) lands at 1.45 s
  const time = rampTo({ srcIn: 51.6, srcEvent: RS4.equals, outEvent: 1.45, land: 0.6, tail: 1 });
  return (
    <Stage world="desktop" desktop={{ src: RS4.src, srcSize: RS4.size, time, dim: 0.5 }}>
      <FloatingWindow rect={media} at={0} flattenAt={0.2} flattenDur={0.6} spill={0.5}>
        <ScreenZoom
          src={RS4.src}
          srcSize={RS4.size}
          time={time}
          keys={[
            // establish the workspace while the window lands and flattens, then one push (0.6 s) that arrives
            // before "=": the Calculator, the task and the pebble working, all real
            { t: 0, box: RS4.screen },
            { t: 0.8, box: RS4.screen },
            { t: 1.4, box: RS4.calcAndPebble },
          ]}
        />
      </FloatingWindow>
      <Headline text="Your apps." at={0.2} size={L.type.headline} align={L.feature.align} valign={L.portrait ? "bottom" : "middle"} box={text} />
    </Stage>
  );
};

/* ---------- (4) the benchmark card ---------- */

const FOOTNOTE =
  "Golden set 2.0, held-out split: 85 tasks in 17 families, 3 phrasings each, 255 runs per product. One model for both products in each comparison. Pebble 1.9.29, the source of 2.0.0. Full results, including time, in the 2.0.0 release notes.";

export const BenchmarkCard: React.FC<SceneProps> = () => {
  const L = useLayout();
  const titleBox = L.portrait
    ? { x: L.content.x, y: L.px(120), w: L.px(620), h: L.px(250) }
    : { x: L.content.x, y: L.px(110), w: L.px(1300), h: L.px(170) };
  // the pebble watches its bar (Pebble's own light-theme colours in daylight)
  const pebble = L.portrait ? { x: L.px(870), y: L.px(372), size: L.px(150) } : { x: L.px(1700), y: L.px(268), size: L.px(150) };
  return (
    <Stage world="daylight">
      <Headline
        text={L.portrait ? "Tasks done\ncorrectly." : "Tasks done correctly."}
        at={0.05}
        size={L.portrait ? L.type.title : L.px(104)}
        align="left"
        valign={L.portrait ? "bottom" : "middle"}
        box={titleBox}
      />
      <PebbleActor x={pebble.x} y={pebble.y} size={pebble.size} cues={cues(pose(0, "idle"), look(0.2, -0.5, 0.7), pose(1.25, "happy"))} />
      <BarCompare
        at={0.1}
        dur={1.0}
        unit="%"
        decimals={1}
        max={100}
        note="Both on claude-opus-5-5"
        rows={[
          { name: "Pebble", value: 92.2, detail: "235 of 255", ours: true },
          { name: "Claude Code", value: 83.5, detail: "213 of 255" },
        ]}
      />
      <Footnote text={FOOTNOTE} at={0.5} />
    </Stage>
  );
};

/** Small print under a chart: Inter at the layout's footnote size, mute, wrapped. */
export const Footnote: React.FC<{ text: string; at?: number }> = ({ text, at = 0 }) => {
  const L = useLayout();
  const W = useWorld();
  const t = useT();
  const p = EASE.enter(Math.max(0, Math.min(1, (t - at) / 0.5)));
  const b = L.foot;
  return (
    <div
      style={{
        position: "absolute",
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        display: "flex",
        alignItems: "flex-end",
        opacity: p,
        fontFamily: TYPE.support.fontFamily,
        fontVariationSettings: '"opsz" 14',
        fontWeight: 420,
        fontSize: L.type.foot,
        lineHeight: 1.45,
        color: W.small,
        letterSpacing: "0.003em",
      }}
    >
      <div style={{ maxWidth: L.portrait ? b.w : L.px(1180) }}>{text}</div>
    </div>
  );
};

/* ---------- (5) the accent card ---------- */

export const AccentCard: React.FC<SceneProps> = () => {
  const L = useLayout();
  const size = L.px(L.portrait ? 140 : 128);
  const foot = { x: L.centre.x, y: L.portrait ? L.px(980) : L.px(860) };
  const box = L.portrait
    ? { x: L.content.x, y: L.px(360), w: L.content.w, h: L.px(480) }
    : { x: L.content.x, y: L.px(240), w: L.content.w, h: L.px(470) };
  return (
    <Stage keyLight={{ x: 0.5, y: 0.3, r: 0.78 }}>
      <Headline text={"Small pebble.\n*Real work.*"} at={0.1} size={L.type.display * 1.08} align="center" lineStagger={0.14} box={box} leading={1.02} />
      <PebbleActor x={foot.x} y={foot.y} size={size} cues={cues(pose(0, "idle"), look(0.4, 0, -0.6))} pool enter={{ at: 0.55, kind: "pop" }} />
    </Stage>
  );
};

/* ---------- (6) Stealth Lockdown: the dusk look ---------- */

export const HONEST_LINE =
  "Hidden from screen capture and screen sharing, not from a camera, a capture card or a process list. Exams and interviews that forbid assistants still forbid it.";

export const StealthLook: React.FC<SceneProps> = () => {
  const L = useLayout();
  const t = useT();
  const veilSize = L.px(L.portrait ? 330 : 420);
  const foot = L.portrait ? { x: L.centre.x, y: L.px(560) } : { x: L.px(430), y: L.px(700) };
  const col = L.portrait ? { x: L.content.x, w: L.content.w } : { x: L.px(800), w: L.px(1000) };
  const askBox = L.portrait ? { ...col, y: L.px(626), h: L.px(60) } : { ...col, y: L.px(176), h: L.px(76) };
  const textBox = L.portrait ? { ...col, y: L.px(692), h: L.px(110) } : { ...col, y: L.px(256), h: L.px(140) };
  const bodyBox = L.portrait ? { ...col, y: L.px(836), h: L.px(300) } : { ...col, y: L.px(436), h: L.px(420) };
  const p = EASE.enter(Math.max(0, Math.min(1, (t - 0.6) / 0.6)));
  return (
    <Stage tint="dusk" keyLight={L.portrait ? { x: 0.5, y: 0.26, r: 0.8 } : { x: 0.24, y: 0.5, r: 0.7 }}>
      <VeilPebble x={foot.x} y={foot.y} size={veilSize} veil={[{ at: 0.1, on: true }]} initial={false} glow={tween(t, [0.1, 0.9], [0.2, 1])} cues={cues(look(1.2, 0.6, -0.2))} />
      <Headline text="Presenting?" variant="support" weight={520} size={L.type.sub} color={C.duskHi} at={0.1} entrance="blur" align="left" valign="bottom" box={askBox} fit={false} />
      <Headline text="Stealth Lockdown." at={0.3} size={L.type.title} align="left" valign="top" box={textBox} />
      <div style={{ opacity: p, transform: `translateY(${((1 - p) * 16 * L.u).toFixed(2)}px)` }}>
        <Headline text={HONEST_LINE} variant="support" size={L.portrait ? L.type.body : L.type.sub} color={C.stone1} wrap balance fit={false} align="left" valign="top" box={bodyBox} at={0.6} entrance="line" leading={1.3} />
      </div>
    </Stage>
  );
};
