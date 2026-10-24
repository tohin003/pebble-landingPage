// Extended audio description (audioDescription.ts), on a simulated film: a video whose clock runs in 10 ms steps, its
// descriptions track, a voice that reads 2.5 words a second, and timers on the same clock. Events reach the describer
// as a browser sends them: play and pause a task later, cuechange and timeupdate while the film plays, a seek's
// seeking, cuechange and seeked in that order. Run: bun test ./src/lib
import { describe, expect, test } from "bun:test";
import { chapters, FILM_DURATION_SECONDS } from "@/content/chapters";
import {
  HOLD_LEAD,
  SEEK_SETTLE_MS,
  cueAt,
  describeFilm,
  sentencesOf,
  trackOf,
  type Clock,
  type DescribedVideo,
  type DescriptionCue,
  type DescriptionTrack,
  type VideoEvent,
  type Voice,
} from "./audioDescription";

const STEP = 10; // ms
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

type Options = Readonly<{
  cues: readonly DescriptionCue[];
  duration?: number;
  /** words a second; 0: the voice never starts a line, and says so after 4 s */
  wordsPerSecond?: number;
  /** extra delay on the describer's own timers (a busy main thread) */
  lateTimersMs?: number;
}>;

function film({ cues, duration = cues.at(-1)!.endTime, wordsPerSecond = 2.5, lateTimersMs = 0 }: Options) {
  let now = 0; // ms
  let tMs = 0; // the film's time, in whole ms (no float drift at a cue's edge)
  let paused = true;
  let seekingTo: number | null = null;
  let sinceUpdate = 0;
  let active: DescriptionCue | null = null;
  const listeners = new Map<string, Set<() => void>>();
  const cueListeners = new Set<() => void>();
  let timers: { id: number; at: number; fn: () => void }[] = [];
  let nextId = 1;
  const log: string[] = []; // what happened, for the asserts
  const spoken: { text: string; from: number; to: number | null; at: number }[] = [];
  const describerCalls = { play: 0, pause: 0 };

  const at = (ms: number, fn: () => void) => {
    const id = nextId++;
    timers.push({ id, at: ms, fn });
    return id;
  };
  const emit = (type: string) => {
    for (const fn of [...(listeners.get(type) ?? [])]) fn();
  };
  const queue = (type: string) => at(now, () => emit(type)); // a media element task
  const cueAt = (time: number) => cues.find((c) => c.startTime <= time && time < c.endTime) ?? null;
  const updateCues = () => {
    const next = cueAt(tMs / 1000);
    if (next !== active) {
      active = next;
      for (const fn of [...cueListeners]) fn();
    }
  };

  const element = {
    play() {
      if (paused) {
        paused = false;
        if (tMs >= duration * 1000) {
          seek(0); // a play after the end starts again
        }
        queue("play");
        queue("playing");
      }
      return Promise.resolve();
    },
    pause() {
      if (!paused) {
        paused = true;
        queue("pause");
      }
    },
  };

  function seek(to: number) {
    seekingTo = to;
    queue("seeking");
    at(now + 30, () => {
      tMs = Math.round(to * 1000);
      seekingTo = null;
      updateCues();
      emit("timeupdate");
      emit("seeked");
    });
  }

  const video: DescribedVideo = {
    time: () => tMs / 1000,
    paused: () => paused,
    rate: () => 1,
    play: () => {
      describerCalls.play++;
      log.push(`describer play @${(tMs / 1000).toFixed(2)}`);
      return element.play();
    },
    pause: () => {
      describerCalls.pause++;
      log.push(`describer pause @${(tMs / 1000).toFixed(2)}`);
      element.pause();
    },
    on: (type: VideoEvent, listener: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
      return () => listeners.get(type)!.delete(listener);
    },
  };

  const track: DescriptionTrack = {
    activeCue: () => active,
    onCueChange: (listener) => {
      cueListeners.add(listener);
      return () => cueListeners.delete(listener);
    },
  };

  let line = 0; // the line being read, by token
  const voice: Voice = {
    say(text, events) {
      const mine = ++line;
      const entry = { text, from: now, to: null as number | null, at: tMs / 1000 };
      spoken.push(entry);
      if (wordsPerSecond === 0) {
        at(now + 4000, () => mine === line && events.done(false));
        return;
      }
      at(now + 40, () => mine === line && events.started());
      at(now + 40 + (words(text) / wordsPerSecond) * 1000, () => {
        if (mine !== line) return;
        entry.to = now;
        events.done(true);
      });
    },
    hush() {
      line++;
      const last = spoken.at(-1);
      if (last && last.to === null) last.to = -now; // negative: cut off at that moment
    },
  };

  const clock: Clock = {
    set: (fn, ms) => at(now + ms + lateTimersMs, fn),
    clear: (id) => {
      timers = timers.filter((timer) => timer.id !== id);
    },
  };

  const runDue = () => {
    for (;;) {
      timers.sort((a, b) => a.at - b.at || a.id - b.id);
      const due = timers[0];
      if (!due || due.at > now) return;
      timers.shift();
      due.fn();
    }
  };

  /** Run the film for `ms` of wall-clock time. */
  const run = (ms: number) => {
    const end = now + ms;
    while (now < end) {
      runDue();
      now += STEP;
      if (!paused && seekingTo === null) {
        tMs = Math.min(duration * 1000, tMs + STEP);
        sinceUpdate += STEP;
        updateCues();
        if (sinceUpdate >= 250) {
          sinceUpdate = 0;
          emit("timeupdate");
        }
        if (tMs >= duration * 1000) {
          paused = true;
          emit("pause");
          emit("ended");
        }
      }
    }
    runDue();
  };

  /** Run until the film's time reaches `time` (or `limitMs` passes). */
  const runTo = (time: number, limitMs = 600_000) => {
    const end = now + limitMs;
    while (tMs < time * 1000 && now < end) run(STEP);
  };

  const viewer = {
    play: () => element.play(),
    pause: () => element.pause(),
    seek,
  };

  // the track's cues have loaded, and the film is at 0 s (no cuechange yet): the describer is turned on now
  active = cueAt(0);
  const describer = describeFilm({ video, track, voice, clock });
  run(0);
  return {
    describer,
    viewer,
    run,
    runTo,
    log,
    spoken,
    describerCalls,
    time: () => tMs / 1000,
    isPaused: () => paused,
    wall: () => now,
  };
}

