// Extended audio description for the film theatre (critic H4a; prep-encode issue 2; FILM_SPEC §18).
//
// film.descriptions.en.vtt has one cue a chapter, and 7 of its 9 descriptions need more speech time than their chapter
// lasts (tools/captions/build.mjs --check warns). So the film waits for the voice (WCAG 1.2.7):
// - each cue is read aloud when the film reaches it, sentence by sentence;
// - when the voice is still reading as the film reaches the cue's end, the film pauses on the chapter's last frame
//   (HOLD_LEAD before the cut) and plays on as soon as the voice is done;
// - a cue that ends before its words do never cuts them off: the next chapter's description starts after them.
// The viewer always wins:
// - pressing play during the wait ends it (the voice goes on until the next chapter starts, then reads that one);
// - a pause by the viewer is never undone: the film plays on only after a wait the describer started itself;
// - a seek stops the voice and drops the wait without playing; once the seeking settles, the description of the
//   chapter the film landed in starts from its beginning (the chapter buttons, the native scrubber, the arrow keys);
// - turning the description off during a wait plays the film on (the wait was the voice's); closing the theatre
//   doesn't, and the next play reads the chapter from its beginning.
// Captions are another track and are untouched: the player's own controls show them, paused or playing.
//
// Pure logic with its surroundings passed in (the video, the track, a voice, a clock), so bun can test it without a
// browser (audioDescription.test.ts); `videoOf`, `trackOf` and `browserVoice` adapt the DOM's.

/** A description cue: a VTTCue has these three fields. */
export type DescriptionCue = Readonly<{ startTime: number; endTime: number; text: string }>;

export type VideoEvent = "play" | "playing" | "pause" | "seeking" | "seeked" | "timeupdate" | "ratechange" | "waiting";

/** The parts of the <video> the describer reads and drives. */
export type DescribedVideo = Readonly<{
  time(): number;
  paused(): boolean;
  rate(): number;
  play(): Promise<unknown> | void;
  pause(): void;
  on(type: VideoEvent, listener: () => void): () => void;
}>;

/** The descriptions track: its active cue, and a callback when that changes. */
export type DescriptionTrack = Readonly<{
  activeCue(): DescriptionCue | null;
  onCueChange(listener: () => void): () => void;
}>;

/**
 * A voice reads one line at a time. `done` fires once per line: true when the line was read, false when it couldn't
 * be (no voice, an error, nothing started). After `hush()`, no callback of the hushed line fires.
 */
export type Voice = Readonly<{
  say(text: string, events: Readonly<{ started(): void; done(ok: boolean): void }>): void;
  hush(): void;
}>;

export type Clock = Readonly<{ set(fn: () => void, ms: number): unknown; clear(handle: unknown): void }>;

export type Describer = Readonly<{
  /** Stop reading and drop any wait, leaving the film as it is (the theatre closed); the next play reads the chapter again. */
  halt(): void;
  /** Stop for good. With `resume`, a film that is waiting for the voice plays on (the description was turned off). */
  stop(options?: Readonly<{ resume?: boolean }>): void;
}>;

/** The wait starts this long before the cue's end, so the film holds on the chapter's last frame (30 fps: 1.5 frames). */
export const HOLD_LEAD = 0.05;
/** A seek's description starts once the seeking has stopped for this long (a drag along the scrubber is many seeks). */
export const SEEK_SETTLE_MS = 250;

/**
 * A description's sentences, read as separate lines: short utterances end reliably (Chrome's network voices can stop
 * a long one after about 15 seconds without an end event), and a sentence never splits where a quotation or a
 * clause goes on ("“Pebble's change isn't verified yet.”, with Run the tests").
 */
export function sentencesOf(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…][”’"')\]]?)\s+(?=[A-Z0-9“‘"(])/u)
    .filter((line) => line.length > 0);
}

