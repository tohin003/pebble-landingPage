// Makes the Return's cell images (setpieces/returnThumbs.ts) into video/public/ui/f2-cells/return (gitignored, like
// every capture), from the manifest (setpieces/returnCells.ts): each published still cropped and scaled (never
// stretched, never above its capture's pixels), each slot drawn as a labelled placeholder panel. Light work (84 small
// images), but it reads and writes many files, so it runs through heavy.sh:
//   scripts/heavy.sh f2-return-thumbs /usr/sbin/taskpolicy -c utility bun video/src/film2/setpieces/tools/return-thumbs.ts [--measure]
// Each image's file name carries the signature of what it shows (returnThumbs.ts returnThumbSig): images in the folder
// that the manifest no longer names (a changed stand-in's old image) are removed and listed. It uses Pillow and numpy
// from the repo's QA venv (.work/qa-venv; PY=<python> to override), as tools/make-cells.ts does (macOS's sips crops
// from the centre). It writes index.json beside the images: each image's size, kind, source and measurement.
//   --measure   also writes setpieces/returnLum.ts (GENERATED, committed): each image's mean relative luminance and
//               saturated-red share as drawn, keyed by its signature, which the light rule, the red rule and the swaps'
//               luminance pairing read (the review's RV-02, RV-05)
//   --check     makes nothing: lists the images the manifest names that are not made (exit 1 if any), before a render
//               (RV-10; the view also stops a render on a missing image)
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COLOR } from "../../tokens";
import { RETURN_THUMB_DIR, missingReturnThumbs, returnThumbJobs } from "../returnThumbs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const PUBLIC = join(REPO, "video/public");
const PY = process.env.PY ?? join(REPO, ".work/qa-venv/bin/python");
const DIR = join(PUBLIC, RETURN_THUMB_DIR);
const args = process.argv.slice(2);
mkdirSync(DIR, { recursive: true });

if (args.includes("--check")) {
  const have = readdirSync(DIR).map((f) => `${RETURN_THUMB_DIR}/${f}`);
  const missing = missingReturnThumbs(have);
  console.log(missing.length ? `return-thumbs --check: ${missing.length} images not made:\n  ${missing.join("\n  ")}` : `return-thumbs --check: all ${returnThumbJobs().length} images made`);
  process.exit(missing.length ? 1 : 0);
}

const SCRIPT = `
import json, sys
from PIL import Image, ImageDraw, ImageFont
cfg = json.loads(sys.stdin.read())
C = cfg["colors"]
def font(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            pass
    return ImageFont.load_default(size)
def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f) <= width or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines
out = []
for job in cfg["jobs"]:
    W, H = job["w"], job["h"]
    if job["kind"] == "still":
        im = Image.open(job["src"])
        im = im.convert("RGBA")
        k = job["scale"]
        x, y, w, h = (job["crop"][key] * k for key in ("x", "y", "w", "h"))
        assert x >= 0 and y >= 0 and x + w <= im.width and y + h <= im.height, (job["id"], im.size, job["crop"])
        c = im.crop((int(round(x)), int(round(y)), int(round(x + w)), int(round(y + h))))
        if job["fit"] == "cover":
            c = c.resize((W, H), Image.LANCZOS)
            ground = Image.new("RGBA", (W, H), rgb(C["page"]) + (255,))
            ground.alpha_composite(c)
            res = ground
        else:
            # centred on its own ground: the crop's corner, or the page's sage-white where the corner is clear
            px = c.getpixel((0, 0))
            g = px[:3] if px[3] >= 250 else rgb(C["page"])
            s = min(W / c.width, H / c.height)
            c = c.resize((max(1, round(c.width * s)), max(1, round(c.height * s))), Image.LANCZOS)
            res = Image.new("RGBA", (W, H), g + (255,))
            res.alpha_composite(c, ((W - c.width) // 2, (H - c.height) // 2))
        res.convert("RGB").save(job["out"], "JPEG", quality=88)
        out.append({"id": job["id"], "kind": "still", "size": [W, H], "src": job["src_rel"], "crop": job["crop"], "fit": job["fit"]})
        continue
    # a slot: a labelled placeholder panel (never drawn UI), its largest text the manifest's textPx at the slot's 480 px.
    # Its ground is the page's sage-white with the hairline hatch ("light-1"): it stands in for a light-theme crop, so it
    # draws at a light crop's luminance (about 0.90, the published stills' 0.86-0.93), not the darker flat panel (0.84),
    # whose step against the stills snapped at a swap (the review's RV-02: E1+E2 into I1*'s slot, 3.29 levels in 1:1)
    u = W / job["slotW"]
    im = Image.new("RGB", (W, H), rgb(C["page"]))
    d = ImageDraw.Draw(im)
    step = max(6, round(14 * u * 2.2))
    lw = max(1, round(1.2 * u * 1.6))
    for x0 in range(-H, W + H, step):
        d.line([(x0, H), (x0 + H, 0)], fill=rgb(C["line"]), width=lw)
    b = max(1, round(1.5 * u * 1.6))
    d.rectangle([0, 0, W - 1, H - 1], outline=rgb(C["line"]), width=b)
    big = job["textPx"] * u
    fm = font(cfg["mono"], max(6, round(big)))
    fs = font(cfg["sans"], max(6, round(big * 0.86)))
    fc = font(cfg["mono"], max(5, round(big * 0.7)))
    pad = round(24 * u)
    y = pad
    d.text((pad, y), job["id"] + "  ·  " + job["captureId"], font=fm, fill=rgb(C["ink"]))
    y += round(big * 1.5)
    for line in wrap(d, job["label"], fs, W - 2 * pad)[:4]:
        d.text((pad, y), line, font=fs, fill=rgb(C["ink2"]))
        y += round(big * 1.25)
    d.text((pad, H - pad - round(big * 0.8)), "slot: the 2.0.0 capture goes here", font=fc, fill=rgb(C["accent"]))
    im.save(job["out"], "JPEG", quality=90)
    out.append({"id": job["id"], "kind": "slot", "size": [W, H], "captureId": job["captureId"]})
# each image as drawn: its mean relative luminance (sRGB decoded, Rec. 709) and its saturated-red share
# (R/(R+G+B) >= 0.8 on linear values, R3 §4.4)
import numpy as np
def measure(path):
    a = np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) / 255.0
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)
    y = 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]
    s = lin.sum(axis=2)
    red = (s > 0) & (lin[..., 0] >= 0.8 * np.maximum(s, 1e-12))
    return round(float(y.mean()), 4), round(float(red.mean()), 5)
for o, job in zip(out, cfg["jobs"]):
    o["mean"], o["red"] = measure(job["out"])
print(json.dumps(out))
`;

