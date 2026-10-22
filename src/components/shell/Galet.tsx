// The galet, the pebble's silhouette (src/lib/galet.ts): the site's one brand device (DESIGN §1, critic M9). Inline
// SVG in currentColor; decorative, so aria-hidden. Size it with CSS (width; the height follows the 130:115 ratio).
import { GALET_PATH, GALET_VIEWBOX } from "@/lib/galet";

export function Galet({ className }: { className?: string }) {
  return (
    <svg viewBox={GALET_VIEWBOX} className={className} aria-hidden="true" focusable="false">
      <path d={GALET_PATH} fill="currentColor" />
    </svg>
  );
}
