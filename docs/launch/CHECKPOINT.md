# Launch 2.0: checkpoint (1 Nov 2026, ~16:10 IST)

The director session (claude-w, adminoffice@) hit 94 % of its 5-hour usage window. This file is how to resume.
Read in order: this file → `docs/launch/TREATMENT.md` (with rulings v1.1) → `docs/launch/EDIT_PLAN.md` → the
handoffs named below. Memory: `~/.claude-work/projects/-Users-xyx-Projects-pebble-landingPage/memory/`.

## Owner decisions so far

- Story "Small pebble. Real work." (underdog hook vs Claude Code and Codex, paid off by the published benchmarks).
- No voiceover; "Context warping." is the on-screen title of sealed context; deliver ~90–100 s in 16:9 and a 4:5
  re-layout; post the 4:5 natively on LinkedIn (research advice), 16:9 for the site and YouTube.
- Cleanup of the previous session's media approved and done (`.work/cleanup-2026-11-01-launch.md`).
- Delegate workers to **claude-p** (tohin@, `~/.claude-personal`), background sessions in auto mode; launch command in
  memory `claude-p-delegation.md`. The owner accepted claude-p's workspace trust for this repo.
- **Pending: the music pick (A, B or C) by ear.** Director's pick: **A, "Your Breath"** (Mixkit, 120 BPM, 100 s,
  drop 8.051 s). Files: `video/public/launch/audio/music/launch-music-{A-your-breath,B-masking-the-masters,
  C-techno-fest-vibes}.{mp3,wav,beatmap.json}`; write-up `.work/launch/music/MUSIC.md`. B needs a manual Mixkit
  download by the owner. No credit line required (optional courtesy line).

## Who is doing what

| Worker | Where it runs | State | Output |
|---|---|---|---|
| Site audit | claude-w subagent | **done** | `.work/launch/site/SITE_AUDIT.md` (live site = origin/main 4314c08, already shows the 2.0 benchmarks; plan for /media/v3 loops, 4:5 phone film, rule conflicts X1–X15) |
| Skills research | claude-w subagent | **done** | `.work/launch/research/SKILLS_REPORT.md`; project skill `.claude/skills/launch-film-craft` (HyperFrames = reference only) |
| Music + SFX | claude-w subagent | **done** | edits A/B/C + beat maps; 25-file SFX kit in `video/public/launch/audio/sfx/` (`kit.json`) |
| Footage map | claude-w subagent | running/may stall at the usage limit | `video/src/launch/data/takes.ts`, `.work/launch/assets/TAKES.md`, sheets; takes copied to `video/public/launch/takes/` |
| iPhone Remote | claude-w subagent | running (one xcodebuild failed, exit 65, at 14:52) | `.work/launch/remote/` (clone + REMOTE.md), target `video/public/launch/remote/`, `data/remote.ts` |
| UI capture (2.0.1 harness) | claude-w subagent | running | frozen release `.work/launch/frozen-2.0.1`; `capture/launch/` (commits e70ee4c, 13aa323, e474f69); target `video/public/launch/ui/`, `data/ui.ts`, `.work/launch/ui/UI_CAPTURE.md` |
| Motion system | claude-w subagent | finishing (style frames r3 approved) | `video/src/launch/**` components, `.work/launch/style/r3/`; handoff `.work/handoffs/launch-foundation.md` when done |
| Scenes A: S00, S01, S11 | **claude-p** `pebble-scenes-a` (13a2ff2f) | running | `video/src/launch/scenes/a/`, report `.work/handoffs/launch-scenes-a.md` |
| Scenes B: S02, S03, S09 | **claude-p** `pebble-scenes-b` (91d4973d) | running | `scenes/b/`, `.work/handoffs/launch-scenes-b.md` |
| Scenes D: S06, S07, S10 | **claude-p** `pebble-scenes-d` (a0703efc) | running | `scenes/d/`, `.work/handoffs/launch-scenes-d.md` |
| Scenes C: S04, S05 | **claude-p** `pebble-scenes-c` | launched at checkpoint (see below) | `scenes/c/`, `.work/handoffs/launch-scenes-c.md` |

