# The harness plan for Pebble 2.0's film (DRAFT, 26 Oct 2026)

For the lead and the capture lane at G4. Local branch `film-2.0` only; embargoed until the release session posts
"2.0.0 published" (D87, OVERRIDES §48–§49).

**Where things stand.** The 2.0.0 source snapshot hasn't been posted (§49: it comes after the golden-set benchmark and
the release proof). So everything here is drafted against the v1.5.0 harness structure and flagged for checking
against the snapshot. `check.mjs` runs the draft today: 56 register strings, 26 scenes, 4 timelines, all draft checks
passing, every scene still DRAFT (each shows the six model-name placeholders in its composer, plus its own).

**The rules every harness shot keeps** (TREATMENT §3.6, §5.3, §6; OVERRIDES §48–§49):
- A harness proof is "harness playback with timings from the 2.0.0 event log", never a "real-time take". Pebble's
  moments come from a real 2.0.0 run's log, at 1x; only the person's own spans may be cut or played at up to 2x.
- Every host and window string is the snapshot's own, word for word. A string not yet read is a visible `⟦placeholder⟧`
  and `check.mjs --final` refuses it in a film scene. No UI is invented, and no UI morph Pebble doesn't perform.
- Usage lines (rates, cached tokens) and the agents panel's "Used N model calls, N tokens, N s" stay out of frame.
- The Stealth card's focus words stay cropped until the release session confirms 2.0.0 ships the fix (R-FOCUS).
- Only the person's pointer is ever painted, and only over harness playback (§5.3).
- Model names are never invented: they come from the snapshot's catalogue or the demo account.
- The film says "Shown with sample data", and its method line names harness playback (L29).

## 1. What changes from the 1.5.0 harness

