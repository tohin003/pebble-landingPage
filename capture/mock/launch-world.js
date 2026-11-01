// The Pebble 2.0 launch film's fixture world (lane launch-ui, 1 Nov 2026), for Pebble 2.0.1's own frontend (tag v2.0.1,
// commit c85ed02, frozen with capture/freeze-release.py). entry.js loads it for `?world=launch` (fixtures.js stays the
// 1.x world). Everything here is fictional sample data: Maya (maya@example.com, /Users/maya) runs a small pottery studio;
// invoice-kit is the Python project that bills its classes; a kiln firing, a celadon glaze batch, a glaze order and an
// open day fill the rest.
//
// What may appear on screen, and where it comes from:
//   - Host strings are the v2.0.1 backend's own, read from the tag (backend/pebble at c85ed02): run_activity.py (row
//     labels, verdict(), HELD, WITHHELD, STATE_NOTES, the approval rows "Approved by you: …" / "Waiting for your
//     approval: …" / "Applying the approved step: …"), app.py tool_label() and action_summary(), controller.py
//     gate_sentences() and held(), runner.py (the held notice), work_view.py (each item's `view`, the run_activity reply's
//     `header` and `summary`), guard.py receipt(), workshop.py (the Toolbox listing and its `toolbox` event), memory.py
//     KINDS, edit_scope.py REASON, permissions.py DEFAULT, app.py state() (VERSION 2.0.1).
//   - Window strings come from the v2.0.1 components themselves.
//   - Model replies, messages, file names, diffs, memories, tools and their code are sample data written here.
//   - The model is the demo account's, as the real takes show it (RSW-01, 31 Oct): Claude Opus 5.5 on an Anthropic API
//     key named "Anthropic-API", effort High, a 1,000,000-token window. Numbers (durations, token counts, "42 passed")
//     are illustrative, never measurements.
//
// buildLaunchWorld({scene, theme, surface, drawer, stealth, version}) returns { storage, has(method), rpc(method, params),
// live, ... } like fixtures.js buildWorld().

const WORKSPACE = "/Users/maya/Projects/invoice-kit";
const ID = { fix: "chat-invoice-fix", celadon: "chat-celadon", glaze: "chat-glaze-batch", kiln: "chat-kiln", fresh: "chat-new" };

// ---- the model (the demo account's connection, as RSW-01 shows it) ------------------------------------------------
const PROFILE = { id: "p-anthropic-opus", name: "Anthropic-API", kind: "anthropic", url: "https://api.anthropic.com/v1", model: "claude-opus-5-5",
  display_name: "Claude Opus 5.5", context: 1000000, tools: true, has_key: true, connection_id: "c-anthropic-api", provider_name: "Anthropic-API" };
// capabilities.py: claude-opus-5-5 offers low..max with medium as the default; the demo account chose high.
const EFFORTS = { efforts: ["default", "low", "medium", "high", "xhigh", "max"], default_effort: "medium", effort: "high", effort_parameter: "output_config.effort" };
const MODEL_STATUS = { state: "ready", configured: true, name: "Claude Opus 5.5", path: "", context: 1000000, kind: "anthropic", provider: "Anthropic-API",
  profile_id: PROFILE.id, ...EFFORTS };

// ---- invoice-kit: the month-end bug (sample data from the 1.x harness, unchanged) --------------------------------
export const REQUEST = "The CSV export crashes for invoices issued on the 31st: ValueError: day is out of range for month. Can you find the bug and fix it?";
const DIFF_DATES = `@@ -1,14 +1,17 @@
 """Date helpers for invoice terms."""
+import calendar
 from datetime import date, timedelta


 def add_months(start: date, months: int) -> date:
-    """Return the same day \`months\` later."""
+    """Return the same day \`months\` later, clamped to that month's last day."""
     index = start.month - 1 + months
     year, month = start.year + index // 12, index % 12 + 1
-    return date(year, month, start.day)
+    last_day = calendar.monthrange(year, month)[1]
+    return date(year, month, min(start.day, last_day))


 def due_date(issued: date, terms_days: int = 30) -> date:`;
const DIFF_TESTS = `@@ -21,3 +21,10 @@ def test_add_months_keeps_day():
     assert add_months(date(2026, 3, 14), 1) == date(2026, 4, 14)


+def test_add_months_clamps_to_month_end():
+    assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)
+    assert add_months(date(2028, 1, 31), 1) == date(2028, 2, 29)
+
+
 def test_due_date_default_terms():`;
// edit_scope.py REASON (v2.0.1, unchanged since 1.2.0): an edit to a test file the request didn't ask to change.
const TEST_SCOPE = { requires_review: true, scope_review: "Pebble wants to change a test file, and your request didn't ask for test changes. Tests are your evidence that the code works, so this change waits for you." };
// The model's reply (sample data); runner.py adds the held notice: '\n\n> Verification remains incomplete: ' + notice.
const REPLY_HELD_MODEL = `Both edits are in:

- **\`invoice_kit/dates.py\`**: \`add_months()\` now clamps to the last day of the month, so 31 Jan + 1 month is 28 Feb.
- **\`tests/test_dates.py\`**: a new regression test covers month ends and leap years.

The CSV export should work again for invoices issued on the 29th, 30th and 31st.`;
// controller.py gate_sentences('no_test_run'): the person's notice (_names() keeps file names) and the model's issue,
// which becomes the run's error (runner.py: failure = '\n'.join(gate['issues'])); RunPanel.personNote() drops its
// sentence that names RunTests.
const HELD_CHANGED = ["invoice_kit/dates.py", "tests/test_dates.py"], HELD_COVERING = ["tests/test_dates.py"];
const HELD_NOTICE = "Pebble changed dates.py, test_dates.py but did not run the tests that cover them.";
const HELD_ISSUE = `${HELD_CHANGED.length} file(s) changed and no tests were run, but ${HELD_COVERING.length} test file(s) cover this code: ${JSON.stringify(HELD_COVERING)}. Run them (RunTests) before finishing and report what they said.`;
const NOTICE_TEXT = "\n\n> Verification remains incomplete: " + HELD_NOTICE;
const REPLY_HELD = REPLY_HELD_MODEL + NOTICE_TEXT;
// The resumed turn after the tests (model text, sample data), on a new paragraph (runner.py token(): `separate`).
const CONTINUE_VERIFIED = "\n\nThe tests ran in an isolated copy of your project: **42 passed**. Both edits are verified, and the CSV export works again for invoices issued on the 29th, 30th and 31st.";
// app.py action_summary(): what an approved effect writes into the conversation once it is committed.
const editSummary = (path) => "Applied the edit to `" + path + "`. You can undo it in Activity & review.";
const testsSummary = (code) => "The isolated test run finished with exit code " + code + ". Review the output in Activity & review.";
const PYTEST_PLAN = { recipe: "pytest", kind: "python", cwd: "snapshot", timeout: 120, output_limit: 1048576, network: false, argv: ["python", "-m", "pytest", "-q"],
  executable: { realpath: WORKSPACE + "/.venv/bin/python3.12", sha256: "4be1f0e7c2a95d3378e0b2f6c1d9a8e74b3c5d6e7f8091a2b3c4d5e6f7081920" } };
