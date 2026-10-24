// Section 11b, Stealth Lockdown (Pebble 1.1.0; OVERRIDES §21), right after Private by default: Privacy answers "where
// does my data go?", this section "what do other people see on my screen?".
//
// The head through SectionHead: "Privacy and focus / New in 1.1.0" in the rail; the H2 is the setting's name with
// "Off by default." as its muted second line (two-tone, twoTone.ts); the lead is the setting's own description followed
// at once by the honest line, in the same paragraph and at the same size (PHILOSOPHY principle 3: the limit sits beside
// the promise; critic C11); then where to turn it on and the two shortcuts. Every word is Pebble 1.1.0's own (copy.ts
// `stealth`, with file and line). The honest line stays under the switch as well, as the app shows it.
// Then, in the order a phone reads it (the words, then the picture, then the switch):
// 1. the two halves, word for word, as a ruled definition list (terms on columns 4–6, the text on 7–12);
// 2. the picture: the real 1.1.0 capture of Settings › Privacy and focus (the section alone, its light or dark still
//    following the page's theme) in a plain frame, and beside it the page's own live pebble on its ground. The pebble
//    wears the Veil through Pebble's own stealthVeil.ts (shared/pebble), so its caption calls it a render, never a
//    recording. A protected window can't be recorded: nothing here shows or claims a "share view";
// 3. the "Interactive example" (StealthLockdown.client.tsx): a switch that flips the pebble's `stealth` prop and swaps
//    the capture between its off and on stills, a polite live region with the app's own state line, and the honest
//    line right under it, as real text, never collapsed.
// The Veil's dusk blue is the section's own accent (PHILOSOPHY's one exception, OVERRIDES §21): the Veil's custom
// properties and a scoped --stealth token on the section root, used by the switch's "on" track and the "On." line.
// Everything else keeps the page's six roles; focus keeps the page's accent.
import { stealth } from "@/content/copy";
import { labels } from "@/content/labels";
import { Picture } from "@/components/media/Picture";
import { PebbleStatic } from "@/components/pebble/PebbleStatic";
import { Horizon } from "@/components/ui/Horizon";
import { SectionHead } from "@/components/ui/SectionHead";
import { uiCropStill, type UiCropStillName } from "@/lib/media";
import { SECTIONS } from "@/lib/sections";
import { StealthExample } from "./StealthLockdown.client";
import styles from "./StealthLockdown.module.css";

/**
 * The capture's width: six of the main column's nine columns from 1280 px (624 px at 1440, 592 at 1280), at most
 * 640 px below that, the content column on phones. The app's text is 11 px in a 516 pt section, so it reads at 12 px
 * or more from 563 px wide (HANDOFF-1.1-captures); on phones the whole section is shown, and every word it holds is
 * also the section's own text.
 */
const SIZES = "(min-width: 1280px) 624px, (min-width: 1024px) 640px, (min-width: 561px) min(640px, calc(100vw - 48px)), calc(100vw - 32px)";

/** One state's still in both themes; CSS shows the one that matches html[data-theme] (only-light, only-dark). */
function Capture({ state }: { state: "off" | "on" }) {
  const name: UiCropStillName = `settings-privacy-card-${state}`;
  const still = uiCropStill(name);
  const alt = stealth.media[state];
  return (
    <>
      <Picture
        sets={[still.files.light[1200], still.files.light[2400]]}
        alt={alt}
        sizes={SIZES}
        className={`only-light ${styles.picture}`}
        imgClassName={styles.img}
      />
      <Picture
        sets={[still.files.dark[1200], still.files.dark[2400]]}
        alt={alt}
        sizes={SIZES}
        className={`only-dark ${styles.picture}`}
        imgClassName={styles.img}
      />
    </>
  );
}

export function StealthLockdown() {
  return (
    <section id={SECTIONS.stealth} className={`sec ${styles.stealth}`} aria-labelledby="stealth-title">
      <SectionHead
        id="stealth-title"
        label={labels.stealth}
        title={stealth.h2}
        then={stealth.offByDefault}
        lead={
          <>
            {stealth.description} {stealth.honest}
          </>
        }
      >
        <p>
          {stealth.turnOn} {stealth.hideAll}
        </p>
      </SectionHead>

      <div className="wrap grid-12 sec-body">
        <div className="main">
          <dl className={styles.halves}>
            {stealth.halves.map((half) => (
              <div key={half.term} className={styles.half}>
                <dt>{half.term}</dt>
                <dd>{half.text}</dd>
              </div>
            ))}
          </dl>

          <StealthExample
            off={<Capture state="off" />}
            on={<Capture state="on" />}
            ground={<Horizon variant={2} className={styles.ground} />}
            still={<PebbleStatic stealth={false} className={styles.pebble} />}
            stillOn={<PebbleStatic stealth className={styles.pebble} />}
          />
        </div>
      </div>
    </section>
  );
}
