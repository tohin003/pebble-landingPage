// The string register for the Pebble 2.0 film's harness fixtures (DRAFT, film-2.0 branch only; embargoed until the
// release session posts "2.0.0 published").
//
// Every string the fixtures put on screen that is NOT our own sample data is listed here once, with where its wording
// comes from and how sure that is. The 2.0.0 snapshot is not here yet (OVERRIDES §49): nothing below is final until
// check.mjs --snapshot=<the 2.0.0 source folder> finds it, word for word, in the snapshot's source.
//
// status:
//   "v1.5.0-host"     a host template the 1.5.0 harness copied from the published v1.5.0 backend (mock/fixtures.js);
//                     2.0.0 may have changed it (1.9.13 reworded Activity, for one).
//   "v1.5.0-ui"       a window string from the v1.5.0 components, captured in the 1.5.0 scenes.
//   "features-1.9.12" read from the 1.9.12 source by the features lane (FEATURES_2_0, with its file and line); the
//                     snapshot decides.
//   "changelog"       quoted in CHANGELOG.md (read only) for a 1.6-1.9.14 behaviour; the on-screen words may differ.
//   "snapshot"        unknown until the snapshot is read: the text is a visible placeholder, ⟦like this⟧, so a
//                     capture that still has it can never pass for real UI (check.mjs fails a final scene on one).
// Sample data (messages, replies, file names, numbers) is not listed: it is ours, and it lives in sampleWorld.js.

