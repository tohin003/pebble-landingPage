"use client";
// The hero's two small interactive pieces (DESIGN §5 row 1):
// - HeroHello: the pebble is a real button, "Say hi to Pebble". A click (or Enter or Space) makes the pebble do its
//   tap face through lane B's tapPebble("hero"), and "Hi, I'm Pebble." appears in a polite live region beside it
//   (MASTER_PLAN §4.2). The SVG stays aria-hidden; the button carries the name.
// - HeroCta: the call to action, plus the download notice (MASTER_PLAN §7.4): after a click on Download, a short
//   panel explains the one-time first-run step and links to "Why isn't it notarized?". The download itself is never
//   held up: the link keeps its default action.
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { tapPebble } from "@/components/pebble/events";
import { Icon } from "@/components/shell/icons";
import { cta, downloadNotice, hero } from "@/content/copy";
import { inline } from "@/lib/inline";
import { SECTIONS } from "@/lib/sections";
import styles from "./Hero.module.css";

/** How long the greeting stays (comp 3). */
const BUBBLE_MS = 2200;

export function HeroHello({ children }: { children: ReactNode }) {
  const [text, setText] = useState("");
  const [on, setOn] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const frame = useRef(0);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );

  const sayHi = () => {
    tapPebble("hero");
    clearTimeout(timer.current);
    cancelAnimationFrame(frame.current);
    // Empty the live region for a frame first, so a second hello is announced again.
    setText("");
    frame.current = requestAnimationFrame(() => {
      setText(hero.pebble.bubble);
      setOn(true);
    });
    timer.current = setTimeout(() => setOn(false), BUBBLE_MS);
  };

  return (
    <>
      <button type="button" className={styles.hello} aria-label={hero.pebble.sayHi} onClick={sayHi}>
        {children}
      </button>
      <p className={styles.bubble} role="status" data-on={on ? "" : undefined}>
        {text}
      </p>
    </>
  );
}

export function HeroCta({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as Element | null)?.closest?.<HTMLElement>('[data-cta="download"]');
    if (!link) return;
    opener.current = link;
    setOpen(true); // the link's own action (the download) goes ahead
  };

  const close = () => {
    setOpen(false);
    opener.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <div className={className} style={style} onClickCapture={onClickCapture}>
        {children}
      </div>
      <div className={styles.dlSlot} aria-live="polite">
        {open ? (
          <section
            className={styles.dlNotice}
            aria-labelledby="download-notice-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") close();
            }}
          >
            <h2 id="download-notice-title" className={styles.dlTitle}>
              {downloadNotice.title}
            </h2>
            <button type="button" className={styles.dlClose} onClick={close}>
              <Icon name="X" className={styles.dlCloseIcon} />
              <span className="sr-only">{downloadNotice.close}</span>
            </button>
            {downloadNotice.body.map((paragraph) => (
              <p key={paragraph}>{inline(paragraph)}</p>
            ))}
            <p>
              <a href="#faq-notarized">{downloadNotice.whyLink}</a>
            </p>
            <p className={styles.dlTip}>
              {downloadNotice.installerTip} <a href={`#${SECTIONS.install}`}>{cta.installLink}</a>
            </p>
          </section>
        ) : null}
      </div>
    </>
  );
}
