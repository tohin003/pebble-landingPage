"use client";
// Shows its children (the server-rendered PebbleStatic) first, then, when the browser is idle after first paint, loads
// PebbleLive in its own chunk and swaps it in. The static SVG stays on screen while the chunk loads (it is the Suspense
// fallback), and PebbleLive starts on that same frame, so nothing moves or blinks at the swap. Only this small file is
// in the page's main bundle; the engine arrives with PebbleLive.
import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import type { PebbleLiveProps } from "./PebbleLive";

const PebbleLive = lazy(() => import("./PebbleLive"));

export function PebbleLiveSlot({ children, ...props }: PebbleLiveProps & { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // requestIdleCallback where it exists (Safari has none): load after first paint without competing with it
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(id);
  }, []);
  if (!ready) return <>{children}</>;
  return (
    <Suspense fallback={children}>
      <PebbleLive {...props} />
    </Suspense>
  );
}
