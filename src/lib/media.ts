// The media manifest: every film, loop, poster, caption and still the page may use, with its public path and whether
// the file exists (MASTER_PLAN §5.3, §5.5; critic H3, H5, C6). Use it from server components and pass the entries to
// client components as props.
//
// `available` is decided at build time: next.config.ts lists the files under public/media/v1, public/media/v2 and
// public/ui/v1 when the build starts and inlines the list as process.env.PEBBLE_MEDIA_FILES. (An `fs` check here would
// run again inside Vercel's functions on each hourly revalidation, where public/ isn't on disk, and would hide every
// video.) Media that isn't rendered yet degrades to its poster or a still, never to a broken player. Paths are
// versioned (/v1/); a re-render goes to v2/, because /media/v1 and /ui/v1 are cached as immutable for a year. The
// launch trailer is one: its videos (with a 1:1 cut for phones), its text tracks and its poster (the 16:9 film's own
// frame 0) are in /media/v2 (FILM_MEDIA); the loops and the wallpaper stay in /media/v1. The first film's poster and
// its teaser T0 are retired (OVERRIDES §46: they showed Pebble 1.0.4's rows and a usage line with a rate).

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
  /** the main cut's frame: 16:10 for the wide slots, square for the project story's tile (LOOP_FRAMES) */
  width: number;
  height: number;
  /** HEVC first, then H.264 (MASTER_PLAN §5.5); only the available ones */
  sources: readonly VideoSource[];
  /** 4:5 punch-ins for phones (critic H2, LOOP_PHONE_FRAME); empty until rendered, and then phones show the poster */
  phoneSources: readonly VideoSource[];
  poster: ImageSet;
  /** the 4:5 cut's own poster (its frame 0), shown on phones while the phone cut loads */
  phonePoster?: ImageSet;
  available: boolean;
}>;

/**
 * Each loop's frame, as rendered (video/src/Root.tsx, video/src/stills/LoopPosters.tsx, loops/plans.ts FRAME): 16:10
 * for the wide slots, square for the project story's tile (comp lex-A, lane v2-loops). A poster file has its loop's
 * size, so these also size the posters' srcset.
 */
const LOOP_FRAMES: Readonly<Record<LoopId, Readonly<{ width: number; height: number }>>> = {
  companion: { width: 1600, height: 1000 },
  models: { width: 1600, height: 1000 },
  "approve-undo": { width: 1080, height: 1080 },
  "isolated-tests": { width: 1080, height: 1080 },
  "review-commands": { width: 1600, height: 1000 },
  agentguard: { width: 1600, height: 1000 },
  memory: { width: 1600, height: 1000 },
  views: { width: 1600, height: 1000 },
};

/** Every loop's phone cut (critic H2): 4:5, 1080 × 1350 (loops/plans.ts FRAME.tall). */
export const LOOP_PHONE_FRAME = { width: 1080, height: 1350 } as const;

export type FilmQuality = "720" | "1080";

/** The 1:1 film for phones (OVERRIDES §46 P2-9): at phone width the 16:9 film's interface text is about 5 px, and the
 *  square film keeps it at 11 px or more. Its timing is the 16:9 film's, frame for frame, so the text tracks are shared.
 *  The theatre picks it below FILM_PHONE_QUERY (src/lib/filmSources.ts). */
export const FILM_PHONE_FRAME = { width: 1080, height: 1080 } as const;

export type FilmMedia = Readonly<{
  /** per quality, HEVC first, then H.264; only the available ones */
  sources: Readonly<Record<FilmQuality, readonly VideoSource[]>>;
  /** the 1:1 film for phones (filmSources.ts FILM_PHONE_QUERY), HEVC first, then H.264; only the available ones */
  phoneSources: readonly VideoSource[];
  captions: MediaFile;
  chapters: MediaFile;
  /** text descriptions for the audio-description toggle (critic H4a) */
  descriptions: MediaFile;
  /** the 16:9 film's frame 0 (the trailer's cold open: the pebble's eyes in the right third, the centre dark) */
  poster: ImageSet;
  available: boolean;
}>;

/** The two codecs, as <source type> strings: HEVC level 4.0 covers 720p and 1080p at 30 fps; H.264 High 4.0. */
export const VIDEO_TYPES: Readonly<Record<VideoCodec, string>> = {
  hevc: 'video/mp4; codecs="hvc1.1.6.L120.90"',
  h264: 'video/mp4; codecs="avc1.640028"',
};

