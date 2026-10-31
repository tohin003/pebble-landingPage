// Section 11, Private by default (DESIGN-LEXINGTON §6 row 11; OVERRIDES §7, §8 C1).
//
// The head through SectionHead: "Privacy / No telemetry" in the rail; "Private by default." with the lead's first
// sentence ("Your conversations and memories are stored on your Mac.") as its muted second line; the rest of the lead;
// one link, "Stealth Lockdown ›", to the next section (Pebble 1.1.0, what others see on your screen; its honest line
// is there); the film chip (the film's "Open source" chapter covers privacy too). Both columns sit right under it, so
// "Private by default" is never read as "nothing leaves": "Stored on your Mac" and "What leaves your Mac", with all
// five destinations.
//
// The strands are a diagram of their own (DESIGN-LEXINGTON §3.9): on wide screens five strands, drawn in the line's
// hand (Privacy.strands.tsx), branch from the small "Your Mac" pebble above the columns to the five destinations;
// below 1024 px the node is hidden and the strands become a comb down the destinations' left edge. They are drawn from
// the start and never move (nothing moves on scroll). The diagram is decorative: the two lists carry every word.
// Under the columns, one disclosure (.work/page-declutter/PLAN.md) holds what qualifies them: the usage counters, how
// Pebble's own tools treat its folders, a local conversation's release, web search's switch and the data-folders guide.
// The local model's first sentence stays under "What leaves your Mac"; the provider's detail opens from its own first
// words (InfoTip).
import { privacy } from "@/content/copy";
import { labels } from "@/content/labels";
import { Disclosure, DisclosureGroup } from "@/components/ui/Disclosure";
import { InfoTip } from "@/components/ui/InfoTip";
import { SectionHead } from "@/components/ui/SectionHead";
import { TextLink } from "@/components/ui/TextLink";
import { firstSentence } from "@/components/ui/twoTone";
import { inline } from "@/lib/inline";
import { SECTIONS } from "@/lib/sections";
import { PrivacyStrands } from "./Privacy.strands";
import styles from "./Privacy.module.css";

/** "Your conversations and memories are stored on your Mac." under the H2, then "Here is what Pebble keeps there …" */
const [THEN, LEAD] = firstSentence(privacy.lead);

/** The last "Stored" item shows "No telemetry. Pebble sends no analytics."; its usage-counter sentence opens below. */
const TELEMETRY = privacy.stays.items[privacy.stays.items.length - 1]!;
const [NO_TELEMETRY, TELEMETRY_REST] = firstSentence(TELEMETRY);
const [NO_ANALYTICS, COUNTERS] = firstSentence(TELEMETRY_REST);
const STAYS = [...privacy.stays.items.slice(0, -1), `${NO_TELEMETRY} ${NO_ANALYTICS}`];
/** "With a local model, the conversation stays on your Mac." stays; its second sentence opens below. */
const [LOCAL, LOCAL_MORE] = firstSentence(privacy.leaves.localNote);

/** "with a cloud model: …" → "With a cloud model: …" (the copy's details are written to follow a label). */
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function Privacy() {
  return (
    <section id={SECTIONS.privacy} className="sec" aria-labelledby="privacy-title">
      <SectionHead
        id="privacy-title"
        label={labels.privacy}
        title={privacy.h2}
        then={THEN}
        lead={LEAD}
        action={<TextLink href={privacy.stealthLink.href}>{privacy.stealthLink.label}</TextLink>}
        chip="open-source"
      />

      <div className="wrap grid-12 sec-body">
        <div className={`main ${styles.diagram}`}>
          <div className={styles.nodeRow} aria-hidden="true">
            <span className={styles.nodeLabel}>{privacy.diagram.mac}</span>
            {/* the strands' origin (Privacy.strands.tsx) */}
            <span className={`galet ${styles.node}`} data-strand-origin="" />
          </div>

          <div className={styles.columns}>
            <div className={styles.stored}>
              <h3 className={styles.columnTitle}>{privacy.stays.title}</h3>
              <ul className={styles.storedList}>
                {STAYS.map((item) => (
                  <li key={item}>{inline(item)}</li>
                ))}
              </ul>
            </div>

            <div className={styles.leaves}>
              <h3 className={styles.columnTitle}>
                <span className={`galet ${styles.originMark}`} aria-hidden="true" data-strand-origin="narrow" />
                {privacy.leaves.title}
              </h3>
              <ul className={styles.leavesList}>
                {privacy.diagram.destinations.map((destination) => (
                  <li key={destination.id}>
                    <span className={`galet ${styles.mark}`} aria-hidden="true" data-strand-target="" />
                    <strong className={styles.destination}>{destination.label}</strong>
                    <span className={styles.detail}>
                      {/* a long detail opens from its own first words, on tap, focus or hover (InfoTip) */}
                      {destination.detail.includes(": ") ? (
                        <InfoTip label={sentence(destination.detail.split(": ")[0]!)}>{sentence(destination.detail.split(": ").slice(1).join(": "))}</InfoTip>
                      ) : (
                        sentence(destination.detail)
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              <div className={styles.columnNotes}>
                <p className={styles.local}>{LOCAL}</p>
              </div>
            </div>
          </div>

          {/* what qualifies both columns, one tap away (.work/page-declutter/PLAN.md) */}
          <DisclosureGroup className={styles.more}>
            <Disclosure summary={privacy.more}>
              <p>{COUNTERS}</p>
              <p>{inline(privacy.toolsNote)}</p>
              <p>{LOCAL_MORE}</p>
              <p>{privacy.searchNote}</p>
              <p>
                <TextLink href={privacy.dataFoldersLink.href}>{privacy.dataFoldersLink.label}</TextLink>
              </p>
            </Disclosure>
          </DisclosureGroup>

          <PrivacyStrands />
        </div>
      </div>
    </section>
  );
}
