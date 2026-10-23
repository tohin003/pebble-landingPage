// Section 11, Private by default (DESIGN-LEXINGTON §6 row 11; OVERRIDES §7, §8 C1).
//
// The head through SectionHead: "Privacy / No telemetry" in the rail; "Private by default." with the lead's first
// sentence ("Your conversations and memories are stored on your Mac.") as its muted second line; the rest of the lead;
// the film chip (the film's "Open source" chapter covers privacy too). Both columns sit right under it, so "Private by
// default" is never read as "nothing leaves": "Stored on your Mac" and "What leaves your Mac", with all five
// destinations.
//
// The strands are a diagram of their own (DESIGN-LEXINGTON §3.9): on wide screens five strands, drawn in the line's
// hand (Privacy.strands.tsx), branch from the small "Your Mac" pebble above the columns to the five destinations;
// below 1024 px the node is hidden and the strands become a comb down the destinations' left edge. They are drawn from
// the start and never move (nothing moves on scroll). The diagram is decorative: the two lists carry every word.
// Each column ends with the notes that qualify it: how Pebble's own tools treat its folders (and the data-folders
// guide) under "Stored on your Mac"; the local model and web search under "What leaves your Mac".
import { privacy } from "@/content/copy";
import { labels } from "@/content/labels";
import { SectionHead } from "@/components/ui/SectionHead";
import { TextLink } from "@/components/ui/TextLink";
import { firstSentence } from "@/components/ui/twoTone";
import { inline } from "@/lib/inline";
import { SECTIONS } from "@/lib/sections";
import { PrivacyStrands } from "./Privacy.strands";
import styles from "./Privacy.module.css";

/** "Your conversations and memories are stored on your Mac." under the H2, then "Here is what Pebble keeps there …" */
const [THEN, LEAD] = firstSentence(privacy.lead);

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
                {privacy.stays.items.map((item) => (
                  <li key={item}>{inline(item)}</li>
                ))}
              </ul>
              <div className={styles.columnNotes}>
                <p>{inline(privacy.toolsNote)}</p>
                <p>
                  <TextLink href={privacy.dataFoldersLink.href}>{privacy.dataFoldersLink.label}</TextLink>
                </p>
              </div>
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
                    <span className={styles.detail}>{sentence(destination.detail)}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.columnNotes}>
                <p className={styles.local}>{privacy.leaves.localNote}</p>
                <p>{privacy.searchNote}</p>
              </div>
            </div>
          </div>

          <PrivacyStrands />
        </div>
      </div>
    </section>
  );
}