export const STRINGS = {
  // ---- AgentGuard and the isolated tests (HS-F, S18) -------------------------------------------------------------
  heldTitle: { text: "Pebble's change isn't verified yet.", status: "v1.5.0-ui", source: "RunPanel.vue (scene held-unverified, 1.5.0); FEATURES F11" },
  heldRunTests: { text: "Run the tests", status: "v1.5.0-ui", source: "RunPanel.vue (1.5.0)" },
  heldFinish: { text: "Ask Pebble to finish", status: "v1.5.0-ui", source: "RunPanel.vue (1.5.0)" },
  heldAccept: { text: "Accept as unverified", status: "v1.5.0-ui", source: "RunPanel.vue (1.5.0)" },
  testsCardBody: { text: "Runs the project's tests in a temporary copy. Your project files don't change.", status: "v1.5.0-ui", source: "ActionReview.vue (scene held-tests-review, 1.5.0); FEATURES F3" },
  heldNotice: { text: "Pebble changed {names} but did not run the tests that cover {them}.", status: "v1.5.0-host", source: "controller.py gate_sentences() 'no_test_run' (v1.5.0 harness)" },
  heldPrefix: { text: "> Verification remains incomplete: ", status: "v1.5.0-host", source: "runner.py (v1.5.0 harness)" },
  heldIssue: { text: "{changed} file(s) changed and no tests were run, but {covering} test file(s) cover this code: {list}. Run them (RunTests) before finishing and report what they said.", status: "v1.5.0-host", source: "controller.py gate issue (v1.5.0 harness)" },
  verified: { text: "Verified · {recipe} {passed} passed on current files", status: "v1.5.0-host", source: "run_activity.py verdict() (v1.5.0 harness); FEATURES F12" },
  notVerified: { text: "Not verified · {changed} changed file, no tests run", status: "v1.5.0-host", source: "run_activity.py verdict() (v1.5.0 harness)" },
  testsSummary: { text: "The isolated test run finished with exit code {code}. Review the output in Activity & review.", status: "v1.5.0-host", source: "app.py action_summary() (v1.5.0 harness)" },
  editSummary: { text: "Applied the edit to `{path}`. You can undo it in Activity & review.", status: "v1.5.0-host", source: "app.py action_summary() (v1.5.0 harness)" },
  rowRecalled: { text: "Recalled {n} memories", status: "v1.5.0-host", source: "run_activity.py (v1.5.0); 1.9.13 folds routine rows into one row named by the reply: check" },
  rowResponded: { text: "The model responded", status: "v1.5.0-host", source: "run_activity.py (v1.5.0); folded at 1.9.13: check" },
  rowSearching: { text: "Searching project source", status: "v1.5.0-host", source: "app.py tool_label() (v1.5.0)" },
  rowReading: { text: "Reading {path}", status: "v1.5.0-host", source: "app.py tool_label() (v1.5.0)" },
  rowPreparingEdit: { text: "Preparing an edit to {path}", status: "v1.5.0-host", source: "app.py tool_label() (v1.5.0)" },
  rowStaged: { text: "Staged for your approval.", status: "v1.5.0-host", source: "run_activity.py (v1.5.0)" },
  rowWaiting: { text: "Waiting for your approval", status: "v1.5.0-host", source: "run_activity.py STATE_NOTES (v1.5.0)" },
  rowApproved: { text: "Approved: {label}", status: "v1.5.0-host", source: "run_activity.py (v1.5.0)" },
  rowRecipes: { text: "Finding project test and build recipes", status: "v1.5.0-host", source: "app.py tool_label() (v1.5.0)" },
  rowRequestingTests: { text: "Requesting isolated tests", status: "v1.5.0-host", source: "app.py tool_label() (v1.5.0)" },
  rowAskedTests: { text: "You asked Pebble to run the tests", status: "v1.5.0-host", source: "run_activity.py HELD (v1.5.0)" },
  rowIncomplete: { text: "Verification remains incomplete", status: "v1.5.0-host", source: "run_activity.py STATE_NOTES (v1.5.0)" },

  // ---- Shell, files and Undo (HS-H, S15-S16; fallback for RS-H) ---------------------------------------------------
  shellReceipt: { text: "Ran `{command}` with exit code {code}.", status: "features-1.9.12", source: "app.py describe() 4047-4051 (FEATURES H1)" },
  fileReceipt: { text: "Wrote `{path}` ({bytes} bytes). A copy of the earlier version was kept so it can be undone.", status: "features-1.9.12", source: "app.py describe() 4065-4067 (FEATURES H4)" },
  undoChange: { text: "Undo this change", status: "features-1.9.12", source: "App.vue (FEATURES H4)" },
  alwaysAllow: { text: "Always allow", status: "changelog", source: "CHANGELOG 1.6.0 ('\"Always allow\" keeps a folder or website allowed')" },
  folderCard: { text: "⟦the folder card's heading and body, naming ~/Documents/Open day⟧", status: "snapshot", source: "the 2.0.0 file-write card (H3)" },

  // ---- Pebble's Workshop (HS-G, S23; the kept card behind S24) -----------------------------------------------------
  keepAskTitle: { text: "Keep this tool in Pebble's Toolbox?", status: "features-1.9.12", source: "App.vue 2612-2630 (FEATURES G4)" },
  keepAskReason: { text: "⟦Pebble asks because …: the reason 2.0.0 gives when a tool was shaped by a file⟧", status: "snapshot", source: "workshop.py / App.vue at 2.0.0 (R4)" },
  keepDiscard: { text: "Discard", status: "features-1.9.12", source: "App.vue (FEATURES G4)" },
  keepKeep: { text: "Keep", status: "features-1.9.12", source: "App.vue (FEATURES G4)" },
  keptTitle: { text: "Kept in Pebble's Toolbox · {tool}", status: "features-1.9.12", source: "App.vue 2611-2622 (FEATURES G3)" },
  keptBody: { text: "Pebble kept this tested calculation on its own. Remove it if you don't want it.", status: "features-1.9.12", source: "App.vue 2611-2622 (FEATURES G3)" },
  keptViewCode: { text: "View code", status: "features-1.9.12", source: "App.vue (FEATURES G3)" },
  keptRemove: { text: "Remove", status: "features-1.9.12", source: "App.vue (FEATURES G3)" },
  workshopRows: { text: "⟦Activity's make-and-check rows: made, validated twice, used, blind-checked⟧", status: "snapshot", source: "run_activity.py / workshop.py at 2.0.0 (R4)" },
  codeModeStep: { text: "⟦the Code Mode step, named by what the script does (1.9.8)⟧", status: "snapshot", source: "run_activity.py at 2.0.0" },

  // ---- Windows, sites and app steps (wall cells A9, E9, I9; harness alternatives) ----------------------------------
  windowReceipt: { text: "Allowed Pebble to use {app}, the window “{window}”, for this task.", status: "features-1.9.12", source: "app.py 4067-4068 (FEATURES I1); 1.9.13 reworded the window card ('for this task' beside 'in this conversation'): check" },
  endAccess: { text: "End access in Details › Tools (⇧⌘D).", status: "features-1.9.12", source: "app.py 4057-4068 (FEATURES E9, I1)" },
  windowsTitle: { text: "Windows Pebble can use", status: "changelog", source: "CHANGELOG 1.8.0, 1.9.14" },
  siteCardHeading: { text: "Use {site}", status: "changelog", source: "CHANGELOG 1.9.9 ('names each site once (\"Use youtube.com\")')" },
  siteCardBody: { text: "⟦the site card's lists: the sites Pebble may act on and the sites it may only read⟧", status: "snapshot", source: "the 2.0.0 site card (J3)" },
  pressedStep: { text: "Pressed “{key}”: {before} → {after}", status: "changelog", source: "CHANGELOG 1.9.13 ('Pressed “C”: 100×10 → 100×'), 1.9.14 (titled by the press)" },
  approvedByPebble: { text: "Approved by Pebble (you asked: {words})", status: "changelog", source: "CHANGELOG 1.9.14 (Full access)" },
  firstActionCard: { text: "⟦the first-action card: the first use of the mouse and keyboard in a window asks once⟧", status: "snapshot", source: "the 2.0.0 card (J9, R4)" },
  lookedWithScreenshot: { text: "⟦Activity's row for a look 'with a screenshot' (1.9.11)⟧", status: "snapshot", source: "run_activity.py at 2.0.0 (B5, R5)" },

  // ---- Stealth Lockdown (HS-B3, HS-B4) -------------------------------------------------------------------------
  stealthRow: { text: "Turn Stealth Lockdown on", status: "features-1.9.12", source: "App.vue 1548-1555 (FEATURES B6)" },
  stealthStateOn: { text: "On. Pebble is hidden from screen capture. Find it in the menu bar.", status: "features-1.9.12", source: "App.vue (FEATURES L1)" },
  stealthCardFocusWords: { text: "Keeps Pebble out of screen shares and recordings, and keeps the companion with you over the app you're in.", status: "features-1.9.12", source: "App.vue 3426-3452 (FEATURES L1). FOCUS WORDS: crop below the switch until 2.0.0 ships the fix (R-FOCUS, §49)" },

  // ---- Memory (HS-D, S17) ----------------------------------------------------------------------------------------
  forgetReply: { text: "I found {count} saved memor{ies} that match “{subject}”. Choose **Forget** on the ones you want gone, here or in Settings → Memory. Nothing is forgotten until you do.", status: "v1.5.0-host", source: "runner.py forget reply (v1.5.0 harness)" },
  rememberedNote: { text: "⟦the note Pebble writes after 'Remember that …' (D2)⟧", status: "snapshot", source: "runner.py at 2.0.0" },
  forgetConfirm: { text: "⟦the confirm that 'Forgetting one memory asks first' (1.9.2)⟧", status: "snapshot", source: "the 2.0.0 Memory page" },

  // ---- Bigger tasks (HS-N, HS-O, S19) -------------------------------------------------------------------------
  goalNote: { text: "A goal is a checklist for this conversation, not a memory. Evidence links point to finished task steps; they do not prove the work is correct or grant permission.", status: "v1.5.0-ui", source: "GoalPanel.vue NOTE (public v1.5.0)" },
  scheduleReview: { text: "⟦a schedule's review in words: its model, permissions and limits (1.9.7, 1.9.11)⟧", status: "snapshot", source: "CompanionWorkflows.vue at 2.0.0" },
};

/** The text of a string, with {placeholders} filled. Unknown keys throw, so a typo never reaches a capture. */
export function S(key, vars = {}) {
  const entry = STRINGS[key];
  if (!entry) throw new Error(`fixtures-2.0: no string "${key}" in the register`);
  return entry.text.replace(/\{(\w+)\}/g, (whole, name) => (name in vars ? String(vars[name]) : whole));
}

/** Every key a text came from, for the check's per-scene report. */
export const isPlaceholder = (text) => typeof text === "string" && text.includes("⟦");
