// THE CONVERGENCE, THE TITLE AND THE END CARD (TREATMENT §3.9, S25–S28), one piece, three moments:
//   converge   every ring folds back into the stone: the wall's cells travel inward along their rings (a spiral) and
//              shrink into it on E-leave, accelerating, while rings appear on the outer edge and return to the stone
//              (echoes in a train); the camera pushes in toward the stone; the light moves from evening to the page
//   the title  a ring iris (E-move, 30 frames: lead ruling §52) opens the sage-white page from the stone; the stone at
//              rest beside "Pebble" (Fraunces) and "2.0" (Geist Mono), never inside the wordmark; the wordmark lands ON
//              the final strong downbeat (`hit`); the one sage sweep crosses it 1 frame later (L3a: ≤ 15 % L*, inside the
//              glyphs); the README's line rises beneath
//   the end    page 1 keeps the line; the facts rise beneath it at one size, 8 frames apart, each limit beside its
//              promise, landing with the track's last strong note; page 2 is the small print: "Shown with sample
//              data.", the method line (L4), the credits. The track's real ending decays across it; the piece ends
//              0.5–1 s of room tone after the decay (never a fade; that is the mix's job, §4.8)
// It works for any title downbeat: the convergence and the iris are placed back from `hit`.
// Pure data.
import { COLOR, f60, sec } from "../tokens";
import { VelocityCamera, type CamVel, type Pose } from "../motion/camera";
import type { Point } from "../motion/geometry";
import type { RingSpec } from "../carrier/ring";
import type { LightCue } from "../light/grades";
import { typeSizePx } from "../type/scale";
import { STEALTH_HONEST } from "../../../../shared/pebble/stealthVeil";
import { place, type MusicGrid } from "./music";
import { breakLines, enterFramesOf, exitFramesOf, frameBox, lineHeightOf, type FrameBox, type TypeBox } from "./frame";
import { TITLE_CUES, WALL_CUES } from "./pieces.cues";
import { anchored, musicHit } from "./kit";
import { move, type MusicHit, type ScenePlan, type TypeSpec } from "./scene";
import { WALL_GEOMETRY, wallCells, wallFramings, type WallSpec } from "./wall";
import { SAGE_SWEEP } from "./sweep";

/** The end card's words (TREATMENT §3.11 L26–L30; the method line is the lead's L4, OVERRIDES §52). */
export const FINALE_TEXT = {
  wordmark: "Pebble",
  version: "2.0",
  line: "The desktop companion that does real work, and shows its evidence.",
  /** L28: promises and limits at one size, each limit beside its promise (row by row) */
  facts: [["Free and open source.", "Apache-2.0", "No telemetry."], ["For Macs with Apple silicon.", "Not notarized."]] as readonly (readonly string[])[],
  url: "github.com/tohin003/Pebble",
  sample: "Shown with sample data.",
  method: "Real Pebble 2.0 screens, composed in one space. Nothing Pebble does is sped up.",
  /** L30, the small print (the music credit comes from the cue sheet; trademark lines from the final cut's brands) */
  small: [
    "Sound effects are the film's; Pebble plays none of them.",
    STEALTH_HONEST,
    "Pebble's character engine: bloub by Jérémy Perret (MIT)",
    "ChatGPT sign-in needs an eligible Plus or Pro plan through OpenAI's preview.",
    "Signed with its own identity, not an Apple Developer ID. No independent security audit yet.",
  ] as readonly string[],
} as const;

export interface FinaleOptions {
  w: number;
  h: number;
  fps: number;
  grid?: MusicGrid;
  /** the final strong downbeat: the wordmark lands on it (local frame) */
  hit: number;
  /** the track's last strong note (local frame): the facts land with it; default hit + 4.0 s (S27) */
  lastNote?: number;
  /** the ending's decay after the last note (the map's t20), and the room tone after it (0.5–1 s) */
  decayS?: number;
  roomToneS?: number;
  /** the music credit for the small print (the CC BY line when a Scott Buckley cue is used) */
  musicCredit?: string;
  /** a trademark line for every brand the final cut shows (R-MARKS; the copy lane writes them) */
  trademarks?: readonly string[];
  /** the wall's centre and the camera to continue from (the wall piece's exit: its pose, velocity and parallax ref) */
  centre?: Point;
  entry?: { pose: Pose; vel: CamVel; ref?: Pose };
  /** frames the wall has already orbited (the wall piece's duration), so the rings never jump at the join */
  wallElapsed?: number;
  /** one timeline for every aspect (setpieces/align.ts) */
  align?: Partial<FinaleTiming>;
}

/** The frames the finale's timeline is made of (the same in every aspect once aligned). */
export interface FinaleTiming {
  factsLand: number;
  page2: number;
  end: number;
}

