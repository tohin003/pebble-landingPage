"use client";
// MemoryForgetDemo (MASTER_PLAN §7.3, DESIGN §5 row 8): the "forget …" card that Pebble shows in a conversation
// (src/App.vue:2055-2084 at v1.0.1), rebuilt in HTML with the app's own words and three sample memories.
//
// It behaves as the app does:
// - Forget: the button gives way to "Forgotten". Focus moves on to the next Forget button, or to Done when none is
//   left, and a polite live region says what was forgotten.
// - Done: the card closes. "Reset the example" (shown once anything changed) brings it back.
// - All memories in Settings: a link to the Settings › Memory picture in the same section (`settingsHref`).
// Keyboard operable, labelled "Interactive example" above the slice of conversation, as the other explainers are, with
// the stone galet (a recreation is not a state, so not the accent). Its stage is the page's flat panel
// (DESIGN-LEXINGTON §3.8); the card's insides keep the app's own look. Its only motion answers a click (the
// "Forgotten" label fades in, CSS only); under reduced or paused motion every change is instant (globals.css).
import { useEffect, useId, useRef, useState } from "react";
import { explainers, memory } from "@/content/copy";
import styles from "./MemoryForgetDemo.module.css";

const copy = explainers.memoryForget;
const ITEMS = copy.items;

type Focus = { kind: "forget"; id: string } | { kind: "done" } | { kind: "reset" } | null;

export function MemoryForgetDemo({ settingsHref }: { settingsHref: string }) {
  const [forgotten, setForgotten] = useState<ReadonlySet<string>>(() => new Set());
  const [open, setOpen] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [focus, setFocus] = useState<Focus>(null);
  const forgetButtons = useRef(new Map<string, HTMLButtonElement>());
  const doneButton = useRef<HTMLButtonElement>(null);
  const resetButton = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const changed = !open || forgotten.size > 0;

  // Move focus after the DOM has changed (the pressed button is gone by then).
  useEffect(() => {
    if (!focus) return;
    const target =
      focus.kind === "forget"
        ? forgetButtons.current.get(focus.id)
        : focus.kind === "done"
          ? doneButton.current
          : resetButton.current;
    target?.focus();
    setFocus(null);
  }, [focus]);

  const forget = (id: string) => {
    const next = new Set(forgotten);
    next.add(id);
    setForgotten(next);
    const item = ITEMS.find((m) => m.id === id);
    setAnnouncement(item ? `${copy.forgotten}: ${item.content}` : copy.forgotten);
    // the next remaining Forget button after this one (then from the top), else Done
    const at = ITEMS.findIndex((m) => m.id === id);
    const rest = [...ITEMS.slice(at + 1), ...ITEMS.slice(0, at)].find((m) => !next.has(m.id));
    setFocus(rest ? { kind: "forget", id: rest.id } : { kind: "done" });
  };

  const done = () => {
    setOpen(false);
    setAnnouncement("");
    setFocus({ kind: "reset" });
  };

  const reset = () => {
    setForgotten(new Set());
    setOpen(true);
    setAnnouncement("");
    setFocus({ kind: "forget", id: ITEMS[0]!.id });
  };

  return (
    <figure className={styles.demo}>
      <figcaption className={styles.label}>
        <span className={styles.example}>{explainers.label}</span>
        <span>
          {memory.demoWords} {explainers.sampleData}
        </span>
      </figcaption>
      <div className={styles.window}>
        <p className={styles.request}>{copy.request}</p>
        {open ? (
          <section className={styles.card} aria-labelledby={headingId}>
            <h3 id={headingId} className={styles.heading}>
              {copy.heading(copy.subject)}
            </h3>
            <p className={styles.note}>{copy.note}</p>
            <ul className={styles.list}>
              {ITEMS.map((item) => {
                const gone = forgotten.has(item.id);
                return (
                  <li key={item.id} className={styles.item}>
                    <div className={styles.memory}>
                      <p>{item.content}</p>
                      <small>{item.where}</small>
                    </div>
                    {gone ? (
                      // The app marks this label role="status"; here the live region below announces it, because a
                      // status element inserted after the fact is not announced reliably.
                      <span className={styles.forgotten}>{copy.forgotten}</span>
                    ) : (
                      <button
                        type="button"
                        className={styles.forget}
                        aria-label={copy.forgetAria(item.content)}
                        ref={(el) => {
                          if (el) forgetButtons.current.set(item.id, el);
                          else forgetButtons.current.delete(item.id);
                        }}
                        onClick={() => forget(item.id)}
                      >
                        {copy.forget}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className={styles.actions}>
              <a className={styles.textButton} href={settingsHref}>
                {copy.allInSettings}
              </a>
              <button type="button" className={styles.textButton} ref={doneButton} onClick={done}>
                {copy.done}
              </button>
            </div>
          </section>
        ) : null}
      </div>
      {/* the row keeps its height, so the page doesn't move when the reset appears */}
      <div className={styles.after}>
        {changed ? (
          <button type="button" className={styles.reset} ref={resetButton} onClick={reset}>
            {explainers.reset}
          </button>
        ) : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </figure>
  );
}
