"use client";
// The project story's rail and stage (DESIGN §2 and §5 row 5, comp 3). The pebble's path runs through the rail: four
// stones, one per step, each a "stop" anchor, and the guide pebble stands on the current one. The rail is the story's
// tablist: choose a step (click, or the arrow keys, Home and End) and the guide walks along the line to it while the
// stage below shows that step. The rail never moves, so the line always passes through its stones.
//
// The guide is lane B's live pebble (PebbleLiveSlot, one animated pebble at a time) over the server's still frames.
// Its pose follows the step: editing at 01 while the example card waits (comp 3: the app's "!" review pose is the
// whole body turned into an exclamation mark, which reads as a bare punctuation mark at rail size), idle once the card
// is decided, testing at 02, idle at 03 and happy only at 04, the Verified step.
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import type { PoseId } from "@pebble/index";
import { APPROVAL_DEMO_EVENT, type ApprovalStatus } from "@/components/explainers/ApprovalCardDemo";
import { PebbleLiveSlot } from "@/components/pebble/PebbleLiveSlot";
import styles from "./ProjectStory.module.css";

export type StoryStep = Readonly<{ n: string; name: string; panel: ReactNode }>;
export type GuidePose = "editing" | "testing" | "idle" | "happy";

const STEP_POSES: readonly GuidePose[] = ["editing", "testing", "idle", "happy"];

export function Story({
  label,
  steps,
  guides,
}: {
  label: string;
  steps: readonly StoryStep[];
  /** the server-rendered still frame of each guide pose (shown until the live pebble loads) */
  guides: Readonly<Record<GuidePose, ReactNode>>;
}) {
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);
  const [demo, setDemo] = useState<ApprovalStatus>("pending");
  const id = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const onDemo = (event: Event) => {
      const status = (event as CustomEvent<{ status?: ApprovalStatus }>).detail?.status;
      if (status) setDemo(status);
    };
    document.addEventListener(APPROVAL_DEMO_EVENT, onDemo);
    return () => document.removeEventListener(APPROVAL_DEMO_EVENT, onDemo);
  }, []);

  const pose: GuidePose = active === 0 ? (demo === "pending" ? "editing" : "idle") : (STEP_POSES[active] ?? "idle");

  const select = (index: number, focus: boolean) => {
    setActive(index);
    setTouched(true);
    if (focus) tabs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = steps.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? index === last
          ? 0
          : index + 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? index === 0
            ? last
            : index - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : -1;
    if (next < 0) return;
    event.preventDefault();
    select(next, true);
  };

  return (
    <div className={styles.story}>
      <div className={styles.railWrap}>
        <div role="tablist" aria-label={label} className={styles.rail}>
          {steps.map((step, index) => (
            <button
              key={step.n}
              ref={(el) => {
                tabs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${index}`}
              aria-selected={index === active}
              aria-controls={`${id}-panel-${index}`}
              tabIndex={index === active ? 0 : -1}
              className={styles.tab}
              onClick={() => select(index, false)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {/* the line passes through this stone (src/components/line/PebblePath.tsx "stop") */}
              <span className={styles.stop} data-path-anchor="stop" aria-hidden="true">
                <span className={`galet ${styles.stone}`} />
              </span>
              <span className={styles.tabLabel}>
                <b>{step.n}</b> {step.name}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.guide} style={{ "--step": active } as CSSProperties} aria-hidden="true">
          <div className={styles.guideBox}>
            <PebbleLiveSlot pose={pose} name="guide" interactive={false} className={styles.guidePebble}>
              {guides[pose]}
            </PebbleLiveSlot>
          </div>
        </div>
      </div>

      <div className={styles.panels} data-touched={touched ? "" : undefined}>
        {steps.map((step, index) => (
          <div
            key={step.n}
            role="tabpanel"
            id={`${id}-panel-${index}`}
            aria-labelledby={`${id}-tab-${index}`}
            tabIndex={0}
            className={styles.panel}
            data-story-panel=""
            data-active={index === active ? "" : undefined}
          >
            {step.panel}
          </div>
        ))}
      </div>
    </div>
  );
}
