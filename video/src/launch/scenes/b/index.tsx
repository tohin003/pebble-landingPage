// Scene group b: the real-take scenes (S02 Lives on your Mac, S03 Uses your Mac, S09 Stealth Lockdown). Owned by its
// worker; scenes/Previews.tsx registers them for 16:9 and 4:5. Handoffs: .work/handoffs/launch-scenes-b.md and
// .work/launch/critic/FIX1-B.md (REVIEW-1's fixes).
import type { SceneDef } from "../types";
import { S02_NOMINAL, S02OnYourMac, s02Moments } from "./S02OnYourMac";
import { S03_NOMINAL, S03UsesYourMac, s03Moments } from "./S03UsesYourMac";
import { S09_NOMINAL, S09Stealth, s09Moments } from "./S09Stealth";

export { S03_LAST_WINDOW } from "./S03UsesYourMac";
export { VEIL_HANDOFF } from "./kit";

const marks = (list: Record<string, number>) => Object.entries(list).map(([name, s]) => ({ name, s: +s.toFixed(3) }));

const m02 = s02Moments(S02_NOMINAL);
const m03 = s03Moments(S03_NOMINAL);
const m09 = s09Moments(S09_NOMINAL);
const KEY_NAMES = ["4", "8", "×", "1", "2", ".", "5", "= (600)"];

export const GROUP_B: SceneDef[] = [
  {
    id: "S02-OnYourMac",
    component: S02OnYourMac,
    nominalS: S02_NOMINAL,
    marks: marks({
      "the Mac, the pebble sharp (S01's sage cuts here)": 0,
      "cut to the Spaces (beat; the caption bridges it)": m02.b,
      "spaces-swipe (⌃→)": m02.swipe,
      "the slide's first frame: On every Space.": m02.slide,
      "pebble-settled": m02.settled,
      "cut to click, ask (downbeat)": m02.c,
      click: m02.click,
      "panel-opens": m02.panel,
      "typing-starts": m02.typing,
      "question whole": m02.asked,
      return: m02.ret,
      sending: m02.sending,
      "whip-out": m02.whip,
    }),
  },
  {
    id: "S03-UsesYourMac",
    component: S03UsesYourMac,
    nominalS: S03_NOMINAL,
    marks: marks({
      "act-card": 0,
      "cut-apps (beat)": m03.apps,
      ...Object.fromEntries(m03.keys.map((s, i) => [`key ${KEY_NAMES[i]}`, s])),
      "cut-calendar (bar)": m03.calendar,
      "calendar push": m03.calendarPush,
      "cut-browser: the tab strip (bar)": m03.browser,
      "cut-pill (beat)": m03.pill,
      "limit-line": m03.limitLine,
      "cut-limit (bar)": m03.limit,
      "on Allow (the end)": m03.allow,
    }),
  },
  {
    id: "S09-Stealth",
    component: S09Stealth,
    nominalS: S09_NOMINAL,
    marks: marks({
      "presenting (the palette)": 0,
      "palette-opens": m09.palette,
      "row-lit": m09.rowLit,
      "the recording, the type (with it)": m09.strip,
      return: m09.ret,
      "windows-leave (the music's stop)": m09.leave,
      "dock icon gone": m09.dockGone,
      "the recording leaves": m09.stripOut,
      "the pebble": m09.pebble,
      "veil-on": m09.veilOn,
      "glide to the hand-off": m09.glide,
      "type out": m09.typeOut,
    }),
  },
];
