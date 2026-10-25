// Demo fixtures for Pebble 1.2.0's real UI (re-checked against the published source, tag v1.2.0 at commit a4af2e5, on
// 2026-10-24). 1.2.0 changes one payload on the captured surfaces: an edit to a test file that the request didn't ask
// to change carries the host's reason (TEST_SCOPE_REVIEW below), and the edit card shows it before its lead. It adds
// no RPC, no state() field and no event. 1.1.0 added one setting and one shell command: Stealth Lockdown, kept by the
// host as settings.stealth (app.py state() default False; setting() accepts the boolean and emits "settings", after
// which every window re-reads state()), and the shell's `stealth_set` (entry.js). The host templates cited below are
// unchanged since 1.0.1, and the window's own strings, such as the Privacy and focus card, come from the components.
// Everything here is fictional demo content (no real person's data): Maya
// (maya@example.com, /Users/maya), her invoice-kit project, a Lisbon trip budget and a Python datetime quiz.
//
// What may appear on screen, and where it comes from:
//   - Host strings (timeline rows, verdicts, notices, the forget reply, AgentGuard's challenge) are built here with the
//     same templates as the Pebble service: backend/pebble/run_activity.py (row labels, verdict(), STATE_NOTES,
//     WITHHELD), app.py tool_label(), controller.py gate_sentences(), runner.py (forget reply, held notice), memory.py
//     KINDS, the vendored AgentGuard engine (validate/checks.py scope_creep(), challenge/renderer.py render()) and
//     guard.py refusal(). Window chrome strings come from the real components themselves.
//   - Model replies, user messages, file names, diffs, memories, dashboard and quiz data are fictional content.
//   - Numbers (durations, token counts, "42 passed") are illustrative, never measurements.
//   - Model labels are provider-neutral: only the local GGUF file the project tests with (docs/MODEL_SELECTION.md,
//     config/model.json) is connected, so no cloud model name dates the captures (critic H14).
//
// 1.5.0 (the trailer's captures, 25 Oct 2026): the host templates used below were compared with tag v1.5.0 (commit
// 16dd425). run_activity.py, controller.py, edit_scope.py and testing.py are unchanged since v1.2.0; runtime.py,
// runner.py and app.py changed only in context sealing, prompt caching and Code Mode (offered above an 8K window, so
// never to the 4,096-token sample model); the vendored AgentGuard challenge (validate/checks.py, challenge/renderer.py,
// guard.py refusal()) is unchanged since v1.0.4. record.mjs main-live-film-150 and main-challenge-live run on the host's
// own clock (clock(), origin(), publish()) and play the approved tests out before the approval answers
// (deferApproval(), finishApproval()); every other scene is as before.
//
// buildWorld({scene, theme, surface, drawer, stealth, version}) returns { storage, has(method), rpc(method, params), live, ... }.
// `stealth` starts the world with Stealth Lockdown already on (the host keeps it across a restart); `version` is the
// backend's VERSION in state() (default 1.2.0).

const ID = {
  coding: "chat-invoice-fix", trip: "chat-lisbon-trip", quiz: "chat-datetime-quiz", pet: "chat-pet-dates",
  fresh: "chat-new", forget: "chat-forget-trip", challenge: "chat-pdf-dates", command: "chat-export-january",
};
const WORKSPACE = "/Users/maya/Projects/invoice-kit";
// The project's pinned local model: config/model.json "filename"; a GGUF profile is named after the file's stem
// (backend/pebble/providers.py add_gguf, model.py status).
const LOCAL_MODEL = { file: "/Users/maya/Models/FrogNano-4B-2609-Q4_K_M.gguf", name: "FrogNano-4B-2609-Q4_K_M" };

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

const REQUEST = "The CSV export crashes for invoices issued on the 31st: ValueError: day is out of range for month. Can you find the bug and fix it?";
// 1.2.0 (Phase 34 W1): backend/pebble/edit_scope.py REASON, verbatim. app.py _execute() adds it to an edit of a test
// file when the current request doesn't ask for test changes (review_reason(); its intent test is narrow, and "find
// the bug and fix it" isn't intent), in every mode but Full access, and sets requires_review. App.vue actionLead() puts
// it before the card's lead, and runtime.py commit_action() keeps the payload once the edit is applied. REQUEST asks
// for a fix, so tests/test_dates.py carries it in every scene of this conversation (checked with review_reason itself).
const TEST_SCOPE_REVIEW = "Pebble wants to change a test file, and your request didn't ask for test changes. Tests are your evidence that the code works, so this change waits for you.";
const TEST_SCOPE = { requires_review: true, scope_review: TEST_SCOPE_REVIEW };
// store.py message(): a new conversation is titled with the first 54 characters of its first message.
const autoTitle = (text) => text.slice(0, 54).replace(/\n/g, " ");

const REPLY_PROPOSED = `Found it. \`add_months()\` in \`invoice_kit/dates.py\` keeps the original day when it moves a date forward, so an invoice issued on **31 January** asks Python for **31 February** and the export stops with \`ValueError: day is out of range for month\`.

I've drafted a two-line fix that clamps the day to the last day of the target month, plus a regression test for 31 Jan → 28 Feb (and 29 Feb in a leap year).

Nothing changes until you approve both edits. After that I'll run the test suite in an isolated copy of the project.`;

// The film's live run (record.mjs main-live-film) holds at the completion gate, so its proposal promises no test run.
const REPLY_PROPOSED_HELD = REPLY_PROPOSED.replace(" After that I'll run the test suite in an isolated copy of the project.", "");
// A resumed run continues the same reply (runner.py: resume keeps message_id and answer); each continuation is
// model-written and starts on a new paragraph.
const CONTINUE_HELD = "\n" + `Both edits are in:

- **\`invoice_kit/dates.py\`**: \`add_months()\` now clamps to the last day of the month, so 31 Jan + 1 month is 28 Feb.
- **\`tests/test_dates.py\`**: a new regression test covers month ends and leap years.

The CSV export should work again for invoices issued on the 29th, 30th and 31st.`;
const CONTINUE_VERIFIED = "\n\nThe tests ran in an isolated copy of your project: **42 passed**. Both edits are verified, and the CSV export works again for invoices issued on the 29th, 30th and 31st.";

