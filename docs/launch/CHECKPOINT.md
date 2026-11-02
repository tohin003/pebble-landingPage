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

## Update, 2 Nov ~14:10 IST: round 4 fixes; masters next, round 5 on the delivered files

- Round 4's critic: `.work/launch/critic/REVIEW-4.md`, "fix then ship". The plan: `.work/launch/critic/FIXES-4.md`
  (N-3 declined there, with the reason).
- The owner keeps "Context warping." on screen and in the post, with D55 in view (2eaeee2); no numbers attached.
- Done:
  - M-1 (delivery limits at −4 dBFS, loudnorm linear, checks each file after AAC) and S-4 (the music one frame
    late: its beat grid was about 27 ms behind the file's transients) by the director, 46f653f.
  - P-OPEN-MEM: N-1 cf6e26f (the verb holds with the names to 8.05) and S-2 0b3d7f4 (4:5 Memory pull-back from
    52.6). Report: `.work/launch/critic/FIX4-P-OPEN-MEM.md`.
  - The post kit's thumbnail is now the 4.1-s frame, which shows the whole premise (619a4f8).
- Running (claude-w subagents): P-SWIPE (S02's Spaces swipe as a readable slide; S03's top band) and P-STEALTH (S09's
  push without "Connect a model", plus the 4:5 palette ≥ 40 px). Also the captions (`master/captions.ts` writes the
  SRT and VTT; brief `.work/launch/briefs/captions.md`).
- Next:
  - `final-pipeline.sh`, both aspects: masters, QA, delivery, thumbnails at 4.1 s.
  - Round 5's critic (`.work/launch/briefs/critic-r5.md`) on the masters and the delivered files. Its "ship" ends the
    loop.
  - Then the Desktop hand-off (`~/Desktop/Pebble 2.0 film/launch-film-2026-11-02/`) and site phase 2
    (`.work/launch/briefs/site2.md`).
- 15:52: every round-4 fix landed (`.work/launch/critic/FIXES-4.md`, "How the packages landed").
  - The director's ruling on S-1: nothing of Pebble's is ever painted out of a picture, not even to mimic macOS. The
    swipe is REVIEW-4's whip, from RS1-03's own poster Space into Chrome's Space (8a2d28a).
  - Captions: cff1d78. The final pipeline runs now; then round 5.

## Update, 2 Nov ~17:40 IST: the 4:5 is final; a Pebble-side HOLD stops the rest; round 5 in two phases

- The 4:5 master (`video/out/launch/LaunchFilm-4x5-master.mp4` and its `.wav` mix) passed `qa.sh --verify`: frames,
  pops and flash. Its LinkedIn file encoded linear (pass 2: −13.9 LUFS, −2.0 dBTP before AAC).
- The Pebble side's 17:32 HOLD (2.0.3's full proof, about three hours) stopped three things:
  - the LinkedIn file's after-AAC check;
  - the 4:5 web file and the thumbnails;
  - the 16:9.
- The 16:9's first attempt (15:52) failed at frame 792 on the 23-s paint-settle timeout. Both timeouts are 60 s now
  (f12ed93). It hasn't run again.
- A preview of the 4:5 LinkedIn file is on the owner's Desktop: `final-preview-4x5-2026-11-02/`, marked not signed
  off.
- Round 5's critic, phase A (`.work/launch/briefs/critic-r5-phaseA.md`): the 4:5 from its QA sheets and its mix, no
  heavy jobs. It writes `REVIEW-5.md` with a provisional verdict and a "Phase B: what I need" frame list.
- When the hold lifts, in this order:
  1. The 4:5's last steps:
     - the LinkedIn file's after-AAC ebur128 check (−14 ± 0.5 LUFS, ≤ −1 dBTP);
     - `thumbnail-4x5.png` at 4.1 s and `frame0-4x5.png`;
     - the critic's phase-B frames.
  2. Resume the critic for phase B. If it says "ship", the 4:5 goes to the Desktop straight away.
  3. The 16:9: `final.sh 16x9`, then `qa.sh --verify`, `deliver.sh 16x9` and its thumbnails.
  4. The 4:5 web file: `ONLY=web deliver.sh 4x5` (1c336c5).
  5. The critic's 16:9 check, then the 16:9 to the Desktop.
- ~17:50: the owner asked: "Also put the final film into the landing page replacing the older one."
  - Site phase 2 starts now, as a claude-w subagent. Its phase A covers code, text tracks and the budget plan, with
    no heavy jobs (`.work/launch/briefs/site2-phaseA.md`). Its handoff is `.work/handoffs/launch-site-2.md`.
  - Phase B comes after the hold, once the film's files exist: the encodes into `public/media/v3`, the loops, the
    checks and `next build`.
  - The 1.x trailer in `public/media/v2` is retired as part of the swap.
  - The film's caption track keeps "Context warping." (the film's words). The page's own text, its chapters and its
    descriptions keep the name out.
  - The page goes live only when the owner merges to main and deploys. Agents never push or deploy.
