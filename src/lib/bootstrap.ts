// The inline <head> script (src/app/layout.tsx). It runs while the HTML is parsed, before first paint, and sets three
// attributes on <html> that CSS and the components read:
//   data-theme     "light" | "dark"      the stored choice (theme.ts), otherwise the system's
//   data-motion    "on" | "paused"       paused when the visitor paused motion here (motion.ts) or the system reduces it
//   data-platform  "mac" | "other"       which call to action shows (platform.ts)
// Every storage access sits in try/catch (private windows, blocked storage). ES5 only, no dependencies, under 1 KB.
// The Content-Security-Policy allows it through 'unsafe-inline' (next.config.ts). bootstrap.test.ts checks that it
// agrees with theme.ts, motion.ts and platform.ts.

import { MOTION_KEY, REDUCED_QUERY } from "./motion";
import { DARK_QUERY, THEME_KEY } from "./theme";

export const BOOTSTRAP_SCRIPT = `(function(){var d=document.documentElement,t=null,m=null;
try{t=localStorage.getItem(${JSON.stringify(THEME_KEY)});m=localStorage.getItem(${JSON.stringify(MOTION_KEY)})}catch(e){}
function q(s){try{return window.matchMedia(s).matches}catch(e){return false}}
if(t!=="light"&&t!=="dark")t=q(${JSON.stringify(DARK_QUERY)})?"dark":"light";
d.setAttribute("data-theme",t);
d.setAttribute("data-motion",m==="paused"||q(${JSON.stringify(REDUCED_QUERY)})?"paused":"on");
var n=navigator||{},u=n.userAgent||"",h=(n.userAgentData&&n.userAgentData.platform)||"",p=n.platform||"",o="other";
if(!(/iPhone|iPad|iPod|Android/i.test(u)||(n.userAgentData&&n.userAgentData.mobile))&&!((n.maxTouchPoints||0)>1)&&(/^macOS$/i.test(h)||/^Mac/i.test(p)||/Macintosh|Mac OS X/.test(u)))o="mac";
d.setAttribute("data-platform",o)})();`;