const jobs = returnThumbJobs().map((j) => {
  // (the signature is the one in the image's name: returnThumbPath)
  const base = { ...j, out: join(PUBLIC, j.out), sig: /-([0-9a-f]{8})\.jpg$/.exec(j.out)![1]! };
  if (j.kind !== "still") return base;
  const src = join(PUBLIC, j.src);
  if (!existsSync(src)) throw new Error(`missing capture ${src}`);
  return { ...base, src, src_rel: j.src };
});
const FONT_DIRS = ["/System/Library/Fonts", "/System/Library/Fonts/Supplemental", "/Library/Fonts"];
const cfg = {
  jobs,
  colors: { page: COLOR.page, fill: COLOR.fill, line: COLOR.line, ink: COLOR.ink, ink2: COLOR.ink2, accent: COLOR.accent },
  // the film's faces where FreeType reads them, else the Mac's
  mono: [join(PUBLIC, "fonts/GeistMono-Medium-latin.woff2"), ...FONT_DIRS.map((d) => join(d, "Menlo.ttc")), ...FONT_DIRS.map((d) => join(d, "SFNSMono.ttf"))],
  sans: [join(PUBLIC, "fonts/Inter-Variable-latin.woff2"), ...FONT_DIRS.map((d) => join(d, "Helvetica.ttc")), ...FONT_DIRS.map((d) => join(d, "SFNS.ttf"))],
};
const r = spawnSync(PY, ["-I", "-c", SCRIPT], { input: JSON.stringify(cfg), encoding: "utf8", maxBuffer: 1 << 24 });
if (r.status !== 0) throw new Error(r.stderr);
const made = JSON.parse(r.stdout) as { id: string; kind: string; size: [number, number]; mean: number; red: number }[];
const madeAt = new Date().toISOString();
const images = made.map((m, i) => ({ ...m, file: jobs[i]!.out.slice(PUBLIC.length + 1), sig: jobs[i]!.sig }));
writeFileSync(join(DIR, "index.json"), JSON.stringify({ made: madeAt, images }, null, 1));
// images the manifest no longer names (an earlier stand-in's): removed, so nothing stale is ever at hand
const keep = new Set([...images.map((m) => m.file.slice(RETURN_THUMB_DIR.length + 1)), "index.json"]);
const stale = readdirSync(DIR).filter((f) => !keep.has(f) && /\.(jpg|png)$/.test(f));
for (const f of stale) rmSync(join(DIR, f));
const n = (k: string) => made.filter((m) => m.kind === k).length;
console.log(`return-thumbs: ${made.length} images (${n("still")} stills, ${n("slot")} slots) in video/public/${RETURN_THUMB_DIR}; removed ${stale.length} no longer named${stale.length ? ` (${stale.join(", ")})` : ""}`);
for (const m of images) console.log(`  ${m.id.padEnd(12)} ${m.kind.padEnd(6)} ${m.size.join(" × ").padEnd(11)} mean ${m.mean.toFixed(3)} red ${(m.red * 100).toFixed(2)} %  ${m.file}`);
if (args.includes("--measure")) {
  const LUM = join(REPO, "video/src/film2/setpieces/returnLum.ts");
  const entries = [...images].sort((a, b) => a.id.localeCompare(b.id)).map((m) => `  "${m.sig}": { id: ${JSON.stringify(m.id)}, mean: ${m.mean}, red: ${m.red} },`);
  const head = `// THE RETURN'S DRAWN IMAGES, MEASURED: GENERATED by setpieces/tools/return-thumbs.ts --measure (do not edit by hand).
// Each entry is one cell image as made into video/public/ui/f2-cells/return, keyed by its signature (returnThumbs.ts
// returnThumbSig), so a changed stand-in or slot look is unmeasured until its new image is made and measured:
//   mean  its mean relative luminance as drawn (sRGB decoded, Rec. 709 weights, a "contain" crop on its own ground)
//   red   the share of its pixels that is saturated red (R/(R+G+B) ≥ 0.8 on linear values; R3 §4.4)
// The light rule, the red rule and the swaps' luminance pairing (MONTAGE_DESIGN §2.4) read these until each cell's
// 2.0.0 crop carries its own meanLum and redShare (returnCells.ts; the review's RV-02, RV-05).
// Pure data; no React.

export interface DrawnLum {
  /** the cell's id when measured */
  id: string;
  mean: number;
  red: number;
}

/** When the images were made and measured. */
export const RETURN_LUM_MADE: string | null = ${JSON.stringify(madeAt)};

export const RETURN_LUM: Readonly<Record<string, DrawnLum>> = {
${entries.join("\n")}
};
`;
  writeFileSync(LUM, head);
  console.log(`return-thumbs --measure: wrote ${images.length} measurements to video/src/film2/setpieces/returnLum.ts`);
}
