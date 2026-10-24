// A region of a real-UI still (UiImage, both themes), cut out with CSS: a window on the sage field (DESIGN §6), used
// where a whole 1440 × 900 window would be too small to read. Added by lane F2a (sections 1–7); no other file changed.
//
// Boxes are in the still's own 1200 × 750 units (the 1200 px files of public/ui/v1, so a box can be measured on them
// directly). `phone` swaps in a tighter box at <= 560 px (or from 639 px down, with `phoneUpTo`), and `narrow` a
// tighter one still at <= 361 px (NARROW_MAX). The image is drawn 1200 / w times the crop's width, and `sizes` says so,
// so the browser fetches the 2400 px file whenever the crop is shown large.
//
// The app's 12 px text is 10 units tall in a still, so it renders at 10 × (the crop's CSS width ÷ w) px: choose each
// box and width so that stays at 11 px or more (the floor) at every width the box is shown at.
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
  /** the phone box takes over from 639 px down instead of 560 px (a wide box too wide for a small tablet's column) */
  phoneUpTo?: 639;
  /** a tighter box still for the narrowest phones (<= 361 px), where the phone box's text would fall under 11 px */
  narrow?: CropBox;
  /** the crop's own CSS width: in px on wide screens, and as CSS lengths below 900 and 561 px */
  display: Readonly<{ wide: number; tablet?: string; phone?: string }>;
  /** "window": rounded, with the window shadow (default); "bare": the caller frames it */
  frame?: "window" | "bare";
  /** hold the picture back until the crop is near the screen (UiImage `defer`) */
  defer?: boolean;
  className?: string;
}>;

const factor = (box: CropBox) => (1200 / box.w).toFixed(3);

/**
 * The narrow box's last width: a 300-unit phone box in a phone's column (100vw - 32 px) shows the app's 12 px text at
 * 11 px from 362 px up (10.97 px at 361). The CSS media query in UiCrop.module.css uses the same number.
 */
const NARROW_MAX = 361;

function cropSizes(
  box: CropBox,
  phone: CropBox | undefined,
  narrow: CropBox | undefined,
  phoneUpTo: number,
  display: UiCropProps["display"],
): string {
  const parts: string[] = [];
  if (display.phone && narrow) parts.push(`(max-width: ${NARROW_MAX}px) calc(${display.phone} * ${factor(narrow)})`);
  if (display.phone) parts.push(`(max-width: ${phone ? phoneUpTo : 560}px) calc(${display.phone} * ${factor(phone ?? box)})`);
  if (display.tablet) parts.push(`(max-width: 899px) calc(${display.tablet} * ${factor(box)})`);
  parts.push(`${Math.round((display.wide * 1200) / box.w)}px`);
  return parts.join(", ");
}

export function UiCrop({ name, alt, box, phone, phoneUpTo, narrow, display, frame = "window", defer = false, className }: UiCropProps) {
  const vars: Record<string, number> = { "--x": box.x, "--y": box.y, "--w": box.w, "--h": box.h };
  if (phone) Object.assign(vars, { "--px": phone.x, "--py": phone.y, "--pw": phone.w, "--ph": phone.h });
  if (narrow) Object.assign(vars, { "--nx": narrow.x, "--ny": narrow.y, "--nw": narrow.w, "--nh": narrow.h });
  return (
    <div
      className={`${styles.crop} ${className ?? ""}`}
      data-frame={frame}
      data-phone={phone ? (phoneUpTo ? String(phoneUpTo) : "") : undefined}
      data-narrow={narrow ? "" : undefined}
      style={vars as CSSProperties}
    >
      <UiImage
        name={name}
        alt={alt}
        sizes={cropSizes(box, phone, narrow, phoneUpTo ?? 560, display)}
        defer={defer}
        className={styles.image}
      />
    </div>
  );
}
