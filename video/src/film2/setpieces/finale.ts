// THE CONVERGENCE, THE TITLE AND THE END CARD (TREATMENT §3.9, S25–S28), one piece, three moments:
//   converge   every ring folds back into the stone: the wall's cells travel inward along their rings (a spiral) and
//              shrink into it on E-leave, accelerating, while rings appear on the outer edge and return to the stone
//              (echoes in a train); the camera pushes in toward the stone; the light moves from evening to the page.
//              (Its look waits for the montage decision, OVERRIDES §54–§57: CR-08.)
//   the title  ONE stone through the iris (CR-01: the world's stone was still about 145 px from the title's when the
//              iris opened, and both showed for 4–6 frames): the push lands the world's stone exactly on the title
//              stone's pose, at its size and with its velocity, 2 frames before the iris starts, and moves with it
//              through the iris; the iris (E-move, 30 frames: lead ruling §52) opens the sage-white page from the stone;
//              the stone at rest beside "Pebble" (Fraunces) and "2.0" (Geist Mono), never inside the wordmark; the
//              wordmark lands ON the final strong downbeat (`hit`); the one sage sweep crosses it 1 frame later (L3a:
//              ≤ 15 % L*, inside the glyphs); the README's line rises beneath
//   the end    page 1 keeps the line; the facts rise beneath it at one size, each its own span with a margin, each
//              limit beside its promise (CR-20: one string with three spaces collapsed to "Apache-2.0 No telemetry."),
//              landing with the track's last strong note; page 2 is "Shown with sample data." and the method line (L4),
//              held for their reading time. The small print leaves the film's frames (CR-10, OVERRIDES §55: 102 words,
//              the honest line among them, sat on screen for 6 s): the honest line is held 12 s in the Dusk passage,
//              where Stealth shows, and the credits (the music's CC BY line, bloub's, the trademark lines, the limits)
//              go into the description, the captions and the site's credits page (`FILM_CREDITS`)
//   the glide  the title and both end-card pages glide (OVERRIDES §58: nothing in the film arrives and holds): the page
//              is one rigid world, the stone and every line set in it (TypeSpec.carry), pushing in about the frame's
//              centre at 0.3 px a frame at its corners (the floor is 0.25). Each page's lines are exact at the middle
//              of their page (`anchors`), so they sit within a few per cent of their layout while they are read. Only
//              the film's last breath, the room tone after the music's decay, settles to a still (a declared wait)
//   The track's real ending decays across page 2; the piece ends 0.5–1 s of room tone after the decay (never a fade).
// It works for any title downbeat: the convergence and the iris are placed back from `hit`.
// `head` replaces the convergence with another shot before the iris (OVERRIDES §61: the Return, setpieces/returnPlan.ts),
// which lands its stone on the title stone's pose and velocity on `landAt`; the convergence stays the default until the
// film's sequence switches to the Return. `then: "coda"` (FinaleThen; withThen() for an end card planned elsewhere)
// marks the end card the main cut plays on past its true ending into the post-credit scene (setpieces/coda.ts), changing
// none of its frames; titleStoneSafe holds the page's stone inside the safe margin to its last frame.
// Pure data.
import { f60, sec } from "../tokens";
import { VelocityCamera, worldToFrame, type CamVel, type Pose } from "../motion/camera";
import type { Point } from "../motion/geometry";
import type { RingSpec } from "../carrier/ring";
import type { Grade, GradeName, LightCue } from "../light/grades";
import type { Finding, QaMove } from "../qa/checks";
import { approxLineWidth, typeSizePx } from "../type/scale";
import { STEALTH_HONEST } from "../../../../shared/pebble/stealthVeil";
import { BODY, VIEWBOX_SIZE } from "../../../../shared/pebble/character";
import { place, type MusicGrid } from "./music";
import { breakLines, enterFramesOf, exitFramesOf, frameBox, glideLz, lineHeightOf, type FrameBox, type TypeBox } from "./frame";
import { TITLE_CUES, WALL_CUES } from "./pieces.cues";
import { anchored, musicHit } from "./kit";
import { move, type MusicHit, type ScenePlan, type ShotSpec, type StoneSpec, type TypeSpec } from "./scene";
import { WALL_GEOMETRY, wallCells, wallFramings, type WallSpec } from "./wall";
import { SAGE_SWEEP } from "./sweep";

