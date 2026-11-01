// <FontGate>: holds the render until the film's faces are loaded, then mounts its children. Headline measures its words
// (fit to width, the accent's metrics), so it must never measure a fallback face. ../../fonts registers the repo's
// woff2 files with @remotion/fonts (local files, no network); this gate waits for the exact faces and weights in use.
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

export const FontGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender("launch: fonts", { timeoutInMilliseconds: 30000 }));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    Promise.all(FACES.map((f) => document.fonts.load(f)))
      .then(() => document.fonts.ready)
      .then(() => {
        if (live) setReady(true);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
    return () => {
      live = false;
    };
  }, [handle]);
  return ready ? <>{children}</> : null;
};
