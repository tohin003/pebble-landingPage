// The film's own files come from /media/v2 since the energetic recut; its poster, the teaser and the loops stay in
// /media/v1 (OVERRIDES §35 decision 8). media.ts caches the build's file list (PEBBLE_MEDIA_FILES) on first use, so each
// case runs media.ts in its own Bun process with its own list. Run: bun test ./src/lib
import { describe, expect, test } from "bun:test";
import path from "node:path";

const MEDIA_TS = path.join(import.meta.dir, "media.ts");

type Source = { src: string; codec: string; available: boolean };
type File = { src: string; available: boolean };
type Manifest = {
  film: {
    sources: Record<"720" | "1080", Source[]>;
    captions: File;
    chapters: File;
    descriptions: File;
    poster: { avif: File; webp: File; available: boolean };
    available: boolean;
  };
  teaser: { sources: Source[]; poster: { avif: File } };
  loop: { sources: Source[]; poster: { avif: File } };
};

function manifest(files: readonly string[]): Manifest {
  const code = `const m = await import(${JSON.stringify(MEDIA_TS)});
console.log(JSON.stringify({ film: m.filmMedia(), teaser: m.teaserMedia(), loop: m.loopMedia("memory") }));`;
  const run = Bun.spawnSync([process.execPath, "-e", code], { env: { ...process.env, PEBBLE_MEDIA_FILES: JSON.stringify(files) } });
  if (run.exitCode !== 0) throw new Error(run.stderr.toString());
  return JSON.parse(run.stdout.toString()) as Manifest;
}

const V2_FILM = ["film-1080.hevc.mp4", "film-1080.h264.mp4", "film-720.hevc.mp4", "film-720.h264.mp4", "film.en.vtt", "film.chapters.vtt", "film.descriptions.en.vtt"];
const V1_REST = ["film.poster.avif", "film.poster.webp", "teaser-720.hevc.mp4", "teaser-720.h264.mp4", "teaser.poster.avif", "loop-memory.hevc.mp4", "loop-memory.h264.mp4", "loop-memory.poster.avif"];

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

  test("the film's poster, the teaser and the loops stay in /media/v1", () => {
    const { film, teaser, loop } = manifest([...V2_FILM.map((f) => `/media/v2/${f}`), ...V1_REST.map((f) => `/media/v1/${f}`)]);
    expect(film.poster.avif.src).toBe("/media/v1/film.poster.avif");
    expect(film.poster.available).toBe(true);
    expect(teaser.sources.map((s) => s.src)).toEqual(["/media/v1/teaser-720.hevc.mp4", "/media/v1/teaser-720.h264.mp4"]);
    expect(teaser.poster.avif.src).toBe("/media/v1/teaser.poster.avif");
    expect(loop.sources.map((s) => s.src)).toEqual(["/media/v1/loop-memory.hevc.mp4", "/media/v1/loop-memory.h264.mp4"]);
    expect(loop.poster.avif.src).toBe("/media/v1/loop-memory.poster.avif");
  });

  test("a film file left in /media/v1 is never served as the film", () => {
    const { film } = manifest([...V2_FILM.map((f) => `/media/v1/${f}`), ...V1_REST.map((f) => `/media/v1/${f}`)]);
    expect(film.sources["1080"]).toEqual([]);
    expect(film.sources["720"]).toEqual([]);
    expect(film.captions.available).toBe(false);
    expect(film.available).toBe(false);
  });
});
