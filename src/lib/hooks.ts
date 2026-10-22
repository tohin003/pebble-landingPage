"use client";
// React hooks over the document state that the inline <head> script sets (bootstrap.ts). Each returns null during
// server rendering and hydration (the server can't know the visitor's theme, motion setting or platform), then the
// real value right after: useSyncExternalStore re-renders without a hydration mismatch. Labels that depend on these
// values therefore start neutral; anything visual should switch in CSS on the html[data-*] attributes instead.

import { useSyncExternalStore } from "react";
import { motionMode, subscribeMotion, type MotionMode } from "./motion";
import { currentPlatform, type Platform } from "./platform";
import { currentTheme, subscribeTheme, type Theme } from "./theme";

const none = () => () => {};
const serverNull = () => null;

export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribeTheme, currentTheme, serverNull);
}

/** "on", "paused" (Pause motion on this site) or "reduced" (the system setting); null before hydration. */
export function useMotionMode(): MotionMode | null {
  return useSyncExternalStore(subscribeMotion, motionMode, serverNull);
}

/** true only after hydration, when motion is allowed. Treat null as "not yet": render the still state. */
export function useMotionAllowed(): boolean {
  return useMotionMode() === "on";
}

export function usePlatform(): Platform | null {
  return useSyncExternalStore(none, currentPlatform, serverNull);
}
