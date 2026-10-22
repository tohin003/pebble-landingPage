"use client";
// The pebble's path (docs/DESIGN.md §2): one hand-drawn line that leaves from under the hero pebble and carries the
// page to the sleeping pebble in the footer. Decorative: aria-hidden, no pointer events, 1.35 px in --trail.
//
// Mounted once in the root layout as the first child of the page wrapper. It draws nothing until it finds a "floor"
// anchor, so pages without anchors (the 404, /credits …) have no line.
//
// REGISTERING ANCHORS (for every section): put `data-path-anchor="<kind>"` on an element. Anchors are read in document
// order; the line visits them top to bottom.
//   floor   The ground under a pebble. The first floor starts the line (it runs under the pebble, fading in from the
//           left, then leaves to the right margin); the last floor ends it (it comes in from the margin and fades
//           out). Put it on a zero-height element exactly where the pebble's body touches the ground.
//   cross   An S-shaped sweep from one margin to the other in the gap above a section. Centred on the element's top
//           edge plus half its top padding, so put it on the <section> itself. Skipped when too close to the
//           previous feature, and on phones.
//   stop    A point the line passes through, such as a rail stone. Consecutive stops form one run: the line comes in
//           from its margin, passes every stop's centre and leaves on the other side.
//   arc     An arch: the line rises over a semicircle (the permission dial). Put it on an element whose box is the
//           arch's box: 2R wide and R tall, the arch's baseline at its bottom edge. Plain px values in the custom
//           properties --path-r (radius) and --path-cy (the baseline's y from the element's top) override that.
//           Skipped on phones.
//   gate    A checkpoint: a small gap in the line beside the element's vertical centre, on whichever margin the line
//           is running (the AgentGuard "Verified" receipt).
//   margin  Nothing: the line simply passes beside the element.
// Optional `data-path-phone="keep" | "skip"` overrides the phone rule (phones keep floors and stops only, and the
// line runs in the margins, just off the screen's edge).
//
// The line is rebuilt from the real layout when the page resizes (ResizeObserver, debounced), when fonts and images
// finish loading, and on a `pebble:path` event (dispatch one after a layout change that keeps the page's height).
// It draws itself on as the reader scrolls (stroke-dashoffset; it never retracts). Reduced motion or Pause motion:
// fully drawn, static, without the wobble.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useMotionMode } from "@/lib/hooks";
import { buildPath, drawnLength, type Anchor, type AnchorKind, type PathGeometry } from "./geometry";
import styles from "./PebblePath.module.css";

const KINDS: ReadonlySet<string> = new Set<AnchorKind>(["floor", "cross", "stop", "arc", "gate", "margin"]);
export const PATH_EVENT = "pebble:path";
const REVEAL_AHEAD = 0.92; // draw down to 92 % of the viewport height
const GRADIENT_ID = "pebble-path-fade"; // one path per page

/** Ask the path to re-measure (after a layout change that keeps the page's height). */
export function refreshPebblePath(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PATH_EVENT));
}

function readAnchors(host: HTMLElement): Anchor[] {
  const hostBox = host.getBoundingClientRect();
  const out: Anchor[] = [];
  for (const el of host.querySelectorAll<HTMLElement>("[data-path-anchor]")) {
    const kind = el.dataset.pathAnchor ?? "";
    if (!KINDS.has(kind)) continue;
    if (el.getClientRects().length === 0) continue; // display: none (for example the other platform's variant)
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    const radius = parseFloat(style.getPropertyValue("--path-r"));
    const arcCy = parseFloat(style.getPropertyValue("--path-cy"));
    const phone = el.dataset.pathPhone;
    out.push({
      kind: kind as AnchorKind,
      left: box.left - hostBox.left,
      top: box.top - hostBox.top,
      width: box.width,
      height: box.height,
      padTop: kind === "cross" ? parseFloat(style.paddingTop) || 0 : undefined,
      radius: Number.isFinite(radius) ? radius : undefined,
      arcCy: Number.isFinite(arcCy) ? arcCy : undefined,
      phone: phone === "keep" || phone === "skip" ? phone : undefined,
    });
  }
  return out;
}

