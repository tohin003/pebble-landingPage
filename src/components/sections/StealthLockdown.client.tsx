"use client";
// The Stealth Lockdown section's exhibit and its "Interactive example" (StealthLockdown.tsx has the whole layout).
//
// One switch, two effects, as Pebble's own switch has:
// - the page's live pebble gets `stealth`: on, it wears the Veil (Pebble 1.1.0's stealthVeil.ts through the site's
//   engine: the cast, the 1.1 s shimmer every 6 s; under reduced motion or Pause motion a 0.3 s cross-fade and no
//   shimmer); off, the release;
// - the capture swaps between the off and on stills of the real Settings section, a 0.3 s cross-fade in every motion
//   setting (the on still fades over the off one, so nothing between them shows). The still that isn't shown is
//   aria-hidden, so a screen reader reads the picture that is on screen.
// The switch is a real <button role="switch" aria-checked> (Space and Enter work, 44 px tall, focus ring in the
// page's accent). Its visible label is the app's "Stealth Lockdown", and its name adds "Interactive example"; the
// honest line under it is its description, as in the app (aria-describedby). The state line is a polite live region
// with the app's own words (STEALTH_ON_TEXT, STEALTH_OFF_TEXT), so flipping it is announced the way Pebble words it.
// The pebble isn't a control here (interactive={false}): the switch is the only thing to press.
import { useId, useState, type ReactNode } from "react";
import { PebbleLiveSlot } from "@/components/pebble/PebbleLiveSlot";
import { stealth } from "@/content/copy";
import styles from "./StealthLockdown.module.css";

export type StealthExampleProps = Readonly<{
  /** the capture with Stealth Lockdown off, both themes (server-rendered pictures) */
  off: ReactNode;
  /** the same capture with it on */
  on: ReactNode;
  /** the pebble's ground line (a Horizon) */
  ground: ReactNode;
  /** the pebble's first frame, plain (PebbleStatic with stealth={false}), shown until the live pebble loads */
  still: ReactNode;
  /** the same frame wearing the settled Veil, shown instead if the switch is flipped before the live pebble loads */
  stillOn: ReactNode;
}>;

export function StealthExample({ off, on: onCapture, ground, still, stillOn }: StealthExampleProps) {
  const [on, setOn] = useState(false);
  const id = useId();
  const nameId = `${id}-name`;
  const exampleId = `${id}-example`;
  const honestId = `${id}-honest`;

  return (
    <div className={styles.exhibit} data-stealth={on ? "on" : "off"}>
      <figure className={styles.capture}>
        <div className={styles.frame}>
          <div className={styles.layer} data-layer="off" aria-hidden={on ? true : undefined}>
            {off}
          </div>
          <div className={`${styles.layer} ${styles.onLayer}`} data-layer="on" aria-hidden={on ? undefined : true}>
            {onCapture}
          </div>
        </div>
        <figcaption className={styles.caption}>{stealth.captureCaption}</figcaption>
      </figure>

      <figure className={styles.render}>
        <div className={styles.stage}>
          {ground}
          <span className={styles.contact} aria-hidden="true" />
          <div className={styles.pebbleBox}>
            <PebbleLiveSlot name="stealth" stealth={on} interactive={false} className={styles.pebble}>
              {on ? stillOn : still}
            </PebbleLiveSlot>
          </div>
        </div>
        <figcaption className={styles.caption}>
          {stealth.veil} {stealth.renderNote}
        </figcaption>
      </figure>

      <div className={styles.control}>
        <div className={styles.example}>
          <p className={styles.exampleLabel}>
            <span id={exampleId} className={styles.exampleMark}>
              {stealth.example.label}
            </span>
            <span>{stealth.example.intro}</span>
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-labelledby={`${nameId} ${exampleId}`}
            aria-describedby={honestId}
            className={styles.switch}
            onClick={() => setOn((value) => !value)}
          >
            <span id={nameId} className={styles.switchName}>
              {stealth.name}
            </span>
            <span className={styles.track} aria-hidden="true">
              <span className={styles.knob} />
            </span>
          </button>
          <p className={styles.state} aria-live="polite">
            {on ? stealth.stateOn : stealth.stateOff}
          </p>
        </div>
        <p id={honestId} className={styles.honest}>
          {stealth.honest}
        </p>
      </div>
    </div>
  );
}
