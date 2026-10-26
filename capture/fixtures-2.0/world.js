// DRAFT fixtures for the Pebble 2.0 film's harness scenes (TREATMENT §6: HS-F, HS-B2, HS-D, HS-N, HS-O, HS-B3, HS-G,
// and the tour's HS-A3, HS-E, HS-F2, HS-K, HS-M, HS-X, HS-B4), written in the sample world (sampleWorld.js).
// Film-2.0 branch only; embargoed until the release session posts "2.0.0 published". Not wired into the harness yet.
//
// PLACEHOLDERS, NOT 2.0.0 UI: the 2.0.0 source snapshot arrives later (OVERRIDES §49). Until then:
//   - the RPC names and data shapes are the published v1.5.0 ones (capture/mock/fixtures.js, and the public v1.5.0
//     components for the panels that harness left empty: AgentPanel, GoalPanel, AdvancedSettings, CompanionWorkflows,
//     ScreenSessions, ResearchSources, ModelPicker). Every one is marked CHECK-2.0 where 1.6-1.9.14 may have changed it;
//   - action kinds and payloads that only exist after 1.5.0 (shell, file, browser_grant, screen_grant, app_action and
//     the Workshop's cards) use the names CHANGELOG.md gives and are marked SNAPSHOT: their payload fields are guesses
//     to be replaced from the snapshot, field for field;
//   - every host or UI string comes from strings.js, whose status says how sure it is; unknown strings are visible
//     ⟦placeholders⟧ so a capture made before the check can never pass for real UI.
// check.mjs runs this world in Node, lists every placeholder per scene, and (with --snapshot) checks every string
// against the 2.0.0 source.
//
// buildWorld2({scene, theme, surface, drawer, stealth, version}) returns the same object as v1.5.0's buildWorld():
// { live, scene, theme, surface, storage, chats, state, has(method), rpc(method, params) }.

import { S, STRINGS } from "./strings.js";
import * as W from "./sampleWorld.js";

export const DRAFT = true;

const ID = {
  bookings: "chat-studio-bookings", photos: "chat-photos", glaze: "chat-glaze", kiln: "chat-kiln", tickets: "chat-tickets",
  openDay: "chat-open-day", memory: "chat-remember", forget: "chat-forget-price-list", goal: "chat-open-day-goal",
  views: "chat-open-day-views", fresh: "chat-new", trashed: "chat-old-price-ideas", quick: "chat-quick",
};
const autoTitle = (text) => text.slice(0, 54).replace(/\n/g, " "); // store.py message() at v1.5.0: CHECK-2.0
const hex = (seed) => { // sample hashes, the same on every run (never a real file's digest)
  let h = 2166136261 >>> 0, out = "";
  for (let i = 0; out.length < 64; i++) { h = Math.imul(h ^ seed.charCodeAt(i % seed.length) ^ i, 16777619) >>> 0; out += h.toString(16).padStart(8, "0"); }
  return out.slice(0, 64);
};

function item(seq, at, kind, label, extra = {}) { // run_activity row, v1.5.0 shape: CHECK-2.0 (1.9.13 folds routine rows)
  return { seq, at, kind, label, detail: extra.detail ?? null, duration: extra.duration ?? null, status: extra.status || "done", activity: extra.activity ?? null };
}

