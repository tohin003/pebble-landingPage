// Renders the riverbed wallpaper (video/public/desktop/riverbed-light.svg, comp 2's art without its baked vignette) as
// one large still, so the film draws a raster instead of re-rasterising the SVG's feTurbulence grain at every zoom:
//   cd video && ../scripts/heavy.sh riverbed npx remotion still src/index.ts RiverbedPlate public/desktop/riverbed-light@3x.png
// 4800 × 3000 = 3 px per world point of the 1600 × 1000 desktop: crisp up to a zoom of 3 (the hook's close-up is 2.35).
// The raster is gitignored (video/public/desktop/.gitignore); this still is how it is rebuilt.
import { AbsoluteFill, Img, staticFile, useVideoConfig } from "remotion";
import { RIVERBED } from "../components";

export const RIVERBED_PLATE = { width: 4800, height: 3000 } as const;

export const RiverbedPlate: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: RIVERBED.ground.g1 }}>
      <Img src={staticFile(RIVERBED.svg)} style={{ width, height, display: "block" }} />
    </AbsoluteFill>
  );
};
