"use client";
// The privacy diagram's strands (DESIGN-LEXINGTON §3.9, §6 row 11): the pebble's line, branching. From the "Your Mac"
// pebble (or, below 1024 px, the small mark beside "What leaves your Mac") a trunk runs down and one strand turns off it
// to each of the five destinations: 1.35 px in --trail, round joins, a quarter turn at each branch.
//
// Static, as every line on the page is (DESIGN-LEXINGTON §3.9, §3.10: no wobble, no draw-on, nothing moves on scroll):
// drawn as soon as the layout is measured, in every motion mode. Measured from the real layout (the origin is the
// first visible [data-strand-origin] in the diagram, the targets its visible [data-strand-target] marks) and rebuilt
// when the diagram resizes or the fonts arrive. Decorative: aria-hidden.
import { useEffect, useRef, useState } from "react";
import styles from "./Privacy.module.css";

type Pt = readonly [number, number];
type Drawing = Readonly<{ width: number; height: number; paths: readonly string[] }>;

const isVisible = (el: Element) => el.getClientRects().length > 0;

/** A polyline through `points`. */
function path(points: readonly Pt[]): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
}

/** A quarter turn from going down to going right, as a dense point list. */
function turn(cx: number, cy: number, r: number): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k <= 8; k++) {
    const a = (Math.PI / 2) * (k / 8); // 0 → 90°
    out.push([cx + r - r * Math.cos(a), cy - r + r * Math.sin(a)]);
  }
  return out;
}

function measure(host: HTMLElement): Drawing | null {
  const box = host.getBoundingClientRect();
  const origin = [...host.querySelectorAll<HTMLElement>("[data-strand-origin]")].find(isVisible);
  const targets = [...host.querySelectorAll<HTMLElement>("[data-strand-target]")].filter(isVisible);
  if (!origin || targets.length === 0) return null;
  const o = origin.getBoundingClientRect();
  const ox = o.left - box.left + o.width / 2;
  const oy = o.top - box.top + o.height / 2;
  const marks = targets.map((el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left - box.left, y: r.top - box.top + r.height / 2 };
  });
  const lastY = marks[marks.length - 1]!.y;
  if (lastY <= oy) return null;
  const radius = Math.max(6, Math.min(14, (marks[0]!.left - ox) / 2.5));
  // the trunk, from the origin down to where the last strand turns off
  const paths = [path([[ox, oy], [ox, lastY - radius]])];
  // one strand per destination: a quarter turn off the trunk, then straight to just short of the mark
  for (const mark of marks) {
    const end = mark.left - 4;
    if (end <= ox + radius) continue;
    paths.push(path([...turn(ox, mark.y, radius), [end, mark.y]]));
  }
  return { width: box.width, height: box.height, paths };
}

export function PrivacyStrands() {
  const svg = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);

  // Build from the real layout, and again whenever the diagram changes size.
  useEffect(() => {
    const host = svg.current?.parentElement;
    if (!host) return;
    let frame = 0;
    const build = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setDrawing(measure(host)));
    };
    build();
    const observer = new ResizeObserver(build);
    observer.observe(host);
    void document.fonts?.ready.then(build);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <svg
      ref={svg}
      className={styles.strands}
      aria-hidden="true"
      focusable="false"
      width={drawing?.width ?? 0}
      height={drawing?.height ?? 0}
      viewBox={drawing ? `0 0 ${drawing.width} ${drawing.height}` : undefined}
      data-drawn=""
    >
      {drawing?.paths.map((d, i) => (
        <path key={i} d={d} className={styles.strand} />
      ))}
    </svg>
  );
}
