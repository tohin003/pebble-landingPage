"use client";
// AgentGuard's interactive example (DESIGN §5 row 3: "stills with an Interactive-example toggle" until loop L6
// exists): two real captures of the invoice-kit fix, the task held at "verification required" and the task after its
// tests ran. Two native radio buttons pick one; both stills stay in the same grid cell, so the frame never changes
// size (and the pebble's path never moves). The change is a short crossfade, instant when motion is paused.
//
// The stills and their captions are rendered on the server and passed in, so this client part is only the switch.
// The figure carries the path's "gate" anchor: the checkpoint gap in the line sits beside it.
import { useId, useState, type ReactNode } from "react";
import styles from "./AgentGuard.module.css";

export type EvidenceState = "held" | "verified";

const STATES: readonly EvidenceState[] = ["held", "verified"];

export function EvidenceToggle({
  example,
  legend,
  labels,
  stills,
  captions,
}: {
  /** "Interactive example" */
  example: string;
  /** "Show the task" */
  legend: string;
  labels: Readonly<Record<EvidenceState, string>>;
  stills: Readonly<Record<EvidenceState, ReactNode>>;
  /** the caption's content for each state (paragraphs, lists): it goes in the figure's <figcaption> */
  captions: Readonly<Record<EvidenceState, ReactNode>>;
}) {
  const [state, setState] = useState<EvidenceState>("held");
  const id = useId();
  return (
    <figure className={styles.evidence} data-state={state} data-path-anchor="gate">
      <div className={styles.toggle} role="radiogroup" aria-labelledby={`${id}-label`}>
        <p id={`${id}-label`} className={styles.toggleLabel}>
          <span className={styles.example}>{example}</span>
          <span className="sr-only">: </span>
          <span className={styles.legend}>{legend}</span>
        </p>
        <div className={styles.segments}>
          {STATES.map((value) => (
            <label key={value} className={styles.segment}>
              <input
                type="radio"
                name={id}
                value={value}
                checked={state === value}
                onChange={() => setState(value)}
                className={styles.segmentInput}
              />
              <span className={styles.segmentText}>{labels[value]}</span>
            </label>
          ))}
        </div>
      </div>
      <div className={styles.stack}>
        {STATES.map((value) => (
          <div key={value} className={styles.state} data-on={state === value ? "" : undefined} aria-hidden={state !== value}>
            {stills[value]}
          </div>
        ))}
      </div>
      <figcaption className={styles.caption} aria-live="polite">
        {captions[state]}
      </figcaption>
    </figure>
  );
}
