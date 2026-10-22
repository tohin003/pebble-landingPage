// Section 2, the film (DESIGN §5 row 2, comp 3): the poster as a large framed screen on the riverbed wallpaper,
// peeking above the fold at 1440 × 900 (critic H7), the H2 as its label, and the chapters. The play button opens the
// theatre (FilmPlayer, mounted by the page).
//
// STUB by lane F1 (site shell), with the shell's media pieces wired in. TODO(F2):
// - the T0 teaser in the screen (LoopVideo with defer="interaction", critic H7), once lane G renders it;
// - the film's length from chapters.ts (`filmDurationLabel()`), the transcript link, and the chapter list (the chips
//   below render only for chapters with a start time).
import { chapters } from "@/content/chapters";
import { film, media } from "@/content/copy";
import { ChapterChip } from "@/components/media/ChapterChip";
import { FilmTrigger } from "@/components/media/FilmTrigger";
import { AppWindow, MediaFrame } from "@/components/media/MediaFrame";
import { UiImage } from "@/components/media/UiImage";
import { Pebble } from "@/components/pebble/Pebble";
import { SECTIONS } from "@/lib/sections";
import styles from "./Film.module.css";

export function Film() {
  return (
    <section id={SECTIONS.film} className={styles.film} aria-labelledby="film-title" data-path-anchor="margin" data-todo="F2">
      <figure className={styles.screen}>
        <MediaFrame variant="riverbed" aspect="16 / 9" priority sizes="(max-width: 1168px) calc(100vw - 48px), 1120px">
          <AppWindow className={styles.window}>
            <UiImage
              name="main-done"
              alt={media.stills.mainDone}
              sizes="(max-width: 560px) 78vw, (max-width: 1168px) 66vw, 740px"
              priority
            />
          </AppWindow>
          <Pebble pose="happy" live={false} className={styles.deskPet} />
          <FilmTrigger label={film.play} className={styles.play} />
        </MediaFrame>
        <figcaption className={styles.caption}>
          <h2 id="film-title" className={styles.title}>
            {film.h2}
          </h2>
          <p className={styles.lead}>{film.lead}</p>
          <ol className={styles.chapters}>
            {chapters.map((chapter) => (
              <li key={chapter.id}>
                <ChapterChip chapterId={chapter.id} />
              </li>
            ))}
          </ol>
        </figcaption>
      </figure>
    </section>
  );
}
