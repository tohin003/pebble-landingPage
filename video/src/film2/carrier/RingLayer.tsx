// <RingLayer>: draws the ring carrier's hairlines in frame space (carrier/ring.ts has the geometry).
//
// Put one <RingLayer layer="ground"> between the ground and the windows (rings behind the UI, the default) and, only
// where a ring must be an iris edge (the Drop's burst), one <RingLayer layer="front"> above the windows. The hairline
// keeps its width whatever the camera does: 1.5–2 px at 1080 px on the frame's short side.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { worldToFrame, type Pose } from "../motion/camera";
import { radiusToCorners, type Point } from "../motion/geometry";
import { allRingStates, ringColor, type RingLayer as Layer, type RingSpec } from "./ring";

export interface RingLayerProps {
  specs: readonly RingSpec[];
  /** the camera pose of the plane the rings live on (the UI plane, depth 1), for this frame */
  pose: Pose;
  layer: Layer;
  /** frame offset to add before evaluating the specs (for a layer inside a <Sequence from={n}>: pass n) */
  offset?: number;
}

/** The world radius from `c` to the frame's farthest corner under `pose` (resolves a burst to "edge"). */
export const edgeRadiusFor =
  (poseAt: (frame: number) => Pose, w: number, h: number) =>
  (frame: number, c: Point): number => {
    const pose = poseAt(frame);
    return radiusToCorners(worldToFrame(c, pose, w, h), w, h) / pose.zoom;
  };

export const RingLayer: React.FC<RingLayerProps & { poseAt?: (frame: number) => Pose }> = ({ specs, pose, layer, offset = 0, poseAt }) => {
  const frame = useCurrentFrame() + offset;
  const { width, height, fps } = useVideoConfig();
  const short = Math.min(width, height);
  const edge = poseAt ? edgeRadiusFor(poseAt, width, height) : undefined;
  const rings = allRingStates(specs, frame, fps, edge).filter((r) => r.layer === layer && r.opacity > 0.002);
  if (rings.length === 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {rings.map((r) => {
          const c = worldToFrame(r.c, pose, width, height);
          const R = r.r * pose.zoom;
          return (
            <circle
              key={`${r.id}-${r.echo}`}
              cx={c.x}
              cy={c.y}
              r={Math.max(0.5, R)}
              fill="none"
              stroke={ringColor(r.tone)}
              strokeWidth={(r.widthPx * short) / 1080}
              opacity={r.opacity}
              shapeRendering="geometricPrecision"
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
