// Section 11b, Stealth Lockdown (Pebble 1.1.0; OVERRIDES §21), right after Private by default: Privacy answers "where
// does my data go?", this section "what do other people see on my screen?".
//
// The head through SectionHead: "Privacy and focus / New in 1.1.0" in the rail; the H2 is the setting's name with
// "Off by default." as its muted second line (two-tone, twoTone.ts); the lead is the setting's own description followed
// at once by the honest line, in the same paragraph and at the same size (PHILOSOPHY principle 3: the limit sits beside
// the promise; critic C11); then where to turn it on and the two shortcuts. Every word is Pebble 1.1.0's own (copy.ts
// `stealth`, with file and line), less the withdrawn focus clauses. The honest line stays under the switch as well.
// Then, in the order a phone reads it (the words, then the pebble, then the switch):
// 1. the Stealth half, word for word, as a ruled definition list (the term on columns 4–6, the text on 7–12);
// 2. the "Interactive example" (StealthLockdown.client.tsx) beside the page's own live pebble on its ground: a switch
//    that flips the pebble's `stealth` prop, a polite live region with the app's state line, and the honest line right
//    under it, as real text, never collapsed. The pebble wears the Veil through Pebble's own stealthVeil.ts
//    (shared/pebble), so its caption calls it a render, never a recording. A protected window can't be recorded:
//    nothing here shows or claims a "share view".
// Nothing here promises keyboard focus (the 25 October correction in copy.ts `stealth`): the card's Lockdown half and
// the 1.1.0 captures of the Settings card, which show the withdrawn lines, are off the page until 1.5.2's card can be
// captured from its published tag.
// The Veil's dusk blue is the section's own accent (PHILOSOPHY's one exception, OVERRIDES §21): the Veil's custom
// properties and a scoped --stealth token on the section root, used by the switch's "on" track and the "On." line.
// Everything else keeps the page's six roles; focus keeps the page's accent.
import { stealth } from "@/content/copy";
import { labels } from "@/content/labels";
import { PebbleStatic } from "@/components/pebble/PebbleStatic";
import { Horizon } from "@/components/ui/Horizon";
import { SectionHead } from "@/components/ui/SectionHead";
import { SECTIONS } from "@/lib/sections";
import { StealthExample } from "./StealthLockdown.client";
import styles from "./StealthLockdown.module.css";

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
            ground={<Horizon variant={2} className={styles.ground} />}
            still={<PebbleStatic stealth={false} className={styles.pebble} />}
            stillOn={<PebbleStatic stealth className={styles.pebble} />}
          />
        </div>
      </div>
    </section>
  );
}
