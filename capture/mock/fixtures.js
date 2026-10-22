// Demo fixtures for Pebble 1.0.1's real UI. Everything here is fictional demo content (no real person's data).
// Shapes follow backend/pebble/app.py (state, chat), run_activity.py (activity items and verdict labels),
// app.py tool_label() wording, memory.py KINDS and the components' own validators.
//
// buildWorld({scene, theme, surface}) returns { storage, has(method), rpc(method, params) }.

const ID = { coding: "chat-invoice-fix", trip: "chat-lisbon-trip", quiz: "chat-datetime-quiz", pet: "chat-pet-weather", fresh: "chat-new" };
const WORKSPACE = "/Users/maya/Projects/invoice-kit";

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

const REPLY_PROPOSED = `Found it. \`add_months()\` in \`invoice_kit/dates.py\` keeps the original day when it moves a date forward, so an invoice issued on **31 January** asks Python for **31 February** and the export stops with \`ValueError: day is out of range for month\`.

I've drafted a two-line fix that clamps the day to the last day of the target month, plus a regression test for 31 Jan → 28 Feb (and 29 Feb in a leap year).

Nothing changes until you approve both edits. After that I'll run the test suite in an isolated copy of the project.`;

const REPLY_DONE = `Done, and verified:

- **\`invoice_kit/dates.py\`**: \`add_months()\` now clamps to the last day of the month, so 31 Jan + 1 month is 28 Feb.
- **\`tests/test_dates.py\`**: a new regression test covers month ends and leap years.
- **42 tests passed** in an isolated copy of your project, with network access off.

The CSV export works again for invoices issued on the 29th, 30th and 31st. Either edit can be undone from Details › Activity.`;

const TRIP_REPLY = `Here's your **Lisbon trip budget** as a live dashboard. You're on track: €486 spent of €1,240, with the biggest costs (flights and the apartment) already paid.

Open it from the canvas to see spending by category and what's still to book.`;

const QUIZ_REPLY = `Here's a 5-question check on Python's \`datetime\` module. You have 10 minutes; your answers save as you go, and I'll explain each one when you submit.`;

const PET_REPLY = `Light showers until about **11:00**, then clearing up, with a high of **19 °C**.

Pack a light jacket for the morning; the afternoon looks good for a walk in Alfama.`;

// The live sequence's reply (streamed token by token by capture.mjs through window.__pebble.emit).
export const LIVE_PET_REPLY = PET_REPLY;

function profileList() {
  return [
    { id: "p-local-qwen", name: "Qwen3.5 4B Instruct · Q4_K_M", kind: "gguf", path: "/Users/maya/Models/qwen3.5-4b-instruct-q4_k_m.gguf", context: 4096, tools: true, local: true }, // backend: GGUF runs at 4K
    { id: "p-chatgpt", name: "GPT-5.5", kind: "chatgpt", connection_id: "conn-chatgpt", provider_name: "ChatGPT", model: "gpt-5.5", context: 272000, tools: true, email: "maya@example.com" },
    { id: "p-claude", name: "Claude Sonnet 4.6", kind: "anthropic", connection_id: "conn-anthropic", provider_name: "Anthropic", model: "claude-sonnet-4-6", context: 200000, tools: true, has_key: true },
  ];
}

function modelStatus(which) {
  if (which === "cloud")
    return { state: "ready", configured: true, name: "GPT-5.5", path: "", context: 272000, kind: "chatgpt", provider: "ChatGPT", local: false,
      profile_id: "p-chatgpt", protocol: "responses", efforts: ["low", "medium", "high"], effort: "medium", default_effort: "medium" };
  return { state: "ready", configured: true, name: "Qwen3.5 4B Instruct · Q4_K_M", path: "/Users/maya/Models/qwen3.5-4b-instruct-q4_k_m.gguf",
    context: 4096, kind: "gguf", local: true, provider: "llama.cpp", profile_id: "p-local-qwen", efforts: ["quick", "think"], effort: "think", default_effort: "think" };
}

const MEMORY_TYPES = [
  ["working", "Working context", 2], ["episodic", "Past experiences", 14], ["semantic", "Facts & knowledge", 9],
  ["procedural", "Procedures", 3], ["temporal", "Time-sensitive information", 1], ["profile", "Your preferences", 5],
];

