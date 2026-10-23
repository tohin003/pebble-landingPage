// Section 4, On your desktop (DESIGN §5 row 4): comp 2's riverbed vignette with the companion, and short copy.
//
// The vignette is a corner of a Mac desktop: the riverbed wallpaper, Pebble's real quick chat (the 1.0.1 companion
// window, captured without the app's own pebble: tools/assets/quick-chat.mjs) and, under it, the page's live pebble,
// drawn by the same engine as the app and standing where the app draws its own. Its eyes follow your pointer while it
// is the page's animated pebble.
// - Loop L1 (the pointer arrives, a click opens the quick chat, a reply appears) plays in the same frame on wider
//   screens once lane G renders it. Phones keep the still composition, where the chat stays readable, unless L1 has a
//   4:5 phone cut of its own (critic H2).
// - The pebble's path sweeps across the page just above this section ("cross" anchor).
import { common, desktop, hero, media } from "@/content/copy";
import { ChapterChip } from "@/components/media/ChapterChip";
import { LoopVideo } from "@/components/media/LoopVideo";
import { MediaFrame } from "@/components/media/MediaFrame";
import { Picture } from "@/components/media/Picture";
import { Pebble } from "@/components/pebble/Pebble";
import { loopMedia, mediaFile, type ImageSet } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import styles from "./OnYourDesktop.module.css";

const FRAME_SIZES = "(max-width: 1168px) calc(100vw - 48px), 1120px";
/** The quick chat's CSS width (OnYourDesktop.module.css: the companion is 86 % or 76 % of the frame's height). */
const CHAT_SIZES = "(max-width: 560px) calc((100vw - 32px) * 0.91), (max-width: 1168px) calc((100vw - 48px) * 0.4), 450px";

/** public/ui/v1/quick-chat-<theme>-<width>: the companion window (384 pt wide) at 2x and 3x, trimmed under its shadow. */
function quickChat(theme: "light" | "dark"): ImageSet[] {
  return [768, 1152].map((width) => {
    const base = `/ui/v1/quick-chat-${theme}-${width}`;
    const avif = mediaFile(`${base}.avif`);
    const webp = mediaFile(`${base}.webp`);
    return { avif, webp, width, height: Math.round((width * 1144) / 1152), available: avif.available || webp.available };
  });
}

export function OnYourDesktop() {
  const l1 = loopMedia("companion");
  const light = quickChat("light");
  const dark = quickChat("dark");

  return (
    <section
      id={SECTIONS.desktop}
      className={`section ${styles.section}`}
      aria-labelledby="desktop-title"
      data-path-anchor="cross"
    >
      <div className="section-head">
        <h2 id="desktop-title">{desktop.h2}</h2>
        <p className="lead">{desktop.lead}</p>
      </div>

      <figure
        className={styles.vignette}
        data-loop={l1.available ? "" : undefined}
        data-phone-loop={l1.available && l1.phoneSources.length > 0 ? "" : undefined}
      >
        <MediaFrame variant="riverbed" aspect="var(--desk-aspect)" sizes={FRAME_SIZES}>
          {l1.available ? (
            <LoopVideo
              loop={l1}
              label={media.loops.companion.label}
              name={media.loops.companion.name}
              sizes={FRAME_SIZES}
              className={styles.loop}
            />
          ) : null}
          <div className={styles.corner}>
            <div className={styles.companion}>
              <Picture sets={light} alt={desktop.vignette} sizes={CHAT_SIZES} className={`only-light ${styles.chat}`} imgClassName={styles.chatImg} />
              <Picture sets={dark} alt={desktop.vignette} sizes={CHAT_SIZES} className={`only-dark ${styles.chat}`} imgClassName={styles.chatImg} />
              <Pebble name="desktop" className={styles.pebble} />
            </div>
          </div>
        </MediaFrame>
        <figcaption className={styles.caption}>
          <span>
            {common.sampleData} {hero.pebble.note} <span className={styles.live}>{hero.pebble.noteLive}</span>
          </span>
          <ChapterChip chapterId={desktop.chapterId} />
        </figcaption>
      </figure>

      <ul className={styles.points}>
        {desktop.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className={styles.limit}>{desktop.limit}</p>
    </section>
  );
}
