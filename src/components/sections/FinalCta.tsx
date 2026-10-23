// Section 15, the final call to action (DESIGN-LEXINGTON §6 row 15): on the grid like every section. The head is
// "Get Pebble / 72 MB" in the rail and "Say hi to Pebble." / "Free and open source, for Macs with Apple silicon." in two
// tones (two approved strings), with the film chapter chip. Then, from column 4, the same call to action as the hero
// (GetPebbleCluster: the Download with its honest line and facts, the download notice, the non-Mac line) and "Or install
// in one line ›". The footer below shows the pebble asleep.
import { finalCta } from "@/content/copy";
import { labels } from "@/content/labels";
import { GetPebbleCluster } from "@/components/ui/GetPebbleCluster";
import { SectionHead } from "@/components/ui/SectionHead";
import { getRelease } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import styles from "./FinalCta.module.css";

export async function FinalCta() {
  const release = await getRelease();
  return (
    <section id={SECTIONS.finalCta} className="sec" aria-labelledby="finalCta-title">
      <SectionHead
        id="finalCta-title"
        label={labels.getPebble(release.sizeLabel)}
        title={finalCta.h2}
        then={finalCta.lead}
        chip={finalCta.chapterId}
      />
      <div className={`wrap grid-12 ${styles.body}`}>
        <div className="main">
          <GetPebbleCluster release={release} install headingLevel={3} />
        </div>
      </div>
    </section>
  );
}