const REPLY_DONE = `Done, and verified:

- **\`invoice_kit/dates.py\`**: \`add_months()\` now clamps to the last day of the month, so 31 Jan + 1 month is 28 Feb.
- **\`tests/test_dates.py\`**: a new regression test covers month ends and leap years.
- **42 tests passed** in an isolated copy of your project.

The CSV export works again for invoices issued on the 29th, 30th and 31st. Either edit can be undone from Details › Activity.`;

// The held path (AgentGuard's completion gate): the model finished without running the covering tests. The reply is the
// model's last attempt; the quoted line is the host's (runner.py: '> Verification remains incomplete: ' +
// person_notice(gate); controller.py gate_sentences() 'no_test_run' notice; _names() keeps file names only).
const REPLY_HELD_MODEL = `Both edits are in:

- **\`invoice_kit/dates.py\`**: \`add_months()\` now clamps to the last day of the month, so 31 Jan + 1 month is 28 Feb.
- **\`tests/test_dates.py\`**: a new regression test covers month ends and leap years.

The CSV export should work again for invoices issued on the 29th, 30th and 31st.`;
const HELD_CHANGED = ["invoice_kit/dates.py", "tests/test_dates.py"];
const HELD_COVERING = ["tests/test_dates.py"];
const baseName = (p) => p.split("/").pop();
const HELD_NOTICE = `Pebble changed ${HELD_CHANGED.slice(0, 2).map(baseName).join(", ")} but did not run the tests that cover ${HELD_CHANGED.length === 1 ? "it." : "them."}`;
const REPLY_HELD = REPLY_HELD_MODEL + "\n\n> Verification remains incomplete: " + HELD_NOTICE;
// The run's error is the gate's model-facing issue (runner.py: failure = '\n'.join(gate['issues'])); RunPanel shows it
// after the held sentence in the conversation.
const HELD_ISSUE = `${HELD_CHANGED.length} file(s) changed and no tests were run, but ${HELD_COVERING.length} test file(s) cover this code: ${JSON.stringify(HELD_COVERING)}. Run them (RunTests) before finishing and report what they said.`;

const TRIP_REPLY = `Here's your **Lisbon trip budget** as a live dashboard. You're on track: €486 spent of €1,240, with the biggest costs (flights and the apartment) already paid.

Open it from the canvas to see spending by category and what's still to book.`;

const QUIZ_REPLY = `Here's a 5-question check on Python's \`datetime\` module. You have 10 minutes; your answers save as you go, and I'll explain each one when you submit.`;

// The companion's demo question (D22: model-answered, and it leads into the coding story).
const PET_QUESTION = "What does 'day is out of range for month' mean?";
const PET_REPLY = `Python is being asked for a date that doesn't exist, like **31 February**. If it's from your invoice export, open invoice-kit and I'll look.`;

// The forget request (runner.py V1-034): no model call; the reply is the host's own sentence, and the main window's
// Forget card lists the matching records (memory_forget event, memory_forget_preview).
const FORGET_REQUEST = "Forget my Lisbon trip plans.";
const FORGET_SUBJECT = "my Lisbon trip plans"; // memory.py forget_request(): FORGET match, FORGET_TAIL strips the "."
const forgetReply = (count, subject) =>
  `I found ${count} saved memor${count === 1 ? "y" : "ies"}${subject ? " that match “" + subject + "”" : " from this conversation"}. Choose **Forget** on the ones you want gone, here or in Settings → Memory. Nothing is forgotten until you do.`;

// AgentGuard's scope challenge, as the failed step's detail in Details › Activity (release session 23:38; vendored
// engine validate/checks.py scope_creep(): raised at DEFAULT_UNRELATED_LIMIT = 5 unrelated files;
// challenge/renderer.py render(); guard.py refusal() prefixes "AgentGuard: ").
const CHALLENGE_REQUEST = "Use the month-end rule for due dates in PDF invoices. The CSV export already clamps them.";
const CHALLENGE_GOAL = CHALLENGE_REQUEST.split(/(?<=[.!?])\s+|\n/, 1)[0].slice(0, 200); // intent/extractor.py _goal()
const CHALLENGE_SCOPE = ["invoice_kit/dates.py", "invoice_kit/pdf.py", "tests/test_pdf.py"];
const CHALLENGE_OUTSIDE = ["README.md", "docs/billing.md", "invoice_kit/static/invoice.css", "invoice_kit/templates/invoice.html", "invoice_kit/templates/receipt.html"];
const pySorted = (list) => [...list].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)); // Python's sorted(): code points
function challengeText(goal, scope, outside) {
  const s = pySorted(scope), o = pySorted(outside);
  const summary = `${o.length} file(s) changed that the task does not reach`;
  const detail = `The request was: "${goal}". Its evidence points at ${s.slice(0, 3).join(", ")}${s.length > 3 ? "…" : ""}. ` +
    `These changes are outside that and outside anything connected to it: ${o.slice(0, 6).join(", ")}${o.length > 6 ? "…" : ""}.`;
  const lines = ["AgentGuard — evidence check", "", summary, `   ${detail}`];
  for (const path of o.slice(0, 3)) lines.push(`   Evidence: ${path}`);
  lines.push("   Either explain what connects these to the task, or split them into a separate change.", "");
  lines.push("Confirm this against the repository before relying on it, or state the evidence that supports it.");
  return "AgentGuard: " + lines.join("\n").trim();
}
export const CHALLENGE = challengeText(CHALLENGE_GOAL, CHALLENGE_SCOPE, CHALLENGE_OUTSIDE);

