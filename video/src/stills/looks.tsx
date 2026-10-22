// The film's looks, built only from the core components and film/timeline.ts (re-derived from docs/FILM_SPEC.md), so
// the style frames of gate G1.5 (critic H11) are frames of the film itself: SF1 frame 0, SF2 the reveal lockup (540),
// SF3 the held run (985), SF4 Verified (1170), SF5 the end card (2280), SF6 the chart as the world (1700).
// Each look reads the ABSOLUTE film frame and adapts to the aspect through useLayout(). Real UI comes from lane D's
// stills until the just-in-time vclock sequences exist (FILM_SPEC §7, §17); lane G2 animates the shots between these
// looks on the same vocabulary and replaces the board's slates.
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Camera,
  CheckMark,
  ColourFlood,
  Cursor,
  Desktop,
  KineticText,
  PaperField,
  SageField,
  Stage,
  UiStill,
  Vignette,
  Wordmark,
  World,
  blockHeight,
  floodRadius,
  lockupGeometry,
  topForBaseline,
  type UiStillName,
} from "../components";
import {
  DESKTOP_RECT,
  END,
  FILM_PEBBLE_CUES,
  FRAMING,
  HOPS,
  PEBBLE_INSTANCES,
  PET,
  PET_FOOT,
  PET_PANEL,
  S1_CAMERA,
  TEXT,
  UI_POINTS,
  WORDMARK,
  type Framing,
  type PerAspect,
  type Point,
  type Rect,
  type TextCue,
} from "../film/timeline";
import { poseAt, rectCenter, toWorld, type CamKey, type CamPose } from "../motion/camera";
import { useLayout, type AspectId } from "../motion/layout";
import { COLOR, EASE, LOOK, ramp, sec, type TypoRole } from "../motion/spec";
import type { Hop } from "../pebble/acting";
import { PebbleOnFilm } from "../pebble/PebbleOnFilm";
import { PEBBLE_DARK, PEBBLE_LIGHT } from "../pebble/PebbleSvg";

/* ================================================================================================================
 * Shared bits
 * ============================================================================================================== */

const ROLE_TYPO: Record<TextCue["role"], TypoRole> = {
  hero: "display",
  headline: "display",
  side: "display",
  tagline: "display",
  support: "text",
  cta: "text",
  mono: "mono",
  small: "small",
};

/** Hops of a pebble instance, in the aspect's frame px. */
const hopsFor = (ids: readonly string[], a: AspectId, s: number): Hop[] =>
  HOPS.filter((h) => ids.includes(h.id)).map((h) => ({ at: h.at, to: { x: h.to[a].x * s, y: h.to[a].y * s }, duration: h.duration }));

const linesFor = (c: TextCue, a: AspectId) => (a === "square" && c.squareLines ? c.squareLines : c.lines);

/**
 * The window world's text column (16:9) or band (square), FILM_SPEC §4: a cue's lines start at the block top, a cue
 * marked `under` sits one gap under its anchor. FILM_SPEC §3's fit rule: if the group overflows its room (in the
 * square, the band ends where the stage starts), the anchor steps down 4 px at a time.
 */
function columnPlacement(cue: TextCue, L: ReturnType<typeof useLayout>): { top: number; size: number } {
  const anchor = cue.under ? TEXT.find((c) => c.id === cue.under) : cue;
  if (!anchor) return { top: L.win.text.y, size: L.type[cue.role] };
  const under = TEXT.filter((c) => c.under === anchor.id);
  const gap = Math.round(L.gap * 0.5);
  const room = L.aspect === "square" ? L.win.stage.y - L.win.text.y - Math.round(10 * L.s) : L.win.text.h;
  const underH = under.reduce((h, u) => h + gap + blockHeight(linesFor(u, L.aspect).length, L.type[u.role], ROLE_TYPO[u.role]), 0);
  let size = L.type[anchor.role];
  while (size > Math.round(64 * L.s) && blockHeight(linesFor(anchor, L.aspect).length, size, ROLE_TYPO[anchor.role]) + underH > room) size -= 4;
  if (cue === anchor) return { top: L.win.text.y, size };
  const anchorH = blockHeight(linesFor(anchor, L.aspect).length, size, ROLE_TYPO[anchor.role]);
  return { top: L.win.text.y + anchorH + gap, size: L.type[cue.role] };
}

