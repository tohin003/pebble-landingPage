// THE RETURN'S CELL THUMBNAILS (MONTAGE_DESIGN §6: "at most 46 cell planes plus the stone are on screen, from
// thumbnails"; OVERRIDES §61). Every cell is drawn from ONE small image, except the first cell, which Pebble's own code
// draws live (S24's own last frame, views/ReturnView.tsx; a stand-in of kind "engine" would be too, but none is: it
// pictures a second pebble, RV-01). The image is the cell's stand-in as returnCells.ts names it, made once by
// setpieces/tools/return-thumbs.ts into video/public/ui/f2-cells/return (gitignored, like every capture). Its file name
// carries a signature of what it shows (returnThumbSig), so a changed stand-in names a new file: the view never draws
// an image made for an earlier manifest, and one not made yet stops a render (views/ReturnView.tsx, RV-10):
//   a still   the published capture's own pixels, cropped where the manifest says, never stretched: a "cover" crop is
//             4:3 already and is only scaled; a "contain" crop sits centred on its own ground (the crop's corner, or
//             the page's sage-white where the corner is clear), the way returnChecks.ts cellTextPxOf reads it
//   a slot    a labelled placeholder panel at the 2.0.0 crop's expected size (480 × 360 CSS px): the cell's id, the
//             capture that fills it and what it will show, its largest text the manifest's textPx (cellText holds it
//             under 16 px at 1080 on screen), on the slots' hatch; never drawn UI
// When the 2.0.0 snapshot exists, its crops replace the stand-ins through the manifest and the same tool remakes the
// images; nothing here or in the view changes.
// Pure data; no React.
import { RETURN_CELLS, type ReturnCellSpec, type ReturnRing, type ReturnWave } from "./returnCells";
import { RETURN_LUM, type DrawnLum } from "./returnLum";

/** Where the images live, under video/public. */
export const RETURN_THUMB_DIR = "ui/f2-cells/return";

/**
 * Each image's long side per ring, px: at or above the largest the cell is ever drawn at 1080 on the plans of 28 Oct
 * (the inner ring's recalls up to 897 px while the camera pulls back through them; the middle ring's up to 235 px; the
 * outer ring's up to 124 px), so no cell is drawn above its image's own size; a still is never scaled above its
 * capture's pixels (its long side is capped there).
 */
export const RETURN_THUMB_LONG: readonly [number, number, number] = [960, 320, 192];

/** The ring a wave's cells sit on. */
export const ringOfWave = (w: ReturnWave): ReturnRing => (w === "inner" ? 0 : w.startsWith("mid") ? 1 : 2);

/** A file name for a cell id ("J1*" → "J1-kit", "F12+F3+F1" → "F12_F3_F1"). */
export const thumbSlug = (id: string): string => id.replace(/\*/g, "-kit").replace(/[^A-Za-z0-9-]+/g, "_");

/** Drawn live, not from an image: S24's own last frame (the first cell) and Pebble's engine (no cell now). */
export const drawnLive = (c: Pick<ReturnCellSpec, "standIn">): boolean => c.standIn.kind === "frame" || c.standIn.kind === "engine";

/** One image to make: what the tool hands to Pillow. Sizes are the image's own px. */
export type ThumbJob =
  | { id: string; out: string; kind: "still"; w: number; h: number; src: string; scale: number; crop: { x: number; y: number; w: number; h: number }; fit: "cover" | "contain" }
  | { id: string; out: string; kind: "slot"; w: number; h: number; captureId: string; label: string; textPx: number; slotW: number };

/** A job without its file name (Omit, distributed over the union). */
export type ThumbSpec = ThumbJob extends infer J ? (J extends ThumbJob ? Omit<J, "out"> : never) : never;

/** The published captures are 2× (their manifest sizes are CSS px). */
export const CAPTURE_SCALE = 2;

