// The Pebble 2.0 launch film's recorded clips (lane launch-ui, 1 Nov 2026): Pebble 2.0.1's own frontend (the frozen
// v2.0.1 tree) with the launch world (capture/mock/launch-world.js, `?world=launch`), played frame by frame on the virtual
// clock. record.mjs loads this file with --timelines=capture/launch/timelines.mjs:
//   scripts/heavy.sh launch-rec capture/with-server.sh node capture/record.mjs launch-agentguard \
//     --timelines=capture/launch/timelines.mjs --theme=dark --fps=60 --scale=2 --hide=.token-stats \
//     --out=.work/launch/ui/frames/launch-agentguard
// then capture/launch/encode.sh. Each clip is a re-enactment with sample data: the host's events are the v2.0.1
// backend's, in its own order (run_activity.py, controller.py held(), app.py _approve(), runner.py), at illustrative
// times; the person's clicks are real clicks on the window's own controls.
//
// Every timeline also:
//   - drives the page's CSS animations from the virtual clock (cssClock): the work view's ring and live cards, spinners
//     and toasts animate by CSS on the compositor's real clock, which a frame-by-frame recording would otherwise sample
//     at random;
//   - logs the person's pointer (meta.pointer: [t, x, y, "move" | "click"], CSS px of the 1440×900 window) for a film
//     that draws a cursor, and moves the real mouse there so hover states match it;
//   - measures the boxes the film aims at (meta.boxes: name -> {t, box: [left, top, width, height]} in CSS px).
// meta goes into the recording's timeline.json; capture/launch/manifest.mjs turns it into video/src/launch/data/ui.ts.

const WIDE = { width: 1440, height: 900 };
const r3 = (x) => Math.round(x * 1000) / 1000;

