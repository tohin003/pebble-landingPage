"use client";
// The hero's one interactive piece (DESIGN §5 row 1): the pebble is a real button, "Say hi to Pebble". A click (or
// Enter or Space) makes the pebble do its tap face through lane B's tapPebble("hero"), and "Hi, I'm Pebble." appears
// in a polite live region beside it (MASTER_PLAN §4.2). The SVG stays aria-hidden; the button carries the name.
// (The download notice that used to live here is src/components/ui/DownloadNotice.tsx, shared with the final call to
// action through GetPebbleCluster.)
import { useEffect, useRef, useState, type ReactNode } from "react";
import { tapPebble } from "@/components/pebble/events";
import { hero } from "@/content/copy";
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
