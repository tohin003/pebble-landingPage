// Pebble's Workshop (Code Mode since 1.5.0; the tools Pebble makes and the Toolbox since 2.0.0), after Across your Mac.
// The head through SectionHead: "Workshop / Tools it makes" in the rail, the H2 in two tones ("Pebble's Workshop." /
// "Tools it makes for itself, checked before it keeps them."), the lead. The exhibit is the feature ledger: The Toolbox,
// Checked before use, Code Mode, each with its limit, then the section's limit (a tool is a pure calculation). Copy:
// copy.ts `workshop` (CLAIMS C-WS-1..5, C-TOUR-6; pending: verify at v2.0.0). No numbers, and never 1.3.0's
// unannounced name (OVERRIDES §25).
import { workshop } from "@/content/copy";
import { labels } from "@/content/labels";
import { SectionHead } from "@/components/ui/SectionHead";
import { SECTIONS } from "@/lib/sections";
import { FeatureLedger } from "./FeatureLedger";

export function Workshop() {
  return (
    <section id={SECTIONS.workshop} className="sec" aria-labelledby="workshop-title">
      <SectionHead
        id="workshop-title"
        label={labels.workshop}
        title={workshop.h2}
        then={workshop.then}
        lead={workshop.lead}
      />
      <div className="wrap grid-12 sec-body">
        <div className="main">
          <FeatureLedger rows={workshop.rows} note={workshop.note} />
        </div>
      </div>
    </section>
  );
}