- ~18:50: round 5, phase A (`.work/launch/critic/REVIEW-5.md`) gave a provisional "ship" for the 4:5, with no MUST.
  - The director's decisions are in `.work/launch/critic/FIXES-5.md`. Round 5's polish went into both masters (8d2fbe0).
  - On LinkedIn the film is posted without the SRT. The captions are fixed for YouTube and the site (3273b38).
  - The 4:5 re-renders when the hold lifts. Scratchpad scripts `d5/post-hold-A.sh` and `d5/post-hold-B.sh` run in
    this order:
    1. A: tsc, then the 4:5's master, qa, LinkedIn file and thumbnails, then the critic's 330 frames, M3 and M4;
    2. the critic resumes for phase B on the 4:5;
    3. B: the 16:9, then the 4:5's web file and the critic's 16:9 frames.
  - The frame lists are in `.work/launch/critic/r5/phaseB-*.times`.

## Update, 2 Nov ~20:55 IST: after the hold; the 4:5 with the critic; the 16:9 rendering; Pebble 2.0.3 is out

- The Pebble side lifted the hold at 20:00 and published Pebble 2.0.3 at 20:21. 2.0.2 was never released.
- The 4:5 re-rendered with round 5's polish, 20:01–20:43, from HEAD (tsc clean).
  - `qa.sh --verify`: frames, pops and flash all pass. The master measures −15.9 LUFS with a +0.1 dBFS peak.
  - LinkedIn file: −14.0 LUFS and −1.9 dBTP after AAC, Linear. 13.35 Mb/s, under the 20M cap; 169 MB.
  - Thumbnails at 4.1 s: PNG and JPG, plus frame 0.
  - M3: SSIM 0.9943, PSNR 49.5 dB.
  - M4: the gain is flat at +1.91 dB. The limiter acts in five 100-ms windows: 8.0, 8.1, 18.2, 81.0 and 81.1 s.
  - The critic's 330 frames are in `r5/f45`. One FFmpeg select can't take 330 `eq()` terms, so `d5/extract-frames.sh`
    now joins runs into `between()` and decodes 40 terms at a time.
  - No Python on this Mac has numpy, so `d5/m4gain.py` is plain Python.
- The critic is on phase B for the 4:5 (it adds to REVIEW-5.md). If it says "ship", `d5/handoff.sh 4x5` puts the files
  on the owner's Desktop.
- `d5/post-hold-B.sh` is running (from ~20:51):
  1. the 16:9's master, qa, LinkedIn and web files, and thumbnails;
  2. the critic's 16:9 frames;
  3. the 4:5's web file.

  The critic's 16:9 check comes next, then `handoff.sh 16x9`.
- The site worker has a light job before phase B (`.work/launch/briefs/site2-2.0.3.md`): 2.0.3's release facts, CLAIMS,
  the Benchmarks section's line about the offered release, and the Stealth lines in the release notes' own words (D225;
  nothing about 2.0.2). Phase B starts once both masters are signed off.
