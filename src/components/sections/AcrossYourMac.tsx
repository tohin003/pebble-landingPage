// Across your Mac (Pebble 2.0.0), right after the project story: what Pebble does beyond a project. The head through
// SectionHead: "Across your Mac / New in 2.0.0" in the rail, the H2, the lead. The exhibit is the feature ledger (the
// Infrastructure pattern): Commands and files, App windows, Websites, Apps and app actions, each with its limit at the
// same size, then the note on Screen control and macOS's permissions. Copy: copy.ts `acrossMac` (CLAIMS C-MAC-1..10,
// checked at v2.0.0). Text only until real 2.0.0 captures exist (.work/page-2.0/PLAN.md, "Visuals").
import { acrossMac } from "@/content/copy";
import { labels } from "@/content/labels";
import { SectionHead } from "@/components/ui/SectionHead";
import { SECTIONS } from "@/lib/sections";
import { FeatureLedger } from "./FeatureLedger";

export function AcrossYourMac() {
  return (
    <section id={SECTIONS.mac} className="sec" aria-labelledby="mac-title">
      <SectionHead id="mac-title" label={labels.mac} title={acrossMac.h2} lead={acrossMac.lead} />
      <div className="wrap grid-12 sec-body">
        <div className="main">
          <FeatureLedger rows={acrossMac.rows} note={acrossMac.note} />
        </div>
      </div>
    </section>
  );
}
