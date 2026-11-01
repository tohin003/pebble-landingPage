// Scene group A (the bookends: S00 cold open, S01 title, S11 outro): helpers shared by the three scenes. Owned by the
// group's worker; nothing here is part of the motion system.
import { useCurrentFrame, useVideoConfig } from "remotion";
import { textWidth } from "../../components/Headline";
import type { Layout, Rect } from "../../layout";
import { TYPE } from "../../tokens";

/* Inter's vertical metrics (Inter 4.0: ascender 1984, descender −494, cap height 1490 of 2048 units). */
export const INTER = { asc: 1984 / 2048, desc: 494 / 2048, cap: 1490 / 2048 };
/** The baseline's distance from the top of a one-line block with line-height `lh`, in em. */
export const baselineFromTop = (lh: number) => INTER.asc + (lh - (INTER.asc + INTER.desc)) / 2;
/** The pebble's body height and width as fractions of its viewBox size (PebbleActor's `size`). */
export const BODY_H = 0.5186;
export const BODY_W = 0.5896;

/**
 * The scene's clock. Beats are choreographed in seconds for `nominalS`; when the director retimes the scene, `T(x)`
 * moves a beat proportionally (entrance and exit durations stay fixed), so the slack lands in the holds.
 */
export const useClock = (nominalS: number, durationInFrames?: number) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: compFrames } = useVideoConfig();
  const frames = durationInFrames ?? compFrames;
  const D = frames / fps;
  const k = D / nominalS;
  return { frame, fps, frames, D, k, t: frame / fps, T: (x: number) => x * k };
};

/** A one-line block whose baseline sits at `baseline` (px), `size` px, line-height `lh`. */
export const lineBox = (x: number, w: number, baseline: number, size: number, lh: number): Rect => ({
  x,
  y: baseline - baselineFromTop(lh) * size,
  w,
  h: size * lh,
});

export const TITLE_TEXT = "Pebble *2.0*";

/**
 * The lockup: [pebble] Pebble 2.0 on 16:9 (the body as tall as the capitals, standing on the baseline), the pebble
 * above the name on 4:5; `belowH` px of lines under the name, the group centred `lift` px above the frame's middle.
 */
export const lockupGeo = (L: Layout, belowH: number, lift = 0) => {
  const fs = L.type.hero;
  const lh = TYPE.title.lineHeight;
  const tw = textWidth(TITLE_TEXT, fs, "title", undefined, "same");
  const capH = INTER.cap * fs;
  if (!L.portrait) {
    const size = (capH / BODY_H) * 1.06;
    const gap = fs * 0.3;
    const groupW = size * BODY_W + gap + tw;
    const left = (L.W - groupW) / 2;
    const belowGap = fs * 0.5;
    const groupH = capH + belowGap + belowH;
    const baseline = L.H / 2 - groupH / 2 + capH - L.px(10) - lift;
    return {
      fs,
      pebble: { x: left + (size * BODY_W) / 2, y: baseline, size },
      titleBox: lineBox(left + size * BODY_W + gap, tw + fs * 0.2, baseline, fs, lh),
      baseline,
      belowTop: baseline + belowGap,
      align: "left" as const,
      bounds: { x: left, y: baseline - capH, w: groupW, h: capH },
    };
  }
  const size = L.px(250);
  const bodyH = size * BODY_H;
  const belowGap = fs * 0.42;
  const groupH = bodyH + L.px(56) + capH + belowGap + belowH;
  const pebbleTop = L.H / 2 - groupH / 2 - L.px(20) - lift;
  const baseline = pebbleTop + bodyH + L.px(56) + capH;
  return {
    fs,
    pebble: { x: L.centre.x, y: pebbleTop + bodyH, size },
    titleBox: lineBox(L.content.x, L.content.w, baseline, fs, lh),
    baseline,
    belowTop: baseline + belowGap,
    align: "center" as const,
    bounds: { x: (L.W - tw) / 2, y: pebbleTop, w: tw, h: baseline - pebbleTop },
  };
};

/** The night stage's small pebble, shared by the cold open and the outro (the bookend): centre-low, body ≈ 114 px tall at 1080p. */
export const stagePebble = (L: Layout) => ({
  x: L.centre.x,
  y: L.portrait ? L.px(990) : L.px(850),
  size: L.px(L.portrait ? 206 : 220),
});

/** A scene-local SFX suggestion (no files are in video/public/launch/audio/sfx yet): the director places them. */
export interface SfxSuggestion {
  scene: string;
  /** seconds from the scene's start at its nominal length: the effect's PEAK goes here (or 1 frame after) */
  s: number;
  kind: string;
  note: string;
}
