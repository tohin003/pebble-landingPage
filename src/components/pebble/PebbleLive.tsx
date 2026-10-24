"use client";
// The live pebble (MASTER_PLAN §4.2): Pebble's own engine, body sway and pointer gaze, at most 30 frames a second.
//
// - It starts on the static frame (PebbleStatic), so swapping it in after first paint moves nothing.
// - Its eyes follow a mouse or pen through one shared, passive document listener (pointer.ts); touch shows idle life.
// - Hover shows `hover`, a click or tap shows `tap` for 1.2 s (only over calm poses, as in the app); `tapPebble()`
//   from events.ts does the same from a button.
// - Only the most visible live pebble animates (usePebbleConductor); the others show a settled still frame.
// - It stops when the tab is hidden or it is off-screen, and settles to a still after HOLD_SECONDS (8 s) without input
//   on a calm pose (critic H4); pointer movement, scrolling it into view or a pose change wakes it.
// - Reduced motion or html[data-motion="paused"]: a settled still frame, no animation loop, no gaze.
// - At rest the eyes look straight ahead (rest.ts, DESIGN §9): from the first frame, when the pointer leaves, and when
//   the pebble settles (it turns back to centre, then holds).
// - `stealth` (Pebble 1.1.0's Veil, shared/pebble/veil.ts): flipping it plays the cast (1.25 s) or the release (0.65 s)
//   as the app does, with the colour coming or going at once; while on, the animated pebble shimmers once every 6 s,
//   and it never settles mid-cast or mid-shimmer. Reduced motion or Pause motion: a 0.3 s cross-fade and no
//   shimmer. A pebble that isn't the animated one shows the settled look at once, as in the app.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  LivePebble,
  LiveVeil,
  MAX_FPS,
  POSES,
  TAP_MS,
  type Gaze,
  type PebbleView,
  type PoseId,
  type VeilFrame,
  type VeilMotion,
} from "@pebble/index";
import { PEBBLE_TAP, PEBBLE_TAPPED, type PebbleEventDetail } from "./events";
import { PebbleSvg } from "./PebbleSvg";
import { followPointer } from "./pointer";
import { restFor } from "./rest";
import { useMotionAllowed, usePebbleConductor } from "./usePebbleConductor";

export interface PebbleLiveProps {
  /** the pose to show (default idle); hover and tap reactions show on top of calm poses */
  pose?: PoseId;
  /** where the eyes rest (default: straight ahead; null: the pose's own direction) */
  restGaze?: Gaze | null;
  /** width and height in px; without it the pebble fills its box (size it with CSS through className) */
  size?: number;
  /** hover and tap reactions (default true) */
  interactive?: boolean;
  /** the eyes follow the pointer (default true) */
  followPointer?: boolean;
  /** names this pebble in pebble:tap / pebble:tapped events (events.ts) */
  name?: string;
  /** Stealth Lockdown's Veil: on wears the dusk glass, and a flip plays the cast or release (absent: no Veil at all) */
  stealth?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** 30 fps, with half a millisecond of slack for timer jitter (Avatar.vue). */
const FRAME_MS = 1000 / MAX_FPS - 0.5;

type Mode = "animate" | "hold" | "still";

/** Hover and tap react only over calm poses (rows 16 and below in Pebble's priority table). */
function shownPose(base: PoseId, hovered: boolean, tapping: boolean): PoseId {
  if (POSES[base].row < 16) return base;
  if (tapping) return "tap";
  if (hovered) return "hover";
  return base;
}

export function PebbleLive({
  pose = "idle",
  restGaze,
  size,
  interactive = true,
  followPointer: follow = true,
  name,
  stealth,
  className,
  style,
}: PebbleLiveProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pebble] = useState(() => new LivePebble(pose, restFor(pose, restGaze)));
  const [view, setView] = useState<PebbleView>(() => pebble.still());
  const [veil] = useState(() => new LiveVeil(stealth ?? false));
  const [veilView, setVeilView] = useState<VeilFrame>(() => veil.frame("still"));
  const [veilFlips, setVeilFlips] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [tapping, setTapping] = useState(false);
  const [awake, setAwake] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const motionAllowed = useMotionAllowed();
  const { active, visible } = usePebbleConductor(ref, motionAllowed);
  const shown = shownPose(pose, interactive && hovered, interactive && tapping);

  // still: motion is off, or another pebble is the animated one. hold: keep the frame on screen and stop (hidden tab,
  // off-screen, or settled after HOLD_SECONDS). animate: the loop runs.
  const mode: Mode = !motionAllowed
    ? "still"
    : !visible || !pageVisible
      ? "hold"
      : !active
        ? "still"
        : awake
          ? "animate"
          : "hold";
  // The Veil plays on the animated pebble (paused where it stands while held), cross-fades under reduced or paused
  // motion, and shows its settled look on a pebble that another one outshines.
  const veilMotion: VeilMotion = !motionAllowed ? "reduced" : mode === "still" ? "still" : "animate";