- `CLAUDE.md` now describes the launch film (f943f74, with the owner's OK).

## Update, 2 Nov ~22:25 IST: the 4:5 is signed off and on the owner's Desktop; the 16:9 is with the critic; site phase B

- The session ended at ~21:01. The 16:9 render restarted at 21:03 in its own process session, so a session end can't
  stop it.
- Round 5 phase B, the 4:5: **fix then ship**, with one MUST.
  - MUST-1: in the Stealth recording, the desktop calendar's mask ran about 20 px onto Pebble's window, frosting the
    red close button until the leave.
  - Three frosts inside the window (Pebble's iCloud notice and two first-run "Connect a model" lines) made the
    description's "Pebble's own windows are never altered" untrue.
- The director's ruling: fix the film, not the sentence (0f1b7fe).
  - The mask stops at the window's outline (the take's x 311).
  - The in-window frosts are gone: none was private (TREATMENT §5).
  - No other scene masks inside Pebble's windows.
  - N-7 declined.
- Both pictures re-rendered with `final.sh --picture-only` (new; the mixes kept), by `d5/post-fix.sh`.
  - Gates pass on both.
  - Frame comparisons with the pictures before the fix: only f2177–f2191 under 45 dB; the rest is render noise.
  - LinkedIn files at −14.0 LUFS and −1.9 dBTP; web files at −16.0 LUFS.
- 22:01: the critic said **ship** for the 4:5. `handoff.sh 4x5` put it on the Desktop
  (`launch-film-2026-11-02/`), with its README:
  - post without captions;
  - listen once at 0:08, 0:17, 0:18 and 1:21.
- 22:23: the critic has the 16:9 (`r5/f169`, `r5/f169-fix`). On "ship", run `handoff.sh 16x9`.
- 22:23: the site worker starts phase B (`site2-phaseB.md`, its handoff's steps 0–13), in parallel with the 16:9's
  check. A 16:9 MUST would mean redoing only the 16:9-derived encodes.
- Pebble 2.0.3 on the page: 5c0aaaa (the worker) and ca77e52 (the director's plainer Benchmarks line). The post kit
  notes that its claims still hold for 2.0.3 (fd24103).

## Update, 3 Nov ~01:00 IST: done; the page waits on the owner's review and deploy

- The 16:9: the critic said **ship** at ~22:45 with no MUST (`VERIFICATION_LOOP.md`, "The result").
  - Its LinkedIn file is the N-8 encode (e0ff991): capped at 30 Mbit/s, Level 4.1, 19.6 Mbit/s on average.
  - `handoff.sh 16x9` put it on the Desktop beside the 4:5.
- The Desktop folder (`~/Desktop/Pebble 2.0 film/launch-film-2026-11-02/`) is the whole delivery: both LinkedIn files,
  the thumbnails (PNG and JPG), the SRT, `LINKEDIN_POST.md` and `README.txt`.
- `check.ts` now exits 0 on a plan that passes (0e427d5). `noFontFetch.ts` ignores the scenes' font fetch, which fails
  outside a browser.
- Site phase B, by the site worker. Commits d53a077, 487c246, 6ab6697, 2c31b51, dfc88e5, 1016657 and aee2e3e; its
  handoff's section "Phase B: done" has the details.
  - **The film set in `/media/v3`:** 1080 HEVC, 720 H.264, and the 4:5 phone cut in HEVC and H.264. It takes
    46.69 MB of the 50 MB cap. `hqdn3d=0:0:4:4` and aq-mode 3 keep the dark ground from blocking. The posters are
    frame 0.
  - **The clips:** eight cut from the film, 14 with the 4:5 cuts (19.27 MB), each checked frame by frame. The 1.x
    `loop-companion` and `loop-memory` are retired.
  - **The rest:** the chapters, the transcript and the extended description; the documents and
    `media-provenance.json`.
- The director's check, 00:05–00:50:
  - All 12 light checks pass on the committed tree:
    - typecheck;
    - 232 site tests and 82 engine tests;
    - video tsc and `check.ts`;
    - both caption checks;
    - the 1.x loops and `export-cues`;
    - `verify.mjs`, the loop plan and the copy lint.
  - I looked at every screenshot tile at 1440 and at 390.
  - `du -sh public`: 72M.
- The director's decisions:
  - **The 4:5 H.264 fallback stays at CRF 25.** At 1:1, S08's night and S09's dusk show a faint mottle where the master
    has grain. CRF 24 would cost 2.8 MB for one step.
  - **Memory's caption** now leads with "Shown with sample data.", like every other clip (8c015b7).
  - **`music.ts`:** edit A no longer flags the owner's download (9665fe7).
  - **The play button** stays above the poster's line (1016657). It is one value in `Film.module.css`.
- Cleanup, as the owner asked on 2 Nov. All four groups were deleted, the film's sources included.
  - Three runs by the cleanup agent (`.work/cleanup/MANIFEST.md`) and the director's last pass freed about 16.9 GiB.
    The data volume went from 14.07 GiB free to 37 GiB free.
  - **What is left:**
    - the Desktop delivery;
    - the git tree;
    - `video/out/launch/pebble-2.0-launch.srt` and `.vtt` (`build.mjs --check` reads the VTT);
    - the text records in `.work/`: the handoffs, the reviews, and the QA folders' `gates.txt` and reports.
  - **The film can't be re-rendered, and its site files and clips can't be re-encoded.** The takes, the music, the
    capture assets and the masters are gone. The Desktop's LinkedIn files (CRF 16) are the best copies left, and a
    re-cut would have to start from them. `loops.mjs --dry-run` still passes, but a real cut or `launch-site.sh`
    needs the masters.
  - After the cleanup, the 11 checks that don't need a build pass. The copy lint runs at the next `next build`
    (`.next` is deleted).
- Left for the owner:
  1. Review the page locally with `npm run build && npm start`.
  2. Merge `launch-2.0` into `main`, then push and deploy through Vercel. Agents don't push or deploy.
  3. Post the 4:5 on LinkedIn from the Desktop folder, with `LINKEDIN_POST.md`. Listen to it once first, at 0:08,
     0:17, 0:18 and 1:21.
- Another session's uncommitted files are still modified in the tree: `tools/audio/score2/*`,
  `video/src/film2/setpieces/ringBlock.ts` and `video/src/film2/tests/fix-round3.test.ts`. They are not the launch's,
  and they stay as they are.
