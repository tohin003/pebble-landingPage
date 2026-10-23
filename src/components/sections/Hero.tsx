// Section 1, the hero (DESIGN-LEXINGTON §3.7 and §6 Hero, comp A): a 6 | 6 split on the page's grid. The words in
// columns 1–6, pinned top and bottom: the H1 at the top; the lead, the call to action, the honest line and the
// release facts at the bottom. The pebble's field in columns 7–12: the live pebble in a 400 px box standing on its
// own ground (a local Horizon), and under it the engine caption. No backdrop: the page is one ground, and the loud
// thing is the pebble, never the headline (PHILOSOPHY principle 7: the H1 is never larger than the pebble beside it).
// The hero is sized so the film poster's top shows above the fold at 1440 × 900.
//
// - The pebble is lane B's live engine over a static first frame; it rests its eyes straight ahead, settles after 8 s
//   without pointer input (OVERRIDES §8 H4) and is itself the "Say hi to Pebble" button (HeroHello).
// - The text reveal is CSS only (globals.css .reveal) and never waits for hydration (critic M6).
// - The call to action is GetPebbleCluster: the Download with its honest line and facts, and the "Before you open
//   Pebble" notice after a click (src/components/ui).
// - Below 1024 px: one column, the pebble first, then the words; on phones the Download is full width.
import type { CSSProperties } from "react";
import { hero } from "@/content/copy";
import { Pebble } from "@/components/pebble/Pebble";
import { GetPebbleCluster } from "@/components/ui/GetPebbleCluster";
import { Horizon } from "@/components/ui/Horizon";
import { getRelease } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import { HeroHello } from "./Hero.client";
import styles from "./Hero.module.css";

/** the reveal's stagger index (globals.css .reveal) */
const at = (i: number) => ({ "--i": i }) as CSSProperties;

export async function Hero() {
  const release = await getRelease();
  return (
    <section id={SECTIONS.hero} className={styles.hero} aria-labelledby="hero-title">
      <div className={`wrap grid-12 ${styles.grid}`}>
        <div className={styles.copy}>
          <h1 id="hero-title" className={`${styles.title} reveal`} style={at(1)}>
            {hero.h1}
          </h1>
          <div className={styles.foot}>
            <p className={`lead ${styles.lead} reveal`} style={at(2)}>
              {hero.lead}
            </p>
            <GetPebbleCluster release={release} reveal={3} className={styles.cta} />
          </div>
        </div>

        <figure className={styles.field}>
          <div className={styles.stage}>
            <Horizon variant={0} className={styles.ground} />
            <span className={styles.contact} aria-hidden="true" />
            <HeroHello>
              <Pebble name="hero" className={styles.pebble} />
            </HeroHello>
          </div>
          <figcaption className={`caption ${styles.caption}`}>{hero.pebble.note}</figcaption>
        </figure>
      </div>
    </section>
  );
}
