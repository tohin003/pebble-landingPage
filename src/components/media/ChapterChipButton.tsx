"use client";
// The chapter chip's button (ChapterChip.tsx renders it with the chapter's data).
import { Icon } from "@/components/shell/icons";
import { openFilm } from "./film-events";
import styles from "./ChapterChip.module.css";

export function ChapterChipButton({
  id,
  title,
  seconds,
  time,
  text,
  className,
}: {
  id: string;
  title: string;
  seconds: number;
  time: string;
  text: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${className ?? ""}`}
      onClick={(event) => {
        openFilm({ chapter: id, trigger: event.currentTarget });
      }}
    >
      <span className={`galet ${styles.mark}`} aria-hidden="true">
        <Icon name="PlayFill" className={styles.icon} />
      </span>
      <span className={styles.text}>{text}</span>
      <time className={styles.time} dateTime={`PT${Math.floor(seconds)}S`}>
        {time}
      </time>
      <span className="sr-only">{`: ${title}`}</span>
    </button>
  );
}
