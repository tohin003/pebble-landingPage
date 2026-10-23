// Section 11, Private by default (DESIGN §5 row 11; OVERRIDES §7, §8 C1).
//
// "Private by default." always sits with both columns beside it, so it is never read as "nothing leaves":
// "Stored on your Mac" and "What leaves your Mac", with all five destinations.
//
// The strands are a diagram of their own (DESIGN-LEXINGTON §3.9): on wide screens five strands, drawn in the line's
// hand (Privacy.strands.tsx), branch from the small "Your Mac" pebble above the columns to the five destinations.
// Below 900 px the node is hidden and the strands become a comb down the destinations' left edge. The diagram is
// decorative: the two lists carry every word.
// Each column ends with the notes that qualify it: how Pebble's own tools treat its folders (and the data-folders
// guide) under "Stored on your Mac"; the local model and web search under "What leaves your Mac".
import { privacy } from "@/content/copy";
import { ChapterChip } from "@/components/media/ChapterChip";
import { inline } from "@/lib/inline";
import { SECTIONS } from "@/lib/sections";
import { PrivacyStrands } from "./Privacy.strands";
import styles from "./Privacy.module.css";

/** "with a cloud model: …" → "With a cloud model: …" (the copy's details are written to follow a label). */
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function Privacy() {
  return (
    <section id={SECTIONS.privacy} className={`section ${styles.section}`} aria-labelledby="privacy-title">
      <div className="section-head">
        <h2 id="privacy-title">{privacy.h2}</h2>
        <p className="lead">{privacy.lead}</p>
        <div className={styles.chip}>
          <ChapterChip chapterId="open-source" />
        </div>
      </div>

      <div className={styles.diagram}>
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
                <a href={privacy.dataFoldersLink.href}>{privacy.dataFoldersLink.label}</a>
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
    </section>
  );
}
