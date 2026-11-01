// S02 "Lives on your Mac" (EDIT_PLAN S02, Desktop world), 8 s nominal.
//
// Shot A (0–4.0 s): RS1-03. Opens tight on the sleeping pebble, sage filling the frame (the director match-cuts into
// it from S01's sage fill); the camera pulls out while the picture shrinks from full-bleed into a floating window
// (tilted only while it is revealed); push into the screen's lower right before the Spaces swipe and hold still while
// the Spaces move: the pebble is on the same spot on both. "It lives on your Mac." / "On every Space." Ends close on the
// pebble on Chrome's Space.
// Shot B (4.0–8.0 s): a cut on the downbeat to RS15-01, close on the pebble again (the match): the pointer, the click,
// the quick chat opens, "What can you do now?" typed (waits ramped), Return. "Click." / "Ask.". It leaves with the out
// half of a whip; S03 opens with the in half.
//
// Every frame shown is a real frame of the takes (time maps choose frames; nothing is drawn over Pebble's UI).
import { Sequence } from "remotion";
import type { Box } from "../../camera";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Stage } from "../../components/Stage";
import { eventS, roiOf, TAKES } from "../../data/takes";
import { useLayout } from "../../layout";
import { fromRamps, realTime } from "../../timeMap";
import { punchAt } from "../../timing";
import { Sfx } from "../../components/Sfx";
import { EASE } from "../../tokens";
import type { SceneProps } from "../types";
import { EdgeWhip, frameOf, lerp, lerpRect, ramp, sfxAt, sfxSrc, useSceneTime } from "./kit";

export const S02_NOMINAL = 8;

/* ---------- RS1-03: the Spaces swipe ---------- */

const A = TAKES["RS1-03"];
const A_SIZE = { w: A.width, h: A.height };
/** output 0 of shot A shows this source second (real time after it) */
const A_IN = 1.1;
const A_TIME = realTime(A_IN);
/** the whole poster without its black bars (x < 49, x > 2887 before the swipe): the blurred ground */
const A_POSTER: Box = { x: 49, y: 0, w: 2838, h: 1912 };
/** the pebble, filling the frame: sage-dominant for the match from S01 */
const A_TIGHT: Box = { x: 2752 - 110, y: 1613 - 62, w: 220, h: 124 };
/**
 * The swipe's framing (the takes lane's spaceRight, grown to the window): right of the poster's programme text
 * (x < 1640) and of the booking page's heading, address bar and dated kicker, so no text is sliced at the window's
 * edge. Both vases' feet and the pebble's spot are in it: the Space changes round a pebble that stays put.
 */
const A_WIDE = (aspect: number): Box => {
  const w = 1237;
  const h = Math.min(w / aspect, 1912);
  return { x: 1650, y: Math.min(1912 - h, 1843 - h), w, h };
};
const A_SWIPE_OUT = eventS("RS1-03", "swipeKey") - A_IN; // 2.867
const A_SETTLED_OUT = eventS("RS1-03", "pebbleSettled") - A_IN; // 3.333

/* ---------- RS15-01: click, ask ---------- */

const B = TAKES["RS15-01"];
const B_SIZE = { w: B.width, h: B.height };
const B_CLICK = eventS("RS15-01", "click");
const B_PANEL = eventS("RS15-01", "panelOpens");
const B_TYPE = eventS("RS15-01", "typeW");
const B_RETURN = eventS("RS15-01", "returnKey");
/** the pebble and the room above it where the quick chat opens: the match between the two shots */
const PEBBLE_MATCH: Box = roiOf("RS15-01", "pebbleArea");
/** the input box's left part, where the question is typed (≈ 2.5× in the feature window) */
const INPUT_TIGHT = (aspect: number): Box => ({ x: 2116, y: 1395 - 210 / aspect, w: 420, h: 420 / aspect });
/** the time map for shot B, anchored to the shot's END so a retime trims the sleeping pebble, never the Return */
const bTime = (shotS: number) => {
  const fixed = (3.85 - B_PANEL) / 2 + (8.25 - 3.85) / 2.7 + (8.9 - 8.25);
  const first = Math.max(0.55, shotS - fixed);
  const s0 = Math.max(0.4, 2.95 - first);
  return fromRamps(
    [
      { s0, s1: 2.95, speed: 1 }, // the pointer comes, the pebble watches it, the click (2.867); the pebble is already gone at f178 (2.967)
      { s0: B_PANEL, s1: 3.85, speed: 2 }, // a jump over the glitch frames (2.983–3.050); the panel is open
      { s0: 3.85, s1: 8.25, speed: 2.7 }, // the typing, ≈ 13 characters a second on screen
      { s0: 8.25, s1: 8.9, speed: 1 }, // Return (8.594), "Sending" (8.667)
    ],
    { ramp: 0.08, tail: 1 },
  );
};

const WHIP_S = 0.14;

