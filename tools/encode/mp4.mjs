// tools/encode/mp4.mjs: a small ISO-BMFF reader for the media checks (no dependencies).
//
// - mp4Info(file): the top-level box order (faststart = moov before the first mdat), and per track the sample entry
//   (hvc1, hev1, avc1, mp4a), the RFC 6381 codecs string computed from hvcC / avcC, and the nclx colour box.
// - imageInfo(file): the pixel size of an AVIF (ispe) or a WebP (VP8 / VP8L / VP8X header).
// - hevcFits / avcFits: does a codecs string fit under the one the page declares (src/lib/media.ts VIDEO_TYPES)?
//
// CLI: node tools/encode/mp4.mjs codecs <file>   prints the video track's codecs string, e.g. hvc1.1.6.L120.90
//      node tools/encode/mp4.mjs info <file>     prints everything as JSON
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_MOOV = 64 * 1024 * 1024;

function readAt(fd, offset, length) {
  const buf = Buffer.alloc(length);
  const got = fs.readSync(fd, buf, 0, length, offset);
  return got === length ? buf : buf.subarray(0, got);
}

/** Top-level boxes: [{type, offset, size, header}] without reading their bodies. */
function topLevelBoxes(fd, fileSize) {
  const boxes = [];
  let offset = 0;
  while (offset + 8 <= fileSize) {
    const head = readAt(fd, offset, 16);
    let size = head.readUInt32BE(0);
    const type = head.toString("latin1", 4, 8);
    let header = 8;
    if (size === 1) {
      size = Number(head.readBigUInt64BE(8));
      header = 16;
    } else if (size === 0) {
      size = fileSize - offset;
    }
    if (size < header || offset + size > fileSize) {
      boxes.push({ type, offset, size, header, truncated: true });
      break;
    }
    boxes.push({ type, offset, size, header });
    offset += size;
  }
  return boxes;
}

/** Child boxes inside buf[start, end). */
function children(buf, start, end) {
  const out = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = buf.readUInt32BE(offset);
    const type = buf.toString("latin1", offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      size = Number(buf.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) break;
    out.push({ type, start: offset + header, end: offset + size });
    offset += size;
  }
  return out;
}

const child = (buf, box, type) => children(buf, box.start, box.end).find((b) => b.type === type);

function bitReverse32(value) {
  let out = 0;
  for (let i = 0; i < 32; i++) out = (out << 1) | ((value >>> i) & 1);
  return out >>> 0;
}

/** RFC 6381 / ISO 14496-15 Annex E codecs string from an hvcC box body. */
function hevcCodecs(fourcc, buf, box) {
  const p = box.start;
  const b1 = buf.readUInt8(p + 1);
  const profileSpace = b1 >> 6;
  const tier = (b1 >> 5) & 1;
  const profile = b1 & 0x1f;
  const compat = buf.readUInt32BE(p + 2);
  const constraints = [...buf.subarray(p + 6, p + 12)];
  const level = buf.readUInt8(p + 12);
  while (constraints.length && constraints[constraints.length - 1] === 0) constraints.pop();
  const space = ["", "A", "B", "C"][profileSpace];
  const parts = [
    fourcc,
    `${space}${profile}`,
    bitReverse32(compat).toString(16).toUpperCase(),
    `${tier ? "H" : "L"}${level}`,
    ...constraints.map((c) => c.toString(16).toUpperCase().padStart(2, "0")),
  ];
  return {
    codecs: parts.join("."),
    hevc: { profileSpace, tier: tier ? "high" : "main", profile, compatReversed: bitReverse32(compat), level, constraints: parts.slice(4).join(".") },
  };
}

/** avc1.PPCCLL from an avcC box body. */
function avcCodecs(fourcc, buf, box) {
  const p = box.start;
  const profile = buf.readUInt8(p + 1);
  const compat = buf.readUInt8(p + 2);
  const level = buf.readUInt8(p + 3);
  const hex = (n) => n.toString(16).padStart(2, "0");
  return { codecs: `${fourcc}.${hex(profile)}${hex(compat)}${hex(level)}`, avc: { profile, constraintFlags: compat, level } };
}

function colrBox(buf, box) {
  const p = box.start;
  const kind = buf.toString("latin1", p, p + 4);
  if (kind !== "nclx" && kind !== "nclc") return { kind };
  return {
    kind,
    primaries: buf.readUInt16BE(p + 4),
    transfer: buf.readUInt16BE(p + 6),
    matrix: buf.readUInt16BE(p + 8),
    fullRange: kind === "nclx" ? Boolean(buf.readUInt8(p + 10) >> 7) : null,
  };
}

const VISUAL_ENTRY = 78; // SampleEntry (8) + VisualSampleEntry fields (70) before the child boxes