export const PASSED = { outcome: "passed", exit_code: 0, tests: { passed: 42, failed: 0, skipped: 0, errors: 0, total: 42 },
  snapshot_digest: "c0ffee5a1b2c3d4e5f60718293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5", drafts_included: [],
  output: "..........................................  [100%]\n42 passed in 1.84s" };

// ---- the glaze (sample-world-2.0 templates/celadon.csv, GLAZE_BRIEF.md's answer) -----------------------------------
export const CELADON_QUESTION = "Scale my celadon glaze to a 5 kg batch: potash feldspar 25 %, silica 25 %, whiting 20 %, kaolin 20 %, talc 10 %, plus 1 % red iron oxide.";
export const CELADON_REPLY = `For a 5 kg batch of celadon, weigh out:

| Material | Grams |
| --- | ---: |
| Potash feldspar | 1,250 |
| Silica | 1,250 |
| Whiting | 1,000 |
| Kaolin | 1,000 |
| Talc | 500 |
| Red iron oxide | 50 |

The red iron oxide is an addition on top of the base, so the bucket weighs 5,050 g in all.`;
const GLAZE_TOOL_QUESTION = "Scale my celadon glaze to a 5 kg batch: potash feldspar 25 %, silica 25 %, whiting 20 %, kaolin 20 %, talc 10 %, plus 1 % red iron oxide as an addition. Make a tool for it, I scale glazes every week.";
const GLAZE_TOOL_REPLY = CELADON_REPLY.replace("For a 5 kg batch of celadon, weigh out:", "I made a small tool, `glaze_batch`, tested it and used it. For a 5 kg batch of celadon, weigh out:");
// workshop.py keep(): the Toolbox listing's rows and the `toolbox` event a keep sends (the tools are sample data).
export const TOOLS = {
  glaze_batch: { purpose: "Grams of each material for a glaze batch of a given weight, from its recipe in percent; additions go on top of the base",
    code: `def glaze_batch(batch_grams: float, recipe: dict[str, float], additions: dict[str, float] | None = None) -> dict[str, float]:
    """Grams of each material: the base recipe scaled to batch_grams, additions on top."""
    base = sum(recipe.values())
    grams = {name: round(batch_grams * share / base, 1) for name, share in recipe.items()}
    for name, share in (additions or {}).items():
        grams[name] = round(batch_grams * share / 100, 1)
    return grams` },
  kiln_ramp_time: { purpose: "Total kiln firing time from a start temperature and ramp/hold segments (rate_c_per_h, target_c, hold_min)",
    code: `def kiln_ramp_time(start_c: float, segments: list[dict]) -> dict:
    """Minutes for each ramp and hold, and the total, from a start temperature."""
    minutes, now = [], start_c
    for seg in segments:
        ramp = abs(seg["target_c"] - now) / seg["rate_c_per_h"] * 60
        minutes.append(round(ramp + seg.get("hold_min", 0), 1))
        now = seg["target_c"]
    return {"segments": minutes, "total_min": round(sum(minutes), 1)}` },
};
const KILN_QUESTION = "How long will Friday's bisque firing take? The kiln starts at 20 °C. Ramp 1: 80 °C an hour up to 600 °C. Ramp 2: 150 °C an hour up to 1000 °C, then hold for 15 minutes. I fire every week with different ramps, so make a small tool for it and call it kiln_ramp_time.";
const KILN_REPLY = "Friday's bisque firing takes **10 hours 10 minutes** (610 minutes): 7 h 15 min to reach 600 °C, 2 h 40 min on to 1000 °C, then the 15-minute hold.";

// memory.py KINDS (v2.0.1)
const LAYERS = [["working", "Working context"], ["episodic", "Past experiences"], ["semantic", "Facts & knowledge"],
  ["procedural", "Procedures"], ["temporal", "Time-sensitive information"], ["profile", "Your preferences"]];
// The record the film's Memory clip forgets: an outdated fact (sample-world-2.0 notes/04-old-price-list-2025.txt).
export const FORGET_FACT = "mem-fact-price";

