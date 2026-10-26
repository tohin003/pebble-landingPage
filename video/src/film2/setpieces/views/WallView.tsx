// <WallCells>: the wall's cells (setpieces/wall.ts) on their rings, orbiting, and converging into the stone: each a
// flat plane of a published capture's thumbnail (PLACEHOLDERS for the 2.0.0 loops, which will play at 1×). Drawn inside
// the foreground <World3D>; every position comes from cellAt(), which the checks read too.
import { Img, staticFile, useVideoConfig } from "remotion";
import { Plane } from "../../camera/World3D";
import { cellAt, type WallSpec } from "../wall";

export const WallCells: React.FC<{ spec: WallSpec; frame: number }> = ({ spec, frame }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {spec.cells.map((cell) => {
        const at = cellAt(cell, spec, frame, fps);
        if (at.opacity <= 0.002 || at.rect.w < 0.5) return null;
        return (
          <Plane key={cell.id} kind="pebble" rect={at.rect} depth={at.depth} opacity={at.opacity} radius={Math.max(2, at.rect.w * 0.02)} shadow={at.rect.w > 60}>
            <Img src={staticFile(cell.src)} style={{ position: "absolute", left: 0, top: 0, width: at.rect.w, height: at.rect.h, maxWidth: "none" }} />
          </Plane>
        );
      })}
    </>
  );
};
