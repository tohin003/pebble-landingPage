// Section 3, AgentGuard, the headline difference (DESIGN-LEXINGTON §6 AgentGuard, comp lex-A; OVERRIDES §7 and §9).
//
// The head: "AgentGuard / The evidence layer" in the rail; the H2 in two tones, the claim and the one comparative
// framing allowed, as intent ("Evidence before “done”." / "An agent shouldn’t grade its own work."); the lead and the
// scope paragraph. Then the evidence ledger, in the order a task meets it: three ruled rows, each titled with the app's
// own words and holding a real capture, so both states show without JavaScript (the old held/verified switch is
// retired):
//   1. the scope challenge, exactly as the app shows it: the refused step's error in Details › Activity (there is no
//      challenge card, OVERRIDES §9), with the engine's own words;
//   2. the held run: "Blocked", the hold's sentence and its three choices. The section's key moment, and the widest
//      crop: its crop sits under its words at every width (critic C06);
//   3. the same fix verified: the reply's head down to its one-line result, with the accent galet (a state mark, one of
//      its three jobs).
// Last, "Reliability, not security." as a ruled row of its own: the limit sits beside the promise (PHILOSOPHY 3).
//
// One scale for all three crops (critic C06): each is drawn at most 1.32 px per still unit (AgentGuard.module.css), so
// the app's 12 px text is 13.2 px and its 11 px text (the hold's sentence and buttons) 12.1 px wherever the column
// allows, and the three read as one zoom. Narrower columns shrink a crop, never under the 11 px floor: tighter phone
// crops from 639 px down (UiCrop `phone`, `phoneUpTo`) and tighter ones still at 361 px and below (UiCrop `narrow`).
// Every box keeps its lines whole and ends on a whole thought, never on a colon (critic C19). The crops wait until they
// are near the screen (UiCrop `defer`, QA lane F3).
import { agentGuard, common } from "@/content/copy";
import { labels } from "@/content/labels";
import { UiCrop, type CropBox, type UiCropProps } from "@/components/media/UiCrop";
import { SectionHead } from "@/components/ui/SectionHead";
import { firstSentence } from "@/components/ui/twoTone";
import { SECTIONS } from "@/lib/sections";
import styles from "./AgentGuard.module.css";

/** The crops, in the 1200 × 750 stills' units (public/ui/v1, Pebble 1.0.4; measured by ink scan of the 2400 px files,
 *  light and dark, 24 Oct: the hold's "Blocked" 484–492, its sentence 439–918 × 519–541, its buttons 438–732 ×
 *  548–576; the verified reply's head 241–520 × 296–309 and its result 272–457 × 319–327, "Done, and verified:" from
 *  340). */
// The Activity steps: the refused edit and its details, from "Preparing an edit to README.md" to "Waiting for the model".
const CHALLENGE: CropBox = { x: 776, y: 196, w: 420, h: 312 };
// Phones: the refused step (in the app's red), "Details", the engine's header and its summary line, whole.
const CHALLENGE_PHONE: CropBox = { x: 788, y: 219, w: 300, h: 82.5 };
// The narrowest phones: "Details", the engine's header and its summary line. The refused step's line (269 units) can't
// be shown whole at 11 px in a 288 px column, so it stays out (13.5 px at 320).
const CHALLENGE_NARROW: CropBox = { x: 803, y: 239, w: 213, h: 62.5 };
// The hold: the run's avatar, "Blocked", "Pebble's change isn't verified yet. · …" (two whole lines) and Run the tests,
// Ask Pebble to finish, Accept as unverified. The avatar (x 407–425) comes in, as in VERIFIED, so "Blocked" (from 431)
// and the sentence's end (919) aren't flush with the frame; "Details" (from 948) stays out. 705 px at the one scale.
const HELD: CropBox = { x: 398, y: 474, w: 534, h: 110 };
// Phones, 362–639 px: the hold's three choices, whole (the row's title quotes its sentence, which can't be shown whole
// at a legible size in a phone's column; critic C07). 297 units: the app's 12 px text at 11.6 px at 375, 12 px at 390.
const HELD_PHONE: CropBox = { x: 436, y: 543, w: 297, h: 38 };
// The narrowest phones, up to 361 px, where the three choices would be under 11 px: the reply's head down to its
// one-line result, "Not verified · 2 changed files, no tests run", without the avatar (12.3 px at 320).
const HELD_NARROW: CropBox = { x: 432, y: 197, w: 234, h: 46 };
// The verified reply's head, down to its one-line result "Verified · pytest 42 passed on current files"; "Done, and
// verified:" and the list under it stay out, so the crop ends on the result (critic C19). Phones use the same box.
const VERIFIED: CropBox = { x: 234, y: 288, w: 294, h: 48 };
// The narrowest phones: the same lines without the avatar (11.1 px at 320).
const VERIFIED_NARROW: CropBox = { x: 266, y: 288, w: 260, h: 48 };

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
      crop: {
        name: "main-challenge",
        alt: agentGuard.media.challenge,
        box: CHALLENGE,
        phone: CHALLENGE_PHONE,
        phoneUpTo: 639,
        narrow: CHALLENGE_NARROW,
        display: FIGURE,
        defer: true,
      },
    },
    {
      key: "held",
      title: held.message,
      notes: [agentGuard.layer[2], common.sampleData],
      crop: {
        name: "held-unverified",
        alt: agentGuard.media.held,
        box: HELD,
        phone: HELD_PHONE,
        phoneUpTo: 639,
        narrow: HELD_NARROW,
        display: FIGURE,
        defer: true,
      },
    },
    {
      key: "verified",
      title: agentGuard.result,
      verified: true,
      notes: [resultSentence, agentGuard.request, agentGuard.resultCaption], // 2.0.0: what you asked for is checked too
      crop: {
        name: "main-done",
        alt: agentGuard.media.verified,
        box: VERIFIED,
        narrow: VERIFIED_NARROW,
        display: FIGURE,
        defer: true,
      },
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
                  <UiCrop {...row.crop} className={styles.crop} />
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
