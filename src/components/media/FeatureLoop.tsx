// A Pebble 2.0 loop's slot in a section (SITE_AUDIT §4.2; the director's X4, X5, X13): one feature, silent, from
// /media/v3 (src/lib/media.ts launchLoopMedia).
//
// - Nothing at all until the loop's video or its poster exists (loopShowable): the section stays exactly as it was,
//   with no empty frame and never a broken player.
// - A take sits on the riverbed (MediaFrame "riverbed"); the long-tasks diagram on the flat panel, captioned as a
//   diagram (DESIGN 3.8: explainers on a flat fill, never the riverbed).
// - The frame has the loop's own shape (16:10, or Pebble Remote's 4:5), and the 4:5 shape on phones when the loop has
//   a phone cut, as LoopVideo's stage does.
// - The caption is "Shown with sample data." and what the clip was recorded from (copy.ts media.launchLoops), or the
//   diagram's own line. LoopVideo keeps the standing exception for motion (PHILOSOPHY 1, the director's X4): silent, one
//   loop at a time, never while the live pebble is on screen, a pause button, and the poster alone under reduced or
//   paused motion.
import type { CSSProperties } from "react";
import { common, media } from "@/content/copy";
import { launchLoopMedia, loopShowable, type LaunchLoopId } from "@/lib/media";
import { LoopVideo } from "./LoopVideo";
import { MediaFrame } from "./MediaFrame";
import styles from "./FeatureLoop.module.css";

export type FeatureLoopProps = Readonly<{
  id: LaunchLoopId;
  /** the frame's CSS width at each breakpoint (the poster's and the wallpaper's srcset) */
  sizes?: string;
  className?: string;
  /** a line under the caption, at the caption's size: Stealth Lockdown's honest line, word for word */
  note?: string;
}>;

/** The ids that are drawn explainers, not recordings of Pebble: on the flat panel, captioned as a diagram. */
const DIAGRAMS: ReadonlySet<LaunchLoopId> = new Set(["long-tasks"]);

export function FeatureLoop({ id, sizes = "(max-width: 560px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), 952px", className, note }: FeatureLoopProps) {
  const loop = launchLoopMedia(id);
  if (!loopShowable(loop)) return null;
  const words = media.launchLoops[id];
  const diagram = DIAGRAMS.has(id);
  const phoneCut = loop.phoneSources.length > 0;
  // the loop's own shape; the stylesheet turns it into --feature-loop-aspect, so the 4:5 rule for phones can win (an
  // inline --feature-loop-aspect would beat any stylesheet rule, and a phone cut would be cropped into the wide frame)
  const shape = { "--feature-loop-wide": `${loop.width} / ${loop.height}` } as CSSProperties;
  return (
    <figure
      className={`${styles.figure} ${className ?? ""}`}
      data-loop-id={id}
      data-portrait={loop.height > loop.width ? "" : undefined}
      data-phone-cut={phoneCut ? "" : undefined}
      style={shape}
    >
      <MediaFrame variant={diagram ? "panel" : "riverbed"} aspect="var(--feature-loop-aspect)" sizes={sizes} className={styles.frame}>
        <LoopVideo loop={loop} label={words.label} name={words.name} sizes={sizes} className={styles.fill} />
      </MediaFrame>
      <figcaption className={styles.caption}>
        {diagram ? words.source : `${common.sampleData} ${words.source}`}
        {note ? <span className={styles.note}>{note}</span> : null}
      </figcaption>
    </figure>
  );
}
