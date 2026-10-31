// Section 10, Built like infrastructure (DESIGN-LEXINGTON §6 row 10; OVERRIDES §7, §16).
//
// The head through SectionHead: "Engineering / Facts, not benchmarks" in the rail, the H2, the stack sentence as the
// lead and, while the benchmark is shown (releaseFacts.benchmarksPublic), one link to it: it is the next section.
// The exhibit is a ruled ledger in columns 4–12 with the README's own row names (Tests, Service checks, Reproducible
// build, Release gates): the term on columns 4–6, the text on 7–12. Numbers are data, in ink, the words around them in
// muted ink; the counts and the version come from src/content/releaseFacts.ts. Then the note that these are engineering
// facts, not benchmarks. No tiles.
import { infrastructure } from "@/content/copy";
import { labels } from "@/content/labels";
import { releaseFacts } from "@/content/releaseFacts";
import { DataText } from "@/components/ui/Data";
import { Disclosure, DisclosureGroup } from "@/components/ui/Disclosure";
import { SectionHead } from "@/components/ui/SectionHead";
import { TextLink } from "@/components/ui/TextLink";
import { SECTIONS, sectionHref } from "@/lib/sections";
import styles from "./Infrastructure.module.css";

/** "45 validator suites": a bare number before these words is a count */
const COUNTS = ["validator suites"];
/** the rows with numbers (Tests, Service checks) stay visible; the rest open on demand (.work/page-declutter/PLAN.md) */
const SHOWN = 2;

export type InfrastructureProps = Readonly<{
  /** the benchmark gate (default: releaseFacts.benchmarksPublic); the tests pass false */
  benchmarkShown?: boolean;
}>;

export function Infrastructure({ benchmarkShown = releaseFacts.benchmarksPublic }: InfrastructureProps = {}) {
  return (
    <section id={SECTIONS.infrastructure} className="sec" aria-labelledby="infrastructure-title">
      <SectionHead
        id="infrastructure-title"
        label={labels.infrastructure}
        title={infrastructure.h2}
        lead={infrastructure.stack}
        action={
          benchmarkShown ? <TextLink href={sectionHref("benchmarks")}>{infrastructure.benchmarkLink}</TextLink> : undefined
        }
      />
      <div className="wrap grid-12 sec-body">
        <div className="main">
          <dl className={styles.ledger}>
            {infrastructure.facts.slice(0, SHOWN).map((fact) => (
              <div key={fact.term} className={styles.row}>
                <dt>{fact.term}</dt>
                <dd>
                  <DataText text={fact.text} counts={COUNTS} />
                </dd>
              </div>
            ))}
          </dl>
          {/* the counts stay on screen; how the build and the updates are kept honest is one tap away */}
          <DisclosureGroup className={styles.more}>
            {infrastructure.facts.slice(SHOWN).map((fact) => (
              <Disclosure key={fact.term} summary={fact.term}>
                <p>
                  <DataText text={fact.text} counts={COUNTS} />
                </p>
              </Disclosure>
            ))}
          </DisclosureGroup>
          <p className={styles.note}>{infrastructure.note}</p>
        </div>
      </div>
    </section>
  );
}
