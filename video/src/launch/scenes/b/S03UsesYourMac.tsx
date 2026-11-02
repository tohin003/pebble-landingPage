// S03 "Uses your Mac" (Desktop world, the burst), 11 s nominal (FIXES-1: 20.051–31.051 on the master; its bars fall
// every 2.0 s from the start).
//
// 0.0   "Now it can use your Mac.": the answer to S02's question, landing out of the whip (blurred, from the right, on
//       the first frame) on the Mac's own wallpaper; it reads 2.4 s (M5: 0.5 s + 0.3 s a word = 2.3 s).
// 2.5   RS4-07 (cut on the beat): the Calculator window at about 1×, a push to 2× onto its display and keypad as the
//       eight real presses land (×4), then "600" with a punch-in. "Your apps." The steps panel (with its
//       "Preparing to open Calculator") is never in frame.
// 4.0   RS5C-04 (cut on the bar): Calendar's month at about 1×, then a 0.7 s push (the window reshaping round it)
//       onto Monday 2's cell, "Glaze order 09:00" centred at about 65 px, held 1.05 s (REVIEW-2 S-2). The owner's own
//       events (the 23 and 24 Oct cells) are frosted in place. "Your calendar."
// 6.0   RS9B-02 (cut on the bar): Chrome's tab strip and address bar, close, with Pebble's own green tab group (the
//       URL frosted; the video's tab and the "default browser" infobar below are never in frame), pushing in;
//       7.0 (cut on the beat): the pill "Pebble is working in this tab · Stop", whole, on the frosted page (REVIEW-2
//       S-2: no black window). "Your browser."
// 8.0   RS4-07 (cut on the bar): the window card's own limit, "Only this window. Pebble stops at sign-ins, codes and
//       checks…", the pointer comes to Allow; "The app windows / and websites / you allow." (from 7.75, ≥ 2.6 s). The
//       scene ends on Allow, before the card collapses; this last window is the one the master scales up through the
//       frame (master/timeline.ts zoomThrough; its rect is S03_LAST_WINDOW below).
//
// Every window holds a different shape (never a montage swapping content inside one fixed window), on the wallpaper
// ground (never a dark blur). Every frame inside a window is a real frame of a take (time maps choose frames; nothing
// is drawn on Pebble's UI except masks over hazards).
import { AbsoluteFill, Sequence } from "remotion";
import type { Box } from "../../camera";
import { FloatingWindow } from "../../components/FloatingWindow";
import { FontGate } from "../../components/FontGate";
import { Headline } from "../../components/Headline";
import { ScreenZoom } from "../../components/ScreenZoom";
import { Sfx } from "../../components/Sfx";
import { eventS, TAKES } from "../../data/takes";
import { useLayout, type Layout, type Rect } from "../../layout";
import { fromRamps, timeMap } from "../../timeMap";
import { punchAt } from "../../timing";
import { EASE } from "../../tokens";
import type { SceneProps } from "../types";
import { DesktopGround, EdgeWhip, INK, lerp, lerpRect, MaskedZoom, R, ramp, sfxAt, sfxSrc, useSceneTime, type Mask, type SfxNote } from "./kit";

export const S03_NOMINAL = 11;

/** shot starts at nominal length (scaled by the retime factor): the first cut is on the beat after the act card */
const AT = { apps: 2.5, calendar: 4.0, browser: 6.0, limit: 8.0 } as const;
/** the limit line enters this long before the last cut (it reads 2.6 s and has gone before the master's zoom-through) */
const LIMIT_LEAD = 0.25;
const LIMIT_EXIT = 0.43; // before the end
const WHIP_IN_S = 0.14;

/* ---------- RS4-07: your apps ---------- */

