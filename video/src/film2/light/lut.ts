// The film's one LUT, made in code (TREATMENT §5.4: "a subtle colour lookup table made in code, tested in FFmpeg";
// TOOLS_VIDEO §10.5: a code-made 33³ .cube through FFmpeg's lut3d needs no third-party LUT pack and no licence row).
//
// The look, kept subtle because the UI under it is real:
// - shadows lifted 2 % toward the brand's shade green (19, 37, 27), never toward black;
// - a soft shoulder above 0.88, so the sage-white page never clips to a flat white;
// - saturation −5 %, in linear light, so the sage accents keep their hue;
// - an optional section grade (light/grades.ts) baked in front of it, for a pass that has no in-render grade.
//
// Write it:   bun video/src/film2/light/write-lut.ts .work/film2/pebble-film-33.cube
// Finish with it (one FFmpeg job, through scripts/heavy.sh):
//   ffmpeg -i master.mp4 -vf "lut3d=file=pebble-film-33.cube:interp=tetrahedral,format=yuv420p" \
//     -c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p \
//     -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart -c:a copy graded.mp4
// The vignette stays in the render (light/Grade.tsx), because FFmpeg's vignette darkens toward black and the brand's
// shade is green. Grain stays off (OVERRIDES §8 H8); if the lead keeps it, add noise=alls=4:allf=t before format.
import { applyWashes, applyFilter, type Grade, type RGB } from "./grades";

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const toLin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

export interface FilmLook {
  /** how far the shadows lift toward the shade green (0..0.05) */
  lift: number;
  /** where the highlight shoulder starts (0.8..0.95) */
  shoulder: number;
  /** saturation, 1 = unchanged */
  saturation: number;
}
export const FILM_LOOK: FilmLook = { lift: 0.02, shoulder: 0.88, saturation: 0.95 };

// The shade green's direction, normalised to its brightest channel: black lifts to lift × (0.51, 1, 0.73).
const SHADE_DIR: RGB = [19 / 37, 1, 27 / 37];

/** The film look on one sRGB colour. */
export const filmLook = (c: RGB, look: FilmLook = FILM_LOOK): RGB => {
  // lift: the darks move toward the shade green, weighted by darkness (none at white)
  let out = c.map((v, i) => v + look.lift * SHADE_DIR[i]! * (1 - v) * (1 - v)) as RGB;
  // soft shoulder: compress values above the knee toward 1 smoothly (C1 at the knee)
  const k = look.shoulder;
  out = out.map((v) => (v <= k ? v : k + (1 - k) * Math.tanh((v - k) / (1 - k)))) as RGB;
  // saturation in linear light, about Rec. 709 luminance
  const lin = out.map(toLin) as RGB;
  const y = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  out = lin.map((v) => toSrgb(Math.max(0, y + (v - y) * look.saturation))) as RGB;
  return out.map(clamp01) as RGB;
};

/** A .cube file (Adobe/Resolve 3D LUT): `size`³ entries, red fastest, values 0..1. */
export const makeCube = (fn: (c: RGB) => RGB, size = 33, title = "Pebble film look"): string => {
  const lines = [`TITLE "${title}"`, `LUT_3D_SIZE ${size}`, "DOMAIN_MIN 0.0 0.0 0.0", "DOMAIN_MAX 1.0 1.0 1.0"];
  const n = size - 1;
  for (let b = 0; b < size; b++)
    for (let g = 0; g < size; g++)
      for (let r = 0; r < size; r++) {
        const o = fn([r / n, g / n, b / n]);
        lines.push(`${o[0].toFixed(6)} ${o[1].toFixed(6)} ${o[2].toFixed(6)}`);
      }
  return lines.join("\n") + "\n";
};

/** The master LUT: the film look alone (the section grades stay in the render). */
export const filmCube = (size = 33): string => makeCube((c) => filmLook(c), size, "Pebble film look (film2/light/lut.ts)");

/** A LUT that bakes a section grade and then the film look (for a still or a pass without in-render grading). */
export const gradeCube = (g: Grade, size = 33): string =>
  makeCube((c) => filmLook(applyWashes(applyFilter(c, g), g)), size, `Pebble ${g.name} grade + film look`);

/** The largest change the look makes to any colour of a set (0..1 per channel), for a "subtle" check. */
export const maxLookShift = (colors: readonly RGB[], look: FilmLook = FILM_LOOK): number =>
  Math.max(...colors.flatMap((c) => filmLook(c, look).map((v, i) => Math.abs(v - c[i]!))));
