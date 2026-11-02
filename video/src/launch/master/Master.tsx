// The launch film's master edit: every scene on the music (master/timeline.ts), the seams carried by the master's seam
// layers (master/seams.tsx), the music under everything and the SFX lane (master/sfx.ts).
//
// Each scene is mounted ONCE, from a premount before its seam opens to the end of its tail, and never remounted: a
// remount (a new frozen head or tail, a new live copy) drew the takes' windows empty for a frame in draft 2 (REVIEW-1
// M1: 12.57, 31.80, 32.07, 56.07, 72.07 s). Inside its mount the scene sees:
//   premount   its first frame, frozen and invisible (its takes and stills are fetched and decoded before they show);
//   head       its first frame, frozen, inside the seam's layer (before the cut);
//   live       its own frames, exactly from its music mark (durationInFrames = its slot's length);
//   tail       its last frame, frozen, inside the seam's layer (after the cut).
// A frozen span never plays sound: its audio is held back from the render (a frozen <Audio> repeats one frame's slice).
// Every frame also waits for the compositor (PaintSettle) before Remotion takes its screenshot.
import { Audio } from "@remotion/media";
import { useContext, useLayoutEffect, useMemo, type ReactNode } from "react";
import {
  AbsoluteFill,
  Freeze,
  Internals,
  Sequence,
  continueRender,
  delayRender,
  getRemotionEnvironment,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FontGate } from "../components";
import { MUSIC, MUSIC_PICK, type MusicId } from "../data/music";
import { ALL_SCENES } from "../scenes/Previews";
import { Placeholder } from "./Placeholder";
import { SeamLayer } from "./seams";
import { SFX_DIR, musicDucks, masterCues, type Duck } from "./sfx";
import { SEAMS, TIMELINE, fr, isCarried, seamAfter, seamBefore, type Seam } from "./timeline";

export interface MasterProps extends Record<string, unknown> {
  /** which music edit plays (data/music.ts); the timeline is written for A */
  music?: MusicId;
  /** false: the master's SFX lane is muted (scene-placed SFX, groups B's and C's, still play: use final.sh --music-only for a true music-only file) */
  sfx?: boolean;
  /** a trim on the whole SFX lane, dB */
  sfxDb?: number;
  /** the music's level, dB */
  musicDb?: number;
}

const db = (v: number) => Math.pow(10, v / 20);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** frames a scene is mounted (frozen, invisible) before it first shows */
export const PREMOUNT_S = 1.0;

/* ---------- frozen spans make no sound ---------- */

type AssetCtx = React.ContextType<typeof Internals.RenderAssetManager>;
/** While `mute` is on, the subtree's audio assets are not registered with the render (other assets pass). */
const HoldAudio: React.FC<{ mute: boolean; children: ReactNode }> = ({ mute, children }) => {
  const ctx = useContext(Internals.RenderAssetManager);
  const value = useMemo<AssetCtx>(
    () =>
      mute
        ? {
            ...ctx,
            registerRenderAsset: (a) => {
              if (a.type === "audio" || a.type === "inline-audio") return;
              ctx.registerRenderAsset(a);
            },
          }
        : ctx,
    [ctx, mute],
  );
  return <Internals.RenderAssetManager.Provider value={value}>{children}</Internals.RenderAssetManager.Provider>;
};

/* ---------- every frame waits for the compositor ---------- */

/**
 * Holds each frame until every other delayRender() handle has cleared and three animation frames have passed with none
 * open, so the compositor has painted and rastered whatever the frame mounted or uncovered (a take's first frame, a
 * window under a new filter) before Remotion takes its screenshot. Rendering only. It waits up to 60 s: on the 8 GB
 * Mac a take's image decode can fail and retry for longer than 23 s under memory pressure (the 16:9 final's first
 * attempt, frame 792, 2 Nov), and a late frame is still a whole one.
 */
const PaintSettle: React.FC = () => {
  const frame = useCurrentFrame();
  useLayoutEffect(() => {
    if (!getRemotionEnvironment().isRendering || typeof window === "undefined") return;
    const handle = delayRender(`paint settle (frame ${frame})`, { timeoutInMilliseconds: 60000 });
    const w = window as unknown as { remotion_delayRenderHandles?: number[] };
    let live = true;
    let quiet = 0;
    let fallback: ReturnType<typeof setTimeout> | null = null;
    const done = () => {
      if (!live) return;
      live = false;
      if (fallback) clearTimeout(fallback);
      continueRender(handle);
    };
    const tick = () => {
      if (!live) return;
      if (fallback) clearTimeout(fallback);
      const open = (w.remotion_delayRenderHandles ?? []).filter((h) => h !== handle).length;
      quiet = open === 0 ? quiet + 1 : 0;
      if (quiet >= 3) return done();
      requestAnimationFrame(tick);
      // never hang on a page that stops producing animation frames
      fallback = setTimeout(tick, 120);
    };
    requestAnimationFrame(tick);
    return done;
  }, [frame]);
  return null;
};

/* ---------- one scene in its slot ---------- */

const SceneSlot: React.FC<{ index: number }> = ({ index }) => {
  const { fps } = useVideoConfig();
  const slot = TIMELINE[index];
  const def = ALL_SCENES.find((s) => s.id === slot.id);
  const from = fr(slot.in, fps);
  const len = fr(slot.out, fps) - from;
  const before = seamBefore(index);
  const after = seamAfter(index);
  const head = before && isCarried(before) ? fr(before.pre, fps) : 0;
  const tail = after && isCarried(after) ? fr(after.post, fps) : 0;
  const pre = Math.min(fr(PREMOUNT_S, fps), from - head);
  const start = from - head - pre;
  return (
    <Sequence from={start} durationInFrames={pre + head + len + tail} name={`${slot.id}${pre ? " (premounted)" : ""}`}>
      <SlotBody index={index} def={def} pre={pre} head={head} len={len} tail={tail} before={before} after={after} />
    </Sequence>
  );
};

