// Scene group b: the real-take scenes (S02 Lives on your Mac, S03 Uses your Mac, S09 Stealth Lockdown). Owned by its
// worker; scenes/Previews.tsx registers them for 16:9 and 4:5. Handoff: .work/handoffs/launch-scenes-b.md.
import type { SceneDef } from "../types";
import { S02_NOMINAL, S02OnYourMac, s02Moments } from "./S02OnYourMac";
import { S03_NOMINAL, S03UsesYourMac, s03Moments } from "./S03UsesYourMac";
import { S09_NOMINAL, S09Stealth, s09Moments } from "./S09Stealth";

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
      "spaces-swipe": m02.swipe,
      "cut-to-ask (downbeat)": m02.cut,
      click: m02.click,
      "panel-opens": m02.panel,
      "typing-starts": m02.typing,
      return: m02.ret,
      "whip-out": m02.whip,
    }),
  },
  {
    id: "S03-UsesYourMac",
    component: S03UsesYourMac,
    nominalS: S03_NOMINAL,
    marks: marks({
      "act-card": 0,
      "cut-apps (downbeat)": m03.apps,
      "allow-calculator": m03.allowCalc,
      "calculator-forward": m03.calcForward,
      ...Object.fromEntries(m03.keys.map((s, i) => [`key ${KEY_NAMES[i]}`, s])),
      "cut-calendar (downbeat)": m03.calendar,
      "do-it": m03.doIt,
      "calendar-event": m03.calendarForward,
      "cut-browser (downbeat)": m03.browser,
      "allow-site": m03.webAllow,
      "working-pill": m03.pill,
      "limit-line": m03.limit,
      "shrink-to-card": m03.shrink,
    }),
  },
  {
    id: "S09-Stealth",
    component: S09Stealth,
    nominalS: S09_NOMINAL,
    marks: marks({
      "presenting (the breath)": 0,
      "palette-opens": m09.palette,
      "row-lit": m09.rowLit,
      return: m09.ret,
      "windows-leave": m09.leave,
      "dusk-wipe": m09.wipe,
      "veil-on": m09.veilOn,
      "stealth-title": m09.title,
      "honest-line": m09.honest,
    }),
  },
];
