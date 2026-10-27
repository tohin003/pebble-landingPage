// Makes the Return's cell images (setpieces/returnThumbs.ts) into video/public/ui/f2-cells/return (gitignored, like
// every capture), from the manifest (setpieces/returnCells.ts): each published still cropped and scaled (never
// stretched, never above its capture's pixels), each slot drawn as a labelled placeholder panel. Light work (83 small
// images), but it reads and writes many files, so it runs through heavy.sh:
//   scripts/heavy.sh f2-return-thumbs /usr/sbin/taskpolicy -c utility bun video/src/film2/setpieces/tools/return-thumbs.ts
// It uses Pillow from the repo's QA venv (.work/qa-venv; PY=<python> to override), as tools/make-cells.ts does (macOS's
// sips crops from the centre). It writes index.json beside the images: each image's size, kind and source.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { COLOR } from "../../tokens";
import { RETURN_THUMB_DIR, returnThumbJobs } from "../returnThumbs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const PUBLIC = join(REPO, "video/public");
const PY = process.env.PY ?? join(REPO, ".work/qa-venv/bin/python");
mkdirSync(join(PUBLIC, RETURN_THUMB_DIR), { recursive: true });

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
    # a slot: a labelled placeholder panel (never drawn UI), its largest text the manifest's textPx at the slot's 480 px
    u = W / job["slotW"]
    im = Image.new("RGB", (W, H), rgb(C["fill"]))
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
print(json.dumps(out))
`;

const jobs = returnThumbJobs().map((j) => {
  const base = { ...j, out: join(PUBLIC, j.out) };
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
const made = JSON.parse(r.stdout) as { id: string; kind: string; size: [number, number] }[];
writeFileSync(join(PUBLIC, RETURN_THUMB_DIR, "index.json"), JSON.stringify({ made: new Date().toISOString(), images: made }, null, 1));
const n = (k: string) => made.filter((m) => m.kind === k).length;
console.log(`return-thumbs: ${made.length} images (${n("still")} stills, ${n("slot")} slots) in video/public/${RETURN_THUMB_DIR}`);
for (const m of made) console.log(`  ${m.id.padEnd(12)} ${m.kind.padEnd(6)} ${m.size.join(" × ")}`);
