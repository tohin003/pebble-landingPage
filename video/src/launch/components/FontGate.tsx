// <FontGate>: holds the render until the film's faces are loaded, then mounts its children. Headline measures its words
// (fit to width, the accent's metrics), so it must never measure a fallback face. ../../fonts registers the repo's
// woff2 files with @remotion/fonts (local files, no network); this gate waits for the exact faces and weights in use.
//
// The director (1 Nov, the 4:5 draft): the first version always started "not ready" and rendered nothing, then called
// continueRender in the same tick as setReady(true), so Remotion could take the frame before React committed the
// children: every new mount of a scene (a seam's frozen head or tail) drew one blank, pure-black frame. Now a gate
// whose faces are already loaded (every mount after the page's first) renders at once, with no delay; and on a first
// load the frame is released only after the ready state has committed.
import { useEffect, useState, type ReactNode } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import "../../fonts";
import { FONT } from "../../fonts";

const FACES = [
  `680 100px "${FONT.sans}"`,
  `460 100px "${FONT.sans}"`,
  `440 100px "${FONT.display}"`,
  `500 40px "${FONT.mono}"`,
  `400 40px "${FONT.mono}"`,
];

const facesLoaded = (): boolean => {
  if (typeof document === "undefined" || !document.fonts) return false;
  try {
    return FACES.every((f) => document.fonts.check(f));
  } catch {
    return false;
  }
};

export const FontGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(facesLoaded);
  // a delay only when the faces still have to load (the initialisers run in order on the first render)
  const [handle] = useState<number | null>(() => (ready ? null : delayRender("launch: fonts", { timeoutInMilliseconds: 30000 })));

  useEffect(() => {
    if (handle === null) return;
    let live = true;
    Promise.all(FACES.map((f) => document.fonts.load(f)))
      .then(() => document.fonts.ready)
      .then(() => {
        if (live) setReady(true);
        else continueRender(handle); // unmounted before it was ready: release the frame anyway
      })
      .catch((e) => cancelRender(e));
    return () => {
      live = false;
    };
  }, [handle]);

  // released after the commit that shows the children, never before
  useEffect(() => {
    if (ready && handle !== null) continueRender(handle);
  }, [ready, handle]);

  return ready ? <>{children}</> : null;
};
