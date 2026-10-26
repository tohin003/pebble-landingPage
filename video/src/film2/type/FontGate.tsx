// <FontGate>: holds the render until the film's faces have loaded, then mounts its children (TOOLS_TESTS §2.4: SplitText
// must split after the font has loaded, or render tabs split different lines). ../fonts registers the same woff2
// files as the site with @remotion/fonts (no network); this gate waits for the exact faces and weights in use.
import { useEffect, useState, type ReactNode } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import "../../fonts";

const FACES = ['350 64px "Fraunces"', '400 48px "Inter"', '500 48px "Inter"', '400 48px "Geist Mono"'];

export const FontGate: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [handle] = useState(() => delayRender("film2: fonts for SplitText", { timeoutInMilliseconds: 30000 }));
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
