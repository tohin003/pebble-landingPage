// Section 1, the hero (DESIGN §5 row 1, comp 3): the pebble on the line in a pool of light, the H1, the lead, the call
// to action, the facts list and the short honest line. The line starts under the pebble (the "floor" anchor).
//
// STUB by lane F1 (site shell), with the shell's pieces wired in. TODO(F2):
// - "Say hi to Pebble": a real button that calls tapPebble("hero") and shows "Hi, I'm Pebble." in an aria-live
//   bubble; onPebbleTapped for clicks on the pebble itself (src/components/pebble/events.ts, lane B's handoff);
// - the download notice after a click on Download (copy.ts `downloadNotice`, MASTER_PLAN §7.4);
// - the film link with its computed length (chapters.ts `filmDurationLabel()`), once lane E sets it.
import type { CSSProperties } from "react";
import { cta, hero, honestLimits, links } from "@/content/copy";
import { heroStub } from "@/content/stubs";
import { Pebble } from "@/components/pebble/Pebble";
import { GetPebble } from "@/components/shell/GetPebble";
import { getRelease, releaseFacts } from "@/lib/release";
import { SECTIONS } from "@/lib/sections";
import styles from "./Hero.module.css";

/** the reveal's stagger index (globals.css .reveal) */
const at = (i: number) => ({ "--i": i }) as CSSProperties;

export async function Hero() {
  const release = await getRelease();
  return (
    <section id={SECTIONS.hero} className={styles.hero} aria-labelledby="hero-title" data-todo="F2">
      <div className={styles.backdrop} aria-hidden="true">
        <div className={styles.grain} />
      </div>

      <div className={styles.stage}>
        <Pebble name="hero" className={styles.pebble} />
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

      <div className={`${styles.cta} reveal`} style={at(3)}>
        <GetPebble release={release} variant="primary" className={styles.primary} />
        <a className={styles.quiet} href={links.repo}>
          {cta.github}
        </a>
      </div>
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
        {heroStub.honestLine} <a href={`#${SECTIONS.limits}`}>{honestLimits.shortLink}</a>
      </p>
    </section>
  );
}
