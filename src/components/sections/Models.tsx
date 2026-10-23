// Section 6, Your model, your choice (DESIGN §5 row 6): the three ways in, as a quiet list (no cards), beside
// Settings › Models. The heading sits on the page's central axis; under it, a split mirrored from AgentGuard's (the
// picture on the left), so the page is never centred all the way down.
//
// Loop L2 plays in the frame once lane G renders it; until then the real Settings › Models still, cropped to the ways
// in, sits as a window on the riverbed. Phones keep the still (cropped tighter, to the buttons, so it stays legible)
// unless L2 has a phone cut of its own (critic H2).
import { common, media, models } from "@/content/copy";
import { ChapterChip } from "@/components/media/ChapterChip";
import { LoopVideo } from "@/components/media/LoopVideo";
import { MediaFrame } from "@/components/media/MediaFrame";
import { UiCrop } from "@/components/media/UiCrop";
import { loopMedia } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import styles from "./Models.module.css";

/** settings-models: the dialog's "Your models" block, the model row, the buttons and Continue with ChatGPT (16:10) */
const WAYS_IN = { x: 384, y: 160, w: 432, h: 270 } as const;
/**
 * phones: the ways in alone, Add a model file, Connect provider (and Rest model) and Continue with ChatGPT. y 248.5
 * since the 1.0.4 stills: the model row's meta fits on one line now, so the buttons sit 13.5 units higher (lane shots).
 */
const WAYS_IN_PHONE = { x: 397, y: 248.5, w: 330, h: 104 } as const;
const FRAME_SIZES = "(max-width: 899px) calc(100vw - 48px), 616px";

export function Models() {
  const l2 = loopMedia("models");
  // with L2 rendered, the still stays only for phones, and only if L2 has no phone cut
  const still = !l2.available || l2.phoneSources.length === 0;
  return (
    <section id={SECTIONS.models} className={`section ${styles.section}`} aria-labelledby="models-title">
      <div className="section-head">
        <h2 id="models-title">{models.h2}</h2>
        <p className="lead">{models.lead}</p>
      </div>

      <div className={styles.layout}>
        <figure className={styles.media}>
          <MediaFrame variant="riverbed" aspect="16 / 10" sizes={FRAME_SIZES}>
            {l2.available ? (
              <LoopVideo
                loop={l2}
                label={media.loops.models.label}
                name={media.loops.models.name}
                sizes={FRAME_SIZES}
                className={`${styles.fill} ${still ? styles.wideOnly : ""}`}
              />
            ) : null}
            {still ? (
              <div className={`${styles.window} ${l2.available ? styles.phoneOnly : ""}`}>
                <UiCrop
                  name="settings-models"
                  alt={models.mediaAlt}
                  box={WAYS_IN}
                  phone={WAYS_IN_PHONE}
                  display={{ wide: 444, tablet: "calc((100vw - 48px) * 0.72)", phone: "calc((100vw - 32px) * 0.9)" }}
                />
              </div>
            ) : null}
          </MediaFrame>
          <figcaption className={styles.caption}>{common.sampleData}</figcaption>
        </figure>

        <div className={styles.list}>
          <ul className={styles.ways}>
            {models.cards.map((way) => (
              <li key={way.id}>
                <h3 className={styles.wayTitle}>{way.title}</h3>
                <p className={styles.wayBody}>{way.body}</p>
                <p className={styles.wayLimit}>{way.limit}</p>
              </li>
            ))}
          </ul>
          <p className={styles.note}>
            {models.caption} {models.switchNote}
          </p>
          <ChapterChip chapterId={models.chapterId} className={styles.chip} />
        </div>
      </div>
    </section>
  );
}
