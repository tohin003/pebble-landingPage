// The film's own files: the 1.x trailer's in /media/v2 (its videos, the 1:1 cut for phones, its text tracks and its
// poster, the 16:9 film's frame 0; OVERRIDES §35 decision 8, §46), and the Pebble 2.0 launch film's in /media/v3 (its
// videos, the 4:5 `film-phone` cut, its tracks and two posters; SITE_AUDIT §4.4, the director's X7 and X15), which the
// page plays as soon as one of its 16:9 files exists. The 1.x loops stay in /media/v1; the 2.0 loops are in /media/v3,
// under their own ids. The first film's poster and its teaser T0 are retired. media.ts caches the build's file list
// (PEBBLE_MEDIA_FILES) on first use, so each case runs media.ts in its own Bun process with its own list.
// Run: bun test ./src/lib
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
    phoneFrame: { width: number; height: number };
    phonePoster?: { avif: File; webp: File; width: number; height: number; available: boolean };
    set: "launch" | "trailer";
    available: boolean;
  };
  hasTeaser: boolean;
  loop: { sources: Source[]; poster: { avif: File } };
  launchLoops: Record<string, { id: string; width: number; height: number; sources: Source[]; phoneSources: Source[]; poster: { avif: File; webp: File; available: boolean }; available: boolean; showable: boolean }>;
  launchStill: { files: { light: Record<"1200" | "2400", { avif: File }> }; available: boolean };
  v1Still: { files: { light: Record<"1200" | "2400", { avif: File }> } };
};

