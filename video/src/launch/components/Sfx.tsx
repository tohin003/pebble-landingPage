// Sound effects at seconds (TREATMENT §4 "Sound": SFX 6-12 dB under the music). Raw audio is gitignored; the files live
// under video/public/launch/audio/.
//
//   <Sfx src="launch/audio/sfx/whoosh.wav" at={2.9} db={-9} />
//   <SfxTrack cues={[{ src: TAP, at: 1.20 }, { src: TAP, at: 1.42, db: -12 }]} />
import { Audio } from "@remotion/media";
import { Sequence, staticFile, useVideoConfig } from "remotion";

export interface SfxCue {
  /** a path under video/public, or a URL */
  src: string;
  /** seconds, local to the enclosing Sequence */
  at: number;
  /** linear volume 0..1 (default 1), or `db` */
  volume?: number;
  /** gain in dB (wins over `volume`) */
  db?: number;
  /** skip the file's first seconds */
  trim?: number;
  /** play at most this long, seconds */
  dur?: number;
  /** speed (and pitch) */
  rate?: number;
  /** a fade-out over the last seconds of `dur` */
  fadeOut?: number;
}

const resolve = (src: string) => (/^(https?:|data:|blob:)/.test(src) ? src : staticFile(src.replace(/^\//, "")));
export const dbToGain = (db: number) => Math.pow(10, db / 20);

export const Sfx: React.FC<SfxCue> = ({ src, at, volume = 1, db, trim = 0, dur, rate = 1, fadeOut = 0 }) => {
  const { fps } = useVideoConfig();
  const gain = db === undefined ? volume : dbToGain(db);
  const len = dur === undefined ? undefined : Math.max(1, Math.round(dur * fps));
  const vol = (f: number) => {
    if (!len || fadeOut <= 0) return gain;
    const fade = Math.round(fadeOut * fps);
    return gain * Math.max(0, Math.min(1, (len - f) / Math.max(1, fade)));
  };
  return (
    <Sequence from={Math.round(at * fps)} durationInFrames={len} layout="none" name={`sfx ${src.split("/").pop()} @${at.toFixed(2)}s`}>
      <Audio src={resolve(src)} volume={vol} trimBefore={trim > 0 ? Math.round(trim * fps) : undefined} playbackRate={rate} />
    </Sequence>
  );
};

export const SfxTrack: React.FC<{ cues: readonly SfxCue[] }> = ({ cues }) => (
  <>
    {cues.map((c, i) => (
      <Sfx key={i} {...c} />
    ))}
  </>
);
