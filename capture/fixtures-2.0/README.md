# capture/fixtures-2.0: DRAFT fixtures for the Pebble 2.0 film's harness shots

**Local branch `film-2.0` only. Embargoed (D87):** nothing here may be pushed, deployed or shown until the release
session posts "2.0.0 published". The landing repo is public.

**These are placeholders, not 2.0.0 UI.** The final film's harness shots record Pebble 2.0.0's own frontend from the
release session's 2.0.0 source snapshot (OVERRIDES §49), which hasn't been posted yet. Until it is:

- the data shapes are the published v1.5.0 ones (`../mock/fixtures.js` and the public v1.5.0 components), each marked
  CHECK-2.0 where 1.6–1.9.14 may have changed it;
- what only exists after 1.5.0 (the shell, file, window, site and Workshop cards) uses the names CHANGELOG.md gives and
  is marked SNAPSHOT, with every payload field to be replaced from the snapshot;
- every host or UI string is in `strings.js` with where its words come from; the unknown ones are visible
  `⟦placeholders⟧`, so no capture made before the check can pass for real UI;
- the content is the new sample world (a pottery studio's open day, `../sample-world-2.0/`), never the trailer's.

| File | What it is |
|---|---|
| `HARNESS_PLAN.md` | The plan: for each harness shot in TREATMENT §6, its screens and states, RPCs and events, what is drafted here and what needs the snapshot; the G4 procedure; decisions and questions |
| `strings.js` | The string register (56 strings: source and status of each) and `S(key, vars)` |
| `sampleWorld.js` | The sample world's messages, replies, diffs, memories and views (checked against `../sample-world-2.0/world.json`) |
| `world.js` | `buildWorld2()`: the fixture world in v1.5.0's `buildWorld()` shape, answering every RPC the v1.5.0 harness answered plus the panels it left empty |
| `scenes.js` | 26 harness scenes as data (steps, what must be in frame, what to crop, whether it may reach the film) |
| `timelines.js` | Skeletons for harness playback (the AgentGuard run, the Workshop keep, the photos run, the Delete card) and TREATMENT §3.6's 11 timed chains |
| `check.mjs` | The checks: register, sample world, every scene's world, privacy and the retired world; `--snapshot=<dir>` looks up every string in the 2.0.0 source; `--final` refuses placeholders in film scenes |

Run (light; no browser, network or render): `node capture/fixtures-2.0/check.mjs`. At the time of writing it reports
56 register strings (20 v1.5.0 host templates, 6 v1.5.0 window strings, 15 read from 1.9.12 by the features lane, 5
quoted in CHANGELOG, 10 still to read from the snapshot) and 26 scenes, all DRAFT, with the draft checks passing.

Not wired into the harness yet: at G4, `../mock/entry.js` gains a `?world=2` switch that imports `buildWorld2` from
here (HARNESS_PLAN.md §5). Nothing in `../mock/`, `../capture.mjs` or `../record.mjs` was changed, so the 1.5.0 scenes
still re-render as they were.
