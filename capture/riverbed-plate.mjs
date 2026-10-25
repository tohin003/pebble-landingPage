// The film's riverbed desktop plates as rasters (the trailer's P2: a dark plate for the cold open and the welcome match).
// The light plate is video/public/desktop/riverbed-light.svg (comp 2's art without its baked vignette, rendered by the
// RiverbedPlate still). Its dark twin comes from tools/assets/wallpaper/wallpaper-dark.svg, the page's night-green
// wallpaper, with the same one element removed (<rect … fill="url(#vig)"/>: the film's own Vignette lives in frame
// space). Both are drawn by the installed Chrome at 4800 × 3000 (3 px a point of the 1600 × 1000 desktop), as the
// RiverbedPlate still draws them, so the grain matches. The rasters are derived and gitignored (video/public/desktop).
//   scripts/heavy.sh plate node capture/riverbed-plate.mjs dark  [--out=video/public/desktop/riverbed-dark@3x.png]
//   scripts/heavy.sh plate node capture/riverbed-plate.mjs light --out=<dir>/check.png   (to compare with the light plate)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.find((a) => a.startsWith(`--${name}=`)) || `=${fallback}`).split("=").slice(1).join("=");
const THEME = args.find((a) => !a.startsWith("--")) || "dark";
const OUT = path.resolve(opt("out", path.join(REPO, "video/public/desktop", `riverbed-${THEME}@3x.png`)));
const VIGNETTE = '<rect width="1600" height="1000" fill="url(#vig)"/>';
let svg;
if (THEME === "light") svg = fs.readFileSync(path.join(REPO, "video/public/desktop/riverbed-light.svg"), "utf8");
else if (THEME === "dark") {
  svg = fs.readFileSync(path.join(REPO, "tools/assets/wallpaper/wallpaper-dark.svg"), "utf8");
  if (svg.split(VIGNETTE).length !== 2) throw new Error("wallpaper-dark.svg no longer has exactly one vignette rect");
  svg = svg.replace(VIGNETTE, "");
} else throw new Error("theme is light or dark");
const W = 4800, H = 3000;
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
  userDataDir: path.join(HERE, "chrome-profile"),
  args: ["--no-first-run", "--no-default-browser-check", "--disable-extensions", "--hide-scrollbars", "--force-color-profile=srgb"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const src = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#000"><img id="p" src="${src}" style="display:block;width:${W}px;height:${H}px"></body></html>`);
  await page.waitForFunction(() => document.getElementById("p").complete && document.getElementById("p").naturalWidth > 0);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: W, height: H } });
  console.log(`riverbed ${THEME}: ${W}x${H} -> ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB)`);
} finally {
  await browser.close();
}
