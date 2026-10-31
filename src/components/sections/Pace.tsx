// Section 7, You set the pace (DESIGN-LEXINGTON §6 You set the pace): the head on the rail ("Permissions / Three
// modes"), the H2 in two tones cut from the approved lead ("You set the pace." / "Pick one of three modes in Settings ›
// Permissions."), its second sentence as the lead. Then the dial (PermissionDial), an object like the pebble, centred
// in columns 4–12: its arch is the pebble's ground drawn as an arch (a local Horizon), the three modes are stones on
// it, and the pebble under it looks at the chosen one. Under one hairline, what holds in every mode: the app's own
// sentence quoted in columns 4–8, the fixed rules in 9–12.
//
// - The three modes' words are Pebble's own (src/permissionModes.ts at tag v1.2.0, byte-identical through v1.5.0;
//   copy.ts `explainers.permissionDial`, OVERRIDES §23, §25, §32), shown by the dial. Pebble 2.0.0 changed Auto in
//   project and Full access: the dial now carries 2.0.0's words from its user guide, pending a re-quote from
//   src/permissionModes.ts@v2.0.0 (copy.ts, C-200-8).
// - The "In every mode, …" sentence is quoted and attributed ("In Pebble's Settings, under the three modes:"): it says
//   "their switches below", which only makes sense in the app, so the next line explains where those switches are.
//   The line after it says what an app launch is, and that using an app's window is a separate request you allow with
//   Screen control on (Pebble 2.0.0; until 1.5.0 it said Pebble couldn't see or operate other apps yet, OVERRIDES §12).
// - Approvals happen only in Pebble's main window, with the two other facts that hold in every mode.
// The dial pebble's still frames (one per mode, eyes on it) are drawn here on the server from the same engine set-up
// the live pebble continues from, so swapping in the live pebble moves nothing.
import { explainers, pace } from "@/content/copy";
import { labels } from "@/content/labels";
import { PermissionDial } from "@/components/explainers/PermissionDial";
import { MODE_GAZE, type DialModeId } from "@/components/explainers/PermissionDial.modes";
import { dialStill } from "@/components/explainers/PermissionDial.still";
import { PebbleSvg } from "@/components/pebble/PebbleSvg";
import { SectionHead } from "@/components/ui/SectionHead";
import { firstSentence } from "@/components/ui/twoTone";
import { SECTIONS } from "@/lib/sections";
import styles from "./Pace.module.css";

function still(mode: DialModeId) {
  const view = dialStill(MODE_GAZE[mode]);
  return <PebbleSvg frame={view.frame} motion={view.motion} still pose="idle" />;
}

export function Pace() {
  const dial = explainers.permissionDial;
  const [approvals, ...always] = pace.fixed;
  // "Pick one of three modes in Settings › Permissions." / "Each one says plainly what runs without asking and …"
  const [then, lead] = firstSentence(pace.lead);
  return (
    <section id={SECTIONS.pace} className="sec" aria-labelledby="pace-title">
      <SectionHead id="pace-title" label={labels.pace} title={pace.h2} then={then} lead={lead} chip={pace.chapterId} />

      <div className="wrap grid-12 sec-body">
        <div className="main">
          <PermissionDial stills={{ ask: still("ask"), auto: still("auto"), full: still("full") }} />

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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