/** The end card's words (TREATMENT §3.11 L26–L29; the method line is the lead's L4, OVERRIDES §52). */
export const FINALE_TEXT = {
  wordmark: "Pebble",
  version: "2.0",
  line: "The desktop companion that does real work, and shows its evidence.",
  /** L28: promises and limits at one size, each limit beside its promise (row by row) */
  facts: [["Free and open source.", "Apache-2.0", "No telemetry."], ["For Macs with Apple silicon.", "Not notarized."]] as readonly (readonly string[])[],
  url: "github.com/tohin003/Pebble",
  sample: "Shown with sample data.",
  method: "Real Pebble 2.0 screens, composed in one space. Nothing Pebble does is sped up.",
} as const;

/**
 * What used to be L30, the small print, and now goes with the film instead of in its frames (CR-10, OVERRIDES §55):
 * the description, the captions' last cue and the site's credits page carry it, each line whole. The honest line is
 * not here: it belongs where Stealth shows (the Dusk passage holds it 12 s), never in a film's credits.
 */
export const FILM_CREDITS = (o: { musicCredits?: readonly string[]; trademarks?: readonly string[] } = {}): string[] => [
  "Sound effects are the film's; Pebble plays none of them.",
  "Pebble's character engine: bloub by Jérémy Perret (MIT)",
  "ChatGPT sign-in needs an eligible Plus or Pro plan through OpenAI's preview.",
  "Signed with its own identity, not an Apple Developer ID. No independent security audit yet.",
  ...(o.musicCredits ?? []),
  ...(o.trademarks ?? []),
];

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
  /** the music credit for the credits (the CC BY line when a Scott Buckley cue is used) */
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
  /**
   * the shot before the iris, in place of the convergence (OVERRIDES §61: the Return replaces the wall and the
   * convergence; setpieces/returnPlan.ts): given where the title's stone is on `landAt`, it returns its shot [0, irisAt),
   * which must land its stone there with the page's velocity, and its light, music and moves
   */
  head?: (ctx: FinaleHeadContext) => FinaleHead;
  /** what the main cut plays after the end card's true ending (FinaleThen; withThen() marks an end card planned elsewhere) */
  then?: FinaleThen;
}

/**
 * What the main cut plays after the end card's true ending (POSTCREDIT_DESIGN item 14; OVERRIDES §62, §65): "coda", the
 * post-credit scene (setpieces/coda.ts planCoda), in the main cut only. It changes no frame of the end card: the X cut,
 * and every other cut, is the master cut at the end card's true ending, page 2 held to its last frame; the end card
 * keeps its own declared last breath (§65's ruling (a) on P1-4) and page 2's lines keep no exit (the coda's closing iris
 * takes them, §65 on P2-1). So `endsFilm` stays: the end card ends every cut but the main one, whose coda carries its
 * last frame on (a "continue" join, setpieces/joins.ts). The plan records it (`extra.then`), and coda.ts codaCut holds a
 * cut to it: the main cut plays the coda right after an end card planned with it, and no other cut plays the coda.
 */
export type FinaleThen = "coda";

/** What the main cut plays after an end card (null: nothing, the end card ends it). */
export const finaleThen = (p: Pick<ScenePlan, "extra">): FinaleThen | null => ((p.extra as { then?: FinaleThen | null } | undefined)?.then ?? null);

/**
 * An end card planned elsewhere (planReturn plans its end card with planFinale), marked as planFinale's `then` marks it:
 * the same plan, frame for frame, with `extra.then` set. It must end the film's X cut (`endsFilm`).
 */
export function withThen(endCard: ScenePlan, then: FinaleThen): ScenePlan {
  if (!endCard.endsFilm) throw new Error(`${endCard.id} is not an end card (it does not end the film): nothing plays after its true ending`);
  return { ...endCard, extra: { ...endCard.extra, then } };
}

