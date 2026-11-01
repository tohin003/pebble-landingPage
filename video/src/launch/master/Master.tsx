// The launch film's master edit: every scene on the music (master/timeline.ts), the seams carried by the motion
// system's transition layers, the music under everything and the SFX lane (master/sfx.ts).
//
// Each scene plays live in its slot, starting exactly on its mark with durationInFrames = its slot's length. A seam
// borrows frozen frames on either side of the cut (the incoming scene's first frame before it, the outgoing scene's
// last frame after it) and wraps both in the seam's layer (WhipLayer, ScaleThroughLayer, SoftWipeLayer), so no scene
// is retimed by a transition.
import { Audio } from "@remotion/media";
import type { ReactNode } from "react";
import { AbsoluteFill, Freeze, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FontGate, ScaleThroughLayer, SoftWipeLayer, WhipLayer } from "../components";
import { MUSIC, MUSIC_PICK, type MusicId } from "../data/music";
import { ALL_SCENES } from "../scenes/Previews";
import { Placeholder } from "./Placeholder";
import { SFX_DIR, ducks, masterCues } from "./sfx";
import { SEAMS, TIMELINE, fr, seamAfter, seamBefore, type Seam } from "./timeline";

export interface MasterProps extends Record<string, unknown> {
  /** which music edit plays (data/music.ts); the timeline is written for A */
  music?: MusicId;
  /** false: the master's SFX lane is muted (scene-placed SFX, group C's, still play: use final.sh --music-only for a true music-only file) */
  sfx?: boolean;
  /** a trim on the whole SFX lane, dB */
  sfxDb?: number;
  /** the music's level, dB */
  musicDb?: number;
}

/** a seam the master carries with a layer (cuts and in-scene seams are plain cuts here) */
const isCarried = (s: Seam) => s.kind !== "cut" && s.kind !== "in-scene";

const db = (v: number) => Math.pow(10, v / 20);

/** Wraps a scene in its seam's layer while the seam's window is open; plain otherwise. */
const SeamLayer: React.FC<{ seam: Seam; role: "in" | "out"; progress: number; children: ReactNode }> = ({ seam, role, progress, children }) => {
  const { width: W, height: H } = useVideoConfig();
  if (seam.kind === "whip") return <WhipLayer progress={progress} role={role} direction={seam.direction}>{children}</WhipLayer>;
  if (seam.kind === "softWipe") return <SoftWipeLayer progress={progress} role={role} direction={seam.direction}>{children}</SoftWipeLayer>;
  if (seam.kind === "scaleThrough" && seam.rect) return <ScaleThroughLayer progress={progress} role={role} rect={seam.rect(W, H)}>{children}</ScaleThroughLayer>;
  return <AbsoluteFill>{children}</AbsoluteFill>;
};

/** One scene, its frozen head (before its slot, inside the seam in) and its frozen tail (after it, inside the seam out). */
const SceneSlot: React.FC<{ index: number }> = ({ index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slot = TIMELINE[index];
  const def = ALL_SCENES.find((s) => s.id === slot.id);
  const from = fr(slot.in, fps);
  const len = fr(slot.out, fps) - from;
  const before = seamBefore(index);
  const after = seamAfter(index);
  const head = before && isCarried(before) ? fr(before.pre, fps) : 0;
  const tail = after && isCarried(after) ? fr(after.post, fps) : 0;

  const scene = def ? <def.component durationInFrames={len} /> : <Placeholder slot={slot} />;

  // the seam's progress at this frame (0 → 1 across [cut − pre, cut + post])
  const progressOf = (seam: Seam, cutFrame: number) => {
    const a = cutFrame - fr(seam.pre, fps);
    const b = cutFrame + fr(seam.post, fps);
    return b > a ? (frame - a) / (b - a) : 1;
  };
  const wrap = (node: ReactNode) => {
    let out = node;
    if (before && isCarried(before)) {
      const p = progressOf(before, from);
      if (p > 0 && p < 1) out = <SeamLayer seam={before} role="in" progress={p}>{out}</SeamLayer>;
    }
    if (after && isCarried(after)) {
      const p = progressOf(after, from + len);
      if (p > 0 && p < 1) out = <SeamLayer seam={after} role="out" progress={p}>{out}</SeamLayer>;
    }
    return out;
  };

  return (
    <>
      {head > 0 && (
        <Sequence from={from - head} durationInFrames={head} name={`${slot.id} head (frozen)`}>
          {wrap(<Freeze frame={0}>{scene}</Freeze>)}
        </Sequence>
      )}
      <Sequence from={from} durationInFrames={len} name={slot.id}>
        {wrap(scene)}
      </Sequence>
      {tail > 0 && (
        <Sequence from={from + len} durationInFrames={tail} name={`${slot.id} tail (frozen)`}>
          {wrap(<Freeze frame={len - 1}>{scene}</Freeze>)}
        </Sequence>
      )}
    </>
  );
};

const MusicBed: React.FC<{ id: MusicId; level: number; duckList: { at: number; db: number; len: number }[] }> = ({ id, level, duckList }) => {
  const { fps } = useVideoConfig();
  const m = MUSIC[id];
  const volume = (f: number) => {
    const t = f / fps;
    let g = level;
    for (const d of duckList) {
      const x = t - d.at;
      if (x < -0.02 || x > d.len + 0.15) continue;
      // 20 ms in, held for len, 150 ms out
      const k = x < 0 ? (x + 0.02) / 0.02 : x <= d.len ? 1 : 1 - (x - d.len) / 0.15;
      g *= db(d.db * Math.max(0, Math.min(1, k)));
    }
    return g;
  };
  return <Audio src={staticFile(m.file)} volume={volume} name={`music ${m.id}`} />;
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
        <MusicBed id={music} level={db(musicDb)} duckList={sfx ? ducks(played) : []} />
        {sfx &&
          played.map((c, i) => (
            <Sequence key={`${c.file}-${i}`} from={Math.max(0, Math.round(c.at * fps))} layout="none" name={`sfx ${c.role} @${c.peak.toFixed(2)}`}>
              <Audio src={staticFile(SFX_DIR + c.file)} volume={db(c.db + sfxDb)} playbackRate={c.rate} />
            </Sequence>
          ))}
      </AbsoluteFill>
    </FontGate>
  );
};

/** For the scripts: the seams' windows in seconds (qa.sh's dense sheets). */
export const seamWindows = () =>
  SEAMS.map((s, i) => ({ id: `${s.from}→${TIMELINE[i + 1].id}`, kind: s.kind, at: TIMELINE[i].out, from: TIMELINE[i].out - Math.max(s.pre, 0.25), to: TIMELINE[i].out + Math.max(s.post, 0.25) }));
