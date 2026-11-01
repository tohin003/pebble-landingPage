// A slate for a scene that isn't registered yet, so the film always renders end to end. It reads as a slate (the
// scene's id, its slot and "not built yet"), never as a frame of the film.
import { AbsoluteFill, useVideoConfig } from "remotion";
import { Headline, Label, Stage } from "../components";
import { useLayout } from "../layout";
import type { Slot } from "./timeline";

export const Placeholder: React.FC<{ slot: Slot }> = ({ slot }) => {
  const L = useLayout();
  const { fps } = useVideoConfig();
  void fps;
  const world = slot.worldIn === "daylight" ? "daylight" : "night";
  const box = { x: L.content.x, y: L.H * 0.36, w: L.content.w, h: L.type.title * 1.2 };
  return (
    <AbsoluteFill>
      <Stage world={world} drift>
        <Headline text={slot.id} at={-1} variant="title" size={L.type.title * 0.8} box={box} align="center" valign="middle" />
        <Label
          text={`placeholder: not built yet, ${slot.in.toFixed(3)}–${slot.out.toFixed(3)} s`}
          x={L.W / 2}
          y={box.y + box.h + L.px(40)}
          align="center"
          valign="top"
          size={L.type.label}
          at={-1}
        />
      </Stage>
    </AbsoluteFill>
  );
};
