"use client";
// Opens the FAQ entry a link points at (/#faq-notarized, from the download notice and elsewhere): a <details> that is
// the target of the address's fragment opens, on load and on every hash change, and is scrolled into view. Some
// browsers do this by themselves for closed <details>; this makes it the same everywhere. Renders nothing.
import { useEffect } from "react";

export function FaqHashOpener({ ids }: { ids: readonly string[] }) {
  useEffect(() => {
    const known = new Set(ids);
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!known.has(id)) return;
      const el = document.getElementById(id);
      if (!(el instanceof HTMLDetailsElement)) return;
      if (!el.open) el.open = true;
      // after the browser's own jump, so the opened answer is in view and the summary takes focus
      requestAnimationFrame(() => {
        el.scrollIntoView({ block: "start" });
        el.querySelector("summary")?.focus({ preventScroll: true });
      });
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [ids]);
  return null;
}