const SlotBody: React.FC<{
  index: number;
  def: (typeof ALL_SCENES)[number] | undefined;
  pre: number;
  head: number;
  len: number;
  tail: number;
  before?: Seam;
  after?: Seam;
}> = ({ index, def, pre, head, len, tail, before, after }) => {
  const f = useCurrentFrame(); // local to the slot's mount
  const { fps } = useVideoConfig();
  const slot = TIMELINE[index];
  const sceneFrame = f - pre - head;
  const frozen = sceneFrame < 0 || sceneFrame >= len;
  const shown = Math.max(0, Math.min(len - 1, sceneFrame));
  const visible = f >= pre;

  // a seam's progress at this frame: 0 → 1 across [cut − its pre, cut + its post] (in frames, local to the mount)
  const prog = (seam: Seam, cutLocal: number) => {
    const a = fr(seam.pre, fps);
    const b = fr(seam.post, fps);
    return a + b > 0 ? clamp01((f - (cutLocal - a)) / (a + b)) : f >= cutLocal ? 1 : 0;
  };

  const scene = def ? <def.component durationInFrames={len} /> : <Placeholder slot={slot} />;
  // the scene's own clock: a Sequence starting at its music mark; Freeze holds its first or last frame outside its slot
  let out: ReactNode = (
    <Freeze frame={pre + head + shown} active={frozen}>
      <Sequence from={pre + head} durationInFrames={len} name={`${slot.id} (its own frames)`}>
        {scene}
      </Sequence>
    </Freeze>
  );
  // wrapped in its seams' layers for the whole mount (the layers are the identity at rest), so it never remounts
  if (before && isCarried(before)) {
    out = (
      <SeamLayer seam={before} role="in" progress={prog(before, pre + head)}>
        {out}
      </SeamLayer>
    );
  }
  if (after && isCarried(after)) {
    out = (
      <SeamLayer seam={after} role="out" progress={prog(after, pre + head + len)}>
        {out}
      </SeamLayer>
    );
  }
  void tail;
  return (
    <AbsoluteFill style={{ opacity: visible ? 1 : 0 }}>
      <HoldAudio mute={frozen}>{out}</HoldAudio>
    </AbsoluteFill>
  );
};

/* ---------- the music ---------- */

/**
 * The music starts one frame late. data/music.ts's beat grid sits about 27 ms after the file's own transients (music A:
 * 8.024 against 8.0507, 40.026 against 40.0523, 73.024 against 73.0538, 81.026 against 81.0542, measured on the file
 * alone; REVIEW-4 S-4), so every cut on a beat landed about 40 ms after its downbeat. One frame (33.3 ms) later, each
 * transient sits 8–10 ms before its cut, and the effects (placed on the picture's frames) meet it. The ducks stay on
 * the master's clock: the stop still ends at 81.0, so the payoff's downbeat (now 81.059) plays at full.
 * `final.sh --music-only` delays the bare music by the same frame.
 */
export const MUSIC_DELAY_FRAMES = 1;

const MusicBed: React.FC<{ id: MusicId; level: number; duckList: readonly Duck[] }> = ({ id, level, duckList }) => {
  const { fps } = useVideoConfig();
  const m = MUSIC[id];
  const volume = (f: number) => {
    // f counts from the music's own start, one frame into the film: the ducks are on the master's clock
    const t = (f + MUSIC_DELAY_FRAMES) / fps;
    let g = level;
    for (const d of duckList) {
      const x = t - d.at;
      if (x < -d.attack || x > d.len + d.release) continue;
      // `attack` s down to the duck, held for `len`, `release` s back
      const k = x < 0 ? (x + d.attack) / d.attack : x <= d.len ? 1 : 1 - (x - d.len) / d.release;
      g *= db(d.db * clamp01(k));
    }
    return g;
  };
  return (
    <Sequence from={MUSIC_DELAY_FRAMES} layout="none" name={`music ${m.id} (one frame late)`}>
      <Audio src={staticFile(m.file)} volume={volume} name={`music ${m.id}`} />
    </Sequence>
  );
};

export const Master: React.FC<MasterProps> = ({ music = MUSIC_PICK, sfx = true, sfxDb = 0, musicDb = 0 }) => {
  const { fps } = useVideoConfig();
  const cues = masterCues();
  const played = cues.filter((c) => !c.sceneOwned);
  return (
    <FontGate>
      <AbsoluteFill style={{ backgroundColor: "#070B09" }}>
        {TIMELINE.map((_, i) => (
          <SceneSlot key={TIMELINE[i].id} index={i} />
        ))}
        <MusicBed id={music} level={db(musicDb)} duckList={musicDucks(sfx ? played : [])} />
        {sfx &&
          played.map((c, i) => (
            <Sequence key={`${c.file}-${i}`} from={Math.max(0, Math.round(c.at * fps))} layout="none" name={`sfx ${c.role} @${c.peak.toFixed(2)}`}>
              <Audio src={staticFile(SFX_DIR + c.file)} volume={db(c.db + sfxDb)} playbackRate={c.rate} />
            </Sequence>
          ))}
        <PaintSettle />
      </AbsoluteFill>
    </FontGate>
  );
};

/** For the scripts: the seams' windows in seconds (qa.sh's dense sheets). */
export const seamWindows = () =>
  SEAMS.map((s, i) => ({ id: `${s.from}→${TIMELINE[i + 1].id}`, kind: s.kind, at: TIMELINE[i].out, from: TIMELINE[i].out - Math.max(s.pre, 0.25), to: TIMELINE[i].out + Math.max(s.post, 0.25) }));
