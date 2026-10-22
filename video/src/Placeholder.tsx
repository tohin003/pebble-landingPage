import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT, FRAUNCES_AXES } from "./fonts";
import { COLOR, EASE, SPRING, TYPE } from "./motion/spec";

// Phase 0 toolchain check: fonts, the motion spec and a spring. Not part of any film.
export const Placeholder: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const enter = spring({ frame, fps, config: SPRING.calm });
  const fade = interpolate(frame, [0, 18], [0, 1], { easing: EASE.enter, extrapolateRight: "clamp" });
  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLOR.ground,
        color: COLOR.ink,
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
        padding: `${TYPE.safe.y}px ${TYPE.safe.x}px`,
        opacity: fade,
        transform: `translateY(${(1 - enter) * 24}px)`,
      }}
    >
      <div style={{ fontFamily: FONT.display, fontSize: 220, fontWeight: 440, fontVariationSettings: FRAUNCES_AXES, letterSpacing: TYPE.hero.tracking, lineHeight: TYPE.hero.leading }}>
        Pebble
      </div>
      <div style={{ display: "flex", gap: 96, fontFamily: FONT.display, fontSize: 112, fontWeight: 650 }}>
        <span style={{ fontVariationSettings: '"SOFT" 0, "WONK" 0' }}>SOFT 0</span>
        <span style={{ fontVariationSettings: FRAUNCES_AXES, color: COLOR.accent }}>SOFT 100</span>
      </div>
      <div style={{ fontFamily: FONT.sans, fontSize: 56, fontWeight: 450, color: COLOR.secondary }}>
        Placeholder composition, {width} × {height} at {fps} fps
      </div>
      <div style={{ fontFamily: FONT.mono, fontSize: 40, color: COLOR.secondary }}>
        frame {frame} of {durationInFrames}
      </div>
    </AbsoluteFill>
  );
};