export function describeFilm({
  video,
  track,
  voice,
  clock,
}: Readonly<{ video: DescribedVideo; track: DescriptionTrack; voice: Voice; clock: Clock }>): Describer {
  let cue: DescriptionCue | null = null; // the cue being read
  let lines: string[] = []; // its sentences still to read
  let reading = false; // a line is being read now
  let waiting = false; // the film is paused by the describer, waiting for the voice
  let overruled = false; // the viewer played on during this cue's wait: no more waits for it
  let queued: DescriptionCue | null = null; // a cue the film reached while the voice was still on the last one
  let ownPause = false; // the next pause event is the describer's
  let ownPlay = false; // the next play event is the describer's
  let seeking = false; // from a seek until it has settled
  let closed = false; // after halt() (the theatre closed): nothing is read until the film plays again
  let boundary: unknown = null; // the timer that starts the wait at the cue's end
  let settle: unknown = null; // the timer that ends a seek's settling
  let stopped = false;

  const busy = () => reading || lines.length > 0;

  const clearBoundary = () => {
    if (boundary !== null) clock.clear(boundary);
    boundary = null;
  };

  const playOn = () => {
    if (!video.paused()) return;
    ownPlay = true;
    const started = video.play();
    if (started && typeof (started as Promise<unknown>).catch === "function") {
      (started as Promise<unknown>).catch(() => {
        ownPlay = false; // refused: no play event will come
      });
    }
  };

  const wait = () => {
    clearBoundary();
    if (video.paused()) return;
    waiting = true;
    ownPause = true;
    video.pause();
  };

  // Keep a timer on the cue's end while the voice is reading and the film is playing; re-armed on every time update,
  // so a stall, a rate change or an early timer only moves it.
  const armBoundary = () => {
    clearBoundary();
    if (stopped || closed || !cue || !busy() || waiting || overruled || seeking || video.paused()) return;
    const left = (cue.endTime - video.time()) / Math.max(video.rate(), 0.0625);
    if (left <= HOLD_LEAD + 0.005) {
      wait();
      return;
    }
    boundary = clock.set(armBoundary, (left - HOLD_LEAD) * 1000);
  };

  const finished = () => {
    // the voice is done with `cue`: read the chapter the film already reached, then play on if we were waiting
    const next = queued;
    queued = null;
    if (next) begin(next);
    if (waiting) {
      waiting = false;
      playOn();
    }
  };

  const readNext = () => {
    if (stopped) return;
    const line = lines.shift();
    if (line === undefined) {
      reading = false;
      clearBoundary();
      finished();
      return;
    }
    reading = true;
    voice.say(line, {
      started: armBoundary,
      done: (ok) => {
        if (stopped) return;
        reading = false;
        if (!ok) lines = []; // a voice that can't read this line won't read the rest: never wait on it
        readNext();
      },
    });
    armBoundary();
  };

  /** Read `next` from its first sentence, dropping whatever was being read. */
  function begin(next: DescriptionCue | null) {
    voice.hush();
    reading = false;
    clearBoundary();
    cue = next;
    lines = next ? sentencesOf(next.text) : [];
    overruled = false;
    queued = null;
    readNext();
  }

  const reset = () => {
    voice.hush();
    reading = false;
    lines = [];
    cue = null;
    queued = null;
    waiting = false; // never played on: the viewer (or the theatre) has the film now
    overruled = false;
    clearBoundary();
  };

  const offs: Array<() => void> = [];
  const on = (type: VideoEvent, listener: () => void) => offs.push(video.on(type, listener));

  on("pause", () => {
    if (ownPause) {
      ownPause = false;
      return;
    }
    clearBoundary(); // the viewer paused (or the film ended): nothing to wait for while it's still
  });
  on("play", () => {
    if (ownPlay) {
      ownPlay = false;
      return;
    }
    if (waiting) {
      waiting = false; // the viewer played on: the wait is over, and this cue won't start another
      overruled = true;
    }
  });
  on("playing", () => {
    if (closed) {
      // reopened: read the chapter the film is in from its beginning (after a seek, once it has settled)
      closed = false;
      if (!seeking) begin(track.activeCue());
      return;
    }
    armBoundary();
  });
  on("timeupdate", armBoundary);
  on("ratechange", armBoundary);
  on("waiting", clearBoundary);
  on("seeking", () => {
    seeking = true;
    if (settle !== null) clock.clear(settle);
    settle = null;
    reset();
  });
  on("seeked", () => {
    if (settle !== null) clock.clear(settle);
    settle = clock.set(() => {
      settle = null;
      seeking = false;
      if (!closed) begin(track.activeCue()); // closed meanwhile: the next playing reads it
    }, SEEK_SETTLE_MS);
  });
  offs.push(
    track.onCueChange(() => {
      if (stopped || seeking || closed) return;
      const next = track.activeCue();
      if (next === cue) return;
      if (waiting) {
        queued = next; // the voice is still on the last cue; this one starts when it's done
        return;
      }
      if (next && busy() && !overruled) {
        // the film reached the next cue before the timer could start the wait
        queued = next;
        wait();
        return;
      }
      begin(next);
    }),
  );

  // Turned on mid-film: read the chapter the film is in (a cuechange may come first; then this does nothing).
  const first = clock.set(() => {
    if (!stopped && !seeking && !closed && cue === null) begin(track.activeCue());
  }, 0);

  return {
    halt() {
      if (stopped) return;
      reset();
      // a seek still settling never starts the voice behind a closed theatre, and never leaves it waiting for a
      // settle that was cancelled: the next playing reads the chapter
      if (settle !== null) clock.clear(settle);
      settle = null;
      seeking = false;
      closed = true;
    },
    stop({ resume = false } = {}) {
      if (stopped) return;
      const wasWaiting = waiting;
      reset();
      stopped = true;
      clock.clear(first);
      if (settle !== null) clock.clear(settle);
      for (const off of offs) off();
      if (resume && wasWaiting) {
        // the listeners are gone, so this play needs no marking
        const started = video.play();
        if (started && typeof (started as Promise<unknown>).catch === "function") (started as Promise<unknown>).catch(() => {});
      }
    },
  };
}

