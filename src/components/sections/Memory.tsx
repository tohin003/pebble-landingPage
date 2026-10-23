// Section 8, Memory you can read and forget (DESIGN-LEXINGTON §6 Memory; OVERRIDES §7, §10, §12).
//
// The head on the rail ("Memory / Six labelled layers", the film chip under it), then three rows from column 4, in the
// order a careful reader asks: what is kept, where you see it, how you take it back.
// 1. The six layers as a two-column ruled list (columns 4–7 and 8–11), each with the app's own name, the README's
//    layer name and what it holds. Read row by row, it is the order of the Settings sheet's own two-column grid below.
// 2. The real Settings › Memory on the riverbed in columns 4–9 (loop L7's 624 px slot; L7 plays there once rendered)
//    beside the recall rule in 10–12: the sheet itself says that retrieved text never becomes permission.
//    The still floats from the frame's top and runs off its bottom edge, because the sheet goes on. Phones keep the
//    still (L7 has no 4:5 cut) at the app's own size in a 4:5 frame: the sheet runs off the right edge too, so its
//    11 px text stays at 11 px instead of shrinking the whole sheet to fit.
// 3. The forget card, an interactive recreation on the flat panel (columns 4–8), beside what you control in 9–12 and
//    the limit in ink under a hairline, at the same size (PHILOSOPHY 3).
// No tiles and no icons; the galet marks the list items.
import { common, media, memory } from "@/content/copy";
import { labels } from "@/content/labels";
import { MemoryForgetDemo } from "@/components/explainers/MemoryForgetDemo";
import { LoopVideo } from "@/components/media/LoopVideo";
import { MediaFrame } from "@/components/media/MediaFrame";
import { UiCrop } from "@/components/media/UiCrop";
import { DataText } from "@/components/ui/Data";
import { SectionHead } from "@/components/ui/SectionHead";
import { inline } from "@/lib/inline";
import { loopMedia } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import styles from "./Memory.module.css";

/** Where the forget card's "All memories in Settings" leads: the Settings picture in this section. */
const SETTINGS_ID = "memory-settings";

/**
 * settings-memory, in the still's 1200 × 750 units (both themes share the layout): the Settings sheet from its top
 * edge, 600 units tall, more than any frame shows, so its bottom corners always fall outside and the sheet runs on.
 * Drawn 487 px wide (Memory.module.css .sheet; 78 % of the 624 px frame at 1440): the app's 11 px text (the layer
 * tiles and the note, AdvancedSettings.vue@1.0.4) at 12.4 px. Phones draw it at its own 431 px.
 */
const SHEET = { x: 384.5, y: 39.5, w: 431, h: 600 } as const;
/** The frame: columns 4–9 (624 px at 1440), the column below 1024 px. */
const FRAME_SIZES = "(max-width: 560px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1279px) calc((100vw - 64px) * 0.49), 624px";

export function Memory() {
  const l7 = loopMedia("memory");
  // L7 has no 4:5 cut, so phones keep the still (critic H2; HANDOFF-v2-loops)
  const still = !l7.available || l7.phoneSources.length === 0;
  return (
    <section id={SECTIONS.memory} className="sec" aria-labelledby="memory-title">
      <SectionHead id="memory-title" label={labels.memory} title={memory.h2} lead={memory.lead} chip={memory.chapterId} />

      <div className="wrap grid-12 sec-body">
        <div className="main">
          {/* 1. what is kept: the six layers */}
          <dl className={styles.layers}>
            {memory.layers.map((layer) => (
              <div key={layer.layer} className={styles.layer}>
                <dt>
                  <span className={styles.name}>{layer.name}</span> <span className={styles.term}>{layer.layer}</span>
                </dt>
                <dd>
                  <DataText text={layer.holds} />
                </dd>
              </div>
            ))}
          </dl>

          {/* 2. where you see it: the real Settings sheet, beside the recall rule */}
          <div className={styles.showcase}>
            <figure id={SETTINGS_ID} className={styles.media} tabIndex={-1}>
              <MediaFrame variant="riverbed" aspect="var(--memory-aspect)" sizes={FRAME_SIZES} className={styles.frame}>
                {l7.available ? (
                  <LoopVideo
                    loop={l7}
                    label={media.loops.memory.label}
                    name={media.loops.memory.name}
                    sizes={FRAME_SIZES}
                    className={`${styles.fill} ${still ? styles.wideOnly : ""}`}
                  />
                ) : null}
                {still ? (
                  <div className={`${styles.stage} ${l7.available ? styles.phoneOnly : ""}`}>
                    <UiCrop
                      name="settings-memory"
                      alt={media.stills.settingsMemory}
                      box={SHEET}
                      display={{ wide: 487, tablet: "487px", phone: "431px" }}
                      className={styles.sheet}
                    />
                  </div>
                ) : null}
              </MediaFrame>
              <figcaption className={styles.caption}>
                {memory.settingsCaption} {common.sampleData}
              </figcaption>
            </figure>

            <p className={styles.note}>{memory.recall}</p>
          </div>

          {/* 3. how you take it back: the forget card, beside what you control and the limit */}
          <div className={styles.control}>
            <div className={styles.demo}>
              <MemoryForgetDemo settingsHref={`#${SETTINGS_ID}`} />
            </div>
            <div className={styles.rules}>
              <ul className={styles.points}>
                {memory.points.map((point) => (
                  <li key={point}>{inline(point)}</li>
                ))}
                <li>{memory.relearn}</li>
              </ul>
              <p className={styles.limit}>{memory.limit}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