export function PebblePath() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathsRef = useRef<(SVGPathElement | null)[]>([]);
  const [geometry, setGeometry] = useState<PathGeometry | null>(null);
  const mode = useMotionMode();
  const still = mode !== "on"; // includes "not hydrated yet"
  const pathname = usePathname();

  // Build (and rebuild) from the real layout.
  useEffect(() => {
    const host = svgRef.current?.parentElement;
    if (!host) return;
    let timer = 0;
    let frame = 0;
    const build = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const anchors = readAnchors(host);
        const width = host.clientWidth;
        const height = host.offsetHeight; // not scrollHeight: that would include this SVG itself
        setGeometry(anchors.some((a) => a.kind === "floor") ? buildPath(anchors, { width, height, wobble: !still }) : null);
      });
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(build, 140);
    };
    build();
    const observer = new ResizeObserver(schedule);
    observer.observe(host);
    window.addEventListener(PATH_EVENT, schedule);
    window.addEventListener("load", schedule);
    void document.fonts?.ready.then(schedule);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener(PATH_EVENT, schedule);
      window.removeEventListener("load", schedule);
    };
  }, [still, pathname]);

  // Draw on with scroll progress; never retract. Fully drawn when motion is off.
  useEffect(() => {
    if (!geometry) return;
    const paths = pathsRef.current;
    const setDrawn = (drawn: number) => {
      geometry.pieces.forEach((piece, i) => {
        const el = paths[i];
        if (!el) return;
        const visible = Math.min(piece.length, Math.max(0, drawn - piece.start));
        el.style.strokeDasharray = `${piece.length + 1} ${piece.length + 1}`;
        el.style.strokeDashoffset = `${piece.length - visible}`;
      });
    };
    if (still) {
      paths.forEach((el) => {
        if (el) {
          el.style.strokeDasharray = "";
          el.style.strokeDashoffset = "";
        }
      });
      return;
    }
    let drawn = 0;
    let frame = 0;
    const update = () => {
      frame = 0;
      const host = svgRef.current?.parentElement;
      if (!host) return;
      const target = window.scrollY + window.innerHeight * REVEAL_AHEAD - (host.getBoundingClientRect().top + window.scrollY);
      const next = drawnLength(geometry, target);
      if (next > drawn) {
        drawn = next;
        setDrawn(drawn);
      }
    };
    setDrawn(0);
    update();
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [geometry, still]);

  return (
    <svg
      ref={svgRef}
      className={styles.path}
      aria-hidden="true"
      focusable="false"
      width={geometry?.width ?? 0}
      height={geometry?.height ?? 0}
      viewBox={geometry ? `0 0 ${geometry.width} ${geometry.height}` : undefined}
      data-pebble-path={geometry ? "ready" : "empty"}
    >
      {geometry ? (
        <>
          <defs>
            {geometry.pieces.map((piece, i) =>
              piece.fade ? (
                <linearGradient
                  key={i}
                  id={`${GRADIENT_ID}-${i}`}
                  gradientUnits="userSpaceOnUse"
                  x1={piece.fade.x0}
                  x2={piece.fade.x1}
                  y1={piece.fade.y}
                  y2={piece.fade.y}
                >
                  <stop offset="0" style={{ stopColor: "var(--trail)", stopOpacity: piece.fade.kind === "in" ? 0 : 1 }} />
                  <stop offset="1" style={{ stopColor: "var(--trail)", stopOpacity: piece.fade.kind === "in" ? 1 : 0 }} />
                </linearGradient>
              ) : null,
            )}
          </defs>
          {geometry.pieces.map((piece, i) => (
            <path
              key={`${i}-${piece.start}`}
              ref={(el) => {
                pathsRef.current[i] = el;
              }}
              d={piece.d}
              className={styles.stroke}
              style={piece.fade ? { stroke: `url(#${GRADIENT_ID}-${i})` } : undefined}
            />
          ))}
          {geometry.gates.map((gate, i) => (
            <path
              key={`gate-${i}`}
              className={styles.gate}
              d={`M${gate.x - 4} ${gate.y - 9}h8M${gate.x - 4} ${gate.y + 9}h8`}
            />
          ))}
        </>
      ) : null}
    </svg>
  );
}
