// Every piece of product media sits in a frame (DESIGN §6, critic H6), so video and still colours never have to match
// a page colour exactly:
// - variant "riverbed": the rounded desktop vignette on comp 2's riverbed wallpaper (radius 28, green-tinted shadow),
//   the wallpaper switched by theme (dusk in dark mode). Put an <AppWindow> or a loop inside.
// - variant "panel": the same frame on the page's panel colour.
// - shape "galet": the frame is masked to the pebble's silhouette (critic M9), for small media.
// The wallpaper is a background picture: lazy, and both themes are in the HTML (CSS shows one).
import type { CSSProperties, ReactNode } from "react";
import { wallpaper } from "@/lib/media";
import { Picture } from "./Picture";
import styles from "./MediaFrame.module.css";

export type MediaFrameProps = Readonly<{
  variant?: "riverbed" | "panel";
  shape?: "rounded" | "galet";
  /** CSS aspect-ratio of the frame, e.g. "16 / 9" (default 16 / 10, the wallpaper's own) */
  aspect?: string;
  /** the frame's CSS width at each breakpoint, for the wallpaper's srcset */
  sizes?: string;
  /** fetch the wallpaper early (the frame is near the top of the page) */
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}>;

export function MediaFrame({
  variant = "riverbed",
  shape = "rounded",
  aspect = "16 / 10",
  sizes = "(max-width: 1168px) calc(100vw - 48px), 1120px",
  priority = false,
  className,
  style,
  children,
}: MediaFrameProps) {
  const light = wallpaper("light");
  const dark = wallpaper("dark");
  const fetchPriority = priority ? "high" : "auto";
  return (
    <div
      className={`${styles.frame} ${className ?? ""}`}
      data-variant={variant}
      data-shape={shape}
      style={{ aspectRatio: aspect, ...style }}
    >
      {variant === "riverbed" ? (
        <div className={styles.wallpaper} aria-hidden="true">
          <Picture sets={[light.x1, light.x2]} alt="" sizes={sizes} fetchPriority={fetchPriority} className={`only-light ${styles.wallPicture}`} imgClassName={styles.wallImg} />
          <Picture sets={[dark.x1, dark.x2]} alt="" sizes={sizes} fetchPriority={fetchPriority} className={`only-dark ${styles.wallPicture}`} imgClassName={styles.wallImg} />
        </div>
      ) : null}
      <div className={styles.content}>{children}</div>
    </div>
  );
}

/**
 * A Mac window on the stage: rounded corners, a window shadow and the three traffic lights over a real-UI still
 * (the captures have no window chrome of their own). Size and place it with className; width drives everything.
 */
export function AppWindow({ children, className, lights = true }: { children: ReactNode; className?: string; lights?: boolean }) {
  return (
    <div className={`${styles.window} ${className ?? ""}`}>
      {children}
      {lights ? (
        <span className={styles.lights} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : null}
    </div>
  );
}