export function buildWorld2({ scene = "welcome", theme = "light", surface = "main", drawer: drawerWidth = null, stealth = false, version = null } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const ago = (s) => now - s;
  const usage = (input, output, cached, seconds, calls = 1) => // usage lines stay out of frame (R-NUM, FEATURES S5)
    ({ input_tokens: input, output_tokens: output, cached_tokens: cached, tokens_per_second: null, route: "model", calls, seconds });

  // ---- models (HS-B2, C4): who answers and bills ---------------------------------------------------------------------
  // The labels are provider-only (no e-mail, 1.9.4). Model NAMES are placeholders on purpose: they come from the
  // demo account's real catalogue in the 2.0.0 snapshot or a real take, never invented (a model name is a claim).
  // CHECK-2.0: 1.5.0's picker was a native <select>, which headless Chrome can't capture open; if 2.0.0's grouped list
  // is still native, HS-B2 becomes a real take.
  const profiles = [
    { id: "p-chatgpt-1", name: "⟦ChatGPT model A⟧", kind: "chatgpt", context: 200000, tools: true, connection_id: "chatgpt", provider_name: "ChatGPT" },
    { id: "p-chatgpt-2", name: "⟦ChatGPT model B⟧", kind: "chatgpt", context: 200000, tools: true, connection_id: "chatgpt", provider_name: "ChatGPT" },
    { id: "p-api-1", name: "⟦API model⟧", kind: "openai", context: 200000, tools: true, connection_id: "api-key-1", provider_name: "⟦API provider⟧", has_key: true },
    { id: "p-local-1", name: "⟦local GGUF model⟧", kind: "gguf", path: W.HOME + "/Models/⟦model⟧.gguf", context: 8192, tools: true, connection_id: "local", provider_name: "On this device", local: true },
  ];
  const model = { state: "ready", configured: true, name: profiles[0].name, path: "", context: 200000, kind: "chatgpt", profile_id: profiles[0].id,
    provider: "ChatGPT", efforts: ["default"], effort: "default", default_effort: "default" };

  // ---- conversations ---------------------------------------------------------------------------------------------------
  const editAction = (status) => ({ id: "act-edit-slots", chat_id: ID.bookings, kind: "edit", status,
    payload: { path: W.BOOKINGS.changed[0], baseline: hex("slots-before").slice(0, 12), diff: W.BOOKINGS.diff } });
  const testsAction = (status) => ({ id: "act-tests-1", chat_id: ID.bookings, kind: "tests", status,
    payload: { recipe: "pytest",
      plan: { recipe: "pytest", kind: "python", cwd: "snapshot", timeout: 120, output_limit: 1048576, network: false, argv: ["python", "-m", "pytest", "-q"],
        executable: { realpath: W.PROJECT + "/.venv/bin/python3.14", sha256: hex("venv-python") } }, // copy_in.sh makes this venv
      ...(status === "applied" ? { result: { outcome: "passed", exit_code: 0, tests: W.BOOKINGS.tests, snapshot_digest: hex("snapshot"),
        drafts_included: [], output: W.BOOKINGS.output } } : {}) } });
  const heldNotice = S("heldNotice", { names: W.BOOKINGS.changed.map((p) => p.split("/").pop()).join(", "), them: W.BOOKINGS.changed.length === 1 ? "it" : "them" });
  const heldIssue = S("heldIssue", { changed: W.BOOKINGS.changed.length, covering: W.BOOKINGS.covering.length, list: JSON.stringify(W.BOOKINGS.covering) });
  const bookingsBase = {
    id: ID.bookings, title: "studio-bookings", workspace: W.PROJECT, trashed: false, questions: [], plan: null, artifacts: [],
    messages: [
      { id: "msg-b1", role: "user", created: ago(300), attachments: [], content: W.MESSAGES.bookings },
      { id: "msg-b2", role: "assistant", created: ago(262), run_id: "run-b1", attachments: [], content: W.BOOKINGS.replyProposed, usage: usage(5200, 140, 3072, 21.0, 3) },
    ],
  };
  const bookingsHeld = { ...bookingsBase,
    messages: [...bookingsBase.messages,
      { id: "msg-b3", role: "user", created: ago(120), attachments: [], content: W.MESSAGES.bookingsGoAhead },
      { id: "msg-b4", role: "assistant", created: ago(70), run_id: "run-b2", attachments: [], content: W.BOOKINGS.replyHeldModel + "\n\n" + S("heldPrefix") + heldNotice, usage: usage(5900, 96, 4096, 12.4, 2) }],
    actions: [editAction("applied")],
    runs: [{ id: "run-b2", state: "verification_required", steps: 2, elapsed: 30, error: heldIssue, created: ago(118), updated: ago(70), counts: { steps: 2, retries: 0, waited: 4 } },
      { id: "run-b1", state: "completed", steps: 5, elapsed: 38, error: null, created: ago(298), updated: ago(262), counts: { steps: 5, retries: 0, waited: 0 } }],
  };
  const bookingsDone = { ...bookingsHeld,
    messages: [...bookingsHeld.messages.slice(0, 3),
      { ...bookingsHeld.messages[3], content: W.BOOKINGS.replyHeldModel + W.BOOKINGS.continueVerified }],
    actions: [editAction("applied"), testsAction("applied")],
    runs: [{ ...bookingsHeld.runs[0], state: "completed", error: null }, bookingsHeld.runs[1]],
  };

  // SNAPSHOT: the shell and file actions' kinds and payloads (CHANGELOG 1.6.0; app.py describe() 'shell' and 'file').
  const photos = {
    id: ID.photos, title: "Photos", workspace: null, trashed: false, questions: [], plan: null, artifacts: [],
    messages: [
      { id: "msg-p1", role: "user", created: ago(200), attachments: [], content: W.MESSAGES.photos[0] },
      { id: "msg-p2", role: "assistant", created: ago(180), run_id: "run-p1", attachments: [], content: W.PHOTOS.replyResized },
      { id: "msg-p3", role: "user", created: ago(90), attachments: [], content: W.MESSAGES.photos[1] },
      { id: "msg-p4", role: "assistant", created: ago(70), run_id: "run-p2", attachments: [], content: W.PHOTOS.replyFlyer },
    ],
    actions: [
      { id: "act-shell-1", chat_id: ID.photos, kind: "shell", status: "applied", // SNAPSHOT: kind and payload
        payload: { command: W.PHOTOS.command, cwd: W.HOME, exit_code: 0, output: W.PHOTOS.output, writable: [W.WORKBENCH], network: false,
          receipt: S("shellReceipt", { command: W.PHOTOS.command, code: 0 }) } },
      { id: "act-file-1", chat_id: ID.photos, kind: "file", status: "applied", // SNAPSHOT: kind and payload
        payload: { path: W.PHOTOS.flyer, operation: "edit", diff: W.PHOTOS.flyerDiff, folder: W.OPEN_DAY_FOLDER, undoable: true,
          receipt: S("fileReceipt", { path: W.PHOTOS.flyer, bytes: 412 }) } },
    ],
    runs: [{ id: "run-p2", state: "completed", steps: 2, elapsed: 9, error: null, created: ago(89), updated: ago(70), counts: { steps: 2, retries: 0, waited: 3 } },
      { id: "run-p1", state: "completed", steps: 3, elapsed: 14, error: null, created: ago(199), updated: ago(180), counts: { steps: 3, retries: 0, waited: 0 } }],
  };

  // SNAPSHOT: where 2.0.0 keeps the Workshop's cards (an action kind, or a field of the message) and their fields.
  const glaze = {
    id: ID.glaze, title: "Glaze", workspace: null, trashed: false, questions: [], plan: null, artifacts: [],
    messages: [
      { id: "msg-g1", role: "user", created: ago(140), attachments: [], content: W.MESSAGES.glaze },
      { id: "msg-g2", role: "assistant", created: ago(96), run_id: "run-g1", attachments: [], content: W.WORKSHOP.glazeAnswer },
    ],
    actions: [{ id: "act-keep-ask", chat_id: ID.glaze, kind: "tool_keep", status: "pending", // SNAPSHOT: kind and payload
      payload: { tool: W.WORKSHOP.glazeTool, title: S("keepAskTitle"), reason: S("keepAskReason"), buttons: [S("keepDiscard"), S("keepKeep")] } }],
    runs: [{ id: "run-g1", state: "waiting_approval", steps: 4, elapsed: 41, error: null, created: ago(139), updated: ago(96), counts: { steps: 4, retries: 0, waited: 0 } }],
  };
  const kiln = {
    id: ID.kiln, title: "Kiln", workspace: null, trashed: false, questions: [], plan: null, artifacts: [],
    messages: [
      { id: "msg-k1", role: "user", created: ago(160), attachments: [], content: W.MESSAGES.kiln },
      { id: "msg-k2", role: "assistant", created: ago(60), run_id: "run-k1", attachments: [], content: W.WORKSHOP.kilnAnswer },
    ],
    actions: [{ id: "act-kept", chat_id: ID.kiln, kind: "tool_kept", status: "applied", // SNAPSHOT: kind and payload
      payload: { tool: W.WORKSHOP.kilnTool, title: S("keptTitle", { tool: W.WORKSHOP.kilnTool }), body: S("keptBody"),
        buttons: [S("keptViewCode"), S("keptRemove")], code: W.WORKSHOP.kilnCode } }],
    runs: [{ id: "run-k1", state: "completed", steps: 5, elapsed: 100, error: null, created: ago(159), updated: ago(60), counts: { steps: 5, retries: 0, waited: 0 } }],
  };

  // A window the person allowed (wall cell I8/I9; the real take RS-4 is the film's): SNAPSHOT for the grant's payload.
  const tickets = {
    id: ID.tickets, title: "Tickets", workspace: null, trashed: false, questions: [], plan: null, artifacts: [],
    messages: [
      { id: "msg-t1", role: "user", created: ago(80), attachments: [], content: W.MESSAGES.tickets },
      { id: "msg-t2", role: "assistant", created: ago(50), run_id: "run-t1", attachments: [], content: "48 × 12.5 = **600**, on Calculator's display." },
    ],
    actions: [{ id: "act-window-calc", chat_id: ID.tickets, kind: "screen_grant", status: "applied", // SNAPSHOT
      payload: { app: "Calculator", window: "Calculator", receipt: S("windowReceipt", { app: "Calculator", window: "Calculator" }) + " " + S("endAccess") } }],
    runs: [{ id: "run-t1", state: "completed", steps: 4, elapsed: 9, error: null, created: ago(79), updated: ago(50), counts: { steps: 4, retries: 0, waited: 2 } }],
  };
  // The site card waiting in the companion (A9, wall cell; RS-9 is the film's real take): SNAPSHOT.
  const openDay = {
    id: ID.openDay, title: "Open day", workspace: null, trashed: false, questions: [], plan: null, artifacts: [],
    messages: [{ id: "msg-o1", role: "user", created: ago(20), attachments: [], content: W.MESSAGES.openDay[0] }],
    actions: [{ id: "act-site-yt", chat_id: ID.openDay, kind: "browser_grant", status: "pending", // SNAPSHOT
      payload: { heading: S("siteCardHeading", { site: "youtube.com" }), body: S("siteCardBody"), act_on: ["youtube.com"], read_only: [], where: "⟦in its own tab in your browser⟧" } }],
    runs: [{ id: "run-o1", state: "waiting_approval", steps: 2, elapsed: 6, error: null, created: ago(19), updated: ago(12), counts: { steps: 2, retries: 0, waited: 0 } }],
  };

  // Memory: "Remember that …" (D2) and the forget card (D3/D4).
  const remember = {
    id: ID.memory, title: autoTitle(W.MESSAGES.remember), workspace: null, trashed: false, questions: [], plan: null, artifacts: [], actions: [],
    messages: [
      { id: "msg-r1", role: "user", created: ago(40), attachments: [], content: W.MESSAGES.remember },
      { id: "msg-r2", role: "assistant", created: ago(39), run_id: "run-r1", attachments: [], content: S("rememberedNote") },
    ],
    runs: [{ id: "run-r1", state: "completed", steps: 0, elapsed: 0.3, error: null, created: ago(40), updated: ago(39), counts: { steps: 0, retries: 0, waited: 0 } }],
  };
  const forgetCount = 1, forgetSubject = "the old price list";
  const forget = {
    id: ID.forget, title: autoTitle(W.MESSAGES.forget), workspace: null, trashed: false, questions: [], plan: null, artifacts: [], actions: [],
    messages: [
      { id: "msg-f1", role: "user", created: ago(12), attachments: [], content: W.MESSAGES.forget },
      { id: "msg-f2", role: "assistant", created: ago(11), run_id: "run-f1", attachments: [],
        content: `I found ${forgetCount} saved memor${forgetCount === 1 ? "y" : "ies"} that match “${forgetSubject}”. Choose **Forget** on the ones you want gone, here or in Settings → Memory. Nothing is forgotten until you do.` },
    ],
    runs: [{ id: "run-f1", state: "completed", steps: 0, elapsed: 0.4, error: null, created: ago(12), updated: ago(11), counts: { steps: 0, retries: 0, waited: 0 } }],
  };

  // Bigger tasks: the agents (N1) and the goal (N2) live on the project conversation's last run.
  const goalChat = { id: ID.goal, title: "Open day ready", workspace: null, trashed: false, actions: [], runs: [], questions: [], plan: null, artifacts: [],
    messages: [{ id: "msg-q1", role: "user", created: ago(600), attachments: [], content: W.MESSAGES.goal }] };

  const views = {
    id: ID.views, title: "Open day bookings", workspace: null, trashed: false, questions: [], plan: null, actions: [],
    messages: [
      { id: "msg-v1", role: "user", created: ago(900), attachments: [], content: "Make a dashboard of the open day's bookings, and a short safety quiz for the glaze table." },
      { id: "msg-v2", role: "assistant", created: ago(880), run_id: "run-v1", attachments: [], content: "Here's the open day as a dashboard, and a three-question quiz for the glaze table." },
    ],
    runs: [{ id: "run-v1", state: "completed", steps: 2, elapsed: 12, error: null, created: ago(899), updated: ago(880), counts: { steps: 2, retries: 0, waited: 0 } }],
    artifacts: [
      { id: "view-open-day", chat_id: ID.views, kind: "dashboard", title: W.DASHBOARD.title, created: ago(880), updated: ago(880), revision: 1, status: "ready",
        owner_run_id: "run-v1", evidence_ids: [], data: { columns: 2, panels: W.DASHBOARD.panels } },
      { id: "view-glaze-quiz", chat_id: ID.views, kind: "quiz", title: W.QUIZ.title, created: ago(880), updated: ago(880), revision: 1, status: "ready",
        owner_run_id: "run-v1", evidence_ids: [], data: { duration_minutes: 5, questions: W.QUIZ.questions } },
    ],
  };
  const trashed = { id: ID.trashed, title: "Ideas for the old price list", workspace: null, trashed: true, messages: [], actions: [], runs: [], questions: [], plan: null, artifacts: [] };
  const fresh = { id: ID.fresh, title: "New conversation", workspace: null, messages: [], actions: [], runs: [], questions: [], plan: null, artifacts: [] };
  const quick = { id: ID.quick, title: "New conversation", workspace: null, messages: [], actions: [], runs: [], questions: [], plan: null, artifacts: [] };

  const held = /^held/.test(scene); // the held scenes show the hold; every other scene shows the finished, verified run
  const bookings = held ? bookingsHeld : bookingsDone;
  const chats = new Map();
  [bookings, photos, glaze, kiln, tickets, openDay, remember, forget, goalChat, views, trashed, fresh, quick].forEach((c) => chats.set(c.id, c));
  const sidebarExtra = [ // sample titles for a lived-in list (never a real conversation)
    { id: "chat-window-display", title: "Window display ideas", workspace: null },
    { id: "chat-glaze-order", title: "Glaze order for Monday", workspace: null },
  ];
  const first = {
    welcome: fresh, held: bookings, "held-tests": bookings, done: bookings, photos, glaze, kiln, tickets, "open-day": openDay,
    remember, forget, goal: goalChat, agents: bookings, views, quiz: views, settings: fresh, palette: fresh, search: fresh, models: fresh,
    "pet-quick": quick, "pet-open-day": openDay,
  }[scene] || fresh;
  const order = [first, ...[kiln, glaze, photos, bookings, tickets, openDay, views].filter((c) => c !== first)];
  const listed = () => [...order.map(({ id, title, workspace }) => ({ id, title, workspace })), ...sidebarExtra];

  // ---- run activity (Details › Activity) -------------------------------------------------------------------------------
  // v1.5.0 row labels: CHECK-2.0 (1.9.8 names Code Mode steps by purpose, 1.9.11 names app and browser steps in words,
  // 1.9.13 folds routine rows into one row named by the reply, 1.9.14 titles app steps by the press).
  const activity = {
    "run-b1": { state: "completed", started: ago(298), elapsed: 38, items: [
      item(0, 0.2, "context", S("rowRecalled", { n: 2 }), { detail: "Context ready in 160 ms", duration: 0.16 }),
      item(32, 0.4, "model", S("rowResponded"), { duration: 1.4 }),
      item(64, 2.0, "tool", S("rowSearching"), { activity: "searching", duration: 0.5 }),
      item(128, 2.7, "tool", S("rowReading", { path: "studio_bookings/slots.py" }), { activity: "reading", duration: 0.2 }),
      item(192, 3.1, "tool", S("rowReading", { path: "tests/test_slots.py" }), { activity: "reading", duration: 0.2 }),
      item(256, 9.8, "tool", S("rowPreparingEdit", { path: "studio_bookings/slots.py" }), { activity: "editing", duration: 0.3, detail: S("rowStaged") }),
      item(320, 10.2, "note", S("rowWaiting")),
    ] },
    "run-b2": !held ? { state: "completed", started: ago(118), elapsed: 48, items: [
      item(0, 0.3, "approval", S("rowApproved", { label: S("rowPreparingEdit", { path: "studio_bookings/slots.py" }) }), { duration: 5 }),
      item(64, 5.6, "model", S("rowResponded"), { duration: 2.9 }),
      item(128, 9.1, "note", S("rowIncomplete")),
      item(192, 26.0, "note", S("rowAskedTests")),
      item(256, 26.1, "tool", S("rowRequestingTests"), { activity: "testing", duration: 4.6 }), // sample: 1.5.0 took 4.63 s
      item(320, 31.0, "check", S("verified", { recipe: "pytest", passed: 18 }), { duration: 1.2 }),
    ] } : { state: "verification_required", started: ago(118), elapsed: 30, items: [
      item(0, 0.3, "approval", S("rowApproved", { label: S("rowPreparingEdit", { path: "studio_bookings/slots.py" }) }), { duration: 5 }),
      item(64, 5.6, "model", S("rowResponded"), { duration: 2.9 }),
      item(128, 8.6, "check", S("notVerified", { changed: 1 }), { duration: 0.5, detail: "1 item unresolved" }),
      item(192, 9.1, "note", S("rowIncomplete")),
    ] },
    "run-p1": { state: "completed", started: ago(199), elapsed: 14, items: [
      item(0, 0.3, "tool", "⟦the Shell step's Activity row at 2.0.0⟧", { activity: "running", duration: 1.6 }) ] }, // SNAPSHOT
    "run-p2": { state: "completed", started: ago(89), elapsed: 9, items: [
      item(0, 0.3, "tool", "⟦the EditFile step's Activity row at 2.0.0⟧", { activity: "editing", duration: 0.4 }) ] }, // SNAPSHOT
    "run-g1": { state: "waiting_approval", started: ago(139), elapsed: 41, items: [
      item(0, 0.4, "tool", S("codeModeStep"), { activity: "running" }), item(64, 20, "check", S("workshopRows")) ] },
    "run-k1": { state: "completed", started: ago(159), elapsed: 100, items: [
      item(0, 0.4, "tool", S("codeModeStep"), { activity: "running" }), item(64, 60, "check", S("workshopRows")) ] },
    "run-t1": { state: "completed", started: ago(79), elapsed: 9, items: [
      item(0, 4.1, "tool", S("pressedStep", { key: "=", before: "48×12.5", after: "600" }), { activity: "running", duration: 0.3 }) ] }, // CHECK-2.0 (1.9.14 format)
  };

  // ---- memory (HS-D) --------------------------------------------------------------------------------------------------
  const LAYERS = [["working", "Working context"], ["episodic", "Past experiences"], ["semantic", "Facts & knowledge"],
    ["procedural", "Procedures"], ["temporal", "Time-sensitive information"], ["profile", "Your preferences"]]; // memory.py KINDS at v1.5.0: CHECK-2.0
  const memories = {
    profile: W.MEMORIES.profile.map((m, i) => ({ ...m, kind: "profile", scope: "global", updated: ago(86400 * (i + 1)) })),
    semantic: W.MEMORIES.semantic.map((m, i) => ({ ...m, kind: "semantic", scope: "global", updated: ago(3600 * (i + 1)), ...(m.origin === "auto-learned" ? { learning_status: "active" } : {}) })),
    procedural: W.MEMORIES.procedural.map((m) => ({ ...m, kind: "procedural", scope: "project:" + W.PROJECT, learning_status: "active", updated: ago(7200),
      provenance: JSON.stringify({ evidence_class: "host_lesson" }) })),
    temporal: W.MEMORIES.temporal.map((m) => ({ ...m, kind: "temporal", scope: "global", updated: ago(86400), expires: now + 86400 * 6 })),
  };
  const STATIC_COUNTS = { working: 2, episodic: 9 };
  const findMemory = (id) => Object.values(memories).flat().find((m) => m.id === id);
  const where = (scope) => (scope === "global" ? "all" : String(scope).startsWith("chat:") ? "conversation" : "project");

  // ---- settings and state() -------------------------------------------------------------------------------------------
  const settings = {
    theme, reduced_motion: false, stealth: !!stealth, memory_enabled: true,
    memory_layers: Object.fromEntries(LAYERS.map(([id]) => [id, true])),
    // 1.5.0 keys; CHECK-2.0: the screenshot switch (1.6.0, "Take screenshots when a task needs them") and anything 1.9.x added
    permissions: { mode: "ask", tools: { files: true, edits: true, tests: true, apps: true, web: true, terminal: true, plugins: true, views: true, screen: true, screenshots: true } },
    companion: { pointer: true, reactions: true, status_words: "rotate", ui_guidance: true },
  };
  const live = { active: null, activeRun: null };
  const state = () => ({
    job_notifications: [], chats: listed(), model, guard: { available: true, error: null }, active: live.active, active_run: live.activeRun,
    runs: [...chats.values()].flatMap((c) => (c.runs || []).map((r) => ({ id: r.id, chat_id: c.id, state: r.state, created: r.created, updated: r.updated }))),
    settings, data_dir: W.HOME + "/.pebble", platform: "darwin",
    version: version || "2.0.0", // the snapshot's own VERSION once it exists (embargoed until "2.0.0 published")
    memory: { enabled: true, strategy: "SQLite FTS5 · hybrid lexical/trigram/metadata ranking · bounded retrieval · no extra model", // v1.5.0 memory.py: CHECK-2.0
      types: LAYERS.map(([id, name]) => ({ id, name, count: STATIC_COUNTS[id] ?? (memories[id] || []).length, enabled: true })),
      learning: { status_counts: { active: 4, pending: 0 }, last_error_type: null } },
    profiles,
  });

  // ---- panels that the 1.5.0 harness left empty (public v1.5.0 component shapes; CHECK-2.0) -------------------------------
  // N1, AgentPanel.vue agent_list: the rows print "Used N model calls, N tokens, N s" from dispatches, charged_tokens and
  // elapsed. They are sent as a host would send them; the film keeps that line out of frame (R-NUM), like usage lines.
  const agentTree = { root_run_id: "run-b2", nodes: [
    { id: "agent-1", agent_id: "agent-1", run_id: "run-b2", parent_id: null, generation: 1, name: "Booking page",
      task: "Read site/index.html and say where a full slot shows.", status: "completed", tools: ["ReadFile", "Search"], review: "proposed",
      dispatches: 2, charged_tokens: 3100, elapsed: 7 },
    { id: "agent-2", agent_id: "agent-2", run_id: "run-b2", parent_id: null, generation: 1, name: "Programme",
      task: "Check schedule.py: do the tasters fit between 10:00 and 16:00?", status: "completed", tools: ["ReadFile"], review: "proposed",
      dispatches: 1, charged_tokens: 1900, elapsed: 4 },
  ] };
  // N2, GoalPanel.vue goal_list and goal_get.
  const goal = { id: "goal-1", chat_id: ID.goal, title: "Open day ready", revision: 3, state: "active", note: S("goalNote"),
    criteria: [
      { id: "c1", text: "Photos resized for the website", kind: "evidence", status: "met", origin: "person", checked_by: "evidence", evidence: [{ run_id: "run-p1", call_id: "call-1" }], detail: null },
      { id: "c2", text: "The flyer has the hours", kind: "evidence", status: "met", origin: "person", checked_by: "evidence", evidence: [{ run_id: "run-p2", call_id: "call-2" }], detail: null },
      { id: "c3", text: "A full slot takes no more bookings", kind: "evidence", status: "met", origin: "person", checked_by: "evidence", evidence: [{ run_id: "run-b2", call_id: "call-3" }], detail: null },
      { id: "c4", text: "Price list printed", kind: "human_check", status: "open", origin: "person", checked_by: null, evidence: [], detail: null },
    ],
    steps: [], blockers: [], progress: { criteria_met: 3, criteria_total: 4, candidates: 0, steps_completed: 0, steps_total: 0 } };
  // O1/O2/G5, AdvancedSettings.vue extensions. CHECK-2.0: 1.9.2 moved Settings to a sidebar, and Skills & connectors
  // now lists the Toolbox (1.7.0) with Put back (1.9.11): SNAPSHOT for the Toolbox's own RPC and rows.
  const extensions = [
    { id: "skill-open-day", name: "Open day checklist", kind: "skill", enabled: true, capabilities: [], config: { bundle_digest: hex("skill") } },
    { id: "skill-glaze-notes", name: "Glaze notes", kind: "skill", enabled: false, capabilities: [], config: { bundle_digest: hex("skill2") } },
    { id: "plugin-bookings", name: "Bookings (example.com)", kind: "plugin", enabled: true, capabilities: ["tools"], config: { url: "https://mcp.example.com/bookings" } },
  ];
  // N3, CompanionWorkflows.vue job_list. The review text itself is SNAPSHOT (1.9.7 says it in words).
  const jobs = { jobs: [{ id: "job-1", name: "Post the open-day photos", task: "Put the resized photos on the website's gallery page.",
    schedule: { kind: "once", at: now + 3600 }, state: "active", revision: 1, next_fire: now + 3600, error: null, last_run_id: null, last_run_state: null }],
    notifications: [], service: { running: true, execution: "while Pebble is open" } };
  // E9, ScreenSessions.vue screen_sessions: an app window and a site, allowed in this conversation (1.9.12: up to 15
  // minutes). CHECK-2.0: 1.9.0 names a window by its window number; the target's fields may have grown.
  const screenSessions = [
    { session_id: "ss-calc", kind: "app", target: { kind: "app", app: "Calculator", bundle_id: "com.apple.calculator", window_title: "Calculator" },
      actions: ["focus", "scroll", "press", "enter"], state: "active", reasons: [], expires: now + 900, pending: false },
    { session_id: "ss-yt", kind: "browser", target: { kind: "browser", profile: "chrome", origins: ["https://www.youtube.com"] },
      actions: ["focus", "scroll", "press"], state: "active", reasons: [], expires: now + 900, pending: false },
  ];
  // K2, ResearchSources.vue research_sources. LEAD DECIDES (HARNESS_PLAN): sample sources on example.org, or a real take.
  const sources = { sources: [
    { source_id: "S1", kind: "web", url: "https://example.org/bisque-firing", title: "⟦a page about bisque firing⟧", domain: "example.org", retrieved_at: now - 300 },
    { source_id: "S2", kind: "web", url: "https://example.org/cone-chart", title: "⟦a cone temperature chart⟧", domain: "example.org", retrieved_at: now - 290 },
  ], conflicts: [], omitted_sources: 0 };

  // ---- the RPC handlers (v1.5.0's set, plus the panels above) ---------------------------------------------------------
  const runOf = (chatId, runId) => chats.get(chatId)?.runs.find((r) => r.id === runId);
  const artifactsOf = (chatId) => chats.get(chatId)?.artifacts || [];
  const handlers = {
    state,
    get_chat: ({ id }) => { const c = chats.get(id); if (!c) throw "Conversation not found."; return c; },
    new_chat: () => fresh,
    send: ({ id, text }) => {
      const c = chats.get(id); if (!c) throw "Conversation not found.";
      const message_id = "msg-live-" + (c.messages.length + 1);
      c.messages.push({ id: message_id, role: "user", content: text, created: Math.floor(Date.now() / 1000), attachments: [] });
      if (c.title === "New conversation") c.title = autoTitle(text);
      const run_id = "run-live-" + (c.runs.length + 1);
      c.runs = [{ id: run_id, state: "queued", error: null, created: Math.floor(Date.now() / 1000) }, ...c.runs];
      live.active = id; live.activeRun = run_id;
      return { message_id, run_id };
    },
    cancel: () => true,
    approve: ({ id, action_id }) => { const a = chats.get(id)?.actions.find((x) => x.id === action_id); if (a) a.status = "applied"; return true; },
    reject: ({ id, action_id }) => { const a = chats.get(id)?.actions.find((x) => x.id === action_id); if (a) a.status = "rejected"; return true; },
    undo: ({ id, action_id }) => { const a = chats.get(id)?.actions.find((x) => x.id === action_id); if (a) a.status = "undone"; return true; },
    run_held_tests: ({ id, run_id }) => { // controller.py held() at v1.5.0: CHECK-2.0
      const c = chats.get(id), run = runOf(id, run_id);
      if (!c || !run || run.state !== "verification_required") throw "This task is not waiting on verification.";
      c.actions = [...c.actions.filter((a) => a.id !== "act-tests-1"), testsAction("pending")];
      run.state = "waiting_approval"; run.error = null;
      return { run_id, status: "waiting_approval", action_id: "act-tests-1" };
    },
    run_held_finish: ({ run_id }) => ({ run_id, status: "queued" }),
    run_held_accept: ({ id, run_id }) => { const run = runOf(id, run_id); if (run) run.state = "completed"; return { run_id, status: "completed", verified: false, origin: "human" }; },
    run_activity: ({ run_id, after = 0 }) => {
      const a = activity[run_id];
      if (!a && live.activeRun === run_id) return { run_id, state: "running", items: [], next: 0, started: Math.floor(Date.now() / 1000) - 1, elapsed: null, reasoning: null };
      if (!a) return { run_id, state: "completed", items: [], next: 0, started: null, elapsed: null, reasoning: null };
      const items = a.items.filter((i) => i.seq >= (after || 0));
      return { run_id, state: a.state, started: a.started, elapsed: a.elapsed, items, next: Math.max(0, ...a.items.map((i) => i.seq)) + 1, reasoning: null };
    },
    context_inspect: ({ chat_id, run_id }) => ({ chat_id, run_id, used: 9000, total: 9000, window: { tokens: model.context } }),
    job_list: () => jobs,
    process_list: () => [],
    stream_read: ({ after = 0 }) => ({ events: [], next_after: after, more: false }),
    screen_sessions: () => screenSessions,
    goal_list: () => [{ id: goal.id, title: goal.title, state: goal.state, updated: ago(60), progress: goal.progress }],
    goal_get: () => goal,
    agent_list: () => agentTree,
    research_sources: () => sources,
    command_catalogue: () => [], // CHECK-2.0: the host's slash commands; ⌘K's action rows ("Turn Stealth Lockdown on") are the window's own
    extensions: () => extensions,
    memory_list: ({ kind }) => memories[kind] || [],
    memory_candidates: () => [],
    memory_contests: () => [],
    memory_forget_preview: ({ ids = [] }) => ({
      items: ids.map(findMemory).filter(Boolean).map((m) => ({ id: m.id, kind: m.kind, layer: Object.fromEntries(LAYERS)[m.kind], content: m.content,
        origin: m.origin, where: where(m.scope), updated: m.updated, authorization: "none" })), subject: null, authorization: "none" }),
    memory_delete: ({ id }) => { for (const k of Object.keys(memories)) memories[k] = memories[k].filter((m) => m.id !== id); return { deleted: true }; },
    plan_credentials: () => ({ names: [] }),
    project_recipes: () => ({ recipes: [{ id: "pytest", kind: "python", available: true }], inventory_truncated: false }),
    git_plan_receipts: () => ({ items: [] }),
    agent_worktrees: () => [],
    environment_list: () => ({ items: [] }),
    notification_status: () => ({ // 1.9.10 adds the reply/card banner switch in Settings › General: CHECK-2.0
      settings: { enabled: true, kinds: { completed: true, failed: true, action_needed: true, monitor_changed: true }, preview: "title", quiet_hours: null },
      quiet_now: false, outbox: { pending: 0, delivered: 0, suppressed: 0, failed: 0 }, deferred: 0, last_failure: null, jobs: [], actions: [] }),
    telemetry_get: () => ({ schema: "pebble.telemetry/1", enabled: false, events: 0, bytes: 0 }), // CHECK-2.0: the full v1.5.0 shape is in mock/fixtures.js
    artifact_get: ({ chat_id, id }) => artifactsOf(chat_id).find((a) => a.id === id) || (() => { throw "View not found."; })(),
    artifact_history: ({ chat_id, id }) => artifactsOf(chat_id).filter((a) => a.id === id),
    quiz_attempt: () => ({ attempt_id: "attempt-1", status: "open", deadline: now + 240, answers: { q1: 0, q2: null, q3: null } }),
    quiz_start: () => ({ attempt_id: "attempt-1", status: "open", deadline: now + 300, answers: { q1: null, q2: null, q3: null } }),
    quiz_save: () => ({ saved: true }),
    setting: ({ key, value }) => { if (key in settings) settings[key] = JSON.parse(JSON.stringify(value)); return true; },
    open_url: () => null,
    remove_source: () => true,
    connector_status: () => [],
    storage_summary: () => ({}),
  };

  const storage = {};
  if (surface === "main") {
    const open = { open: true, tab: "activity", width: 420 };
    const drawer = { held: open, "held-tests": open, done: open, photos: open, kiln: open, agents: { ...open, tab: "agents" } }[scene];
    const prefs = drawer ? { ...drawer } : { open: false, tab: "activity", width: 360 };
    if (drawerWidth) prefs.width = drawerWidth;
    storage["pebble.details.main"] = JSON.stringify(prefs); // v1.5.0 key: CHECK-2.0
  } else {
    storage["pebble-pet-chat"] = (scene === "pet-open-day" ? openDay : quick).id; // v1.5.0 key: CHECK-2.0
  }

  return {
    live: { reply: W, chats, activity, // record.mjs-style helpers for the 2.0 timelines are added at G4 from the event log
      text: { request: W.MESSAGES.bookings, heldNotice, heldIssue, testsSummary: S("testsSummary", { code: 0 }), applied: S("editSummary", { path: W.BOOKINGS.changed[0] }) } },
    scene, theme, surface, storage, chats, state,
    has: (method) => Object.prototype.hasOwnProperty.call(handlers, method),
    async rpc(method, params) { const h = handlers[method]; return h ? h(params || {}) : null; },
  };
}

export const RPC_METHODS_V150 = [ // what the v1.5.0 harness answered (mock/fixtures.js); check.mjs makes sure each is answered here
  "state", "get_chat", "new_chat", "send", "cancel", "approve", "reject", "undo", "run_held_tests", "run_held_finish", "run_held_accept",
  "run_activity", "context_inspect", "job_list", "process_list", "stream_read", "screen_sessions", "goal_list", "agent_list",
  "research_sources", "command_catalogue", "extensions", "memory_list", "memory_candidates", "memory_contests", "memory_forget_preview",
  "memory_delete", "plan_credentials", "project_recipes", "git_plan_receipts", "agent_worktrees", "environment_list", "notification_status",
  "telemetry_get", "artifact_get", "artifact_history", "quiz_attempt", "quiz_start", "quiz_save", "setting", "open_url", "remove_source",
  "connector_status", "storage_summary",
];

export { STRINGS };
