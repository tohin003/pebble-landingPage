"use client";
// ApprovalCardDemo (MASTER_PLAN §7.3, DESIGN §5 row 5): an edit card as Pebble 1.0.1 shows it in Details › Activity,
// labelled "Interactive example". Every word on the card is Pebble's own (copy.ts `explainers.approvalCard`, from
// App.vue at v1.0.1); the file and its diff are sample data. The card follows the app's own states and rules:
// - pending: "Needs your review", the diff open, Don't allow and Apply edit;
// - Apply edit: "Done", the diff folds away, Undo this edit;
// - Undo this edit: "Undone"; Don't allow: "Not allowed". Neither shows anything the app doesn't (§7.3), so the
//   example simply offers "Reset the example" outside the card.
// Keyboard: every control is a native button; focus moves to the control that replaces the one just pressed. The
// status change is announced politely. Under reduced or paused motion the change is instant.
// The story's guide pebble listens for `pebble:approval-demo` to show the "!" only while the card waits.
import { useEffect, useRef, useState } from "react";
import { explainers } from "@/content/copy";
import styles from "./ApprovalCardDemo.module.css";

export type ApprovalStatus = "pending" | "applied" | "rejected" | "undone";

/** Fired on document whenever the example's status changes: { detail: { status } }. */
export const APPROVAL_DEMO_EVENT = "pebble:approval-demo";

const copy = explainers.approvalCard;

// Phosphor 2.1.10 (MIT, credited on /credits), regular weight: the icons the app's card uses (PhCode, PhCheck,
// PhArrowCounterClockwise).
const CODE =
  "M69.12,94.15,28.5,128l40.62,33.85a8,8,0,1,1-10.24,12.29l-48-40a8,8,0,0,1,0-12.29l48-40a8,8,0,0,1,10.24,12.3Zm176,27.7-48-40a8,8,0,1,0-10.24,12.3L227.5,128l-40.62,33.85a8,8,0,1,0,10.24,12.29l48-40a8,8,0,0,0,0-12.29ZM162.73,32.48a8,8,0,0,0-10.25,4.79l-64,176a8,8,0,0,0,4.79,10.26A8.14,8.14,0,0,0,96,224a8,8,0,0,0,7.52-5.27l64-176A8,8,0,0,0,162.73,32.48Z";
const CHECK =
  "M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z";
const UNDO =
  "M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z";

function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 256 256" className={className} aria-hidden="true" focusable="false">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

function lineKind(line: string): "added" | "removed" | "hunk" | undefined {
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "added";
  if (line.startsWith("-")) return "removed";
  return undefined;
}

export function ApprovalCardDemo({ className }: { className?: string }) {
  const [status, setStatus] = useState<ApprovalStatus>("pending");
  const [diffOpen, setDiffOpen] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  // after a press, focus goes to the control that replaced the pressed one
  const focusNext = useRef<"apply" | "undo" | "reset" | null>(null);
  const applyRef = useRef<HTMLButtonElement>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const resetRef = useRef<HTMLButtonElement>(null);

  // The new control exists only after the render, so the focus moves in an effect.
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === "apply") applyRef.current?.focus();
    if (target === "undo") undoRef.current?.focus();
    if (target === "reset") resetRef.current?.focus();
  }, [status]);

  const go = (next: ApprovalStatus, focus: "apply" | "undo" | "reset") => {
    focusNext.current = focus;
    setStatus(next);
    setDiffOpen(next === "pending"); // the app opens the diff only while the card waits
    setAnnouncement(next === "pending" ? "" : copy.statusAnnouncement(copy.status[next]));
    document.dispatchEvent(new CustomEvent(APPROVAL_DEMO_EVENT, { detail: { status: next } }));
  };

  return (
    <div className={`${styles.demo} ${className ?? ""}`}>
      <p className={styles.label}>
        <span className={styles.example}>{explainers.label}</span>
        <span>{copy.intro}</span>
      </p>

      <article className={styles.card} data-status={status} aria-label={copy.path}>
        <div className={styles.heading}>
          <Glyph d={CODE} className={styles.kindIcon} />
          <strong className={styles.path}>{copy.path}</strong>
          <span key={status} className={styles.status} data-status={status}>
            {copy.status[status]}
          </span>
        </div>
        <p className={styles.lead}>{copy.lead}</p>
        <p className={styles.description}>{copy.description}</p>
        <details
          className={styles.details}
          open={diffOpen}
          onToggle={(event) => setDiffOpen(event.currentTarget.open)}
        >
          <summary>{copy.viewDiff}</summary>
          <pre className={styles.diff} tabIndex={0}>
            {copy.diff.map((line, i) => (
              <span key={i} className={styles.line} data-kind={lineKind(line)}>
                {line}
              </span>
            ))}
          </pre>
        </details>

        {status === "pending" ? (
          <div className={styles.buttons}>
            <button type="button" className={styles.secondary} onClick={() => go("rejected", "reset")}>
              {copy.reject}
            </button>
            <button ref={applyRef} type="button" className={styles.primary} onClick={() => go("applied", "undo")}>
              <Glyph d={CHECK} className={styles.buttonIcon} />
              {copy.apply}
            </button>
          </div>
        ) : null}
        {status === "applied" ? (
          <button ref={undoRef} type="button" className={styles.undo} onClick={() => go("undone", "reset")}>
            <Glyph d={UNDO} className={styles.buttonIcon} />
            {copy.undo}
          </button>
        ) : null}
      </article>

      <div className={styles.after}>
        {status === "rejected" || status === "undone" ? (
          <button ref={resetRef} type="button" className={styles.reset} onClick={() => go("pending", "apply")}>
            {explainers.reset}
          </button>
        ) : null}
        <p className={styles.sample}>{explainers.sampleData}</p>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
