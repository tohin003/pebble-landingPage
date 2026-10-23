"use client";
// The privacy diagram's strands (DESIGN §2, §5 row 11): the page's line, branching. From the "Your Mac" pebble (or,
// below 900 px, the small mark beside "What leaves your Mac") a trunk runs down and one strand turns off it to each of
// the five destinations. Drawn in the line's own hand: 1.35 px in --trail, with the same slow sine wobble as the page's
// line (src/components/line/geometry.ts), tapered to nothing at each end so the joins meet.
//
// Measured from the real layout (the origin is the first visible [data-strand-origin] in the diagram, the targets its
// visible [data-strand-target] marks) and rebuilt when the diagram resizes. When the diagram first comes into view the
// trunk draws down and each strand follows as the trunk reaches it (stroke-dashoffset, about a second, once). Reduced
// motion or Pause motion: drawn from the start, without the wobble, as the page's line is. Decorative: aria-hidden.
import { useEffect, useRef, useState } from "react";
import { wobbleAt } from "@/components/line/geometry";
import { useMotionMode } from "@/lib/hooks";
import styles from "./Privacy.module.css";

type Pt = readonly [number, number];
type Piece = Readonly<{ d: string; length: number; delay: number; duration: number }>;
type Drawing = Readonly<{ width: number; height: number; pieces: readonly Piece[] }>;

const STEP = 4; // resampling step, px
const TRUNK_MS = 720;
const BRANCH_MS = 420;

const isVisible = (el: Element) => el.getClientRects().length > 0;

/** A polyline through `points` (already dense), resampled every STEP px, with the wobble tapered at both ends. */
function hand(points: readonly Pt[], wobble: boolean): { d: string; length: number } {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1]! + Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]));
  }
  const total = cum[cum.length - 1]!;
  if (total < 1) return { d: "", length: 0 };
  let d = "";
  let j = 0;
  for (let s = 0; s <= total + 0.01; s += STEP) {
    const at = Math.min(s, total);
    while (j < points.length - 2 && cum[j + 1]! < at) j++;
    const span = cum[j + 1]! - cum[j]! || 1;
    const t = (at - cum[j]!) / span;
    const [x0, y0] = points[j]!;
    const [x1, y1] = points[j + 1]!;
    let x = x0 + (x1 - x0) * t;
    let y = y0 + (y1 - y0) * t;
    if (wobble) {
      const len = Math.hypot(x1 - x0, y1 - y0) || 1;
      const taper = Math.sin(Math.PI * (at / total)); // 0 at both ends: the joins stay exact
      const w = wobbleAt(at) * 0.8 * taper;
      x += (-(y1 - y0) / len) * w;
      y += ((x1 - x0) / len) * w;
    }
    d += `${d ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return { d, length: total };
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

function measure(host: HTMLElement, wobble: boolean): Drawing | null {
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
  const pieces: Piece[] = [];

  // the trunk, from the origin down to where the last strand turns off
  const trunkEnd = lastY - radius;
  const trunkPoints: Pt[] = [];
  for (let y = oy; y < trunkEnd; y += 8) trunkPoints.push([ox, y]);
  trunkPoints.push([ox, trunkEnd]);
  const trunk = hand(trunkPoints, wobble);
  pieces.push({ ...trunk, delay: 0, duration: TRUNK_MS });

  // one strand per destination: a quarter turn off the trunk, then straight to just short of the mark
  for (const mark of marks) {
    const end = mark.left - 4;
    if (end <= ox + radius) continue;
    const points: Pt[] = [...turn(ox, mark.y, radius)];
    for (let x = ox + radius + 8; x < end; x += 8) points.push([x, mark.y]);
    points.push([end, mark.y]);
    const strand = hand(points, wobble);
    // each strand starts as the trunk's draw-on passes its turn: the draw-on eases out like easeOutCubic
    // (Privacy.module.css), p = 1 − (1 − t)³, so the trunk reaches a fraction p of its length at t = 1 − (1 − p)^⅓
    const reach = Math.min(1, Math.max(0, (mark.y - radius - oy) / Math.max(1, trunkEnd - oy)));
    const delay = Math.round(TRUNK_MS * (1 - Math.cbrt(1 - reach)));
    pieces.push({ ...strand, delay, duration: BRANCH_MS });
  }
  return { width: box.width, height: box.height, pieces };
}

export function PrivacyStrands() {
  const svg = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [shown, setShown] = useState(false); // drawn on (or never animated)
  const mode = useMotionMode();
  const still = mode !== "on"; // includes "not hydrated yet"

  // Build from the real layout, and again whenever the diagram changes size.
  useEffect(() => {
    const host = svg.current?.parentElement;
    if (!host) return;
    let frame = 0;
    const build = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setDrawing(measure(host, !still)));
    };
    build();
    const observer = new ResizeObserver(build);
    observer.observe(host);
    void document.fonts?.ready.then(build);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [still]);

  // Draw on once, the first time the diagram is well in view.
  useEffect(() => {
    if (shown || still) return;
    const host = svg.current?.parentElement;
    if (!host) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, [shown, still]);

  const animate = !still;
  return (
    <svg
      ref={svg}
      className={styles.strands}
      aria-hidden="true"
      focusable="false"
      width={drawing?.width ?? 0}
      height={drawing?.height ?? 0}
      viewBox={drawing ? `0 0 ${drawing.width} ${drawing.height}` : undefined}
      data-drawn={!animate || shown ? "" : undefined}
    >
      {drawing?.pieces.map((piece, i) => (
        <path
          key={`${i}-${piece.length.toFixed(0)}`}
          d={piece.d}
          className={styles.strand}
          style={
            animate
              ? {
                  strokeDasharray: `${piece.length + 2} ${piece.length + 2}`,
                  strokeDashoffset: shown ? 0 : piece.length + 1,
                  transitionDuration: `${piece.duration}ms`,
                  transitionDelay: `${piece.delay}ms`,
                }
              : undefined
          }
        />
      ))}
    </svg>
  );
}
