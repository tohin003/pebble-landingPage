// Section 8, Memory you can see (DESIGN §5 row 8; OVERRIDES §7, §10).
//
// Two rows that mirror each other, so the page never sits in one centred column for long (DESIGN §1):
// 1. the six layers, with the app's own name for each and the README's layer name (OVERRIDES §10), beside the real
//    Settings › Memory sheet, cropped from lane D's still and set on the riverbed (DESIGN §6); when loop L7 is
//    rendered, the loop takes the still's place;
// 2. MemoryForgetDemo (the in-chat forget card, interactive) beside the recall rule and what you control.
// The line passes beside the section (a "margin" anchor).
import type { CSSProperties } from "react";
import { common, media, memory } from "@/content/copy";
import { MemoryForgetDemo } from "@/components/explainers/MemoryForgetDemo";
import { ChapterChip } from "@/components/media/ChapterChip";
import { LoopVideo } from "@/components/media/LoopVideo";
import { AppWindow, MediaFrame } from "@/components/media/MediaFrame";
import { UiImage } from "@/components/media/UiImage";
import { inline } from "@/lib/inline";
import { loopMedia } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import styles from "./Memory.module.css";

/** Where the forget card's "All memories in Settings" leads: the Settings picture in this section. */
const SETTINGS_ID = "memory-settings";

/**
 * The Settings sheet inside the 2400 × 1500 still (light and dark share the layout): its left and top edges, width and
 * corner radius in pixels, measured from the capture. The crop runs from the sheet's top to below the third record;
 * the frame cuts it off, so the sheet seems to continue past the frame's bottom edge.
 */
const SHEET = { x: 769, y: 79, width: 862, height: 1240, radius: 24, still: 2400 } as const;
/** The sheet's share of the frame's width (Memory.module.css .sheet); the radius scales with it. */
const SHEET_WIDTH = 0.78;
const cropStyle = {
  "--crop-aspect": `${SHEET.width} / ${SHEET.height}`,
  "--crop-scale": `${((SHEET.still / SHEET.width) * 100).toFixed(4)}%`,
  "--crop-x": `${((-SHEET.x / SHEET.width) * 100).toFixed(4)}%`,
  "--crop-y": `${((-SHEET.y / SHEET.width) * 100).toFixed(4)}%`,
  // cqi of the stage (the frame's width), so the corner matches the capture's at every size
  "--crop-radius": `${((SHEET.radius / SHEET.width) * SHEET_WIDTH * 100).toFixed(3)}cqi`,
  "--sheet-width": `${SHEET_WIDTH * 100}%`,
} as CSSProperties;

export function Memory() {
  const loop = loopMedia("memory");
  return (
    <section id={SECTIONS.memory} className={`section ${styles.section}`} aria-labelledby="memory-title">
      <div className="section-head">
        <h2 id="memory-title">{memory.h2}</h2>
        <p className="lead">{memory.lead}</p>
        <div className={styles.chip}>
          <ChapterChip chapterId={memory.chapterId} />
        </div>
      </div>

      <div className={styles.layersRow}>
        <dl className={styles.layers}>
          {memory.layers.map((layer) => (
            <div key={layer.layer} className={styles.layer}>
              <dt>
                <span className={styles.name}>{layer.name}</span>
                <span className={styles.term}>{layer.layer}</span>
              </dt>
              <dd>{layer.holds}</dd>
            </div>
          ))}
        </dl>

        <figure id={SETTINGS_ID} className={styles.settings} tabIndex={-1}>
          {loop.available ? (
            <MediaFrame variant="riverbed" aspect="16 / 10" sizes="(max-width: 899px) calc(100vw - 48px), 620px">
              <AppWindow className={styles.loopWindow}>
                <LoopVideo
                  loop={loop}
                  label={media.loops.memory.label}
                  name={media.loops.memory.name}
                  sizes="(max-width: 899px) 86vw, 540px"
                />
              </AppWindow>
            </MediaFrame>
          ) : (
            <MediaFrame
              variant="riverbed"
              aspect="5 / 6"
              sizes="(max-width: 899px) calc(100vw - 48px), 560px"
              className={styles.stage}
            >
              <div className={styles.sheetStage} style={cropStyle}>
                <div className={styles.sheet}>
                  <UiImage
                    name="settings-memory"
                    alt={media.stills.settingsMemory}
                    className={styles.sheetImage}
                    sizes="(max-width: 560px) 190vw, (max-width: 899px) 150vw, 1200px"
                  />
                </div>
              </div>
            </MediaFrame>
          )}
          <figcaption className={styles.caption}>
            {memory.settingsCaption} {common.sampleData}
          </figcaption>
        </figure>
      </div>

      <div className={styles.controlRow}>
        <div className={styles.demo}>
          <MemoryForgetDemo settingsHref={`#${SETTINGS_ID}`} />
        </div>
        <div className={styles.rules}>
          <p className={styles.recall}>{memory.recall}</p>
          <ul className={styles.points}>
            {memory.points.map((point) => (
              <li key={point}>{inline(point)}</li>
            ))}
            <li>{memory.relearn}</li>
          </ul>
          <p className={styles.limit}>{memory.limit}</p>
        </div>
      </div>
    </section>
  );
}
