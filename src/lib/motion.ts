// Motion tokens and the site-wide motion switch (docs/DESIGN.md §4, MASTER_PLAN §7.5).
//
// html[data-motion] is "on" or "paused". The inline <head> script (bootstrap.ts) sets it before first paint: "paused"
// when the visitor pressed Pause motion (stored here) or when the system asks for reduced motion, "on" otherwise. CSS
// animates only under [data-motion="on"]; the pebbles (src/components/pebble) read the same attribute. Pause motion
// can stop motion but never overrides the system's Reduce motion setting.
//
// Plain DOM code, no React: hooks.ts wraps it for components.

export const MOTION_KEY = "pebble-motion";
export const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/** Easing curves (CSS custom properties of the same names live in globals.css). */
export const ease = {
  /** entrances: fast start, long settle */
  enter: "cubic-bezier(0.16, 1, 0.3, 1)",
  /** presses and small state changes */
  firm: "cubic-bezier(0.23, 1, 0.32, 1)",
  /** things moving on screen */
  move: "cubic-bezier(0.45, 0, 0.55, 1)",
  /** exits */
  exit: "cubic-bezier(0.3, 0, 0.8, 0.15)",
} as const;

/** Durations in milliseconds (MASTER_PLAN §7.5: 180–600). */
export const duration = {
  press: 160,
  fast: 180,
  base: 240,
  crossfade: 300,
  reveal: 480,
  slow: 600,
} as const;

/** Springs for Motion (`motion` package) widgets; `pebble` is for the character only. */
export const spring = {
  calm: { type: "spring", stiffness: 130.5, damping: 22.85 },
  snappy: { type: "spring", stiffness: 322.3, damping: 32.31 },
  pebble: { type: "spring", stiffness: 157.9, damping: 16.34 },
} as const;

/**
 * What may move: "on" (everything allowed), "paused" (the visitor pressed Pause motion on this site) or "reduced" (the
 * system asks for reduced motion, which the site cannot override).
 */
export type MotionMode = "on" | "paused" | "reduced";

export function systemReducesMotion(): boolean {
  return window.matchMedia(REDUCED_QUERY).matches;
}

/** The visitor's stored Pause motion choice (false when none is stored or storage is blocked). */
export function storedPause(): boolean {
  try {
    return window.localStorage.getItem(MOTION_KEY) === "paused";
  } catch {
    return false;
  }
}

/** Set html[data-motion] from the stored choice and the system setting. */
export function applyMotion(): void {
  const value = storedPause() || systemReducesMotion() ? "paused" : "on";
  const root = document.documentElement;
  if (root.dataset.motion !== value) root.dataset.motion = value;
}

/** Pause motion on this site, or resume it, and remember the choice. */
export function setMotionPaused(paused: boolean): void {
  try {
    window.localStorage.setItem(MOTION_KEY, paused ? "paused" : "on");
  } catch {
    // Blocked storage: the choice lasts for this page view only. Keep it on the document instead.
    document.documentElement.dataset.motion = paused || systemReducesMotion() ? "paused" : "on";
    return;
  }
  applyMotion();
}

export function motionMode(): MotionMode {
  if (systemReducesMotion()) return "reduced";
  return document.documentElement.dataset.motion === "paused" ? "paused" : "on";
}

/** Calls `listener` when html[data-motion] or the system's reduced-motion setting changes. */
export function subscribeMotion(listener: () => void): () => void {
  const query = window.matchMedia(REDUCED_QUERY);
  const onSystem = () => {
    applyMotion();
    listener();
  };
  query.addEventListener("change", onSystem);
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-motion"] });
  return () => {
    query.removeEventListener("change", onSystem);
    observer.disconnect();
  };
}
