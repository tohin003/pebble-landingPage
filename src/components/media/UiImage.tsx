// A real-UI still from lane D (public/ui/v1, 2400 and 1200 px wide, AVIF + WebP, light and dark). Both themes are in
// the HTML and CSS shows the one that matches html[data-theme] (critic H5: <picture media> would ignore the site's own
// theme toggle). Lazy by default: the hidden theme's image is never fetched, because a display: none image is never
// near the viewport (so even a priority still stays lazy: an image in the first viewport still loads at once). If a
// theme is missing, the other one stands in (dimmed a little on the dark page).
import { uiStill, type UiStillName } from "@/lib/media";
import { Picture } from "./Picture";
import styles from "./UiImage.module.css";

export type UiImageProps = Readonly<{
  name: UiStillName;
  alt: string;
  /** the image's CSS width at each breakpoint; default: the content column */
  sizes?: string;
  /** near the top of the page: fetch it with high priority */
  priority?: boolean;
  className?: string;
}>;

export const CONTENT_SIZES = "(max-width: 1168px) calc(100vw - 48px), 1120px";

export function UiImage({ name, alt, sizes = CONTENT_SIZES, priority = false, className }: UiImageProps) {
  const still = uiStill(name);
  const light = [still.files.light[1200], still.files.light[2400]];
  const dark = [still.files.dark[1200], still.files.dark[2400]];
  const hasLight = light.some((set) => set.available);
  const hasDark = dark.some((set) => set.available);
  if (!hasLight && !hasDark) {
    // Nothing rendered yet: keep the space, so the layout doesn't jump when the still arrives.
    return <span className={`${styles.missing} ${className ?? ""}`} role="img" aria-label={alt} />;
  }
  return (
    <span className={`${styles.still} ${className ?? ""}`}>
      <Picture
        sets={hasLight ? light : dark}
        alt={alt}
        sizes={sizes}
        fetchPriority={priority ? "high" : "auto"}
        className={`only-light ${styles.picture}`}
        imgClassName={styles.img}
      />
      <Picture
        sets={hasDark ? dark : light}
        alt={alt}
        sizes={sizes}
        fetchPriority={priority ? "high" : "auto"}
        className={`only-dark ${styles.picture} ${hasDark ? "" : styles.dimmed}`}
        imgClassName={styles.img}
      />
    </span>
  );
}
