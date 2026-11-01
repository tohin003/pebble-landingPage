// S03 "Uses your Mac" (EDIT_PLAN S03, Desktop world, the burst), 12 s nominal.
//
// 0.0   Act card "Now it can use your Mac." over a soft blur of the desktop (the in half of S02's whip lands on it).
// 1.5   RS4-07 (hard cut on the beat): the window card "Use Calculator" and its Allow; a jump to Calculator brought
//       forward, the wait ramped ×20; the eight real key presses (×2.2); "=" → 600 with a punch-in. "Your apps."
// 5.5   RS5C-04 (hard cut): the app-action card and its "Do it"; a jump to Calendar with "Glaze order 09:00" on
//       Monday 2; a push onto the event (the personal iCloud events are blurred in place). "Your calendar."
// 8.5   RS9B-02 (hard cut): the "Use youtube.com" approval card and its Allow; a jump to the pill "Pebble is working
//       in this tab · Stop" (the page, its tab and its video stay out of frame: the owner removed the rival beat).
//       "Your browser." then the limit "Only the windows and sites you allow."
// last 0.5 s  The window shrinks to S04's opening card (centred, 60 % of the width, 1.6:1) while a soft wipe carries
//       the ground from the desktop into Daylight.
//
// Every frame inside a window is a real frame of a take (time maps choose frames; nothing is drawn on Pebble's UI
// except blurs over hazards). Shot boundaries scale with the scene's length; inside a shot the slack is in the hold.
import { AbsoluteFill, Sequence } from "remotion";
import type { Box } from "../../camera";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { Stage } from "../../components/Stage";
import { SoftWipeLayer } from "../../components/transitions";
import { eventS, roiOf, TAKES } from "../../data/takes";
import { useLayout, type Layout, type Rect } from "../../layout";
import { fromRamps } from "../../timeMap";
import { punchAt } from "../../timing";
import type { SceneProps } from "../types";
import { blurOverlay, EdgeWhip, frameOf, lerp, lerpRect, ramp, seamCard, sfxAt, sfxSrc, useSceneTime, type SfxNote } from "./kit";

export const S03_NOMINAL = 12;

/** shot starts at nominal length (scaled by the retime factor) */
const AT = { apps: 1.5, calendar: 5.5, browser: 8.5 } as const;
const SHRINK_S = 0.5;
const WHIP_IN_S = 0.14;

/* ---------- RS4-07: your apps ---------- */

const CALC = TAKES["RS4-07"];
const CALC_SIZE = { w: CALC.width, h: CALC.height };
const KEYS = ["key4", "key8", "keyTimes", "key1", "key2", "keyPoint", "key5", "equals600"].map((n) => eventS("RS4-07", n));
const EQUALS = eventS("RS4-07", "equals600");
const ALLOW_CALC = eventS("RS4-07", "allowPressed");
const CALC_FORWARD = eventS("RS4-07", "calculatorForward");
const calcTime = fromRamps(
  [
    { s0: 38.75, s1: 39.72, speed: 1 }, // the pointer settles on Allow, pressed at 39.633
    { s0: CALC_FORWARD, s1: 52.68, speed: 20 }, // jump: Calculator forward, display 0, the companion's "On it" counting
    { s0: 52.68, s1: 56.45, speed: 2.2 }, // the eight presses, ≈ 4.7 a second on screen
    { s0: 56.45, s1: 56.8, speed: 1 }, // "600"
  ],
  { ramp: 0.1, tail: 1 },
);
/** the card's end: "Only this window. Pebble stops at sign-ins, codes and checks…", Don't allow, Allow */
const CALC_CARD = roiOf("RS4-07", "allowCard");
/** the whole display, four key rows, the companion pebble working beside it (≈ 1.8×) */
const CALC_TOP = roiOf("RS4-07", "calculatorTop");
/**
 * "48×12.5" over "600", the AC and 7 8 9 rows: the bottom edge falls in the gap between the 7 8 9 and 4 5 6 rows
 * (y ≈ 764), so the crop never slices a key; the Calculator window's sides are inside it.
 */
