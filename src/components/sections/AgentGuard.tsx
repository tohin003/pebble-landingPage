// Section 3, AgentGuard, the headline difference (DESIGN-LEXINGTON §6 AgentGuard, comp lex-A; OVERRIDES §7 and §9).
//
// The head: "AgentGuard / The evidence layer" in the rail; the H2 in two tones, the claim and the one comparative
// framing allowed, as intent ("Evidence before “done”." / "An agent shouldn’t grade its own work."); the lead and the
// scope paragraph. Then the evidence ledger, in the order a task meets it: three ruled rows, each titled with the app's
// own words and holding a real capture, so both states show without JavaScript (the old held/verified switch is
// retired):
//   1. the scope challenge, exactly as the app shows it: the refused step's error in Details › Activity (there is no
//      challenge card, OVERRIDES §9), with the engine's own words;
//   2. the held run: "Blocked", the hold's sentence and its three choices;
//   3. the same fix verified: the reply's one-line result, with the accent galet (a state mark, one of its three jobs).
// Last, "Reliability, not security." as a ruled row of its own: the limit sits beside the promise (PHILOSOPHY 3).
//
// Each crop is sized so the app's own text renders at about 12 px or more: 624 px wide at 1440 (the loops' ledger
// slot), at most 624 px when the rows stack below 1280 px, and tighter phone crops at 560 px and below, which keep the
// same lines whole (UiCrop `phone`). The crops wait until they are near the screen (UiCrop `defer`, QA lane F3).
import { agentGuard, common } from "@/content/copy";
import { labels } from "@/content/labels";
import { UiCrop, type CropBox, type UiCropProps } from "@/components/media/UiCrop";
import { SectionHead } from "@/components/ui/SectionHead";
import { firstSentence } from "@/components/ui/twoTone";
import { SECTIONS } from "@/lib/sections";
import styles from "./AgentGuard.module.css";

/** The crops, in the 1200 × 750 stills' units (public/ui/v1, Pebble 1.0.4; measured by ink scan). */
// The Activity steps: the refused edit and its details, from "Preparing an edit to README.md" to "Waiting for the model".
const CHALLENGE: CropBox = { x: 776, y: 196, w: 420, h: 312 };
// Phones: the refused step (in the app's red), "Details", the engine's header and its summary line, whole.
const CHALLENGE_PHONE: CropBox = { x: 788, y: 219, w: 300, h: 82.5 };
// The hold: "Blocked", "Pebble's change isn't verified yet. · …" and Run the tests, Ask Pebble to finish, Accept as
// unverified ("Details", at the far right of the reply, stays out so the app's 12 px text renders at 12 px).
const HELD: CropBox = { x: 403, y: 472, w: 524, h: 114 };
// Phones: the reply's first three lines, whole and legible, its one-line result second ("Not verified · 2 changed files,
// no tests run"); the hold's sentence is the row's title. A tighter crop of the hold would cut its sentence mid-line.
const HELD_PHONE: CropBox = { x: 398, y: 194, w: 300, h: 72 };
// The verified reply's head: "Worked for 1 min 12 s · 5 steps …", "Verified · pytest 42 passed on current files" and
// "Done, and verified:" (the list under it runs wider than a 624 px crop can show at the app's scale).
const VERIFIED: CropBox = { x: 234, y: 289, w: 476, h: 71 };
const VERIFIED_PHONE: CropBox = { x: 231, y: 287, w: 300, h: 72 };

/** The ledger's figure: columns 7–12 at 1440 (624 px), at most 624 px when the rows stack, the phone's width below. */
const FIGURE: UiCropProps["display"] = { wide: 624, tablet: "calc(100vw - 48px)", phone: "calc(100vw - 32px)" };

type Row = Readonly<{ key: string; title: string; verified?: boolean; notes: readonly string[]; crop: UiCropProps }>;

export function AgentGuard() {
  const held = agentGuard.held;
  const [, resultSentence] = firstSentence(agentGuard.lead); // "Its one-line result says which tests ran and …"
  const rows: readonly Row[] = [
    {
      key: "challenge",
      title: agentGuard.challenge.summary(5),
      notes: [agentGuard.challenge.caption, common.sampleData],
      crop: { name: "main-challenge", alt: agentGuard.media.challenge, box: CHALLENGE, phone: CHALLENGE_PHONE, display: FIGURE, defer: true },
    },
    {
      key: "held",
      title: held.message,
      notes: [agentGuard.layer[2], common.sampleData],
      crop: { name: "held-unverified", alt: agentGuard.media.held, box: HELD, phone: HELD_PHONE, display: FIGURE, defer: true },
    },
    {
      key: "verified",
      title: agentGuard.result,
      verified: true,
      notes: [resultSentence, agentGuard.resultCaption],
      crop: { name: "main-done", alt: agentGuard.media.verified, box: VERIFIED, phone: VERIFIED_PHONE, display: FIGURE, defer: true },
    },
  ];

  return (
    <section id={SECTIONS.agentGuard} className="sec" aria-labelledby="agentguard-title">
      <SectionHead
        id="agentguard-title"
        label={labels.agentGuard}
        title={agentGuard.heading}
        then={agentGuard.intent}
        lead={agentGuard.layer[0]}
        chip="tested"
      >
        <p className={styles.scope}>{agentGuard.layer[1]}</p>
      </SectionHead>

      <div className="wrap grid-12 sec-body">
        <div className="main">
          <ol className={styles.ledger} data-ledger="">
            {rows.map((row) => (
              <li key={row.key} className={styles.row} data-row={row.key}>
                <div className={styles.words}>
                  <h3 className={styles.title}>
                    {row.verified ? <span className={`galet ${styles.verified}`} aria-hidden="true" /> : null}
                    <q>{row.title}</q>
                  </h3>
                  {row.notes.map((note) => (
                    <p key={note} className={note === common.sampleData ? styles.sample : styles.note}>
                      {note}
                    </p>
                  ))}
                </div>
                <figure className={styles.figure}>
                  <UiCrop {...row.crop} />
                </figure>
              </li>
            ))}
          </ol>

          <div className={styles.reliability}>
            <h3 className={styles.reliabilityTitle}>{agentGuard.reliability.title}</h3>
            <div className={styles.reliabilityBody}>
              <p>{agentGuard.reliability.body}</p>
              <ul className={styles.points}>
                {agentGuard.reliability.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