export function buildLaunchWorld({ scene, theme, surface, drawer: drawerWidth = null, stealth = false, version = null }) {
  const now = Math.floor(Date.now() / 1000);
  const ago = (s) => now - s;
  const usage = (input, output, cached, tps, seconds, calls = 1) =>
    ({ input_tokens: input, output_tokens: output, cached_tokens: cached, tokens_per_second: tps, route: "model", calls, seconds });

  // ---- conversations -----------------------------------------------------------------------------------------------
  const editAction = (id, path, baseline, diff, status, extra = {}) => ({ id, chat_id: ID.fix, kind: "edit", status, payload: { path, baseline, diff, ...extra } });
  const testsAction = (status, result = null) => ({ id: "act-tests-1", chat_id: ID.fix, kind: "tests", status, payload: { recipe: "pytest", plan: PYTEST_PLAN, ...(result ? { result } : {}) } });
  const editsApplied = [
    { ...editAction("act-edit-dates", "invoice_kit/dates.py", "9f2c41d07ab3", DIFF_DATES, "applied"), payload: { path: "invoice_kit/dates.py", baseline: "9f2c41d07ab3", diff: DIFF_DATES, result: { applied: "invoice_kit/dates.py" } } },
    { ...editAction("act-edit-tests", "tests/test_dates.py", "51ab9e2c3d70", DIFF_TESTS, "applied"), payload: { path: "tests/test_dates.py", baseline: "51ab9e2c3d70", diff: DIFF_TESTS, ...TEST_SCOPE, result: { applied: "tests/test_dates.py" } } },
  ];
  // One run (run-fix-1): the request, the reads, the two staged edits, the person's approvals (each writes its summary
  // into the conversation), the resumed turn, two repairs the completion check asked for, then the hold. The held scene
  // opens about 6 s after the hold (the clip's "Run the tests" lands near +51 s); in every other scene the run has since
  // been verified and finished (a held run elsewhere would leave the companion's status line at "Blocked").
  const done = !/^held/.test(scene);
  // `held-live` (record.mjs launch-agentguard): the window opens while the run's last repair is still running, so it
  // reads the run's record live (as a person who watched it does: no settled summary yet); the clip's pre-roll then
  // plays the hold itself (the last check, the notice, the run's state, idle) before its first frame.
  const liveHold = scene === "held-live";
  const base = done ? ago(80) : ago(50);
  const T = { start: base, approved1: base + 32, approved2: base + 32.5, held: base + 43.5, tests: base + 55.8, verified: base + 58.4 };
  const fixHeld = {
    id: ID.fix, title: "Fix month-end due dates", workspace: WORKSPACE, trashed: false,
    messages: [
      { id: "msg-fix-1", role: "user", created: T.start, attachments: [], content: REQUEST },
      { id: "msg-fix-applied-dates", role: "assistant", created: T.approved1, attachments: [], content: editSummary("invoice_kit/dates.py") },
      { id: "msg-fix-applied-tests", role: "assistant", created: T.approved2, attachments: [], content: editSummary("tests/test_dates.py") },
      { id: "msg-fix-reply", role: "assistant", created: T.held, run_id: "run-fix-1", attachments: [], content: REPLY_HELD, usage: usage(18420, 512, 15360, 41.2, 14.6, 5) },
    ],
    actions: editsApplied,
    runs: [{ id: "run-fix-1", state: "verification_required", steps: 11, elapsed: 31.4, error: HELD_ISSUE, created: T.start, updated: T.held, counts: { steps: 11, retries: 0, waited: 18 } }],
    questions: [], plan: null, artifacts: [],
  };
  // The same conversation after the tests and the resumed turn (the end of the AgentGuard clip, as a still).
  const fixDone = {
    ...fixHeld,
    messages: [
      ...fixHeld.messages.slice(0, 3),
      { id: "msg-fix-tests", role: "assistant", created: T.tests, attachments: [], content: testsSummary(0) },
      { ...fixHeld.messages[3], created: T.verified, content: REPLY_HELD + CONTINUE_VERIFIED, usage: usage(19870, 566, 17408, 43.0, 16.8, 6) },
    ],
    actions: [...editsApplied, testsAction("applied", PASSED)],
    runs: [{ ...fixHeld.runs[0], state: "completed", error: null, steps: 15, elapsed: 36.8, updated: T.verified, counts: { steps: 15, retries: 0, waited: 25 } }],
  };
  const celadonDone = {
    id: ID.celadon, title: "Celadon batch", workspace: null, trashed: false,
    messages: [
      { id: "msg-cel-1", role: "user", created: ago(600), attachments: [], content: CELADON_QUESTION },
      { id: "msg-cel-2", role: "assistant", created: ago(588), run_id: "run-cel-1", attachments: [], content: CELADON_REPLY, usage: usage(6210, 196, 4096, 52.0, 6.2, 1) },
    ],
    actions: [], questions: [], plan: null, artifacts: [],
    runs: [{ id: "run-cel-1", state: "completed", steps: 0, elapsed: 7.4, error: null, created: ago(598), updated: ago(588), counts: { steps: 0, retries: 0, waited: 0 } }],
  };
  // The celadon question played live (record.mjs launch-visual-answer): a new conversation the timeline sends into.
  const celadonLive = { id: ID.celadon, title: "New conversation", workspace: null, trashed: false, messages: [], actions: [], questions: [], plan: null, artifacts: [], runs: [] };
  const glaze = {
    id: ID.glaze, title: "Glaze batch tool", workspace: null, trashed: false,
    messages: [
      { id: "msg-glz-1", role: "user", created: ago(1800), attachments: [], content: GLAZE_TOOL_QUESTION },
      { id: "msg-glz-2", role: "assistant", created: ago(1730), run_id: "run-glz-1", attachments: [], content: GLAZE_TOOL_REPLY, usage: usage(24310, 1288, 18944, 47.5, 62.4, 6) },
    ],
    actions: [], questions: [], plan: null, artifacts: [],
    runs: [{ id: "run-glz-1", state: "completed", steps: 6, elapsed: 64.1, error: null, created: ago(1795), updated: ago(1730), counts: { steps: 6, retries: 0, waited: 0 } }],
  };
  const kiln = {
    id: ID.kiln, title: "Kiln firing time", workspace: null, trashed: false,
    messages: [
      { id: "msg-kiln-1", role: "user", created: ago(86400), attachments: [], content: KILN_QUESTION },
      { id: "msg-kiln-2", role: "assistant", created: ago(86280), run_id: "run-kiln-1", attachments: [], content: KILN_REPLY, usage: usage(30110, 1406, 22528, 44.1, 96.0, 7) },
    ],
    actions: [], questions: [], plan: null, artifacts: [],
    runs: [{ id: "run-kiln-1", state: "completed", steps: 7, elapsed: 98.2, error: null, created: ago(86398), updated: ago(86280), counts: { steps: 7, retries: 0, waited: 0 } }],
  };
  const fresh = { id: ID.fresh, title: "New conversation", workspace: null, messages: [], actions: [], runs: [], questions: [], plan: null, artifacts: [] };

  const chats = new Map();
  const fixLive = { ...fixHeld,
    messages: [...fixHeld.messages.slice(0, 3), { ...fixHeld.messages[3], content: REPLY_HELD_MODEL }],
    runs: [{ ...fixHeld.runs[0], state: "running", error: null, updated: undefined }] };
  const fix = done ? fixDone : liveHold ? fixLive : fixHeld;
  const celadon = scene === "visual" ? celadonLive : celadonDone;
  [fix, celadon, glaze, kiln, fresh].forEach((c) => chats.set(c.id, c));
  // Titles only (the sidebar): the studio's other conversations.
  const sidebarExtra = [
    { id: "chat-open-day", title: "Open day checklist", workspace: null },
    { id: "chat-glaze-order", title: "Glaze order for Monday", workspace: null },
    { id: "chat-flyer", title: "Open day flyer", workspace: null },
    { id: "chat-tickets", title: "Tickets for Saturday", workspace: null },
  ];
  const first = { held: fix, "held-live": fix, done: fix, "work-view": fix, visual: celadon, "visual-done": celadon, kept: glaze, settings: fix, welcome: fresh }[scene] || fix;
  const recent = [fix, celadon, glaze, kiln].filter((c) => c !== first);
  const listed = () => [first, ...recent].map(({ id, title, workspace }) => ({ id, title, workspace })).concat(sidebarExtra);

  // ---- run activity (run_activity.py items, each with its work view where work_view.py builds one) -------------------
  const V = (type, fields) => ({ v: 1, type, ...fields });
  const item = (seq, at, kind, label, extra = {}) => ({ seq, at, kind, label, detail: extra.detail ?? null, duration: extra.duration ?? null,
    status: extra.status || "done", ...(kind === "model" ? { headers_ms: extra.headers_ms ?? null, first_event_ms: extra.first_event_ms ?? null } : {}),
    ...(extra.view ? { view: extra.view } : {}) });
  const recalled = (seq, at, count, ms) => item(seq, at, "context", `Recalled ${count} memor${count === 1 ? "y" : "ies"}`, { detail: `Context ready in ${ms} ms`, duration: ms / 1000 });
  // A model attempt over the API: run_activity._attempt() names the headers and first event when the provider gave them.
  const responded = (seq, at, seconds, headers = 0.6, firstEvent = 0.9) =>
    item(seq, at, "model", "The model responded", { detail: `Headers after ${headers.toFixed(1)} s; first event after ${firstEvent.toFixed(1)} s.`, duration: seconds,
      headers_ms: Math.round(headers * 1000), first_event_ms: Math.round(firstEvent * 1000) });
  // guard.receipt() for the completion check, and work_view.checks_view() from it.
  const checksView = (verdict, receipt, issues, repairable) => V("checks", { verdict,
    tests: { runner: receipt.runner || "tests", passed: receipt.passed, failed: 0, current: receipt.current === true },
    files_changed: 2, issues, ...(issues ? { repairable } : {}) });
  const notVerified = "Not verified · 2 changed files, no tests run";
  const unverifiedCheck = (seq, at, last) => item(seq, at, "check", notVerified, { detail: last ? "1 item unresolved" : "1 item to resolve", duration: 0.6,
    view: checksView(notVerified, { passed: 0 }, 1, !last) });
  const withdrawn = (seq, at) => item(seq, at, "note", "Draft withdrawn: a check asked for a fix; the reply follows it");
  const editView = (path, added, removed, state, action) => V("edit", { path, added, removed, state, action_id: action });
  const heldItems = () => [
    recalled(64, 0.2, 3, 180),
    responded(128, 0.4, 2.1),
    item(192, 2.6, "tool", "Searching project source", { duration: 0.4, view: V("search", { tool: "Grep", query: "add_months", hits: 4 }) }),
    item(256, 3.1, "tool", "Reading invoice_kit/dates.py", { duration: 0.1, view: V("read", { path: "invoice_kit/dates.py", start: 1, total: 48 }) }),
    item(320, 3.3, "tool", "Reading tests/test_dates.py", { duration: 0.1, view: V("read", { path: "tests/test_dates.py", start: 1, total: 61 }) }),
    responded(384, 3.5, 6.2),
    item(448, 9.8, "tool", "Preparing an edit to invoice_kit/dates.py", { duration: 0.2, detail: "Staged for your approval.", view: editView("invoice_kit/dates.py", 4, 1, "done", "act-edit-dates") }),
    item(512, 10.0, "approval", "Approved by you: Preparing an edit to invoice_kit/dates.py", { duration: 21.8 }),
    item(576, 10.2, "tool", "Preparing an edit to tests/test_dates.py", { duration: 0.2, detail: "Staged for your approval.", view: editView("tests/test_dates.py", 5, 0, "done", "act-edit-tests") }),
    item(640, 10.4, "approval", "Approved by you: Preparing an edit to tests/test_dates.py", { duration: 22.4 }),
    item(704, 10.6, "note", "Waiting for your decision; the reply follows it"),
    recalled(768, 32.9, 3, 160),
    responded(832, 33.1, 3.4),
    unverifiedCheck(896, 36.6, false), withdrawn(960, 36.7),
    responded(1024, 36.8, 2.9),
    unverifiedCheck(1088, 39.8, false), withdrawn(1152, 39.9),
    responded(1216, 40.0, 3.1),
    unverifiedCheck(1280, 43.2, true),
    item(1344, 43.3, "note", "Verification remains incomplete"),
  ];
  // The held decision and what follows it (controller.py held() and _held_tests(); the resumed run), at the times the
  // clip plays them; the still of the finished run uses the same rows.
  const testsView = (state, result = null, seconds = null) => V("tests", { recipe: "pytest", state, ...(result ? { ...result.tests, exit: result.exit_code } : {}),
    ...(seconds !== null ? { seconds } : {}), action_id: "act-tests-1" });
  const afterHeld = (at0) => [
    item(1408, at0, "note", "You asked Pebble to run the tests"),
    item(1472, at0, "tool", "Requesting isolated tests", { duration: 0.1, detail: "Staged for your approval.", view: testsView("done", PASSED, 2.4) }),
    item(1536, at0 + 0.1, "approval", "Approved by you: Requesting isolated tests", { duration: 1.5 }),
    recalled(1600, at0 + 4.1, 3, 150),
    responded(1664, at0 + 4.3, 2.0),
    item(1728, at0 + 6.4, "check", "Verified · pytest 42 passed on current files", { duration: 0.4,
      view: checksView("Verified · pytest 42 passed on current files", { runner: "pytest", passed: 42, current: true }, 0) }),
  ];
  const activity = {
    "run-fix-1": done
      ? { state: "completed", started: T.start, elapsed: 36.8, items: [...heldItems(), ...afterHeld(51.4)] }
      : liveHold ? { state: "running", started: T.start, elapsed: null, items: heldItems().slice(0, -2) }
      : { state: "verification_required", started: T.start, elapsed: 31.4, items: heldItems() },
    "run-cel-1": { state: "completed", started: ago(598), elapsed: 7.4, items: [recalled(64, 0.2, 2, 150), responded(128, 0.4, 6.2)] },
    "run-glz-1": { state: "completed", started: ago(1795), elapsed: 64.1, items: [recalled(64, 0.2, 2, 150), responded(128, 0.4, 4.0)] },
    "run-kiln-1": { state: "completed", started: ago(86398), elapsed: 98.2, items: [recalled(64, 0.2, 1, 140), responded(128, 0.4, 5.1)] },
  };
  // work_view.summary() for a settled run: files (edits done), commands, tests (the last run), the last check's verdict,
  // seconds and the tokens of the run's usage.
  function summaryOf(items, seconds, tokens) {
    const files = new Map();
    let tests = null, checks = null, commands = 0, failed = 0;
    for (const it of items) {
      const v = it.view || {};
      if (v.type === "edit" && v.state === "done") { const [a, r] = files.get(v.path) || [0, 0]; files.set(v.path, [a + (v.added || 0), r + (v.removed || 0)]); }
      else if (v.type === "command" && ["done", "failed", "stopped"].includes(v.state)) { commands++; if (v.state !== "done") failed++; }
      else if (v.type === "tests" && ["done", "failed"].includes(v.state)) tests = { passed: v.passed || 0, failed: v.failed || 0 };
      else if (v.type === "checks") checks = v.verdict;
    }
    return { files: files.size ? { count: files.size, added: [...files.values()].reduce((t, [a]) => t + a, 0), removed: [...files.values()].reduce((t, [, r]) => t + r, 0) } : null,
      commands: commands ? { count: commands, failed } : null, tests, checks, seconds: Math.round(seconds * 10) / 10, tokens };
  }
  const runUsage = { "run-fix-1": { input: 19870, cached: 17408, output: 566 }, "run-cel-1": { input: 6210, cached: 4096, output: 196 } };

  // ---- memory: the six layers (memory.py KINDS) with the studio's records ------------------------------------------
  const J = (o) => JSON.stringify(o);
  const prov = (cls) => J({ evidence_class: cls });
  const memories = {
    profile: [
      { id: "pebble-md", kind: "profile", scope: "global", origin: "curated", updated: ago(86400 * 9),
        content: "Call me Maya. I run a small pottery studio, and invoice-kit is the Python tool that bills its classes and kiln hire." },
      { id: "mem-pref-short", kind: "profile", scope: "global", origin: "direct-user", updated: ago(86400 * 7),
        content: "Prefers short answers: the numbers first, then one paragraph." },
      { id: "mem-pref-units", kind: "profile", scope: "global", origin: "direct-user", updated: ago(86400 * 6),
        content: "Uses metric units and 24-hour times: grams for glazes, °C for the kiln." },
      { id: "mem-pref-names", kind: "profile", scope: "project:" + WORKSPACE, origin: "auto-learned", learning_status: "active", updated: ago(86400 * 4),
        provenance: prov("human_preference"), content: "In invoice-kit, keep public function names stable." },
      { id: "mem-pref-pytest", kind: "profile", scope: "global", origin: "auto-learned", learning_status: "active", updated: ago(86400 * 3),
        provenance: prov("human_preference"), content: "Writes Python with type hints and runs tests with pytest." },
    ],
    semantic: [
      { id: "mem-fact-kiln", kind: "semantic", scope: "global", origin: "auto-learned", learning_status: "active", updated: ago(86400 * 2),
        provenance: prov("attributed_file_quote"), content: J({ quote: "Next: bisque Friday, 80 °C an hour to 600, then 150 °C an hour to 1000, hold 15 minutes", path: "Documents/Open day/notes/03-kiln-log.txt" }) },
      { id: FORGET_FACT, kind: "semantic", scope: "global", origin: "auto-learned", learning_status: "active", updated: ago(86400 * 12),
        provenance: prov("attributed_file_quote"), content: J({ quote: "Wheel taster: 10.00", path: "Documents/Open day/notes/04-old-price-list-2025.txt" }) },
      { id: "mem-fact-terms", kind: "semantic", scope: "project:" + WORKSPACE, origin: "auto-learned", learning_status: "active", updated: ago(86400 * 5),
        provenance: prov("attributed_file_quote"), content: J({ quote: "Invoices are due 30 days after issue unless terms say otherwise.", path: "docs/billing.md" }) },
    ],
    procedural: [
      { id: "mem-proc-pytest", kind: "procedural", scope: "project:" + WORKSPACE, origin: "auto-learned", learning_status: "active", updated: ago(3600),
        provenance: prov("host_lesson"), content: J({ recipe: "python -m pytest -q", language: "Python" }) },
    ],
    temporal: [
      { id: "mem-temp-openday", kind: "temporal", scope: "global", origin: "direct-user", updated: ago(86400 * 2), expires: now + 86400 * 14,
        content: "Open day on Saturday 14 November, 10:00 to 16:00." },
      { id: "mem-temp-order", kind: "temporal", scope: "global", origin: "direct-user", updated: ago(86400), expires: now + 86400 * 8,
        content: "The glaze order goes to the supplier on Monday after the open day." },
    ],
    episodic: [
      { id: "mem-ep-kiln", kind: "episodic", scope: "global", origin: "conversation", updated: ago(86280), chat_id: ID.kiln,
        content: J({ user_request: "How long will Friday's bisque firing take? The kiln starts at 20 °C.", task_outcome: "completed", tool_steps: { script: 2 } }) },
      { id: "mem-ep-glaze", kind: "episodic", scope: "global", origin: "conversation", updated: ago(1730), chat_id: ID.glaze,
        content: J({ user_request: "Scale my celadon glaze to a 5 kg batch.", task_outcome: "completed", tool_steps: { script: 2 } }) },
      { id: "mem-ep-tests", kind: "episodic", scope: "project:" + WORKSPACE, origin: "auto-learned", learning_status: "active", updated: ago(3600),
        provenance: prov("host_lesson"), content: J({ claim_class: "observed_outcome", observation: "python -m pytest -q passed: 42 tests." }) },
    ],
    working: [
      { id: "mem-work-fix", kind: "working", scope: "chat:" + ID.fix, origin: "broker", updated: ago(96), chat_id: ID.fix,
        content: J({ current_goal: "Fix the CSV export crash for invoices issued on the 31st", phase: "verification_required",
          actions: [{ path: "invoice_kit/dates.py", kind: "edit", status: "applied" }, { path: "tests/test_dates.py", kind: "edit", status: "applied" }] }) },
    ],
  };
  const where = (scope) => (scope === "global" ? "all" : String(scope).startsWith("chat:") ? "conversation" : "project");
  const findMemory = (id) => Object.values(memories).flat().find((m) => m.id === id);

  // ---- Pebble's Toolbox (workshop.py listing()) -----------------------------------------------------------------------
  const toolbox = {
    tools: [
      { name: "kiln_ramp_time", purpose: TOOLS.kiln_ramp_time.purpose, kept_by: "person", kept_at: ago(86270), uses: 2, last_used: ago(3000), state: "ok", digest: "5c1e0a9b7d3f2e81" },
      { name: "glaze_batch", purpose: TOOLS.glaze_batch.purpose, kept_by: "pebble", kept_at: ago(1731), uses: 3, last_used: ago(600), state: "ok", digest: "a07d4c2e9f1b6380" },
    ],
    pending: [], removed: [],
  };

  // ---- the state() reply (app.py state(), v2.0.1) ----------------------------------------------------------------------
  const settings = {
    theme, reduced_motion: false, stealth: !!stealth, memory_enabled: true,
    memory_layers: { working: true, episodic: true, semantic: true, procedural: true, temporal: true, profile: true },
    permissions: { mode: "ask", tools: { files: true, edits: true, tests: true, apps: true, web: true, terminal: true, plugins: true, views: true, screen: false, capture: true } },
    companion: { pointer: true, reactions: true, status_words: "rotate", ui_guidance: true },
    fast_replies: "long_tasks", work_view: true, visual_answers: "ask",
  };
  const live = liveHold ? { active: ID.fix, activeRun: "run-fix-1" } : { active: null, activeRun: null };
  const clocks = {};
  let originMs = null;
  const recNow = () => (originMs === null ? null : (Date.now() - originMs) / 1000);
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const LIVE = new Set(["queued", "running", "retry_wait"]);
  const clockState = (c, t) => c.transitions.reduce((s, [at, st]) => (at <= t + 1e-9 ? st : s), c.transitions[0][1]);
  const clockElapsed = (c, t) => r3(c.base + c.transitions.reduce((sum, [at, st], i) => {
    const end = i + 1 < c.transitions.length ? c.transitions[i + 1][0] : Infinity;
    return LIVE.has(st) ? sum + Math.max(0, Math.min(end, t) - at) : sum;
  }, 0));
  const deferIds = new Set(), deferred = new Map(), journals = {};
  const state = () => ({
    job_notifications: [],
    chats: listed(),
    model: MODEL_STATUS,
    guard: { available: true, error: null },
    active: live.active,
    active_run: live.activeRun,
    runs: [...chats.values()].flatMap((c) => (c.runs || []).map((r) => ({ id: r.id, chat_id: c.id, state: r.state, created: r.created, updated: r.updated }))),
    settings,
    data_dir: "/Users/maya/.pebble",
    platform: "darwin",
    version: version || "2.0.1",
    memory: {
      enabled: settings.memory_enabled,
      strategy: "SQLite FTS5 · hybrid lexical/trigram/metadata ranking · bounded retrieval · no extra model",
      types: LAYERS.map(([id, name]) => ({ id, name, count: (memories[id] || []).length, enabled: settings.memory_layers[id] !== false })),
      learning: { status_counts: { active: 9, pending: 0 }, last_error_type: null },
    },
    profiles: [PROFILE],
  });

  const runOf = (chatId, runId) => chats.get(chatId)?.runs.find((r) => r.id === runId);
  const handlers = {
    state,
    get_chat: ({ id }) => {
      const c = chats.get(id);
      if (!c) throw "Conversation not found.";
      return c;
    },
    new_chat: () => fresh,
    send: ({ id, text }) => {
      const c = chats.get(id);
      if (!c) throw "Conversation not found.";
      const message_id = "msg-live-" + (c.messages.length + 1);
      c.messages.push({ id: message_id, role: "user", content: text, created: Math.floor(Date.now() / 1000), attachments: [] });
      if (c.title === "New conversation") c.title = text.slice(0, 54).replace(/\n/g, " "); // store.py message()
      const run_id = c.liveRun || "run-live-" + (c.runs.length + 1);
      c.runs = [{ id: run_id, state: "queued", error: null, created: Date.now() / 1000 }, ...c.runs]; // runs.created: epoch seconds
      live.active = id;
      live.activeRun = run_id;
      return { message_id, run_id };
    },
    cancel: () => true,
    approve: ({ id, action_id }) => {
      const a = chats.get(id)?.actions.find((x) => x.id === action_id);
      if (a && deferIds.has(action_id)) {
        a.status = "running";
        return new Promise((resolve) => deferred.set(action_id, resolve)); // live.finishApproval() answers it
      }
      if (a) a.status = "applied";
      return true;
    },
    reject: ({ id, action_id }) => {
      const a = chats.get(id)?.actions.find((x) => x.id === action_id);
      if (a) a.status = "rejected";
      return true;
    },
    undo: ({ id, action_id }) => {
      const a = chats.get(id)?.actions.find((x) => x.id === action_id);
      if (a) a.status = "undone";
      return true;
    },
    // controller.py held('tests'): the decision note, then _held_tests() stages the covering recipe as the run's own host
    // call (its "Requesting isolated tests" row, done one step later as staged), the approval bound to it, and the state
    // note; the run waits for that approval. The window reads these rows when the run resumes.
    run_held_tests: ({ id, run_id }) => {
      const c = chats.get(id), run = runOf(id, run_id);
      if (!c || !run || run.state !== "verification_required") throw "This task is not waiting on verification.";
      c.actions = [...c.actions.filter((a) => a.id !== "act-tests-1"), testsAction("pending")];
      run.state = "waiting_approval";
      run.error = null;
      const record = activity[run_id], clock = clocks[run_id], t = recNow();
      if (record) {
        const at = clock && t !== null ? r3(clock.at0 + (t - clock.t0)) : 51.4;
        record.state = "waiting_approval";
        const rows = afterHeld(at);
        record.items.push(rows[0], { ...rows[1], view: testsView("waiting") },
          item(1536, r3(at + 0.034), "approval", "Waiting for your approval: Requesting isolated tests", { status: "running" }),
          item(1540, r3(at + 0.05), "note", "Waiting for your approval"));
      }
      return { run_id, status: "waiting_approval", action_id: "act-tests-1" };
    },
    run_held_finish: ({ run_id }) => ({ run_id, status: "queued" }),
    run_held_accept: ({ id, run_id }) => {
      const run = runOf(id, run_id);
      if (run) run.state = "completed";
      return { run_id, status: "completed", verified: false, origin: "human" };
    },
    // run_activity.py read(): the items after the cursor (and every running one), the header, and the summary once the
    // run has settled; a run on a timeline's clock answers with that clock's state and live seconds.
    run_activity: ({ run_id, after = 0 }) => {
      const a = activity[run_id], clock = clocks[run_id], t = recNow();
      if (!a) {
        const sent = [...chats.values()].flatMap((c) => c.runs || []).find((r) => r.id === run_id);
        if (live.activeRun === run_id) return { run_id, state: "running", items: [], next: 0, started: sent?.created ?? Date.now() / 1000, elapsed: null,
          reasoning: { available: false, text: "" }, usage: null, header: { plan: null, state: "running", elapsed: 0 }, summary: null };
        return { run_id, state: "completed", items: [], next: 0, started: null, elapsed: null, reasoning: { available: false, text: "" }, usage: null, header: null, summary: null };
      }
      const st = clock && t !== null ? clockState(clock, t) : a.state;
      const elapsed = clock && t !== null ? clockElapsed(clock, t) : a.elapsed;
      const page = a.items.filter((i) => i.seq > (after || 0) || i.status === "running").sort((x, y) => x.seq - y.seq);
      const tokens = runUsage[run_id] || null;
      return { run_id, state: st, started: clock && originMs !== null ? r3((originMs + clock.t0 * 1000) / 1000 - clock.at0) : a.started, elapsed, items: page,
        reasoning: { available: false, text: "" }, usage: tokens, next: Math.max(after || 0, ...page.map((i) => i.seq)),
        header: { plan: null, state: st, elapsed: Math.round((elapsed || 0) * 10) / 10 },
        summary: LIVE.has(st) || ["waiting_approval", "waiting_input"].includes(st) ? null : summaryOf(a.items, elapsed || 0, tokens) };
    },
    context_inspect: ({ chat_id, run_id }) => ({ chat_id, run_id, used: 19870, total: 19870, window: { tokens: 1000000 } }),
    job_list: () => ({ jobs: [] }),
    process_list: () => [],
    stream_read: ({ id, run_id, after = 0, limit = 50 }) => {
      const journal = journals[run_id];
      if (!journal) return { chat_id: id, run_id, after, events: [], next_after: after, more: false, head: 0, presentation_only: true };
      const events = journal.filter((e) => e.sequence > after).slice(0, limit).map((e) => ({ ...e }));
      const next = events.length ? events[events.length - 1].sequence : after;
      return { chat_id: id, run_id, after, events, next_after: next, more: next < journal.length, head: journal.length, presentation_only: true };
    },
    screen_sessions: () => [],
    goal_list: () => [],
    agent_list: () => ({ nodes: [] }),
    research_sources: () => ({ sources: [], snippets: [] }),
    command_catalogue: () => [],
    extensions: () => [],
    connector_status: () => [],
    // memory_list(kind, query, offset, limit): one page of a layer (the working layer is its newest checkpoints).
    memory_list: ({ kind, query = "", offset = 0, limit = 100 }) => {
      const rows = (memories[kind] || []).filter((m) => !query || String(m.content).toLowerCase().includes(String(query).toLowerCase()));
      return rows.slice(offset, offset + limit);
    },
    memory_candidates: () => [],
    memory_contests: () => [],
    memory_forget_preview: ({ ids = [] }) => ({
      items: ids.map(findMemory).filter(Boolean).map((m) => ({ id: m.id, kind: m.kind, layer: Object.fromEntries(LAYERS)[m.kind], content: m.content,
        origin: m.origin, where: where(m.scope), updated: m.updated, authorization: "none" })), subject: null, authorization: "none" }),
    memory_delete: ({ id }) => {
      for (const kind of Object.keys(memories)) memories[kind] = memories[kind].filter((m) => m.id !== id);
      return { deleted: true };
    },
    // workshop.py listing() and detail(); toolbox_decide() keeps or discards a pending tool.
    toolbox_list: () => JSON.parse(JSON.stringify(toolbox)),
    toolbox_get: ({ name }) => {
      const tool = TOOLS[name];
      if (!tool) throw "There is no tool with that name in the Toolbox.";
      return { name, purpose: tool.purpose, code: tool.code };
    },
    toolbox_decide: () => ({ kept: true }),
    toolbox_remove: ({ name }) => {
      const tool = toolbox.tools.find((t) => t.name === name);
      toolbox.tools = toolbox.tools.filter((t) => t.name !== name);
      if (tool) toolbox.removed = [...toolbox.removed, { name, purpose: tool.purpose, seconds_left: 600 }];
      return JSON.parse(JSON.stringify(toolbox));
    },
    toolbox_undo_remove: () => JSON.parse(JSON.stringify(toolbox)),
    // Settings › Permissions: Pebble's Shell (no website or folder always allowed yet) and command credentials.
    shell_grants: () => ({ hosts: {}, folders: {} }),
    plan_credentials: () => ({ names: [] }),
    project_recipes: () => ({ recipes: [{ id: "pytest", kind: "python", available: true }], inventory_truncated: false }),
    git_plan_receipts: () => ({ items: [] }),
    agent_worktrees: () => [],
    environment_list: () => ({ items: [] }),
    notification_status: () => ({
      settings: { enabled: true, kinds: { completed: true, failed: true, action_needed: true, monitor_changed: true }, preview: "title", quiet_hours: null },
      quiet_now: false, outbox: { pending: 0, delivered: 0, suppressed: 0, failed: 0 }, deferred: 0, last_failure: null, jobs: [], actions: [],
    }),
    // telemetry.py _status() of a fresh install (off), as fixtures.js has it.
    telemetry_get: () => ({ schema: "pebble.telemetry/1", enabled: false, consent_version: null, consented_at: null, current_consent_version: "pebble.telemetry.consent/1",
      consent_text: "Pebble can keep a private usage log on this Mac to help measure its reliability. It records only counts and rounded values: how each task ended, how many steps it took, which built-in tools it used and how often, approvals and questions, and rounded durations, token counts and memory or CPU use. It never records your messages, the model's replies, files, memory notes, web addresses, account details or credentials. Nothing is sent anywhere: you can save the log to a file you choose and share it yourself. At most 1,000 events or 256 KB are kept, for 30 days. Turning this off deletes the log.",
      consent_sha256: "ca91c602ce91528b85b88fd60ec46694883904f3110242a383216a68fa4d9d24", install_id: null, events: 0, bytes: 0,
      kinds: { run_settled: 0, resource_sample: 0, error: 0 }, dropped: 0, expired: 0, refused: 0,
      fields: { run_settled: ["approvals", "input_tokens_log2", "model_ms_log2", "output_tokens_log2", "questions", "rejections", "state", "steps", "tools", "uncertain", "wall_ms_log2"],
        resource_sample: ["cpu_percent_bucket", "footprint_mb_log2"], error: ["code"] },
      limits: { max_events: 1000, max_bytes: 262144, retention_days: 30 }, destination: null, network_upload: false, export: "native_save_dialog" }),
    setting: ({ key, value }) => {
      if (key in settings) settings[key] = JSON.parse(JSON.stringify(value));
      return true;
    },
    open_url: () => null,
    remove_source: () => true,
    storage_summary: () => ({}),
  };

  const storage = {};
  if (surface === "main") {
    // DetailsDrawer's saved state: the held clip and the work-view still start with Details › Activity open.
    const open = { open: true, tab: "activity", width: 440 };
    const prefs = { held: open, "held-live": open, done: open, "work-view": { open: false, tab: "activity", width: 440 } }[scene] || { open: false, tab: "activity", width: 400 };
    if (drawerWidth) prefs.width = drawerWidth; // DetailsDrawer clamps it to 320..520
    storage["pebble.details.main"] = JSON.stringify(prefs);
  }

  // Called by capture/launch/*.mjs between backend events, so later get_chat/state/run_activity replies match them.
  const liveApi = {
    message(chatId, message) {
      const c = chats.get(chatId);
      const at = c.messages.findIndex((m) => m.id === message.id);
      if (at >= 0) c.messages[at] = { ...c.messages[at], ...message };
      else c.messages.push({ attachments: [], created: Math.floor(Date.now() / 1000), ...message });
    },
    actions(chatId, actions) { chats.get(chatId).actions = actions; },
    run(chatId, run) {
      const c = chats.get(chatId);
      c.runs = [{ ...(c.runs || []).find((r) => r.id === run.id), error: null, ...run }, ...(c.runs || []).filter((r) => r.id !== run.id)];
    },
    active(chatId, runId) { live.active = chatId; live.activeRun = runId; },
    liveRun(chatId, runId) { chats.get(chatId).liveRun = runId; },
    // A timeline's clock: recording second 0, and the run's state changes in recording seconds, its live seconds counted
    // from `base` (what the run had accrued before the clip) and its rows' offsets from `at0` at recording second t0.
    origin() { originMs = Date.now(); },
    clock(runId, spec) { clocks[runId] = { t0: spec.t0, at0: spec.at0 ?? 0, base: spec.base ?? 0, transitions: spec.transitions }; },
    publish(runId, row) {
      const sent = [...chats.values()].flatMap((c) => c.runs || []).find((r) => r.id === runId);
      const record = activity[runId] || (activity[runId] = { state: "running", started: sent?.created ?? null, elapsed: null, items: [] });
      record.items = [...record.items.filter((i) => i.seq !== row.seq), row].sort((x, y) => x.seq - y.seq);
    },
    settle(runId, st, elapsed) { const r = activity[runId]; if (r) { r.state = st; if (elapsed !== undefined) r.elapsed = elapsed; } },
    items(runId) { return (activity[runId]?.items || []).map((i) => ({ ...i })); },
    deferApproval(actionId) { deferIds.add(actionId); },
    finishApproval(chatId, actionId, action) {
      const c = chats.get(chatId);
      c.actions = c.actions.map((x) => (x.id === actionId ? action : x));
      deferIds.delete(actionId);
      const answer = deferred.get(actionId);
      deferred.delete(actionId);
      if (answer) answer(true);
    },
    hostMessage(chatId, message) { chats.get(chatId).messages.push({ attachments: [], created: Math.floor(Date.now() / 1000), ...message }); },
    // app.py finish() saves the reply again (store.py INSERT OR REPLACE, a new `created`): it moves after anything since.
    resave(chatId, message) {
      const c = chats.get(chatId), old = c.messages.find((m) => m.id === message.id) || { attachments: [] };
      c.messages = [...c.messages.filter((m) => m.id !== message.id), { ...old, ...message, created: Math.floor(Date.now() / 1000) }];
    },
    streamEvent(runId, event) {
      const journal = journals[runId] || (journals[runId] = []);
      journal.push({ sequence: journal.length + 1, created: Date.now() / 1000, ...event });
    },
    rows: { afterHeld, testsView, recalled, responded, item, checksView, held: heldItems },
    reply: { held: REPLY_HELD, heldModel: REPLY_HELD_MODEL, continueVerified: CONTINUE_VERIFIED, celadon: CELADON_REPLY },
    text: { request: REQUEST, celadonQuestion: CELADON_QUESTION, testsSummary: testsSummary(0), heldIssue: HELD_ISSUE, notice: NOTICE_TEXT },
    tests: { pending: testsAction("pending"), running: testsAction("running"), applied: testsAction("applied", PASSED) },
    edits: editsApplied,
    tools: TOOLS,
  };

  return {
    live: liveApi,
    scene, theme, surface, storage, chats, state,
    has: (method) => Object.prototype.hasOwnProperty.call(handlers, method),
    async rpc(method, params) {
      const handler = handlers[method];
      return handler ? handler(params || {}) : null;
    },
  };
}
