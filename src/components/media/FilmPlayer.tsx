"use client";
// The film theatre (MASTER_PLAN §7.6; critics C6, C9, M5, H4a): a modal <dialog> with the native player.
//
// - Mount it once per page, with the film's manifest entry and its timed chapters. Open it with openFilm() from
//   film-events.ts (FilmTrigger, ChapterChip): the click's handler dispatches the event, and this component sets the
//   source, opens the dialog and calls video.play() synchronously, inside the same user activation (M5).
// - The source is chosen at click time: 1080p when screen.width × devicePixelRatio ≥ 1700, otherwise 720p (C6, C9);
//   HEVC first when the browser can play it, then H.264.
// - Captions (not on by default), chapters and text descriptions are <track>s. A chapter seeks after loadedmetadata.
// - Audio description (critic H4a): when film.descriptions.en.vtt exists and the browser can speak, a toggle reads
//   each description cue aloud with speechSynthesis as the film reaches it.
// - Esc, the close button and a click on the backdrop close it; the film pauses and focus returns to what opened it.
// - With no film rendered yet, nothing listens: html[data-film] stays unset, so chips and triggers stay hidden.
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/shell/icons";
import { filmDialog } from "@/content/copy";
import type { FilmMedia, FilmQuality, VideoSource } from "@/lib/media";
import { FILM_OPEN, type FilmOpenDetail } from "./film-events";
import styles from "./FilmPlayer.module.css";

/** A chapter with a start time; `time` is its label, for example "0:24" (chapters.ts formatTimecode). */
export type TimedChapter = Readonly<{ id: string; title: string; startSeconds: number; time: string }>;

const HD_PIXELS = 1700;

function pickSource(film: FilmMedia, video: HTMLVideoElement): VideoSource | null {
  const wantHd = window.screen.width * (window.devicePixelRatio || 1) >= HD_PIXELS;
  const order: FilmQuality[] = wantHd ? ["1080", "720"] : ["720", "1080"];
  for (const quality of order) {
    for (const source of film.sources[quality]) {
      if (video.canPlayType(source.type) !== "") return source;
    }
  }
  return null;
}

export function FilmPlayer({ film, chapters }: { film: FilmMedia; chapters: readonly TimedChapter[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [describe, setDescribe] = useState(false);

  useEffect(() => {
    setCanSpeak(film.descriptions.available && typeof window !== "undefined" && "speechSynthesis" in window);
  }, [film.descriptions.available]);

  // Read the description cues aloud while the toggle is on.
  useEffect(() => {
    const v = video.current;
    if (!v || !describe) return;
    const track = [...v.textTracks].find((t) => t.kind === "descriptions");
    if (!track) return;
    track.mode = "hidden";
    const onCue = () => {
      const cue = track.activeCues?.[0] as VTTCue | undefined;
      if (!cue?.text) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cue.text);
      utterance.lang = "en-GB";
      window.speechSynthesis.speak(utterance);
    };
    track.addEventListener("cuechange", onCue);
    return () => {
      track.removeEventListener("cuechange", onCue);
      track.mode = "disabled";
      window.speechSynthesis.cancel();
    };
  }, [describe]);

  const seek = useCallback((seconds: number) => {
    const v = video.current;
    if (!v) return;
    if (v.readyState >= HTMLMediaElement.HAVE_METADATA) v.currentTime = seconds;
    else pendingSeek.current = seconds;
  }, []);

  const open = useCallback(
    (detail: FilmOpenDetail) => {
      const v = video.current;
      const d = dialog.current;
      if (!v || !d) return;
      opener.current = detail.trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      const source = pickSource(film, v);
      setFailed(!source);
      if (source && v.getAttribute("src") !== source.src) v.src = source.src;
      if (!d.open) d.showModal();
      const start = detail.chapter ? chapters.find((c) => c.id === detail.chapter)?.startSeconds : undefined;
      if (typeof start === "number") seek(start);
      if (source) void v.play().catch(() => {}); // synchronous, inside the click's activation
    },
    [chapters, film, seek],
  );

  useEffect(() => {
    if (!film.available) return;
    const root = document.documentElement;
    root.dataset.film = "ready";
    const onOpen = (event: Event) => {
      event.preventDefault(); // tells openFilm() the film is handled here
      open((event as CustomEvent<FilmOpenDetail>).detail ?? {});
    };
    document.addEventListener(FILM_OPEN, onOpen);
    return () => {
      document.removeEventListener(FILM_OPEN, onOpen);
      delete root.dataset.film;
    };
  }, [film.available, open]);

  if (!film.available) return null;

  const close = () => dialog.current?.close();

  return (
    <dialog
      ref={dialog}
      className={styles.theatre}
      aria-label={filmDialog.label}
      onClose={() => {
        video.current?.pause();
        if (canSpeak) window.speechSynthesis.cancel();
        opener.current?.focus({ preventScroll: true });
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close(); // the backdrop
      }}
    >
      <div className={styles.inner}>
        <button type="button" className={styles.close} onClick={close}>
          <Icon name="X" className={styles.closeIcon} />
          <span className="sr-only">{filmDialog.close}</span>
        </button>
        <div className={styles.screen}>
          <video
            ref={video}
            className={styles.video}
            controls
            playsInline
            preload="none"
            poster={film.poster.webp.available ? film.poster.webp.src : undefined}
            onLoadedMetadata={() => {
              const v = video.current;
              if (v && pendingSeek.current !== null) {
                v.currentTime = pendingSeek.current;
                pendingSeek.current = null;
              }
            }}
            onError={() => setFailed(true)}
          >
            {film.captions.available ? <track kind="captions" srcLang="en" label="English" src={film.captions.src} /> : null}
            {film.chapters.available ? <track kind="chapters" srcLang="en" label={filmDialog.chaptersHeading} src={film.chapters.src} /> : null}
            {film.descriptions.available ? <track kind="descriptions" srcLang="en" label="English" src={film.descriptions.src} /> : null}
          </video>
        </div>
        {failed ? (
          <p className={styles.note} role="alert">
            {filmDialog.noVideo}{" "}
            <Link href="/film" prefetch={false}>
              {filmDialog.transcriptLink}
            </Link>
          </p>
        ) : null}
        <div className={styles.below}>
          {canSpeak ? (
            <button type="button" className={styles.toggle} aria-pressed={describe} onClick={() => setDescribe((on) => !on)}>
              {filmDialog.audioDescription}
            </button>
          ) : null}
          {chapters.length > 0 ? (
            <ol className={styles.chapters} aria-label={filmDialog.chaptersHeading}>
              {chapters.map((chapter) => (
                <li key={chapter.id}>
                  <button
                    type="button"
                    onClick={() => {
                      seek(chapter.startSeconds);
                      void video.current?.play().catch(() => {});
                    }}
                  >
                    {chapter.title}
                    <time dateTime={`PT${Math.floor(chapter.startSeconds)}S`}>{chapter.time}</time>
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
          <p className={styles.note}>
            {filmDialog.captionsNote}{" "}
            <Link href="/film" prefetch={false}>
              {filmDialog.transcriptLink}
            </Link>
          </p>
        </div>
      </div>
    </dialog>
  );
}
