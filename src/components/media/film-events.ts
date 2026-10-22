// Opening the film from anywhere on the page: the poster's play button, the chapter chips, the hero's film link. A
// plain DOM event, dispatched synchronously inside the click handler, so FilmPlayer can call video.play() in the same
// user activation (critic M5: Safari's rules are strict; never load the player lazily on click).

export const FILM_OPEN = "pebble:film-open";

export type FilmOpenDetail = Readonly<{
  /** a chapter id from src/content/chapters.ts; the film starts at its startSeconds */
  chapter?: string;
  /** focus returns here when the film closes */
  trigger?: HTMLElement | null;
}>;

/** Open the film theatre. Returns false when no player is on the page (the caller can follow a link instead). */
export function openFilm(detail: FilmOpenDetail = {}): boolean {
  if (typeof document === "undefined") return false;
  // dispatchEvent returns false when a listener called preventDefault(): FilmPlayer does, to say "handled".
  return !document.dispatchEvent(new CustomEvent<FilmOpenDetail>(FILM_OPEN, { detail, cancelable: true }));
}
