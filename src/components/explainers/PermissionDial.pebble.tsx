"use client";
// The dial's pebble (DESIGN §2): it sits under the arch and looks at the chosen mode, so its gaze is the dial's needle.
// Lane B's PebbleLive follows the pointer; this one looks where it is told, so it drives the same engine
// (shared/pebble LivePebble) with the same rules: at most 30 frames a second, one animated pebble on the page at a time
// (usePebbleConductor), a settled still after HOLD_SECONDS without a change, a still frame (and an instant turn of the
// eyes) under reduced or paused motion, and no work while it is off-screen or the tab is hidden.
//
// Loaded lazily by PermissionDial (it shares the engine chunk with PebbleLive); the server's still frame of the same
// gaze stands in until it arrives, and the two frames are identical (both start from PermissionDial.still.ts).
import { useEffect, useRef, useState } from "react";
import { MAX_FPS, type Gaze, type PebbleView } from "@pebble/index";
import { PebbleSvg } from "@/components/pebble/PebbleSvg";
import { useMotionAllowed, usePebbleConductor } from "@/components/pebble/usePebbleConductor";
import { dialPebble } from "./PermissionDial.still";

/** 30 fps, with half a millisecond of slack for timer jitter (as PebbleLive). */
const FRAME_MS = 1000 / MAX_FPS - 0.5;

type Mode = "animate" | "hold" | "still";

export default function DialPebble({ gaze, className }: { gaze: Gaze; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pebble] = useState(() => dialPebble(gaze));
  const [view, setView] = useState<PebbleView>(() => pebble.still());
  const [awake, setAwake] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const motionAllowed = useMotionAllowed();
  const { active, visible } = usePebbleConductor(ref, motionAllowed);

  const mode: Mode = !motionAllowed ? "still" : !visible || !pageVisible ? "hold" : !active ? "still" : awake ? "animate" : "hold";

  // A new mode: the eyes turn toward it (the engine's own 0.24 s look morph), and the pebble wakes.
  useEffect(() => {
    if (pebble.setGaze(gaze)) setAwake(true);
  }, [pebble, gaze.x, gaze.y]);

  // Still: the settled frame, eyes already on the chosen mode.
  useEffect(() => {
    if (mode === "still") setView(pebble.still());
  }, [pebble, mode, gaze.x, gaze.y]);

  // The animation loop (PebbleLive's): requestAnimationFrame capped at 30 fps, sleeping through skipped frames.
  useEffect(() => {
    if (mode !== "animate") return;
    let raf = 0;
    let gap: ReturnType<typeof setTimeout> | undefined;
    let last = -1;
    const tick = (ts: number) => {
      raf = 0;
      if (last < 0 || ts - last >= FRAME_MS) {
        pebble.advance(last < 0 ? 0 : (ts - last) / 1000);
        last = ts;
        setView(pebble.view());
        if (pebble.shouldHold()) {
          setAwake(false);
          return;
        }
      }
      const wait = FRAME_MS - (performance.now() - last) - 12;
      if (wait > 4) {
        gap = setTimeout(() => {
          gap = undefined;
          raf = requestAnimationFrame(tick);
        }, wait);
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (gap !== undefined) clearTimeout(gap);
    };
  }, [pebble, mode]);

  // Coming into view, or becoming the animated pebble, wakes it for another HOLD_SECONDS.
  useEffect(() => {
    if (!visible || !active) return;
    pebble.touch();
    setAwake(true);
  }, [pebble, visible, active]);

  useEffect(() => {
    const sync = () => setPageVisible(!document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <div ref={ref} className={className} data-mode={mode} aria-hidden="true">
      <PebbleSvg frame={view.frame} motion={view.motion} still={view.still} pose="idle" />
    </div>
  );
}