const LONG = "One two three four five six seven eight nine ten. Eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty."; // 20 words: 8 s
const SHORT = "Short line."; // 0.8 s

const cue = (startTime: number, endTime: number, text: string): DescriptionCue => ({ startTime, endTime, text });

describe("sentencesOf", () => {
  test("splits at sentence ends, never inside a quotation that goes on or a clause", () => {
    expect(
      sentencesOf(
        "Pebble's reply says both edits are in, but the task is held: “Blocked” and “Pebble's change isn't verified yet.”, with Run the tests, Ask Pebble to finish and Accept as unverified. The pointer clicks Run the tests.",
      ),
    ).toEqual([
      "Pebble's reply says both edits are in, but the task is held: “Blocked” and “Pebble's change isn't verified yet.”, with Run the tests, Ask Pebble to finish and Accept as unverified.",
      "The pointer clicks Run the tests.",
    ]);
    expect(sentencesOf("A “Lisbon trip budget” dashboard. Then a quiz asks “What does date(2026, 1, 31) + timedelta(days=1) return?”")).toEqual([
      "A “Lisbon trip budget” dashboard.",
      "Then a quiz asks “What does date(2026, 1, 31) + timedelta(days=1) return?”",
    ]);
    expect(sentencesOf("the line “An agent shouldn't grade its own work”. The pebble hops in.")).toEqual([
      "the line “An agent shouldn't grade its own work”.",
      "The pebble hops in.",
    ]);
  });

  test("every chapter's description reads whole, in lines short enough to end reliably", () => {
    for (const chapter of chapters) {
      const lines = sentencesOf(chapter.description);
      expect(lines.join(" ")).toBe(chapter.description.replace(/\s+/g, " ").trim());
      for (const line of lines) expect(words(line)).toBeLessThanOrEqual(32); // under about 13 s at 2.5 words/s
    }
  });
});