/** A text cue of the timeline, placed and coloured as FILM_SPEC §3 and §8 say, for the world it sits in. */
export const CueText: React.FC<{ cue: TextCue; world: "sage" | "paper" | "window" }> = ({ cue, world }) => {
  const frame = useCurrentFrame();
  const L = useLayout();
  if (frame < cue.in - 1 || frame > cue.out + 8) return null;
  const lines = linesFor(cue, L.aspect);
  const typo = ROLE_TYPO[cue.role];
  const column = cue.place === "column" ? columnPlacement(cue, L) : null;
  const size = column ? column.size : L.type[cue.role];
  const onSage = world === "sage";
  const strong = cue.role === "headline" || cue.role === "side" || cue.role === "tagline" || cue.role === "mono" || cue.role === "hero";
  const color = strong ? (onSage ? LOOK.onSage : COLOR.ink) : onSage ? "rgba(255, 255, 255, 0.8)" : COLOR.secondary;
  const h = blockHeight(lines.length, size, typo);
  let box: Rect;
  let align: "left" | "center" = "center";
  if (column) {
    box = { x: L.win.text.x, y: column.top, w: L.win.text.w, h };
    align = "left";
  } else if (cue.place === "baseline") {
    box = { x: L.safe.x, y: topForBaseline((cue.y as PerAspect<number>)[L.aspect] * L.s, size, typo), w: L.safe.w, h };
  } else {
    const cy = (cue.y as PerAspect<number>)[L.aspect] * L.s;
    box = { x: L.safe.x, y: cy - h / 2, w: L.safe.w, h };
  }
  return (
    <KineticText
      lines={lines}
      role={cue.role}
      size={size}
      at={cue.in}
      exitAt={cue.out < END ? cue.out : undefined}
      enter={cue.enter}
      wordStarts={cue.wordStarts}
      color={color}
      inkFrom={cue.enter === "ink" && !onSage ? LOOK.stone : undefined}
      align={align}
      box={box}
    />
  );
};

/** Every text cue of a world that is on screen now. */
const CuesNow: React.FC<{ ids: readonly string[]; world: "sage" | "paper" | "window" }> = ({ ids, world }) => (
  <>
    {TEXT.filter((c) => ids.includes(c.id)).map((c) => (
      <CueText key={c.id} cue={c} world={world} />
    ))}
  </>
);

/* ================================================================================================================
 * S1 Hook (0–143): the pebble on its desktop (SF1), the pointer, the quick chat, the zoom through the pebble
 * ============================================================================================================== */

/** S1's camera: C0 (frame 0) → C1 (f40–63) → cut to C2 (f72) → the zoom through the pebble (f126–143). */
export function hookCamera(a: AspectId, width: number, height: number, s: number): CamKey[] {
  const P = PET.centre;
  const at = (p: Point) => ({ x: p.x * s, y: p.y * s });
  const c0 = poseAt(P, at(S1_CAMERA.c0.pebbleAt[a]), S1_CAMERA.c0.m * s, width, height);
  const c1 = poseAt(P, at(S1_CAMERA.c1.pebbleAt[a]), S1_CAMERA.c1.m * s, width, height);
  const c2 = poseAt(P, at(S1_CAMERA.c2.pebbleAt[a]), S1_CAMERA.c2.m * s, width, height);
  const k = PET.size / 220; // desktop units per viewBox unit
  const aim = { x: P.x + S1_CAMERA.zoomThrough.aim.x * k, y: P.y + S1_CAMERA.zoomThrough.aim.y * k };
  return [
    { at: 0, ...c0 },
    { at: 63, ...c1, dur: 23, path: "direct" },
    { at: 72, ...c2, dur: 1 },
    { at: 143, x: aim.x, y: aim.y, zoom: c2.zoom * S1_CAMERA.zoomThrough.scale, dur: 17, ease: EASE.exit, path: "direct" },
  ];
}

