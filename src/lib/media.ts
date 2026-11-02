// The media manifest: every film, loop, poster, caption and still the page may use, with its public path and whether
// the file exists (MASTER_PLAN §5.3, §5.5; critic H3, H5, C6). Use it from server components and pass the entries to
// client components as props.
//
// `available` is decided at build time: next.config.ts lists the files under public/media/v1 and v3 and public/ui/v1
// and v2 when the build starts and inlines the list as process.env.PEBBLE_MEDIA_FILES. (An `fs` check here would run
// again inside Vercel's functions on each hourly revalidation, where public/ isn't on disk, and would hide every
// video.) Media that isn't rendered yet degrades to its poster or a still, never to a broken player. Paths are
// versioned, because /media/v1, /media/v3 and /ui/v1 are cached as immutable for a year: a re-render goes to a new
// folder, never over an old one.
// - /media/v1 (MEDIA): the 1.x loops and the wallpaper.
// - /media/v2: retired (2 Nov 2026). It held the 1.x launch trailer, its 1:1 cut, tracks and poster; the Pebble 2.0
//   launch film replaced it at the owner's ask, and git history keeps the files. Nothing reads from it.
// - /media/v3 (LAUNCH_MEDIA): the Pebble 2.0 launch (.work/launch/site/SITE_AUDIT.md §4; the director's X7, X15): the
//   film (film-1080 and film-720, 16:9), its 4:5 cut `film-phone` (1080 × 1350) for phones, its three text tracks and
//   two posters, and the 2.0 loops (LaunchLoopId), each with its poster and an optional 4:5 phone cut. The page plays
//   the film once one of its 16:9 files exists (filmMedia), and a 2.0 loop once its file or poster exists
//   (launchLoopMedia; the sections fall back to what they showed before). Publish a v3 file only when it is final: a
//   fix goes to v4.
// - /ui/v1 (UI) and /ui/v2 (UI_LAUNCH): real-UI stills, 1.x and 2.0.x.

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

/**
 * The Pebble 2.0 launch's loops in /media/v3 (SITE_AUDIT §4.2; the director's list): one per feature, silent, real
 * takes or harness scenes of a published release, or a labelled diagram. Their own type, so an id here never reads a
 * 1.x file of the same name (`memory` is in both: /media/v1/loop-memory is the 1.0.4 Settings, /media/v3/loop-memory
 * the 2.0 one).
 */
export type LaunchLoopId =
  | "desk"
  | "mac"
  | "guard"
  | "workshop"
  | "memory"
  | "long-tasks"
  | "remote"
  | "stealth";

export const LAUNCH_LOOP_IDS: readonly LaunchLoopId[] = [
  "desk",
  "mac",
  "guard",
  "workshop",
  "memory",
  "long-tasks",
  "remote",
  "stealth",
];

