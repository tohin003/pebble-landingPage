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

/**
 * In the accordion, opening a row closes the one above it, which can lift the tapped row under the sticky header. Once
 * the layout settles, bring it back just under the header (scroll-margin-top in Tabs.module.css), instantly: no motion.
 */
function keepInView(item: HTMLDetailsElement) {
  requestAnimationFrame(() => {
    const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 64;
    if (item.getBoundingClientRect().top < header) item.scrollIntoView({ block: "start", behavior: "instant" });
  });
}

export function Tabs({ items, label, initial = 0, className }: TabsProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [active, setActive] = useState(initial);
  const [wide, setWide] = useState(true);
  // the panel fades in only when the reader picks a tab, never at load (Tabs.module.css)
  const [switched, setSwitched] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const itemRefs = useRef<(HTMLDetailsElement | null)[]>([]);

  // The <details> own their open state: React sets `open` once, at first render, and never again, so it can't fight
  // the browser's own toggling (a tap on a summary, the group's exclusivity, find-in-page). A tab opens its panel on
  // the element itself; the toggle events keep `active` in step.
  const openItem = useCallback((index: number) => {
    const item = itemRefs.current[index];
    if (item && !item.open) item.open = true;
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const sync = () => {
      setWide(mq.matches);
      // tabs always show one panel: landing on tabs with nothing open opens the first
      if (mq.matches && !itemRefs.current.some((item) => item?.open)) {
        setActive(0);
        openItem(0);
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [openItem]);

  const onToggle = useCallback((index: number, open: boolean) => {
    setActive((prev) => (open ? index : prev === index ? -1 : prev));
  }, []);

  const select = (index: number, focus: boolean) => {
    const next = (index + items.length) % items.length;
    setActive(next);
    setSwitched(true);
    openItem(next);
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
    <div className={`${styles.tabs} ${className ?? ""}`} data-tabs="" data-switched={switched ? "" : undefined}>
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
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          name={`${uid}-group`}
          open={i === initial}
          className={styles.item}
          data-item={item.id}
          onToggle={(event) => {
            const item = event.currentTarget;
            onToggle(i, item.open);
            if (item.open && !window.matchMedia(WIDE).matches) keepInView(item);
          }}
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
