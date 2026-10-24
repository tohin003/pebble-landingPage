"use client";
// A short, silent feature loop (MASTER_PLAN §5.3, §7.6; critics H2, H3, C6).
//
// - Poster first: a <picture> overlay (AVIF/WebP), never the `poster` attribute (no srcset there). It fades out when
//   the video actually plays.
// - Sources are attached only when the loop comes within 200 px of the viewport (preload="none" until then), or, with
//   `defer="interaction"`, not before the visitor's first scroll, tap or key press, or a few idle seconds after load
//   (critic H7, for the film teaser).
// - It plays on its own when at least 35 % of it is visible and no live pebble is on screen (the pebble is the one
//   thing that moves unasked: PHILOSOPHY principle 1, critic C08; html[data-live-pebble], set by the pebble conductor).
//   It pauses off-screen and while the tab is hidden, and one loop plays at a time (the most visible, or the one the
//   visitor started).
// - A visible pause and play button (WCAG 2.2.2). Reduced motion or Pause motion: no autoplay; the poster stays with a
//   play button, and the visitor can still start it.
// - Phones (<= 560 px): the 4:5 punch-in when one exists, in its own shape and with its own poster; otherwise the
//   poster and the caption only (critic H2). A loop's shape is its frame's (src/lib/media.ts LOOP_FRAMES: 16:10, or
//   square for the project story's tile).
// - Nothing rendered yet: the poster alone, or `fallback` (for example a real-UI still). Never a broken player.
// - The pause and play galet floats on the picture with a 1 px ring, no shadow (DESIGN-LEXINGTON §3.5).
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { LIVE_PEBBLE, PEBBLE_LIVE } from "@/components/pebble/events";
import { Icon } from "@/components/shell/icons";
import { media as mediaCopy } from "@/content/copy";
import { useMotionMode } from "@/lib/hooks";
import type { LoopMedia } from "@/lib/media";
import { Picture } from "./Picture";
import styles from "./LoopVideo.module.css";

const PLAY_RATIO = 0.35;
const MAX_PLAYING = 1;
const PHONE_QUERY = "(max-width: 560px)";

// ---- one conductor for every loop on the page: the most visible eligible loop plays -------------------------------
// A loop the visitor started with its button plays while any of it is on screen and goes first: a press must never
// be undone by the visibility rule (pressing Play on a frame 30 % in view used to pause it again at once), nor by a
// live pebble on screen. Unasked, a loop plays only while no live pebble is on screen.
type Entry = { ratio: number; order: number; eligible: () => boolean; chosen: () => boolean; play: () => void; pause: () => void };
const entries = new Map<string, Entry>();
let order = 0;

function arbitrate() {
  const calm = !document.documentElement.hasAttribute(LIVE_PEBBLE);
  const ranked = [...entries.values()]
    .filter((e) => e.eligible() && (e.chosen() ? e.ratio > 0 : calm && e.ratio >= PLAY_RATIO))
    .sort((a, b) => Number(b.chosen()) - Number(a.chosen()) || b.ratio - a.ratio || a.order - b.order)
    .slice(0, MAX_PLAYING);
  for (const entry of entries.values()) {
    if (ranked.includes(entry)) entry.play();
    else entry.pause();
  }
}

let visibilityHooked = false;
function hookVisibility() {
  if (visibilityHooked || typeof document === "undefined") return;
  visibilityHooked = true;
  document.addEventListener("visibilitychange", arbitrate);
  document.addEventListener(PEBBLE_LIVE, arbitrate);
}

// ---- first interaction, for deferred loops ------------------------------------------------------------------------
let interacted = false;
const waiting = new Set<() => void>();
function onFirstInteraction(callback: () => void): () => void {
  if (interacted) {
    callback();
    return () => {};
  }
  waiting.add(callback);
  if (waiting.size === 1) {
    const fire = () => {
      if (interacted) return;
      interacted = true;
      for (const cb of waiting) cb();
      waiting.clear();
      for (const type of ["scroll", "pointerdown", "keydown", "touchstart"]) window.removeEventListener(type, fire);
    };
    for (const type of ["scroll", "pointerdown", "keydown", "touchstart"]) window.addEventListener(type, fire, { passive: true, once: true });
    // or a quiet moment after the page has loaded
    const idle = () => window.setTimeout(fire, 3500);
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  }
  return () => waiting.delete(callback);
}

export type LoopVideoProps = Readonly<{
  loop: LoopMedia;
  /** what the loop shows, for screen readers (copy.ts `media.loops.<name>.label`) */
  label: string;
  /** a short name for the button: "Pause the <name> clip" (copy.ts `media.loops.<name>.name`) */
  name: string;
  /** under the frame, for example "Shown with sample data." */
  caption?: ReactNode;
  /** the poster's CSS width at each breakpoint */
  sizes?: string;
  /** "interaction": attach sources only after the first scroll or tap, or idle time (critic H7) */
  defer?: "interaction";
  /** shown when neither the loop nor its poster exists yet */
  fallback?: ReactNode;
  /**
   * "start": on phones the pause and play button sits in the bottom-left corner, for a phone cut whose subject sits in
   * the bottom-right one, where the button would cover it (L1's pebble)
   */
  phoneControl?: "start";
  className?: string;
}>;