function track(buf, trak) {
  const mdia = child(buf, trak, "mdia");
  if (!mdia) return null;
  const hdlr = child(buf, mdia, "hdlr");
  const handler = hdlr ? buf.toString("latin1", hdlr.start + 8, hdlr.start + 12) : "?";
  const minf = child(buf, mdia, "minf");
  const stbl = minf && child(buf, minf, "stbl");
  const stsd = stbl && child(buf, stbl, "stsd");
  const out = { handler };
  if (!stsd) return out;
  const entries = children(buf, stsd.start + 8, stsd.end);
  const entry = entries[0];
  if (!entry) return out;
  out.sampleEntry = entry.type;
  if (handler === "vide") {
    out.width = buf.readUInt16BE(entry.start + 24);
    out.height = buf.readUInt16BE(entry.start + 26);
    const inner = children(buf, entry.start + VISUAL_ENTRY, entry.end);
    const hvcC = inner.find((b) => b.type === "hvcC");
    const avcC = inner.find((b) => b.type === "avcC");
    const colr = inner.find((b) => b.type === "colr");
    if (hvcC) Object.assign(out, hevcCodecs(entry.type, buf, hvcC));
    else if (avcC) Object.assign(out, avcCodecs(entry.type, buf, avcC));
    if (colr) out.colr = colrBox(buf, colr);
  }
  return out;
}

/** Box-level facts about an MP4 file. */
export function mp4Info(file) {
  const fd = fs.openSync(file, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const boxes = topLevelBoxes(fd, size);
    const order = boxes.map((b) => b.type);
    const moovAt = order.indexOf("moov");
    const mdatAt = order.indexOf("mdat");
    const info = {
      brand: null,
      order,
      faststart: moovAt >= 0 && (mdatAt < 0 || moovAt < mdatAt),
      truncated: boxes.some((b) => b.truncated),
      tracks: [],
    };
    const ftyp = boxes.find((b) => b.type === "ftyp");
    if (ftyp) info.brand = readAt(fd, ftyp.offset + ftyp.header, 4).toString("latin1");
    const moov = boxes.find((b) => b.type === "moov" && !b.truncated);
    if (moov && moov.size <= MAX_MOOV) {
      const buf = readAt(fd, moov.offset, moov.size);
      const root = { start: moov.header, end: moov.size };
      for (const trak of children(buf, root.start, root.end).filter((b) => b.type === "trak")) {
        const t = track(buf, trak);
        if (t) info.tracks.push(t);
      }
    }
    info.video = info.tracks.find((t) => t.handler === "vide") ?? null;
    return info;
  } finally {
    fs.closeSync(fd);
  }
}