export const HookLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const keys = hookCamera(a, width, height, L.s);
  // the pointer enters from off-frame upper left at f8, reaches the pebble by f30, clicks on f36 and fades f44–48
  const from = toWorld({ x: -70 * L.s, y: (a === "wide" ? 210 : 160) * L.s }, keys[0]!, width, height);
  const chat: UiStillName | null = frame < 36 ? null : frame < 72 ? "pet-live-01-greeting" : "pet-live-02-thinking";
  return (
    <>
      <Camera keys={keys} bounds={DESKTOP_RECT}>
        <World>
          <Desktop />
          {chat ? (
            // the real quick chat, clipped to its card: the film draws the pebble itself (FILM_SPEC R1, avatar hidden)
            <UiStill name={chat} x={PET_PANEL.x} y={PET_PANEL.y} style={{ clipPath: "inset(0 0 96px 0)" }} />
          ) : null}
          <PebbleOnFilm cues={FILM_PEBBLE_CUES[a]} size={PET.size} x={PET_FOOT.x} y={PET_FOOT.y} />
        </World>
        <Cursor
          keys={[
            { at: 8, x: from.x, y: from.y },
            { at: 30, x: PET.centre.x - 12, y: PET.centre.y + 10, travel: 22, seed: "hook" },
          ]}
          clicks={[36]}
          visible={[[8, 48]]}
        />
      </Camera>
      <Vignette amount={0.06 * (1 - ramp(frame, 126, 12))} />
    </>
  );
};

/* ================================================================================================================
 * The sage field: S2 (questions), S3 (the intent line, the pebble rising in), S8 (the claims)
 * ============================================================================================================== */

export const SageLook: React.FC<{ ids: readonly string[]; pebble?: boolean }> = ({ ids, pebble }) => {
  const L = useLayout();
  const a = L.aspect;
  const main = PEBBLE_INSTANCES.main;
  return (
    <SageField>
      <CuesNow ids={ids} world="sage" />
      {pebble ? (
        <PebbleOnFilm
          cues={FILM_PEBBLE_CUES[a]}
          size={L.pebbleSize}
          x={main.start[a].x * L.s}
          y={main.start[a].y * L.s}
          hops={hopsFor(main.hops, a, L.s)}
          colors={PEBBLE_DARK}
        />
      ) : null}
      <Vignette amount={0.06} />
    </SageField>
  );
};

/* ================================================================================================================
 * S4 Reveal (504–647): the pebble lands as the full stop; paper floods out; the wordmark unrolls (SF2 at 540)
 * ============================================================================================================== */

export const RevealLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const g = lockupGeometry({ fontSize: L.type.hero, foot: L.lockup.foot, baseline: L.lockup.baseline, pebbleSize: L.pebbleSize });
  const w = WORDMARK.w1;
  const unroll = ramp(frame, w.unroll.at, w.unroll.dur, EASE.enter) * (1 - ramp(frame, w.rollBack.at, w.rollBack.dur, EASE.exit));
  const settle = ramp(frame, w.settle.at, w.settle.to - w.settle.at, EASE.enter);
  const tracking = `${interpolate(settle, [0, 1], [0.04, -0.035]).toFixed(4)}em`;
  const main = PEBBLE_INSTANCES.main;
  return (
    <>
      <SageField />
      <ColourFlood from={g.period} at={504} dur={13} radius={floodRadius(g.period, width, height)}>
        <PaperField pool={{ x: width / 2, y: g.baseline - g.fontSize * 0.25 }}>
          <Wordmark geometry={g} reveal={unroll} tracking={tracking} pebble={null} />
          <CuesNow ids={["T5"]} world="paper" />
          <Vignette amount={0.06} />
        </PaperField>
      </ColourFlood>
      <PebbleOnFilm
        cues={FILM_PEBBLE_CUES[a]}
        size={L.pebbleSize}
        x={main.start[a].x * L.s}
        y={main.start[a].y * L.s}
        hops={hopsFor(main.hops, a, L.s)}
        colors={frame >= main.lightFrom ? PEBBLE_LIGHT : PEBBLE_DARK}
      />
    </>
  );
};

/* ================================================================================================================
 * The window world (S5–S7a): the riverbed ground, the stage with the real UI, the text column, the pebble (SF3, SF4)
 * ============================================================================================================== */

/** The desktop ground around the stage: the whole riverbed, as a Mac shows it (no vignette in the window world). */
const WindowGround: React.FC = () => {
  const { width, height } = useVideoConfig();
  const zoom = Math.max(width / DESKTOP_RECT.w, height / DESKTOP_RECT.h);
  return (
    <Camera pose={{ x: DESKTOP_RECT.w / 2, y: DESKTOP_RECT.h / 2, zoom }}>
      <World>
        <Desktop />
      </World>
    </Camera>
  );
};

/** A stage camera key from a framing: the ROI's centre at the stage's centre, magnification m (× the layout scale). */
const fkey = (at: number, f: Framing, s: number, dur?: number): CamKey => ({
  at,
  x: f.roi.x + f.roi.w / 2,
  y: f.roi.y + f.roi.h / 2,
  zoom: f.m * s,
  dur,
  path: "direct",
});

