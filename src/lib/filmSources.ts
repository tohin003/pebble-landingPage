// Which of the film's files the theatre plays, best first (FilmPlayer; OVERRIDES §46 P2-9). Pure, so it is tested
// without a browser (media.test.ts) and keeps media.ts out of the client bundle: FilmPlayer passes the browser's own
// answers (the phone media query, the screen's device pixels, video.canPlayType).
import type { FilmMedia, FilmQuality, VideoSource } from "./media";

/** When the theatre plays the 1:1 film: the page's phone breakpoint (the play button's own, FilmTrigger.module.css). */
export const FILM_PHONE_QUERY = "(max-width: 560px)";
/** 1080p from a screen this many device pixels wide (screen.width × devicePixelRatio), else 720p (critics C6, C9). */
export const HD_PIXELS = 1700;

/**
 * The film's sources in the order the theatre tries them: on a phone the 1:1 film first, whose interface text stays
 * readable at phone width; then the wanted 16:9 quality, then the other; HEVC before H.264 in each; only the sources
 * the browser says it can play. The 16:9 files stay as the fallbacks a failing decode moves on to.
 */
export function filmSourceOrder(film: FilmMedia, opts: { phone: boolean; hd: boolean; canPlay: (type: string) => boolean }): VideoSource[] {
  const playable = (list: readonly VideoSource[]) => list.filter((source) => opts.canPlay(source.type));
  const order: FilmQuality[] = opts.hd ? ["1080", "720"] : ["720", "1080"];
  const wide = order.flatMap((quality) => playable(film.sources[quality]));
  return opts.phone ? [...playable(film.phoneSources), ...wide] : wide;
}

/** Whether a source is the 1:1 phone film (the theatre's screen is then square, and the 16:9 poster stays off it). */
export const isPhoneSource = (film: FilmMedia, source: VideoSource | null): boolean =>
  !!source && film.phoneSources.some((p) => p.src === source.src);