export function buildWorld({ scene, theme, surface, drawer: drawerWidth = null }) {
  const now = Math.floor(Date.now() / 1000);
  const ago = (s) => now - s;
  const model = modelStatus(/cloud/.test(scene) ? "cloud" : "local");

  // ---- conversations -------------------------------------------------------------------------------------------
  const codingProposed = {
    id: ID.coding, title: "Fix month-end due dates", workspace: WORKSPACE, trashed: false,
    messages: [
      { id: "msg-c1", role: "user", created: ago(420), attachments: [],
        content: "The CSV export crashes for invoices issued on the 31st: ValueError: day is out of range for month. Can you find the bug and fix it?" },
      { id: "msg-c2", role: "assistant", created: ago(372), run_id: "run-fix-1", attachments: [], content: REPLY_PROPOSED,
        usage: { input_tokens: 6120, output_tokens: 412, cached_tokens: 4096, tokens_per_second: 38.4, route: "model", calls: 4, seconds: 46.2 } },
    ],
    actions: [
      { id: "act-edit-dates", chat_id: ID.coding, kind: "edit", status: "pending", payload: { path: "invoice_kit/dates.py", baseline: "9f2c41d07ab3", diff: DIFF_DATES } },
      { id: "act-edit-tests", chat_id: ID.coding, kind: "edit", status: "pending", payload: { path: "tests/test_dates.py", baseline: "51ab9e2c3d70", diff: DIFF_TESTS } },
    ],
    runs: [{ id: "run-fix-1", state: "waiting_approval", steps: 6, elapsed: 46, created: ago(418), updated: ago(372), counts: { steps: 6, retries: 0, waited: 0 } }],
    questions: [], plan: null, artifacts: [],
  };
  const codingDone = {
    ...codingProposed,
    messages: [
      ...codingProposed.messages,
      { id: "msg-c3", role: "user", created: ago(140), attachments: [], content: "Both look right. Go ahead." },
      { id: "msg-c4", role: "assistant", created: ago(64), run_id: "run-fix-2", attachments: [], content: REPLY_DONE,
        usage: { input_tokens: 8410, output_tokens: 236, cached_tokens: 6144, tokens_per_second: 41.7, route: "model", calls: 3, seconds: 31.5 } },
    ],
    actions: [
      { id: "act-edit-dates", chat_id: ID.coding, kind: "edit", status: "applied", payload: { path: "invoice_kit/dates.py", baseline: "9f2c41d07ab3", diff: DIFF_DATES } },
      { id: "act-edit-tests", chat_id: ID.coding, kind: "edit", status: "applied", payload: { path: "tests/test_dates.py", baseline: "51ab9e2c3d70", diff: DIFF_TESTS } },
      { id: "act-tests-1", chat_id: ID.coding, kind: "tests", status: "applied",
        payload: { recipe: "pytest",
          plan: { recipe: "pytest", kind: "python", cwd: "snapshot", timeout: 120, output_limit: 1048576, network: false, argv: ["python", "-m", "pytest", "-q"],
            executable: { realpath: "/Users/maya/Projects/invoice-kit/.venv/bin/python3.12", sha256: "4be1f0e7c2a95d3378e0b2f6c1d9a8e74b3c5d6e7f8091a2b3c4d5e6f7081920" } },
          result: { outcome: "passed", exit_code: 0, tests: { passed: 42, failed: 0, skipped: 0, errors: 0, total: 42 },
            snapshot_digest: "c0ffee5a1b2c3d4e5f60718293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5", drafts_included: [],
            output: "..........................................  [100%]\n42 passed in 1.84s" } } },
    ],
    runs: [
      { id: "run-fix-2", state: "completed", steps: 5, elapsed: 72, created: ago(138), updated: ago(64), counts: { steps: 5, retries: 0, waited: 6 } },
      { id: "run-fix-1", state: "completed", steps: 6, elapsed: 46, created: ago(418), updated: ago(372), counts: { steps: 6, retries: 0, waited: 0 } },
    ],
  };
  const trip = {
    id: ID.trip, title: "Lisbon trip budget", workspace: null,
    messages: [
      { id: "msg-t1", role: "user", created: ago(3600), attachments: [], content: "Turn my Lisbon trip spending into a dashboard: what I've spent, by category, and what's left to book." },
      { id: "msg-t2", role: "assistant", created: ago(3560), run_id: "run-trip-1", attachments: [], content: TRIP_REPLY },
    ],
    actions: [], questions: [], plan: null,
    runs: [{ id: "run-trip-1", state: "completed", steps: 2, elapsed: 18, created: ago(3590), updated: ago(3560), counts: { steps: 1, retries: 0, waited: 0 } }],
    artifacts: [tripDashboard(ID.trip, ago(3560))],
  };
  const quiz = {
    id: ID.quiz, title: "Python datetime check-in", workspace: null,
    messages: [
      { id: "msg-q1", role: "user", created: ago(900), attachments: [], content: "Quiz me on Python's datetime module, 5 questions." },
      { id: "msg-q2", role: "assistant", created: ago(880), run_id: "run-quiz-1", attachments: [], content: QUIZ_REPLY },
    ],
    actions: [], questions: [], plan: null,
    runs: [{ id: "run-quiz-1", state: "completed", steps: 1, elapsed: 9, created: ago(890), updated: ago(880), counts: { steps: 1, retries: 0, waited: 0 } }],
    artifacts: [datetimeQuiz(ID.quiz, ago(880))],
  };
  const pet = {
    id: ID.pet, title: "Rain in Lisbon tomorrow?", workspace: null,
    messages: [
      { id: "msg-p1", role: "user", created: ago(95), attachments: [], content: "Will it rain in Lisbon tomorrow morning?" },
      { id: "msg-p2", role: "assistant", created: ago(80), run_id: "run-pet-1", attachments: [], content: PET_REPLY },
    ],
    actions: [], questions: [], plan: null, artifacts: [],
    runs: [{ id: "run-pet-1", state: "completed", steps: 1, elapsed: 7, created: ago(92), updated: ago(80), counts: { steps: 1, retries: 0, waited: 0 } }],
  };
  const fresh = { id: ID.fresh, title: "New conversation", workspace: null, messages: [], actions: [], runs: [], questions: [], plan: null, artifacts: [] };
  // Live sequences start empty; capture.mjs sends a message and then plays the backend events.
  const liveMain = { id: "chat-live-fix", title: "New conversation", workspace: WORKSPACE, messages: [], actions: [], runs: [], questions: [], plan: null, artifacts: [] };
  const livePet = { id: "chat-live-pet", title: "New conversation", workspace: null, messages: [], actions: [], runs: [], questions: [], plan: null, artifacts: [] };

  const chats = new Map();
  const put = (c) => chats.set(c.id, c);
  const coding = /^approval/.test(scene) || scene === "pet-review" ? codingProposed : codingDone;
  [coding, trip, quiz, pet, fresh, liveMain, livePet].forEach(put);
  const sidebarExtra = [
    { id: "chat-rust-lifetimes", title: "Explain Rust lifetimes simply", workspace: null },
    { id: "chat-launch-email", title: "Draft the beta launch email", workspace: null },
    { id: "chat-reading-plan", title: "Weekly reading plan", workspace: null },
  ];

  // Which conversation the window opens first (App.vue opens state.chats[0]; the pet reads its saved id).
  const first = {
    welcome: fresh, approval: coding, done: coding, "settings-permissions": coding, "settings-memory": coding,
    dashboard: trip, quiz: quiz, "approval-cloud": coding, live: liveMain, "pet-live": livePet,
  }[scene] || (surface === "pet" ? pet : coding);
  const order = [first, ...[coding, pet, trip, quiz].filter((c) => c !== first)];
  const listed = () => [...order.map(({ id, title, workspace }) => ({ id, title, workspace })), ...sidebarExtra];

  // ---- run activity (Details › Steps and the receipt's expanded timeline) ----------------------------------------
  const activity = {
    "run-fix-1": { state: "completed", started: ago(418), elapsed: 46, items: [
      item(0, 0.4, "context", "Read your request and the project notes"),
      item(64, 2.1, "tool", "Searching project source", { activity: "searching", duration: 0.6 }),
      item(128, 3.0, "tool", "Reading invoice_kit/export.py", { activity: "reading", duration: 0.2 }),
      item(192, 3.4, "tool", "Reading invoice_kit/dates.py", { activity: "reading", duration: 0.2 }),
      item(256, 3.8, "tool", "Reading tests/test_dates.py", { activity: "reading", duration: 0.2 }),
      item(320, 12.6, "tool", "Preparing an edit to invoice_kit/dates.py", { activity: "editing", duration: 0.3, detail: "Staged for your approval." }),
      item(384, 19.9, "tool", "Preparing an edit to tests/test_dates.py", { activity: "editing", duration: 0.3, detail: "Staged for your approval." }),
      item(448, 20.4, "note", "Waiting for your approval"),
    ] },
    "run-fix-2": { state: "completed", started: ago(138), elapsed: 72, items: [
      item(0, 0.3, "approval", "Approved: Preparing an edit to invoice_kit/dates.py", { duration: 6 }),
      item(64, 0.4, "approval", "Approved: Preparing an edit to tests/test_dates.py", { duration: 0 }),
      item(128, 6.8, "tool", "Finding project test and build recipes", { activity: "searching", duration: 0.4 }),
      item(192, 7.9, "tool", "Requesting isolated tests", { activity: "testing", duration: 11.2 }),
      item(256, 19.6, "tool", "Reading invoice_kit/export.py", { activity: "reading", duration: 0.2 }),
      item(320, 20.1, "tool", "Searching project source", { activity: "searching", duration: 0.5 }),
      item(384, 27.5, "check", "Verified · pytest 42 passed on current files", { duration: 2.4 }),
      item(448, 31.0, "model", "Writing the reply", { duration: 4.1 }),
    ] },
    "run-trip-1": { state: "completed", started: ago(3590), elapsed: 18, items: [item(0, 1.2, "tool", "Creating a dashboard view", { activity: "viewing", duration: 3.4 })] },
    "run-quiz-1": { state: "completed", started: ago(890), elapsed: 9, items: [item(0, 1.0, "tool", "Creating a quiz view", { activity: "viewing", duration: 2.2 })] },
    "run-pet-1": { state: "completed", started: ago(92), elapsed: 7, items: [item(0, 0.8, "tool", "Looking up current weather", { activity: "searching", duration: 1.6 })] },
  };

  // ---- memory (Settings › Memory) --------------------------------------------------------------------------------
  const memories = {
    profile: [
      { id: "pebble-md", kind: "profile", scope: "global", origin: "curated", updated: ago(86400 * 3),
        content: "Call me Maya. I maintain invoice-kit, a small open-source Python billing library, and I'm planning a trip to Lisbon in May." },
      { id: "mem-pref-1", kind: "profile", scope: "global", origin: "direct-user", updated: ago(86400 * 2),
        content: "Prefers short answers: code first, then a one-paragraph explanation." },
      { id: "mem-pref-2", kind: "profile", scope: "global", origin: "auto-learned", learning_status: "active", updated: ago(86400 * 5),
        provenance: JSON.stringify({ evidence_class: "human_preference" }), content: "Writes Python with type hints and runs tests with pytest." },
      { id: "mem-pref-3", kind: "profile", scope: "global", origin: "direct-user", updated: ago(86400 * 9),
        content: "Uses metric units and 24-hour times." },
      { id: "mem-pref-4", kind: "profile", scope: "project:" + WORKSPACE, origin: "auto-learned", learning_status: "active", updated: ago(86400),
        provenance: JSON.stringify({ evidence_class: "human_preference" }), content: "In invoice-kit, keep public function names stable; add a changelog line for every fix." },
    ],
    semantic: [
      { id: "mem-fact-1", kind: "semantic", scope: "project:" + WORKSPACE, origin: "auto-learned", learning_status: "active", updated: ago(86400 * 4),
        provenance: JSON.stringify({ evidence_class: "attributed_file_quote" }), content: JSON.stringify({ quote: "Invoices are due 30 days after issue unless terms say otherwise.", path: "docs/billing.md" }) },
    ],
    procedural: [
      { id: "mem-proc-1", kind: "procedural", scope: "project:" + WORKSPACE, origin: "auto-learned", learning_status: "active", updated: ago(3600),
        provenance: JSON.stringify({ evidence_class: "host_lesson" }), content: JSON.stringify({ recipe: "python -m pytest -q", language: "Python" }) },
    ],
  };

  // ---- the state() reply -----------------------------------------------------------------------------------------
  const permissions = { mode: /full/.test(scene) ? "full" : "ask",
    tools: { files: true, edits: true, tests: true, apps: true, web: true, terminal: true, plugins: true, views: true, screen: false } };
  const live = { active: null, activeRun: null };
  const state = () => ({
    job_notifications: [],
    chats: listed(),
    model,
    guard: { available: true, error: null },
    active: live.active,
    active_run: live.activeRun,
    runs: [...chats.values()].flatMap((c) => (c.runs || []).map((r) => ({ id: r.id, chat_id: c.id, state: r.state, created: r.created, updated: r.updated }))),
    settings: {
      theme, reduced_motion: false, memory_enabled: true,
      memory_layers: { working: true, episodic: true, semantic: true, procedural: true, temporal: true, profile: true },
      permissions,
      companion: { pointer: true, reactions: true, status_words: "rotate", ui_guidance: true },
    },
    data_dir: "/Users/maya/.pebble",
    platform: "darwin",
    version: "1.0.1",
    memory: {
      enabled: true,
      strategy: "SQLite FTS5 · hybrid lexical/trigram/metadata ranking · bounded retrieval · no extra model",
      types: MEMORY_TYPES.map(([id, name, count]) => ({ id, name, count, enabled: true })),
      learning: { status_counts: { active: 11, pending: 0 }, last_error_type: null },
    },
    profiles: profileList(),
  });

  const artifactsOf = (chatId) => chats.get(chatId)?.artifacts || [];
  const findArtifact = ({ chat_id, id }) => artifactsOf(chat_id).find((a) => a.id === id);

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
      const run_id = "run-live-" + (c.runs.length + 1);
      c.runs = [{ id: run_id, state: "queued", created: Math.floor(Date.now() / 1000) }, ...c.runs];
      live.active = id;
      live.activeRun = run_id;
      return { message_id, run_id };
    },
    cancel: () => true,
    approve: ({ id, action_id }) => {
      const a = chats.get(id)?.actions.find((x) => x.id === action_id);
      if (a) a.status = "applied";
      return true;
    },
    run_activity: ({ run_id, after = 0 }) => {
      const a = activity[run_id];
      // A run the capture script is playing live: the host reports it running, with its items still arriving as events.
      if (!a && live.activeRun === run_id) return { run_id, state: "running", items: [], next: 0, started: Math.floor(Date.now() / 1000) - 1, elapsed: null, reasoning: null };
      if (!a) return { run_id, state: "completed", items: [], next: 0, started: null, elapsed: null, reasoning: null };
      const items = a.items.filter((i) => i.seq >= (after || 0));
      return { run_id, state: a.state, started: a.started, elapsed: a.elapsed, items, next: Math.max(0, ...a.items.map((i) => i.seq)) + 1, reasoning: null };
    },
    // 46% of the window: below the composer ring (RING_AT = 60%), as for a typical settled task.
    context_inspect: ({ chat_id, run_id }) => ({ chat_id, run_id, used: Math.round(model.context * 0.46), total: Math.round(model.context * 0.46), window: { tokens: model.context } }),
    job_list: () => ({ jobs: [] }),
    process_list: () => [],
    stream_read: ({ after = 0 }) => ({ events: [], next_after: after, more: false }),
    screen_sessions: () => [],
    goal_list: () => [],
    agent_list: () => ({ nodes: [] }),
    research_sources: () => ({ sources: [], snippets: [] }),
    command_catalogue: () => [],
    extensions: () => [],
    memory_list: ({ kind }) => memories[kind] || [],
    memory_candidates: () => [],
    memory_contests: () => [],
    plan_credentials: () => ({ names: ["GITHUB_TOKEN"] }),
    notification_status: () => ({ enabled: true, muted: false, outbox: {} }),
    telemetry_get: () => ({ enabled: false, events: 0 }),
    artifact_get: (p) => findArtifact(p) || (() => { throw "View not found."; })(),
    artifact_history: (p) => [findArtifact(p)].filter(Boolean),
    quiz_attempt: (p) => (findArtifact(p)?.kind === "quiz" ? quizAttempt(p, now) : null),
    quiz_start: (p) => quizAttempt(p, now),
    quiz_save: () => ({ saved: true }),
    setting: () => true,
    open_url: () => null,
    remove_source: () => true,
    chatgpt_status: () => ({ state: "signed_in", email: "maya@example.com" }),
    connector_status: () => [],
    storage_summary: () => ({}),
  };

  const storage = {};
  if (surface === "main") {
    const drawer = { approval: { open: true, tab: "activity", width: 400 }, done: { open: true, tab: "activity", width: 400 }, "approval-cloud": { open: true, tab: "activity", width: 400 } }[scene];
    const prefs = drawer || { open: false, tab: "activity", width: 360 };
    if (drawerWidth) prefs.width = drawerWidth; // DetailsDrawer clamps it to 320..520
    storage["pebble.details.main"] = JSON.stringify(prefs);
  } else {
    storage["pebble-pet-chat"] = (scene === "pet-live" ? livePet : scene === "pet-review" ? coding : pet).id;
  }

  // Called by capture.mjs (page.evaluate) between backend events, so later get_chat/state replies match them.
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
      c.runs = [run, ...(c.runs || []).filter((r) => r.id !== run.id)];
    },
    title(chatId, title) { chats.get(chatId).title = title; },
    active(chatId, runId) { live.active = chatId; live.activeRun = runId; },
    activity(runId, record) { activity[runId] = record; },
    reply: { pet: PET_REPLY, proposed: REPLY_PROPOSED, done: REPLY_DONE },
    diffs: { dates: DIFF_DATES, tests: DIFF_TESTS },
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