/** Shot B's moments in the scene's seconds (for marks and the type). */
export const s02Moments = (lenS: number) => {
  const k = lenS / S02_NOMINAL;
  const cut = 4 * k;
  const m = bTime(lenS - cut);
  return {
    k,
    cut,
    swipe: A_SWIPE_OUT,
    click: cut + m.inv(B_CLICK),
    panel: cut + m.inv(B_PANEL),
    typing: cut + m.inv(B_TYPE),
    ret: cut + m.inv(B_RETURN),
    whip: lenS - WHIP_S,
  };
};

export const S02OnYourMac: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const F = frameOf(L);
  const { t, lenS, f } = useSceneTime(S02_NOMINAL, durationInFrames);
  const M = s02Moments(lenS);
  const cutF = f(M.cut);
  const aspect = F.media.w / F.media.h;

  /* shot A: the window grows out of full-bleed */
  const pA = ramp(t, 0.1, 0.95);
  const rectA = lerpRect({ x: 0, y: 0, w: L.W, h: L.H }, F.media, pA);
  const tiltA = Math.sin(Math.PI * pA);
  const keysA = [
    { t: 0, box: A_TIGHT },
    { t: 1.05, box: A_WIDE(aspect), dur: 0.95, ease: EASE.camera },
    // hold through the swipe (the camera still, the Spaces move), then close in on the pebble: the match into shot B
    { t: Math.max(A_SETTLED_OUT + 0.55, M.cut - 0.12), box: PEBBLE_MATCH, dur: 0.6 },
  ];

  /* shot B */
  const shotB = lenS - M.cut;
  const mapB = bTime(shotB);
  const tb = t - M.cut;
  const bType = mapB.inv(B_TYPE);
  const bPanel = mapB.inv(B_PANEL);
  const keysB = [
    { t: 0, box: PEBBLE_MATCH },
    // hold while the pointer comes, the click and the quick chat popping open; then push onto the input
    { t: bPanel + 0.08, box: PEBBLE_MATCH },
    { t: bPanel + 0.66, box: INPUT_TIGHT(aspect), dur: 0.58 },
  ];
  const size = L.type.title;
  const lineA = L.portrait ? "It lives on\nyour Mac." : "It lives on\nyour Mac.";
  const tvalign = L.portrait ? "bottom" : "middle";
  // "Click." over "Ask.": the text box's two halves (on 4:5, its lower part, close to the window)
  const half = (top: boolean) => {
    const r = F.text;
    const lh = L.type.headline * 1.02;
    const mid = L.portrait ? r.y + r.h - lh : r.y + r.h / 2;
    return top ? { x: r.x, y: r.y, w: r.w, h: mid - r.y } : { x: r.x, y: mid, w: r.w, h: r.y + r.h - mid };
  };

  return (
    <FontGate>
      <Sequence durationInFrames={cutF} name="A · RS1-03 Spaces">
        <Stage world="desktop" desktop={{ src: A.file, srcSize: A_SIZE, time: A_TIME, box: A_POSTER, dim: 0.82 }}>
          <FloatingWindow
            rect={rectA}
            radius={lerp(0, 22, pA)}
            enter="none"
            tilt={{ rx: 6 * tiltA, ry: -9 * tiltA }}
            rest={{ rx: 6 * tiltA, ry: -9 * tiltA }}
            shadow={pA}
            spill={0.5 * pA}
            background="#EFE8DC"
          >
            <ScreenZoom src={A.file} srcSize={A_SIZE} time={A_TIME} srcDuration={A.durationS} keys={keysA} drift={0.01} />
          </FloatingWindow>
          <Headline text={lineA} at={0.8} exitAt={A_SWIPE_OUT - 0.4} size={size} align="left" valign={tvalign} box={F.text} />
          <Headline text={"On every\nSpace."} at={A_SWIPE_OUT - 0.3} entrance="blur" size={size} align="left" valign={tvalign} box={F.text} />
        </Stage>
      </Sequence>
      <Sequence from={cutF} name="B · RS15-01 Click. Ask.">
        <EdgeWhip role="out" start={shotB - WHIP_S} dur={WHIP_S}>
          <Stage world="desktop" desktop={{ src: B.file, srcSize: B_SIZE, time: mapB, box: A_POSTER, dim: 0.82 }}>
            <FloatingWindow rect={F.media} enter="none" scale={punchAt([mapB.inv(B_CLICK), mapB.inv(B_RETURN)], tb, 0.025)} spill={0.5} background="#EFE8DC">
              <ScreenZoom src={B.file} srcSize={B_SIZE} time={mapB} srcDuration={B.durationS} keys={keysB} drift={0.012} />
            </FloatingWindow>
            <Headline text="Click." at={mapB.inv(B_CLICK) - 0.03} entrance="line" size={L.type.headline} align="left" valign="bottom" box={half(true)} />
            <Headline text="Ask." at={bType - 0.03} entrance="line" size={L.type.headline} align="left" valign="top" box={half(false)} />
          </Stage>
        </EdgeWhip>
      </Sequence>
      <Sfx src={sfxSrc("click")} at={sfxAt("click", M.click)} db={-14} />
    </FontGate>
  );
};
