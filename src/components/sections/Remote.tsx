// Pebble Remote (the Mac side since 2.0.0; the iPhone app's source published with 2.0.1), after Pebble's Workshop and
// before Your model (SITE_AUDIT §4.2: act 8 of the film; the director's X8). The head through SectionHead: "Pebble
// Remote / New in 2.0.0" in the rail, the H2 in two tones ("Pebble Remote." / "Use Pebble on your Mac from your
// iPhone."), the app's own description as the lead and, right under it, its first limit: it is source only, built
// with Xcode. The head's one link is the app's source. Then the feature ledger as tabs (Off by default, Pairing,
// Face ID, The Mac shows it), each with its limit at the same size (PHILOSOPHY 3), the note on what it needs and the
// app's own limits, a link to the setup guide, and, once it exists, the iPhone recording (4:5, media.ts
// launchLoopMedia("remote")). Copy: copy.ts `remote` (CLAIMS C-RMT-1..12), worded only from Pebble's own published text.
import { remote } from "@/content/copy";
import { labels } from "@/content/labels";
import { FeatureLoop } from "@/components/media/FeatureLoop";
import { SectionHead } from "@/components/ui/SectionHead";
import { TextLink } from "@/components/ui/TextLink";
import { SECTIONS } from "@/lib/sections";
import { FeatureLedger } from "./FeatureLedger";
import styles from "./Remote.module.css";

export function Remote() {
  const [source, guide] = remote.links;
  return (
    <section id={SECTIONS.remote} className="sec" aria-labelledby="remote-title">
      <SectionHead
        id="remote-title"
        label={labels.remote}
        title={remote.h2}
        then={remote.then}
        lead={
          <>
            {remote.lead} <span className={styles.limit}>{remote.sourceOnly}</span>
          </>
        }
        action={<TextLink href={source.href}>{source.label}</TextLink>}
      />
      <div className="wrap grid-12 sec-body">
        <div className="main">
          <FeatureLedger mode="tabs" label={remote.tabsLabel} rows={remote.rows} note={remote.note} />
          <p className={styles.guide}>
            <TextLink href={guide.href}>{guide.label}</TextLink>
          </p>
          <FeatureLoop id="remote" sizes="(max-width: 560px) calc(100vw - 32px), 400px" />
        </div>
      </div>
    </section>
  );
}