const MEDIA = "/media/v1";
/**
 * The film's own files (OVERRIDES §34, §35 decision 8, §46): film-1080 and film-720 (HEVC and H.264), the 1:1
 * film-square for phones (H.264, and HEVC when the budget allows), the three text tracks and film.poster (AVIF and
 * WebP, 1920 × 1080). The loops and the wallpaper didn't change, so they stay in MEDIA. tools/encode/verify.mjs reads
 * this name.
 */
const FILM_MEDIA = "/media/v2";
const UI = "/ui/v1";

let known: ReadonlySet<string> | null = null;

/** The files that exist under public/media/v1, public/media/v2 and public/ui/v1, as listed by next.config.ts at build time. */
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
  const frame = LOOP_FRAMES[id];
  const sources = videoSources(`${MEDIA}/loop-${id}`);
  return {
    id,
    width: frame.width,
    height: frame.height,
    sources,
    phoneSources: videoSources(`${MEDIA}/loop-${id}-phone`),
    poster: imageSet(`${MEDIA}/loop-${id}.poster`, frame.width, frame.height),
    phonePoster: imageSet(`${MEDIA}/loop-${id}-phone.poster`, LOOP_PHONE_FRAME.width, LOOP_PHONE_FRAME.height),
    available: sources.length > 0,
  };
}

export function filmMedia(): FilmMedia {
  const sources = { "720": videoSources(`${FILM_MEDIA}/film-720`), "1080": videoSources(`${FILM_MEDIA}/film-1080`) };
  return {
    sources,
    phoneSources: videoSources(`${FILM_MEDIA}/film-square`),
    captions: mediaFile(`${FILM_MEDIA}/film.en.vtt`),
    chapters: mediaFile(`${FILM_MEDIA}/film.chapters.vtt`),
    descriptions: mediaFile(`${FILM_MEDIA}/film.descriptions.en.vtt`),
    poster: imageSet(`${FILM_MEDIA}/film.poster`, 1920, 1080),
    available: sources["720"].length > 0 || sources["1080"].length > 0,
  };
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
  | "main-dashboard"
  // Pebble 1.1.0, Settings › Privacy and focus, Stealth Lockdown off and on (the 1440 × 900 window; HANDOFF-1.1-captures)
  | "settings-privacy-off"
  | "settings-privacy-on";

export const UI_STILL_WIDTHS = [1200, 2400] as const;

export type UiStill = Readonly<{
  name: string;
  /** at 2400 px wide: 16:10 for the 1440 × 900 capture window (uiStill), a crop's own aspect otherwise (uiCropStill) */
  width: number;
  height: number;
  files: Readonly<Record<Theme, Readonly<Record<(typeof UI_STILL_WIDTHS)[number], ImageSet>>>>;
  available: boolean;
}>;

export function uiStill(name: UiStillName | (string & {})): UiStill {
  return stillFiles(name, 2400, 1500);
}

/**
 * Real-UI stills that are a crop with their own aspect, not the 16:10 window: Pebble 1.1.0's Settings › Privacy and
 * focus section alone, Stealth Lockdown off and on, one frame for both (516 × 372 pt at 5x; HANDOFF-1.1-captures).
 * Their size at 2400 px wide; the 1200 px files are half of it.
 */
const UI_CROP_STILLS = {
  "settings-privacy-card-off": { width: 2400, height: 1730 },
  "settings-privacy-card-on": { width: 2400, height: 1730 },
} as const;

export type UiCropStillName = keyof typeof UI_CROP_STILLS;

/** A crop still's ImageSets at 2400 × 1730 and 1200 × 865, in both themes (the same files and names as uiStill). */
export function uiCropStill(name: UiCropStillName): UiStill {
  const { width, height } = UI_CROP_STILLS[name];
  return stillFiles(name, width, height);
}

function stillFiles(name: string, width: number, height: number): UiStill {
  const half = { width: width / 2, height: Math.round(height / 2) };
  const files = {
    light: {
      1200: imageSet(`${UI}/${name}-light-1200`, half.width, half.height),
      2400: imageSet(`${UI}/${name}-light-2400`, width, height),
    },
    dark: {
      1200: imageSet(`${UI}/${name}-dark-1200`, half.width, half.height),
      2400: imageSet(`${UI}/${name}-dark-2400`, width, height),
    },
  };
  return { name, width, height, files, available: files.light[2400].available || files.light[1200].available };
}