export type LoopMedia = Readonly<{
  id: LoopId | LaunchLoopId;
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

/**
 * Each 2.0 loop's frame in /media/v3. The loops are cut from the launch film's own masters (tools/encode/
 * launch-loops.json): 16:9 at 1600 × 900 from the 16:9 master (a 16:10 crop would cut the film's type at its margins),
 * Pebble Remote at 4:5 from the 4:5 master, and long tasks as a 3:2 crop of the 16:9 diagram, clear of the scene's
 * title (the owner's ruling of 2 Nov 2026 keeps that name off the page). Their phone cuts are LOOP_PHONE_FRAME, the 4:5
 * master's same frames. tools/encode/verify.mjs reads this table by name.
 */
const LAUNCH_LOOP_FRAMES: Readonly<Record<LaunchLoopId, Readonly<{ width: number; height: number }>>> = {
  desk: { width: 1600, height: 900 },
  mac: { width: 1600, height: 900 },
  guard: { width: 1600, height: 900 },
  workshop: { width: 1600, height: 900 },
  memory: { width: 1600, height: 900 },
  "long-tasks": { width: 1140, height: 760 },
  remote: { width: 1080, height: 1350 },
  stealth: { width: 1600, height: 900 },
};

export type FilmQuality = "720" | "1080";

/** The film's 4:5 cut for phones, `film-phone` (SITE_AUDIT §4.1; the director's X7): the 4:5 master's own layout, at
 *  phone width the interface text and the type stay readable where the 16:9 film's would be about 5 px. Its timing is
 *  the 16:9 film's, frame for frame, so the text tracks are shared. The theatre picks it below FILM_PHONE_QUERY
 *  (src/lib/filmSources.ts). */
export const FILM_PHONE_FRAME = { width: 1080, height: 1350 } as const;

export type FilmMedia = Readonly<{
  /** per quality, HEVC first, then H.264; only the available ones */
  sources: Readonly<Record<FilmQuality, readonly VideoSource[]>>;
  /** the 4:5 phone cut (filmSources.ts FILM_PHONE_QUERY), HEVC first, then H.264; only the available ones */
  phoneSources: readonly VideoSource[];
  /** the phone cut's frame, FILM_PHONE_FRAME */
  phoneFrame: Readonly<{ width: number; height: number }>;
  /** the phone cut's own poster (the 4:5 film's frame 0) */
  phonePoster?: ImageSet;
  captions: MediaFile;
  chapters: MediaFile;
  /** text descriptions for the audio-description toggle (critic H4a) */
  descriptions: MediaFile;
  /** the 16:9 film's poster, 1920 × 1080: its frame 0, a finished composition ("This is Pebble." over the pebble) */
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
 * The Pebble 2.0 launch (SITE_AUDIT §4.4; the director's X15): the film, film-1080 and film-720 (whichever of HEVC and
 * H.264 tools/encode/README.md's budget plan encodes), the 4:5 film-phone (HEVC and H.264), the three text tracks
 * (tools/captions/build.mjs), film.poster (1920 × 1080) and film-phone.poster (1080 × 1350), and the loops
 * (LaunchLoopId) with their posters and 4:5 cuts. tools/encode/verify.mjs reads this name.
 */
const LAUNCH_MEDIA = "/media/v3";
const UI = "/ui/v1";
/** Pebble 2.0.x's real-UI stills, the same names and sizes as /ui/v1's (launchUiStill). */
const UI_LAUNCH = "/ui/v2";

let known: ReadonlySet<string> | null = null;

/** The files that exist under public/media/v1 and v3 and public/ui/v1 and v2, as listed by next.config.ts at build time. */
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

function loopFiles(base: string, id: LoopId | LaunchLoopId, frame: Readonly<{ width: number; height: number }>): LoopMedia {
  const sources = videoSources(`${base}/loop-${id}`);
  return {
    id,
    width: frame.width,
    height: frame.height,
    sources,
    phoneSources: videoSources(`${base}/loop-${id}-phone`),
    poster: imageSet(`${base}/loop-${id}.poster`, frame.width, frame.height),
    phonePoster: imageSet(`${base}/loop-${id}-phone.poster`, LOOP_PHONE_FRAME.width, LOOP_PHONE_FRAME.height),
    available: sources.length > 0,
  };
}

/** A 1.x loop, from /media/v1. */
export function loopMedia(id: LoopId): LoopMedia {
  return loopFiles(MEDIA, id, LOOP_FRAMES[id]);
}

/** A Pebble 2.0 loop, from /media/v3 (LAUNCH_LOOP_FRAMES). */
export function launchLoopMedia(id: LaunchLoopId): LoopMedia {
  return loopFiles(LAUNCH_MEDIA, id, LAUNCH_LOOP_FRAMES[id]);
}

/** Whether a loop has anything to show: its video or its poster. Sections show nothing new until it does. */
export function loopShowable(loop: LoopMedia): boolean {
  return loop.available || loop.poster.available;
}

/**
 * The film the theatre plays: the Pebble 2.0 launch film from /media/v3, with its 4:5 cut for phones. It is available
 * once one of its 16:9 files exists; until then the film section shows its still and no player, chip or trigger
 * appears. Its chapters (src/content/chapters.ts) and its tracks (tools/captions/build.mjs, which checks them) describe
 * this film.
 */
export function filmMedia(): FilmMedia {
  const sources = { "720": videoSources(`${LAUNCH_MEDIA}/film-720`), "1080": videoSources(`${LAUNCH_MEDIA}/film-1080`) };
  return {
    sources,
    phoneSources: videoSources(`${LAUNCH_MEDIA}/film-phone`),
    phoneFrame: FILM_PHONE_FRAME,
    phonePoster: imageSet(`${LAUNCH_MEDIA}/film-phone.poster`, 1080, 1350), // FILM_PHONE_FRAME; verify.mjs reads the digits
    captions: mediaFile(`${LAUNCH_MEDIA}/film.en.vtt`),
    chapters: mediaFile(`${LAUNCH_MEDIA}/film.chapters.vtt`),
    descriptions: mediaFile(`${LAUNCH_MEDIA}/film.descriptions.en.vtt`),
    poster: imageSet(`${LAUNCH_MEDIA}/film.poster`, 1920, 1080),
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
 * A Pebble 2.0.x still from /ui/v2 (SITE_AUDIT §4.4: the harness stills of the frozen 2.0.1 release), named and sized
 * like /ui/v1's: `<name>-<theme>-<1200|2400>.<avif|webp>`, 16:10 unless a crop gives its own size at 2400 px wide.
 * Until it exists, `available` is false and a section keeps its 1.x still.
 */
export function launchUiStill(name: string, size: Readonly<{ width: number; height: number }> = { width: 2400, height: 1500 }): UiStill {
  return stillFiles(name, size.width, size.height, UI_LAUNCH);
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

function stillFiles(name: string, width: number, height: number, base: string = UI): UiStill {
  const half = { width: width / 2, height: Math.round(height / 2) };
  const files = {
    light: {
      1200: imageSet(`${base}/${name}-light-1200`, half.width, half.height),
      2400: imageSet(`${base}/${name}-light-2400`, width, height),
    },
    dark: {
      1200: imageSet(`${base}/${name}-dark-1200`, half.width, half.height),
      2400: imageSet(`${base}/${name}-dark-2400`, width, height),
    },
  };
  return { name, width, height, files, available: files.light[2400].available || files.light[1200].available };
}
