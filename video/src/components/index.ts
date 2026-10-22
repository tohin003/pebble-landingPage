// The film's shared Remotion components (lane G1). Scenes import from here.
export { Camera, useCamera, type CameraProps, type CameraState } from "./Camera";
export { World, Place } from "./World";
export { Stage, roiPose, type StageProps } from "./Stage";
export { Desktop, MenuBar, DESKTOP, RIVERBED, MENUBAR_HEIGHT, type DesktopProps } from "./Desktop";
export { MacWindow, LIGHTS, windowShadow, type MacWindowProps } from "./MacWindow";
export { UiStill, uiStillSrc, uiStillSize, type UiStillProps, type UiFocus, type UiPress } from "./UiStill";
export { UiSequence, sequenceIndex, type UiSequenceProps } from "./UiSequence";
export { UI_STILLS, type UiStillName } from "./uiStills";
export { Cursor, clickAfterArrival, type CursorProps } from "./Cursor";
export { KineticText, landedAt, withAlpha, WORD_STEP_S, type KineticTextProps, type TextRole } from "./KineticText";
export { SageField, PaperField, SAGE_GLOWS, type Glow } from "./SageField";
export { ColourFlood, floodRadius, type ColourFloodProps } from "./ColourFlood";
export { easedStops, glow } from "./gradients";
export { Vignette, Grain } from "./Vignette";
export { CheckMark, Ring, type CheckMarkProps, type RingProps } from "./Annotation";
export { Wordmark, lockupGeometry, INTER, PEBBLE_WORD_EM, type LockupGeometry, type WordmarkProps } from "./Wordmark";
export { Slate } from "./Slate";
export { FACE_METRICS, topForBaseline, blockHeight } from "./textMetrics";