function item(seq, at, kind, label, extra = {}) {
  return { seq, at, kind, label, detail: extra.detail ?? null, duration: extra.duration ?? null, status: extra.status || "done", activity: extra.activity ?? null };
}

function tripDashboard(chatId, created) {
  return {
    id: "view-trip-dashboard", chat_id: chatId, kind: "dashboard", title: "Lisbon trip budget", created, updated: created, revision: 1, status: "ready",
    owner_run_id: "run-trip-1", evidence_ids: [],
    data: {
      columns: 3,
      panels: [
        { id: "spent", title: "Spent so far", kind: "metric", data: { value: 486, unit: "€", delta: 112, caption: "of a €1,240 budget" } },
        { id: "left", title: "Left to spend", kind: "metric", data: { value: 754, unit: "€", caption: "€151 a day for 5 days" } },
        { id: "booked", title: "Bookings confirmed", kind: "metric", data: { value: 4, unit: "of 6", caption: "flights, apartment, 2 tours" } },
        { id: "by-category", title: "Spending by category", kind: "chart",
          data: { type: "bar", x_key: "category", y_keys: ["planned", "spent"], labels: { planned: "Planned", spent: "Spent" },
            rows: [
              { category: "Flights", planned: 260, spent: 248 }, { category: "Stay", planned: 420, spent: 210 },
              { category: "Food", planned: 250, spent: 0 }, { category: "Tours", planned: 150, spent: 28 },
              { category: "Transit", planned: 60, spent: 0 }, { category: "Other", planned: 100, spent: 0 },
            ], caption: "Euros, planned against spent" } },
        { id: "to-book", title: "Still to book", kind: "table",
          data: { columns: [{ id: "item", label: "Item" }, { id: "when", label: "When" }, { id: "estimate", label: "Estimate" }],
            rows: [
              { item: "Sintra day trip", when: "Day 3", estimate: "€38" },
              { item: "Fado dinner, Alfama", when: "Day 4", estimate: "€65" },
            ] } },
      ],
    },
  };
}

