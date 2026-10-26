// The film's own files come from /media/v2: its videos (with the 1:1 cut for phones), its text tracks and, since the
// trailer, its poster, the 16:9 film's frame 0 (OVERRIDES §35 decision 8, §46). The first film's poster and its teaser
// T0 are retired; the loops stay in /media/v1. media.ts caches the build's file list (PEBBLE_MEDIA_FILES) on first use,
// so each case runs media.ts in its own Bun process with its own list. Run: bun test ./src/lib
import { describe, expect, test } from "bun:test";
import path from "node:path";
import { FILM_PHONE_QUERY, HD_PIXELS, filmSourceOrder, isPhoneSource } from "./filmSources";
import type { FilmMedia, VideoSource } from "./media";

const MEDIA_TS = path.join(import.meta.dir, "media.ts");

type Source = { src: string; codec: string; type: string; available: boolean };
type File = { src: string; available: boolean };
type Manifest = {
  film: {
    sources: Record<"720" | "1080", Source[]>;
    phoneSources: Source[];
    captions: File;
    chapters: File;
    descriptions: File;
    poster: { avif: File; webp: File; width: number; height: number; available: boolean };
    available: boolean;
  };
  hasTeaser: boolean;
  loop: { sources: Source[]; poster: { avif: File } };
};

function manifest(files: readonly string[]): Manifest {
  const code = `const m = await import(${JSON.stringify(MEDIA_TS)});
console.log(JSON.stringify({ film: m.filmMedia(), hasTeaser: "teaserMedia" in m, loop: m.loopMedia("memory") }));`;
  const run = Bun.spawnSync([process.execPath, "-e", code], { env: { ...process.env, PEBBLE_MEDIA_FILES: JSON.stringify(files) } });
  if (run.exitCode !== 0) throw new Error(run.stderr.toString());
  return JSON.parse(run.stdout.toString()) as Manifest;
}

/** What the re-delivery lane puts in public/media/v2 (the square film's HEVC twin only if the 45 MB budget allows). */
const V2_FILM = [
  "film-1080.hevc.mp4",
  "film-1080.h264.mp4",
  "film-720.hevc.mp4",
  "film-720.h264.mp4",
  "film-square.hevc.mp4",
  "film-square.h264.mp4",
  "film.en.vtt",
  "film.chapters.vtt",
  "film.descriptions.en.vtt",
  "film.poster.avif",
  "film.poster.webp",
];
const V1_REST = ["loop-memory.hevc.mp4", "loop-memory.h264.mp4", "loop-memory.poster.avif"];
/** The retired files: the first film's poster and T0. A build that still lists them must not serve them. */
const V1_RETIRED = ["film.poster.avif", "film.poster.webp", "teaser-720.hevc.mp4", "teaser-720.h264.mp4", "teaser.poster.avif", "teaser.poster.webp"];

describe("the media manifest's versioned folders", () => {
  test("the film's videos and text tracks come from /media/v2, HEVC first", () => {
    const { film } = manifest([...V2_FILM.map((f) => `/media/v2/${f}`), ...V1_REST.map((f) => `/media/v1/${f}`)]);
    expect(film.sources["1080"].map((s) => s.src)).toEqual(["/media/v2/film-1080.hevc.mp4", "/media/v2/film-1080.h264.mp4"]);
    expect(film.sources["720"].map((s) => s.src)).toEqual(["/media/v2/film-720.hevc.mp4", "/media/v2/film-720.h264.mp4"]);
    for (const track of [film.captions, film.chapters, film.descriptions]) {
      expect(track.src.startsWith("/media/v2/")).toBe(true);
      expect(track.available).toBe(true);
    }
    expect(film.available).toBe(true);
  });

  test("the poster is the trailer's own, from /media/v2, 1920 × 1080", () => {
    const { film } = manifest([...V2_FILM.map((f) => `/media/v2/${f}`), ...V1_RETIRED.map((f) => `/media/v1/${f}`)]);
    expect(film.poster.avif.src).toBe("/media/v2/film.poster.avif");
    expect(film.poster.webp.src).toBe("/media/v2/film.poster.webp");
    expect([film.poster.width, film.poster.height]).toEqual([1920, 1080]);
    expect(film.poster.available).toBe(true);
  });

  test("the first film's poster and the teaser T0 are retired: nothing reads them", () => {
    const { film, hasTeaser } = manifest([...V1_RETIRED.map((f) => `/media/v1/${f}`), "/media/v2/film-720.h264.mp4"]);
    expect(hasTeaser).toBe(false);
    expect(film.poster.available).toBe(false);
    expect(film.poster.webp.src.startsWith("/media/v1/")).toBe(false);
  });

  test("the 1:1 film for phones comes from /media/v2, HEVC first, and only when it exists", () => {
    const both = manifest(V2_FILM.map((f) => `/media/v2/${f}`)).film;
    expect(both.phoneSources.map((s) => s.src)).toEqual(["/media/v2/film-square.hevc.mp4", "/media/v2/film-square.h264.mp4"]);
    expect(both.phoneSources.map((s) => s.type)).toEqual(['video/mp4; codecs="hvc1.1.6.L120.90"', 'video/mp4; codecs="avc1.640028"']);
    const h264 = manifest(V2_FILM.filter((f) => f !== "film-square.hevc.mp4").map((f) => `/media/v2/${f}`)).film;
    expect(h264.phoneSources.map((s) => s.src)).toEqual(["/media/v2/film-square.h264.mp4"]);
    const none = manifest(V2_FILM.filter((f) => !f.startsWith("film-square")).map((f) => `/media/v2/${f}`)).film;
    expect(none.phoneSources).toEqual([]);
    expect(none.available).toBe(true);
  });

  test("the loops stay in /media/v1", () => {
    const { loop } = manifest([...V2_FILM.map((f) => `/media/v2/${f}`), ...V1_REST.map((f) => `/media/v1/${f}`)]);
    expect(loop.sources.map((s) => s.src)).toEqual(["/media/v1/loop-memory.hevc.mp4", "/media/v1/loop-memory.h264.mp4"]);
    expect(loop.poster.avif.src).toBe("/media/v1/loop-memory.poster.avif");
  });

  test("a film file left in /media/v1 is never served as the film", () => {
    const { film } = manifest([...V2_FILM.map((f) => `/media/v1/${f}`), ...V1_REST.map((f) => `/media/v1/${f}`)]);
    expect(film.sources["1080"]).toEqual([]);
    expect(film.sources["720"]).toEqual([]);
    expect(film.phoneSources).toEqual([]);
    expect(film.captions.available).toBe(false);
    expect(film.poster.available).toBe(false);
    expect(film.available).toBe(false);
  });
});

