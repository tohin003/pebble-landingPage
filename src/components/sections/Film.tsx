// Section 2, the film (DESIGN §5 row 2, comp 3): the poster as a large framed screen on the riverbed wallpaper,
// peeking above the fold at 1440 × 900 (critic H7), the H2 as its label, then (once the film exists) its length, the
// transcript link and the chapter list. The galet play button opens the theatre (FilmPlayer, mounted by the page).
//
// - Poster: the film's own poster (T0's frame 0, FILM_SPEC §15) when rendered; until then a real-UI still in a window
//   on the riverbed, with the static pebble on the desktop.
// - Teaser T0: a silent LoopVideo over the poster, deferred until the first scroll, tap or key or a few idle seconds
//   (critic H7), only when both the teaser and its poster exist. Phones keep the poster (no phone cut of T0).
// - Everything that plays (the button, the chapters) waits for html[data-film="ready"], so nothing is a dead control.
import { filmDurationLabel, formatTimecode, timedChapters, FILM_DURATION_SECONDS } from "@/content/chapters";
import { film, media } from "@/content/copy";
import { FilmTrigger } from "@/components/media/FilmTrigger";
import { LoopVideo } from "@/components/media/LoopVideo";
import { AppWindow, MediaFrame } from "@/components/media/MediaFrame";
import { Picture } from "@/components/media/Picture";
import { UiImage } from "@/components/media/UiImage";
import { Pebble } from "@/components/pebble/Pebble";
import { filmMedia, teaserMedia, type LoopMedia } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import { ChapterList, type ChapterItem } from "./Film.client";
import styles from "./Film.module.css";

const FRAME_SIZES = "(max-width: 1168px) calc(100vw - 48px), 1120px";

export function Film() {
  const files = filmMedia();
  const teaser = teaserMedia();
  const duration = filmDurationLabel();
  const chapters: ChapterItem[] = timedChapters().map((c) => ({
    id: c.id,
    title: c.title,
    seconds: c.startSeconds ?? 0,
    time: formatTimecode(c.startSeconds ?? 0),
  }));
  // T0 through LoopVideo, which never reads `id`: T0 is an excerpt of the approve → test → Verified chain.
  const teaserLoop: LoopMedia | null =
    teaser.available && teaser.poster.available
      ? { id: "approve-undo", width: 1280, height: 720, sources: teaser.sources, phoneSources: [], poster: teaser.poster, available: true }
      : null;

  return (
    <section id={SECTIONS.film} className={styles.film} aria-labelledby="film-title">
      {/* No fetch priority on the frame's pictures: on phones the frame is below the fold, where "high" put about 45 KB
          on the first screen's critical path (Lighthouse mobile LCP); where it peeks above the fold, the browser raises
          an image in view to high priority by itself (QA lane F3). */}
      <figure className={styles.screen}>
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
                <UiImage
                  name="main-done"
                  alt={media.stills.mainDone}
                  sizes="(max-width: 560px) 78vw, (max-width: 1168px) 66vw, 740px"
                />
              </AppWindow>
              <Pebble pose="happy" live={false} className={styles.deskPet} />
            </>
          )}
          {teaserLoop ? (
            <LoopVideo
              loop={teaserLoop}
              label={media.teaser}
              name={film.teaserName}
              defer="interaction"
              sizes={FRAME_SIZES}
              className={styles.teaser}
            />
          ) : null}
          <FilmTrigger label={film.play} className={styles.play} />
        </MediaFrame>
        <figcaption className={styles.caption}>
          <h2 id="film-title" className={styles.title}>
            {film.h2}
          </h2>
          <p className={styles.lead}>{film.lead}</p>
          {files.available ? (
            <div className={styles.extras}>
              <ul className={`facts ${styles.meta}`}>
                {duration && FILM_DURATION_SECONDS !== null ? (
                  <li>
                    <time dateTime={`PT${Math.round(FILM_DURATION_SECONDS)}S`}>{duration}</time>
                  </li>
                ) : null}
                <li>{film.playNote}</li>
                <li>
                  <a href="/film">{film.transcriptLink}</a>
                </li>
              </ul>
              <ChapterList chapters={chapters} label={film.chaptersHeading} />
            </div>
          ) : null}
        </figcaption>
      </figure>
    </section>
  );
}