/** What a head is given: the title's camera and where the title's stone is on `landAt` (CR-01: one stone through the iris). */
export interface FinaleHeadContext {
  f: FrameBox;
  fps: number;
  hit: number;
  irisAt: number;
  irisF: number;
  landAt: number;
  /** the title's camera, local to the title shot (0 = irisAt): a pure zoom about the frame's centre at `lzPage` */
  camT: VelocityCamera;
  lzPage: number;
  /** the title stone on `landAt`: its centre and its drawn size, frame px */
  titleStone: Point;
  titleStonePx: number;
}

/** A head's shot and what goes with it; `stone` is given to the title's stone too, so one stone runs through the iris. */
export interface FinaleHead {
  shot: ShotSpec;
  lightInitial?: GradeName | Grade;
  lightCues?: readonly LightCue[];
  music?: readonly MusicHit[];
  moves?: readonly QaMove[];
  extra?: Record<string, unknown>;
  stone?: Pick<StoneSpec, "clockOffset" | "layer">;
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
    // the stone (and the wordmark set beside it) 0.21 of the height down, not 0.18: the page grows ×1.30 from page 1's
    // anchor to its last frame, which carried the stone to 35 px from the top edge there, and the coda's first 34 frames
    // inherit that frame (the post-credit review's P2-9, OVERRIDES §65, §67); now 73 px, inside the 60-px safe margin
    // (titleStoneSafe holds it on every frame)
    stone: (f) => ({ x: f.w * 0.5 - 230 * f.unit, y: f.h * 0.21 }),
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

/** The margin between two facts on one row, in ems of their size (approximate advance widths err by about 10 %). */
export const FACT_GAP_EM = 1.25;

/** The page's glide: px a frame at 1080 at the frame's corners (OVERRIDES §58: at least the 0.25 floor, 0.3–0.6 preferred). */
export const PAGE_GLIDE_PX = 0.3;

/** The plan of the convergence, the title and the end card. */
export function planFinale(o: FinaleOptions): ScenePlan {
  const f = frameBox(o.w, o.h);
  const fps = o.fps;
  const A = f.aspect;
  const L = LAYOUT[A];
  const hit = Math.round(o.hit);
  const music: MusicHit[] = [{ event: "the title's downbeat: the wordmark lands", frame: hit, point: o.grid?.beats.includes(hit) ? hit : null, level: "hit", waited: 0 }];
  const types: TypeSpec[] = [];
  const unit = f.unit;
  const lzHold = glideLz(f);
  const al = o.align ?? {};

  /* ------------------------------------------------ the timeline, back from the title's downbeat ---------------- */
  const markRise = enterFramesOf("lineRise", FINALE_TEXT.wordmark, fps);
  const irisF = f60(30, fps);
  const irisEnd = hit - markRise - 2; // the page is open 2 frames before the wordmark starts to rise
  const irisAt = irisEnd - irisF;
  const landAt = irisAt - 2; // the world's stone is on the title stone's pose 2 frames before the iris starts (CR-01)
  const convergeEnd = irisAt + f60(12, fps); // the last cells reach the stone as the iris opens
  const convergeFrames = Math.min(f60(150, fps), Math.max(f60(90, fps), convergeEnd - f60(10, fps)));
  const convergeAt = convergeEnd - convergeFrames;
  if (convergeAt < 0 && !o.head) throw new Error(`the finale needs ${-convergeAt} more frames before the title's downbeat (hit ${hit})`);

  /* ------------------------------------------------ the title (layout at its page's anchor) -------------------- */
  const stonePx = L.stonePx * unit;
  const stoneAt = L.stone(f);
  const markPos = L.mark(f, stoneAt, stonePx * 0.3);
  const markSize = typeSizePx("expressive", f.w, f.h, 1);
  const markW = FINALE_TEXT.wordmark.length * 0.48 * markSize;
  const markBox: TypeBox = { left: markPos.left, top: markPos.top, align: "left" };
  const page1: TypeSpec[] = [];
  page1.push({ id: "L26", text: FINALE_TEXT.wordmark, tier: "expressive", at: hit - markRise, sizeT: 1, box: markBox, kind: "title", key: true, sweep: { at: hit + 1, frames: f60(44, fps) } });
  const verSize = typeSizePx("data", f.w, f.h, 1);
  page1.push({ id: "L26v", text: FINALE_TEXT.version, tier: "data", at: hit - markRise + f60(8, fps), sizeT: 1, box: { left: markPos.left + markW + 18 * unit, top: markPos.top + (markSize - verSize) * 0.78, align: "left" }, kind: "title" });
  const lineText = breakLines(FINALE_TEXT.line, "expressive", f, L.lineMaxW(f), 0);
  const lineBox: TypeBox = { left: 0, top: L.lineTop(f), width: f.w, align: "center" };
  const lineAt = hit + f60(30, fps);
  const lineH = lineText.split("\n").length * typeSizePx("expressive", f.w, f.h, 0) * lineHeightOf("expressive");

  /* ------------------------------------------------ the end card, page 1: the facts land with the last note ---- */
  const lastNote = o.lastNote ?? hit + sec(4.0, fps);
  const factsTop = L.factsTop(f, lineBox.top + lineH);
  const fT = 0.2;
  const fSize = typeSizePx("functional", f.w, f.h, fT);
  const fLine = fSize * lineHeightOf("functional");
  // every fact of L28 is on the card, once
  const said = L.facts.flat();
  if (FINALE_TEXT.facts.flat().some((x) => !said.includes(x)) || said.length !== FINALE_TEXT.facts.flat().length) throw new Error(`the ${A} end card does not carry every fact of L28 once`);
  const riseF = enterFramesOf("lineRise", "x", fps);
  const landFacts = place(Math.max(lastNote, lineAt + sec(1.2, fps), al.factsLand ?? 0), o.grid, { level: "beat" });
  const factsLand = landFacts.point ?? landFacts.at;
  music.push(musicHit("the facts land with the last strong note", landFacts));
  const factsHoldEnd = factsLand + sec(5.7, fps);
  // each fact its own span, a row centred with FACT_GAP_EM between its facts (CR-20), laid out by the browser as one
  // flex row (TypeSpec.row, NF-04: placed by estimated advance widths, the gaps came out 62–165 px), so every gap is
  // exact; the plan keeps the estimate of each span's place for the checks. The rows rise 8 frames apart
  const gapPx = FACT_GAP_EM * fSize;
  const factLines = [...L.facts.map((r) => [...r]), [FINALE_TEXT.url]];
  const factRows: { id: string; ids: string[]; top: number; height: number; size: number; gapPx: number }[] = [];
  factLines.forEach((row, i) => {
    const widths = row.map((t) => approxLineWidth(t, "functional", f.w, f.h, fT));
    const total = widths.reduce((a, b) => a + b, 0) + gapPx * (row.length - 1);
    let x = (f.w - total) / 2;
    const top = factsTop + i * fLine;
    const ids: string[] = [];
    row.forEach((text, j) => {
      const id = i === factLines.length - 1 ? "L28-url" : `L28-${i}-${j}`;
      ids.push(id);
      page1.push({ id, text, tier: "functional", entrance: "lineRise", exit: "lift", at: factsLand - riseF + i * f60(8, fps) + j * f60(3, fps), exitAt: factsHoldEnd, sizeT: fT, box: { left: x, top, align: "left" }, kind: "end", row: { id: `facts-${i}`, gapEm: FACT_GAP_EM, index: j } });
      x += widths[j]! + gapPx;
    });
    factRows.push({ id: `facts-${i}`, ids, top, height: fLine, size: fSize, gapPx });
  });
  // the title and the line leave with page 1
  for (const t of page1) if (t.exitAt === undefined) {
    t.exitAt = factsHoldEnd;
    t.exit = "lift";
  }
  page1.push({ id: "L27", text: lineText, tier: "expressive", at: lineAt, sizeT: 0, box: lineBox, kind: "film", key: true, exitAt: factsHoldEnd, exit: "lift" });

  /* ------------------------------------------------ page 2: the sample line and the method line ---------------- */
  // page 2 starts once every line of page 1 has lifted out (an allowance that covers every aspect's line breaks)
  const lifted = Math.max(...page1.map((t) => exitFramesOf(t.entrance ?? "lineRise", "lift", t.text, fps)));
  const page2 = Math.max(factsHoldEnd + Math.max(lifted, f60(30, fps)) + f60(6, fps), al.page2 ?? 0);
  const sSize = typeSizePx("functional", f.w, f.h, 0);
  const page2Types: TypeSpec[] = [];
  const sampleBox: TypeBox = { left: 0, top: f.h * (A === "9:16" ? 0.4 : 0.36), width: f.w, align: "center" };
  page2Types.push({ id: "L29a", text: FINALE_TEXT.sample, tier: "functional", at: page2, sizeT: 0, box: sampleBox, kind: "end" });
  // one line where it fits; else broken at its sentence first ("… composed in one space." / "Nothing Pebble does is sped up.")
  const methodOne = breakLines(FINALE_TEXT.method, "functional", f, f.w - 4 * f.safe, 0);
  const method = methodOne.includes("\n") ? breakLines(FINALE_TEXT.method.replace(". ", ".\n"), "functional", f, f.w - 4 * f.safe, 0) : methodOne;
  const methodBox: TypeBox = { left: 0, top: sampleBox.top + sSize * lineHeightOf("functional") * 1.6, width: f.w, align: "center" };
  page2Types.push({ id: "L29b", text: method, tier: "functional", at: page2 + f60(10, fps), sizeT: 0, box: methodBox, kind: "end" });
  // page 2 holds for its reading time (18 words: 5.9 s) and past the ending's decay and the room tone
  const page2Words = [FINALE_TEXT.sample, FINALE_TEXT.method].join(" ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const page2Hold = sec(0.5 + 0.3 * page2Words, fps) + f60(10, fps) + enterFramesOf("lineBlur", "x", fps) + 2;
  const decayEnd = lastNote + sec(o.decayS ?? 6.6, fps);
  const roomToneF = sec(o.roomToneS ?? 0.75, fps);
  const end = Math.max(page2 + page2Hold, decayEnd + roomToneF, al.end ?? 0);
  // the film's last breath: the room tone at its very end, after the music's decay (the one still the film may hold;
  // page 2 is still on screen through it)
  const breathFrom = end - roomToneF;

  /* ------------------------------------------------ the page's glide (OVERRIDES §58) --------------------------- */
  // one rigid page: world units are frame px on the page's anchor frame (page 1's middle), and the camera pushes in
  // about the frame's centre at PAGE_GLIDE_PX at the corners from the iris to the last breath, which settles to rest
  const lzPage = glideLz(f, PAGE_GLIDE_PX);
  const anchor1 = Math.round((hit + factsHoldEnd) / 2);
  const anchor2 = Math.round((page2 + breathFrom) / 2);
  const pageRef: Pose = { x: f.w / 2, y: f.h / 2, zoom: 1 };
  const camT = new VelocityCamera({ ...pageRef, zoom: Math.exp(-lzPage * (anchor1 - irisAt)) }, { lz: lzPage });
  camT.glide(breathFrom - irisAt, 1e9, { lz: lzPage });
  camT.glide(end - irisAt, f60(12, fps), { lz: 0 });
  // every line of the page is set in it: page 1's exact on its anchor, page 2's on its own (CR-03's "leaves the way it
  // came" holds: each still lifts or blurs out through its own exit)
  for (const t of page1) t.carry = { shot: "title", at: anchor1 };
  for (const t of page2Types) t.carry = { shot: "title", at: anchor2 };
  types.push(...page1, ...page2Types);

  /* ------------------------------------------------ the convergence, or the head that replaces it -------------- */
  // the world's stone lands exactly where, as large as and moving as the title's stone is on `landAt` (a match through
  // the iris): the title's camera is a pure zoom about the frame's centre, so the world's camera holds its x, y there and
  // moves its log zoom alike
  const tPose = camT.pose(landAt - irisAt);
  const titleStone = worldToFrame(stoneAt, tPose, f.w, f.h);
  const convergence = (): FinaleHead => {
    const centre = o.centre ?? { x: 0, y: 0 };
    const cells = wallCells();
    const wall: WallSpec = { centre, cells, radii: WALL_GEOMETRY.radii, orbit: WALL_GEOMETRY.orbit, depth: WALL_GEOMETRY.depth, converge: { at: convergeAt, frames: convergeFrames, turnDeg: 50 }, t0: o.wallElapsed ?? 0 };
    const { far } = wallFramings(f, centre);
    // the camera keeps the wall's drift until the cells turn inward, pushes in with them, and lands the world's stone
    const zLand = ((L.stonePx * unit) / 148) * tPose.zoom;
    const pushTo: Pose = { x: centre.x - (titleStone.x - f.w / 2) / zLand, y: centre.y - (titleStone.y - f.h / 2) / zLand, zoom: zLand };
    const wallDrift: CamVel = o.entry?.vel ?? { x: 0, y: 0, lz: -lzHold };
    const camC = new VelocityCamera(o.entry?.pose ?? far, wallDrift);
    camC.glide(convergeAt, f60(40, fps), wallDrift);
    camC.hermite(convergeAt + Math.round(convergeFrames * 0.2), { ...far, zoom: far.zoom * 1.04, x: centre.x, y: centre.y }, { lz: 0.0036 });
    camC.hermite(landAt, pushTo, { x: 0, y: 0, lz: lzPage });
    // then exactly the title's own glide, through the iris (the two cameras then show one stone on every frame)
    camC.glide(irisAt, 1e9, { lz: lzPage });
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
    const lightCues: LightCue[] = [{ at: convergeAt + Math.round(convergeFrames * 0.4), to: "page", frames: Math.max(f60(60, fps), irisEnd - (convergeAt + Math.round(convergeFrames * 0.4))) }];
    return {
      shot: { id: "converge", from: 0, to: irisAt, kind: "cutscene", camera: camC, ref: o.entry?.ref ?? o.entry?.pose ?? far, ground: "riverbed", planes: [], wall, stone: { at: centre, r: 44, size: 148, cues: anchored(WALL_CUES, 0, "the convergence's cues") }, rings: [ring], dofScale: 8 },
      lightInitial: "evening",
      lightCues,
      moves: [
        move("ring", convergeAt, convergeFrames > f60(90, fps) ? f60(90, fps) : convergeFrames, "the convergence: the rings return to the stone"),
        move("light", lightCues[0]!.at, lightCues[0]!.frames, "evening to the page"),
      ],
      extra: { convergeAt, convergeFrames },
    };
  };
  const first = o.head ? o.head({ f, fps, hit, irisAt, irisF, landAt, camT, lzPage, titleStone, titleStonePx: stonePx * tPose.zoom }) : convergence();
  if (first.shot.from !== 0 || first.shot.to !== irisAt) throw new Error(`the finale's first shot must run [0, ${irisAt}) (it runs [${first.shot.from}, ${first.shot.to}))`);
  music.push(...(first.music ?? []));

  // the stone on the page (world = frame px on the anchor): its size and its cues, on the head's clock and layer
  const stonePage = { at: stoneAt, r: stonePx * 0.3, size: stonePx, cues: anchored(TITLE_CUES, 0, "the title's cues"), ...(first.stone ?? {}) };
  const sweepT = types.find((t) => t.sweep)!;

  return {
    id: "finale",
    name: `Convergence, title, end ${A}`,
    aspect: A,
    frame: f,
    fps,
    duration: end,
    shots: [
      first.shot,
      // the page glides to the film's last breath (OVERRIDES §58), the room tone after the decay: the one declared still
      { id: "title", from: irisAt, to: end, kind: "title", camera: camT, ref: pageRef, ground: "page", planes: [], stone: stonePage, rings: [], waits: [{ from: breathFrom, to: end }] },
    ],
    seams: [
      {
        at: irisAt,
        kind: "ring",
        frames: irisF,
        out: first.shot.id,
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
    lightInitial: first.lightInitial ?? "evening",
    lightCues: [...(first.lightCues ?? [])],
    leaks: [],
    hits: [hit],
    takes: [],
    music,
    // the end card is the film's last frame: its type may stay to the end (anywhere else that would vanish on a cut)
    endsFilm: true,
    moves: [...(first.moves ?? [])],
    extra: {
      timing: { factsLand, page2, end } satisfies FinaleTiming,
      ...(first.extra ?? {}),
      irisAt,
      irisEnd,
      landAt,
      factsLand,
      factsHoldEnd,
      page2,
      end,
      breathFrom,
      anchors: { page1: anchor1, page2: anchor2 },
      lzPage,
      sweep: sweepT.sweep,
      sweepFrames: SAGE_SWEEP.frames,
      lastNote,
      decayEnd,
      factRows,
      credits: FILM_CREDITS({ musicCredits: o.musicCredit ? [o.musicCredit] : [], trademarks: o.trademarks }),
      honestLine: STEALTH_HONEST,
      // what the main cut plays after the true ending (FinaleThen): no frame here changes with it
      then: o.then ?? null,
    },
  };
}

/** The pebble's drawn extent about its centre `c` at drawn size `px`: its own bounds (BODY), with 6 % for its lean or breath. */
const stoneBodyRect = (c: Point, px: number): { x0: number; y0: number; x1: number; y1: number } => {
  const k = (px / VIEWBOX_SIZE) * 1.06;
  return { x0: c.x + BODY.left * k, y0: c.y + BODY.top * k, x1: c.x + BODY.right * k, y1: c.y + BODY.bottom * k };
};

/**
 * The title's and the end card's stone keeps the frame's safe margin (the post-credit review's P2-9, first half; OVERRIDES
 * §65, §67): on every frame a title page draws its stone (its shot, and the seams it leaves through: the coda's closing
 * iris carries the end card's last frame on for 34 frames), the stone's drawn extent (its own bounds, with 6 % for its
 * lean or breath) stays 60 px at 1080 or more inside every edge, as the page's type does (typeSafe). The 1:1 end card's
 * page grows ×1.30 from page 1's anchor to its last frame and carried its stone to 35 px from the top edge there.
 */
export function titleStoneSafe(p: ScenePlan): Finding[] {
  const out: Finding[] = [];
  const { w, h, safe } = p.frame;
  for (const s of p.shots) {
    if (s.kind !== "title" || !s.stone) continue;
    const st = s.stone;
    const spans = [{ from: s.from, to: s.to }, ...p.seams.filter((x) => x.out === s.id && x.frames > 0).map((x) => ({ from: x.at, to: x.at + x.frames }))];
    let worst: { fr: number; m: number; edge: string } | null = null;
    for (const sp of spans)
      for (let fr = Math.max(0, sp.from); fr < Math.min(p.duration, sp.to); fr++) {
        const pose = s.camera.pose(fr - s.from);
        const r = stoneBodyRect(worldToFrame(st.at, pose, w, h), st.size * pose.zoom);
        for (const [edge, m] of [["top", r.y0], ["left", r.x0], ["right", w - r.x1], ["bottom", h - r.y1]] as const) if (!worst || m < worst.m) worst = { fr, m, edge };
      }
    if (worst && worst.m < safe - 0.5) out.push({ check: "titleStoneSafe", level: "error", message: `the stone of ${s.id} comes ${(worst.m / p.frame.unit).toFixed(1)} px from the frame's ${worst.edge} edge at 1080 (frame ${worst.fr}): it keeps the ${(safe / p.frame.unit).toFixed(0)}-px safe margin on every frame, as the page's type does (the post-credit review's P2-9, OVERRIDES §65, §67)`, frame: worst.fr });
  }
  return out;
}