| | v1.5.0 (the trailer) | 2.0.0 (this film) |
|---|---|---|
| Frontend | the published v1.5.0 tree, frozen from GitHub (`freeze-release.py`) | the release session's 2.0.0 snapshot folder, used as `PEBBLE_REPO` read only; not tagged on GitHub until publication, so `freeze-release.py` can't fetch it |
| Fixtures | `mock/fixtures.js` (the trailer's sample world, retired for this film) | `fixtures-2.0/world.js` (the pottery studio, `sample-world-2.0/`) |
| Scenes, timelines | `capture.mjs` SCENES, `record.mjs` TIMELINES | `scenes.js`, `timelines.js` as data until G4, then real scene and timeline entries |
| Strings | copied from the v1.5.0 host, by hand | the register in `strings.js`, looked up in the snapshot by `check.mjs --snapshot` |
| New surfaces | none after 1.5.0 | the companion's cards (1.9.10), Settings in a sidebar (1.9.2), the model button by provider (1.9.4), the Workshop's cards and Toolbox (1.7.0), the shell and file receipts (1.6.0), windows and sites (1.8.0–1.9.12), Activity in words (1.9.8–1.9.14) |

## 2. Each harness shot (TREATMENT §6)

"Drafted" names the symbols in this folder. "Needs the snapshot" is what can't be known from CHANGELOG, README or docs
(§48 allows only those in the checkout) and must be read in the 2.0.0 source.

### P0 and P1: the hero film

| Shot | In the film | Screens and states | RPCs, events, timing | Drafted here | Needs the snapshot |
|---|---|---|---|---|---|
| **HS-F** (P0) | S18, Ring 4 (1:16.5–1:25.5); a still in S07 | the workspace (1440×900) on `studio-bookings`, Details › Activity open. History: the request, the edit applied, "Pebble's change isn't verified yet." with its three choices, the click on Run the tests. Then, in the take: the "Run isolated tests" card Running, Done, the resumed turn, "Verified · pytest 18 passed on current files" | `state`, `get_chat`, `run_activity`, `run_held_tests`, `approve` (answered only once the tests finish, as 1.5.0's `deferApproval`/`finishApproval`), `stream_read`; events `run`, `token`, `usage` (cropped); timing from a real 2.0.0 run's log, entered at Running | `bookingsHeld`, `bookingsDone`, `testsAction`, activity `run-b1`/`run-b2`; scenes `f2-held`, `f2-held-tests`, `f2-verified`; timeline `f2-agentguard-run` | Activity's rows at 2.0.0 (1.9.13 folds routine rows into one row named by the reply); the held notice and issue wording; any change to the tests card; **the event log** of a real run of this scenario (R12) |
| **HS-B2** (P1) | S10, Cascade 1 "Answered by" | the composer's model button open: models grouped by provider, a ChatGPT plan, an API key, this Mac; short provider names, no e-mail | `state.profiles`, `state.model` | `profiles` with provider labels; model names as placeholders; scene `f2-models` | the 2.0.0 model button (1.5.0's list was a native `<select>`, which headless Chrome can't capture open: if 2.0.0's still is, this becomes a real take); the real model names from the demo account's catalogue |
| **HS-D** (P1) | S17, Cascade 3 "Memory you control" | Settings › Memory with the six kinds and their switches; a "Remember that …" note; the forget card and its confirm | `memory_list`, `memory_forget_preview`, `memory_delete`, `state.memory` | `memories` (the studio's), `remember`, `forget`; scenes `f2-memory`, `f2-forget-card` | the Memory page inside the 1.9.2 sidebar; the "Remember that" note's words (D2); the forget confirm (1.9.2) |
| **HS-N** (P1) | S19, Cascade 4 "Agents read and propose", "A goal, with criteria" | the agents panel (two agents that read and proposed); the goal "Open day ready" with three criteria met and one open | `agent_list` (AgentPanel.vue), `goal_list`, `goal_get` (GoalPanel.vue), public v1.5.0 shapes | `agentTree`, `goal`; scenes `f2-agents`, `f2-goal` | where 2.0.0 shows them (drawer tabs?); shape changes. Each agent row prints usage: crop it, or the lead rules (§6, D-H2) |
| **HS-O** (P1) | S19 "Skills you review", "Connectors that ask" | Settings › Skills & connectors: a reviewed skill on, one off, a connector; the Toolbox with `kiln_ramp_time` | `extensions`, `connector_status` (AdvancedSettings.vue), plus the Toolbox's own RPC | `extensions`; scene `f2-skills` | the Toolbox's RPC and rows, Put back (1.7.0, 1.9.11); the 2.0.0 Settings page |
| **HS-B3** (P0) | S20, ⌘K "stealth" | the palette, "stealth" typed, the row "Turn Stealth Lockdown on" lit | `command_catalogue` (the host's slash commands); the action rows are the window's own | scene `f2-palette-stealth` | the palette's selectors and the row's exact words; if Enter is recorded, the harness turns `settings.stealth` on, as `pet-veil` did. The film's next moment (S22) is the real take RS-13 (chain 10) |
| **HS-G** (P0) | S23, the ask card | the conversation "Glaze": the request, the answer, "Keep this tool in Pebble's Toolbox?" with the reason, Discard and Keep | the Workshop's card (an action kind or a message field: unknown) | `glaze`, action `tool_keep` (SNAPSHOT shape); scene `f2-glaze-ask` | the card's data shape, the reason's words, the Activity rows (R4). A real take (RS-G, GLAZE_BRIEF.md) is possible too: reading the file first is 1.7.0's real reason to ask |
| **HS-G playback** (RS-W's fallback) | S24, the climax | "Kept in Pebble's Toolbox · kiln_ramp_time", the body, View code, Remove; Activity's rows complete | the keep's events from a real 2.0.0 run's log; the card lands about 1 s after the in-point | `kiln`, action `tool_kept` (SNAPSHOT shape); timeline `f2-workshop-keep`; scene `f2-kiln-kept` | the card's shape and the rows (R4); the log of a run that kept the tool on its own |
| **HS-H** (RS-H's fallback) | S15–S16 | "Ran `sips …` with exit code 0." and its output; the folder card with Always allow; "Wrote `…/flyer.md` (… bytes). A copy of the earlier version was kept so it can be undone."; Undo this change | the shell and file actions; their events | `photos`, actions `shell` and `file` (SNAPSHOT shapes); timeline `f2-photos-run`; scene `f2-photos` | the action kinds, payloads and receipts (FEATURES read them from 1.9.12's `app.py`); the folder card |
| **RS-8's fallback** | S13, the Delete card | Notes' window allowed; the press card showing "Delete" and what is next to it, waiting | a real run's log | timeline `f2-delete-card` | the press card's shape (1.8.0) |

### The wall (S25) and the companion

Harness cells for the wall's three rings (TREATMENT §3.8): A9 (`f2-pet-site-card`), C4, D1, E4, E9 (`f2-windows`), B6,
B9, G4, B7, B13 (`f2-trash`), M1, M2 (`f2-views`), K3, N1, N2, N3, O1, C6, F2, F12, G3, H1, H4. The rest (A6, J2, I8, I6,
P1) are real takes. **No Stealth cell, ever.**

### The tour cut and the kit (P1, delivered with the hero film)

| Shot (meaning assigned here; the treatment only lists the IDs) | Features | Drafted | Needs the snapshot |
|---|---|---|---|
| **HS-A3**, the companion: quick chat, the sidebar's tabs, the waiting state, Copy | A4, A8, A10, A15 | `f2-pet-quick` (reference only: the film's quick chat is the live take RS-15), `f2-pet-sidebar` | Pet.vue's 1.9.4 tabs and header |
| **HS-E**, permissions: the modes, the switches, Always allow with Remove, Windows Pebble can use | E1, E2, E4, E9 | `f2-permissions`, `f2-windows`, `screenSessions` | the allowed-list RPC (1.6.0); the window target's fields (1.9.0 names windows by number) |
| **HS-F2**, project cards: an edit with Undo this edit, the test-file reason, a command, a Git plan, the scope challenge | F2, F4, F6, F7, F9 | `f2-project-cards` (1.5.0's scenes rewritten in studio-bookings at G4) | any 1.9.x card changes |
| **HS-K**, research: searching, sources, a [S7] marker, weather | K1–K4 | `sources` on example.org, `f2-sources` | the lead's choice (§6, D-H3); the weather answer's template |
| **HS-M**, views: the dashboard, the quiz's timer, Export… | M1–M3 | `views` with the open day's dashboard and a glaze-safety quiz; `f2-views` | none known: the view shapes are 1.0-era |
| **HS-X**, the workspace: search excerpts, Recently deleted, the local-to-cloud handoff, a schedule's review, the Settings sidebar | B7, B13, C6, N3, B9 | `f2-search`, `f2-trash`, `f2-handoff`, `f2-schedule`, `jobs` | the search RPC (1.9.5); the schedule review's words (1.9.7, 1.9.11) |
| **HS-B4**, the Stealth switch, cropped below the switch | L1 | `f2-stealth-switch` | the 2.0.0 card; crop its focus words (R-FOCUS) |

## 3. The strings

`strings.js` holds 56 strings: 20 v1.5.0 host templates and 6 v1.5.0 window strings (each may have changed by 2.0.0), 15
read from the 1.9.12 source by the features lane (FEATURES_2_0, with file and line), 5 quoted in CHANGELOG, and 10 that
only the snapshot can give:

1. the folder card for a write outside the workbench (H3);
2. the ask card's reason, "Pebble asks because …" (G4, R4);
3. Activity's Workshop rows: made, validated twice, used, blind-checked (G2, R4);
4. the Code Mode step, named by what it does (G1, 1.9.8);
5. the site card's two lists, the sites Pebble may act on and the sites it may only read (J3);
6. the first-action card (J9);
7. Activity's row for a look "with a screenshot" (B5, R5);
8. the note after "Remember that …" (D2);
9. the forget confirm (D3, 1.9.2);
10. a schedule's review in words (N3).

Plus the model names (never invented) and the Activity rows for the shell and file steps.

## 4. Data shapes: from v1.5.0, or guessed from CHANGELOG's names

- **From v1.5.0, CHECK-2.0:** chats, messages, runs, `run_activity` rows, the edit and tests actions, memories,
  `state()`, profiles (`types.ts`); `agent_list` (AgentPanel.vue), `goal_list`/`goal_get` (GoalPanel.vue), `extensions`
  (AdvancedSettings.vue), `job_list` (CompanionWorkflows.vue), `screen_sessions` (ScreenSessions.vue),
  `research_sources` (ResearchSources.vue), `command_catalogue` (CommandPalette.vue). The public v1.5.0 components were
  read on GitHub for these (the tree the 1.5.0 harness was built from); the embargoed checkout's source was not read.
- **Guessed from CHANGELOG's names, SNAPSHOT:** the action kinds `shell`, `file`, `screen_grant`, `browser_grant`
  (1.6.0, 1.8.0, 1.9.0 "For contributors"), `tool_keep` and `tool_kept` for the Workshop's cards (no name in CHANGELOG:
  pure placeholders), and every payload field of these.
- **Not drafted, named only:** `app_control_status`, `app_control_request` (1.8.0), `site_search`, `app_actions`,
  `screen_raise` (1.9.0). Their shapes come from the snapshot. The harness logs any RPC it doesn't answer
  (`window.__pebble.unhandled`), which lists exactly what is missing on the first run.

## 5. G4: when the snapshot arrives

1. **Receive it read only.** Record a SHA-256 list of its `src/`, `backend/` and `index.html`; check before and after
   every batch that nothing changed (the 1.5.0 harness's `find -newermt` practice, plus the hashes). Never write in it.
2. **Look up the strings:** `node capture/fixtures-2.0/check.mjs --snapshot=<dir>` lists found, missing and to read.
   For each missing or to-read string, read it in the snapshot, put its exact words and its file and line into
   `strings.js`, and change its status. Replace every ⟦placeholder⟧.
3. **Correct the shapes** in `world.js` from the snapshot's `types.ts` and components; give the new action kinds their
   real names and fields.
4. **Wire it:** in `mock/entry.js`, `?world=2` imports `buildWorld2` from here instead of `buildWorld` (one import and
   one line; the 1.5.0 path stays for the old scenes). Serve the snapshot with `PEBBLE_REPO=<dir>`.
5. **Turn the data scenes into capture.mjs scenes** (same helpers, the snapshot's selectors), one at a time, through
   `scripts/heavy.sh` and never during a hold; look at every image; add every RPC the run reports unhandled.
6. **Timelines from the log:** build `record.mjs` entries from the 2.0.0 event log of a real run (R12), the way
   `main-live-film-150` was built from v1.5.0's; run the time-honesty check on every chain (`timelines.js` CHAINS).
7. **`check.mjs --final` must pass** before any scene goes to the film or the wall.

## 6. Decisions for the lead

- **D-H1, the model list (HS-B2).** If 2.0.0's grouped list is a native `<select>`, the harness can't capture it open:
  record it in the demo user instead (one real take, with provider-only labels).
- **D-H2, usage in the agents panel (HS-N).** Each agent row prints "Used N model calls, N tokens, N s". Recommended: keep
  the host's data as sent and frame the panel so that line is out of shot (as usage lines are), rather than leave the
  fields out, which would show a state the 2.0.0 host never sends.
- **D-H3, research (HS-K).** Sources on example.org read as sample data; a real take shows real sites, with their rights
  and trademark lines (P6). Recommended: a real take for the kit, if the lead wants research in it at all (it is in the
  wall only).
- **D-H4, the sample app.** RS-7's "sample app that Accessibility can't read" is Kiln Board, made for the film
  (`sample-world-2.0/kilnboard`). It is real software that Pebble really operates by picture, but it is ours: say so in
  the small print ("Shown with sample data and a sample app"), or use an app the person owns. Recommended: say so.
- **D-H5, the poster's typeface.** The studio's poster is set in Fraunces (soft, wonky axes on), the film's expressive
  face (at 350). It sits behind the companion in S01. If the lead wants the world's type kept apart from the film's,
  re-set it in Inter alone (`art/make_art.py`).

## 7. Questions for the release session (beyond R1–R9)

- **R10.** In Ask for approval, after "Use youtube.com" is allowed (with pressing, 1.9.5), does pressing the video raise
  a press card, and is it answered in the companion or the workspace? In Full access, 1.9.14 lets Pebble approve its own
  steps "when your messages ask for them" (the 19:41 post): is the site card then shown at all? RS-9's Drop is the
  person's Allow on that card.
- **R11.** Same question for the first-action card (J9, S12) and the Delete press card (I3, S13): in which mode do they
  appear at 2.0.0, and where are they answered?
- **R12.** Which file records a run's host events with their times, and can the release session export it from a run in
  the demo user (sample data only), for the harness playback (HS-F, HS-G)?
- **R13.** If the person names the tool ("call it kiln_ramp_time") without asking to keep it, is the keep still Pebble's
  own, with the "on its own" card? Can a recalled past experience count as shaping the tool?
- **R14.** The window card's words at 2.0.0, after 1.9.13 ("for this task" beside "in this conversation").
- **R15.** Can a conversation still be renamed (1.0.0: "Search and rename conversations in the sidebar")? The film shows
  the names "Open day", "Tickets", "Photos", "Glaze" and "Kiln", and the banner names the conversation.