const CALC = TAKES["RS4-07"];
const CALC_SIZE = { w: CALC.width, h: CALC.height };
const KEYS = ["key4", "key8", "keyTimes", "key1", "key2", "keyPoint", "key5", "equals600"].map((n) => eventS("RS4-07", n));
const EQUALS = eventS("RS4-07", "equals600");
const calcTime = fromRamps(
  [
    { s0: 52.4, s1: 52.68, speed: 1 }, // Calculator forward, display 0, the pointer resting on the Dock (out of frame)
    { s0: 52.68, s1: 56.45, speed: 5 }, // the eight presses, about 10 a second on screen
    { s0: 56.45, s1: 57.2, speed: 1 }, // "600"
  ],
  { ramp: 0.06, tail: 1 },
);
/** the Calculator window with the conversation round it; never the steps panel (x ≥ 1300) or the Dock tooltip */
const CALC_WIN = (portrait: boolean): Box => (portrait ? { x: 436, y: 285, w: 731, h: 806 } : { x: 405, y: 278, w: 790, h: 816 });
/** the display ("48×12.5" over "600") and the keypad's top rows, 2× */
const CALC_KEYS = (portrait: boolean): Box => (portrait ? { x: 610, y: 310, w: 430, h: 474 } : { x: 600, y: 322, w: 445, h: 460 });

/* ---------- RS5C-04: your calendar ---------- */

const CAL = TAKES["RS5C-04"];
const CAL_SIZE = { w: CAL.width, h: CAL.height };
const CAL_ARRIVES = eventS("RS5C-04", "calendarWindow");
const calTime = fromRamps([{ s0: CAL_ARRIVES + 0.01, s1: CAL_ARRIVES + 3, speed: 1 }], { tail: 1 });
/** Calendar's whole window (October 2026): no menu bar, no Pebble sidebar, no Dock */
const CAL_WIN: Box = { x: 395, y: 66, w: 1653, h: 1084 };
/**
 * Monday 2's cell (REVIEW-2 S-2): its date and "Glaze order 09:00" (text 406–680 × 1085–1105), from the window's left
 * edge to just left of the Dock's "Calendar" tooltip (x 722), above the window's bottom edge (1150)
 */
const CAL_CELL: Box = { x: 401, y: 1014, w: 318, h: 134 };
/** the push's length and its start after the cut */
const CAL_PUSH = { lead: 0.25, dur: 0.7 } as const;
/** the person's own iCloud events in the 23 and 24 Oct cells (takes.ts 'identity'), frosted with room round them */
const PERSONAL = CAL.hazards.find((h) => h.kind === "identity")!;
const CAL_MASKS: Mask[] = [
  // wide margins toward the push (down and left), where the camera blur's earlier poses would place the events
  { box: { x: PERSONAL.box.x - 40, y: PERSONAL.box.y - 10, w: PERSONAL.box.w + 40, h: PERSONAL.box.h + 40 }, s0: PERSONAL.s0, s1: PERSONAL.s1, px: 44, backing: "#272727" },
];

/* ---------- RS9B-02: your browser ---------- */

const WEB = TAKES["RS9B-02"];
const WEB_SIZE = { w: WEB.width, h: WEB.height };
/** the second browser shot (the pill) starts this long after the first (a beat) */
const PILL_CUT = 1.0;
/**
 * Chrome in place to the pill's last clean frame (takes.ts: from f3354, 55.9 s, the video page's suggestions load round
 * and over the pill): a still page under the frost, so 0.56× only repeats frames; then that frame held.
 */
const PILL_LAST_CLEAN = 55.867;
/** the tab strip re-lays out 52 px to the left between 54.85 and 54.9 (Chrome settling after its Space slid in): start after it */
const TABS_SETTLED = 54.9;
const webTime = fromRamps([{ s0: TABS_SETTLED, s1: PILL_LAST_CLEAN, speed: 0.56 }], { tail: 0 });
/** the same clock for a shot that starts `off` seconds into the browser beat (its Sequence restarts local time) */
const webTimeFrom = (off: number) => fromRamps([{ s0: Math.min(PILL_LAST_CLEAN - 0.05, TABS_SETTLED + off * 0.56), s1: PILL_LAST_CLEAN, speed: 0.56 }], { tail: 0 });
/** "● Pebble is working in this tab · Stop" (1505–2015 × 1224–1300) */
const PILL: Box = { x: 1505, y: 1224, w: 510, h: 76 };
/**
 * REVIEW-2 S-2: the tab strip and the address bar only (Chrome's "isn't your default browser" infobar starts at y 228,
 * below): "Open day – Clay & Current", the green "Pebble" group chip and its line, the address bar (URL frosted).
 * Wider at the cut, then a push. Both are in the window's own aspect (3.71, so the camera never widens them) and end at
 * x 847 (REVIEW-3 N-3): the group's green line runs straight under the chip (736–838) to about 847, then curls up into
 * the group tab's outline (848–876), so the card's edge meets the straight line and never cuts the curl; the group
 * tab's YouTube icon (875–905) and its frosted title (from 905) stay out.
 */