claude-w subagents stop when this window runs out; their files stay on disk. Check each output above; re-run only what
is missing. claude-p sessions keep running (another account). Status:
`CLAUDE_CONFIG_DIR=~/.claude-personal <claude.exe> agents --json`; resume one with notes:
`… --resume <id> --bg "<notes>"`. They can't SendMessage across accounts: read their handoff files.

## Next steps, in order

1. Get the owner's music pick; copy its beat map to a committed path (e.g. `video/src/launch/data/music.ts`).
2. Launch the remaining claude-p sessions when memory allows (≤ 4 at once, 8 GB Mac): **group E** (S08 Remote; needs
   `data/remote.ts`, else a Device scene with the app's real screenshots if any) and **the site** (implement
   SITE_AUDIT.md's film-independent steps: 2.0.1 release facts from the GitHub release and SHA256SUMS, /llms.txt and
   #infrastructure, /media/v3 + /ui/v2 plumbing in next.config.ts and src/lib/media.ts, the loop slots and a #remote
   section, CLAIMS rows; all checks). Briefs: copy `.work/launch/briefs/_common.md` + a group file.
3. Review each scene group from its handoff (stills + preview contact sheets); send notes with `--resume`.
4. Build the master: `video/src/launch/Master.tsx` (16:9 and 4:5) placing the scenes on the music, the world-change
   seams (TREATMENT rulings), the SFX map (EDIT_PLAN), music at −14 LUFS master. Timing for music A:
   S00 0–8.051 · S01 8.051–12.051 · S02 12.051–20.051 · S03 20.051–32.051 (burst lifts at the 24.051 phrase) ·
   S04 32.051–40.051 · S05 40.051–48.051 (phrase) · S06 48.051–56.051 · S07 56.051–63.051 (title on the 56.051
   phrase) · S08 63.051–72.051 · S09 72.051–79.5 (the breath; near-silence ~80.7) · S10 79.5–93.055 ("So. How did it
   do?" in the silence, charts slam on the 81.051 lift) · S11 93.055–100 ("Small pebble." / "Real work." on the
   drum-out hits 93.055 and 93.303; lockup on the F pad 95.055; rest on the D pad 97.055).
5. Render the 16:9 master through `scripts/heavy.sh` (60 fps, `--concurrency=1`, ~25 min), scan it (blank/half-painted
   frames, the flash scan `video/src/film2/qa/flash-rgb-scan.ts`, title-safe), then a fresh critic agent reviews
   contact sheets only (craft skill rule 13). Fix, re-render; then 4:5.
6. Deliver: `out/` masters, LinkedIn 4:5 + 16:9 at −14 LUFS, a web copy at 30 fps −16 LUFS, the SRT of on-screen
   text, posters (frame 0), the post text with the benchmark method, CLAIMS rows for the film's lines.
7. Landing page: per SITE_AUDIT.md, loops cut from the locked film's scenes into /media/v3, the film + phone cut,
   tests, `next build` via heavy.sh, copy lint. Never deploy: the owner pushes main.

## Update, 1 Nov ~19:20 IST (after the usage reset)

- Done and committed: scenes A (4b9451a), C (4429644), D (cherry-picked from its worktree branch as 648d851, b77d7ae);
  takes map (0c709ed, `.work/launch/assets/TAKES.md`); 2.0.1 UI captures in dark and light (`data/ui.ts`, 51208c3;
  `.work/launch/ui/UI_CAPTURE.md`). Footage findings that bind: blur RS5C-04's month view (the owner's own iCloud
  events); the Calculator keys never light (zoom the display); RS9B-02 has ~1.1 s of clean Chrome; RS13-03's
  "empty" desktop has a Finder window and a widget to blur; RS9A-01 is unusable.
- Director's review notes are in `.work/launch/briefs/rev-d.md` and `rev-ac.md` (scale-ups, must-read sizes, new
  nominal lengths for music A).
- Running unattended on claude-p in print mode (`-p --permission-mode auto --permission-prompts none`, outputs in
  `.work/launch/runs/*.out`): scenes B restart (`scenes-b2`), revision D (`rev-d`), revision A+C (`rev-ac`), the
  master edit (`master`, brief `briefs/master.md`). Background `--bg` sessions stalled on permission prompts; don't
  use `--bg` for unattended work. Workers sometimes create worktrees; the `_unattended.md` brief forbids it.