function datetimeQuiz(chatId, created) {
  return {
    id: "view-datetime-quiz", chat_id: chatId, kind: "quiz", title: "Python datetime check-in", created, updated: created, revision: 1, status: "ready",
    owner_run_id: "run-quiz-1", evidence_ids: [],
    data: {
      duration_minutes: 10,
      questions: [
        { id: "q1", question: "What does date(2026, 1, 31) + timedelta(days=1) return?", choices: ["date(2026, 2, 1)", "date(2026, 1, 32)", "It raises ValueError", "date(2026, 2, 28)"] },
        { id: "q2", question: "Which call returns the number of days in February 2028?", choices: ["calendar.monthrange(2028, 2)[1]", "date(2028, 2, 0).day", "timedelta(months=1).days", "datetime.days_in(2028, 2)"] },
        { id: "q3", question: "Why is datetime.utcnow() discouraged in new code?", choices: ["It returns a naive datetime", "It is slower than now()", "It ignores leap seconds only", "It was removed in Python 3.0"] },
        { id: "q4", question: "What does datetime.fromisoformat('2026-10-22T09:30+01:00') produce?", choices: ["An aware datetime with a +01:00 offset", "A naive datetime in UTC", "A date object", "A ValueError"] },
        { id: "q5", question: "Which type should store a duration of 90 minutes?", choices: ["timedelta", "time", "date", "datetime"] },
      ],
    },
  };
}

function quizAttempt({ chat_id, id }, now) {
  return { attempt_id: "attempt-demo-1", chat_id, artifact_id: id, revision: 1, status: "open", deadline: now + 7 * 60 + 42,
    answers: { q1: 0, q2: 0, q3: null, q4: null, q5: null } };
}
