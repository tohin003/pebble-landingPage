// Section 7, You set the pace (DESIGN §5 row 7, comp 3): the arc dial (PermissionDial), then what holds in every mode.
// The pebble's path sweeps across above the section and then rises into the dial's arch.
//
// - The three modes' words are Pebble's own (src/permissionModes.ts at v1.0.1), shown by the dial.
// - The "In every mode, …" sentence is quoted and attributed ("In Pebble's Settings, under the three modes:"): it says
//   "their switches below", which only makes sense in the app, so the next line explains where those switches are.
//   The line after it says Pebble can't see or operate other apps yet (OVERRIDES §12), so 1.0.1's "app-window actions"
//   in the quote never reads as app control.
// - Approvals happen only in Pebble's main window, with the two other facts that hold in every mode.
// The dial pebble's still frames (one per mode, eyes on it) are drawn here on the server from the same engine set-up
// the live pebble continues from, so swapping in the live pebble moves nothing.
import { explainers, pace } from "@/content/copy";
import { ChapterChip } from "@/components/media/ChapterChip";
import { PermissionDial } from "@/components/explainers/PermissionDial";
import { MODE_GAZE, type DialModeId } from "@/components/explainers/PermissionDial.modes";
import { dialStill } from "@/components/explainers/PermissionDial.still";
import { PebbleSvg } from "@/components/pebble/PebbleSvg";
import { SECTIONS } from "@/lib/sections";
import styles from "./Pace.module.css";

function still(mode: DialModeId) {
  const view = dialStill(MODE_GAZE[mode]);
  return <PebbleSvg frame={view.frame} motion={view.motion} still pose="idle" />;
}

export function Pace() {
  const dial = explainers.permissionDial;
  const [approvals, ...always] = pace.fixed;
  return (
    <section id={SECTIONS.pace} className={`section ${styles.section}`} aria-labelledby="pace-title">
      <div className="section-head">
        <h2 id="pace-title">{pace.h2}</h2>
        <p className="lead">{pace.lead}</p>
      </div>

      <div className={styles.dial}>
        <PermissionDial stills={{ ask: still("ask"), auto: still("auto"), full: still("full") }} />
      </div>

      <div className={styles.every}>
        <figure className={styles.quote}>
          <figcaption className={styles.attribution}>{pace.attribution}</figcaption>
          <blockquote className={styles.everyMode}>
            <p>{dial.everyMode}</p>
          </blockquote>
          <p className={styles.note}>{dial.switchesNote}</p>
          <p className={styles.note}>{dial.appsNote}</p>
        </figure>
        <div className={styles.fixed}>
          <p className={styles.approvals}>{approvals}</p>
          {always.map((line) => (
            <p key={line} className={styles.fixedLine}>
              {line}
            </p>
          ))}
          <ChapterChip chapterId={pace.chapterId} className={styles.chip} />
        </div>
      </div>
    </section>
  );
}
