"use client";
// A note one tap away (.work/page-declutter/PLAN.md, "Components"): a text button and its note. Hover is an
// accelerator, never the only way in.
//
// - Tap or click toggles the note and pins it; a tap elsewhere or Escape closes it (Escape returns focus).
// - Keyboard focus (focus-visible) opens it; moving focus away closes it unless it was pinned.
// - Hover opens it only where the pointer can hover precisely: (hover: hover) and (pointer: fine).
// - Below 768 px, or on touch, it opens as an inline block under the line, so nothing floats off-screen. From 768 px
//   with a fine pointer, it is a small bubble under the trigger, clamped inside the viewport.
// - The note is always in the DOM: while closed it is clipped like .sr-only, so screen readers read it in place and
//   indexers see it. Never put a must-stay-visible line in one (PLAN.md, "Must stay visible").
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./InfoTip.module.css";

export type InfoTipProps = Readonly<{
  /** the trigger's words */
  label: string;
  /** the note */
  children: ReactNode;
  className?: string;
}>;

const HOVER = "(hover: hover) and (pointer: fine)";
const BUBBLE = "(hover: hover) and (pointer: fine) and (min-width: 768px)";
const EDGE = 16;

export function InfoTip({ label, children, className }: InfoTipProps) {
  const id = `${useId().replace(/[^a-zA-Z0-9_-]/g, "")}-note`;
  const [pinned, setPinned] = useState(false);
  const [soft, setSoft] = useState(false);
  const [shift, setShift] = useState(0);
  const root = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const note = useRef<HTMLSpanElement>(null);
  const open = pinned || soft;

  const close = useCallback(() => {
    setPinned(false);
    setSoft(false);
  }, []);

  // A pinned note closes on a tap or click outside it, and any open note closes on Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // The bubble stays inside the viewport: shift it left by what would cross the right edge, or right by what would
  // cross the left. Measured on open and on resize.
  useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const place = () => {
      const el = note.current;
      if (!el || !window.matchMedia(BUBBLE).matches) {
        setShift(0);
        return;
      }
      el.style.setProperty("--tip-shift", "0px");
      const box = el.getBoundingClientRect();
      const width = document.documentElement.clientWidth;
      const over = box.right - (width - EDGE);
      const under = EDGE - box.left;
      setShift(over > 0 ? -over : under > 0 ? under : 0);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  const hoverable = () => typeof window !== "undefined" && window.matchMedia(HOVER).matches;

  return (
    <span
      ref={root}
      className={`${styles.tip} ${className ?? ""}`}
      data-open={open ? "" : undefined}
      onMouseEnter={() => {
        if (hoverable()) setSoft(true);
      }}
      onMouseLeave={() => {
        if (hoverable()) setSoft(false);
      }}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null)) setSoft(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (pinned) close();
          else setPinned(true);
        }}
        onFocus={(event) => {
          if (event.currentTarget.matches(":focus-visible")) setSoft(true);
        }}
      >
        {label}
      </button>
      <span
        ref={note}
        id={id}
        role="note"
        className={styles.note}
        style={shift ? ({ "--tip-shift": `${shift}px` } as CSSProperties) : undefined}
      >
        {children}
      </span>
    </span>
  );
}
