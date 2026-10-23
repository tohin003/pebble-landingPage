// Section 1, the hero (DESIGN §5 row 1, comp 3): the pebble on the line in a pool of light, the H1, the lead, the call
// to action, the facts list and the short honest line. The line starts under the pebble (the "floor" anchor).
//
// - The pebble is lane B's live engine over a static first frame; it settles after 8 s without pointer input
//   (OVERRIDES §8 H4) and is itself the "Say hi to Pebble" button (HeroHello).
// - The text reveal is CSS only (globals.css .reveal) and never waits for hydration (critic M6).
// - A click on Download opens the short notice about the first run (HeroCta, MASTER_PLAN §7.4).
// - No film link here: the film's poster peeks above the fold right below (DESIGN §5 rows 1 and 2).
import type { CSSProperties } from "react";
import { cta, hero, honestLimits, links } from "@/content/copy";
import { Pebble } from "@/components/pebble/Pebble";
import { GetPebble } from "@/components/shell/GetPebble";
import { getRelease, releaseFacts } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import { HeroCta, HeroHello } from "./Hero.client";
import styles from "./Hero.module.css";

/** the reveal's stagger index (globals.css .reveal) */
const at = (i: number) => ({ "--i": i }) as CSSProperties;

export async function Hero() {
  const release = await getRelease();
  return (
    <section id={SECTIONS.hero} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.backdrop} aria-hidden="true">
        <div className={styles.grain} />
      </div>

      <div className={styles.stage}>
        <HeroHello>
          <Pebble name="hero" className={styles.pebble} />
        </HeroHello>
        <span className={styles.contact} aria-hidden="true" />
        {/* the line starts here, under the pebble (src/components/line/PebblePath.tsx) */}
        <span className={styles.floor} data-path-anchor="floor" aria-hidden="true" />
      </div>

      <h1 id="hero-title" className={`${styles.title} reveal`} style={at(1)}>
        {hero.h1}
      </h1>
      <p className={`${styles.lead} reveal`} style={at(2)}>
        {hero.lead}
      </p>

      <HeroCta className={`${styles.cta} reveal`} style={at(3)}>
        <GetPebble release={release} variant="primary" className={styles.primary} />
        <a className={styles.quiet} href={links.repo}>
          {cta.github}
        </a>
      </HeroCta>
      <p className={`${styles.notice} only-other reveal`} style={at(4)}>
        {cta.nonMac.notice}
      </p>

      {release.state === "live" ? (
        <ul className={`facts ${styles.facts} reveal`} style={at(4)}>
          {releaseFacts(release).map((fact) => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
      ) : null}
      <p className={`${styles.honest} reveal`} style={at(5)}>
        {hero.honestLine} <a href={`#${SECTIONS.limits}`}>{honestLimits.shortLink}</a>
      </p>
    </section>
  );
}
