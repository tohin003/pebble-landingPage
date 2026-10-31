// The film's opening (Act I, Rings 1–3) and the whole film on the score (opening/): every act holds its rules, the film
// is end to end on the score's frames, and the canaries prove each rule fires.
import { describe, expect, test } from "bun:test";
import { ACTS, SCORE, checkFilm, filmFrames, filmSegments, masterGain, xSegments } from "../opening/film";
import { actFrames, checkAct, frameOfSource, shotLayout, type ActPlan } from "../opening/kit";
import { ACT_ONE } from "../opening/actOne";
import { RING_ONE } from "../opening/ringOne";
import { RING_TWO } from "../opening/ringTwo";
import { RING_THREE } from "../opening/ringThree";

import { TAKE_RS15_01, TAKE_RS4_07, TAKE_RS9B_02 } from "../setpieces/take";
import { usesNeverWord } from "../../../../src/content/neverWords";

const ASPECTS = ["16:9", "1:1", "9:16"] as const;
const EXPECT: Record<string, [number, number]> = { act1: [0, 1020], ring1: [1680, 600], ring2: [2280, 960], ring3: [3240, 813] };

describe("the opening's acts", () => {
  test("every act holds its rules, on its block", () => {
    for (const p of ACTS) expect(checkAct(p, ...EXPECT[p.id]!)).toEqual([]);
  });
  test("tick 1 (the send) and tick 2 (Calculator's '=') land on the score's frames", () => {
    expect(ACT_ONE.start + frameOfSource(ACT_ONE, "ask", TAKE_RS15_01.events.send!)).toBe(180);
    expect(RING_TWO.start + frameOfSource(RING_TWO, "calc", TAKE_RS4_07.events.equals600!)).toBe(2490);
  });
  test("Pebble's wait before its reply is never cut", () => {
    const [ask, reply] = ACT_ONE.shots;
    expect(ask!.from! <= TAKE_RS15_01.events.send! && ask!.to === TAKE_RS15_01.events.replyLands && reply!.from === ask!.to).toBe(true);
  });
  test("RS-9's beat: the score cut out from the punch-in to the hard cut, 'Anyway.' on the last shot", () => {
    const starts = [0, 300, 480, 540];
    expect(RING_ONE.shots.map((s) => s.id)).toEqual(["tab", "play", "punch", "anyway"]);
    expect(RING_ONE.mutes).toEqual([[starts[2]!, actFrames(RING_ONE)]]);
    expect(RING_ONE.start + starts[2]!).toBe(2160); // B2's phrase line, 0:36.00
    expect(RING_ONE.lines.find((l) => l.text === "Anyway.")?.cutOut).toBe(true);
  });
  test("no line uses a never-word, a comparison or a number", () => {
    for (const p of ACTS)
      for (const l of p.lines) {
        expect(usesNeverWord(l.text, [])).toBe(false);
        expect(/\b(beats?|faster|better|than|Claude|Codex|rival)\b/i.test(l.text)).toBe(false);
        expect(/\d/.test(l.text.replace("Pebble 2.0", ""))).toBe(false);
        expect(/!/.test(l.text)).toBe(false);
      }
  });
  test("every shot's box and lines sit inside the frame in every aspect", () => {
    const size = { size: () => 40, width: (t: string) => t.length * 20 };
    for (const [W, H] of [[1920, 1080], [1080, 1080], [1080, 1920]] as const)
      for (const p of ACTS)
        p.shots.forEach((_, i) => {
          const lay = shotLayout(p, i, W, H, 60 * (Math.min(W, H) / 1080), size);
          if (lay.box) {
            expect(lay.box.left).toBeGreaterThanOrEqual(59);
            expect(lay.box.top).toBeGreaterThanOrEqual(0);
            expect(lay.box.left + lay.box.w).toBeLessThanOrEqual(W - 59);
          }
          for (const y of Object.values(lay.lineTop)) expect(y).toBeLessThan(H - 60);
        });
  });
});

describe("the canaries", () => {
  const with_ = (p: ActPlan, i: number, patch: object): ActPlan => ({ ...p, shots: p.shots.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  test("Finder's shot before its window covers the chat's usage line", () => {
    expect(checkAct(with_(RING_THREE, 1, { from: 2660 })).some((e) => e.includes("usage line"))).toBe(true);
  });
  test("RS15-01's reply crop down to its usage line", () => {
    expect(checkAct(with_(ACT_ONE, 1, { crop: { x: 1057, y: 418, w: 366, h: 200 } })).some((e) => e.includes("usage line"))).toBe(true);
  });
  test("Clip B before Chrome clears its prompt, and its adverts uncropped", () => {
    expect(checkAct(with_(RING_ONE, 0, { from: 3200 })).some((e) => e.includes("URL"))).toBe(true);
    expect(checkAct(with_(RING_ONE, 0, { crop: { x: 0, y: 28, w: 700, h: 300 } })).some((e) => e.includes("adverts"))).toBe(true);
  });
  test("a replayed take, a line on a cut, a line too short, a line with no claim", () => {
    expect(checkAct(with_(RING_TWO, 2, { from: 2900, to: 3120 })).some((e) => e.includes("replays"))).toBe(true);
    expect(checkAct({ ...RING_ONE, shots: [RING_ONE.shots[0]!, { ...RING_ONE.shots[0]!, id: "again", from: 3500, to: 3800 }, ...RING_ONE.shots.slice(1)] }).some((e) => e.includes("replays"))).toBe(true);
    const line = RING_TWO.lines[0]!;
    expect(checkAct({ ...RING_TWO, lines: [{ ...line, exitAt: 295 }] }).some((e) => e.includes("at the cut"))).toBe(true);
    expect(checkAct({ ...RING_TWO, lines: [{ ...line, exitAt: 60 }] }).some((e) => e.includes("need"))).toBe(true);
    expect(checkAct({ ...RING_TWO, lines: [{ ...line, claim: "" }] }).some((e) => e.includes("claim"))).toBe(true);
  });
  test("an act off its block", () => {
    expect(checkAct(RING_THREE, 3241, 813).length).toBe(1);
  });
});

describe("the whole film", () => {
  test("end to end on the score's frames in every aspect, the X cut to the coda's first frame, RS-9's credit line", () => {
    for (const a of ASPECTS) {
      expect(checkFilm(a)).toEqual([]);
      expect(filmFrames(filmSegments(a))).toBe(SCORE.codaEnd);
      expect(filmFrames(xSegments(a))).toBe(SCORE.trueEnd);
    }
  });
  test("the master: muted under RS-9's punch-in, back on the hard cut, the X cut faded to silence", () => {
    const segs = filmSegments("16:9");
    expect(masterGain(segs, 2000)).toBe(1);
    expect(masterGain(segs, 2200)).toBe(0);
    expect(masterGain(segs, 2290)).toBe(1);
    expect(masterGain(xSegments("16:9"), SCORE.trueEnd - 1, SCORE.trueEnd)).toBe(0);
    expect(masterGain(xSegments("16:9"), SCORE.trueEnd - 40, SCORE.trueEnd)).toBe(1);
  });
  test("the drop's own segment: the reel's take is the placeholder RS-9 (its plan, not this lane's)", () => {
    const drop = filmSegments("16:9").find((s) => s.id === "drop")!;
    expect(drop.at).toBe(1020);
    expect(TAKE_RS9B_02.events.chromeClear).toBe(3276);
  });
});
