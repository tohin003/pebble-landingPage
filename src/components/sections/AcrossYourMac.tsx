// Across your Mac (Pebble 2.0.0), right after the project story: what Pebble does beyond a project. The head through
// SectionHead: "Across your Mac / New in 2.0.0" in the rail, the H2, the lead. The exhibit is the feature ledger as tabs
// (one reach at a time; an accordion below 768 px, .work/page-declutter/PLAN.md): Commands and files, App windows, Websites, Apps and app actions, each with its limit at the
// same size, then the note on Screen control and macOS's permissions. Copy: copy.ts `acrossMac` (CLAIMS C-MAC-1..10,
// checked at v2.0.0). Three tabs carry a Pebble 2.0 clip after their limit once it exists (SITE_AUDIT §4.2): App
// windows the Calculator take (mac-apps), Apps and app actions the Calendar take (mac-actions), Websites the website
// card and its tab (mac-web). Until then the ledger is text only.
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
          <FeatureLedger
            mode="tabs"
            label={acrossMac.tabsLabel}
            rows={acrossMac.rows}
            note={acrossMac.note}
            media={{
              windows: <FeatureLoop id="mac-apps" />,
              apps: <FeatureLoop id="mac-actions" />,
              web: <FeatureLoop id="mac-web" />,
            }}
          />
        </div>
      </div>
    </section>
  );
}
