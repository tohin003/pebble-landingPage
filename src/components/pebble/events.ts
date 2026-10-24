// Page-wide pebble events. Plain DOM events, so any component (a "Say hi to Pebble" button, the install pill's copy
// button, the hero's speech bubble) can talk to the live pebbles without importing the engine or passing functions
// across the server/client boundary.

/** Ask a pebble to do its `tap` reaction (Pebble's "heureux" face for 1.2 s). */
export const PEBBLE_TAP = "pebble:tap";
/** A person tapped or clicked a pebble itself. */
export const PEBBLE_TAPPED = "pebble:tapped";

/**
 * Whether a live pebble is on screen: the pebble conductor (usePebbleConductor.ts, in the engine's lazy chunk) keeps
 * this attribute on <html> while it has elected a pebble to animate, and fires PEBBLE_LIVE on <document> when that
 * changes. The loops (LoopVideo.tsx, in the main bundle) read it without importing the engine: nothing else plays on its
 * own beside a living pebble (PHILOSOPHY principle 1, critic C08).
 */
export const LIVE_PEBBLE = "data-live-pebble";
export const PEBBLE_LIVE = "pebble:live";

export interface PebbleEventDetail {
  /** the `name` prop of the pebble; empty for "whichever pebble is animating" */
  name?: string;
}

/** Make a pebble tap: the named one, or else the one that is animating (or visible, with motion paused). */
export function tapPebble(name?: string): void {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent<PebbleEventDetail>(PEBBLE_TAP, { detail: { name } }));
}

/** Listen for people tapping a pebble (all pebbles, or the one called `name`). Returns the unsubscribe function. */
export function onPebbleTapped(listener: (detail: PebbleEventDetail) => void, name?: string): () => void {
  if (typeof document === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<PebbleEventDetail>).detail ?? {};
    if (!name || detail.name === name) listener(detail);
  };
  document.addEventListener(PEBBLE_TAPPED, handler);
  return () => document.removeEventListener(PEBBLE_TAPPED, handler);
}
