// /film: the film as text, chapter by chapter (MASTER_PLAN §7.2 "Routes"; critic H4: a text alternative to a film
// whose information is visual and whose track is music only).
//
// For each chapter: its start time, "What you see" (chapters.ts `description`, reconciled with the cut by the claims
// review from FILM_SPEC §18), "On screen" (every line of on-screen text, chapters.ts `onScreen`) and "Sound" (the
// sound descriptions of the captions, filmCaptions.ts, which mirrors lane E's docs/film-captions.json). The length is
// computed from chapters.ts, never written by hand. The play button appears only once the film exists.
import type { Metadata } from "next";
import Link from "next/link";
import { chapters, filmDurationLabel, formatTimecode, timedChapters } from "@/content/chapters";
import { filmPage, film as filmCopy } from "@/content/copy";
import { chapterSounds } from "@/content/filmCaptions";
import { seo } from "@/content/seo";
import { FilmPlayer, type TimedChapter } from "@/components/media/FilmPlayer";
import { FilmTrigger } from "@/components/media/FilmTrigger";
import { Article, articleStyles } from "@/components/shell/Article";
import { filmMedia } from "@/lib/media";
import styles from "./film.module.css";

export const metadata: Metadata = {
  title: seo.pages.film.title,
  description: seo.pages.film.description,
  alternates: { canonical: "/film" },
};

export const revalidate = 3600;

export default function FilmPage() {
  const duration = filmDurationLabel();
  const timed: TimedChapter[] = timedChapters().map((c) => ({
    id: c.id,
    title: c.title,
    startSeconds: c.startSeconds ?? 0,
    time: formatTimecode(c.startSeconds ?? 0),
  }));
  return (
    <Article title={filmPage.h1} lead={filmPage.lead}>
      <div className={styles.top}>
        <FilmTrigger label={filmCopy.play} className={styles.play}>
          <span className={`galet ${styles.playMark}`} aria-hidden="true" />
          <span>{filmPage.play}</span>
        </FilmTrigger>
        {duration ? <p className={styles.length}>{filmPage.durationLabel(duration)}</p> : null}
      </div>

      <h2 className={styles.transcriptTitle}>{filmPage.transcriptHeading}</h2>
      <ol className={styles.chapters}>
        {chapters.map((chapter) => {
          const sounds = chapterSounds(chapter.id);
          const at = typeof chapter.startSeconds === "number" ? formatTimecode(chapter.startSeconds) : null;
          return (
            <li key={chapter.id} className={styles.chapter}>
              <section aria-labelledby={`chapter-${chapter.id}`}>
                <h3 id={`chapter-${chapter.id}`} className={styles.chapterTitle}>
                  <span className={`galet ${styles.chapterMark}`} aria-hidden="true" />
                  <span>{chapter.title}</span>
                  {at ? (
                    <time className={styles.time} dateTime={`PT${Math.floor(chapter.startSeconds ?? 0)}S`}>
                      {at}
                    </time>
                  ) : null}
                </h3>
                <dl className={styles.parts}>
                  {chapter.description ? (
                    <div>
                      <dt>{filmPage.descriptionLabel}</dt>
                      <dd>
                        <p>{chapter.description}</p>
                      </dd>
                    </div>
                  ) : null}
                  {chapter.onScreen.length ? (
                    <div>
                      <dt>{filmPage.onScreenLabel}</dt>
                      <dd>
                        <ul className={styles.lines}>
                          {chapter.onScreen.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ) : null}
                  {sounds.length ? (
                    <div>
                      <dt>{filmPage.soundLabel}</dt>
                      <dd>
                        <ul className={styles.sounds}>
                          {sounds.map((sound) => (
                            <li key={sound}>{sound}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>
            </li>
          );
        })}
      </ol>
      <p className={styles.sample}>{filmPage.sampleData}</p>
      <p className={articleStyles.back}>
        <Link href="/" prefetch={false}>
          {filmPage.backHome}
        </Link>
      </p>
      <FilmPlayer film={filmMedia()} chapters={timed} />
    </Article>
  );
}
