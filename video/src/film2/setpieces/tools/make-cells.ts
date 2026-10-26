// Makes the wall's cell thumbnails (setpieces/standins.ts CELL_SOURCES) from the published 2× captures in video/public,
// into video/public/ui/f2-cells (gitignored, like every capture). Light work (28 small crops), run once:
//   /usr/sbin/taskpolicy -c utility bun video/src/film2/setpieces/tools/make-cells.ts
// It uses Pillow from the repo's QA venv (.work/qa-venv; PY=<python> to override): macOS's sips ignored its crop offset
// here (it crops from the centre), which put a usage line into a cell. The crop keeps the capture's own pixels at its
// own aspect (never stretched), then scales the long side down to the ring's size (760, 560 or 480 px).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CELL_SOURCES, CELL_THUMB_LONG_SIDE, cellThumbPath } from "../standins";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const PUBLIC = join(REPO, "video/public");
const PY = process.env.PY ?? join(REPO, ".work/qa-venv/bin/python");
mkdirSync(join(PUBLIC, "ui/f2-cells"), { recursive: true });

const SCRIPT = `
import json, sys
from PIL import Image
for job in json.loads(sys.stdin.read()):
    im = Image.open(job["src"]).convert("RGB")
    x, y, w, h = (v * 2 for v in job["crop"])
    assert x >= 0 and y >= 0 and x + w <= im.width and y + h <= im.height, (job["src"], im.size, job["crop"])
    c = im.crop((x, y, x + w, y + h))
    s = job["long"] / max(c.width, c.height)
    c = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.LANCZOS)
    c.save(job["out"], "JPEG", quality=82)
    print(job["id"], c.size)
`;
const jobs = CELL_SOURCES.map((c) => {
  const src = join(PUBLIC, c.from);
  if (!existsSync(src)) throw new Error(`missing capture ${src}`);
  return { id: c.id, src, crop: [c.crop.x, c.crop.y, c.crop.w, c.crop.h], long: CELL_THUMB_LONG_SIDE[c.ring], out: join(PUBLIC, cellThumbPath(c.id)) };
});
const r = spawnSync(PY, ["-I", "-c", SCRIPT], { input: JSON.stringify(jobs), encoding: "utf8" });
if (r.status !== 0) throw new Error(r.stderr);
process.stdout.write(r.stdout);
