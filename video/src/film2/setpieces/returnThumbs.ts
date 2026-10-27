// THE RETURN'S CELL THUMBNAILS (MONTAGE_DESIGN §6: "at most 46 cell planes plus the stone are on screen, from
// thumbnails"; OVERRIDES §61). Every cell is drawn from ONE small image, except two that Pebble's own code draws live:
// the first cell (S24's own last frame, views/ReturnView.tsx) and A3 (Pebble's engine in its testing pose). The image
// is the cell's stand-in as returnCells.ts names it, made once by setpieces/tools/return-thumbs.ts into
// video/public/ui/f2-cells/return (gitignored, like every capture):
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

/** Drawn live, not from an image: S24's own last frame (the first cell) and Pebble's engine. */
export const drawnLive = (c: Pick<ReturnCellSpec, "standIn">): boolean => c.standIn.kind === "frame" || c.standIn.kind === "engine";

/** The cell's image, under video/public (null for the two cells drawn live). */
export const returnThumbPath = (c: Pick<ReturnCellSpec, "id" | "standIn">): string | null => (drawnLive(c) ? null : `${RETURN_THUMB_DIR}/${thumbSlug(c.id)}.jpg`);

/** One image to make: what the tool hands to Pillow. Sizes are the image's own px. */
export type ThumbJob =
  | { id: string; out: string; kind: "still"; w: number; h: number; src: string; scale: number; crop: { x: number; y: number; w: number; h: number }; fit: "cover" | "contain" }
  | { id: string; out: string; kind: "slot"; w: number; h: number; captureId: string; label: string; textPx: number; slotW: number };

/** The published captures are 2× (their manifest sizes are CSS px). */
export const CAPTURE_SCALE = 2;

/** Every image the Return draws, from the manifest. */
export function returnThumbJobs(cells: readonly ReturnCellSpec[] = RETURN_CELLS): ThumbJob[] {
  const out: ThumbJob[] = [];
  for (const c of cells) {
    const path = returnThumbPath(c);
    if (!path) continue;
    let L = RETURN_THUMB_LONG[ringOfWave(c.wave)];
    const si = c.standIn;
    if (si.kind === "still") {
      // never above the capture's own pixels: a cover crop at its device size; a contain crop's 4:3 box around it
      const dev = { w: si.crop.w * CAPTURE_SCALE, h: si.crop.h * CAPTURE_SCALE };
      const box = si.fit === "cover" ? dev.w : Math.max(dev.w, (dev.h * 4) / 3);
      L = Math.min(L, Math.round(box));
      out.push({ id: c.id, out: path, kind: "still", w: L, h: Math.round(L * 0.75), src: si.src, scale: CAPTURE_SCALE, crop: si.crop, fit: si.fit });
    } else if (si.kind === "slot") {
      out.push({ id: c.id, out: path, kind: "slot", w: L, h: Math.round(L * 0.75), captureId: si.captureId, label: si.label, textPx: c.textPx, slotW: si.w });
    }
  }
  return out;
}
