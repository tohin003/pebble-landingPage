"use client";
// PermissionDial (MASTER_PLAN §7.3, DESIGN §2 and §5 row 7, comp 3's arc dial): Pebble's three permission modes as
// three stops on an arch, labelled "Interactive example". The pebble's path itself draws the arch (the "arc" anchor
// below, kept on phones too); the three knobs are galets on it, and the pebble under the arch looks at the chosen mode.
// Under the dial, the mode's own two texts, word for word from Pebble's src/permissionModes.ts at v1.0.1, and, for
// Full access, the warning Pebble's Settings show with it.
//
// The knobs are native radio buttons (arrow keys move between them); the texts are a polite live region. The knob's
// change answers the press; the pebble's eyes turn with the engine's own short morph, instantly when motion is paused.
import { lazy, Suspense, useEffect, useId, useState, type ReactNode } from "react";
import { explainers } from "@/content/copy";
import { MODE_GAZE, type DialModeId } from "./PermissionDial.modes";
import styles from "./PermissionDial.module.css";

const DialPebble = lazy(() => import("./PermissionDial.pebble"));

const dial = explainers.permissionDial;

export function PermissionDial({ stills }: { stills: Readonly<Record<DialModeId, ReactNode>> }) {
  const [mode, setMode] = useState<DialModeId>("ask");
  const [live, setLive] = useState(false);
  const [changed, setChanged] = useState(false);
  const name = useId();
  const current = dial.modes.find((m) => m.id === mode) ?? dial.modes[0];

  // The live pebble after first paint, in idle time (as lane B's PebbleLiveSlot).
  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setLive(true), { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setLive(true), 300);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className={styles.dial}>
      <p className={styles.label}>
        <span className={styles.example}>{explainers.label}</span>
        <span>{dial.intro}</span>
      </p>

      <fieldset className={styles.arch}>
        <legend className="sr-only">{dial.legend}</legend>
        {/* the pebble's path rises over this box: 2R wide, R tall, the arch's baseline at its bottom */}
        <span className={styles.arc} data-path-anchor="arc" data-path-phone="keep" aria-hidden="true" />
        {dial.modes.map((m) => (
          <label key={m.id} className={styles.detent} data-mode={m.id}>
            <input
              type="radio"
              name={name}
              value={m.id}
              checked={mode === m.id}
              onChange={() => {
                setMode(m.id as DialModeId);
                setChanged(true);
              }}
              className={styles.input}
            />
            <span className={`galet ${styles.knob}`} aria-hidden="true" />
            <span className={styles.ring} aria-hidden="true" />
            <span className={styles.name}>
              {m.name}
              {m.id === "ask" ? <small className={styles.tag}>{dial.defaultTag}</small> : null}
            </span>
          </label>
        ))}
        <div className={styles.pebble} aria-hidden="true">
          <span className={styles.contact} />
          {live ? (
            <Suspense fallback={stills[mode]}>
              <DialPebble gaze={MODE_GAZE[mode]} className={styles.pebbleLive} />
            </Suspense>
          ) : (
            stills[mode]
          )}
        </div>
      </fieldset>

      <div className={styles.modes} aria-live="polite" data-changed={changed ? "" : undefined}>
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>{dial.runsWithoutAsking}</h3>
          <p key={`runs-${mode}`} className={styles.modeText}>
            {current.runsWithoutAsking}
          </p>
        </div>
        <div className={styles.column}>
          <h3 className={styles.columnTitle}>{dial.alwaysAsks}</h3>
          <p key={`asks-${mode}`} className={styles.modeText}>
            {current.alwaysAsks}
          </p>
        </div>
        {mode === "full" ? <p className={styles.fullNote}>{dial.fullAccessNote}</p> : null}
      </div>
    </div>
  );
}
