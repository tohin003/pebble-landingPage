"use client";
// The Stealth Lockdown section's exhibit and its "Interactive example" (StealthLockdown.tsx has the whole layout).
//
// One switch: the page's live pebble gets `stealth`. On, it wears the Veil (Pebble 1.1.0's stealthVeil.ts through the
// site's engine: the cast, the 1.1 s shimmer every 6 s; under reduced motion or Pause motion a 0.3 s cross-fade and no
// shimmer); off, the release. (The 1.1.0 captures of the Settings card that it also swapped are off the page: they show
// the withdrawn focus lines, the 25 October correction in copy.ts `stealth`.)
// The switch is a real <button role="switch" aria-checked> (Space and Enter work, 44 px tall, focus ring in the
// page's accent). Its visible label is the app's "Stealth Lockdown", and its name adds "Interactive example"; the
// honest line under it is its description, as in the app (aria-describedby). The state line is a polite live region
// with the app's state lines (STEALTH_OFF_TEXT; STEALTH_ON_TEXT without its withdrawn focus clause).
// The pebble isn't a control here (interactive={false}): the switch is the only thing to press.
import { useId, useState, type ReactNode } from "react";
import { PebbleLiveSlot } from "@/components/pebble/PebbleLiveSlot";
import { stealth } from "@/content/copy";
import styles from "./StealthLockdown.module.css";

export type StealthExampleProps = Readonly<{
  /** the pebble's ground line (a Horizon) */
  ground: ReactNode;
  /** the pebble's first frame, plain (PebbleStatic with stealth={false}), shown until the live pebble loads */
  still: ReactNode;
  /** the same frame wearing the settled Veil, shown instead if the switch is flipped before the live pebble loads */
  stillOn: ReactNode;
}>;

export function StealthExample({ ground, still, stillOn }: StealthExampleProps) {
  const [on, setOn] = useState(false);
  const id = useId();
  const nameId = `${id}-name`;
  const exampleId = `${id}-example`;
  const honestId = `${id}-honest`;

  return (
    <div className={styles.exhibit} data-stealth={on ? "on" : "off"}>
      <figure className={styles.render}>
        <div className={styles.stageBox}>
          <div className={styles.stage}>
            {ground}
            <span className={styles.contact} aria-hidden="true" />
            <div className={styles.pebbleBox}>
              <PebbleLiveSlot name="stealth" stealth={on} interactive={false} className={styles.pebble}>
                {on ? stillOn : still}
              </PebbleLiveSlot>
            </div>
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
          <p className={styles.state} aria-live="polite" data-other={on ? stealth.stateOff : stealth.stateOn}>
            <span>{on ? stealth.stateOn : stealth.stateOff}</span>
          </p>
        </div>
        <p id={honestId} className={styles.honest}>
          {stealth.honest}
        </p>
      </div>
    </div>
  );
}
