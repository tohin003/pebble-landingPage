// Section 2, the film (DESIGN-LEXINGTON §6 Film, comp lex-A): a figure first, so the poster peeks above the fold at
// 1440 × 900 (critic H7), then its caption on the grid. The frame spans the container (columns 1–12, 16 : 9); under it
// the caption: first "Shown with sample data." at column 4, in the caption style the desktop and Models pictures use
// (the film shows the fictional invoice-kit world; claims audit CL-1, critic C03); then the rail holds
// the label ("The film / 1:16, with sound.", the length as data) and the main column holds the H2 (one tone), the lead,
// "Read the transcript ›" and the chapters as a ruled index of three columns (two on tablets, one on phones): a stone,
// the start time as data, the title.
//
// - Poster: the film's own frame 0 (the trailer's cold open: the pebble's eyes in the right third of a dark frame,
//   OVERRIDES §46) when rendered; until then a real-UI still in a window on the riverbed, with the static pebble on the
//   desktop. The first film's teaser T0 is retired (§46): the poster is the whole picture, on phones too, and the film
//   itself plays only in the theatre (phones get its 1:1 cut there).
// - The play button is the galet on the page's ground with an ink play mark: playing the film is not one of the
//   accent's three jobs, and no control casts a shadow (DESIGN-LEXINGTON §3.5).
// - Everything that plays (the button, the chapters) waits for html[data-film="ready"], so nothing is a dead control;
//   the transcript is a plain link, shown whenever the film exists.
import { filmDurationLabel, formatTimecode, timedChapters, FILM_DURATION_SECONDS } from "@/content/chapters";
import { film, media } from "@/content/copy";
import { labels } from "@/content/labels";
import { FilmTrigger } from "@/components/media/FilmTrigger";
import { AppWindow, MediaFrame } from "@/components/media/MediaFrame";
import { Picture } from "@/components/media/Picture";
import { UiImage } from "@/components/media/UiImage";
import { Pebble } from "@/components/pebble/Pebble";
import { RailLabel } from "@/components/ui/RailLabel";
import { TextLink } from "@/components/ui/TextLink";
import { filmMedia } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import { ChapterList, type ChapterItem } from "./Film.client";
import styles from "./Film.module.css";

/** The frame spans the container: min(1280 px, the viewport less the side padding of 16 / 24 / 32 px). */
const FRAME_SIZES =
  "(max-width: 560px) calc(100vw - 32px), (max-width: 1023px) calc(100vw - 48px), (max-width: 1343px) calc(100vw - 64px), 1280px";
/** The window on the riverbed: 66 % of the frame (78 % on phones). */
const WINDOW_SIZES = "(max-width: 560px) calc((100vw - 32px) * 0.78), (max-width: 1343px) calc((100vw - 48px) * 0.66), 845px";

export function Film() {
  const files = filmMedia();
  const duration = filmDurationLabel();
  const chapters: ChapterItem[] = timedChapters().map((c) => ({
    id: c.id,
    title: c.title,
    seconds: c.startSeconds ?? 0,
    time: formatTimecode(c.startSeconds ?? 0),
  }));
  // "The film / 1:16, with sound." (the length is data); "The film / Plays with sound." while the length is unknown
  const label = duration !== null && FILM_DURATION_SECONDS !== null ? labels.filmLength(duration) : labels.film;

  return (
    <section id={SECTIONS.film} className={styles.film} aria-labelledby="film-title">
      <div className="wrap">
        {/* No fetch priority on the frame's pictures: on phones the frame is below the fold, where "high" put about
            45 KB on the first screen's critical path (Lighthouse mobile LCP); where it peeks above the fold, the browser
            raises an image in view to high priority by itself (QA lane F3). */}
        <figure className={styles.figure}>
          <MediaFrame variant="riverbed" aspect="16 / 9" sizes={FRAME_SIZES}>
            {files.poster.available ? (
              <Picture
                sets={[files.poster]}
                alt={film.posterAlt}
                sizes={FRAME_SIZES}
                className={styles.poster}
                imgClassName={styles.posterImg}
              />
            ) : (
              <>
                <AppWindow className={styles.window}>
                  <UiImage name="main-done" alt={media.stills.mainDone} sizes={WINDOW_SIZES} />
                </AppWindow>
                <Pebble pose="happy" live={false} className={styles.deskPet} />
              </>
            )}
            <FilmTrigger label={film.play} className={styles.play} />
          </MediaFrame>

          <figcaption className={styles.caption}>
            <div className="grid-12">
              <div className="main">
                <p className={styles.sample}>{film.sampleData}</p>
              </div>
            </div>
            <div className={`grid-12 ${styles.head}`}>
              <RailLabel name={label.name} fact={label.fact} className={`rail ${styles.label}`} />
              <div className="main">
                <h2 id="film-title" className={styles.title}>
                  {film.h2}
                </h2>
                <p className={`lead ${styles.lead}`}>{film.lead}</p>
                {files.available ? (
                  <>
                    <p className={styles.actions}>
                      <TextLink href="/film">{film.transcriptLink}</TextLink>
                    </p>
                    <ChapterList chapters={chapters} label={film.chaptersHeading} />
                  </>
                ) : null}
              </div>
            </div>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