function manifest(files: readonly string[]): Manifest {
  const code = `const m = await import(${JSON.stringify(MEDIA_TS)});
const launchLoops = Object.fromEntries(m.LAUNCH_LOOP_IDS.map((id) => { const l = m.launchLoopMedia(id); return [id, { ...l, showable: m.loopShowable(l) }]; }));
console.log(JSON.stringify({ film: m.filmMedia(), hasTeaser: "teaserMedia" in m, loop: m.loopMedia("memory"), launchLoops, launchStill: m.launchUiStill("settings-memory"), v1Still: m.uiStill("settings-memory") }));`;
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

/** What the launch lane puts in public/media/v3 for the film (SITE_AUDIT §4.4, §4.5). */
const V3_FILM = [
  "film-1080.hevc.mp4",
  "film-1080.h264.mp4",
  "film-720.hevc.mp4",
  "film-720.h264.mp4",
  "film-phone.hevc.mp4",
  "film-phone.h264.mp4",
  "film.en.vtt",
  "film.chapters.vtt",
  "film.descriptions.en.vtt",
  "film.poster.avif",
  "film.poster.webp",
  "film-phone.poster.avif",
  "film-phone.poster.webp",
];
const at = (folder: string, names: readonly string[]) => names.map((f) => `/media/${folder}/${f}`);

describe("the Pebble 2.0 launch film in /media/v3", () => {
  test("until a 16:9 launch file exists, the page plays the 1.x trailer exactly as before", () => {
    // tracks, posters and the phone cut alone don't switch the film: its 16:9 files decide
    const early = at("v3", V3_FILM.filter((f) => !/^film-(1080|720)\./.test(f)));
    const { film } = manifest([...at("v2", V2_FILM), ...early]);
    expect(film.set).toBe("trailer");
    expect(film.sources["1080"].map((s) => s.src)).toEqual(["/media/v2/film-1080.hevc.mp4", "/media/v2/film-1080.h264.mp4"]);
    expect(film.phoneSources.map((s) => s.src)).toEqual(["/media/v2/film-square.hevc.mp4", "/media/v2/film-square.h264.mp4"]);
    expect(film.phoneFrame).toEqual({ width: 1080, height: 1080 });
    expect(film.phonePoster).toBeUndefined();
    expect(film.captions.src).toBe("/media/v2/film.en.vtt");
    expect(film.poster.avif.src).toBe("/media/v2/film.poster.avif");
  });

  test("with its files, the launch film comes whole from /media/v3: videos, tracks and the 16:9 poster", () => {
    const { film } = manifest([...at("v2", V2_FILM), ...at("v3", V3_FILM)]);
    expect(film.set).toBe("launch");
    expect(film.sources["1080"].map((s) => s.src)).toEqual(["/media/v3/film-1080.hevc.mp4", "/media/v3/film-1080.h264.mp4"]);
    expect(film.sources["720"].map((s) => s.src)).toEqual(["/media/v3/film-720.hevc.mp4", "/media/v3/film-720.h264.mp4"]);
    for (const track of [film.captions, film.chapters, film.descriptions]) {
      expect(track.src.startsWith("/media/v3/")).toBe(true);
      expect(track.available).toBe(true);
    }
    expect(film.poster.webp.src).toBe("/media/v3/film.poster.webp");
    expect([film.poster.width, film.poster.height]).toEqual([1920, 1080]);
    expect(film.available).toBe(true);
  });

  test("phones get the 4:5 film-phone (1080 × 1350) with its own poster, never the trailer's square", () => {
    const { film } = manifest([...at("v2", V2_FILM), ...at("v3", V3_FILM)]);
    expect(film.phoneSources.map((s) => s.src)).toEqual(["/media/v3/film-phone.hevc.mp4", "/media/v3/film-phone.h264.mp4"]);
    expect(film.phoneFrame).toEqual({ width: 1080, height: 1350 });
    expect(film.phonePoster?.webp.src).toBe("/media/v3/film-phone.poster.webp");
    expect([film.phonePoster?.width, film.phonePoster?.height]).toEqual([1080, 1350]);
    const noPhone = manifest([...at("v2", V2_FILM), ...at("v3", V3_FILM.filter((f) => !f.startsWith("film-phone")))]).film;
    expect(noPhone.set).toBe("launch");
    expect(noPhone.phoneSources).toEqual([]); // the phone plays the 16:9 film then (filmSourceOrder)
  });
});

describe("the Pebble 2.0 loops in /media/v3", () => {
  const ids = ["desk", "mac-apps", "mac-actions", "mac-web", "guard", "workshop", "memory", "long-tasks", "remote", "stealth"];

  test("the director's ten ids, each read from /media/v3 only, never from a 1.x file of the same name", () => {
    const { launchLoops, loop } = manifest(at("v1", ["loop-memory.hevc.mp4", "loop-memory.h264.mp4", "loop-memory.poster.avif"]));
    expect(Object.keys(launchLoops)).toEqual(ids);
    expect(launchLoops.memory!.available).toBe(false);
    expect(launchLoops.memory!.showable).toBe(false);
    expect(loop.sources.length).toBe(2); // the 1.x memory loop is still there for the 1.x slot
    for (const id of ids) {
      const l = launchLoops[id]!;
      expect(l.poster.avif.src).toBe(`/media/v3/loop-${id}.poster.avif`);
      expect(l.showable).toBe(false); // nothing rendered: every slot falls back
    }
  });

  test("frames: 16:10 at 1600 × 1000, Pebble Remote's iPhone recording at 4:5", () => {
    const { launchLoops } = manifest([]);
    for (const id of ids) {
      const l = launchLoops[id]!;
      expect([l.width, l.height]).toEqual(id === "remote" ? [1080, 1350] : [1600, 1000]);
    }
  });

  test("a loop shows from its poster alone, plays from its video, and finds its 4:5 cut", () => {
    const files = at("v3", ["loop-guard.poster.avif", "loop-workshop.hevc.mp4", "loop-workshop.h264.mp4", "loop-workshop-phone.h264.mp4"]);
    const { launchLoops } = manifest(files);
    expect(launchLoops.guard!.showable).toBe(true);
    expect(launchLoops.guard!.available).toBe(false);
    expect(launchLoops.workshop!.available).toBe(true);
    expect(launchLoops.workshop!.sources.map((s) => s.src)).toEqual(["/media/v3/loop-workshop.hevc.mp4", "/media/v3/loop-workshop.h264.mp4"]);
    expect(launchLoops.workshop!.phoneSources.map((s) => s.src)).toEqual(["/media/v3/loop-workshop-phone.h264.mp4"]);
  });

  test("Pebble 2.0.x stills come from /ui/v2, with /ui/v1's names and sizes", () => {
    const { launchStill, v1Still } = manifest(["/ui/v2/settings-memory-light-2400.avif"]);
    expect(launchStill.files.light["2400"].avif.src).toBe("/ui/v2/settings-memory-light-2400.avif");
    expect(launchStill.files.light["1200"].avif.src).toBe("/ui/v2/settings-memory-light-1200.avif");
    expect(launchStill.available).toBe(true);
    expect(v1Still.files.light["2400"].avif.src).toBe("/ui/v1/settings-memory-light-2400.avif");
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
    phoneFrame: { width: 1080, height: 1080 },
    set: "trailer",
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