export function LoopVideo({
  loop,
  label,
  name,
  caption,
  sizes = "(max-width: 900px) 100vw, 800px",
  defer,
  fallback,
  phoneControl,
  className,
}: LoopVideoProps) {
  const id = useId();
  const figure = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false); // within 200 px: attach the sources
  const [ready, setReady] = useState(!defer); // the deferral is over
  const [phone, setPhone] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false); // played at least once: the poster has gone
  const [userPaused, setUserPaused] = useState(false);
  const [userStarted, setUserStarted] = useState(false);
  const mode = useMotionMode();
  const autoplay = mode === "on";

  const sources = phone ? loop.phoneSources : loop.sources;
  const hasVideo = phone !== null && sources.length > 0;
  const attached = hasVideo && near && ready;

  // phone or not (art direction, critic H2)
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!defer) return;
    return onFirstInteraction(() => setReady(true));
  }, [defer]);

  // attach when near, then load
  useEffect(() => {
    const el = figure.current;
    if (!el || !hasVideo) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasVideo]);

  useEffect(() => {
    if (attached) video.current?.load();
  }, [attached, sources]);

  // register with the conductor
  const eligibleRef = useRef<() => boolean>(() => false);
  const chosenRef = useRef(false);
  useEffect(() => {
    eligibleRef.current = () => attached && !userPaused && (autoplay || userStarted) && document.visibilityState === "visible";
    chosenRef.current = userStarted && !userPaused;
  });
  useEffect(() => {
    const el = figure.current;
    const v = video.current;
    if (!el || !v || !attached) return;
    hookVisibility();
    const entry: Entry = {
      ratio: 0,
      order: order++,
      eligible: () => eligibleRef.current(),
      chosen: () => chosenRef.current,
      play: () => {
        if (v.paused) void v.play().catch(() => {});
      },
      pause: () => {
        if (!v.paused) v.pause();
      },
    };
    entries.set(id, entry);
    const observer = new IntersectionObserver(
      ([record]) => {
        entry.ratio = record?.isIntersecting ? record.intersectionRatio : 0;
        arbitrate();
      },
      { threshold: [0, 0.2, PLAY_RATIO, 0.5, 0.75, 1] },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      entries.delete(id);
      v.pause();
      arbitrate();
    };
  }, [attached, id]);

  // a change of motion setting or of the visitor's choice: decide again
  useEffect(() => {
    arbitrate();
  }, [autoplay, userPaused, userStarted]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (playing) {
      setUserPaused(true);
      setUserStarted(false);
      v.pause();
    } else {
      setUserPaused(false);
      setUserStarted(true);
      if (!near) setNear(true);
      if (!ready) setReady(true); // a press ends a deferral too
      void v.play().catch(() => {}); // when the sources aren't attached yet, the conductor starts it once they are
    }
  };

  const posterAvailable = loop.poster.available;
  // A loop with a 4:5 phone cut takes the cut's shape on phones (CSS, so the server's HTML is already right), and its
  // own poster there; the hidden poster is never fetched (lazy, display: none).
  const phoneCut = loop.phoneSources.length > 0;
  const phonePoster = phoneCut && loop.phonePoster?.available ? loop.phonePoster : null;
  const fade = started ? { opacity: 0 } : undefined;
  const stageStyle = { "--loop-aspect": `${loop.width} / ${loop.height}` } as CSSProperties;
  return (
    <figure ref={figure} className={`${styles.loop} ${className ?? ""}`} data-playing={playing ? "" : undefined}>
      <div className={styles.box}>
        <div className={styles.stage} role="img" aria-label={label} data-phone-cut={phoneCut ? "" : undefined} style={stageStyle}>
          {hasVideo ? (
            <video
              ref={video}
              className={styles.video}
              muted
              loop
              playsInline
              preload="none"
              width={loop.width}
              height={loop.height}
              aria-hidden="true"
              tabIndex={-1}
              disablePictureInPicture
              onPlaying={() => {
                setPlaying(true);
                setStarted(true);
              }}
              onPause={() => setPlaying(false)}
            >
              {attached ? sources.map((source) => <source key={source.src} src={source.src} type={source.type} />) : null}
            </video>
          ) : null}
          {posterAvailable ? (
            <Picture
              sets={[loop.poster]}
              alt=""
              sizes={sizes}
              className={`${styles.poster} ${phonePoster ? styles.widePoster : ""}`}
              imgClassName={styles.posterImg}
              style={fade}
            />
          ) : hasVideo ? null : (
            fallback
          )}
          {phonePoster ? (
            <Picture
              sets={[phonePoster]}
              alt=""
              sizes="calc(100vw - 32px)"
              className={`${styles.poster} ${styles.phonePoster}`}
              imgClassName={styles.posterImg}
              style={fade}
            />
          ) : null}
        </div>
        {hasVideo ? (
          <button
            type="button"
            className={styles.control}
            data-phone-start={phoneControl === "start" ? "" : undefined}
            onClick={toggle}
            aria-label={playing ? mediaCopy.loopControls.pause(name) : mediaCopy.loopControls.play(name)}
          >
            <span className={`galet ${styles.controlShape}`} aria-hidden="true" />
            {playing ? (
              <Icon name="PauseFill" className={styles.controlIcon} />
            ) : (
              <Icon name="PlayFill" className={styles.controlIcon} />
            )}
          </button>
        ) : null}
      </div>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
