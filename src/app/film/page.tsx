// /film: the film as text, chapter by chapter (MASTER_PLAN §7.2 "Routes"; critic H4: a text alternative to a film
// whose information is visual and whose track is music only).
//
// The Pebble 2.0 launch film (it replaced the 1.x trailer on 2 Nov 2026). For each chapter: its start time, "What you
// see" (chapters.ts `description`, the same words the audio description reads) and "On screen" (the film's lines,
// chapters.ts `onScreen`). The film has no voice and its captions carry only its on-screen type, so there is no sound
// part. Under the transcript, the film's notes (chapters.ts `filmNotes`): sample data, how its pictures were made, the
// benchmark's method beside the comparisons above, and the music. The length is computed from chapters.ts, never
// written by hand. The play button appears only once the film exists. The whole page is in the copy lint's named
// scope (the transcript of a film that names the products it was measured against).
import type { Metadata } from "next";
import Link from "next/link";
import { chapters, filmDurationLabel, filmNotes, formatTimecode, timedChapters } from "@/content/chapters";
import { filmPage, film as filmCopy } from "@/content/copy";
import { openGraphFor, seo, twitterCard } from "@/content/seo";
import { FilmPlayer, type TimedChapter } from "@/components/media/FilmPlayer";
import { FilmTrigger } from "@/components/media/FilmTrigger";
import { Article, articleStyles } from "@/components/shell/Article";
import { Icon } from "@/components/shell/icons";
import { DataText } from "@/components/ui/Data";
import { filmMedia } from "@/lib/media";
import styles from "./film.module.css";

export const metadata: Metadata = {
  title: seo.pages.film.title,
  description: seo.pages.film.description,
  alternates: { canonical: "/film" },
  openGraph: openGraphFor("/film"),
  twitter: twitterCard(),
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
          <Icon name="PlayFill" className={styles.playMark} />
          <span>{filmPage.play}</span>
        </FilmTrigger>
        {duration ? (
          <p className={styles.length}>
            <DataText text={filmPage.durationLabel(duration)} />
          </p>
        ) : null}
      </div>

      <h2 className={styles.transcriptTitle}>{filmPage.transcriptHeading}</h2>
      <ol className={styles.chapters}>
        {chapters.map((chapter) => {
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
                          {/* a line may come twice, as S10's "Lower is better." does */}
                          {chapter.onScreen.map((line, i) => (
                            <li key={`${i}-${line}`}>{line}</li>
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
      {filmNotes.map((note) => (
        <p key={note} className={styles.sample}>
          {note}
        </p>
      ))}
      <p className={articleStyles.back}>
        <Link href="/" prefetch={false}>
          {filmPage.backHome}
        </Link>
      </p>
      <FilmPlayer film={filmMedia()} chapters={timed} />
    </Article>
  );
}