/** What a cell's image shows (its job without its file name): null for a cell drawn live. */
const thumbSpec = (c: Pick<ReturnCellSpec, "id" | "standIn" | "wave" | "textPx">): ThumbSpec | null => {
  let L = RETURN_THUMB_LONG[ringOfWave(c.wave)];
  const si = c.standIn;
  if (si.kind === "still") {
    // never above the capture's own pixels: a cover crop at its device size; a contain crop's 4:3 box around it
    const dev = { w: si.crop.w * CAPTURE_SCALE, h: si.crop.h * CAPTURE_SCALE };
    const box = si.fit === "cover" ? dev.w : Math.max(dev.w, (dev.h * 4) / 3);
    L = Math.min(L, Math.round(box));
    return { id: c.id, kind: "still", w: L, h: Math.round(L * 0.75), src: si.src, scale: CAPTURE_SCALE, crop: si.crop, fit: si.fit };
  }
  if (si.kind === "slot") return { id: c.id, kind: "slot", w: L, h: Math.round(L * 0.75), captureId: si.captureId, label: si.label, textPx: c.textPx, slotW: si.w };
  return null;
};

/**
 * The look of the slots' panels (setpieces/tools/return-thumbs.ts draws them): part of every slot's signature, so a new
 * look names new images. "light-1": the page's sage-white with the hairline hatch, at a light crop's luminance (RV-02).
 */
export const RETURN_SLOT_LOOK = "light-1";

/** A short signature of what an image shows (FNV-1a, 32 bits, hex): a changed stand-in names a new file. */
export const returnThumbSig = (spec: ThumbSpec): string => {
  const text = JSON.stringify(spec.kind === "slot" ? { ...spec, look: RETURN_SLOT_LOOK } : spec);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
};

/** The signature of the cell's image (null for a cell drawn live): what returnLum.ts keys its measurement by. */
export const returnThumbSigOf = (c: Pick<ReturnCellSpec, "id" | "standIn" | "wave" | "textPx">): string | null => {
  const spec = thumbSpec(c);
  return spec ? returnThumbSig(spec) : null;
};

/** The cell's image, under video/public (null for a cell drawn live): its id's slug and its signature. */
export const returnThumbPath = (c: Pick<ReturnCellSpec, "id" | "standIn" | "wave" | "textPx">): string | null => {
  const spec = thumbSpec(c);
  return spec ? `${RETURN_THUMB_DIR}/${thumbSlug(c.id)}-${returnThumbSig(spec)}.jpg` : null;
};

/** Every image the Return draws, from the manifest. */
export function returnThumbJobs(cells: readonly ReturnCellSpec[] = RETURN_CELLS): ThumbJob[] {
  const out: ThumbJob[] = [];
  for (const c of cells) {
    const spec = thumbSpec(c);
    if (spec) out.push({ ...spec, out: `${RETURN_THUMB_DIR}/${thumbSlug(c.id)}-${returnThumbSig(spec)}.jpg` } as ThumbJob);
  }
  return out;
}

/** How the images are made (the view's error, the README). */
export const RETURN_THUMBS_HOWTO = "make them with: scripts/heavy.sh f2-return-thumbs /usr/sbin/taskpolicy -c utility bun video/src/film2/setpieces/tools/return-thumbs.ts";

/**
 * The images the manifest names that a listing of video/public's files (paths under it, as getStaticFiles() or
 * index.json give them) lacks: empty when every image is made for the manifest as it is (RV-10: run before a render).
 */
export const missingReturnThumbs = (have: Iterable<string>, cells: readonly ReturnCellSpec[] = RETURN_CELLS): string[] => {
  const set = new Set(have);
  return returnThumbJobs(cells)
    .map((j) => j.out)
    .filter((p) => !set.has(p));
};

/**
 * What a cell draws, measured: the 2.0.0 crop's own meanLum and redShare where filled (returnCells.ts), else its image's
 * as made (returnLum.ts, by the image's signature; another table for the canaries). The light rule, the red rule, the
 * swaps' luminance check and their pairing all read this (the review's RV-02, RV-05).
 */
export const drawnLumOf = (c: { spec: ReturnCellSpec }, table: Readonly<Record<string, DrawnLum>> = RETURN_LUM): { mean?: number; red?: number; measuredOn: "crop" | "stand-in" | null } => {
  const sig = returnThumbSigOf(c.spec);
  const lum = sig ? table[sig] : undefined;
  if (c.spec.meanLum !== undefined || c.spec.redShare !== undefined) return { mean: c.spec.meanLum ?? lum?.mean, red: c.spec.redShare ?? lum?.red, measuredOn: "crop" };
  return lum ? { mean: lum.mean, red: lum.red, measuredOn: "stand-in" } : { measuredOn: null };
};
