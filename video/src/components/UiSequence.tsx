// A PNG frame sequence of the real UI, recorded frame by frame by lane D's capture/record.mjs (vclock mode):
// <dir>/00001.png, 00002.png … plus timeline.json. Placed in world units like a UiStill (one unit = one CSS px of
// the recorded viewport). Recorded just in time into video/public/ui-frames/<shot> (gitignored, deleted after use).
//
// Timing: source frame i (0-based) shows on local frame `startAt + i / rate` (source fps = composition fps unless
// `sourceFps` says otherwise). Before `startAt` and after the last frame it holds the first or last frame.
// If the frames are not on disk yet, `fallback` renders instead (a UiStill of the same state), so the film stays
// renderable before the just-in-time recording; `strict` makes a missing sequence an error (use it for masters).
import type { CSSProperties, ReactNode } from "react";
import { Img, getStaticFiles, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export interface UiSequenceProps {
  /** folder under public/, e.g. "ui-frames/main-live-film-light" */
  dir: string;
  /** frames recorded (timeline.json "frames") */
  frames: number;
  /** CSS size of the recorded viewport (record.mjs: main-live-film 1160 × 800, pet-live-error 384 × 456) */
  width: number;
  height: number;
  /** local frame on which source frame `from` shows */
  startAt?: number;
  /** first source frame (0-based) */
  from?: number;
  /** playback rate (2 = twice as fast) */
  rate?: number;
  /** the recording's fps (record.mjs default 30) */
  sourceFps?: number;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fallback?: ReactNode;
  strict?: boolean;
  style?: CSSProperties;
}

const pad5 = (n: number) => String(n).padStart(5, "0");

const sequenceOnDisk = (dir: string) => {
  try {
    const first = `${dir.replace(/\/$/, "")}/00001.png`;
    return getStaticFiles().some((f) => f.name === first);
  } catch {
    return false;
  }
};

/** The 0-based source frame shown on local frame `frame`. */
export const sequenceIndex = (
  frame: number,
  opts: { frames: number; startAt?: number; from?: number; rate?: number; sourceFps?: number; fps: number },
) => {
  const rate = (opts.rate ?? 1) * ((opts.sourceFps ?? opts.fps) / opts.fps);
  const i = (opts.from ?? 0) + Math.floor((frame - (opts.startAt ?? 0)) * rate + 1e-6);
  return Math.max(0, Math.min(opts.frames - 1, i));
};

export const UiSequence: React.FC<UiSequenceProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { dir, width, height, x = 0, y = 0, w, h, fallback, strict = false, style } = props;
  if (!sequenceOnDisk(dir)) {
    if (strict) throw new Error(`UiSequence: no frames in public/${dir} (record them with capture/record.mjs)`);
    return <>{fallback ?? null}</>;
  }
  const i = sequenceIndex(frame, { ...props, fps });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w ?? width, height: h ?? height, ...style }}>
      <Img
        src={staticFile(`${dir.replace(/\/$/, "")}/${pad5(i + 1)}.png`)}
        style={{ position: "absolute", left: 0, top: 0, width: w ?? width, height: h ?? height, display: "block" }}
      />
    </div>
  );
};
