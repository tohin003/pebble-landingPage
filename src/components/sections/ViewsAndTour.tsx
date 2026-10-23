// Section 9, Views, and what else is inside (DESIGN §5 row 9; OVERRIDES §10).
//
// 1. A split: the views paragraph on the left, a view Pebble built on the right, on the riverbed (DESIGN §6). Loop L8
//    when it is rendered, in a window; until then (and per the M7 cut line) the real "Lisbon trip budget" still, cut
//    to the view's own panel so that it can be read (the whole 1440 px window would show at about a third of its size,
//    a fifth on phones), floating on the riverbed like the Settings sheet in the memory section.
// 2. Below, two quiet typographic columns, not tiles: bigger tasks (bounded agents, goals, reviewed schedules,
//    recovery) and the rest of the feature tour.
// The line sweeps across the page in the gap above the section (a "cross" anchor).
import type { CSSProperties } from "react";
import { common, media, orchestration, sectionIds, tour, views } from "@/content/copy";
import { ChapterChip } from "@/components/media/ChapterChip";
import { LoopVideo } from "@/components/media/LoopVideo";
import { AppWindow, MediaFrame } from "@/components/media/MediaFrame";
import { UiImage } from "@/components/media/UiImage";
import { inline } from "@/lib/inline";
import { loopMedia } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import styles from "./ViewsAndTour.module.css";

const WINDOW_SIZES = "(max-width: 560px) 78vw, (max-width: 899px) 72vw, 560px";

/**
 * The view's panel in the "main-dashboard" still, in the still's 1200 × 750 units (both themes share the layout),
 * measured on the 1200 px files: from the panel's left edge to the window's right edge, under the toolbar, with its
 * title, Refresh, Export… and Copy. The crop is 84 % of the frame's width (ViewsAndTour.module.css .crop), so the still
 * is drawn at 1200 / w of that; the sizes say so, and a large crop fetches the 2400 px file.
 */
const CROP = { x: 534, y: 54, w: 666, h: 696 } as const;
/** The crop's share of the frame's width: 0.84, and 0.9 on phones (.crop in ViewsAndTour.module.css). */
const CROP_SHARE = { wide: 0.84, phone: 0.9 } as const;
const cropStyle = { "--x": CROP.x, "--y": CROP.y, "--w": CROP.w, "--h": CROP.h, "--share": CROP_SHARE.wide } as CSSProperties;
const drawn = (share: number) => ((1200 / CROP.w) * share).toFixed(3);
/** The frame: the media column (half of the 1120 px row, less half the gap); below 900 px the row, 640 px at most. */
const FRAME_SIZES = "(max-width: 560px) calc(100vw - 32px), (max-width: 687px) calc(100vw - 48px), (max-width: 899px) 640px, 528px";
const CROP_SIZES = [
  `(max-width: 560px) calc((100vw - 32px) * ${drawn(CROP_SHARE.phone)})`,
  `(max-width: 687px) calc((100vw - 48px) * ${drawn(CROP_SHARE.wide)})`,
  `(max-width: 899px) ${Math.round(640 * Number(drawn(CROP_SHARE.wide)))}px`,
  `${Math.round(528 * Number(drawn(CROP_SHARE.wide)))}px`,
].join(", ");

export function ViewsAndTour() {
  const loop = loopMedia("views");
  return (
    <section id={SECTIONS.views} className={`section ${styles.section}`} aria-labelledby="views-title">
      <div className={styles.viewsRow}>
        <div className={styles.viewsText}>
          <h2 id="views-title">{views.h2}</h2>
          <p className={`lead ${styles.lead}`}>{views.lead}</p>
          <ul className={styles.points}>
            {views.points.map((point) => (
              <li key={point}>{inline(point)}</li>
            ))}
          </ul>
          <p className={styles.limit}>{views.limit}</p>
          <div className={styles.chip}>
            <ChapterChip chapterId={views.chapterId} />
          </div>
        </div>

        <figure className={styles.media}>
          <MediaFrame
            variant="riverbed"
            aspect={loop.available ? "16 / 11" : "1 / 1"}
            sizes={FRAME_SIZES}
          >
            {loop.available ? (
              <AppWindow className={styles.window}>
                <LoopVideo loop={loop} label={media.loops.views.label} name={media.loops.views.name} sizes={WINDOW_SIZES} />
              </AppWindow>
            ) : (
              <div className={styles.crop} style={cropStyle}>
                <UiImage name="main-dashboard" alt={media.stills.mainDashboard} sizes={CROP_SIZES} className={styles.cropImage} />
              </div>
            )}
          </MediaFrame>
          <figcaption className={styles.caption}>{common.sampleData}</figcaption>
        </figure>
      </div>

      <div id={sectionIds.more} className={styles.more}>
        <div className={styles.orchestration}>
          <h3 className={styles.blockTitle}>{orchestration.title}</h3>
          <div>
            <ul className={styles.points}>
              {orchestration.points.map((point) => (
                <li key={point}>{inline(point)}</li>
              ))}
            </ul>
            <p className={styles.limit}>{orchestration.limit}</p>
          </div>
        </div>

        <div className={styles.tourBlock}>
          <h3 className={styles.blockTitle}>{tour.title}</h3>
          <dl className={styles.tour}>
            {tour.items.map((item) => (
              <div key={item.title} className={styles.tourItem}>
                <dt>{item.title}</dt>
                <dd>{inline(item.body)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
