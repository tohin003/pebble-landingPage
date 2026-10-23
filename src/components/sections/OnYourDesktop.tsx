// Section 4, On your desktop (DESIGN-LEXINGTON §6 On your desktop): the head on the rail ("On your desktop / Joins
// every Space"), then the one scene of the section across the whole container (columns 1–12): a corner of a Mac
// desktop on the riverbed, Pebble's real quick chat and, under it, the page's live pebble. Under the scene, from
// column 4: its caption, then the three facts as a hairline list of three columns, then the limit at the same size.
//
// - The quick chat is the real companion window (Pebble 1.0.4, captured without the app's own pebble:
//   tools/assets/quick-chat.mjs). The pebble under it is the page's live pebble, drawn by the same engine as the app
//   and standing where the app draws its own; its eyes follow your pointer while it is the page's animated pebble.
// - Loop L1 (the pointer arrives, a click opens the quick chat, a reply appears) plays in the same frame once it is
//   rendered: 16:10 on wider screens and its 4:5 cut on phones (critic H2). Without a phone cut, phones keep the still
//   corner, where the chat stays readable.
// - The caption's two notes about the pebble ("The pebble on this page uses the same animation engine as the app.",
//   "Move your pointer, and its eyes follow.") describe the page's live pebble, so they show only where the still
//   corner shows it. Over L1 the pebble is part of the video, and its eyes don't follow the visitor's pointer.
import { common, desktop, hero, media } from "@/content/copy";
import { labels } from "@/content/labels";
import { LoopVideo } from "@/components/media/LoopVideo";
import { MediaFrame } from "@/components/media/MediaFrame";
import { Picture } from "@/components/media/Picture";
import { Pebble } from "@/components/pebble/Pebble";
import { SectionHead } from "@/components/ui/SectionHead";
import { loopMedia, mediaFile, type ImageSet } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import styles from "./OnYourDesktop.module.css";

/** The frame spans the container: min(1280 px, the viewport less the side padding of 16 / 24 / 32 px). */
const FRAME_SIZES =
  "(max-width: 560px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1343px) calc(100vw - 64px), 1280px";
/** The quick chat's CSS width (OnYourDesktop.module.css: the companion is 74 %, 84 % or 83 % of the frame's height). */
const CHAT_SIZES =
  "(max-width: 560px) calc((100vw - 32px) * 0.88), (max-width: 1023px) calc((100vw - 48px) * 0.45), (max-width: 1343px) calc((100vw - 64px) * 0.4), 500px";

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
    <section id={SECTIONS.desktop} className="sec" aria-labelledby="desktop-title">
      <SectionHead id="desktop-title" label={labels.desktop} title={desktop.h2} lead={desktop.lead} chip={desktop.chapterId} />

      <div className="wrap grid-12 sec-body">
        <figure
          className={`full ${styles.vignette}`}
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
          <figcaption className={`grid-12 ${styles.captionRow}`}>
            <div className="main">
              <p className={styles.caption}>
                {common.sampleData}{" "}
                <span className={styles.pebbleNote}>
                  {hero.pebble.note} <span className={styles.live}>{hero.pebble.noteLive}</span>
                </span>
              </p>
            </div>
          </figcaption>
        </figure>

        <div className={`main ${styles.facts}`}>
          <ul className={styles.points}>
            {desktop.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className={styles.limit}>{desktop.limit}</p>
        </div>
      </div>
    </section>
  );
}
