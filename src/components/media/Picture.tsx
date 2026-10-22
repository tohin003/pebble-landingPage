// A <picture> for an AVIF + WebP image set (src/lib/media.ts), or nothing when neither file exists.
import type { CSSProperties } from "react";
import type { ImageSet } from "@/lib/media";

export type PictureProps = Readonly<{
  /** widths of the same image, smallest first */
  sets: readonly ImageSet[];
  alt: string;
  sizes: string;
  /** "lazy" (default) also keeps a hidden theme's twin from loading; "eager" only for images that are always shown */
  loading?: "lazy" | "eager";
  /** "high" for an image near the top of the page */
  fetchPriority?: "high" | "auto";
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
}>;

function srcSet(sets: readonly ImageSet[], format: "avif" | "webp"): string {
  return sets
    .filter((set) => set[format].available)
    .map((set) => `${set[format].src} ${set.width}w`)
    .join(", ");
}

export function Picture({ sets, alt, sizes, loading = "lazy", fetchPriority = "auto", className, imgClassName, style }: PictureProps) {
  const usable = sets.filter((set) => set.available);
  if (usable.length === 0) return null;
  const avif = srcSet(usable, "avif");
  const webp = srcSet(usable, "webp");
  // the fallback <img>: the smallest WebP (every browser that runs this site decodes WebP), else the smallest AVIF
  const base = usable[0]!;
  const fallback = base.webp.available ? base.webp.src : base.avif.src;
  const largest = usable[usable.length - 1]!;
  return (
    <picture className={className} style={style}>
      {avif ? <source type="image/avif" srcSet={avif} sizes={sizes} /> : null}
      {webp ? <source type="image/webp" srcSet={webp} sizes={sizes} /> : null}
      <img
        className={imgClassName}
        src={fallback}
        alt={alt}
        width={largest.width}
        height={largest.height}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
      />
    </picture>
  );
}
