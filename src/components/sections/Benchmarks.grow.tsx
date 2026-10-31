"use client";
// The scoreboard's and the chart's one-time grow-in (rules: Benchmarks.motion.ts). A wrapper that renders its server
// children untouched; after hydration it may arm (data-grow="armed": the bars at zero, each figure covered by an
// aria-hidden counter at zero), play once when a third of it is in view, and settle (data-grow="done"). The figures'
// own text never changes: a screen reader, a copy and the HTML always hold the real values. Pressing Pause motion (or
// any change of html[data-motion]) while it waits or plays settles it at once.
import { useEffect, useRef, type ReactNode } from "react";
import { GROW_MS, countText, easeOut, growPlan } from "./Benchmarks.motion";

export function Grow({ className, children, label }: { className?: string; children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const html = document.documentElement;
    const box = root.getBoundingClientRect();
    const inView = box.top < window.innerHeight && box.bottom > 0;
    if (growPlan(html.dataset.motion, inView) === "still") return;

    // each counted figure gets a twin over it, for the eye only
    const ticks = Array.from(root.querySelectorAll<HTMLElement>("[data-count]")).map((figure) => {
      const tick = document.createElement("span");
      tick.setAttribute("aria-hidden", "true");
      tick.dataset.tick = "";
      tick.textContent = countText(figure.dataset.count ?? "", 0);
      figure.parentElement?.appendChild(tick);
      return { tick, final: figure.dataset.count ?? "" };
    });
    root.dataset.grow = "armed";

    let frame = 0;
    const settle = () => {
      cancelAnimationFrame(frame);
      for (const { tick } of ticks) tick.remove();
      root.dataset.grow = "done";
      io.disconnect();
      mo.disconnect();
    };
    const play = () => {
      root.dataset.grow = "play";
      const start = performance.now();
      const step = (now: number) => {
        const t = (now - start) / GROW_MS;
        if (t >= 1) return settle();
        for (const { tick, final } of ticks) tick.textContent = countText(final, easeOut(t));
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (html.dataset.motion === "on") play();
        else settle();
      },
      { threshold: 0.3 },
    );
    const mo = new MutationObserver(() => {
      if (html.dataset.motion !== "on") settle();
    });
    io.observe(root);
    mo.observe(html, { attributes: true, attributeFilter: ["data-motion"] });
    return settle;
  }, []);
  return (
    <div ref={ref} className={className} data-grow="still" aria-label={label} role={label ? "group" : undefined}>
      {children}
    </div>
  );
}