describe("the order the theatre tries the film's files in (filmSources.ts)", () => {
  const source = (src: string, codec: "hevc" | "h264"): VideoSource => ({
    src,
    codec,
    type: codec === "hevc" ? 'video/mp4; codecs="hvc1.1.6.L120.90"' : 'video/mp4; codecs="avc1.640028"',
    available: true,
  });
  const file = { src: "", available: true };
  const film: FilmMedia = {
    sources: {
      "1080": [source("/v2/film-1080.hevc.mp4", "hevc"), source("/v2/film-1080.h264.mp4", "h264")],
      "720": [source("/v2/film-720.hevc.mp4", "hevc"), source("/v2/film-720.h264.mp4", "h264")],
    },
    phoneSources: [source("/v2/film-square.hevc.mp4", "hevc"), source("/v2/film-square.h264.mp4", "h264")],
    captions: file,
    chapters: file,
    descriptions: file,
    poster: { avif: file, webp: file, width: 1920, height: 1080, available: true },
    available: true,
  };
  const all = () => true;
  const noHevc = (type: string) => !type.includes("hvc1");
  const srcs = (list: VideoSource[]) => list.map((s) => s.src);

  test("phones get the 1:1 film first, then the 16:9 files as fallbacks", () => {
    expect(srcs(filmSourceOrder(film, { phone: true, hd: false, canPlay: all }))).toEqual([
      "/v2/film-square.hevc.mp4",
      "/v2/film-square.h264.mp4",
      "/v2/film-720.hevc.mp4",
      "/v2/film-720.h264.mp4",
      "/v2/film-1080.hevc.mp4",
      "/v2/film-1080.h264.mp4",
    ]);
    expect(srcs(filmSourceOrder(film, { phone: true, hd: false, canPlay: noHevc }))).toEqual(["/v2/film-square.h264.mp4", "/v2/film-720.h264.mp4", "/v2/film-1080.h264.mp4"]);
  });

  test("wider screens never get the 1:1 film; HD screens get 1080p first", () => {
    const hd = srcs(filmSourceOrder(film, { phone: false, hd: true, canPlay: all }));
    expect(hd[0]).toBe("/v2/film-1080.hevc.mp4");
    expect(hd.some((s) => s.includes("square"))).toBe(false);
    expect(srcs(filmSourceOrder(film, { phone: false, hd: false, canPlay: noHevc }))).toEqual(["/v2/film-720.h264.mp4", "/v2/film-1080.h264.mp4"]);
  });

  test("a phone without the 1:1 film plays the 16:9 one", () => {
    expect(srcs(filmSourceOrder({ ...film, phoneSources: [] }, { phone: true, hd: false, canPlay: all }))[0]).toBe("/v2/film-720.hevc.mp4");
  });

  test("the square screen follows the source, and the breakpoint is the page's", () => {
    expect(isPhoneSource(film, film.phoneSources[1]!)).toBe(true);
    expect(isPhoneSource(film, film.sources["720"][0]!)).toBe(false);
    expect(isPhoneSource(film, null)).toBe(false);
    expect(FILM_PHONE_QUERY).toBe("(max-width: 560px)");
    expect(HD_PIXELS).toBe(1700);
  });
});