export const CALC_DISPLAY = (aspect: number): Box => {
  const h = 464;
  const w = h * aspect;
  return { x: 801 - w / 2, y: 300, w, h };
};

/* ---------- RS5C-04: your calendar ---------- */

const CAL = TAKES["RS5C-04"];
const CAL_SIZE = { w: CAL.width, h: CAL.height };
const DO_IT = eventS("RS5C-04", "doItPressed");
const CAL_ARRIVES = 101.19;
const calTime = fromRamps(
  [
    { s0: 47.95, s1: 48.62, speed: 1 }, // the pointer on Do it, pressed at 48.55
    { s0: CAL_ARRIVES, s1: 103.1, speed: 1 }, // jump: Calendar forward with "Glaze order 09:00" on Monday 2
  ],
  { ramp: 0.1, tail: 1 },
);
const CAL_DOIT = roiOf("RS5C-04", "doIt");
/** the month (its taller framing): October 2026 down to Monday 2's row */
const CAL_MONTH = (tall: boolean): Box => {
  const r = roiOf("RS5C-04", "calendarMonth");
  return tall && r.tall ? r.tall : r;
};
/**
 * Monday 2's cell from the Calendar window's left edge (x 395, so no Pebble sidebar text is sliced), the Dock
 * tooltip "Calendar" whole (an accepted hazard), above the Dock's dated Calendar icon (y ≥ 1190) (≈ 2.1×)
 */
const CAL_EVENT: Box = { x: 395, y: 826, w: 510, h: 364 };
const CAL_EVENT_TALL: Box = { x: 395, y: 772, w: 510, h: 418 };
/** the person's own iCloud events in the month view: blurred in place */
const PERSONAL = CAL.hazards.find((h) => h.kind === "identity")!;

/* ---------- RS9B-02: your browser ---------- */

const WEB = TAKES["RS9B-02"];
const WEB_SIZE = { w: WEB.width, h: WEB.height };
const PILL_LAST_CLEAN = 55.867; // f3352: suggestions load round the pill from f3354
const webTime = fromRamps(
  [
    { s0: 47.6, s1: 48.567, speed: 1 }, // the card and its Allow (the last frame with the card is f2914)
    { s0: 54.767, s1: PILL_LAST_CLEAN, speed: 0.6 }, // jump: Chrome in place, the pill (only the empty sidebar round it)
  ],
  { ramp: 0.1, tail: 0 },
);
/** "Use youtube.com … Details, Deny, Allow": clean only at 16:9 or wider (the URL line above, a stale card below) */
const WEB_CARD = roiOf("RS9B-02", "browserCard");
/** "● Pebble is working in this tab · Stop" on the empty sidebar; right of the player (x ≥ 1344), so no advert shows */
const WEB_PILL: Box = { x: 1488, y: 1017, w: 560, h: 315 };

/** the scene's moments in its own seconds, for marks and SFX */
export const s03Moments = (lenS: number) => {
  const k = lenS / S03_NOMINAL;
  const apps = AT.apps * k;
  const calendar = AT.calendar * k;
  const browser = AT.browser * k;
  return {
    k,
    apps,
    calendar,
    browser,
    shrink: lenS - SHRINK_S,
    allowCalc: apps + calcTime.inv(ALLOW_CALC),
    calcForward: apps + calcTime.inv(CALC_FORWARD),
    keys: KEYS.map((s) => apps + calcTime.inv(s)),
    equals: apps + calcTime.inv(EQUALS),
    doIt: calendar + calTime.inv(DO_IT),
    calendarForward: calendar + calTime.inv(CAL_ARRIVES),
    webAllow: browser + webTime.inv(48.567) + 1 / 60,
    pill: browser + webTime.inv(54.767),
    limit: browser + webTime.inv(54.767) + 0.45,
  };
};