const TABS_WIDE: Box = { x: 190, y: 49, w: 657, h: 177 };
const TABS: Box = { x: 300, y: 64, w: 547, h: 147 };
/** the pill whole (its rounded left end at 1505; "Stop" ends at about 2025 and the pill at the screen's edge) */
const PILL_ZOOM: Box = { x: 1490, y: 1190, w: 558, h: 136 };
/** the page under the green frame, frosted round the pill (the player, its advert, the suggestions, the titles) */
const PAGE = { x: 0, y: 338, w: 2048, h: 994 };
const WEB_MASKS: Mask[] = [
  { box: { x: 905, y: 58, w: 450, h: 86 }, s0: 0, s1: 999, px: 64, backing: "#0f0f0f" }, // the video's tab: its title (the rival's, from 55.15); the Pebble chip (785–890) stays sharp
  { box: { x: 296, y: 150, w: 640, h: 60 }, s0: 0, s1: 999, px: 64, backing: "#0f0f0f" }, // the address bar's URL
  { box: { x: 1990, y: 10, w: 58, h: 40 }, s0: 0, s1: 999, kind: "fill", fill: "#000" }, // the recording dot
  // the page under the green frame (the player, its advert, the suggestions, the titles), frosted round Pebble's pill
  { box: PAGE, s0: 0, s1: 999, px: 64, backing: "#0f0f0f", holes: [{ box: { ...PILL, w: 2048 - PILL.x }, r: 38 }] }, // the hole runs to the screen's edge: "Stop" whole
];

/* ---------- RS4-07 again: the limit ---------- */

const ALLOW = eventS("RS4-07", "allowPressed"); // 39.633: the card collapses on this frame
/** the card's end on screen, real time, up to the last frame before Allow collapses it; then that frame held */
const limitTime = (len: number) =>
  timeMap(
    [
      [0, ALLOW - 1 / 60 - len],
      [len, ALLOW - 1 / 60],
    ],
    { tail: 0, head: 1 },
  );
/** "…Only this window. Pebble stops at sign-ins, codes and checks and hands them to you…", Don't allow, Allow */
const LIMIT_CARD: Box = { x: 1360, y: 700, w: 640, h: 360 };

/* ---------- layout ---------- */

/**
 * 16:9: the type in the left column, a window of the shot's own shape on the right. 4:5: the type above, the window
 * under it. Every shot's window has a different rect.
 */
const frame03 = (L: Layout) =>
  L.portrait
    ? {
        text: R(L, 64, 110, 952, 290),
        apps: R(L, 150, 440, 780, 860),
        calendar: R(L, 40, 470, 1000, 656),
        calEvent: R(L, 76, 600, 928, 391),
        tabs: R(L, 30, 520, 1020, 275),
        pill: R(L, 30, 640, 1020, 249),
        limit: R(L, 40, 520, 1000, 563),
        labelSize: L.type.headline,
        limitSize: L.px(84),
      }
    : {
        text: R(L, 128, 150, 600, 780),
        apps: R(L, 900, 96, 860, 888),
        calendar: R(L, 744, 172, 1112, 729),
        calEvent: R(L, 900, 372, 800, 337),
        tabs: R(L, 760, 336, 1080, 291), // REVIEW-3 N-3: an 80-px right margin (the same centre line, the same 3.71)
        pill: R(L, 760, 452, 1124, 274),
        limit: R(L, 812, 230, 1048, 590),
        labelSize: L.type.title,
        limitSize: L.px(78),
      };

/** S03's last window, as fractions of the frame: the master's zoom-through scales it up through the frame. */
export const S03_LAST_WINDOW = {
  "16x9": { x: 812 / 1920, y: 230 / 1080, w: 1048 / 1920, h: 590 / 1080 },
  "4x5": { x: 40 / 1080, y: 520 / 1350, w: 1000 / 1080, h: 563 / 1350 },
} as const;