describe("cueAt", () => {
  // Chrome counts a cue as active at its own end time too, and updates activeCues a moment after a seek: on a chapter
  // button's seek to 21.6 s, activeCues[0] was the chapter just left. The cue is chosen by the film's time instead.
  const desktop = cue(0, 21.6, "Desktop.");
  const project = cue(21.6, 28.8, "Project.");
  const cues = [desktop, project];

  test("a chapter's first frame belongs to that chapter, never to the one that ends there", () => {
    expect(cueAt(cues, 21.6)).toBe(project);
    expect(cueAt(cues, 21.5995)).toBe(project); // within a millisecond of the cut: the time's float noise
  });

  test("the hold on a chapter's last frame is still that chapter", () => {
    expect(cueAt(cues, 21.6 - HOLD_LEAD)).toBe(desktop);
    expect(cueAt(cues, 0)).toBe(desktop);
  });

  test("no cue past the last one, and a cue without words is no description", () => {
    expect(cueAt(cues, 28.8)).toBe(null);
    expect(cueAt([cue(0, 5, "")], 1)).toBe(null);
    expect(cueAt([], 1)).toBe(null);
  });

  test("the DOM adapter reads the film's time, not activeCues[0], as Chrome reports them after a chapter's seek", () => {
    const video = { currentTime: 21.6 };
    // at the seek's target both cues are active (Chrome's closed intervals), the one that ends there first
    const textTrack = { cues, activeCues: [desktop, project], addEventListener() {}, removeEventListener() {} };
    const track = trackOf(textTrack as unknown as TextTrack, video as unknown as HTMLVideoElement);
    expect(track.activeCue()).toBe(project);
    video.currentTime = 21.769; // playing on, before Chrome has updated activeCues
    expect(track.activeCue()).toBe(project);
    video.currentTime = 21.55; // the hold on the desktop chapter's last frame
    textTrack.activeCues = [desktop];
    expect(track.activeCue()).toBe(desktop);
  });
});