interface WindowBeat {
  from: number;
  to: number;
  still: (frame: number) => UiStillName;
  keys: (a: AspectId, s: number) => CamKey[];
  text: readonly string[];
  /** click-down frame and its target (UI CSS px) */
  click?: { frame: number; at: Point };
  /** S5e's fallback: the Verified row revealed by a mask at f1152, and the check (16:9) */
  verified?: boolean;
}

/** The window world's beats (FILM_SPEC §6 S5–S7a) on lane D's stills; the vclock sequences replace them in G2. */
export const WINDOW_BEATS: readonly WindowBeat[] = [
  { from: 648, to: 720, still: () => "main-live-02-reading", keys: (a, s) => [fkey(648, FRAMING.s5a[a], s)], text: ["T6"] },
  {
    from: 720,
    to: 864,
    still: (f) => (f < 814 ? "main-approval" : "main-done"),
    keys: (a, s) => [fkey(720, FRAMING.s5a[a], s), fkey(743, FRAMING.s5bTop[a], s, 23), fkey(797, FRAMING.s5bLow[a], s, 23)],
    text: ["T7"],
    click: { frame: 810, at: { x: 1076, y: 672 } },
  },
  {
    from: 864,
    to: 1008,
    still: () => "held-unverified",
    keys: (a, s) => [fkey(864, FRAMING.s5c[a], s)],
    text: ["T8"],
    click: { frame: 990, at: rectCenter(UI_POINTS.runTests) },
  },
  {
    from: 1008,
    to: 1152,
    still: () => "held-tests-review",
    keys: (a, s) => (a === "square" ? [fkey(1008, FRAMING.s5d.square, s), fkey(1073, FRAMING.s5dSquareTilt, s, 23)] : [fkey(1008, FRAMING.s5d.wide, s)]),
    text: ["T9"],
    click: { frame: 1080, at: { x: 1079, y: 513 } },
  },
  {
    from: 1152,
    to: 1224,
    still: () => "main-done-timeline",
    keys: (a, s) => [fkey(1152, FRAMING.s5eRows[a], s), fkey(1211, FRAMING.s5eOut[a], s, 23)],
    text: ["T10"],
    click: { frame: 1224, at: UI_POINTS.gear },
    verified: true,
  },
  { from: 1224, to: 1332, still: () => "settings-models", keys: (a, s) => [fkey(1224, FRAMING.s6a[a], s)], text: ["T11", "T11s"] },
  {
    from: 1332,
    to: 1440,
    still: (f) => (f < 1404 ? "settings-permissions" : "settings-permissions-auto"),
    keys: (a, s) => (a === "square" ? [fkey(1332, FRAMING.s6a.square, s), fkey(1361, FRAMING.s6bSquareTilt, s, 23)] : [fkey(1332, FRAMING.s6a.wide, s)]),
    text: ["T12"],
  },
  {
    from: 1440,
    to: 1584,
    still: (f) => (f < 1542 ? "settings-memory" : "settings-memory-forgotten"),
    keys: (a, s) => [fkey(1440, FRAMING.s6a[a], s), fkey(1499, FRAMING.s6cRecords[a], s, 23)],
    text: ["T13"],
  },
  { from: 1584, to: 1656, still: () => "main-dashboard", keys: (a, s) => [fkey(1584, FRAMING.s7a[a], s)], text: ["T14"] },
];