interface FinaleLayout {
  stone: (f: FrameBox) => Point;
  stonePx: number;
  /** the wordmark's box, left of which the stone sits */
  mark: (f: FrameBox, stone: Point, stoneR: number) => { left: number; top: number };
  lineTop: (f: FrameBox) => number;
  lineMaxW: (f: FrameBox) => number;
  factsTop: (f: FrameBox, lineBottom: number) => number;
  /** the facts, row by row: each limit beside its promise, at one size */
  facts: readonly (readonly string[])[];
}

const LAYOUT: Record<FrameBox["aspect"], FinaleLayout> = {
  "16:9": {
    stone: (f) => ({ x: f.w * 0.5 - 300 * f.unit, y: f.h * 0.27 }),
    stonePx: 190,
    mark: (f, s, r) => ({ left: s.x + r + 48 * f.unit, top: s.y - 62 * f.unit }),
    lineTop: (f) => f.h * 0.43,
    lineMaxW: (f) => f.w - 4 * f.safe,
    factsTop: (f, lb) => lb + 48 * f.unit,
    facts: [["Free and open source.", "Apache-2.0", "No telemetry."], ["For Macs with Apple silicon.", "Not notarized."]],
  },
  "1:1": {
    stone: (f) => ({ x: f.w * 0.5 - 230 * f.unit, y: f.h * 0.18 }),
    stonePx: 170,
    mark: (f, s, r) => ({ left: s.x + r + 40 * f.unit, top: s.y - 56 * f.unit }),
    lineTop: (f) => f.h * 0.31,
    lineMaxW: (f) => f.w - 2.4 * f.safe,
    factsTop: (f, lb) => lb + 40 * f.unit,
    facts: [["Free and open source.", "Apache-2.0"], ["No telemetry.", "Not notarized."], ["For Macs with Apple silicon."]],
  },
  "9:16": {
    stone: (f) => ({ x: f.w * 0.5 - 210 * f.unit, y: f.h * 0.24 }),
    stonePx: 190,
    mark: (f, s, r) => ({ left: s.x + r + 40 * f.unit, top: s.y - 66 * f.unit }),
    lineTop: (f) => f.h * 0.33,
    lineMaxW: (f) => f.w - 2.4 * f.safe,
    factsTop: (f, lb) => lb + 64 * f.unit,
    facts: [["Free and open source."], ["Apache-2.0"], ["No telemetry."], ["For Macs with Apple silicon."], ["Not notarized."]],
  },
};

