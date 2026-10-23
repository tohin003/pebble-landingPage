// The feature loops' shared vocabulary (lane G2b; docs/FILM_SPEC.md §16, MASTER_PLAN §5.3, DESIGN.md §6).
//
// Every loop is FRAMED (critic H6, DESIGN §6): the riverbed desktop is its own ground, edge to edge, and the real UI sits
// in a stage on it: a rounded viewport with the window shadow, the camera working inside it (world units = UI CSS px,
// so the camera's zoom is the magnification m). The page then puts the whole video in its own riverbed frame.
//
// Seam rules (R5 §2.2, FILM_SPEC §16), which every loop here keeps and loops.test.ts checks on the data:
// - exactly N frames, frame N ≡ frame 0, frame N is never rendered (durationInFrames = N);
// - the camera pose at the last frame equals frame 0's, and the return move ends at least 12 frames before N;
// - no cursor at either end; nothing periodic (no grain, glow or drift);
// - a reset is a real UI action or a 0.4 s time-passage dissolve (2 px blur), never a fade to a colour.
//
// Real UI only (D4, critic C3): captured stills (UiStill) and vclock recordings (RecFrame) of Pebble 1.0.1. A press is
// a 4 % darkening for 4 frames drawn over the pressed control; a ring is a drawn-on annotation (components/Annotation).
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { Img, getStaticFiles, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera, Desktop, World } from "../components";
import type { CamPose, Point, Rect } from "../motion/camera";
import { COLOR, EASE, SPRING, ramp, springAt } from "../motion/spec";

/* ---------------------------------------------------------------------------------------------------------------- */
/* Aspects                                                                                                           */

export const LOOP_FPS = 30;
/** "wide": the page's 16:10 loop (1600 × 1000); "tall": the 4:5 phone punch-in (1080 × 1350, critic H2). */
export type LoopAspect = "wide" | "tall";
export const LOOP_SIZE = { wide: { width: 1600, height: 1000 }, tall: { width: 1080, height: 1350 } } as const;
export type ByAspect<T> = Readonly<Record<LoopAspect, T>>;
export const aspectOf = (width: number, height: number): LoopAspect => (width >= height ? "wide" : "tall");
export const useLoopAspect = (): LoopAspect => {
  const { width, height } = useVideoConfig();
  return aspectOf(width, height);
};

/** A ROI given as x0–x1, y0–y1 (FILM_SPEC's notation), in UI CSS px. */
export const roi = (x0: number, x1: number, y0: number, y1: number): Rect => ({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });

/**
 * The pose that shows the world region whose top-left corner is (x0, y0) at the stage's top-left corner, magnified m:
 * the region then spans the whole stage (stage.w / m by stage.h / m world units).
 */
export const fromTopLeft = (x0: number, y0: number, m: number, stage: Rect): CamPose => ({
  x: x0 + stage.w / (2 * m),
  y: y0 + stage.h / (2 * m),
  zoom: m,
});
/** The pose that puts world point `world` at stage point `at` (stage px from its top-left), magnified m. */
export const pinAt = (world: Point, at: Point, m: number, stage: Rect): CamPose => ({
  x: world.x - (at.x - stage.w / 2) / m,
  y: world.y - (at.y - stage.h / 2) / m,
  zoom: m,
});
/** The world region a pose shows in a stage. */
export const viewOf = (pose: CamPose, stage: Rect): Rect => ({
  x: pose.x - stage.w / (2 * pose.zoom),
  y: pose.y - stage.h / (2 * pose.zoom),
  w: stage.w / pose.zoom,
  h: stage.h / pose.zoom,
});
/** Scale a pose's zoom by s about world point p, so p stays where it is in the frame (a match cut's 1.04 → 1.0). */
export const zoomAbout = (pose: CamPose, p: Point, s: number): CamPose => ({
  x: p.x - (p.x - pose.x) / s,
  y: p.y - (p.y - pose.y) / s,
  zoom: pose.zoom * s,
});
/** A match cut's arrival scale: 1.04 on the cut frame, settling to 1.0 on the calm spring (FILM_SPEC S5b). */
export const settleScale = (frame: number, at: number, fps: number, from = 1.04): number =>
  frame < at ? 1 : 1 + (from - 1) * (1 - springAt(frame, fps, at, SPRING.calm));

/* ---------------------------------------------------------------------------------------------------------------- */
/* Ground and stage                                                                                                  */

/** The riverbed desktop filling the frame, still (DESIGN §1: the world that frames product media). */
export const Ground: React.FC = () => {
  const { width, height } = useVideoConfig();
  const zoom = Math.max(width / 1600, height / 1000);
  return (
    <Camera pose={{ x: 800, y: 500, zoom }}>
      <World>
        <Desktop />
      </World>
    </Camera>
  );
};

/** Which stage corners are rounded; the others bleed off the frame. */
export type Corners = "all" | "top" | "left" | "topLeft" | "none";
const radii = (c: Corners, r: number) =>
  c === "all" ? `${r}px` : c === "top" ? `${r}px ${r}px 0 0` : c === "left" ? `${r}px 0 0 ${r}px` : c === "topLeft" ? `${r}px 0 0 0` : "0";