export default function timelines({ emit, live, fixture }) {
  // ---- shared helpers --------------------------------------------------------------------------------------------
  // CSS animations and transitions on the virtual clock: after every advance, each running animation is paused and set
  // to the virtual time since this page first saw it.
  async function cssClock(page) {
    await page.evaluate(() => {
      const clock = window.__pebbleClock, seen = new WeakMap(), advance = clock.advance.bind(clock);
      clock.advance = async (ms) => {
        await advance(ms);
        for (const a of document.getAnimations()) {
          if (!seen.has(a)) seen.set(a, clock.now);
          a.pause();
          a.currentTime = Math.max(0, clock.now - seen.get(a));
        }
      };
    });
  }
  // An element's box and, tighter, the box of its text (a Range over its contents: the lines' own boxes), CSS px.
  const box = (page, selector, pick = "first") =>
    page.evaluate((sel, which) => {
      const all = [...document.querySelectorAll(sel)].filter((el) => { const b = el.getBoundingClientRect(); return b.width && b.height; });
      const el = which === "last" ? all.at(-1) : all[0];
      if (!el) return null;
      const r1 = (b) => [b.left, b.top, b.width, b.height].map((v) => Math.round(v * 10) / 10);
      const range = document.createRange();
      range.selectNodeContents(el);
      const lines = [...range.getClientRects()].filter((b) => b.width > 1 && b.height > 1);
      const text = lines.length ? (() => {
        const l = Math.min(...lines.map((b) => b.left)), t = Math.min(...lines.map((b) => b.top));
        return r1({ left: l, top: t, width: Math.max(...lines.map((b) => b.right)) - l, height: Math.max(...lines.map((b) => b.bottom)) - t });
      })() : null;
      return { box: r1(el.getBoundingClientRect()), text };
    }, selector, pick);
  // The union of several elements' boxes (CSS px), or null.
  const union = (page, selectors) =>
    page.evaluate((list) => {
      const boxes = list.flatMap((sel) => [...document.querySelectorAll(sel)]).map((el) => el.getBoundingClientRect()).filter((b) => b.width && b.height);
      if (!boxes.length) return null;
      const l = Math.min(...boxes.map((b) => b.left)), t = Math.min(...boxes.map((b) => b.top));
      const r = Math.max(...boxes.map((b) => b.right)), btm = Math.max(...boxes.map((b) => b.bottom));
      return [l, t, r - l, btm - t].map((v) => Math.round(v * 10) / 10);
    }, selectors);
  function kit(meta, steps) {
    const on = (t, fn) => steps.push([t, fn]);
    meta.pointer = [];
    meta.boxes = {};
    meta.moments = {};
    // The person's pointer: arrive over the control `lead` s before the click (hover shows), click, then rest.
    const centre = async (page, selector, text) => {
      const b = await page.evaluate((sel, words) => {
        const el = [...document.querySelectorAll(sel)].find((e) => !words || e.textContent.replace(/\s+/g, " ").includes(words));
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return [r.left + r.width / 2, r.top + r.height / 2];
      }, selector, text || "");
      if (!b) throw new Error("nothing to point at: " + selector + (text ? " (" + text + ")" : ""));
      return b.map((v) => Math.round(v * 10) / 10);
    };
    const press = (t, name, selector, { text = null, lead = 0.3 } = {}) => {
      let at = null;
      on(t - lead, async (page) => {
        at = await centre(page, selector, text);
        meta.boxes[name] = { t: r3(t), box: await page.evaluate((sel, words) => {
          const el = [...document.querySelectorAll(sel)].find((e) => !words || e.textContent.replace(/\s+/g, " ").includes(words));
          const r = el.getBoundingClientRect();
          return [r.left, r.top, r.width, r.height].map((v) => Math.round(v * 10) / 10);
        }, selector, text || "") };
        meta.pointer.push([r3(t - lead), ...at, "move"]);
        await page.mouse.move(at[0], at[1]);
      });
      on(t, async (page) => {
        meta.pointer.push([r3(t), ...at, "click"]);
        meta.moments[name] = r3(t);
        await page.mouse.down();
        await page.mouse.up();
      });
    };
    const rest = (t, x, y) => on(t, async (page) => { meta.pointer.push([r3(t), x, y, "move"]); await page.mouse.move(x, y); });
    const measure = (t, name, selectors, pick) => on(t, async (page) => {
      if (Array.isArray(selectors)) meta.boxes[name] = { t: r3(t), box: await union(page, selectors) };
      else {
        const b = await box(page, selectors, pick);
        meta.boxes[name] = { t: r3(t), box: b?.box ?? null, ...(b?.text ? { text: b.text } : {}) };
      }
    });
    const moment = (t, name) => { meta.moments[name] = r3(t); };
    const blur = (t) => on(t, (page) => page.evaluate(() => document.activeElement?.blur()));
    return { on, press, rest, measure, moment, blur };
  }
  // Wait (in real time, up to `ms`) for a selector while the virtual clock moves on in 50-ms steps: lazy components
  // (Settings is an async component) arrive by a module import, which the virtual clock doesn't drive.
  async function until(page, selector, ms = 10000) {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await page.$(selector)) return;
      await page.evaluate(() => window.__pebbleClock.advance(50));
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("timed out waiting for " + selector);
  }
  // Scroll a panel by an ease-in-out between t0 and t1 (one step per 1/60 s) so that the chosen element's top ends `y`
  // CSS px below the panel's top (measured on the first step), or to the panel's end.
  function scroll(steps, t0, t1, panel, target, y, pick = "last") {
    const n = Math.max(1, Math.round((t1 - t0) * 60));
    for (let i = 0; i <= n; i++) {
      const k = i / n, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      steps.push([t0 + (t1 - t0) * k, (page) => page.evaluate((sel, tsel, offset, which, ease, first) => {
        const el = document.querySelector(sel);
        if (!el) return;
        if (first) {
          let end = el.scrollHeight - el.clientHeight;
          if (tsel) {
            const all = [...el.querySelectorAll(tsel)], one = which === "first" ? all[0] : all.at(-1);
            if (one) end = el.scrollTop + one.getBoundingClientRect().top - el.getBoundingClientRect().top - offset;
          }
          el.dataset.launchFrom = String(el.scrollTop);
          el.dataset.launchTo = String(Math.max(0, Math.min(el.scrollHeight - el.clientHeight, end)));
        }
        const a = Number(el.dataset.launchFrom), b = Number(el.dataset.launchTo);
        el.scrollTop = a + (b - a) * ease;
      }, panel, target, y, pick, e, i === 0)]);
    }
  }

  // Scroll a panel to its end between t0 and t1 as a wheel does: each step adds the ease's share of the distance still
  // left, measured on that step, so content the browser's scroll anchoring absorbs never makes the view jump back.
  function scrollToEnd(steps, t0, t1, panel) {
    const n = Math.max(1, Math.round((t1 - t0) * 60)), ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
    for (let i = 1; i <= n; i++) {
      const before = ease((i - 1) / n), now = ease(i / n), share = (now - before) / (1 - before);
      steps.push([t0 + ((t1 - t0) * i) / n, (page) => page.evaluate((sel, part) => {
        const el = document.querySelector(sel);
        if (el) el.scrollTop += (el.scrollHeight - el.clientHeight - el.scrollTop) * part;
      }, panel, share)]);
    }
  }

  const T = {
    // (a) AgentGuard: the held task ("Pebble's change isn't verified yet." with Run the tests / Ask Pebble to finish /
    // Accept as unverified) → Run the tests → the "Run isolated tests" card → Run tests → the tests run (2.4 s) → the
    // run resumes → "Verified · pytest 42 passed on current files" → Done.
    // The host, as v2.0.1 does it: controller.py held('tests') notes the decision and stages the covering recipe as the
    // run's own host call through the normal approval (the `run` and `actions` events; the rows wait in the record); the
    // approve route runs the tests while the card reads Running and nothing else moves; once committed it writes "The
    // isolated test run finished …" into the conversation and dispatches the run, whose first progress publishes the
    // rows the window hasn't had; the model's turn streams into the live draft; the completion check verifies the change
    // (guard.receipt: pytest, 42 passed, current files); the turn's text arrives after the check; finish() saves the
    // reply again (it moves after the tests' summary) and the run completes.
    "launch-agentguard": {
      url: "?world=launch&scene=held-live&version=2.0.1",
      viewport: WIDE,
      transparent: false,
      probe: process.env.LAUNCH_PROBE === "1", // the visible-text audit (capture/launch/audit.py) sets it
      seconds: 12.5,
      note: "Pebble 2.0.1's frontend (the frozen v2.0.1 tree) driven by scripted host events in v2.0.1's own order: a re-enactment with sample data (Maya's invoice-kit).",
      async build(page) {
        const meta = T["launch-agentguard"].meta = { times: "seconds from the first frame" };
        const steps = [];
        const { on, press, rest, measure, moment, blur } = kit(meta, steps);
        const chat = "chat-invoice-fix", run = "run-fix-1", reply = "msg-fix-reply";
        // K: the person's two clicks, the tests' end, the resumed turn, the check, the reply, the settle, the scrolls.
        const K = { runTheTests: 1.4, runRecorded: 1.5, card: 1.55, runTests: 3.1, cardScroll: [3.45, 4.05], testsEnd: 5.5, resumed: 5.52, resultScroll: [5.75, 6.35],
          context: 5.62, turn: 5.66, respond: 7.5, verified: 7.55, text: 7.58, finish: 7.6, complete: 7.65, convScroll: [8.0, 8.6], stepsScroll: [8.9, 9.7] };
        const AT0 = 50.0, BASE = 31.4; // the run's own clock at the clip's first frame; its live seconds before the clip
        const at = (t) => r3(AT0 + t);
        await cssClock(page);
        // Pre-roll (before the first frame): the window opened while the run's last repair ran, so it read the run's record
        // live; now the hold arrives as v2.0.1 sends it: the last check (unresolved), the notice in the reply, the run's
        // state, the state note and idle (runner.py; run_activity STATE_NOTES).
        await page.evaluate(async (issue, base) => {
          const L = window.__pebble.world.live, P = window.__pebble, R = L.rows, all = R.held();
          const [check, note] = all.slice(-2), chat = "chat-invoice-fix", run = "run-fix-1";
          L.publish(run, check);
          await P.emit("activity", { chat_id: chat, run_id: run, item: check });
          await P.emit("token", { chat_id: chat, run_id: run, id: "msg-fix-reply", text: L.text.notice });
          L.message(chat, { id: "msg-fix-reply", content: L.reply.held });
          L.run(chat, { id: run, state: "verification_required", error: issue, elapsed: base, counts: { steps: 11, retries: 0, waited: 18 } });
          L.settle(run, "verification_required", base);
          L.active(null, null);
          await P.emit("run", { chat_id: chat, run_id: run, state: "verification_required", elapsed: base });
          L.publish(run, note);
          await P.emit("activity", { chat_id: chat, run_id: run, item: note });
          await P.emit("idle", { chat_id: chat, run_id: run });
        }, await fixture(page, "text.heldIssue"), BASE);
        for (let i = 0; i < 20; i++) await page.evaluate(() => window.__pebbleClock.advance(100));
        await page.evaluate(() => { const s = document.querySelector(".conversation-scroll"); s.scrollTop = s.scrollHeight; });
        await page.mouse.move(1180, 160);
        for (let i = 0; i < 10; i++) await page.evaluate(() => window.__pebbleClock.advance(100));
        meta.pointer.push([0, 1180, 160, "move"]);
        // The run on the clip's clock: held, waiting for the tests' approval, then live again until it completes.
        const transitions = [[0, "verification_required"], [K.runTheTests + 0.034, "waiting_approval"], [K.testsEnd, "queued"],
          [K.resumed, "running"], [K.complete, "completed"]];
        on(0, live("origin"));
        on(0, live("clock", run, { t0: 0, at0: AT0, base: BASE, transitions }));
        on(0, live("deferApproval", "act-tests-1"));
        measure(0.02, "heldRow", [".run-panel.run-conversation"]);
        measure(0.02, "heldButtons", [".run-panel.run-conversation .run-held"]);
        measure(0.02, "heldSentence", ".run-panel.run-conversation .run-state");
        measure(0.02, "verdictBefore", ".message.latest .thinking-verdict");
        measure(0.02, "notice", ".message.latest blockquote");
        moment(0, "held");
        // ---- Run the tests (controller.py held('tests')): the mock records the decision, the staged host call and the
        // approval bound to it (live-world run_held_tests); the host's `run` and `actions` events announce the card.
        press(K.runTheTests, "runTheTests", ".run-panel.run-conversation .run-held button", { text: "Run the tests", lead: 0.35 });
        on(K.runRecorded, emit("run", { chat_id: chat, run_id: run, state: "waiting_approval" }));
        on(K.card, async (pg) => {
          const tests = await pg.evaluate(() => window.__pebble.world.live.tests.pending);
          const edits = await pg.evaluate(() => window.__pebble.world.live.edits);
          await live("actions", chat, [...edits, tests])(pg);
          await emit("actions", { chat_id: chat, actions: [...edits, tests] })(pg);
        });
        blur(K.card + 0.05); // the announced card takes keyboard focus (App.vue announceApprovals); the pointer moved on
        rest(K.card + 0.25, 1080, 470);
        measure(K.card + 0.3, "testsCard", "#details-drawer .action-card.pending");
        measure(K.card + 0.3, "runTestsButton", "#details-drawer .action-card.pending .primary-button");
        moment(K.card, "card");
        // ---- Run tests (app.py _approve()): the action 'running' and its `actions` event; the tests run for 2.4 s while
        // the card reads Running; no progress, activity or run event meanwhile.
        press(K.runTests, "runTests", "#details-drawer .action-card.pending .primary-button", { lead: 0.4 });
        on(K.runTests + 0.01, async (pg) => {
          const list = await pg.evaluate(() => [...window.__pebble.world.live.edits, window.__pebble.world.live.tests.running]);
          await live("actions", chat, list)(pg);
          await emit("actions", { chat_id: chat, actions: list })(pg);
        });
        on(K.runTests + 0.02, live("active", chat, run));
        rest(K.runTests + 0.45, 1060, 300);
        // The card went to Earlier actions, the drawer's end: the person scrolls down to watch it run.
        scroll(steps, K.cardScroll[0], K.cardScroll[1], "#details-drawer .details-panel", null, 0);
        measure(K.cardScroll[1] + 0.1, "testsCardRunning", "#details-drawer .action-card", "last");
        // ---- The tests end: the receipt, the summary message, the run's records (the approval "Approved by you" with
        // its wait; the staged call's tests view now done), actions and idle; then the run is dispatched and the route
        // answers ("Action completed").
        on(K.testsEnd, async (pg) => {
          const w = "window.__pebble.world.live";
          const applied = await pg.evaluate(`[...${w}.edits, ${w}.tests.applied]`);
          const summary = await pg.evaluate(`${w}.text.testsSummary`);
          await live("actions", chat, applied)(pg);
          await live("hostMessage", chat, { id: "msg-fix-tests", role: "assistant", content: summary })(pg);
          await pg.evaluate((a0) => {
            const L = window.__pebble.world.live, R = L.rows, at = Math.round((a0) * 1000) / 1000;
            const items = L.items("run-fix-1"), note = items.find((i) => i.seq === 1408);
            const t0 = note ? note.at : at;
            L.publish("run-fix-1", { ...R.item(1472, t0, "tool", "Requesting isolated tests", { duration: 0.1, detail: "Staged for your approval.",
              view: R.testsView("done", { tests: { passed: 42, failed: 0, skipped: 0, errors: 0, total: 42 }, exit_code: 0 }, 2.4) }) });
            L.publish("run-fix-1", R.item(1536, Math.round((t0 + 0.034) * 1000) / 1000, "approval", "Approved by you: Requesting isolated tests",
              { duration: Math.round((at - t0 - 2.4) * 1000) / 1000 }));
          }, at(K.testsEnd));
          await emit("actions", { chat_id: chat, actions: applied })(pg);
          await live("active", null, null)(pg);
          await emit("idle", { chat_id: chat, run_id: run })(pg);
          await live("active", chat, run)(pg);
          await live("run", chat, { id: run, state: "queued" })(pg);
          await emit("run", { chat_id: chat, run_id: run, state: "queued" })(pg);
          await live("finishApproval", chat, "act-tests-1", applied.at(-1))(pg);
        });
        moment(K.testsEnd, "testsEnd");
        // ---- The resumed run: running; its first progress publishes the rows the window hasn't had; context; the turn.
        on(K.resumed, async (pg) => {
          await live("run", chat, { id: run, state: "running" })(pg);
          await emit("run", { chat_id: chat, run_id: run, state: "running" })(pg);
          await emit("progress", { chat_id: chat, run_id: run, label: "Preparing your local workspace", kind: "working", activity: "thinking" })(pg);
          const items = await pg.evaluate(() => window.__pebble.world.live.items("run-fix-1").filter((i) => i.seq >= 1408));
          for (const item of items) await emit("activity", { chat_id: chat, run_id: run, item })(pg);
        });
        const pub = (t, make) => on(t, async (pg) => {
          const item = await pg.evaluate(make);
          await live("publish", run, item)(pg);
          await emit("activity", { chat_id: chat, run_id: run, item })(pg);
        });
        pub(K.context, `window.__pebble.world.live.rows.recalled(1600, ${at(K.context)}, 3, 100)`);
        on(K.context, emit("progress", { chat_id: chat, run_id: run, label: "Recalled relevant context", kind: "done", memory_count: 3, activity: null }));
        // The model's turn: "Waiting for the model", its stream into the live draft (stream_journal.py; AttemptStream.vue
        // inline), "The model responded" with the provider's timings.
        const attempt = "b7c1" + "0".repeat(27) + "1";
        const text = await fixture(page, "reply.continueVerified");
        const journal = (event) => live("streamEvent", run, { attempt_id: attempt, step: 9, attempt: 1, ...event });
        const stream = (type) => emit("stream", { chat_id: chat, run_id: run, attempt_id: attempt, type, authorization: "none" });
        on(K.turn, emit("progress", { chat_id: chat, run_id: run, label: "Working with your model", kind: "working", activity: "thinking" }));
        pub(K.turn, `window.__pebble.world.live.rows.item(1664, ${at(K.turn)}, "model", "Waiting for the model", { status: "running" })`);
        on(K.turn, async (pg) => { await journal({ kind: "begin", state: "open" })(pg); await stream("begin")(pg); });
        const words = text.trim().split(/(?<=\s)/);
        const from = K.turn + 0.35, to = K.respond - 0.12;
        words.forEach((w, i) => on(from + ((to - from) * i) / words.length, async (pg) => { await journal({ kind: "delta", text: w })(pg); await stream("delta")(pg); }));
        pub(K.respond, `window.__pebble.world.live.rows.responded(1664, ${at(K.turn)}, ${r3(K.respond - K.turn)}, 0.5, 0.7)`);
        on(K.respond, async (pg) => { await journal({ kind: "settle", state: "committed", origin: "host" })(pg); await stream("committed")(pg); });
        // ---- The completion check (runner.py: controller.completion(); run_activity: the check row, its verdict from
        // guard.receipt(), its view work_view.checks_view()).
        pub(K.verified, `(() => { const R = window.__pebble.world.live.rows; return R.item(1728, ${at(K.verified)}, "check", "Verified · pytest 42 passed on current files",
          { duration: 0.05, view: R.checksView("Verified · pytest 42 passed on current files", { runner: "pytest", passed: 42, current: true }, 0) }); })()`);
        moment(K.verified, "verified");
        // The turn's text, after the check, in one token event on a new paragraph; finish() saves the reply again.
        on(K.text, emit("token", { chat_id: chat, run_id: run, id: reply, text }));
        on(K.finish, async (pg) => {
          const held = await fixture(pg, "reply.held");
          const usage = { input_tokens: 19870, output_tokens: 566, cached_tokens: 17408, tokens_per_second: 43.0, route: "model", calls: 6, seconds: 2.1 };
          await live("resave", chat, { id: reply, role: "assistant", content: held + text, run_id: run, usage })(pg);
          await emit("usage", { chat_id: chat, id: reply, usage })(pg);
          await emit("complete", { chat_id: chat, id: reply, seconds: 2.1 })(pg);
        });
        on(K.complete, async (pg) => {
          await live("active", null, null)(pg);
          await live("run", chat, { id: run, state: "completed", elapsed: r3(BASE + (K.complete - K.resumed)), counts: { steps: 15, retries: 0, waited: 25 } })(pg);
          await live("settle", run, "completed", r3(BASE + (K.complete - K.resumed)))(pg);
          await emit("run", { chat_id: chat, run_id: run, state: "completed", elapsed: r3(BASE + (K.complete - K.resumed)) })(pg);
          await emit("idle", { chat_id: chat, run_id: run })(pg);
        });
        moment(K.complete, "complete");
        // The card grew below the fold (its result and the test output): the person scrolls on to read them.
        scrollToEnd(steps, K.resultScroll[0], K.resultScroll[1], "#details-drawer .details-panel");
        measure(K.testsEnd + 0.1, "testsCardDone", "#details-drawer .action-card", "last");
        measure(K.resultScroll[1] + 0.1, "testsOutput", "#details-drawer .test-output", "last");
        measure(K.resultScroll[1] + 0.1, "testsCardResult", "#details-drawer .action-card", "last");
        // The person reads the reply's end, then brings the drawer's newest steps into view: the tests card, the check.
        scroll(steps, K.convScroll[0], K.convScroll[1], ".conversation-scroll", null, 0);
        scroll(steps, K.stepsScroll[0], K.stepsScroll[1], "#details-drawer .details-panel", "#details-drawer .work-entry", 150, "last");
        measure(K.convScroll[1] + 0.1, "verdictAfter", ".message.latest .thinking-verdict");
        measure(K.convScroll[1] + 0.1, "receiptAfter", [".message.latest .thinking-summary", ".message.latest .thinking-verdict"]);
        measure(K.convScroll[1] + 0.1, "replyAfter", ".message.latest");
        measure(K.stepsScroll[1] + 0.1, "testsWorkCard", "#details-drawer .work-card.tests", "last");
        measure(K.stepsScroll[1] + 0.1, "verifiedWorkCard", "#details-drawer .work-card.checks", "last");
        measure(K.stepsScroll[1] + 0.1, "summaryCard", "#details-drawer .work-summary");
        meta.K = K;
        return steps;
      },
    },

    // (b) Memory: Settings › Memory, its six layers with their counts (memory.py KINDS), "Your preferences" listed; the
    // person opens "Facts & knowledge", chooses the trash button on an outdated fact (a price quoted from the 2025 price
    // list), and the record asks once (Keep / Forget, Phase 45 F014); Forget deletes it (memory_delete), the layer is
    // read again and its count drops from 3 to 2 (state() after the settings panel's refresh).
    "launch-memory": {
      url: "?world=launch&scene=settings&version=2.0.1",
      viewport: WIDE,
      transparent: false,
      probe: process.env.LAUNCH_PROBE === "1", // the visible-text audit (capture/launch/audit.py) sets it
      seconds: 6.5,
      note: "Pebble 2.0.1's frontend (the frozen v2.0.1 tree) with sample memories: Settings › Memory and Forget, clicked on the window's own controls.",
      async build(page) {
        const meta = T["launch-memory"].meta = { times: "seconds from the first frame" };
        const steps = [];
        const { on, press, rest, measure, moment } = kit(meta, steps);
        const K = { layer: 1.3, trash: 2.7, forget: 4.0 };
        await cssClock(page);
        // Pre-roll: Settings from the sidebar's Settings button, then its Memory tab (AdvancedSettings changeTab()).
        await page.click(".sidebar-bottom .profile");
        await until(page, "#settings-tab-memory");
        await page.click("#settings-tab-memory");
        await page.mouse.move(1180, 760);
        await until(page, '#memory-records button[aria-label^="Forget this memory"]');
        for (let i = 0; i < 15; i++) await page.evaluate(() => window.__pebbleClock.advance(100));
        meta.pointer.push([0, 1180, 760, "move"]);
        measure(0.02, "layers", ".memory-types");
        measure(0.02, "records", "#memory-records");
        measure(0.02, "panel", ".modal");
        moment(0, "layers");
        press(K.layer, "factsLayer", "#memory-layer-semantic", { lead: 0.45 });
        rest(K.layer + 0.4, 1180, 560);
        measure(K.layer + 0.3, "factsRecords", "#memory-records");
        // The trash button on the old price list's quote ("Forget this memory: “Wheel taster: 10.00” From Documents…").
        const trash = '#memory-records button[aria-label^="Forget this memory: “Wheel taster"]';
        press(K.trash, "trash", trash, { lead: 0.45 });
        measure(K.trash + 0.15, "confirm", "#memory-records .forget-confirm");
        measure(K.trash + 0.15, "record", ["#memory-records article:has(.forget-confirm)"]);
        press(K.forget, "forget", "#memory-records .forget-confirm .danger", { lead: 0.5 });
        rest(K.forget + 0.45, 1180, 560);
        measure(K.forget + 0.4, "factsAfter", "#memory-records");
        measure(K.forget + 0.4, "factsTab", "#memory-layer-semantic");
        meta.K = K;
        return steps;
      },
    },

    // (c) A visual answer: the celadon question sent in a new Companion conversation; the model's turn streams into the
    // live draft (AttemptStream.vue inline), its text arrives once the turn is checked and the run completes; the reply's
    // Markdown table is drawn as a native table with a chart toggle (ReplyBody.vue, ReplyTable.vue: no model cost), and
    // the person chooses Chart (VisualChart.vue: "Grams by Material").
    "launch-visual-answer": {
      url: "?world=launch&scene=visual&version=2.0.1",
      viewport: WIDE,
      transparent: false,
      probe: process.env.LAUNCH_PROBE === "1", // the visible-text audit (capture/launch/audit.py) sets it
      seconds: 8.5,
      note: "Pebble 2.0.1's frontend (the frozen v2.0.1 tree) driven by scripted host events in v2.0.1's own order: a re-enactment with sample data (the celadon glaze batch).",
      async build(page) {
        const meta = T["launch-visual-answer"].meta = { times: "seconds from the first frame" };
        const steps = [];
        const { on, press, rest, measure, moment } = kit(meta, steps);
        const chat = "chat-celadon", run = "run-cel-live", reply = "msg-cel-reply";
        const K = { send: 0.5, running: 0.56, context: 0.7, turn: 0.75, respond: 3.6, text: 3.65, finish: 3.68, complete: 3.72, chart: 5.6 };
        await cssClock(page);
        await page.evaluate((id, rid) => window.__pebble.world.live.liveRun(id, rid), chat, run);
        const question = await fixture(page, "text.celadonQuestion");
        const answer = await fixture(page, "reply.celadon");
        // Pre-roll: the question in the message box (typed at once; the film shows no typing).
        await page.type("textarea[aria-label='Message Pebble']", question, { delay: 0 });
        await page.mouse.move(1180, 160);
        for (let i = 0; i < 10; i++) await page.evaluate(() => window.__pebbleClock.advance(100));
        meta.pointer.push([0, 1180, 160, "move"]);
        measure(0.02, "composer", ".composer");
        on(K.send, (pg) => pg.keyboard.press("Enter"));
        moment(K.send, "send");
        on(K.send + 0.02, emit("run", { chat_id: chat, run_id: run, state: "queued" }));
        on(K.running, async (pg) => {
          await live("run", chat, { id: run, state: "running" })(pg);
          await emit("run", { chat_id: chat, run_id: run, state: "running" })(pg);
          await emit("progress", { chat_id: chat, run_id: run, label: "Preparing your local workspace", kind: "working", activity: "thinking" })(pg);
        });
        const pub = (t, make) => on(t, async (pg) => {
          const item = await pg.evaluate(make);
          await live("publish", run, item)(pg);
          await emit("activity", { chat_id: chat, run_id: run, item })(pg);
        });
        pub(K.context, `window.__pebble.world.live.rows.recalled(64, ${r3(K.context - K.send)}, 2, 120)`);
        on(K.context, emit("progress", { chat_id: chat, run_id: run, label: "Recalled relevant context", kind: "done", memory_count: 2, activity: null }));
        const attempt = "c3e9" + "0".repeat(27) + "1";
        const journal = (event) => live("streamEvent", run, { attempt_id: attempt, step: 1, attempt: 1, ...event });
        const stream = (type) => emit("stream", { chat_id: chat, run_id: run, attempt_id: attempt, type, authorization: "none" });
        on(K.turn, emit("progress", { chat_id: chat, run_id: run, label: "Working with your model", kind: "working", activity: "thinking" }));
        pub(K.turn, `window.__pebble.world.live.rows.item(128, ${r3(K.turn - K.send)}, "model", "Waiting for the model", { status: "running" })`);
        on(K.turn, async (pg) => { await journal({ kind: "begin", state: "open" })(pg); await stream("begin")(pg); });
        // The draft streams by tokens of a few characters, as a provider sends them.
        const pieces = answer.match(/[\s\S]{1,6}/g);
        const from = K.turn + 0.3, to = K.respond - 0.1;
        pieces.forEach((piece, i) => on(from + ((to - from) * i) / pieces.length, async (pg) => { await journal({ kind: "delta", text: piece })(pg); await stream("delta")(pg); }));
        measure(K.respond - 0.15, "draft", ".live-draft");
        pub(K.respond, `window.__pebble.world.live.rows.responded(128, ${r3(K.turn - K.send)}, ${r3(K.respond - K.turn)}, 0.4, 0.6)`);
        on(K.respond, async (pg) => { await journal({ kind: "settle", state: "committed", origin: "host" })(pg); await stream("committed")(pg); });
        on(K.text, emit("token", { chat_id: chat, run_id: run, id: reply, text: answer }));
        on(K.finish, async (pg) => {
          const usage = { input_tokens: 6210, output_tokens: 196, cached_tokens: 4096, tokens_per_second: 52.0, route: "model", calls: 1, seconds: r3(K.finish - K.running) };
          await live("message", chat, { id: reply, role: "assistant", content: answer, run_id: run, usage })(pg);
          await emit("usage", { chat_id: chat, id: reply, usage })(pg);
          await emit("complete", { chat_id: chat, id: reply, seconds: usage.seconds })(pg);
        });
        on(K.complete, async (pg) => {
          const elapsed = r3(K.complete - K.running);
          await live("active", null, null)(pg);
          await live("run", chat, { id: run, state: "completed", elapsed, counts: { steps: 0, retries: 0, waited: 0 } })(pg);
          await live("settle", run, "completed", elapsed)(pg);
          await emit("run", { chat_id: chat, run_id: run, state: "completed", elapsed })(pg);
          await emit("idle", { chat_id: chat, run_id: run })(pg);
        });
        moment(K.complete, "reply");
        measure(K.complete + 0.6, "table", ".message.latest .reply-table");
        measure(K.complete + 0.6, "toggle", ".message.latest .reply-table .tools");
        press(K.chart, "chart", ".message.latest .reply-table .tools button", { text: "Chart", lead: 0.5 });
        rest(K.chart + 0.5, 1180, 300);
        measure(K.chart + 0.3, "chartFigure", ".message.latest .visual-chart");
        measure(K.chart + 0.3, "replyAfter", ".message.latest");
        meta.K = K;
        return steps;
      },
    },
  };
  return T;
}