/** Pixel size and format of an AVIF or WebP file. */
export function imageInfo(file) {
  const fd = fs.openSync(file, "r");
  try {
    const size = fs.fstatSync(fd).size;
    const head = readAt(fd, 0, Math.min(size, 64));
    if (head.toString("latin1", 0, 4) === "RIFF" && head.toString("latin1", 8, 12) === "WEBP") {
      const chunk = head.toString("latin1", 12, 16);
      if (chunk === "VP8X") return { format: "webp", width: 1 + head.readUIntLE(24, 3), height: 1 + head.readUIntLE(27, 3) };
      if (chunk === "VP8 ") return { format: "webp", width: head.readUInt16LE(26) & 0x3fff, height: head.readUInt16LE(28) & 0x3fff };
      if (chunk === "VP8L") {
        const bits = head.readUInt32LE(21);
        return { format: "webp", width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
      }
      return { format: "webp", error: `unknown WebP chunk ${chunk}` };
    }
    if (head.toString("latin1", 4, 8) === "ftyp") {
      const boxes = topLevelBoxes(fd, size);
      const ftyp = boxes.find((b) => b.type === "ftyp");
      const brand = readAt(fd, ftyp.offset + ftyp.header, 4).toString("latin1");
      const meta = boxes.find((b) => b.type === "meta");
      if (!meta || meta.size > MAX_MOOV) return { format: brand, error: "no meta box" };
      const buf = readAt(fd, meta.offset, meta.size);
      const metaBox = { start: meta.header + 4, end: meta.size }; // meta is a full box
      const iprp = child(buf, metaBox, "iprp");
      const ipco = iprp && child(buf, iprp, "ipco");
      const ispe = ipco && child(buf, ipco, "ispe");
      if (!ispe) return { format: brand, error: "no ispe box" };
      return { format: brand === "avif" || brand === "avis" ? "avif" : brand, width: buf.readUInt32BE(ispe.start + 4), height: buf.readUInt32BE(ispe.start + 8) };
    }
    return { format: "unknown", error: "not an AVIF or WebP file" };
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * Does an HEVC codecs string fit under the declared one ("hvc1.1.6.L120.90")? Same sample entry and profile, a Main
 * compatibility flag, main tier, and a level no higher than the declared level.
 */
export function hevcFits(actual, declared) {
  const parse = (s) => {
    const m = /^(hvc1|hev1)\.([ABC]?)(\d+)\.([0-9A-F]+)\.([LH])(\d+)((?:\.[0-9A-F]{1,2})*)$/i.exec(s ?? "");
    return m && { fourcc: m[1], space: m[2], profile: +m[3], compat: parseInt(m[4], 16), tier: m[5].toUpperCase(), level: +m[6], constraints: m[7].slice(1).toUpperCase() };
  };
  const a = parse(actual);
  const d = parse(declared);
  if (!a || !d) return { ok: false, why: `cannot read ${actual}` };
  if (a.fourcc !== d.fourcc) return { ok: false, why: `sample entry ${a.fourcc}, the page declares ${d.fourcc} (Safari needs hvc1)` };
  if (a.space !== d.space || a.profile !== d.profile) return { ok: false, why: `profile ${a.space}${a.profile}, the page declares ${d.space}${d.profile}` };
  if (!(a.compat & d.compat)) return { ok: false, why: `compatibility flags ${a.compat.toString(16)} miss the declared ${d.compat.toString(16)}` };
  if (a.tier === "H" && d.tier === "L") return { ok: false, why: "high tier, the page declares main tier" };
  if (a.level > d.level) return { ok: false, why: `level ${a.level / 30} is above the declared ${d.level / 30}` };
  return { ok: true, constraintsDiffer: a.constraints !== d.constraints };
}

/** Does an AVC codecs string fit under the declared one ("avc1.640028")? Same profile, level no higher. */
export function avcFits(actual, declared) {
  const parse = (s) => {
    const m = /^(avc1|avc3)\.([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(s ?? "");
    return m && { fourcc: m[1], profile: parseInt(m[2], 16), flags: parseInt(m[3], 16), level: parseInt(m[4], 16) };
  };
  const a = parse(actual);
  const d = parse(declared);
  if (!a || !d) return { ok: false, why: `cannot read ${actual}` };
  if (a.fourcc !== d.fourcc) return { ok: false, why: `sample entry ${a.fourcc}, the page declares ${d.fourcc}` };
  if (a.profile !== d.profile) return { ok: false, why: `profile_idc ${a.profile}, the page declares ${d.profile}` };
  if (a.level > d.level) return { ok: false, why: `level ${a.level / 10} is above the declared ${d.level / 10}` };
  return { ok: true, constraintsDiffer: a.flags !== d.flags };
}

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FALLBACK_TYPES = { hevc: "hvc1.1.6.L120.90", h264: "avc1.640028" };

/**
 * The codecs strings the page declares in <source type>, read from src/lib/media.ts VIDEO_TYPES (one source of truth).
 * Returns {hevc, h264, from}; falls back to the strings MASTER_PLAN §5.5 gives if media.ts can't be read.
 */
export function pageCodecs() {
  try {
    const text = fs.readFileSync(path.join(REPO, "src/lib/media.ts"), "utf8");
    const hevc = /hevc:\s*'video\/mp4; codecs="([^"]+)"'/.exec(text)?.[1];
    const h264 = /h264:\s*'video\/mp4; codecs="([^"]+)"'/.exec(text)?.[1];
    if (hevc && h264) return { hevc, h264, from: "src/lib/media.ts" };
  } catch {
    // fall through
  }
  return { ...FALLBACK_TYPES, from: "MASTER_PLAN §5.5 (src/lib/media.ts unreadable)" };
}

/** Does the file's video track fit the codecs string the page declares for its codec? {ok, actual, declared, why} */
export function fitsPage(info) {
  const actual = info.video?.codecs;
  if (!actual) return { ok: false, actual: null, declared: null, why: "no hvcC/avcC box in the video track" };
  const types = pageCodecs();
  const isHevc = /^(hvc1|hev1)\./.test(actual);
  const declared = isHevc ? types.hevc : types.h264;
  const result = isHevc ? hevcFits(actual, declared) : avcFits(actual, declared);
  return { ...result, actual, declared };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [command, file] = process.argv.slice(2);
  if (!file || !["codecs", "info", "fits"].includes(command)) {
    console.error("usage: node tools/encode/mp4.mjs codecs|info|fits <file>");
    process.exit(2);
  }
  const info = /\.(avif|webp)$/i.test(file) ? imageInfo(file) : mp4Info(file);
  if (command === "info") console.log(JSON.stringify(info, null, 2));
  else if (command === "fits") {
    const fit = fitsPage(info);
    console.log(fit.ok ? `${fit.actual} fits the page's ${fit.declared}` : `${fit.actual ?? "?"} does not fit the page's ${fit.declared ?? "?"}: ${fit.why}`);
    process.exit(fit.ok ? 0 : 1);
  } else if (info.video?.codecs) console.log(info.video.codecs);
  else {
    console.error(`mp4.mjs: no video codecs string in ${file}`);
    process.exit(1);
  }
}