/** The plan of the convergence, the title and the end card. */
export function planFinale(o: FinaleOptions): ScenePlan {
  const f = frameBox(o.w, o.h);
  const fps = o.fps;
  const A = f.aspect;
  const L = LAYOUT[A];
  const hit = Math.round(o.hit);
  const music: MusicHit[] = [{ event: "the title's downbeat: the wordmark lands", frame: hit, point: o.grid?.beats.includes(hit) ? hit : null, level: "hit", waited: 0 }];
  const types: TypeSpec[] = [];

  /* ------------------------------------------------ the convergence --------------------------------------------- */
  const centre = o.centre ?? { x: 0, y: 0 };
  const markRise = enterFramesOf("lineRise", FINALE_TEXT.wordmark, fps);
  const irisF = f60(30, fps);
  const irisEnd = hit - markRise - 2; // the page is open 2 frames before the wordmark starts to rise
  const irisAt = irisEnd - irisF;
  const convergeEnd = irisAt + f60(12, fps); // the last cells reach the stone as the iris opens
  const convergeFrames = Math.min(f60(150, fps), Math.max(f60(90, fps), convergeEnd - f60(10, fps)));
  const convergeAt = convergeEnd - convergeFrames;
  if (convergeAt < 0) throw new Error(`the finale needs ${-convergeAt} more frames before the title's downbeat (hit ${hit})`);
  const cells = wallCells();
  const wall: WallSpec = { centre, cells, radii: WALL_GEOMETRY.radii, orbit: WALL_GEOMETRY.orbit, depth: WALL_GEOMETRY.depth, converge: { at: convergeAt, frames: convergeFrames, turnDeg: 50 }, t0: o.wallElapsed ?? 0 };
  const { far } = wallFramings(f, centre);
  const camC = new VelocityCamera(o.entry?.pose ?? far, o.entry?.vel ?? { lz: -0.00028 });
  // the camera turns from its outward drift into a push toward the stone as the cells rush in, and lands the stone
  // exactly where, and as large as, the title's stone: the iris then opens around one stone (a match through the iris)
  const stoneTarget = L.stone(f);
  const zLand = (L.stonePx * f.unit) / 148;
  const pushTo: Pose = { x: centre.x - (stoneTarget.x - f.w / 2) / zLand, y: centre.y - (stoneTarget.y - f.h / 2) / zLand, zoom: zLand };
  camC.hermite(convergeAt + Math.round(convergeFrames * 0.35), { ...far, zoom: far.zoom * 1.06, x: centre.x, y: centre.y }, { lz: 0.0035 });
  camC.hermite(irisEnd + 4, pushTo, { lz: 0.0004 });
  const ring: RingSpec = {
    id: "converge",
    start: convergeAt,
    source: centre,
    stoneRadius: 44,
    phases: [
      { kind: "appear", frames: f60(14, fps), radius: WALL_GEOMETRY.radii[2] + 260 },
      { kind: "return", frames: convergeFrames - f60(14, fps) },
    ],
    echoes: 2,
    echoGap: f60(8, fps),
    echoFade: 0.6,
    echoMode: "all",
    ripple: false,
    layer: "ground",
  };

  /* ------------------------------------------------ the title -------------------------------------------------- */
  const unit = f.unit;
  const stonePx = L.stonePx * unit;
  const stoneAt = L.stone(f);
  const markPos = L.mark(f, stoneAt, stonePx * 0.3);
  const markSize = typeSizePx("expressive", f.w, f.h, 1);
  const markW = FINALE_TEXT.wordmark.length * 0.48 * markSize;
  const markBox: TypeBox = { left: markPos.left, top: markPos.top, align: "left" };
  types.push({ id: "L26", text: FINALE_TEXT.wordmark, tier: "expressive", at: hit - markRise, sizeT: 1, box: markBox, kind: "title", key: true, sweep: { at: hit + 1, frames: f60(44, fps) } });
  const verSize = typeSizePx("data", f.w, f.h, 1);
  types.push({ id: "L26v", text: FINALE_TEXT.version, tier: "data", at: hit - markRise + f60(8, fps), sizeT: 1, box: { left: markPos.left + markW + 18 * unit, top: markPos.top + (markSize - verSize) * 0.78, align: "left" }, kind: "title" });
  const lineText = breakLines(FINALE_TEXT.line, "expressive", f, L.lineMaxW(f), 0);
  const lineBox: TypeBox = { left: 0, top: L.lineTop(f), width: f.w, align: "center" };
  const lineAt = hit + f60(30, fps);
  const lineH = lineText.split("\n").length * typeSizePx("expressive", f.w, f.h, 0) * lineHeightOf("expressive");

  /* ------------------------------------------------ the end card, page 1: the facts land with the last note ---- */
  const lastNote = o.lastNote ?? hit + sec(4.0, fps);
  const factsTop = L.factsTop(f, lineBox.top + lineH);
  const fSize = typeSizePx("functional", f.w, f.h, 0.2);
  const fLine = fSize * lineHeightOf("functional");
  const rows: string[] = L.facts.map((r) => r.join("   "));
  // every fact of L28 is on the card, once
  const said = L.facts.flat();
  if (FINALE_TEXT.facts.flat().some((x) => !said.includes(x)) || said.length !== FINALE_TEXT.facts.flat().length) throw new Error(`the ${A} end card does not carry every fact of L28 once`);
  rows.push(FINALE_TEXT.url);
  const riseF = enterFramesOf("lineRise", "x", fps);
  const al = o.align ?? {};
  const landFacts = place(Math.max(lastNote, lineAt + sec(1.2, fps), al.factsLand ?? 0), o.grid, { level: "beat" });
  const factsLand = landFacts.point ?? landFacts.at;
  music.push(musicHit("the facts land with the last strong note", landFacts));
  const factsHoldEnd = factsLand + sec(5.7, fps);
  rows.forEach((text, i) => {
    types.push({
      id: `L28-${i}`,
      text,
      tier: "functional",
      entrance: "lineRise",
      exit: "lift",
      at: factsLand - riseF + i * f60(8, fps),
      exitAt: factsHoldEnd,
      sizeT: 0.2,
      box: { left: 0, top: factsTop + i * fLine, width: f.w, align: "center" },
      kind: "end",
    });
  });
  // the title and the line leave with page 1
  for (const t of types) if (t.exitAt === undefined) {
    t.exitAt = factsHoldEnd;
    t.exit = "lift";
  }
  types.push({ id: "L27", text: lineText, tier: "expressive", at: lineAt, sizeT: 0, box: lineBox, kind: "film", key: true, exitAt: factsHoldEnd, exit: "lift" });

  /* ------------------------------------------------ page 2: the small print ------------------------------------- */
  // page 2 starts once every line of page 1 has lifted out (an allowance that covers every aspect's line breaks)
  const lifted = Math.max(...types.map((t) => exitFramesOf(t.entrance ?? "lineRise", "lift", t.text, fps)));
  const page2 = Math.max(factsHoldEnd + Math.max(lifted, f60(30, fps)) + f60(6, fps), al.page2 ?? 0);
  const sSize = typeSizePx("functional", f.w, f.h, 0);
  const sampleBox: TypeBox = { left: 0, top: f.h * (A === "9:16" ? 0.3 : 0.24), width: f.w, align: "center" };
  types.push({ id: "L29a", text: FINALE_TEXT.sample, tier: "functional", at: page2, sizeT: 0, box: sampleBox, kind: "end" });
  const method = breakLines(FINALE_TEXT.method, "functional", f, f.w - 4 * f.safe, 0);
  const methodBox: TypeBox = { left: 0, top: sampleBox.top + sSize * lineHeightOf("functional") * 1.6, width: f.w, align: "center" };
  types.push({ id: "L29b", text: method, tier: "functional", at: page2 + f60(10, fps), sizeT: 0, box: methodBox, kind: "end" });
  const credit = o.musicCredit ? [o.musicCredit] : [];
  const small = [...FINALE_TEXT.small, ...credit, ...(o.trademarks ?? [])].flatMap((t) => breakLines(t, "small", f, f.w - 3 * f.safe, 0.3).split("\n"));
  const smallTop = methodBox.top + method.split("\n").length * sSize * lineHeightOf("functional") + 56 * unit;
  types.push({ id: "L30", text: small.join("\n"), tier: "small", at: page2 + f60(24, fps), sizeT: 0.3, box: { left: 0, top: smallTop, width: f.w, align: "center" }, kind: "small", color: COLOR.ink2 });
  const decayEnd = lastNote + sec(o.decayS ?? 6.6, fps);
  const end = Math.max(page2 + sec(6.5, fps), decayEnd + sec(o.roomToneS ?? 0.75, fps), al.end ?? 0);

  /* ------------------------------------------------ cameras, light ---------------------------------------------- */
  // the page: world units are frame px under a near-identity camera that breathes in; still type is the wait
  const pageRef: Pose = { x: f.w / 2, y: f.h / 2, zoom: 1 };
  const camT = new VelocityCamera(pageRef, { lz: 0.00012 });
  camT.glide(end - irisAt, f60(60, fps), { lz: 0.00006 });
  const lightCues: LightCue[] = [{ at: convergeAt + Math.round(convergeFrames * 0.4), to: "page", frames: Math.max(f60(60, fps), irisEnd - (convergeAt + Math.round(convergeFrames * 0.4))) }];
  // the stone on the page (world = frame px): its size and its cues
  const stonePage = { at: stoneAt, r: stonePx * 0.3, size: stonePx, cues: anchored(TITLE_CUES, 0, "the title's cues") };
  const sweepT = types.find((t) => t.sweep)!;

  return {
    id: "finale",
    name: `Convergence, title, end ${A}`,
    aspect: A,
    frame: f,
    fps,
    duration: end,
    shots: [
      { id: "converge", from: 0, to: irisAt, kind: "cutscene", camera: camC, ref: o.entry?.ref ?? o.entry?.pose ?? far, ground: "riverbed", planes: [], wall, stone: { at: centre, r: 44, size: 148, cues: anchored(WALL_CUES, 0, "the convergence's cues") }, rings: [ring], dofScale: 8 },
      { id: "title", from: irisAt, to: end, kind: "title", camera: camT, ref: pageRef, ground: "page", planes: [], stone: stonePage, rings: [], waits: [{ from: hit + f60(30, fps) + sweepT.sweep!.frames, to: end }] },
    ],
    seams: [
      {
        at: irisAt,
        kind: "ring",
        frames: irisF,
        out: "converge",
        in: "title",
        presentation: "iris",
        // an iris between places: E-move (lead ruling §52); PieceView draws exactly this ease
        ease: "move",
        irisCenter: stoneAt,
        swapAt: irisAt + Math.round(irisF / 2),
        covered: { from: irisAt, to: irisAt + irisF },
      },
    ],
    types,
    lightInitial: "evening",
    lightCues,
    leaks: [],
    hits: [hit],
    takes: [],
    music,
    // the end card is the film's last frame: its type may stay to the end (anywhere else that would vanish on a cut)
    endsFilm: true,
    moves: [
      move("ring", convergeAt, convergeFrames > f60(90, fps) ? f60(90, fps) : convergeFrames, "the convergence: the rings return to the stone"),
      move("light", lightCues[0]!.at, lightCues[0]!.frames, "evening to the page"),
    ],
    extra: { timing: { factsLand, page2, end } satisfies FinaleTiming, convergeAt, convergeFrames, irisAt, irisEnd, factsLand, page2, end, sweep: sweepT.sweep, sweepFrames: SAGE_SWEEP.frames, lastNote, decayEnd },
  };
}