  // The switch: start the cast or the release (LiveVeil.set). A held pebble animates again until it is over.
  useEffect(() => {
    if (stealth === undefined || !veil.set(stealth, veilMotion)) return;
    setVeilView(veil.frame(veilMotion));
    setVeilFlips((n) => n + 1);
    setAwake(true);
  }, [veil, stealth, veilMotion]);

  // How the Veil is drawn changed (motion paused or allowed, another pebble animated): a transition under way ends on
  // its settled look, as the app's still frames do.
  useEffect(() => {
    veil.settle();
    setVeilView(veil.frame(veilMotion));
  }, [veil, veilMotion]);

  // Reduced or paused motion: the Veil's 0.3 s cross-fade at up to 30 fps; nothing else moves.
  useEffect(() => {
    if (veilMotion !== "reduced" || !veil.moving("reduced")) return;
    let raf = 0;
    let last = -1;
    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      if (last >= 0 && ts - last < FRAME_MS) return;
      veil.advance(last < 0 ? 0 : (ts - last) / 1000);
      last = ts;
      setVeilView(veil.frame("reduced"));
      if (!veil.moving("reduced")) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [veil, veilMotion, veilFlips]);

  // Pose changes (from props, hover or tap).
  useEffect(() => {
    if (pebble.setPose(shown)) setAwake(true);
  }, [pebble, shown]);

  // A still pebble rests its eyes and shows the settled frame of its pose.
  useEffect(() => {
    if (mode !== "still") return;
    pebble.setGaze(null);
    setView(pebble.still());
  }, [pebble, mode, shown]);

  // The animation loop: requestAnimationFrame, capped at 30 fps, sleeping through the display frames it skips.
  useEffect(() => {
    if (mode !== "animate") return;
    let raf = 0;
    let gap: ReturnType<typeof setTimeout> | undefined;
    let last = -1;
    const tick = (ts: number) => {
      raf = 0;
      if (last < 0 || ts - last >= FRAME_MS) {
        const dt = last < 0 ? 0 : (ts - last) / 1000;
        pebble.advance(dt);
        veil.advance(dt);
        last = ts;
        setView(pebble.view());
        setVeilView(veil.frame("animate"));
        // settled: never mid-cast or mid-shimmer; turn the eyes back to rest first (a 0.24 s look morph), then hold
        if (pebble.shouldHold() && !veil.busy("animate") && !pebble.relax()) {
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
  }, [pebble, veil, mode]);

  // Pointer gaze, while this pebble is the animated one (awake or settled: a pointer move wakes it).
  const following = follow && motionAllowed && active && visible && pageVisible;
  useEffect(() => {
    if (!following) return;
    const stop = followPointer({
      element: () => ref.current,
      update: (gaze, moved) => {
        const changed = pebble.setGaze(gaze);
        if (changed || moved) {
          pebble.touch();
          setAwake(true);
        }
      },
    });
    return () => {
      stop();
      pebble.setGaze(null);
    };
  }, [pebble, following]);

  // Coming back into view, or becoming the animated pebble, wakes it for another HOLD_SECONDS.
  useEffect(() => {
    if (!visible || !active) return;
    pebble.touch();
    setAwake(true);
  }, [pebble, visible, active]);

  // The tab's visibility.
  useEffect(() => {
    const sync = () => {
      setPageVisible(!document.hidden);
      if (!document.hidden) {
        pebble.touch();
        setAwake(true);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [pebble]);

  // Taps: from the page (tapPebble) and on the pebble itself.
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tap = useCallback(() => {
    if (!interactive) return;
    setTapping(true);
    clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapping(false), TAP_MS);
    pebble.touch();
    setAwake(true);
  }, [interactive, pebble]);
  const reacts = active || (!motionAllowed && visible);
  useEffect(() => {
    const onTap = (e: Event) => {
      const target = (e as CustomEvent<PebbleEventDetail>).detail?.name;
      if (target ? target === name : reacts) tap();
    };
    document.addEventListener(PEBBLE_TAP, onTap);
    return () => document.removeEventListener(PEBBLE_TAP, onTap);
  }, [name, reacts, tap]);
  useEffect(() => () => clearTimeout(tapTimer.current), []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={className}
      data-mode={mode}
      style={{ width: size, height: size, cursor: interactive ? "pointer" : undefined, ...style }}
      onPointerEnter={(e) => {
        if (interactive && e.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onClick={() => {
        if (!interactive) return;
        tap();
        document.dispatchEvent(new CustomEvent<PebbleEventDetail>(PEBBLE_TAPPED, { detail: { name } }));
      }}
    >
      <PebbleSvg
        frame={view.frame}
        motion={view.motion}
        still={view.still}
        pose={shown}
        veil={stealth === undefined ? undefined : veilView}
        renderedSize={size}
      />
    </div>
  );
}

export default PebbleLive;