describe("describeFilm", () => {
  test("a description that fits its cue never stops the film", () => {
    const f = film({ cues: [cue(0, 10, SHORT), cue(10, 20, SHORT)] });
    f.viewer.play();
    f.runTo(20);
    expect(f.describerCalls).toEqual({ play: 0, pause: 0 });
    expect(f.spoken.map((s) => s.text)).toEqual(["Short line.", "Short line."]);
    expect(f.spoken[1]!.at).toBeCloseTo(10, 1);
  });

  test("a longer one holds the film on its cue's last frame, and the film plays on when the voice is done", () => {
    const f = film({ cues: [cue(0, 5, LONG), cue(5, 10, SHORT)] });
    f.viewer.play();
    f.run(6000);
    expect(f.isPaused()).toBe(true);
    expect(f.describerCalls.pause).toBe(1);
    // paused HOLD_LEAD before the cut, within a step
    expect(f.time()).toBeGreaterThanOrEqual(5 - HOLD_LEAD - 0.011);
    expect(f.time()).toBeLessThan(5);
    f.run(3000); // the voice ends at about 8.1 s
    expect(f.describerCalls.play).toBe(1);
    expect(f.isPaused()).toBe(false);
    // every word of the first cue was read, then the second cue's, once the film was in it
    expect(f.spoken.map((s) => s.text)).toEqual([...sentencesOf(LONG), SHORT]);
    expect(f.spoken.every((s, i) => i === f.spoken.length - 1 || (s.to ?? -1) > 0)).toBe(true);
    f.runTo(10);
    expect(f.describerCalls).toEqual({ play: 1, pause: 1 });
  });

  test("a seek during the wait drops it: the film stays where the viewer put it, and that chapter is read from its start", () => {
    const f = film({ cues: [cue(0, 5, LONG), cue(5, 10, LONG)] });
    f.viewer.play();
    f.run(5500); // waiting
    expect(f.isPaused()).toBe(true);
    f.viewer.seek(7);
    f.run(SEEK_SETTLE_MS + 200);
    expect(f.time()).toBe(7);
    expect(f.isPaused()).toBe(true);
    const second = sentencesOf(LONG)[0]!;
    expect(f.spoken.at(-1)!.text).toBe(second);
    expect(f.spoken.at(-1)!.at).toBe(7);
    f.run(10_000); // the voice finishes; nobody plays the film but the viewer
    expect(f.describerCalls.play).toBe(0);
    expect(f.isPaused()).toBe(true);
  });

  test("the viewer playing during the wait wins: the voice goes on until the next cue, which it then reads", () => {
    const f = film({ cues: [cue(0, 5, LONG), cue(5, 10, LONG), cue(10, 15, SHORT)] });
    f.viewer.play();
    f.run(5500);
    expect(f.isPaused()).toBe(true);
    f.viewer.play();
    f.run(200);
    expect(f.isPaused()).toBe(false);
    expect(f.time()).toBeGreaterThan(5);
    // the first cue was cut at the next one, which is being read now
    expect(f.spoken.at(-1)!.text).toBe(sentencesOf(LONG)[0]!);
    expect(f.spoken.at(-1)!.at).toBeGreaterThanOrEqual(5);
    // and the second cue, also too long, waits again at its own end
    f.runTo(9.9, 10_000);
    f.run(500);
    expect(f.isPaused()).toBe(true);
    expect(f.describerCalls.pause).toBe(2);
  });

  test("a pause by the viewer is never undone", () => {
    const f = film({ cues: [cue(0, 5, LONG), cue(5, 10, SHORT)] });
    f.viewer.play();
    f.run(2000);
    f.viewer.pause();
    f.run(9000); // the voice ends while the viewer has the film paused
    expect(f.isPaused()).toBe(true);
    expect(f.describerCalls).toEqual({ play: 0, pause: 0 });
    f.viewer.play();
    f.runTo(10);
    expect(f.describerCalls.pause).toBe(0); // the voice was done: no wait
  });

  test("a viewer who pauses and plays again mid-description still gets the wait at the cue's end", () => {
    const f = film({ cues: [cue(0, 5, LONG), cue(5, 10, SHORT)] });
    f.viewer.play();
    f.run(1000);
    f.viewer.pause();
    f.run(500);
    f.viewer.play();
    f.run(5000);
    expect(f.isPaused()).toBe(true);
    expect(f.describerCalls.pause).toBe(1);
    f.run(4000);
    expect(f.describerCalls.play).toBe(1);
    expect(f.isPaused()).toBe(false);
  });

  test("a film that runs past the cue before the timer fires is held at the next cue's start, and nothing is lost", () => {
    const f = film({ cues: [cue(0, 5, LONG), cue(5, 10, SHORT)], lateTimersMs: 400 });
    f.viewer.play();
    f.run(6000);
    expect(f.isPaused()).toBe(true);
    expect(f.time()).toBeGreaterThanOrEqual(5);
    expect(f.time()).toBeLessThan(5.1);
    f.run(4000);
    expect(f.isPaused()).toBe(false);
    expect(f.spoken.map((s) => s.text)).toEqual([...sentencesOf(LONG), SHORT]);
    expect(f.spoken.slice(0, -1).every((s) => (s.to ?? -1) > 0)).toBe(true); // no line of the first cue was cut
  });

  test("turning the description off during a wait plays the film on; closing the theatre doesn't", () => {
    const off = film({ cues: [cue(0, 5, LONG), cue(5, 10, SHORT)] });
    off.viewer.play();
    off.run(5500);
    expect(off.isPaused()).toBe(true);
    off.describer.stop({ resume: true });
    off.run(100);
    expect(off.isPaused()).toBe(false);
    expect(off.spoken.at(-1)!.to).toBeLessThan(0); // hushed

    const closed = film({ cues: [cue(0, 5, LONG), cue(5, 10, SHORT)] });
    closed.viewer.play();
    closed.run(5500);
    closed.describer.halt();
    closed.run(10_000);
    expect(closed.isPaused()).toBe(true);
    expect(closed.describerCalls.play).toBe(0);
    // the next play reads the chapter the film is in from its beginning
    const before = closed.spoken.length;
    closed.viewer.play();
    closed.run(200);
    expect(closed.spoken.length).toBe(before + 1);
    expect(closed.spoken.at(-1)!.text).toBe(sentencesOf(LONG)[0]!);
  });

  test("closing the theatre while a seek settles reads nothing until the film plays again, then reads that chapter", () => {
    for (const settled of [false, true]) {
      // the theatre closes between the seek's seeking and seeked events, or after seeked while the seek settles
      const f = film({ cues: [cue(0, 5, LONG), cue(5, 10, LONG)] });
      f.viewer.play();
      f.run(1000);
      f.viewer.seek(7);
      f.run(settled ? 100 : 10);
      const before = f.spoken.length;
      f.describer.halt(); // FilmPlayer's onClose: halt, then pause
      f.viewer.pause();
      f.run(10_000);
      expect(f.spoken.length).toBe(before); // silent while closed
      expect(f.isPaused()).toBe(true);
      f.viewer.play(); // reopened
      f.run(200);
      expect(f.spoken.length).toBe(before + 1);
      expect(f.spoken.at(-1)!.text).toBe(sentencesOf(LONG)[0]!);
      expect(f.spoken.at(-1)!.at).toBeGreaterThanOrEqual(7);
    }
  });

  test("a voice that never starts never holds the film", () => {
    const f = film({ cues: [cue(0, 5, LONG), cue(5, 10, LONG)], wordsPerSecond: 0 });
    f.viewer.play();
    f.runTo(10);
    expect(f.describerCalls).toEqual({ play: 0, pause: 0 });
  });

  test("turned on mid-film, it reads the chapter the film is in", () => {
    const f = film({ cues: [cue(0, 5, SHORT), cue(5, 10, SHORT)] });
    expect(f.spoken.length).toBe(1); // the cue at 0 s, read at once (the film is paused there)
    expect(f.spoken[0]!.at).toBe(0);
  });

  test("the whole film: every description is read to its last word, and the film waits only where the words run long", () => {
    const timed = chapters.filter((c) => typeof c.startSeconds === "number");
    const end = FILM_DURATION_SECONDS!;
    const cues = timed.map((c, i) => cue(c.startSeconds!, timed[i + 1]?.startSeconds ?? end, c.description));
    const f = film({ cues, duration: end });
    f.viewer.play();
    f.runTo(end, 400_000);
    expect(f.time()).toBe(end);
    // nothing was cut off: every line of every description ended by itself
    expect(f.spoken.map((s) => s.text)).toEqual(cues.flatMap((c) => sentencesOf(c.text)));
    expect(f.spoken.every((s) => (s.to ?? -1) > 0)).toBe(true);
    // a wait at the end of each cue whose words outlast it (7 of 9 at 2.5 words a second), each on its last frame
    const long = cues.filter((c) => (words(c.text) / 2.5) * 1000 + 40 * sentencesOf(c.text).length > (c.endTime - c.startTime) * 1000);
    const waits = f.log.filter((l) => l.startsWith("describer pause")).map((l) => Number(l.split("@")[1]));
    expect(waits.length).toBe(long.length);
    expect(long.length).toBe(7);
    long.forEach((c, i) => {
      expect(waits[i]!).toBeGreaterThanOrEqual(c.endTime - HOLD_LEAD - 0.011);
      expect(waits[i]!).toBeLessThan(c.endTime);
    });
    expect(f.describerCalls.play).toBe(long.length);
    // the film with its description runs about as long as its words take to read
    const readingMs = cues.reduce((sum, c) => sum + Math.max((c.endTime - c.startTime) * 1000, (words(c.text) / 2.5) * 1000), 0);
    expect(f.wall()).toBeGreaterThan(readingMs);
    expect(f.wall()).toBeLessThan(readingMs + 4000);
  });
});
