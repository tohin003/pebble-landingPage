// The launch film's motion system in one import: `import { Stage, Headline, ScreenZoom } from "../../components";`
// The handoff (.work/handoffs/launch-foundation.md) documents every component's props with an example.
export { BarCompare, type BarCompareProps, type BarRow } from "./BarCompare";
export { Device, type DeviceProps } from "./Device";
export { FloatingWindow, WindowSizeContext, useWindowSize, type FloatingWindowProps, type Tilt } from "./FloatingWindow";
export { FontGate } from "./FontGate";
export { Grain } from "./Grain";
export {
  Headline,
  Label,
  fitSize,
  parseMarkup,
  plainText,
  textWidth,
  type AccentFace,
  type Entrance,
  type Exit,
  type HeadlineProps,
  type LabelProps,
  type TextVariant,
} from "./Headline";
export {
  PebbleActor,
  VeilPebble,
  blinksIn,
  bodyCentreAbove,
  cues,
  look,
  lookBack,
  pose,
  sleepy,
  wake,
  type ActorEnter,
  type PebbleActorProps,
  type VeilPebbleProps,
} from "./PebbleActor";
export { ScreenZoom, type ScreenZoomProps } from "./ScreenZoom";
export { Sfx, SfxTrack, dbToGain, type SfxCue } from "./Sfx";
export { Stage, type DesktopGround, type StageLight, type StageProps } from "./Stage";
export {
  OnBeat,
  PebbleWipeLayer,
  ScaleThroughLayer,
  SoftWipeLayer,
  WhipLayer,
  pebblePath,
  pebbleWipe,
  scaleThrough,
  softWipe,
  whip,
  type PebbleWipeProps,
  type ScaleThroughProps,
  type SoftWipeProps,
  type WhipProps,
} from "./transitions";