// P1: a terminal command in Ask for approval (terminal.py inspect_command(): risk "execution" for a non-read-only
// program; app.py: writable when edits are on; command_plans.py from_command(): a one-step typed plan with defaults).
const EXPORT_REQUEST = "Export January's invoices to CSV so I can check them.";
const EXPORT_COMMAND = "python -m invoice_kit.cli export --month 2026-01 --out exports/2026-01.csv";
const EXPORT_REPLY = `I'll run the project's own exporter for January. It writes \`exports/2026-01.csv\` inside invoice-kit, so it waits for your approval.`;
function commandPayload() {
  const argv = EXPORT_COMMAND.split(" ");
  const plan = { plan_version: 1, root: WORKSPACE, pipeline: "none", process_model: "tree", interactive: false,
    steps: [{ argv, cwd: ".", env: {}, stdin: "none",
      executable: { realpath: "/Users/maya/Projects/invoice-kit/.venv/bin/python3.12", sha256: "4be1f0e7c2a95d3378e0b2f6c1d9a8e74b3c5d6e7f8091a2b3c4d5e6f7081920" } }],
    writable: ["."], network: { mode: "none", destinations: [], credentials: [] },
    resources: { timeout: 60, cpu_seconds: 60, memory_mb: 2048, nproc: 64, output_bytes: 192000 },
    plan_hash: "7d1e04c9a2b35f6e8d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2e" };
  return { root: WORKSPACE, command: EXPORT_COMMAND, argv, network: false, risk: "execution", requires_review: true,
    writable: true, planned: true, plan };
}
// P1: a reviewed Git commit (git_plans.py _plan_commit() summary and effects; payload fields from plan()).
const COMMIT_REQUEST = "Commit both files.";
const COMMIT_MESSAGE = "Clamp add_months() to the last day of the month\n\nFixes the CSV export crash for invoices issued on the 29th, 30th and 31st.";
const COMMIT_REPLY = `I've prepared a commit of the two changed files on \`main\`. It runs only after you approve the Git plan in Details › Activity.`;
function gitPayload() {
  const parent = "8c41f0b2d9e7a6b5c4d3e2f1a0b9c8d7e6f5a4b3", identity = { name: "Maya", email: "maya@example.com", source: "repository" };
  const paths = [
    { path: "invoice_kit/dates.py", kind: "add", mode: "100644", blob_oid: "3f9a1c2b7d40e5f6a7b8c9d0e1f2a3b4c5d6e7f8" },
    { path: "tests/test_dates.py", kind: "add", mode: "100644", blob_oid: "b17c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c" },
  ];
  return { plan_version: 1, plan_id: "f3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8", operation: "commit", root: WORKSPACE,
    bindings: { head_ref: "refs/heads/main", head_commit: parent, paths, target_ref: "refs/heads/main", parent, new_branch: false, identity },
    summary: `Commit ${paths.length} selected path(s) to branch main as ${identity.name} <${identity.email}>: "${COMMIT_MESSAGE.split("\n", 1)[0]}". Other staged and unstaged work stays exactly as it is.`,
    effects: ["Write blob objects from the reviewed file bytes", `Create one commit on parent ${parent.slice(0, 12)} containing only the selected paths`,
      `Move refs/heads/main from ${parent.slice(0, 12)} to the new commit (compare-and-swap)`, "Update the committed paths in the index only where they still hold the reviewed entry"],
    destructive: false, publication: false, requires_review: false, hooks_run: false, network: false, sensitive_findings: [],
    origin: "pebble_git_plan", authorization: "none", paths: paths.map((p) => p.path), message: COMMIT_MESSAGE, branch: null,
    plan_hash: "2e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d" };
}

function profileList() {
  // providers.py profiles(): a GGUF profile gets connection_id "local" and provider_name "On this device".
  return [{ id: "p-local-frognano", name: LOCAL_MODEL.name, kind: "gguf", path: LOCAL_MODEL.file, context: 4096, tools: true,
    connection_id: "local", provider_name: "On this device", efforts: ["default", "quick", "think"], default_effort: "quick",
    effort: "think", effort_parameter: "local_thinking" }];
}

function modelStatus() {
  // model.py status() + capabilities.py: FrogNano GGUF offers quick/think with quick as the default; Maya chose think.
  return { state: "ready", configured: true, name: LOCAL_MODEL.name, path: LOCAL_MODEL.file, context: 4096, kind: "gguf",
    profile_id: "p-local-frognano", efforts: ["default", "quick", "think"], default_effort: "quick", effort: "think",
    effort_parameter: "local_thinking" };
}

// Usage telemetry as a fresh install reports it, off: backend/pebble/telemetry.py _status() with no state, its
// CONSENT_TEXT, FIELDS (sorted names) and _limits() copied as they are. Settings › Usage telemetry shows the notice, the
// limits ("1000 events or 256 KB, for 30 days") and the fields from it; the 1.1.0 Privacy and focus stills show its end.
const TELEMETRY_OFF = {
  schema: "pebble.telemetry/1", enabled: false, consent_version: null, consented_at: null,
  current_consent_version: "pebble.telemetry.consent/1",
  consent_text: "Pebble can keep a private usage log on this Mac to help measure its reliability. It records only counts and rounded values: how each task ended, how many steps it took, which built-in tools it used and how often, approvals and questions, and rounded durations, token counts and memory or CPU use. It never records your messages, the model's replies, files, memory notes, web addresses, account details or credentials. Nothing is sent anywhere: you can save the log to a file you choose and share it yourself. At most 1,000 events or 256 KB are kept, for 30 days. Turning this off deletes the log.",
  consent_sha256: "ca91c602ce91528b85b88fd60ec46694883904f3110242a383216a68fa4d9d24",
  install_id: null, events: 0, bytes: 0, kinds: { run_settled: 0, resource_sample: 0, error: 0 }, dropped: 0, expired: 0, refused: 0,
  fields: {
    run_settled: ["approvals", "input_tokens_log2", "model_ms_log2", "output_tokens_log2", "questions", "rejections", "state", "steps", "tools", "uncertain", "wall_ms_log2"],
    resource_sample: ["cpu_percent_bucket", "footprint_mb_log2"],
    error: ["code"],
  },
  limits: { max_events: 1000, max_bytes: 262144, retention_days: 30 }, destination: null, network_upload: false, export: "native_save_dialog",
};

const STATIC_COUNTS = { working: 2, episodic: 14 };
const LAYERS = [["working", "Working context"], ["episodic", "Past experiences"], ["semantic", "Facts & knowledge"],
  ["procedural", "Procedures"], ["temporal", "Time-sensitive information"], ["profile", "Your preferences"]]; // memory.py KINDS