export const WindowLook: React.FC = () => {
  const frame = useCurrentFrame();
  const L = useLayout();
  const a = L.aspect;
  const beat = WINDOW_BEATS.find((b) => frame >= b.from && frame < b.to) ?? WINDOW_BEATS[0]!;
  const keys = beat.keys(a, L.s);
  const click = beat.click;
  const row = UI_POINTS.verifiedRow;
  const reveal = beat.verified ? ramp(frame, 1152, sec(0.3, 30), EASE.enter) : 1;
  // the check's y: the Verified row's centre through the stage camera (its framing holds from f1152 to f1188)
  const k0 = keys[0]!;
  const rowFrameY = L.win.stage.y + L.win.stage.h / 2 + (row.y + row.h / 2 - k0.y) * k0.zoom;
  const main = PEBBLE_INSTANCES.main;
  const inFlight = frame < 652;
  return (
    <>
      <WindowGround />
      <Stage
        keys={keys}
        overlay={
          click ? (
            <Cursor
              keys={[
                { at: click.frame - 30, x: click.at.x + 260, y: click.at.y + 200 },
                { at: click.frame - 5, x: click.at.x + 4, y: click.at.y + 6, travel: 25, seed: `c${click.frame}` },
              ]}
              clicks={[click.frame]}
              visible={[[click.frame - 30, click.frame + 16]]}
            />
          ) : null
        }
      >
        <UiStill name={beat.still(frame)} />
        {beat.verified && reveal < 1 ? (
          <div style={{ position: "absolute", left: row.x + row.w * reveal, top: row.y, width: row.w * (1 - reveal) + 2, height: row.h, background: "#F7F8F5" }} />
        ) : null}
      </Stage>
      <CuesNow ids={beat.text} world="window" />
      {beat.verified && L.win.checkX !== null ? (
        <CheckMark at={{ x: L.win.checkX, y: rowFrameY }} space="frame" size={L.win.checkSize} stroke={6 * L.s} drawAt={1152} avoid={L.win.stage} />
      ) : null}
      <PebbleOnFilm
        cues={FILM_PEBBLE_CUES[a]}
        size={L.pebbleSize}
        x={inFlight ? main.start[a].x * L.s : L.win.pebble.foot.x}
        y={inFlight ? main.start[a].y * L.s : L.win.pebble.foot.y}
        hops={inFlight ? hopsFor(main.hops, a, L.s) : []}
      />
    </>
  );
};

/* ================================================================================================================
 * S7b (1656–1727): the chart becomes the world (SF6 at 1700); S7c (1728–1799): the quiz, full frame
 * ============================================================================================================== */

export const FullBleedLook: React.FC<{ still: UiStillName; pose: PerAspect<CamPose> }> = ({ still, pose }) => {
  const L = useLayout();
  const p = pose[L.aspect];
  return (
    <Camera pose={{ ...p, zoom: p.zoom * L.s }} background="#F7F8F5">
      <World>
        <UiStill name={still} />
      </World>
    </Camera>
  );
};

const CHART_POSE: PerAspect<CamPose> = {
  wide: { x: FRAMING.s7b.wide.centre.x, y: FRAMING.s7b.wide.centre.y, zoom: FRAMING.s7b.wide.m },
  square: { x: FRAMING.s7b.square.centre.x, y: FRAMING.s7b.square.centre.y, zoom: FRAMING.s7b.square.m },
};
const roiCentre = (f: Framing): CamPose => ({ x: f.roi.x + f.roi.w / 2, y: f.roi.y + f.roi.h / 2, zoom: f.m });
const QUIZ_POSE: PerAspect<CamPose> = { wide: roiCentre(FRAMING.s7c.wide), square: roiCentre(FRAMING.s7c.square) };

export const ChartWorldLook: React.FC = () => <FullBleedLook still="main-dashboard" pose={CHART_POSE} />;
export const QuizLook: React.FC = () => <FullBleedLook still="main-quiz" pose={QUIZ_POSE} />;

/* ================================================================================================================
 * S9 End card (2016–2303): the pebble carries in, paper floods out, the lockup, the tagline, the CTA (SF5 at 2280)
 * ============================================================================================================== */

export const EndCardLook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const L = useLayout();
  const a = L.aspect;
  const g = lockupGeometry({ fontSize: L.type.hero, foot: L.lockup.foot, baseline: L.lockup.baseline, pebbleSize: L.pebbleSize });
  const unroll = ramp(frame, WORDMARK.w2.unroll.at, WORDMARK.w2.unroll.dur, EASE.enter);
  const end = PEBBLE_INSTANCES.end;
  return (
    <>
      <SageField />
      <ColourFlood from={g.period} at={2016} dur={13} radius={floodRadius(g.period, width, height)}>
        <PaperField pool={{ x: width / 2, y: g.baseline - g.fontSize * 0.25 }}>
          <Wordmark geometry={g} reveal={unroll} pebble={null} />
          <CuesNow ids={["T18", "T19", "T20", "T21", "T22"]} world="paper" />
          <Vignette amount={0.06} />
        </PaperField>
      </ColourFlood>
      <PebbleOnFilm
        cues={FILM_PEBBLE_CUES[a]}
        size={L.pebbleSize}
        x={end.start[a].x * L.s}
        y={end.start[a].y * L.s}
        hops={hopsFor(end.hops, a, L.s)}
        colors={frame >= end.lightFrom ? PEBBLE_LIGHT : PEBBLE_DARK}
      />
    </>
  );
};
