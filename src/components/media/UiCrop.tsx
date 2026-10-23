// A region of a real-UI still (UiImage, both themes), cut out with CSS: a window on the sage field (DESIGN §6), used
// where a whole 1440 × 900 window would be too small to read. Added by lane F2a (sections 1–7); no other file changed.
//
// Boxes are in the still's own 1200 × 750 units (the 1200 px files of public/ui/v1, so a box can be measured on them
// directly). `phone` swaps in a tighter box at <= 560 px. The image is drawn 1200 / w times the crop's width, and
// `sizes` says so, so the browser fetches the 2400 px file whenever the crop is shown large.
import type { CSSProperties } from "react";
import type { UiStillName } from "@/lib/media";
import { UiImage } from "./UiImage";
import styles from "./UiCrop.module.css";

/** A region of a still, in the 1200 × 750 still's units. */
export type CropBox = Readonly<{ x: number; y: number; w: number; h: number }>;

export type UiCropProps = Readonly<{
  name: UiStillName;
  /** describes what the crop shows, not the whole still */
  alt: string;
  box: CropBox;
  /** a different box for phones (<= 560 px) */
  phone?: CropBox;
  /** the crop's own CSS width: in px on wide screens, and as CSS lengths below 900 and 561 px */
  display: Readonly<{ wide: number; tablet?: string; phone?: string }>;
  /** "window": rounded, with the window shadow (default); "bare": the caller frames it */
  frame?: "window" | "bare";
  className?: string;
}>;

const factor = (box: CropBox) => (1200 / box.w).toFixed(3);

function cropSizes(box: CropBox, phone: CropBox | undefined, display: UiCropProps["display"]): string {
  const parts: string[] = [];
  if (display.phone) parts.push(`(max-width: 560px) calc(${display.phone} * ${factor(phone ?? box)})`);
  if (display.tablet) parts.push(`(max-width: 899px) calc(${display.tablet} * ${factor(box)})`);
  parts.push(`${Math.round((display.wide * 1200) / box.w)}px`);
  return parts.join(", ");
}

export function UiCrop({ name, alt, box, phone, display, frame = "window", className }: UiCropProps) {
  const vars: Record<string, number> = { "--x": box.x, "--y": box.y, "--w": box.w, "--h": box.h };
  if (phone) Object.assign(vars, { "--px": phone.x, "--py": phone.y, "--pw": phone.w, "--ph": phone.h });
  return (
    <div
      className={`${styles.crop} ${className ?? ""}`}
      data-frame={frame}
      data-phone={phone ? "" : undefined}
      style={vars as CSSProperties}
    >
      <UiImage name={name} alt={alt} sizes={cropSizes(box, phone, display)} className={styles.image} />
    </div>
  );
}
