"use client";
// The compact call to action that follows the reader (MASTER_PLAN §7.4): it appears once the hero has left the
// screen and steps aside while the Install section, the final call to action or the footer is in view (at the very
// end of the page nothing can scroll out from under it, so over the footer it would hide the fine print for good).
// Beside its Download: the version, the size and "Not notarized" (OVERRIDES §20), as separate items, never a
// middle-dot string; on phones "Not notarized" takes the second line (globals.css .facts).
// Hidden, it is invisible to everyone (visibility: hidden), so it never takes focus; html's scroll-padding-bottom keeps
// it off focused elements.
import { useEffect, useState } from "react";
import { stickyCta } from "@/content/copy";
import { SECTIONS } from "@/lib/sections";
import type { ReleaseInfo } from "@/lib/release";
import { DataText } from "@/components/ui/Data";
import { GetPebble } from "./GetPebble";
import styles from "./StickyCta.module.css";

export function StickyCta({
  release,
  facts,
}: {
  release: Pick<ReleaseInfo, "state" | "downloadUrl">;
  /** shown next to the button on a Mac, each its own item: copy.ts stickyCta.facts(), ["v1.2.0", "72 MB", "Not notarized"] */
  facts: readonly string[];
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(SECTIONS.hero);
    const blockers = [
      ...[SECTIONS.install, SECTIONS.finalCta].map((id) => document.getElementById(id)),
      document.querySelector("body footer"),
    ].filter((el): el is HTMLElement => el instanceof HTMLElement);
    if (!hero) return;
    let heroGone = false;
    const blocking = new Set<Element>();
    const update = () => setVisible(heroGone && blocking.size === 0);
    const heroObserver = new IntersectionObserver(([entry]) => {
      heroGone = !!entry && !entry.isIntersecting && entry.boundingClientRect.top < 0;
      update();
    });
    heroObserver.observe(hero);
    const blockObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) blocking.add(entry.target);
        else blocking.delete(entry.target);
      }
      update();
    });
    blockers.forEach((el) => blockObserver.observe(el));
    return () => {
      heroObserver.disconnect();
      blockObserver.disconnect();
    };
  }, []);

  if (release.state !== "live") return null;
  return (
    <aside className={styles.sticky} data-visible={visible ? "" : undefined} aria-label={stickyCta.label}>
      <GetPebble release={release} variant="compact" macLabel={stickyCta.download} />
      <ul className={`facts only-mac ${styles.facts}`}>
        {facts.map((fact) => (
          <li key={fact}>
            <DataText text={fact} />
          </li>
        ))}
      </ul>
    </aside>
  );
}
