"use client";
// The film's play button: the galet (critic M9) on the page's ground with an ink play mark, over the poster
// (DESIGN-LEXINGTON §6 Film). It opens FilmPlayer through openFilm() inside the click, so the film can start with sound
// (M5). Hidden until a FilmPlayer with a rendered film is on the page (html[data-film="ready"]); before the film exists
// the poster is simply a picture. /film passes its own children (an outline button) instead of the galet.
import type { ReactNode } from "react";
import { Icon } from "@/components/shell/icons";
import { openFilm } from "./film-events";
import styles from "./FilmTrigger.module.css";

export function FilmTrigger({
  label,
  chapter,
  className,
  children,
}: {
  /** the accessible name, for example "Play the film" (copy.ts `film.play`) */
  label: string;
  /** start at this chapter (src/content/chapters.ts) */
  chapter?: string;
  className?: string;
  /** replaces the default galet play button */
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`${styles.trigger} ${className ?? ""}`}
      data-shape={children ? undefined : "galet"}
      aria-label={label}
      onClick={(event) => {
        openFilm({ chapter, trigger: event.currentTarget });
      }}
    >
      {children ?? (
        <>
          <span className={`galet ${styles.galet}`} aria-hidden="true" />
          <Icon name="PlayFill" className={styles.icon} />
        </>
      )}
    </button>
  );
}