/** the window for each shot: the feature window, or a 16:9 one where a take has no clean taller framing */
const wideRect = (L: Layout): Rect => {
  const m = frameOf(L).media;
  const h = m.w / (16 / 9);
  return { x: m.x, y: m.y + (m.h - h) / 2, w: m.w, h };
};

export const S03_SFX = (lenS: number): SfxNote[] => {
  const M = s03Moments(lenS);
  const taps = ["keyA", "keyB", "keyC"] as const;
  return [
    { name: "click", s: M.allowCalc, db: -15, what: "Allow (Use Calculator)" },
    ...M.keys.slice(0, 7).map((s, i): SfxNote => ({ name: taps[i % 3], s, db: -13, what: `Calculator key ${i + 1} of 8` })),
    { name: "keyA", s: M.equals, db: -12, what: "Calculator = (600)" },
    { name: "shimmer", s: M.equals, db: -17, what: "600" },
    { name: "clickB", s: M.doIt, db: -15, what: "Do it (Calendar)" },
    { name: "click", s: M.webAllow, db: -15, what: "Allow (youtube.com card)" },
  ];
};

export const S03UsesYourMac: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const F = frameOf(L);
  const { t, lenS, f } = useSceneTime(S03_NOMINAL, durationInFrames);
  const M = s03Moments(lenS);
  const aspect = F.media.w / F.media.h;
  const tall = aspect < 1.6;
  const tvalign = L.portrait ? "bottom" : "middle";
  const size = L.type.headline;

  /* act card */
  const actEnd = f(M.apps);

  /* apps */
  const ta = t - M.apps;
  const aEq = calcTime.inv(EQUALS);
  const keysApps = [
    { t: 0, box: CALC_CARD },
    { t: calcTime.inv(CALC_FORWARD), box: CALC_TOP, dur: 0 },
    // "600" lands with a 5 % punch-in on this framing; at nominal there are only ≈ 0.85 s left in the shot, too
    // little for a push to land and hold (CALC_DISPLAY is the push if the director lengthens the shot)
  ];

  /* calendar */
  const tc = t - M.calendar;
  const cArr = calTime.inv(CAL_ARRIVES);
  const keysCal = [
    { t: 0, box: CAL_DOIT },
    { t: cArr, box: CAL_MONTH(tall), dur: 0 },
    { t: cArr + 0.3, box: CAL_MONTH(tall) },
    { t: cArr + 0.95, box: tall ? CAL_EVENT_TALL : CAL_EVENT, dur: 0.65 },
  ];
  const calBlur = blurOverlay([{ box: PERSONAL.box, s0: PERSONAL.s0, s1: PERSONAL.s1, px: 22 }], calTime);

  /* browser, then the shrink into S04's card */
  const tw = t - M.browser;
  const wPill = webTime.inv(54.767);
  const keysWeb = [
    { t: 0, box: WEB_CARD },
    { t: wPill, box: WEB_PILL, dur: 0 },
  ];
  const pS = ramp(t, M.shrink, SHRINK_S);
  const webRect = lerpRect(wideRect(L), seamCard(L), pS);
  const limitAt = M.limit - M.browser;
  const textOut = M.shrink - M.browser - 0.05;

  const sfx = S03_SFX(lenS);

  return (
    <FontGate>
      {/* the act card over a soft blur of the desktop (RS4-07's own workspace, just before its Allow) */}
      <Sequence durationInFrames={actEnd} name="act · Now it can use your Mac.">
        <EdgeWhip role="in" start={0} dur={WHIP_IN_S}>
          <Stage world="desktop" desktop={{ src: CALC.file, srcSize: CALC_SIZE, srcStart: 37.6, box: roiOf("RS4-07", "workspace"), blur: 40, dim: 0.62 }}>
            <Headline
              text={L.portrait ? "Now it can\nuse your Mac." : "Now it can\nuse your Mac."}
              at={0.06}
              entrance="line"
              size={L.type.hero}
              align="center"
              valign="middle"
              box={L.content}
            />
          </Stage>
        </EdgeWhip>
      </Sequence>

      <Sequence from={actEnd} durationInFrames={f(M.calendar) - actEnd} name="apps · RS4-07 Calculator">
        <Stage world="desktop" desktop={{ src: CALC.file, srcSize: CALC_SIZE, time: calcTime, box: roiOf("RS4-07", "workspace"), dim: 0.62 }}>
          <FloatingWindow rect={F.media} enter="none" spill={0.5} scale={punchAt([aEq], ta, 0.05, 0.03, 0.3)}>
            <ScreenZoom src={CALC.file} srcSize={CALC_SIZE} time={calcTime} srcDuration={CALC.durationS} keys={keysApps} drift={0.012} />
          </FloatingWindow>
          <Headline text="Your apps." at={0.06} entrance="line" size={size} align="left" valign={tvalign} box={F.text} />
        </Stage>
      </Sequence>

      <Sequence from={f(M.calendar)} durationInFrames={f(M.browser) - f(M.calendar)} name="calendar · RS5C-04 Glaze order">
        <Stage world="desktop" desktop={{ src: CAL.file, srcSize: CAL_SIZE, time: calTime, box: roiOf("RS5C-04", "calendarMonth"), dim: 0.62 }}>
          <FloatingWindow rect={F.media} enter="none" spill={0.5} scale={punchAt([cArr], tc, 0.03)}>
            <ScreenZoom src={CAL.file} srcSize={CAL_SIZE} time={calTime} srcDuration={CAL.durationS} keys={keysCal} drift={0.012} overlay={calBlur} />
          </FloatingWindow>
          <Headline text="Your calendar." at={0.06} entrance="blur" size={size} align="left" valign={tvalign} box={F.text} />
        </Stage>
      </Sequence>

      <Sequence from={f(M.browser)} name="browser · RS9B-02 approval and pill">
        <Stage world="desktop" desktop={{ src: WEB.file, srcSize: WEB_SIZE, time: webTime, box: WEB_CARD, dim: 0.66, blur: 40 }}>
          {/* the shrink: the ground turns to Daylight under the card (a soft wipe, never a cut between worlds) */}
          {pS > 0 && (
            <SoftWipeLayer progress={pS} role="in" direction="down" feather={0.5}>
              <Stage world="daylight" drift={false} />
            </SoftWipeLayer>
          )}
          <FloatingWindow rect={webRect} enter="none" spill={0.5 * (1 - pS)} scale={punchAt([wPill], tw, 0.03)} shadow={lerp(1, 1.1, pS)}>
            <ScreenZoom src={WEB.file} srcSize={WEB_SIZE} time={webTime} srcDuration={WEB.durationS} keys={keysWeb} drift={0.012} />
          </FloatingWindow>
          <Headline text="Your browser." at={0.06} exitAt={limitAt - 0.12} exit="fade" entrance="ink" size={size} align="left" valign={tvalign} box={F.text} />
          <Headline
            text={L.portrait ? "The app windows and\nwebsites you allow." : "The app windows\nand websites\nyou allow."}
            at={limitAt}
            exitAt={textOut}
            exit="fade"
            size={L.portrait ? L.type.title * 0.72 : L.type.title * 0.78}
            align="left"
            valign={tvalign}
            box={F.text}
          />
        </Stage>
      </Sequence>

      <AbsoluteFill>
        {sfx.map((c) => (
          <Sfx key={`${c.name}-${c.s.toFixed(3)}`} src={sfxSrc(c.name)} at={sfxAt(c.name, c.s)} db={c.db} />
        ))}
      </AbsoluteFill>
    </FontGate>
  );
};