- Still on claude-w: the iPhone worker (resumed). Not resumed: the motion-system worker (its handoff exists).
- Next: group E (S08 Remote) once `data/remote.ts` lands; the site session (brief to write from SITE_AUDIT.md);
  review every revision; the music pick (A assumed in all timings).

- **Music locked (owner, 1 Nov ~20:25): A, "Your Breath" by Eugenio Mininni (Mixkit).** B and C are dropped.

## Update, 1 Nov ~21:50 IST: the verification loop, round 1 (docs/launch/VERIFICATION_LOOP.md)

- All work is on claude-w now (the owner took claude-p back). Draft 2 (`.work/launch/master/draft2-16x9.mp4`) was
  reviewed by a fresh critic: `.work/launch/critic/REVIEW-1.md`, verdict "fix then ship" (M1–M5, S1–S12, N1–N5,
  a BANNED list). The director's plan, decisions and NEW timeline: `.work/launch/critic/FIXES-1.md`.
- Six claude-w fix workers run in parallel (packages WP-A bookends, WP-B real takes incl. the Stealth rework, WP-C
  AgentGuard/Workshop, WP-D Memory/Context warping/Benchmarks, WP-E Remote, WP-M master/seams/audio/QA gates); each
  reports to `.work/launch/critic/FIX1-<package>.md`. WP-M renders drafts 3 (16:9 and 4:5) when the others land.
- Next: a NEW critic reviews draft 3 (round 2: verify every REVIEW-1 item FIXED/PARTLY/STILL, then regressions and
  new issues) → fix → repeat until "ship"; then the full-resolution masters (`master/final.sh`, 30 fps) and a last
  verification round; then delivery and the site's phase 2 (the film and loops into /media/v3).

## Update, 2 Nov ~01:50 IST: verification loop round 2

- Round 1's fixes produced draft 3 (`.work/launch/master/draft3-{16x9,4x5}.mp4`); the gates pass (no unpainted
  frames; flash passes except css2560 16:9 at 7/6 on S02's pull-back). Round 2's critic (claude-p):
  `.work/launch/critic/REVIEW-2.md`, "fix then ship" (M-1 4:5 Keep card crop, M-2 a 2-frame first-run flash at
  S08→S09, M-3 the S04→S05 whip's blur samples; SHOULDs S-1 to S-8).
- The plan: `.work/launch/critic/FIXES-2.md` (S09 70.051–79.101, S10 79.101–93.055; the S01→S02 pebble match; the
  S09→S10 question in the blob). Four claude-p fix workers run unattended (`.work/launch/runs/fix2-{a,b,c,d}.out`,
  reports `FIX2-R2-*.md`).
- Next: draft 4 + gates → a light round-3 check (dense strips of the changed windows + the gates) → if "ship": final
  masters (`master/final.sh`, 30 fps), `deliver.sh` (−14 / −16 LUFS, −1 dBTP), SRT, posters, the encode test, a last
  verification; then the site's phase 2.

## Update, 2 Nov ~11:35 IST: verification loop round 3 done; draft 5 and round 4

- Draft 4 passed every gate in both aspects (frames, pops, flash incl. css2560; the 5 Mbps encode test adds no
  blocking). Round 3's critic: `.work/launch/critic/REVIEW-3.md`, "fix then ship; draft 4 is close". The plan:
  `.work/launch/critic/FIXES-3.md`. Its fixes are committed: R3-A 1544e9c, ed3ec35 (the film ends at 99.4 s with a
  slow blink); R3-CD 860ebe3, e17d76e, d9fa5fd; R3-B d809454; the post kit's masking line 94b03fe.
- The Pebble side's 2.0.2 HOLD (03:07–11:26) paused every render; it also asked that claude-p stay quiet, so the
  film's work stays on claude-w (`PEBBLE_SESSIONS_STATUS.md`). `deliver.sh` now writes 30 fps copies only (1354151).
- Now: draft 5 (`.work/launch/master/draft5-{16x9,4x5}.mp4`, pipeline log `draft5-pipeline.log`) → round 4's critic
  (claude-w subagent; briefs `.work/launch/briefs/critic-r4.md` + `critic-r4-known.md`) → `REVIEW-4.md`.
- Open with the owner: D55 (Pebble's decision keeps the name "Context Warping" off public material until its
  benchmark). The owner chose the name on screen in this session; the alternative is the mechanism without the name.
