"use client";
// Parallel alternatives of equal weight, one at a time (.work/page-declutter/PLAN.md, "Components"): the ways in to a
// model, the reaches across the Mac, the two ways to install.
//
// One content tree serves both widths. Every panel lives in its own <details>, and the group shares a `name`, so at
// most one is open. Below 768 px the tablist hides and the summaries show: an accordion (tap a row to open it, tap it
// again to close it). From 768 px the summaries hide and a row of ARIA tabs (roving tabindex; arrows, Home and End)
// opens one panel at a time. The open item is one piece of state, so a live resize keeps the reader's place; landing
// on tabs with nothing open opens the first. Panels stay in the DOM (indexers, find-in-page, fragment links), and
// without JavaScript the first panel shows and the others open from their summaries.
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Caret } from "./Caret";
import styles from "./Tabs.module.css";

export type TabItem = Readonly<{ id: string; label: string; content: ReactNode }>;

export type TabsProps = Readonly<{
  items: readonly TabItem[];
  /** the tablist's accessible name */
  label: string;
  /** the item open at first */
  initial?: number;
  className?: string;
}>;

const WIDE = "(min-width: 768px)";

export function Tabs({ items, label, initial = 0, className }: TabsProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [active, setActive] = useState(initial);
  const [wide, setWide] = useState(true);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const sync = () => {
      setWide(mq.matches);
      if (mq.matches) setActive((prev) => (prev < 0 ? 0 : prev));
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const onToggle = useCallback((index: number, open: boolean) => {
    setActive((prev) => (open ? index : prev === index ? -1 : prev));
  }, []);

  // Keep the open item open at wide widths: tabs always show one panel.
  useEffect(() => {
    if (wide && active < 0) setActive(0);
  }, [wide, active]);

  const select = (index: number, focus: boolean) => {
    const next = (index + items.length) % items.length;
    setActive(next);
    if (focus) tabRefs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = active < 0 ? 0 : active;
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: items.length - 1 };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target, true);
  };

  const selected = active < 0 ? 0 : active;
  return (
    <div className={`${styles.tabs} ${className ?? ""}`} data-tabs="">
      <div role="tablist" aria-label={label} className={styles.list} onKeyDown={onKeyDown}>
        {items.map((item, i) => (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${item.id}`}
            aria-selected={i === selected}
            aria-controls={`${uid}-panel-${item.id}`}
            tabIndex={i === selected ? 0 : -1}
            className={styles.tab}
            onClick={() => select(i, false)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, i) => (
        <details
          key={item.id}
          name={`${uid}-group`}
          open={i === active}
          className={styles.item}
          data-item={item.id}
          onToggle={(event) => onToggle(i, event.currentTarget.open)}
        >
          <summary className={styles.summary}>
            <span>{item.label}</span>
            <Caret className={styles.caret} />
          </summary>
          <div
            id={`${uid}-panel-${item.id}`}
            role={wide ? "tabpanel" : undefined}
            aria-labelledby={wide ? `${uid}-tab-${item.id}` : undefined}
            tabIndex={wide ? 0 : undefined}
            className={styles.panel}
          >
            {item.content}
          </div>
        </details>
      ))}
    </div>
  );
}
