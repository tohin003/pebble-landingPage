// Optional deterministic clock for frame-by-frame video capture (enabled by ?vclock in the page URL).
// It replaces performance.now, Date, setTimeout/setInterval and requestAnimationFrame BEFORE Pebble's code loads, so
// the avatar engine (rAF + performance.now), status-word timers and elapsed counters advance only when the recorder
// calls window.__pebbleClock.advance(ms). Each recorded frame is then exact and repeatable at any resolution.
// CSS keyframe effects (spinners, "breathing" dots) still run on the compositor's real clock.
if (new URLSearchParams(location.search).has("vclock")) {
  const realPerfNow = performance.now.bind(performance);
  const perf0 = realPerfNow();
  const date0 = Date.now();
  let now = 0; // virtual milliseconds since the page started
  let seq = 0;
  const timers = new Map();
  const frames = new Map();
  const RealDate = Date;

  performance.now = () => perf0 + now;
  class VirtualDate extends RealDate {
    constructor(...args) {
      if (args.length) super(...args);
      else super(date0 + now);
    }
    static now() {
      return date0 + now;
    }
  }
  window.Date = VirtualDate;
  window.setTimeout = (fn, ms = 0, ...args) => {
    const id = ++seq;
    timers.set(id, { at: now + Math.max(0, Number(ms) || 0), every: 0, fn, args, order: id });
    return id;
  };
  window.setInterval = (fn, ms = 0, ...args) => {
    const id = ++seq;
    const every = Math.max(1, Number(ms) || 0);
    timers.set(id, { at: now + every, every, fn, args, order: id });
    return id;
  };
  window.clearTimeout = window.clearInterval = (id) => void timers.delete(id);
  window.requestAnimationFrame = (fn) => {
    const id = ++seq;
    frames.set(id, fn);
    return id;
  };
  window.cancelAnimationFrame = (id) => void frames.delete(id);

  const yieldMicrotasks = async (turns = 3) => {
    for (let i = 0; i < turns; i++) await Promise.resolve();
  };
  window.__pebbleClock = {
    get now() {
      return now;
    },
    /** Advance virtual time by `ms`: run due timers in time order (letting Vue flush between them), then one rAF tick. */
    async advance(ms) {
      const end = now + Math.max(0, ms);
      for (let guard = 0; guard < 10000; guard++) {
        let next = null;
        for (const [id, t] of timers) if (t.at <= end && (!next || t.at < next[1].at || (t.at === next[1].at && t.order < next[1].order))) next = [id, t];
        if (!next) break;
        const [id, t] = next;
        now = Math.max(now, t.at);
        if (t.every) t.at += t.every;
        else timers.delete(id);
        try {
          typeof t.fn === "function" ? t.fn(...t.args) : null;
        } catch (error) {
          console.error(error);
        }
        await yieldMicrotasks();
      }
      now = end;
      const callbacks = [...frames.values()];
      frames.clear();
      for (const fn of callbacks)
        try {
          fn(perf0 + now);
        } catch (error) {
          console.error(error);
        }
      await yieldMicrotasks();
    },
  };
}
