// <ScreenZoom>: a Screen-Studio-style camera over a real take (an OffthreadVideo) or a still (an Img).
//
//   <FloatingWindow rect={L.feature.media}>
//     <ScreenZoom
//       src="launch/takes/RS4-07.mp4" srcSize={{ w: 2048, h: 1332 }}
//       time={rampTo({ srcIn: 44, srcEvent: 52.5, outEvent: 1.2 })}       // waits compressed, every frame real
//       keys={[{ t: 0, box: FULL }, { t: 1.1, box: KEYS, dur: 0.9 }, { t: 4.4, box: DISPLAY, dur: 0.7 }]}
//     />
//   </FloatingWindow>
//
// - Keys frame boxes of the source (its own px); the camera fits each to the view's aspect and glides between them
//   on the treatment's camera ease, zooming in log space. With keyTime="source" the keys' times are source seconds
//   (the take's event times), placed on the output through the time map's inverse.
// - The time map chooses which source frame each output frame shows (speed ramps); it snaps to the source's frame grid,
//   so every frame shown is a real frame of the take.
// - A slow push (`drift`, 1.2 %/s) keeps a held framing alive.
// - Camera motion blur: during fast moves the same source frame is drawn at the camera's poses across the shutter
//   (180°) and averaged (equal weights), so pans and zooms smear like a real camera's; still frames draw once.
// - `overlay` draws above the picture in view px, with a mapping from source px, for rings or highlights that must
//   follow the camera exactly.
// - Soft crop edges (`edgeFade`, on by default): wherever the camera's crop cuts into the picture, that side fades out
//   over a short distance (into the window's background), so text cut mid-word never reads as a hard slice; a side
//   where the crop meets the picture's own edge stays sharp. Frame the boxes on UI boundaries where you can.
import type { CSSProperties, ReactNode } from "react";
import { Freeze, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { cameraAt, viewShift, type Box, type Size, type ZoomKey } from "../camera";
import { realTime, type TimeMap } from "../timeMap";
import { useWindowSize } from "./FloatingWindow";

export interface ScreenZoomProps {
  /** a path under video/public ("launch/takes/RS4-07.mp4") or a URL */
  src: string;
  /** the source's size in px */
  srcSize: Size;
  /** default: "image" for .png/.jpg/.jpeg/.webp, else "video" */
  media?: "video" | "image";
  /** camera keys (none: the whole source, cover-fit) */
  keys?: readonly ZoomKey[];
  /** whether the keys' `t` are output seconds (default) or source seconds */
  keyTime?: "output" | "source";
  /** output seconds → source seconds; default real time from `srcStart` */
  time?: TimeMap;
  srcStart?: number;
  /** the source's frame rate, to snap to its frames (default 60) */
  srcFps?: number;
  /** the source's length, seconds: times past it hold its last frame */
  srcDuration?: number;
  /** slow push-in per second (default 0.012) */
  drift?: number;
  /** most samples for the camera motion blur (default 6; false: off) */
  motionBlur?: number | false;
  /** shutter angle, degrees (default 180) */
  shutter?: number;
  /** the view, px (default: the enclosing FloatingWindow, else the frame) */
  width?: number;
  height?: number;
  /** a grade on the picture (1 = as captured) */
  grade?: { brightness?: number; contrast?: number; saturate?: number };
  overlay?: (toView: (p: { x: number; y: number }) => { x: number; y: number }, scale: number, t: number) => ReactNode;
  /**
   * Soft edges where the crop cuts into the picture: "auto" (default) fades each cut side over 6 % of the view's
   * shorter side; a number fades over that many px (at 1080p); false keeps hard edges.
   */
  edgeFade?: "auto" | number | false;
  style?: CSSProperties;
}

const isImage = (src: string) => /\.(png|jpe?g|webp|avif)$/i.test(src);
const resolve = (src: string) => (/^(https?:|data:|blob:)/.test(src) ? src : staticFile(src.replace(/^\//, "")));

export const ScreenZoom: React.FC<ScreenZoomProps> = ({
  src,
  srcSize,
  media,
  keys = [],
  keyTime = "output",
  time,
  srcStart = 0,
  srcFps = 60,
  srcDuration,
  drift = 0.012,
  motionBlur = 6,
  shutter = 180,
  width,
  height,
  grade,
  overlay,
  edgeFade = "auto",
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const win = useWindowSize();
  const view: Size = { w: width ?? win?.w ?? W, h: height ?? win?.h ?? H };
  const t = frame / fps;
  const kind = media ?? (isImage(src) ? "image" : "video");
  const map = time ?? realTime(srcStart);

  // keys in output time
  const outKeys: ZoomKey[] = keyTime === "source" ? keys.map((k) => ({ ...k, t: map.inv(k.t) })) : [...keys];
  outKeys.sort((a, b) => a.t - b.t);

  // the source frame on show: snapped to the take's own frames
  let srcT = map.at(t);
  if (srcDuration !== undefined) srcT = Math.min(srcT, srcDuration - 1 / srcFps);
  srcT = Math.max(0, Math.round(srcT * srcFps) / srcFps);
  const srcAt = srcT * fps; // in composition frames
  const srcTrim = Math.floor(srcAt + 1e-6);
  const srcFrac = Math.max(0, srcAt - srcTrim);
  const url = resolve(src);

  // the camera now, and across the shutter for the blur
  const region = cameraAt(outKeys, t, view, srcSize, drift);
  const open = (shutter / 360) / fps; // seconds the shutter is open
  let samples: Box[] = [region];
  if (motionBlur && motionBlur > 1) {
    const before = cameraAt(outKeys, t - open, view, srcSize, drift);
    const shift = viewShift(before, region, view);
    if (shift > 1.2) {
      const n = Math.max(2, Math.min(motionBlur, Math.ceil(shift / 2.5)));
      samples = Array.from({ length: n }, (_, i) => cameraAt(outKeys, t - open * (1 - i / (n - 1)), view, srcSize, drift));
    }
  }

  const filter = grade
    ? [
        grade.brightness !== undefined && grade.brightness !== 1 ? `brightness(${grade.brightness})` : "",
        grade.contrast !== undefined && grade.contrast !== 1 ? `contrast(${grade.contrast})` : "",
        grade.saturate !== undefined && grade.saturate !== 1 ? `saturate(${grade.saturate})` : "",
      ]
        .join(" ")
        .trim() || undefined
    : undefined;

  const layer = (r: Box, i: number) => {
    const k = view.w / r.w;
    const st: CSSProperties = {
      position: "absolute",
      left: -r.x * k,
      top: -r.y * k,
      width: srcSize.w * k,
      height: srcSize.h * k,
      maxWidth: "none",
      // equal weights: the i-th layer from the bottom at 1/(i+1)
      opacity: i === 0 ? 1 : 1 / (i + 1),
    };
    // Freeze sets the TIMELINE frame, which Remotion clamps to the composition's length, so a source time past the
    // composition's end can't be frozen directly: trimBefore carries the whole frames and Freeze only the fraction.
    return kind === "video" ? (
      <Freeze key={i} frame={srcFrac}>
        <OffthreadVideo src={url} muted trimBefore={srcTrim > 0 ? srcTrim : undefined} style={st} />
      </Freeze>
    ) : (
      <Img key={i} src={url} style={st} />
    );
  };

  const k = view.w / region.w;
  const toView = (p: { x: number; y: number }) => ({ x: (p.x - region.x) * k, y: (p.y - region.y) * k });

  // soft edges on the sides where the crop cuts into the picture, growing with how much is cut away there
  let mask: string | undefined;
  if (edgeFade !== false) {
    const f = edgeFade === "auto" ? 0.06 * Math.min(view.w, view.h) : edgeFade * (H / 1080);
    const side = (hiddenSrcPx: number) => (f <= 0 ? 0 : f * Math.max(0, Math.min(1, (hiddenSrcPx * k) / f)));
    const l = side(region.x);
    const r = side(srcSize.w - region.x - region.w);
    const tp = side(region.y);
    const b = side(srcSize.h - region.y - region.h);
    if (l + r + tp + b > 0.5) {
      const h = `linear-gradient(to right, transparent 0px, #000 ${l.toFixed(1)}px, #000 calc(100% - ${r.toFixed(1)}px), transparent 100%)`;
      const v = `linear-gradient(to bottom, transparent 0px, #000 ${tp.toFixed(1)}px, #000 calc(100% - ${b.toFixed(1)}px), transparent 100%)`;
      mask = `${h}, ${v}`;
    }
  }
  const maskStyle: CSSProperties = mask
    ? { maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in" }
    : {};

  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: view.w, height: view.h, overflow: "hidden", ...style }}>
      <div style={{ position: "absolute", inset: 0, filter, ...maskStyle }}>{samples.map((r, i) => layer(r, i))}</div>
      {overlay ? <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>{overlay(toView, k, t)}</div> : null}
    </div>
  );
};