/** The stage's window shadow (film-scale, tinted; the same as the film's Stage). */
const stageShadow = (k = 1) => {
  const rgb = COLOR.shadowRgb;
  return `0 0 0 1px rgba(${rgb}, ${(0.08 * k).toFixed(3)}), 0 2px 4px rgba(${rgb}, ${(0.06 * k).toFixed(3)}), 0 14px 36px rgba(${rgb}, ${(0.1 * k).toFixed(3)}), 0 44px 96px rgba(${rgb}, ${(0.14 * k).toFixed(3)})`;
};

const StageContext = createContext<Rect | null>(null);

export interface StageProps {
  /** the stage's rect, frame px */
  rect: Rect;
  corners?: Corners;
  radius?: number;
  /** what shows where no layer draws (Pebble's window background) */
  background?: string;
  /** layers (StageLayer), drawn in order and clipped by the stage */
  children: ReactNode;
}

/** A rounded viewport into Pebble's real UI with the window shadow. Its StageLayers are clipped by it. */
export const LoopStage: React.FC<StageProps> = ({ rect, corners = "all", radius = 28, background = "#F7F8F5", children }) => (
  <div
    style={{
      position: "absolute",
      left: rect.x,
      top: rect.y,
      width: rect.w,
      height: rect.h,
      borderRadius: radii(corners, radius),
      overflow: "hidden",
      background,
      boxShadow: stageShadow(),
      // keep the rounded clip on composited children (Chrome)
      isolation: "isolate",
    }}
  >
    <StageContext.Provider value={rect}>{children}</StageContext.Provider>
  </div>
);

/** One camera layer inside a LoopStage: its children are in world units (UI CSS px of the capture). */
export const StageLayer: React.FC<{ pose: CamPose; opacity?: number; blur?: number; children: ReactNode }> = ({
  pose,
  opacity = 1,
  blur = 0,
  children,
}) => {
  const rect = useContext(StageContext);
  if (!rect) throw new Error("StageLayer must be inside a LoopStage");
  if (opacity <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: Math.min(1, opacity),
        filter: blur > 0.02 ? `blur(${blur.toFixed(2)}px)` : undefined,
      }}
    >
      <Camera pose={pose} viewport={{ width: rect.w, height: rect.h }} background="transparent">
        <World>{children}</World>
      </Camera>
    </div>
  );
};

/**
 * Frame-space things that follow a stage's camera without its clip (the cursor, which travels in from outside the
 * stage; rings): children use useCamera(), whose world units are the stage's.
 */
export const StageOverlay: React.FC<{ rect: Rect; pose: CamPose; children: ReactNode }> = ({ rect, pose, children }) => (
  <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, pointerEvents: "none" }}>
    <Camera pose={pose} viewport={{ width: rect.w, height: rect.h }} background="transparent" clip={false}>
      {children}
    </Camera>
  </div>
);

/* ---------------------------------------------------------------------------------------------------------------- */
/* Real UI: recordings                                                                                               */

/** A vclock recording by capture/record.mjs: numbered PNGs (00001.png = source time 0) in video/public/<dir>. */
export interface Recording {
  dir: string;
  /** frames on disk (timeline.json "frames") */
  frames: number;
  /** the recorded viewport, CSS px */
  width: number;
  height: number;
  /** how to make it again (for the error message) */
  make: string;
}

export const RECORDINGS = {
  /** C8's main-window sequence, 3x, 0–22.97 s (lane G2a's just-in-time recording; FILM_SPEC §7.2) */
  mainLiveFilm: {
    dir: "ui-frames/main-live-film",
    frames: 690,
    width: 1160,
    height: 800,
    make: "scripts/heavy.sh rec capture/with-server.sh node capture/record.mjs main-live-film --theme=light --scale=3 --frames=690 --out=video/public/ui-frames/main-live-film",
  },
  /** the companion's quick chat with the pebble hidden, 3x, 0–8.97 s (R1; the films draw the pebble themselves) */
  petLive: {
    dir: "ui-frames/pet-live-error-light-hidden",
    frames: 270,
    width: 384,
    height: 456,
    make: "scripts/heavy.sh rec capture/with-server.sh node capture/record.mjs pet-live-error --theme=light --scale=3 --hide=.pet-avatar --out=video/public/ui-frames/pet-live-error-light-hidden",
  },
} as const satisfies Record<string, Recording>;

const pad5 = (n: number) => String(n).padStart(5, "0");
const onDisk = new Map<string, boolean>();
const recordingOnDisk = (rec: Recording) => {
  if (!onDisk.has(rec.dir)) {
    let ok = false;
    try {
      const last = `${rec.dir}/${pad5(rec.frames)}.png`;
      ok = getStaticFiles().some((f) => f.name === last);
    } catch {
      ok = false;
    }
    onDisk.set(rec.dir, ok);
  }
  return onDisk.get(rec.dir)!;
};

