"use client";
// The film's chapter index (DESIGN-LEXINGTON §6 Film): one ruled row per timed chapter, a small stone, the start time
// as data and the title, as separate elements (never a middle-dot string). A press opens the theatre at that chapter
// through openFilm(), inside the click, so the film can start with sound (critic M5). The section renders this only
// when the film exists; it stays invisible (but keeps its space) until FilmPlayer marks html[data-film="ready"].
import { openFilm } from "@/components/media/film-events";
import styles from "./Film.module.css";

export type ChapterItem = Readonly<{ id: string; title: string; seconds: number; time: string }>;

export function ChapterList({ chapters, label }: { chapters: readonly ChapterItem[]; label: string }) {
  return (
    <ol className={styles.chapters} aria-label={label}>
      {chapters.map((chapter) => (
        <li key={chapter.id}>
          <button
            type="button"
            className={styles.chapter}
            onClick={(event) => {
              openFilm({ chapter: chapter.id, trigger: event.currentTarget });
            }}
          >
            <span className={`galet ${styles.stone}`} aria-hidden="true" />
            <time className={`data ${styles.time}`} dateTime={`PT${Math.floor(chapter.seconds)}S`}>
              {chapter.time}
            </time>
            <span className={styles.chapterTitle}>{chapter.title}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}