/** the scene's moments in its own seconds, for marks and SFX */
export const s03Moments = (lenS: number) => {
  const k = lenS / S03_NOMINAL;
  const apps = AT.apps * k;
  const calendar = AT.calendar * k;
  const browser = AT.browser * k;
  const limit = AT.limit * k;
  const limitLen = lenS - limit;
  return {
    k,
    apps,
    calendar,
    browser,
    limit,
    keys: KEYS.map((s) => apps + calcTime.inv(s)),
    equals: apps + calcTime.inv(EQUALS),
    calendarPush: calendar + CAL_PUSH.lead,
    pill: browser + PILL_CUT * k,
    limitLine: limit - LIMIT_LEAD,
    allow: limit + limitLen,
    limitLen,
  };
};

export const S03_SFX = (lenS: number): SfxNote[] => {
  const M = s03Moments(lenS);
  const taps = ["keyA", "keyB", "keyC"] as const;
  return [
    ...M.keys.slice(0, 7).map((s, i): SfxNote => ({ name: taps[i % 3], s, db: -14, what: `Calculator key ${i + 1} of 8` })),
    { name: "keyA", s: M.equals, db: -12, what: "Calculator = (600)" },
    { name: "shimmer", s: M.equals, db: -18, what: "600" },
  ];
};

