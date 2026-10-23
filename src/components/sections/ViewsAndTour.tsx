// Section 9, Views, and what else is inside (DESIGN-LEXINGTON §6 Views; OVERRIDES §10, §12).
//
// The head on the rail ("Views / Built from data", the film chip under it), then from column 4:
// 1. A view Pebble built, on the riverbed across the main column (952 px at 1440: loop L8's slot, where its quiz
//    reads). L8 plays there once rendered; until then the real "Spending by category" chart of the Lisbon trip budget,
//    cut from its dashboard and set as a window at about 1.25 times the app's size. L8 has no 4:5 cut, so phones show
//    the quiz Pebble built instead, cut to its question and answers (a narrow view stays legible at 328 px).
// 2. What a view keeps and how it leaves the app, and its limit, as one ruled row of three columns at the same size
//    (PHILOSOPHY 3: the limit beside the promise).
// 3. #more: bigger tasks (the title on columns 4–6, the points on 7–12, the schedules' limit under them), then the rest
//    of the tour as a two-column ruled list (columns 4–7 and 8–11). Text only: no tiles, no icons.
import type { CSSProperties } from "react";
import { common, media, orchestration, sectionIds, tour, views } from "@/content/copy";
import { labels } from "@/content/labels";
import { LoopVideo } from "@/components/media/LoopVideo";
import { MediaFrame } from "@/components/media/MediaFrame";
import { UiCrop } from "@/components/media/UiCrop";
import { SectionHead } from "@/components/ui/SectionHead";
import { inline } from "@/lib/inline";
import { loopMedia } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import styles from "./ViewsAndTour.module.css";

/**
 * In the stills' 1200 × 750 units (both themes share the layout), measured on the 2400 px files.
 * CHART (main-dashboard): the "Spending by category" card with 6 units of its panel around it, down to the window's
 * bottom edge; 84 % of the frame's width, 800 px at 1440 (the app's text at about 1.26 times its size).
 * QUIZ (main-quiz, phones): the quiz from its "Quiz" line to Back and Next; 90 % of a phone's frame (about 0.92 times).
 */
const CHART = { x: 548.5, y: 345, w: 637, h: 405 } as const;
const QUIZ = { x: 842, y: 168, w: 350, h: 432 } as const;
/** The frame: the main column (952 px at 1440), the column below 1024 px. */
const FRAME_SIZES = "(max-width: 560px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1279px) calc((100vw - 64px) * 0.75), 952px";

export function ViewsAndTour() {
  const l8 = loopMedia("views");
  return (
    <section id={SECTIONS.views} className="sec" aria-labelledby="views-title">
      <SectionHead id="views-title" label={labels.views} title={views.h2} lead={views.lead} chip={views.chapterId} />

      <div className="wrap grid-12 sec-body">
        <div className="main">
          {/* 1. a view Pebble built */}
          <figure className={styles.media}>
            <MediaFrame variant="riverbed" aspect="var(--views-aspect)" sizes={FRAME_SIZES} className={styles.frame}>
              {l8.available ? (
                <LoopVideo
                  loop={l8}
                  label={media.loops.views.label}
                  name={media.loops.views.name}
                  sizes={FRAME_SIZES}
                  className={`${styles.fill} ${styles.wideOnly}`}
                />
              ) : (
                <div className={`${styles.window} ${styles.wideOnly}`} style={{ "--share": 0.84 } as CSSProperties}>
                  <UiCrop
                    name="main-dashboard"
                    alt={media.stills.viewsChart}
                    box={CHART}
                    display={{ wide: 800, tablet: "calc((100vw - 48px) * 0.84)" }}
                    className={styles.windowCrop}
                  />
                </div>
              )}
              <div className={`${styles.window} ${styles.phoneOnly}`} style={{ "--share": 0.9 } as CSSProperties}>
                <UiCrop
                  name="main-quiz"
                  alt={media.stills.mainQuiz}
                  box={QUIZ}
                  display={{ wide: 322, phone: "calc((100vw - 32px) * 0.9)" }}
                  className={styles.windowCrop}
                />
              </div>
            </MediaFrame>
            <figcaption className={styles.caption}>{common.sampleData}</figcaption>
          </figure>

          {/* 2. what a view keeps, how it leaves, and its limit, at the same size */}
          <ul className={styles.facts}>
            {views.points.map((point) => (
              <li key={point}>{inline(point)}</li>
            ))}
            <li>{views.limit}</li>
          </ul>

          {/* 3. bigger tasks, and the rest of the tour */}
          <div id={sectionIds.more} className={styles.more}>
            <div className={styles.orchestration}>
              <h3 className={styles.blockTitle}>{orchestration.title}</h3>
              <div className={styles.blockBody}>
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
        </div>
      </div>
    </section>
  );
}
