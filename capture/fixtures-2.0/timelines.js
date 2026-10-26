// Timeline skeletons for the Pebble 2.0 film's harness playback (DRAFT; film-2.0 only; embargoed).
//
// TREATMENT §3.6: a harness proof is "harness playback with timings from the 2.0.0 event log", never a "real-time
// take". So these skeletons hold no times of their own: each Pebble moment names the host event whose time comes from
// a real 2.0.0 run's log (the RS-F dry run in the demo user, or a log the release session posts), and record.mjs gets
// the schedule from that log at G4, the way main-live-film-150 got v1.5.0's (fidelity round 2).
//
// Moment sources: "log" = Pebble's time, from the event log, played at 1x and never trimmed; "person" = the person's own
// span (a click, typing), which may be cut or played at up to 2x (TREATMENT §3.6). Event names are v1.5.0's
// (record.mjs, mock/fixtures.js comments): CHECK-2.0 every one against the snapshot's runtime and the log's own names.

export const TIMELINES_2 = {
  "f2-agentguard-run": {
    shot: "HS-F (or RS-F)", uses: "S18, 1:16.5-1:25.5 (Ring 4: your project)", world: "held", viewport: "WIDE",
    film_window: "the take starts on Running, with the held notice and the click on Run the tests already in the history (TREATMENT S18)",
    moments: [
      { key: "held", source: "log", event: "run state verification_required", what: "'Pebble's change isn't verified yet.' with three choices (history, before the in-point)" },
      { key: "click", source: "person", event: "run_held_tests", what: "Run the tests (history, before the in-point)" },
      { key: "staged", source: "log", event: "action_bound (tests, pending)", what: "the 'Run isolated tests' card" },
      { key: "approve", source: "person", event: "approve", what: "Run tests on the card (history, before the in-point)" },
      { key: "running", source: "log", event: "action running", what: "IN-POINT: the card reads Running" },
      { key: "done", source: "log", event: "action applied (result passed 18)", what: "the card reads Done; 'The isolated test run finished with exit code 0. …'" },
      { key: "resumed", source: "log", event: "run running (resumed turn)", what: "the run resumes" },
      { key: "reply", source: "log", event: "token (the turn's text)", what: "the reply's text reaches the conversation" },
      { key: "verified", source: "log", event: "completion_checked (verdict)", what: "'Verified · pytest 18 passed on current files'" },
      { key: "complete", source: "log", event: "run completed", what: "OUT: the glide continues; no freeze, no drawn mark, no hit (TREATMENT S18)" },
    ],
    budget: { chain: 9, from: "running", to: "verified", planned_s: 6.5, rule: "1.5.0's real span was 4.63 s from the click; if Running to Verified runs over 7 s, the ring extends within its phrase or the take is entered at Done; nothing inside is cut" },
  },
  "f2-workshop-keep": {
    shot: "HS-G playback (fallback for RS-W)", uses: "S24, 1:47.5-1:55.5 (the climax)", world: "kiln", viewport: "WIDE",
    film_window: "a late in-point, so the kept card lands about 1 s after it; the earlier wait is not shown and no duration is claimed (TREATMENT §3.6, chain 11)",
    moments: [
      { key: "asked", source: "person", event: "send", what: "the kiln question (history)" },
      { key: "rows", source: "log", event: "SNAPSHOT: the Workshop's make, validate (twice) and blind-check rows", what: "Activity's rows complete before the in-point" },
      { key: "answer", source: "log", event: "token", what: "the answer: 10 hours 10 minutes" },
      { key: "kept", source: "log", event: "SNAPSHOT: the keep (workshop.py keep_tool on its own)", what: "IN + about 1 s: 'Kept in Pebble's Toolbox · kiln_ramp_time'" },
      { key: "happy", source: "log", event: "the avatar's host event (happy)", what: "the pebble turns happy, if the companion is in frame" },
    ],
    budget: { chain: 11, planned_s: 1.0, rule: "nothing inside the take is cut; the take begins late enough that the card lands at +1.0 s" },
  },
  "f2-photos-run": {
    shot: "HS-H (fallback for RS-H)", uses: "S15-S16", world: "photos", viewport: "WIDE",
    moments: [
      { key: "command-receipt", source: "log", event: "SNAPSHOT: the shell action's receipt", what: "'Ran `sips …` with exit code 0.' (S15: one moment)" },
      { key: "folder-card", source: "log", event: "SNAPSHOT: the file-write card for ~/Documents/Open day", what: "the card with Always allow (S16)" },
      { key: "allow", source: "person", event: "approve", what: "Allow" },
      { key: "file-receipt", source: "log", event: "SNAPSHOT: the file action's receipt", what: "'Wrote `…/flyer.md` (… bytes). A copy of the earlier version was kept so it can be undone.'" },
    ],
    budget: { chain: 8, from: "allow", to: "file-receipt", planned_s: 1.5, rule: "if longer, hold at 1x on the conversation after the Allow until the receipt arrives" },
  },
  "f2-delete-card": {
    shot: "RS-8 fallback (harness playback of a real run's log)", uses: "S13", world: "SNAPSHOT (a Notes conversation)", viewport: "WIDE",
    moments: [
      { key: "window-allowed", source: "log", event: "screen_grant receipt", what: "Notes' window allowed (history)" },
      { key: "press-card", source: "log", event: "SNAPSHOT: the press card for 'Delete'", what: "the card shows the button and what is next to it, and waits (S13)" },
    ],
    budget: { chain: null, rule: "the card waits: the shot holds on it at 1x" },
  },
};

/** TREATMENT §3.6's chains, for a checkTimeHonesty port: film span must be at least the real gap from the log. */
export const CHAINS = [
  { chain: 1, shots: "S01-S02", source: "RS-15", from: "send", to: "the reply's first words", film_s: 0.5 },
  { chain: 2, shots: "S04-S05", source: "RS-9", from: "banner click", to: "the companion opens on the card", film_s: 0.5 },
  { chain: 3, shots: "S06-S08", source: "RS-9", from: "Allow", to: "reply", film_s: 12.5, note: "continuous at 1x; planned 8-13 s" },
  { chain: 4, shots: "S09", source: "RS-9", from: "next message sent", to: "first visible action", film_s: 3.5 },
  { chain: 5, shots: "S11", source: "RS-4", from: "= pressed", to: "Activity row", film_s: 2.0 },
  { chain: 6, shots: "S12", source: "RS-7", from: "first-action card", to: "window changes", film_s: 2.5 },
  { chain: 7, shots: "S15", source: "RS-H or HS-H", from: "receipt", to: "receipt", film_s: 0.0 },
  { chain: 8, shots: "S16", source: "RS-H or HS-H", from: "Allow", to: "'Wrote …' receipt", film_s: 1.5 },
  { chain: 9, shots: "S18", source: "HS-F or RS-F", from: "Running", to: "Verified", film_s: 6.5 },
  { chain: 10, shots: "S20-S22", source: "⌘K take, then RS-13", from: "Enter", to: "menu-bar icon changes", film_s: 7.8 },
  { chain: 11, shots: "S24", source: "RS-W or HS-G", from: "in-point", to: "kept card", film_s: 1.0 },
];
