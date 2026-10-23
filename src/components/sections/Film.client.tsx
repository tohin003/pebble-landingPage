"use client";
// The film's chapter list (DESIGN §5 row 2): one button per timed chapter, a galet mark, the title and its start time
// as separate elements (no middle-dot strings, DESIGN §3). A press opens the theatre at that chapter through
// openFilm(), inside the click, so the film can start with sound (critic M5). The section renders this only when the
// film exists; it stays invisible (but keeps its space) until FilmPlayer marks html[data-film="ready"].
import { openFilm } from "@/components/media/film-events";
import { Icon } from "@/components/shell/icons";
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
            <span className={`galet ${styles.chapterMark}`} aria-hidden="true">
              <Icon name="PlayFill" className={styles.chapterIcon} />
            </span>
            <span className={styles.chapterTitle}>{chapter.title}</span>
            <time className={styles.chapterTime} dateTime={`PT${Math.floor(chapter.seconds)}S`}>
              {chapter.time}
            </time>
          </button>
        </li>
      ))}
    </ol>
  );
}
