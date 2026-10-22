// The media manifest: every film, loop, poster, caption and still the page may use, with its public path and whether
// the file exists (MASTER_PLAN §5.3, §5.5; critic H3, H5, C6). Use it from server components and pass the entries to
// client components as props.
//
// `available` is decided at build time: next.config.ts lists the files under public/media/v1 and public/ui/v1 when the
// build starts and inlines the list as process.env.PEBBLE_MEDIA_FILES. (An `fs` check here would run again inside
// Vercel's functions on each hourly revalidation, where public/ isn't on disk, and would hide every video.) Media that
// isn't rendered yet degrades to its poster or a still, never to a broken player. Paths are versioned (/v1/); a
// re-render goes to v2/, because /media/v1 and /ui/v1 are cached as immutable for a year.

export type MediaFile = Readonly<{ src: string; available: boolean }>;

export type VideoCodec = "hevc" | "h264";

export type VideoSource = Readonly<{ src: string; type: string; codec: VideoCodec; available: boolean }>;

/** A poster or still in AVIF and WebP (sharp output: tools/assets). */
export type ImageSet = Readonly<{
  avif: MediaFile;
  webp: MediaFile;
  width: number;
  height: number;
  available: boolean;
}>;

export type LoopId =
  | "companion"
  | "models"
  | "approve-undo"
  | "isolated-tests"
  | "review-commands"
  | "agentguard"
  | "memory"
  | "views";

export type LoopMedia = Readonly<{
  id: LoopId;
  width: number;
  height: number;
  /** HEVC first, then H.264 (MASTER_PLAN §5.5); only the available ones */
  sources: readonly VideoSource[];
  /** 4:5 punch-ins for phones (critic H2); empty until rendered, and then phones show the poster and the caption */
  phoneSources: readonly VideoSource[];
  poster: ImageSet;
  available: boolean;
}>;

export type FilmQuality = "720" | "1080";

export type FilmMedia = Readonly<{
  /** per quality, HEVC first, then H.264; only the available ones */
  sources: Readonly<Record<FilmQuality, readonly VideoSource[]>>;
  captions: MediaFile;
  chapters: MediaFile;
  /** text descriptions for the audio-description toggle (critic H4a) */
  descriptions: MediaFile;
  poster: ImageSet;
  available: boolean;
}>;

export type TeaserMedia = Readonly<{
  sources: readonly VideoSource[];
  poster: ImageSet;
  available: boolean;
}>;

/** The two codecs, as <source type> strings: HEVC level 4.0 covers 720p and 1080p at 30 fps; H.264 High 4.0. */
export const VIDEO_TYPES: Readonly<Record<VideoCodec, string>> = {
  hevc: 'video/mp4; codecs="hvc1.1.6.L120.90"',
  h264: 'video/mp4; codecs="avc1.640028"',
};

const MEDIA = "/media/v1";
const UI = "/ui/v1";

let known: ReadonlySet<string> | null = null;

/** The files that exist under public/media/v1 and public/ui/v1, as listed by next.config.ts at build time. */
function knownFiles(): ReadonlySet<string> {
  if (!known) {
    let list: unknown = [];
    try {
      list = JSON.parse(process.env.PEBBLE_MEDIA_FILES ?? "[]");
    } catch {
      list = [];
    }
    known = new Set(Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : []);
  }
  return known;
}

export function mediaFile(src: string): MediaFile {
  return { src, available: knownFiles().has(src) };
}

function imageSet(base: string, width: number, height: number): ImageSet {
  const avif = mediaFile(`${base}.avif`);
  const webp = mediaFile(`${base}.webp`);
  return { avif, webp, width, height, available: avif.available || webp.available };
}

function videoSources(base: string): VideoSource[] {
  return (["hevc", "h264"] as const)
    .map((codec) => ({ src: `${base}.${codec}.mp4`, type: VIDEO_TYPES[codec], codec, available: knownFiles().has(`${base}.${codec}.mp4`) }))
    .filter((source) => source.available);
}

export function loopMedia(id: LoopId): LoopMedia {
  const sources = videoSources(`${MEDIA}/loop-${id}`);
  return {
    id,
    width: 1600,
    height: 1000,
    sources,
    phoneSources: videoSources(`${MEDIA}/loop-${id}-phone`),
    poster: imageSet(`${MEDIA}/loop-${id}.poster`, 1600, 1000),
    available: sources.length > 0,
  };
}

export function filmMedia(): FilmMedia {
  const sources = { "720": videoSources(`${MEDIA}/film-720`), "1080": videoSources(`${MEDIA}/film-1080`) };
  return {
    sources,
    captions: mediaFile(`${MEDIA}/film.en.vtt`),
    chapters: mediaFile(`${MEDIA}/film.chapters.vtt`),
    descriptions: mediaFile(`${MEDIA}/film.descriptions.en.vtt`),
    poster: imageSet(`${MEDIA}/film.poster`, 1920, 1080),
    available: sources["720"].length > 0 || sources["1080"].length > 0,
  };
}

export function teaserMedia(): TeaserMedia {
  const sources = videoSources(`${MEDIA}/teaser-720`);
  return { sources, poster: imageSet(`${MEDIA}/teaser.poster`, 1280, 720), available: sources.length > 0 };
}

export type Theme = "light" | "dark";

/** The riverbed wallpaper from design comp 2 (16:10), rasterised by tools/assets/wallpaper.mjs. */
export function wallpaper(theme: Theme): Readonly<{ x1: ImageSet; x2: ImageSet }> {
  return {
    x1: imageSet(`${MEDIA}/wallpaper-${theme}-1600`, 1600, 1000),
    x2: imageSet(`${MEDIA}/wallpaper-${theme}-3200`, 3200, 2000),
  };
}

/** A real-UI still from lane D (tools/assets/stills.mjs): `public/ui/v1/<name>-<theme>-<1200|2400>.<avif|webp>`. */
export type UiStillName =
  | "main-done"
  | "main-approval"
  | "held-unverified"
  | "main-challenge"
  | "settings-permissions"
  | "settings-models"
  | "settings-memory"
  | "main-quiz"
  | "main-dashboard";

export const UI_STILL_WIDTHS = [1200, 2400] as const;

export type UiStill = Readonly<{
  name: string;
  /** 16:10, from the 1440 × 900 capture window */
  width: number;
  height: number;
  files: Readonly<Record<Theme, Readonly<Record<(typeof UI_STILL_WIDTHS)[number], ImageSet>>>>;
  available: boolean;
}>;

export function uiStill(name: UiStillName | (string & {})): UiStill {
  const files = {
    light: { 1200: imageSet(`${UI}/${name}-light-1200`, 1200, 750), 2400: imageSet(`${UI}/${name}-light-2400`, 2400, 1500) },
    dark: { 1200: imageSet(`${UI}/${name}-dark-1200`, 1200, 750), 2400: imageSet(`${UI}/${name}-dark-2400`, 2400, 1500) },
  };
  return { name, width: 2400, height: 1500, files, available: files.light[2400].available || files.light[1200].available };
}