/** The 0-based recorded frame that shows source time t (record.mjs saves frame i at t = i / 30). */
export const recIndex = (rec: Recording, t: number) => Math.max(0, Math.min(rec.frames - 1, Math.round(t * LOOP_FPS)));

/** The recorded frame at source time `t`, placed in world units at (x, y) at the recording's CSS size. */
export const RecFrame: React.FC<{ rec: Recording; t: number; x?: number; y?: number; style?: CSSProperties }> = ({ rec, t, x = 0, y = 0, style }) => {
  if (!recordingOnDisk(rec)) {
    throw new Error(`Recording missing: public/${rec.dir} (${rec.frames} frames). Make it again with:\n  ${rec.make}`);
  }
  const i = recIndex(rec, t);
  return (
    <Img
      src={staticFile(`${rec.dir}/${pad5(i + 1)}.png`)}
      style={{ position: "absolute", left: x, top: y, width: rec.width, height: rec.height, display: "block", ...style }}
    />
  );
};

/**
 * A recorded frame with one region in focus (R5 §5.3's spotlight, as UiStill's card focus; lane G-fix, REVIEW-G2 P1-9):
 * everything outside `rect` recedes under a paper veil and a little blur, the region stays sharp. The pixels stay the
 * recording's own (D4, critic C3). `zoom` is the camera's, so the blur is given on screen.
 */
export const RecFocus: React.FC<{
  rec: Recording;
  t: number;
  /** the sharp region, CSS px of the recording */
  rect: Rect;
  /** 0..1 */
  amount: number;
  zoom: number;
  /** veil opacity at amount 1 (default 0.6, as S7c's) */
  veil?: number;
  /** on-screen blur at amount 1, px (default 10, as S7c's) */
  blur?: number;
  color?: string;
  radius?: number;
}> = ({ rec, t, rect, amount, zoom, veil = 0.6, blur = 10, color = WINDOW_BG, radius = 0 }) => {
  const a = Math.max(0, Math.min(1, amount));
  if (a <= 0.001) return <RecFrame rec={rec} t={t} />;
  const box: CSSProperties = { position: "absolute", left: 0, top: 0, width: rec.width, height: rec.height };
  const clip = `inset(${rect.y}px ${rec.width - rect.x - rect.w}px ${rec.height - rect.y - rect.h}px ${rect.x}px round ${radius}px)`;
  return (
    <>
      <RecFrame rec={rec} t={t} style={{ filter: `blur(${((blur * a) / Math.max(0.01, zoom)).toFixed(3)}px)` }} />
      <div style={{ ...box, background: color, opacity: veil * a }} />
      <div style={{ ...box, clipPath: clip }}>
        <RecFrame rec={rec} t={t} />
      </div>
    </>
  );
};

/** A source-time map: [loop frame, source seconds] keys, linear between them, holding before the first and after the
 *  last. Speeds may change at a key; time never runs backwards (FILM_SPEC §7). */
export type SrcKey = readonly [frame: number, seconds: number];
export const srcAt = (frame: number, keys: readonly SrcKey[]): number => {
  const first = keys[0];
  if (!first) return 0;
  if (frame <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, s1] = keys[i]!;
    const [f0, s0] = keys[i - 1]!;
    if (frame <= f1) return f1 === f0 ? s1 : s0 + ((s1 - s0) * (frame - f0)) / (f1 - f0);
  }
  return keys[keys.length - 1]![1];
};

/* ---------------------------------------------------------------------------------------------------------------- */
/* Small pieces                                                                                                      */

/** A pressed control (R5 §5.4): 4 % darker for 4 frames from the click-down frame. World units, inside a layer. */
export const PressShade: React.FC<{ rect: Rect; at: number; radius?: number; frames?: number }> = ({ rect, at, radius = 8, frames = 4 }) => {
  const frame = useCurrentFrame();
  if (frame < at || frame >= at + frames) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        borderRadius: radius,
        background: `rgba(${COLOR.shadowRgb}, 0.06)`,
      }}
    />
  );
};

/** A time-passage dissolve's progress: 0 before `at`, 1 after `at + dur`, eased in and out. */
export const dissolveAt = (frame: number, at: number, dur: number) => ramp(frame, at, dur, EASE.move);
/** The 2 px blur a time-passage dissolve puts on the picture that is leaving (and the one arriving). */
export const DISSOLVE_BLUR = 2;

/** A region of a layer fading away (a forgotten record): opacity 1 → 0 and 0 → 4 px of blur, accelerating. */
export const fadeAwayAt = (frame: number, at: number, dur: number) => ramp(frame, at, dur, EASE.exit);

/** The window background colour of Pebble's main window and Settings, for veils over a region. */
export const WINDOW_BG = "#F7F8F5";
export const PANEL_BG = "#FFFFFF";

/** A rect covering part of a picture with a flat colour (to hide a row in a still before it "arrives"). */
export const Cover: React.FC<{ rect: Rect; color: string; opacity?: number; style?: CSSProperties }> = ({ rect, color, opacity = 1, style }) =>
  opacity <= 0.001 ? null : (
    <div style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, background: color, opacity, ...style }} />
  );
