// Across your Mac (Pebble 2.0.0), right after the project story: what Pebble does beyond a project. The head through
// SectionHead: "Across your Mac / New in 2.0.0" in the rail, the H2, the lead. The exhibit is the feature ledger as tabs
// (one reach at a time; an accordion below 768 px, .work/page-declutter/PLAN.md): Commands and files, App windows, Websites, Apps and app actions, each with its limit at the
// same size, then the note on Screen control and macOS's permissions. Copy: copy.ts `acrossMac` (CLAIMS C-MAC-1..10,
// checked at v2.0.0). Under the ledger, once it exists, one Pebble 2.0 clip: the launch film's S03, the whole burst
// (Calculator, Calendar, a Chrome tab, then the window card), cut from the film (tools/encode/launch-loops.json `mac`).
// The film's shots last 1.5 to 2 s each, too short for a clip a tab, so the director chose one clip for the section
// (phase B, answer 1): no tab is left without its media. Until the clip exists the ledger is text only.
import { acrossMac } from "@/content/copy";
import { labels } from "@/content/labels";
import { FeatureLoop } from "@/components/media/FeatureLoop";
import { SectionHead } from "@/components/ui/SectionHead";
import { SECTIONS } from "@/lib/sections";
import { FeatureLedger } from "./FeatureLedger";

export function AcrossYourMac() {
  return (
    <section id={SECTIONS.mac} className="sec" aria-labelledby="mac-title">
      <SectionHead id="mac-title" label={labels.mac} title={acrossMac.h2} lead={acrossMac.lead} chip="mac" />
      <div className="wrap grid-12 sec-body">
        <div className="main">
          <FeatureLedger mode="tabs" label={acrossMac.tabsLabel} rows={acrossMac.rows} note={acrossMac.note} />
          <FeatureLoop id="mac" />
        </div>
      </div>
    </section>
  );
}
