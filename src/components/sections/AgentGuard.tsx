// Section 3, AgentGuard, the headline difference (DESIGN §5 row 3; OVERRIDES §7 and §9).
//
// A split, right after the film. Left: the H2, the evidence layer in three short paragraphs, the one allowed intent
// line ("An agent shouldn't grade its own work.") and "Reliability, not security" with where protection comes from.
// Right: real captures, in the order a task meets them:
// 1. the scope challenge, exactly as the app shows it: the refused step's error in Details › Activity (there is no
//    challenge card, OVERRIDES §9), with the engine's own words;
// 2. the held run and the same fix verified, behind an "Interactive example" switch (loop L6 is not planned for P0).
// The pebble's path passes a checkpoint here: a small gap in the margin line beside the evidence (the "gate" anchor).
// The line keeps to the right margin through this section (no S-sweep), so the gate sits next to the captures.
import { agentGuard, common } from "@/content/copy";
import { ChapterChip } from "@/components/media/ChapterChip";
import { UiCrop } from "@/components/media/UiCrop";
import { SECTIONS } from "@/lib/sections";
import { EvidenceToggle } from "./AgentGuard.client";
import styles from "./AgentGuard.module.css";

/** The crops, in the 1200 × 750 stills' units (public/ui/v1, lane D). */
const CHALLENGE = { x: 776, y: 196, w: 420, h: 312 } as const; // the Activity steps: the refused edit and its details
const CHALLENGE_PHONE = { x: 798, y: 226, w: 392, h: 262 } as const; // the details text only
const HELD = { x: 400, y: 190, w: 585, h: 400 } as const; // "Worked for 41 s" down to the three choices
const VERIFIED = { x: 233, y: 196, w: 585, h: 400 } as const; // "Both look right. Go ahead." down to the reply's stats
// Phones: the reply's first three lines, whole and legible (its one-line result is the second), the same size in both
// states; the caption carries the hold's sentence and its three choices. A tighter crop of the hold itself would cut
// its sentence mid-line.
const HELD_PHONE = { x: 398, y: 194, w: 300, h: 72 } as const; // "Not verified · 2 changed files, no tests run"
const VERIFIED_PHONE = { x: 231, y: 287, w: 300, h: 72 } as const; // "Verified · pytest 42 passed on current files"

const PHONE = "calc(100vw - 32px)";
const TABLET = "calc(100vw - 48px)";

export function AgentGuard() {
  const held = agentGuard.held;
  return (
    <section id={SECTIONS.agentGuard} className={`section ${styles.section}`} aria-labelledby="agentGuard-title" data-path-anchor="margin">
      <div className={styles.split}>
        <div className={styles.text}>
          <h2 id="agentGuard-title" className={styles.title}>
            {agentGuard.heading}
          </h2>
          <p className={`lead ${styles.lead}`}>{agentGuard.layer[0]}</p>
          {agentGuard.layer.slice(1).map((paragraph) => (
            <p key={paragraph} className={styles.para}>
              {paragraph}
            </p>
          ))}
          <p className={styles.intent}>{agentGuard.intent}</p>
          <div className={styles.reliability}>
            <h3 className={styles.reliabilityTitle}>{agentGuard.reliability.title}</h3>
            <p>{agentGuard.reliability.body}</p>
            <ul className={styles.points}>
              {agentGuard.reliability.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
          <ChapterChip chapterId="tested" className={styles.chip} />
        </div>

        <div className={styles.media}>
          <figure className={styles.challenge}>
            <UiCrop
              name="main-challenge"
              alt={agentGuard.media.challenge}
              box={CHALLENGE}
              phone={CHALLENGE_PHONE}
              display={{ wide: 560, tablet: "560px", phone: PHONE }}
            />
            <figcaption className={styles.caption}>
              <p>{agentGuard.challenge.caption}</p>
              <p className={styles.phoneQuote}>
                <q>{agentGuard.challenge.summary(5)}</q> <q>{agentGuard.challenge.suggestion}</q>
              </p>
              <p className={styles.sample}>{common.sampleData}</p>
            </figcaption>
          </figure>

          {/* the AgentGuard checkpoint: the line's gap sits beside this figure (EvidenceToggle carries the anchor) */}
          <EvidenceToggle
            example={common.interactiveExample}
            legend={agentGuard.toggle.label}
            labels={{ held: agentGuard.toggle.held, verified: agentGuard.toggle.verified }}
            stills={{
              held: (
                <UiCrop
                  name="held-unverified"
                  alt={agentGuard.media.held}
                  box={HELD}
                  phone={HELD_PHONE}
                  display={{ wide: 616, tablet: TABLET, phone: PHONE }}
                />
              ),
              verified: (
                <UiCrop
                  name="main-done"
                  alt={agentGuard.media.verified}
                  box={VERIFIED}
                  phone={VERIFIED_PHONE}
                  display={{ wide: 616, tablet: TABLET, phone: PHONE }}
                />
              ),
            }}
            captions={{
              held: (
                <>
                  <p>
                    <q>{held.message}</q>
                  </p>
                  <ul className={`facts ${styles.choices}`}>
                    <li>{held.runTests}</li>
                    <li>{held.askToFinish}</li>
                    <li>{held.acceptUnverified}</li>
                  </ul>
                </>
              ),
              verified: (
                <>
                  <p>
                    <q>{agentGuard.result}</q>
                  </p>
                  <p className={styles.sample}>{agentGuard.resultCaption}</p>
                </>
              ),
            }}
          />
        </div>
      </div>
    </section>
  );
}