export const S03UsesYourMac: React.FC<SceneProps> = ({ durationInFrames }) => {
  const L = useLayout();
  const G = frame03(L);
  const { t, lenS, f, fps } = useSceneTime(S03_NOMINAL, durationInFrames);
  const M = s03Moments(lenS);
  const pre = Math.round(fps);
  const tvalign = L.portrait ? "bottom" : "middle";
  const align = L.portrait ? "center" : "left";

  /* apps: about 1×, then 2× onto the display and keys as the presses land */
  const ta = t - M.apps;
  const aEq = calcTime.inv(EQUALS);
  const keysApps = [
    { t: 0, box: CALC_WIN(L.portrait) },
    { t: 0.08, box: CALC_WIN(L.portrait) },
    { t: 0.53, box: CALC_KEYS(L.portrait), dur: 0.45, ease: EASE.camera },
  ];

  // REVIEW-2 S-2: the push keeps the window's bottom-left corner (where the event is) pinned while the window reshapes
  // round it, so the event is in view on every frame and the camera never crosses the month's empty cells. One box a
  // frame, in the window's own aspect: scale in log space, the window's rect on the same ease.
  const pc = ramp(t, M.calendarPush, CAL_PUSH.dur, EASE.camera);
  const calRect = lerpRect(G.calendar, G.calEvent, pc);
  const calMag = Math.exp(lerp(Math.log(G.calendar.w / CAL_WIN.w), Math.log(G.calEvent.w / CAL_CELL.w), pc));
  const calLeft = lerp(CAL_WIN.x, CAL_CELL.x, pc);
  const calBottom = lerp(CAL_WIN.y + CAL_WIN.h, CAL_CELL.y + CAL_CELL.h, pc);
  const calBox: Box = { x: calLeft, y: calBottom - calRect.h / calMag, w: calRect.w / calMag, h: calRect.h / calMag };

  /* the limit: the card, real time into Allow */
  const limitMap = limitTime(M.limitLen);
  const label = (text: string, exitAt?: number) => (
    <Headline text={text} at={0.04} exitAt={exitAt} exit="rise" entrance="blur" size={G.labelSize} align={align} valign={tvalign} box={G.text} color={INK} />
  );
  const lines = L.portrait ? (s: string) => s.replace("\n", " ") : (s: string) => s;
  const sfx = S03_SFX(lenS);

  return (
    <FontGate>
      <EdgeWhip role="in" start={0} dur={WHIP_IN_S}>
        <DesktopGround>
          {/* the act card: the answer, out of the whip */}
          <Sequence durationInFrames={f(M.apps)} name="act · Now it can use your Mac.">
            <Headline text={"Now it can\nuse your Mac."} at={-0.08} entrance="line" size={L.type.hero} align="center" valign="middle" box={L.content} color={INK} />
          </Sequence>

          <Sequence from={f(M.apps)} durationInFrames={f(M.calendar) - f(M.apps)} premountFor={pre} name="apps · RS4-07 Calculator">
            <FloatingWindow rect={G.apps} enter="none" spill={0} shadow={0.55} scale={punchAt([aEq], ta, 0.04, 0.03, 0.3)}>
              <ScreenZoom src={CALC.file} srcSize={CALC_SIZE} time={calcTime} srcDuration={CALC.durationS} keys={keysApps} drift={0.012} motionBlur={32} />
            </FloatingWindow>
            {label(lines("Your\napps."))}
          </Sequence>

          <Sequence from={f(M.calendar)} durationInFrames={f(M.browser) - f(M.calendar)} premountFor={pre} name="calendar · RS5C-04 Glaze order">
            <FloatingWindow rect={calRect} enter="none" spill={0} shadow={0.55}>
              <MaskedZoom src={CAL.file} srcSize={CAL_SIZE} time={calTime} srcDuration={CAL.durationS} keys={[{ t: 0, box: calBox }]} drift={0} motionBlur={false} masks={CAL_MASKS} />
            </FloatingWindow>
            {label(lines("Your\ncalendar."))}
          </Sequence>

          <Sequence from={f(M.browser)} durationInFrames={f(M.pill) - f(M.browser)} premountFor={pre} name="browser · RS9B-02 the tab strip">
            <FloatingWindow rect={G.tabs} enter="none" spill={0} shadow={0.55} background="#202124">
              <MaskedZoom
                src={WEB.file}
                srcSize={WEB_SIZE}
                time={webTime}
                srcDuration={WEB.durationS}
                keys={[
                  { t: 0, box: TABS_WIDE },
                  { t: 0.06, box: TABS_WIDE },
                  { t: 0.06 + 0.7, box: TABS, dur: 0.7, ease: EASE.camera },
                ]}
                drift={0.012}
                motionBlur={false}
                masks={WEB_MASKS}
              />
            </FloatingWindow>
          </Sequence>

          <Sequence from={f(M.pill)} durationInFrames={f(M.limit) - f(M.pill)} premountFor={pre} name="browser · RS9B-02 the pill">
            <FloatingWindow rect={G.pill} enter="none" spill={0} shadow={0.55} background="#0f0f0f">
              {/* no camera blur samples: through the pill's sharp hole they would show the page at other poses */}
              <MaskedZoom src={WEB.file} srcSize={WEB_SIZE} time={webTimeFrom(M.pill - M.browser)} srcDuration={WEB.durationS} keys={[{ t: 0, box: PILL_ZOOM }]} drift={0.015} motionBlur={false} masks={WEB_MASKS} />
            </FloatingWindow>
          </Sequence>

          <Sequence from={f(M.browser)} durationInFrames={f(M.limit) - f(M.browser)} name="browser · the label">
            {label(lines("Your\nbrowser."), M.limitLine - M.browser - 0.29)}
          </Sequence>

          <Sequence from={f(M.limit)} premountFor={pre} name="limit · RS4-07 the window card">
            <FloatingWindow rect={G.limit} enter="none" spill={0} shadow={0.55}>
              <ScreenZoom src={CALC.file} srcSize={CALC_SIZE} time={limitMap} srcDuration={CALC.durationS} keys={[{ t: 0, box: LIMIT_CARD }]} drift={0.012} />
            </FloatingWindow>
          </Sequence>

          {/* the limit line bridges the last cut: it lands on the browser shot and has gone before the zoom-through */}
          <Sequence from={f(M.limitLine)} name="limit line">
            <Headline
              text={L.portrait ? "The app windows\nand websites you allow." : "The app windows\nand websites\nyou allow."}
              at={0}
              exitAt={lenS - LIMIT_EXIT - M.limitLine}
              exit="rise"
              entrance="line"
              size={G.limitSize}
              align={align}
              valign={tvalign}
              box={G.text}
              color={INK}
            />
          </Sequence>
        </DesktopGround>
      </EdgeWhip>

      <AbsoluteFill>
        {sfx.map((c) => (
          <Sfx key={`${c.name}-${c.s.toFixed(3)}`} src={sfxSrc(c.name)} at={sfxAt(c.name, c.s)} db={c.db} />
        ))}
      </AbsoluteFill>
    </FontGate>
  );
};

/** The window rect S03 ends on, px (for checks). */
export const s03LastRect = (L: Layout): Rect => frame03(L).limit;
