// Section 6, Your model, your choice (DESIGN-LEXINGTON §6 Your model): the head on the rail ("Models / Three ways
// in"), then, from column 4, the three ways in as bare columns under hairlines (no cards, no icons): each its button's
// own name, what it does, and its limit at the same size. Under them the picture in columns 4–9, Settings › Models on
// the riverbed, beside the note on local models in 10–12; below 1280 px the picture takes the main column and the note
// goes under it (six columns there are too narrow for L2, drawn for 624 px).
//
// Loop L2 plays in the frame once it is rendered; until then the real Settings › Models still, cropped to the ways in,
// sits as a window on the riverbed at about the app's own scale. Phones keep the still (cropped tighter, to the
// buttons, so it stays legible) unless L2 has a phone cut of its own (critic H2).
import { common, media, models } from "@/content/copy";
import { labels } from "@/content/labels";
import { LoopVideo } from "@/components/media/LoopVideo";
import { MediaFrame } from "@/components/media/MediaFrame";
import { UiCrop } from "@/components/media/UiCrop";
import { SectionHead } from "@/components/ui/SectionHead";
import { loopMedia } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import styles from "./Models.module.css";

/** settings-models: the dialog's "Your models" block, the model row, the buttons and Continue with ChatGPT (16:10) */
const WAYS_IN = { x: 384, y: 160, w: 432, h: 270 } as const;
/**
 * phones: the three ways in alone: Add a model file and Connect provider (x 405–638.5), then Continue with ChatGPT
 * (y 308–346). The crop ends in the gap before Rest model (x 645), which isn't a way in: 242 units at 90 % of a 390 px
 * phone's frame put the app's 12 px text at 13 px (330 units, with Rest model, gave 9.8 px, under the 11 px floor).
 * y 248.5 since the 1.0.4 stills: the model row's meta fits on one line now, so the buttons sit 13.5 units higher.
 */
const WAYS_IN_PHONE = { x: 400, y: 248.5, w: 242, h: 104 } as const;
/** The picture: columns 4–9 (624 px at 1440, loop L2's slot), the main column at 1024–1279, the column below. */
const FRAME_SIZES = "(max-width: 560px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1279px) calc((100vw - 64px) * 0.75), 624px";

export function Models() {
  const l2 = loopMedia("models");
  // with L2 rendered, the still stays only for phones, and only if L2 has no phone cut
  const still = !l2.available || l2.phoneSources.length === 0;
  return (
    <section id={SECTIONS.models} className="sec" aria-labelledby="models-title">
      <SectionHead id="models-title" label={labels.models} title={models.h2} lead={models.lead} chip={models.chapterId} />

      <div className="wrap grid-12 sec-body">
        <div className="main">
          <ul className={styles.ways}>
            {models.cards.map((way) => (
              <li key={way.id}>
                <h3>{way.title}</h3>
                <p className={styles.wayBody}>{way.body}</p>
                <p className={styles.wayLimit}>{way.limit}</p>
              </li>
            ))}
          </ul>

          <div className={styles.showcase}>
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
                      display={{ wide: 499, tablet: "calc((100vw - 48px) * 0.8)", phone: "calc((100vw - 32px) * 0.9)" }}
                      className={styles.windowCrop}
                    />
                  </div>
                ) : null}
              </MediaFrame>
              <figcaption className={styles.caption}>{common.sampleData}</figcaption>
            </figure>

            <p className={styles.note}>
              {models.caption} {models.switchNote}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
