"use client";
// The install command with its Copy button (MASTER_PLAN §7.2 row 10, §7.3; DESIGN §5 row 12). Copy puts the exact
// command on the clipboard, says "Copied, paste it in Terminal" in a polite live region, and asks the small pebble
// perched on the pill to tap (src/components/pebble/events.ts). Where the clipboard is unavailable or refused, it
// selects the command instead and says so. The command is rendered as it is, never reformatted (OVERRIDES §1).
// Its type shrinks with the pill (Install.module.css); where the whole line still can't fit, it scrolls sideways (it
// takes focus, so the keyboard can scroll it too) and fades out at the edge while more of it lies beyond (`data-more`).
import { useEffect, useId, useRef, useState } from "react";
import { tapPebble } from "@/components/pebble/events";
import { Icon } from "@/components/shell/icons";
import styles from "./Install.module.css";

/** Phosphor's Copy (regular), MIT; Phosphor is credited on /credits. */
const COPY_PATH =
  "M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z";

const RESET_MS = 2600;

export type InstallPillProps = Readonly<{
  command: string;
  /** the pebble on the pill (its `name`) */
  pebble: string;
  labels: Readonly<{ copy: string; copyAria: string; copied: string; copyFailed: string }>;
}>;

export function InstallPill({ command, pebble, labels }: InstallPillProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [more, setMore] = useState(false);
  const code = useRef<HTMLElement>(null);
  const timer = useRef(0);
  const statusId = useId();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Is part of the command hidden past the right edge? (A resize, a scroll, or the web font arriving can change it.)
  useEffect(() => {
    const el = code.current;
    if (!el) return;
    const update = () => setMore(el.scrollWidth - el.clientWidth - el.scrollLeft > 1);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    void document.fonts?.ready.then(update);
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, []);

  const settle = (next: "copied" | "failed") => {
    setState(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), next === "copied" ? RESET_MS : RESET_MS * 2);
  };

  const onCopy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(command);
      settle("copied");
      tapPebble(pebble);
    } catch {
      // select the command, so ⌘C is all that's left to do
      const el = code.current;
      const selection = window.getSelection();
      if (el && selection) {
        const range = document.createRange();
        range.selectNodeContents(el);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      settle("failed");
    }
  };

  return (
    <>
      <div className={styles.pill} data-state={state} data-more={more ? "" : undefined}>
        <code ref={code} className={styles.command} translate="no" tabIndex={0}>
          {command}
        </code>
        <button type="button" className={styles.copy} aria-label={labels.copyAria} aria-describedby={statusId} onClick={onCopy}>
          <span className={styles.copyIcons} aria-hidden="true">
            <svg viewBox="0 0 256 256" fill="currentColor" focusable="false" className={styles.iconCopy}>
              <path d={COPY_PATH} />
            </svg>
            <Icon name="Check" className={styles.iconCheck} />
          </span>
          <span>{labels.copy}</span>
        </button>
      </div>
      <p id={statusId} className={styles.status} data-state={state} role="status" aria-live="polite">
        {state === "copied" ? labels.copied : state === "failed" ? labels.copyFailed : ""}
      </p>
    </>
  );
}