export function buildWorld({ scene, theme, surface, drawer: drawerWidth = null, stealth = false, version = null }) {
  const now = Math.floor(Date.now() / 1000);
  const ago = (s) => now - s;
  const model = modelStatus();
  const usage = (input, output, cached, tps, seconds, calls = 1) =>
    ({ input_tokens: input, output_tokens: output, cached_tokens: cached, tokens_per_second: tps, route: "model", calls, seconds });

  // ---- conversations -------------------------------------------------------------------------------------------
  const codingProposed = {
    id: ID.coding, title: "Fix month-end due dates", workspace: WORKSPACE, trashed: false,
    messages: [
      { id: "msg-c1", role: "user", created: ago(420), attachments: [], content: REQUEST },
      { id: "msg-c2", role: "assistant", created: ago(372), run_id: "run-fix-1", attachments: [], content: REPLY_PROPOSED,
        usage: usage(3480, 412, 2048, 21.6, 46.2, 4) },
    ],
    actions: [
      { id: "act-edit-dates", chat_id: ID.coding, kind: "edit", status: "pending", payload: { path: "invoice_kit/dates.py", baseline: "9f2c41d07ab3", diff: DIFF_DATES } },
      { id: "act-edit-tests", chat_id: ID.coding, kind: "edit", status: "pending", payload: { path: "tests/test_dates.py", baseline: "51ab9e2c3d70", diff: DIFF_TESTS, ...TEST_SCOPE } },
    ],
    runs: [{ id: "run-fix-1", state: "waiting_approval", steps: 6, elapsed: 46, error: null, created: ago(418), updated: ago(372), counts: { steps: 6, retries: 0, waited: 0 } }],
    questions: [], plan: null, artifacts: [],
  };
  const testsAction = (status, chatId = ID.coding) => ({
    id: "act-tests-1", chat_id: chatId, kind: "tests", status,
    payload: { recipe: "pytest",
      plan: { recipe: "pytest", kind: "python", cwd: "snapshot", timeout: 120, output_limit: 1048576, network: false, argv: ["python", "-m", "pytest", "-q"],
        executable: { realpath: "/Users/maya/Projects/invoice-kit/.venv/bin/python3.12", sha256: "4be1f0e7c2a95d3378e0b2f6c1d9a8e74b3c5d6e7f8091a2b3c4d5e6f7081920" } },
      ...(status === "applied" ? { result: { outcome: "passed", exit_code: 0, tests: { passed: 42, failed: 0, skipped: 0, errors: 0, total: 42 },
        snapshot_digest: "c0ffee5a1b2c3d4e5f60718293a4b5c6d7e8f9012a3b4c5d6e7f8091a2b3c4d5", drafts_included: [],
        output: "..........................................  [100%]\n42 passed in 1.84s" } } : {}) },
  });
  const appliedEdits = codingProposed.actions.map((a) => ({ ...a, status: "applied" }));
  const goAhead = { id: "msg-c3", role: "user", created: ago(140), attachments: [], content: "Both look right. Go ahead." };
  const codingDone = {
    ...codingProposed,
    messages: [
      ...codingProposed.messages, goAhead,
      { id: "msg-c4", role: "assistant", created: ago(64), run_id: "run-fix-2", attachments: [], content: REPLY_DONE,
        usage: usage(4210, 236, 3072, 23.4, 31.5, 3) },
    ],
    actions: [...appliedEdits, testsAction("applied")],
    runs: [
      { id: "run-fix-2", state: "completed", steps: 5, elapsed: 72, error: null, created: ago(138), updated: ago(64), counts: { steps: 5, retries: 0, waited: 6 } },
      { id: "run-fix-1", state: "completed", steps: 6, elapsed: 46, error: null, created: ago(418), updated: ago(372), counts: { steps: 6, retries: 0, waited: 0 } },
    ],
  };
  // The same task held by AgentGuard's completion gate: edits applied, no test evidence, so the run waits for a decision
  // (RunPanel: Run the tests / Ask Pebble to finish / Accept as unverified).
  const codingHeld = {
    ...codingProposed,
    messages: [
      ...codingProposed.messages, goAhead,
      { id: "msg-c4", role: "assistant", created: ago(96), run_id: "run-fix-2", attachments: [], content: REPLY_HELD,
        usage: usage(4630, 188, 3072, 22.8, 18.7, 3) },
    ],
    actions: appliedEdits,
    runs: [
      { id: "run-fix-2", state: "verification_required", steps: 3, elapsed: 41, error: HELD_ISSUE, created: ago(138), updated: ago(96), counts: { steps: 3, retries: 0, waited: 6 } },
      { id: "run-fix-1", state: "completed", steps: 6, elapsed: 46, error: null, created: ago(418), updated: ago(372), counts: { steps: 6, retries: 0, waited: 0 } },
    ],
  };
  const trip = {
    id: ID.trip, title: "Lisbon trip budget", workspace: null,
    messages: [
      { id: "msg-t1", role: "user", created: ago(3600), attachments: [], content: "Turn my Lisbon trip spending into a dashboard: what I've spent, by category, and what's left to book." },
      { id: "msg-t2", role: "assistant", created: ago(3560), run_id: "run-trip-1", attachments: [], content: TRIP_REPLY },
    ],
    actions: [], questions: [], plan: null,
    runs: [{ id: "run-trip-1", state: "completed", steps: 2, elapsed: 18, error: null, created: ago(3590), updated: ago(3560), counts: { steps: 1, retries: 0, waited: 0 } }],
    artifacts: [tripDashboard(ID.trip, ago(3560))],
  };
  const quiz = {
    id: ID.quiz, title: "Python datetime check-in", workspace: null,
    messages: [
      { id: "msg-q1", role: "user", created: ago(900), attachments: [], content: "Quiz me on Python's datetime module, 5 questions." },
      { id: "msg-q2", role: "assistant", created: ago(880), run_id: "run-quiz-1", attachments: [], content: QUIZ_REPLY },
    ],
    actions: [], questions: [], plan: null,
    runs: [{ id: "run-quiz-1", state: "completed", steps: 1, elapsed: 9, error: null, created: ago(890), updated: ago(880), counts: { steps: 1, retries: 0, waited: 0 } }],
    artifacts: [datetimeQuiz(ID.quiz, ago(880))],
  };
  const pet = {
    id: ID.pet, title: autoTitle(PET_QUESTION), workspace: null,
    messages: [
      { id: "msg-p1", role: "user", created: ago(95), attachments: [], content: PET_QUESTION },
      { id: "msg-p2", role: "assistant", created: ago(88), run_id: "run-pet-1", attachments: [], content: PET_REPLY,
        usage: usage(1180, 52, 0, 24.5, 2.2) },
    ],
    actions: [], questions: [], plan: null, artifacts: [],
    runs: [{ id: "run-pet-1", state: "completed", steps: 0, elapsed: 4, error: null, created: ago(94), updated: ago(88), counts: { steps: 0, retries: 0, waited: 0 } }],
  };
  const forget = {
    id: ID.forget, title: autoTitle(FORGET_REQUEST), workspace: null,
    messages: [
      { id: "msg-f1", role: "user", created: ago(12), attachments: [], content: FORGET_REQUEST },
      { id: "msg-f2", role: "assistant", created: ago(11), run_id: "run-forget-1", attachments: [], content: forgetReply(2, FORGET_SUBJECT) },
    ],
    actions: [], questions: [], plan: null, artifacts: [],
    runs: [{ id: "run-forget-1", state: "completed", steps: 0, elapsed: 0.4, error: null, created: ago(12), updated: ago(11), counts: { steps: 0, retries: 0, waited: 0 } }],
  };
  const challenge = {
    id: ID.challenge, title: "New conversation", workspace: WORKSPACE, trashed: false,
    messages: [], actions: [], questions: [], plan: null, artifacts: [],
    runs: [],
  };
  const exportChat = {
    id: ID.command, title: autoTitle(EXPORT_REQUEST), workspace: WORKSPACE, trashed: false,
    messages: [
      { id: "msg-e1", role: "user", created: ago(40), attachments: [], content: EXPORT_REQUEST },
      { id: "msg-e2", role: "assistant", created: ago(31), run_id: "run-export-1", attachments: [], content: EXPORT_REPLY, usage: usage(2310, 64, 1024, 23.1, 2.9, 2) },
    ],
    actions: [{ id: "act-export-jan", chat_id: ID.command, kind: "command", status: "pending", payload: commandPayload() }],
    runs: [{ id: "run-export-1", state: "waiting_approval", steps: 2, elapsed: 9, error: null, created: ago(39), updated: ago(31), counts: { steps: 2, retries: 0, waited: 0 } }],
    questions: [], plan: null, artifacts: [],
  };
  const codingGit = {
    ...codingDone,
    messages: [...codingDone.messages,
      { id: "msg-c5", role: "user", created: ago(30), attachments: [], content: COMMIT_REQUEST },
      { id: "msg-c6", role: "assistant", created: ago(22), run_id: "run-fix-3", attachments: [], content: COMMIT_REPLY, usage: usage(4980, 58, 4096, 24.2, 2.4, 2) }],
    actions: [...codingDone.actions, { id: "act-git-commit", chat_id: ID.coding, kind: "git", status: "pending", payload: gitPayload() }],
    runs: [{ id: "run-fix-3", state: "waiting_approval", steps: 2, elapsed: 8, error: null, created: ago(29), updated: ago(22), counts: { steps: 2, retries: 0, waited: 0 } }, ...codingDone.runs],
  };
  const fresh = { id: ID.fresh, title: "New conversation", workspace: null, messages: [], actions: [], runs: [], questions: [], plan: null, artifacts: [] };
  // Live sequences start empty; capture.mjs / record.mjs send a message and then play the backend events.
  const liveMain = { id: "chat-live-fix", title: "New conversation", workspace: WORKSPACE, messages: [], actions: [], runs: [], questions: [], plan: null, artifacts: [] };
  const livePet = { id: "chat-live-pet", title: "New conversation", workspace: null, messages: [], actions: [], runs: [], questions: [], plan: null, artifacts: [] };

  const chats = new Map();
  const put = (c) => chats.set(c.id, c);
  const coding = /^approval/.test(scene) || scene === "pet-review" ? codingProposed : /^held/.test(scene) ? codingHeld : scene === "git" ? codingGit : codingDone;
  [coding, trip, quiz, pet, fresh, liveMain, livePet, forget, challenge, exportChat].forEach(put);
  const sidebarExtra = [
    { id: "chat-rust-lifetimes", title: "Explain Rust lifetimes simply", workspace: null },
    { id: "chat-launch-email", title: "Draft the beta launch email", workspace: null },
    { id: "chat-reading-plan", title: "Weekly reading plan", workspace: null },
  ];

  // Which conversation the window opens first (App.vue opens state.chats[0]; the pet reads its saved id).
  const first = {
    welcome: fresh, approval: coding, done: coding, held: coding, "settings-permissions": coding, "settings-memory": coding,
    dashboard: trip, quiz: quiz, live: liveMain, "live-film": liveMain, "pet-live": livePet, forget, challenge,
    command: exportChat, git: coding,
  }[scene] || (surface === "pet" ? pet : coding);
  const recent = [coding, pet, trip, quiz].filter((c) => c !== first);
  const order = [first, ...(["forget", "challenge", "command"].includes(scene) ? recent.slice(0, 3) : recent)];
  const listed = () => [...order.map(({ id, title, workspace }) => ({ id, title, workspace })), ...sidebarExtra];

  // ---- run activity (Details › Steps and the receipt's expanded timeline) ----------------------------------------
  // Labels: run_activity.py (context_ready -> "Recalled N memories" with "Context ready in N ms"; model attempts ->
  // "The model responded"; approvals "Approved: " + tool label; completion checks -> verdict()), app.py tool_label().
  const recalled = (seq, at, count, ms) => item(seq, at, "context", count ? `Recalled ${count} memor${count === 1 ? "y" : "ies"}` : "Context ready", { detail: `Context ready in ${ms} ms`, duration: ms / 1000 });
  const responded = (seq, at, seconds, headers, first) => item(seq, at, "model", "The model responded", { detail: `Headers after ${headers.toFixed(1)} s; first text after ${first.toFixed(1)} s.`, duration: seconds });
  const activity = {
    "run-fix-1": { state: "completed", started: ago(418), elapsed: 46, items: [
      recalled(0, 0.2, 3, 180),
      responded(32, 0.4, 1.6, 0.3, 0.9),
      item(64, 2.1, "tool", "Searching project source", { activity: "searching", duration: 0.6 }),
      item(128, 3.0, "tool", "Reading invoice_kit/export.py", { activity: "reading", duration: 0.2 }),
      item(192, 3.4, "tool", "Reading invoice_kit/dates.py", { activity: "reading", duration: 0.2 }),
      item(256, 3.8, "tool", "Reading tests/test_dates.py", { activity: "reading", duration: 0.2 }),
      item(320, 12.6, "tool", "Preparing an edit to invoice_kit/dates.py", { activity: "editing", duration: 0.3, detail: "Staged for your approval." }),
      item(384, 19.9, "tool", "Preparing an edit to tests/test_dates.py", { activity: "editing", duration: 0.3, detail: "Staged for your approval." }),
      item(448, 20.4, "note", "Waiting for your approval"),
    ] },
    "run-fix-2": scene.startsWith("held") ? heldActivity() : { state: "completed", started: ago(138), elapsed: 72, items: [
      item(0, 0.3, "approval", "Approved: Preparing an edit to invoice_kit/dates.py", { duration: 6 }),
      item(64, 0.4, "approval", "Approved: Preparing an edit to tests/test_dates.py", { duration: 0 }),
      item(128, 6.8, "tool", "Finding project test and build recipes", { activity: "reading", duration: 0.4 }),
      item(192, 7.9, "tool", "Requesting isolated tests", { activity: "testing", duration: 11.2 }),
      item(256, 19.6, "tool", "Reading invoice_kit/export.py", { activity: "reading", duration: 0.2 }),
      item(320, 20.1, "tool", "Searching project source", { activity: "searching", duration: 0.5 }),
      item(384, 27.5, "check", "Verified · pytest 42 passed on current files", { duration: 2.4 }),
      responded(448, 31.0, 4.1, 0.3, 0.8),
    ] },
    // A view is made by the UIRender tool, which app.py tool_label() leaves under its own name.
    "run-trip-1": { state: "completed", started: ago(3590), elapsed: 18, items: [item(0, 1.2, "tool", "UIRender", { activity: "viewing", duration: 3.4 })] },
    "run-quiz-1": { state: "completed", started: ago(890), elapsed: 9, items: [item(0, 1.0, "tool", "UIRender", { activity: "viewing", duration: 2.2 })] },
    "run-pet-1": { state: "completed", started: ago(94), elapsed: 4, items: [recalled(0, 0.1, 0, 120), responded(32, 0.3, 2.2, 0.2, 0.6)] },
    "run-forget-1": { state: "completed", started: ago(12), elapsed: 0.4, items: [] },
    "run-export-1": { state: "waiting_approval", started: ago(39), elapsed: 9, items: [
      recalled(0, 0.2, 2, 160), responded(32, 0.4, 1.2, 0.3, 0.7),
      item(64, 3.1, "tool", "Reviewing terminal command", { activity: "running", duration: 0.1, detail: "Staged for your approval." }),
      item(128, 3.3, "note", "Waiting for your approval"),
    ] },
    "run-fix-3": { state: "waiting_approval", started: ago(29), elapsed: 8, items: [
      recalled(0, 0.2, 3, 170), responded(32, 0.4, 1.1, 0.3, 0.7),
      item(64, 2.9, "tool", "Preparing a reviewed Git plan", { activity: "editing", duration: 0.8, detail: "Staged for your approval." }),
      item(128, 3.8, "note", "Waiting for your approval"),
    ] },
  };
  function heldActivity() {
    // Two repair turns (runner.py: gate_repairs < 2), then the hold. completion_checked rows carry verdict(gate);
    // withdrawn drafts are notes (WITHHELD); the final state adds STATE_NOTES["verification_required"].
    const verdictRow = (seq, at, last) => item(seq, at, "check", "Not verified · 2 changed files, no tests run", { duration: 0.6, detail: last ? "1 item unresolved" : "1 item to resolve" });
    const withdrawn = (seq, at) => item(seq, at, "note", "Draft withdrawn: a check asked for a fix; the reply follows it");
    return { state: "verification_required", started: ago(138), elapsed: 41, items: [
      item(0, 0.3, "approval", "Approved: Preparing an edit to invoice_kit/dates.py", { duration: 6 }),
      item(64, 0.4, "approval", "Approved: Preparing an edit to tests/test_dates.py", { duration: 0 }),
      responded(128, 6.6, 3.2, 0.3, 0.9),
      verdictRow(192, 9.9, false), withdrawn(256, 10.5),
      responded(320, 10.7, 4.0, 0.3, 0.8),
      verdictRow(384, 14.8, false), withdrawn(448, 15.4),
      responded(512, 15.6, 3.6, 0.3, 0.8),
      verdictRow(576, 19.4, true),
      item(640, 20.0, "note", "Verification remains incomplete"),
    ] };
  }

  // ---- memory (Settings › Memory and the Forget card) -----------------------------------------------------------
  const memories = {
    profile: [
      { id: "pebble-md", kind: "profile", scope: "global", origin: "curated", updated: ago(86400 * 1),
        content: "Call me Maya. I maintain invoice-kit, a small open-source Python billing library." },
      { id: "mem-pref-1", kind: "profile", scope: "global", origin: "direct-user", updated: ago(86400 * 2),
        content: "Prefers short answers: code first, then a one-paragraph explanation." },
      { id: "mem-pref-3", kind: "profile", scope: "global", origin: "direct-user", updated: ago(86400 * 3),
        content: "Uses metric units and 24-hour times." },
      { id: "mem-pref-4", kind: "profile", scope: "project:" + WORKSPACE, origin: "auto-learned", learning_status: "active", updated: ago(86400 * 4),
        provenance: JSON.stringify({ evidence_class: "human_preference" }), content: "In invoice-kit, keep public function names stable." },
      { id: "mem-pref-2", kind: "profile", scope: "global", origin: "auto-learned", learning_status: "active", updated: ago(86400 * 5),
        provenance: JSON.stringify({ evidence_class: "human_preference" }), content: "Writes Python with type hints and runs tests with pytest." },
      { id: "mem-pref-5", kind: "profile", scope: "global", origin: "direct-user", updated: ago(86400 * 6),
        content: "Planning a trip to Lisbon in May; likes walking tours and fado." },
    ],
    semantic: [
      { id: "mem-fact-1", kind: "semantic", scope: "project:" + WORKSPACE, origin: "auto-learned", learning_status: "active", updated: ago(86400 * 4),
        provenance: JSON.stringify({ evidence_class: "attributed_file_quote" }), content: JSON.stringify({ quote: "Invoices are due 30 days after issue unless terms say otherwise.", path: "docs/billing.md" }) },
    ],
    procedural: [
      { id: "mem-proc-1", kind: "procedural", scope: "project:" + WORKSPACE, origin: "auto-learned", learning_status: "active", updated: ago(3600),
        provenance: JSON.stringify({ evidence_class: "host_lesson" }), content: JSON.stringify({ recipe: "python -m pytest -q", language: "Python" }) },
    ],
    temporal: [
      { id: "mem-temp-1", kind: "temporal", scope: "global", origin: "direct-user", updated: ago(86400 * 6), expires: now + 86400 * 210,
        content: "Lisbon flights on 14 May, back on 19 May." },
    ],
  };
  const where = (scope) => (scope === "global" ? "all" : String(scope).startsWith("chat:") ? "conversation" : "project");
  const findMemory = (id) => Object.values(memories).flat().find((m) => m.id === id);

  // ---- the state() reply -----------------------------------------------------------------------------------------
  const settings = {
    // stealth: Stealth Lockdown (1.1.0), off by default (app.py state()); the switch is in Settings › Privacy and focus.
    theme, reduced_motion: false, stealth: !!stealth, memory_enabled: true,
    memory_layers: { working: true, episodic: true, semantic: true, procedural: true, temporal: true, profile: true },
    permissions: { mode: scene === "challenge" ? "auto" : "ask",
      tools: { files: true, edits: true, tests: true, apps: true, web: true, terminal: true, plugins: true, views: true, screen: false } },
    companion: { pointer: true, reactions: true, status_words: "rotate", ui_guidance: true },
  };
  const live = { active: null, activeRun: null };
  // The host's own clock for a run a capture plays live (record.mjs main-live-film-150, the 1.5.0 re-record). The
  // timeline gives the run's state changes in recording seconds; run_activity then answers as run_activity.py read()
  // does: `started` is the run's creation (runs.created, epoch seconds) and `elapsed` its live seconds so far
  // (runtime.py accrues them only while queued, running or retry_wait). The window's exact elapsed time comes from them
  // (activity.ts load(): hostStart = now - elapsed), so it matches the recording. origin() marks recording second 0.
  const clocks = {};
  let originMs = null;
  const recNow = () => (originMs === null ? null : (Date.now() - originMs) / 1000);
  const r3 = (x) => Math.round(x * 1000) / 1000;
  const LIVE_STATES = new Set(["queued", "running", "retry_wait"]);
  const clockState = (c, t) => c.transitions.reduce((s, [at, st]) => (at <= t + 1e-9 ? st : s), c.transitions[0][1]);
  const clockElapsed = (c, t) =>
    r3(c.transitions.reduce((sum, [at, st], i) => {
      const end = i + 1 < c.transitions.length ? c.transitions[i + 1][0] : Infinity;
      return LIVE_STATES.has(st) ? sum + Math.max(0, Math.min(end, t) - at) : sum;
    }, 0));
  // app.py _approve(): an approved action is 'running' while its effect runs, and the approve route answers once the
  // receipt is committed. A capture that plays a long effect (the isolated tests) defers the answer until it says so.
  const deferIds = new Set();
  const deferred = new Map();
  const state = () => ({
    job_notifications: [],
    chats: listed(),
    model,
    guard: { available: true, error: null },
    active: live.active,
    active_run: live.activeRun,
    runs: [...chats.values()].flatMap((c) => (c.runs || []).map((r) => ({ id: r.id, chat_id: c.id, state: r.state, created: r.created, updated: r.updated }))),
    settings,
    data_dir: "/Users/maya/.pebble",
    platform: "darwin",
    // backend/pebble/__init__.py VERSION (Settings' About block shows "Pebble 1.2.0"); a capture of a later release passes
    // its own (entry.js `version`)
    version: version || "1.2.0",
    memory: {
      enabled: settings.memory_enabled,
      strategy: "SQLite FTS5 · hybrid lexical/trigram/metadata ranking · bounded retrieval · no extra model", // memory.py
      types: LAYERS.map(([id, name]) => ({ id, name, count: STATIC_COUNTS[id] ?? (memories[id] || []).length, enabled: settings.memory_layers[id] !== false })),
      learning: { status_counts: { active: 11, pending: 0 }, last_error_type: null },
    },
    profiles: profileList(),
  });

  const artifactsOf = (chatId) => chats.get(chatId)?.artifacts || [];
  const findArtifact = ({ chat_id, id }) => artifactsOf(chat_id).find((a) => a.id === id);
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
      if (c.title === "New conversation") c.title = autoTitle(text); // store.py message()
      const run_id = "run-live-" + (c.runs.length + 1);
      c.runs = [{ id: run_id, state: "queued", error: null, created: Math.floor(Date.now() / 1000) }, ...c.runs];
      live.active = id;
      live.activeRun = run_id;
      return { message_id, run_id };
    },
    cancel: () => true,
    approve: ({ id, action_id }) => {
      const a = chats.get(id)?.actions.find((x) => x.id === action_id);
      if (a && deferIds.has(action_id)) {
        a.status = "running";
        return new Promise((resolve) => deferred.set(action_id, resolve)); // liveApi.finishApproval() answers it
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
    // controller.py held(): 'tests' stages the covering recipe through the normal approval (Ask mode), and the run
    // waits for that approval; the timeline gains the person's decision as a note (run_activity.py HELD).
    run_held_tests: ({ id, run_id }) => {
      const c = chats.get(id), run = runOf(id, run_id);
      if (!c || !run || run.state !== "verification_required") throw "This task is not waiting on verification.";
      c.actions = [...c.actions.filter((a) => a.id !== "act-tests-1"), testsAction("pending", id)];
      run.state = "waiting_approval";
      run.error = null;
      const record = activity[run_id], clock = clocks[run_id], t = recNow();
      if (record && clock && t !== null) {
        // A run on the host's clock (main-live-film-150): each row at its own time from the run's start. The decision
        // note at the click (held_decision), the approval bound to the staged recipe one frame later (action_bound),
        // then the note for the new state (STATE_NOTES waiting_approval).
        const seq = Math.max(0, ...record.items.map((i) => i.seq)) + 64, at = r3(t - clock.t0);
        record.state = "waiting_approval";
        record.items.push(item(seq, at, "note", "You asked Pebble to run the tests"),
          item(seq + 64, r3(at + 1 / 30), "approval", "Waiting for your approval: Requesting isolated tests", { status: "running" }),
          item(seq + 128, r3(at + 2 / 30), "note", "Waiting for your approval"));
      } else if (record) {
        // The decision comes `heldGap` s after the record's last row: 26 s in the static scenes; record.mjs main-live-film
        // passes 2 (held 14.03 s, click 16.0 s), so the drawer's offsets stay in order (+16.4 s, then +18.5 s …).
        const seq = Math.max(0, ...record.items.map((i) => i.seq)) + 64, at = Math.max(0, ...record.items.map((i) => i.at)) + (record.heldGap ?? 26);
        record.state = "waiting_approval";
        record.items.push(item(seq, at, "note", "You asked Pebble to run the tests"),
          item(seq + 64, at + 0.2, "approval", "Waiting for your approval: Requesting isolated tests", { status: "running" }));
      }
      return { run_id, status: "waiting_approval", action_id: "act-tests-1" };
    },
    run_held_finish: ({ run_id }) => ({ run_id, status: "queued" }),
    run_held_accept: ({ id, run_id }) => {
      const run = runOf(id, run_id);
      if (run) run.state = "completed";
      return { run_id, status: "completed", verified: false, origin: "human" };
    },
    run_activity: ({ run_id, after = 0 }) => {
      const a = activity[run_id], clock = clocks[run_id], t = recNow();
      if (clock && t !== null) {
        // run_activity.py read(): the items above the cursor and every item still running, the newest seq as `next`.
        const page = (a?.items || []).filter((i) => i.seq > (after || 0) || i.status === "running").sort((x, y) => x.seq - y.seq);
        return { run_id, state: clockState(clock, t), started: r3((originMs + clock.t0 * 1000) / 1000), elapsed: clockElapsed(clock, t),
          items: page, next: Math.max(after || 0, ...page.map((i) => i.seq)), reasoning: null };
      }
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
    // memory.py forget_preview(ids=...): records in the requested order; subject None (the event carries it).
    memory_forget_preview: ({ ids = [] }) => ({
      items: ids.map(findMemory).filter(Boolean).map((m) => ({ id: m.id, kind: m.kind, layer: Object.fromEntries(LAYERS)[m.kind], content: m.content,
        origin: m.origin, where: where(m.scope), updated: m.updated, authorization: "none" })),
      subject: null, authorization: "none",
    }),
    memory_delete: ({ id }) => {
      for (const kind of Object.keys(memories)) memories[kind] = memories[kind].filter((m) => m.id !== id);
      return { deleted: true };
    },
    plan_credentials: () => ({ names: [] }),
    project_recipes: () => ({ recipes: [{ id: "pytest", kind: "python", available: true }], inventory_truncated: false }),
    git_plan_receipts: () => ({ items: [] }),
    agent_worktrees: () => [],
    environment_list: () => ({ items: [] }),
    notification_status: () => ({
      settings: { enabled: true, kinds: { completed: true, failed: true, action_needed: true, monitor_changed: true }, preview: "title", quiet_hours: null },
      quiet_now: false, outbox: { pending: 0, delivered: 0, suppressed: 0, failed: 0 }, deferred: 0, last_failure: null, jobs: [], actions: [],
    }),
    telemetry_get: () => TELEMETRY_OFF,
    artifact_get: (p) => findArtifact(p) || (() => { throw "View not found."; })(),
    artifact_history: (p) => [findArtifact(p)].filter(Boolean),
    quiz_attempt: (p) => (findArtifact(p)?.kind === "quiz" ? quizAttempt(p, now) : null),
    quiz_start: (p) => quizAttempt(p, now),
    quiz_save: () => ({ saved: true }),
    // A settings change takes effect in the next state() read, as the service's does. (The service then emits
    // "settings"; a timeline that changes a setting for another window emits it itself, as record.mjs pet-veil does.)
    setting: ({ key, value }) => {
      if (key in settings) settings[key] = JSON.parse(JSON.stringify(value));
      return true;
    },
    open_url: () => null,
    remove_source: () => true,
    connector_status: () => [],
    storage_summary: () => ({}),
  };

  const storage = {};
  if (surface === "main") {
    const open = { open: true, tab: "activity", width: 400 };
    const drawer = { approval: open, done: open, challenge: { ...open, width: 440 }, command: open, git: open }[scene];
    const prefs = drawer ? { ...drawer } : { open: false, tab: "activity", width: 360 };
    if (drawerWidth) prefs.width = drawerWidth; // DetailsDrawer clamps it to 320..520
    storage["pebble.details.main"] = JSON.stringify(prefs);
  } else {
    storage["pebble-pet-chat"] = (scene === "pet-live" ? livePet : scene === "pet-review" ? coding : pet).id;
  }

  // Called by the capture scripts (page.evaluate) between backend events, so later get_chat/state replies match them.
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
      // created_t / updated_t: recording seconds, turned into the host's epoch seconds (main-live-film-150)
      const { created_t, updated_t, ...rest } = run;
      const times = originMs === null ? {} : { ...(created_t !== undefined ? { created: r3((originMs + created_t * 1000) / 1000) } : {}),
        ...(updated_t !== undefined ? { updated: r3((originMs + updated_t * 1000) / 1000) } : {}) };
      c.runs = [{ error: null, ...rest, ...times }, ...(c.runs || []).filter((r) => r.id !== run.id)];
    },
    title(chatId, title) { chats.get(chatId).title = title; },
    active(chatId, runId) { live.active = chatId; live.activeRun = runId; },
    activity(runId, record) { activity[runId] = record; },
    // main-live-film-150: recording second 0 (the first frame), the run's state changes on that clock, the rows as the
    // host publishes them (an update keeps its seq), and the approvals whose effect the capture plays out.
    origin() { originMs = Date.now(); },
    clock(runId, spec) { clocks[runId] = { t0: spec.t0, transitions: spec.transitions }; },
    publish(runId, row) {
      const record = activity[runId] || (activity[runId] = { state: "running", started: null, elapsed: null, items: [] });
      record.items = [...record.items.filter((i) => i.seq !== row.seq), row].sort((x, y) => x.seq - y.seq);
    },
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
    reply: { pet: PET_REPLY, proposed: REPLY_PROPOSED, done: REPLY_DONE, held: REPLY_HELD, proposedHeld: REPLY_PROPOSED_HELD,
      continueHeld: CONTINUE_HELD, heldNotice: "\n\n> Verification remains incomplete: " + HELD_NOTICE, continueVerified: CONTINUE_VERIFIED },
    text: { request: REQUEST, petQuestion: PET_QUESTION, challengeRequest: CHALLENGE_REQUEST, challenge: CHALLENGE, heldIssue: HELD_ISSUE },
    diffs: { dates: DIFF_DATES, tests: DIFF_TESTS },
    testScope: TEST_SCOPE, // 1.2.0: what the host adds to the tests/test_dates.py edit's payload (above)
    forget: { subject: FORGET_SUBJECT, ids: ["mem-pref-5", "mem-temp-1"] },
    challenge: { outside: CHALLENGE_OUTSIDE },
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