// ---- DOM adapters -----------------------------------------------------------------------------------------------

export function videoOf(element: HTMLVideoElement): DescribedVideo {
  return {
    time: () => element.currentTime,
    paused: () => element.paused,
    rate: () => element.playbackRate,
    play: () => element.play(),
    pause: () => element.pause(),
    on: (type, listener) => {
      element.addEventListener(type, listener);
      return () => element.removeEventListener(type, listener);
    },
  };
}

export function trackOf(textTrack: TextTrack): DescriptionTrack {
  return {
    activeCue: () => {
      const active = textTrack.activeCues?.[0] as VTTCue | undefined;
      return active && active.text ? active : null;
    },
    onCueChange: (listener) => {
      textTrack.addEventListener("cuechange", listener);
      return () => textTrack.removeEventListener("cuechange", listener);
    },
  };
}

export const browserClock: Clock = {
  set: (fn, ms) => window.setTimeout(fn, ms),
  clear: (handle) => window.clearTimeout(handle as number),
};

/** A line's longest plausible reading time: a slow voice reads about 1.5 words a second; then the line is let go. */
export const lineBudgetMs = (text: string) => 4000 + 700 * text.split(/\s+/).filter(Boolean).length;
/** A voice that hasn't started a line by then won't: the description is dropped rather than waited for. */
export const START_WITHIN_MS = 4000;

/** The browser's speechSynthesis, one utterance a line. */
export function browserVoice(lang = "en-GB"): Voice {
  const synth = window.speechSynthesis;
  let token = 0;
  // the utterance being read: kept referenced until it ends (Chrome drops the events of a collected utterance)
  let current: SpeechSynthesisUtterance | null = null;
  return {
    say(text, events) {
      const mine = ++token;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      const finish = (ok: boolean, silence: boolean) => {
        if (mine !== token) return;
        token++;
        window.clearTimeout(timer);
        current = null;
        if (silence) synth.cancel(); // a line let go by its timer: never let it play late, over the next one
        events.done(ok);
      };
      let timer = window.setTimeout(() => finish(false, true), START_WITHIN_MS);
      utterance.onstart = () => {
        if (mine !== token) return;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => finish(true, true), lineBudgetMs(text));
        events.started();
      };
      utterance.onend = () => finish(true, false);
      utterance.onerror = () => finish(false, false); // a hushed line's "interrupted" error never reaches here (token)
      current = utterance;
      synth.speak(utterance);
    },
    hush() {
      token++;
      current = null;
      synth.cancel();
    },
  };
}
