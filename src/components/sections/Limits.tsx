// Section 13, What Pebble isn’t (yet) (DESIGN-LEXINGTON §6 row 13; OVERRIDES §2, §8 H14, §12).
//
// The head through SectionHead: "Limits / Stated plainly" in the rail; the H2 with the lead's first sentence ("Pebble
// states its limits plainly.") as its muted second line; the rest of the lead under it.
// Then every limit, word for word, as a two-column ruled list on columns 4–11 (each column four of the page's
// columns): the four release limits first, as the release session wrote them, in ink; then the product's own limits,
// each with its title in Inter 500 and its body in muted ink, "Other software on your Mac" included (DESIGN §9). No
// marks: the hairlines do the separating. The hero's "Read the limits" and every honest line land here (#limits).
import { honestLimits } from "@/content/copy";
import { labels } from "@/content/labels";
import { Disclosure, DisclosureGroup } from "@/components/ui/Disclosure";
import { SectionHead } from "@/components/ui/SectionHead";
import { firstSentence } from "@/components/ui/twoTone";
import { inline } from "@/lib/inline";
import { SECTIONS } from "@/lib/sections";
import styles from "./Limits.module.css";

/** "Pebble states its limits plainly." under the H2, then "These are the ones to know before you install it." */
const [THEN, LEAD] = firstSentence(honestLimits.lead);

export function Limits() {
  return (
    <section id={SECTIONS.limits} className="sec" aria-labelledby="limits-title">
      <SectionHead id="limits-title" label={labels.limits} title={honestLimits.heading} then={THEN} lead={LEAD} />
      <div className="wrap grid-12 sec-body">
        <div className="main">
          <ul className={styles.list}>
            {honestLimits.release.map((line) => (
              <li key={line} className={styles.release}>
                {inline(line)}
              </li>
            ))}
          </ul>
          {/* every product limit stays on screen by its title; its reasons are one tap away (.work/page-declutter/PLAN.md) */}
          <DisclosureGroup className={styles.products}>
            {honestLimits.product.map((item) => (
              <Disclosure key={item.title} summary={item.title}>
                <p>{inline(item.body)}</p>
              </Disclosure>
            ))}
          </DisclosureGroup>
        </div>
      </div>
    </section>
  );
}
