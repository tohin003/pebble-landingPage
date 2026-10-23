# FILM_SPEC — the Pebble launch film, its teaser and the feature loops

Lane E, 2026-10-23. **This file is the source of truth for the films** (gate G1). Lane G builds from it, and
`video/src/film/timeline.ts` is re-derived from it. Every frame number below comes from `tools/audio/beatmap.json`.
Captions live in `docs/film-captions.json`. Chapter timings live in `src/content/chapters.ts`.

Precedence: `OVERRIDES.md` > this file > `MASTER_PLAN.md` §5 > the research reports. Where this file departs from
MASTER_PLAN §5.1, §19 below says why.

Contents: 1 Grid · 2 Compositions and safe areas · 3 Type · 4 Worlds and layouts · 5 Bar map · 6 Shot list ·
7 Source-time maps · 8 On-screen text · 9 The pebble · 10 Cursor and clicks · 11 Sound effects · 12 Transitions ·
13 Captions and chapters · 14 Review frames · 15 Teaser T0 · 16 Loops · 17 Capture requests · 18 Copy deltas for
chapters.ts · 19 Departures from MASTER_PLAN · 20 Self-review (R5 §13.6) · 21 Alternate (scope challenge) and open
issues.

---

## 1. The grid

| Fact | Value (beatmap.json, id `original`) |
|---|---|
| Frame rate | **30 fps** (D7). Never 60: R5's 60 fps master is overridden |
| Tempo | 100 BPM, 4/4, **18 frames per beat, 72 per bar** |
| Length | **32 bars = 2,304 frames = 76.8 s** (frames 0–2303) |
| Beat k (0-based) | frame `18·k` |
| Bar n (1-based) downbeat | frame `72·(n−1)` |
| Reveal | bar 8, **frame 504** (16.8 s, 21.9 % in) |
| Riser | bars 6–7; its end sits on frame 504. The breath (an empty beat) is frames 486–503 |
| Final chord | D(add9) at **frame 2160** (bar 31), rings 144 frames to the end |
| Motif statements | bars 1, 8, 23, 29 (frames 0, 504, 1584, 2016) |
| Sections | hook 1–2, tension 3–5, build 6–7, reveal 8, proof 9–22, payoff 23–25, breakdown 26–28, end card 29–30, final 31–32 |

**Rules.**
- Every cut, click and layout change sits on a beat frame (a multiple of 18), and shots start on bar lines. Two
  deliberate exceptions follow an on-beat cause: the match cut on a click's rebound (f814, four frames after the
  f810 click) and the state swap at the end of a 12-frame dissolve (f1542). A support line or the URL may follow its
  headline by 3–6 frames; a line may start up to 3 frames early to land on its beat (T17).
- Frames are computed from the beat index, never by adding durations. Below, "bar n beat b" = `72(n−1) + 18(b−1)`.
- A move that must land on a hit starts 1–6 frames early (R5 §10.2). An entrance "lands" on the frame its first word starts.
- **Re-snap rule (music swap).** If `use_music.sh` swaps the bed, keep every event's (bar, beat, offset) and recompute
  frames with the new map. Offsets in frames stay as written, since they describe motion, not music.
- Seconds = frame / 30 (pebble cues are in seconds of absolute composition time).

## 2. Compositions and safe areas

| Composition | Size | Frames | Use |
|---|---|---|---|
| `LaunchFilm` | 1920×1080 | 2,304 | website film (−16 LUFS, D10), LinkedIn 16:9 master (−14 LUFS) |
| `LaunchFilmSquare` | 1080×1080 | 2,304 | LinkedIn feed (−14 LUFS, OVERRIDES §4) |
| `FilmTeaser` (T0) | 1280×720 | 240 | silent, seamless, in the film's poster frame (§15) |
| `FilmPoster` | 1280×720 | still | = T0 frame 0 |
| Loops L1–L4, L7, L8 | 1600×1000 | §16 | silent, seamless |

One timeline, one music bed, one caption track for both film compositions. Layout reads `useVideoConfig()`;
`video/src/motion/layout.ts` holds the numbers below.

| | 16:9 (1920×1080) | Square (1080×1080) |
|---|---|---|
| Text safe | x 96–1824, y 64–1016 | x 80–1000, y 80–1000 (stricter than OVERRIDES' 60) |
| **Caption band** (no kinetic type, no click target) | y > 918 | y > 918 |
| UI ROI inside a stage | ≥ 60 px from every frame edge | ≥ 60 px from every frame edge |
| Smallest UI text a viewer must read, after magnification | ≥ 28 px | ≥ 34 px (judged at 360 px wide) |
| Cursor height | 56 px | 52 px |

The caption band keeps the bottom 15 % free for player captions (website VTT, LinkedIn SRT). UI may bleed into it;
kinetic type and click targets may not.

## 3. Type

Faces: **Fraunces** (variable, `font-variation-settings: "SOFT" 100, "WONK" 0`, weight 350 to match the site,
never italic), **Inter** (variable), **Geist Mono** (URL only). From `video/public/fonts/` via `@remotion/fonts`.
No accent-coloured words (DESIGN.md). No trailing periods except the app's own tagline "A little help, right here."
(verbatim). ≤ 6 words per line. Lines are dead still once they land.

| Role | Face | 16:9 px | Square px | Colour |
|---|---|---|---|---|
| Wordmark `pebble` | Inter 650, tracking −0.035 em, lowercase | 216 | 172 | `#252C28` |
| Headline (sage field, full frame) | Fraunces 350, leading 1.05, tracking −0.02 em | 112 | 92 | `#FFFFFF` on sage |
| Side line (proof/tour column, end-card tagline) | Fraunces 350 | 92 | 92 (tagline 72) | `#252C28` |
| Support | Inter 500, tracking −0.01 em | 58 | 50 | `#5D665E` on light; `#FFFFFF` at 80 % on sage |
| CTA words | Inter 500 | 56 | 48 | `#5D665E` |
| URL | Geist Mono 500 | 52 | 44 | `#252C28` |
| Small print | Inter 400 | 32 | 34 | `#5D665E` |

Fit rule: if a line overflows its box at the listed size, step down 4 px at a time; never re-break a line differently
from §8. Check legibility at G1.5 at 360 px wide; if Fraunces 350 strokes break up after encoding, raise to 400 (never
above 440).

**Entrance vocabulary** (R5 §4; varied on purpose):
- **(A) blur-in:** per word, blur 6 px → 0 and opacity 0 → 1 over 5 frames, words 2 frames apart, no movement.
- **(B) ink:** per word, opacity 0.35 → 1 over 5 frames, words 2 frames apart. On light grounds the word inks from
  `#B0C2AE` to `#252C28`.
- **(C) mask line-rise:** each line rises `translateY(105%) → 0` inside its own clip box over 15 frames, `EASE.enter`,
  lines 4 frames apart.
- **(W) wordmark unroll:** a clip that opens from the pebble outward (right to left), 15 frames, `EASE.enter`.
- **Exit:** blur 0 → 8 px plus opacity → 0 over 6 frames (`T2.lineOut` 0.2 s), unless a shot's move takes the line.

## 4. Worlds, layouts and finish

**Worlds.**

| World | Look | Vignette | Grain |
|---|---|---|---|
| **Desktop** | the riverbed wallpaper (comp 2, rasterised plate `RiverbedPlate`), light; no menu bar in close framings | 6 %, `#13251B` | none (H8) |
| **Sage field** | arrives on the colour it is entered through (`#536B54`, the pebble's body; `#506E54` after S7c) and settles within 12 frames on the type ground **`#425643`**, with one radial glow `#B0C2AE` at **4 %**, radius 900 px, centre (0.5 W, 0.42 H), drifting ≤ 40 px over the shot. White type reads at ≥ 7:1 there (the lead's addendum to REVIEW-G2; on flat `#536B54` white is 5.8:1, and 4.8:1 at the old 15 % glow's peak). S4's and S9's sage, outside the flood, is the same type ground (lane G-fix; lane E to ratify) | 6 % | none |
| **Paper** (reveal, end card) | `#F8F9F6`; a pool of light: radial `#FFFFFF` at 70 %, radius 760 px (16:9) / 600 px (square), centred on the lockup | 6 % | none |
| **Window** (product UI) | a **stage**: a rounded viewport into Pebble's real UI (radius 28, `SHADOW.window`) on the desktop ground | **off** (never on white UI) | none |

Grain: off in every master by default (critic H8). If G2's 10 s sage-field test keeps it, 2 %, `soft-light`, seed
changing at 15 Hz (every second frame), film only.

**Layouts in the window world (proof and tour shots).**

| | 16:9: side split | Square: stacked |
|---|---|---|
| Text | column x 96–860, line block top y 300 | band x 80–860, line block top y 96 |
| Stage | x 920–1920 (bleeds off the right), y 64–1016, left corners radius 28 | x 24–1056, y 336 → bleeds off the bottom, top corners radius 28 |
| Pebble | foot (330, 900), size 210 | foot (940, 300), size 170 |
| Check-mark annotation (S5e) | centre (890, y of the Verified row), 56 px | none |

The same line breaks work in both aspects (column 764 px, band 780 px). The camera works *inside* the stage: a
framing is a magnification `m` (frame px per UI CSS px) plus a region of interest (ROI, UI CSS px of the 1160×800
window, or 1440×900 for the dashboard) fitted to the stage. Stage ROIs bleed; a ROI never extends past the captured
window (y ≤ 800).

**Pebble sizes** (`PebbleOnFilm.size`, the 220-unit viewBox box; the body is about 0.59 of it): desktop scenes at the
desktop's scale (148 desktop units, so 385 px at m 2.6, 222 px at m 1.5, 326 px at m 2.2); type worlds and the window
world 210 (16:9) / 170 (square).

## 5. Bar map

| Bar | Frames | Music | Shot | What happens | Chapter |
|---|---|---|---|---|---|
| 1 | 0–71 | hook, motif | S1a | the pebble on its desktop; the pointer arrives; click (f36); the quick chat opens | desktop |
| 2 | 72–143 | hook | S1b | the question is sent; Pebble thinks; the camera passes into the pebble (f126–143) | desktop |
| 3 | 144–215 | tension | S2 | "What did it change?" | desktop |
| 4 | 216–287 | tension | S2 | "Can I undo it?" | desktop |
| 5 | 288–359 | tension | S2 | "Did it run the tests?" | desktop |
| 6 | 360–431 | build, riser | S3 | "An agent shouldn't / grade its own work" | desktop |
| 7 | 432–503 | build, riser, breath 486–503 | S3 | the pebble rises into the sage field, looks up, anticipates, leaps | desktop |
| 8 | 504–575 | **reveal**, motif | S4 | lands as the full stop of `pebble`; paper floods out; "A small companion for your Mac" | desktop |
| 9 | 576–647 | proof | S4 | the lockup holds; the wordmark rolls back into the pebble; it leaps (f634) | desktop |
| 10 | 648–719 | proof | S5a | mid-leap cut into the window world; "Reading invoice_kit/dates.py"; "It reads your project" | project |
| 11 | 720–791 | proof | S5b | the approval card arrives; "Review," | project |
| 12 | 792–863 | proof | S5b | Apply edit (f810) → Done, Undo this edit; "apply," "undo" | project |
| 13 | 864–935 | proof | S5c | both edits in; AgentGuard holds the task (f931) | tested |
| 14 | 936–1007 | proof | S5c | "AgentGuard checks the evidence"; Run the tests (f990) | tested |
| 15 | 1008–1079 | proof | S5d | the "Run isolated tests" card; "Tests run in an isolated copy" | tested |
| 16 | 1080–1151 | proof | S5d | Run tests (f1080); the tests run | tested |
| 17 | 1152–1223 | proof | S5e | **"Verified · pytest 42 passed on current files"** (f1152); happy; "Evidence before done" | tested |
| 18 | 1224–1295 | proof | S6a | Settings (f1224) › Models; "Your model, your choice" / "Even one on your Mac" | model |
| 19 | 1296–1367 | proof | S6a/S6b | Permissions tab (f1332) | model → pace |
| 20 | 1368–1439 | proof | S6b | Auto in project (f1404); "You set what it may do" | pace |
| 21 | 1440–1511 | proof | S6c | Memory tab (f1440): the six layers; "Memory you can read and forget" | memory |
| 22 | 1512–1583 | proof | S6c | forget a record (f1530) | memory |
| 23 | 1584–1655 | **payoff**, motif | S7a | the Lisbon trip budget dashboard; "Views, not just text" | views |
| 24 | 1656–1727 | payoff | S7b | the chart becomes the world | views |
| 25 | 1728–1799 | payoff | S7c | the datetime quiz; the camera passes into its chosen answer | views |
| 26 | 1800–1871 | breakdown | S8 | "Free and open source" / "Apache-2.0" | open-source |
| 27 | 1872–1943 | breakdown | S8 | "No telemetry" | open-source |
| 28 | 1944–2015 | breakdown | S8 | "Your keys stay in your Keychain" (from f1941) | open-source |
| 29 | 2016–2087 | end card, motif | S9 | the pebble lands; `pebble` lockup on paper | get |
| 30 | 2088–2159 | end card | S9 | "A little help, right here." | get |
| 31 | 2160–2231 | **final chord** | S9 | "Free for Macs with Apple silicon" + `github.com/tohin003/Pebble` | get |
| 32 | 2232–2303 | final chord rings | S9 | hold; small print | get |

Beat shares: hook 6.3 %, tension 9.4 %, build + reveal 12.5 %, proof 40.6 % (AgentGuard climax at 50 %), payoff 9.4 %
(starts at 68.8 %), claims 9.4 %, end card 12.5 %.

## 6. Shot list

Shots tile the film on bar lines: **S1** 0–143, **S2** 144–359, **S3** 360–503, **S4** 504–647, **S5** 648–1223,
**S6** 1224–1583, **S7** 1584–1799, **S8** 1800–2015, **S9** 2016–2303. Sub-beats (S5a…) are inside a shot. Text ids
(T…) are in §8, pebble cues in §9, sound effects in §11, seams in §12, review frames in §14. Focal points are frame
px (16:9 / square).

### S1 Hook (0–143) — desktop world, chapter `desktop`

**S1a, the pebble on its desktop (0–71).**
- **Frame 0 is the thumbnail:** the riverbed desktop, close; the pebble large (m 2.6, size 385), idle, eyes open
  (first blink at f42). No cursor yet, no text.
- **Camera C0 (f0–39):** m 2.6. Pebble centre at (1300, 640) / (640, 620).
- **Cursor:** starts off-frame upper left, (−70, 210) / (−70, 160), at f2; minimum-jerk arc to the pebble, arriving
  at f28; dwell f28–35; **click-down f36** (beat 2). The eyes follow the pointer (computed look cues, §9). Pose
  `hover` when the pointer enters the pet window (≈ f22; keep it ≥ 14 frames before the tap, the engine's 0.45 s
  expression morph), `tap` at f36.
- **f36:** the real quick chat (`pet-live-error`, avatar hidden, §7.1) appears on the click frame, as the app opens it
  (no expand animation exists). Source 0.60 s.
- **Camera C0 → C1 (f40–63):** log-space zoom m 2.6 → 1.5, `EASE.camera`, starting 0.13 s after the click (secondary
  move). C1: the 384×456 chat panel at x 940–1516, y 150–834 / x 252–828, y 150–834; pebble centre (1430, 746) /
  (742, 746).
- **Cursor** fades out f44–48 (it stops acting).
- **f64–71:** hold on the open chat: "Small companion. / Room for big ideas." (the app's own greeting, 28.5 px).
- Focal: f0–35 the pebble (1300, 640) / (640, 620); f36–71 the greeting (1100, 370) / (400, 370).

**S1b, the question is sent (72–143).**
- **f72 (bar 2): hard cut, punch-in** to C2: m 2.2; the panel at x 660–1505 / 118–963, its CSS y 36 at frame y 72;
  pebble centre (1379, 866) / (837, 866). The ellipsis skips the typing: the question is already sent. Source 3.35 s →
  4.50 s (0.53×): the bubble "What does 'day is out of range for month' mean?", header "● Thinking", "Task: running".
  Pose `thinking` (thought dots) at f72.
- **f131–143: zoom through the pebble** (lane G-fix, REVIEW-G2 P1-2: was f126–138 plus five solid frames, which landed
  the dive 5 frames before the bar and the whoosh 7 frames late). Aim at a body point clear of the eyes (G2a: (−36, −10)
  viewBox units from the body's centre). Log-scale zoom ×1 → ×30, `EASE.exit` (accelerating), the aim point drifting to
  the frame centre on `EASE.camera`. The body's `#536B54` fills the frame **on f143**; the world changes on f144 with
  the whoosh's peak. Zoom blur only on f141–143 (≤ 20 px). C2's pebble sits at y 921 (both aspects; P1-8), so the chat's
  top edge is 65 px under the frame's top.
- Focal: f72–125 the bubble (1100, 230) / (560, 230); f126–143 the aim point → frame centre.

### S2 Questions (144–359) — sage field, chapter `desktop`

- **f144: seam by zoom-through** (the pebble's own sage becomes the world). Whoosh peaks f144 (picture f143 + 1).
- Three neutral questions a careful person asks of any AI helper (OVERRIDES §2), one per bar. **They build a list**
  (REVIEW-G2 P1-6, lane G-fix): left-aligned, the block centred on its widest line, line centres y 350 / 470 / 590
  (16:9) and 360 / 470 / 580 (square). Each inks in whole ((B), all words together), starting 3 frames before its
  downbeat (§1), so it reads at full contrast on the beat: **T1** "What did it change?" (f144, the seam), **T2** "Can I
  undo it?" (f213 → f216), **T3** "Did it run the tests?" (f285 → f288). As a question arrives, the one before dims to
  45 % and stays; the current one is white at ≥ 7:1 (the lead's addendum). All three blur out together f348–354.
- They are ordered as the film answers them: the approval card answers T1 and T2 (S5b); AgentGuard answers T3
  (S5c–S5e), and T3 sets up the intent line.
- Focal: (960, 470) / (540, 470).

### S3 Build (360–503) — sage field, chapter `desktop`

- **f360: T4** "An agent shouldn't" / "grade its own work" (the one allowed comparative framing, as intent; OVERRIDES §2),
  entrance (C), block centred, centre y 420. Exit f462–467. The riser runs under bars 6–7.
- **f432: the pebble rises in** (hop H1 from off-frame below to foot (960, 880) / (540, 880), lands f447), dark palette
  (`#B4CDA6` body, `#23351F` eyes) because the ground is sage. f440 it looks up at the line.
- **f481:** eyes lead toward the lockup spot; **anticipation f486–490**, take-off f490 (H2), flight 0.467 s.
- Focal: f360–431 the line (960, 420) / (540, 420); f432–503 the pebble.

### S4 Reveal (504–647) — paper world, chapter `desktop`

- **f504: the reveal.** The pebble lands as the full stop of `pebble`: foot (1295, 422) / (806, 402), landing squash
  2 frames, `jelly` recovery; pose `tap`. Soft hit + thud peak f505; the bed ducks 2.5 dB.
- **Colour flood:** paper (`#F8F9F6`) spreads from the landing point as a circle, radius 0 → 1,453 px / 1,053 px plus a
  24 px feather, f504–517, `EASE.enter` (the impact pushes the light out). The pebble's light palette (`#536B54`,
  `#FFFFFF`) is revealed by the same mask, so it changes with the light.
- **(W) wordmark** `pebble` (Inter 650, 216 / 172) unrolls leftward out of the pebble f506–520, with the film's one
  tracking settle (+0.04 em → −0.035 em, f506–529). Baseline y 420 / 400; the group (word + pebble) centred.
- **T5** "A small companion for your Mac" (support, (A)), baseline y 560 / 530, in f522, out f612.
- Bar 9 (f576): the proof groove starts under the held lockup. Pose `idle` at f540.
- **f614–628:** the wordmark rolls back into the pebble (reverse unroll, `EASE.exit`). f624 the eyes lead down-left.
- **f629–634 anticipation, take-off f634 (H3),** flight 0.6 s toward the window world's pebble spot; **the cut at
  f648** falls at u = 0.78 of the flight (§12).
- Light leak: optional, off by default (at most one in the film; if used, sage-tinted, f504–527, ≤ 35 %).
- Focal: the lockup (960, 380) / (540, 360); f522–611 the support line; f629–647 the pebble in flight.

### S5 Window (648–1223) — window world, chapters `project` (648) and `tested` (864)

Layout §4 (side split / stacked). Source: `main-live-film` recorded at 3× (§7.2). The pebble keeps the spot
(330, 900) / (940, 300) from its landing at f652 to the end of S7a, acting the app's real poses.

**S5a Reads (648–719).**
- **f648: the pebble carries across** (match cut on action, mid-flight); it lands f652; pose `reading`.
- Stage: 16:9 m 2.6, ROI x 350–735, y 40–406 (fills the stage); square m 2.65, ROI x 350–712, y 120–401. The request
  bubble ("The CSV export crashes for invoices issued on the 31st: ValueError: day is out of range for month. Can you
  find the bug and fix it?") and the status line "Reading · Reading invoice_kit/dates.py · 4 s".
- Source 3.85 → 4.73 s at 0.5× (f648–701) so the Reading detail stays ≥ 1.2 s; 4.73 → 5.93 s at 2× (f702–719).
- **T6** "It reads" / "your project", in f666 (beat 37), out f718. Pose `editing` at f711 (inside the f708–714
  blink).
- Focal: the status line (980, 589) / (300, 650); the line (420, 390) / (400, 190).

**S5b Review, apply, undo (720–863).**
- **f720–743:** the camera follows "Preparing an edit" into the Details drawer, which opens at f722 (source 6.0), and
  arrives on the `invoice_kit/dates.py` card's upper part (header, lead, the diff's first lines). 16:9 m 2.4, ROI
  x 810–1150, y 205–602; square m 2.65, ROI x 817–1143, y 205–486. Pose `review` ("!") at **f756** (with "Review,"),
  after the camera move, so the morph plays on a still frame (REVIEW-G2 P1-4, lane G-fix): the app shows it while an
  edit waits.
- **T7** builds word by word with the verbs: "Review," at f756; "apply," at f811; "undo" at f830 (line 1
  "Review, apply,", line 2 "undo").
- **f774–797:** the camera tilts down to the card's lower part as the pointer enters (16:9 ROI y 404–800; square
  ROI y 519–800), so **Apply edit** sits at y ≈ 755 / 794, above the caption band. Apply edit becomes active at f786
  (source 8.13), as in the app.
- **Cursor** enters f780 from the stage's lower right, arrives by f803, **click-down f810** (source 9.40). Press
  f810–813: the button 0.97 and 4 % darker, drawn over the frozen 9.40 frame.
- **f814: match cut on the click** to the frozen 11.05 s frame: the same card, now in Earlier actions with "Done" and
  **Undo this edit**, aligned so its button row sits where Apply edit was; it arrives at 1.04× and settles on
  `SPRING.calm`. The card's width is identical (both frames come from one recording). Pop peaks f815.
- **Square, lower framing** (REVIEW-G2 P0-2, lane G-fix): drawer m 2.9 on cy 617 (y 488.7–745.3), so the next card's
  header and status ("tests/test_dates.py · Needs your review", then "· Done" on the match cut's frame) stay below the
  frame: one click never shows two edits applied. The pointer clicks Apply edit's upper half (css y 689, frame y 917).
- **Callout ring** on "Undo this edit": 3 px `#506E54`, offset 15 px (lane G-fix, REVIEW-G2 P2-12: at 8 px it read as a
  focus ring), radius = button radius + 15, drawn on f826–837
  (stroke-dashoffset, `EASE.enter`), fades f852–857. The one callout of the shot; it draws on, so it reads as an
  annotation, not a focus ring.
- Cursor drifts away and fades f826–830. T7 exits f858.
- Focal: f720–773 the diff (1420, 400) / (540, 600); f774–809 Apply edit (1650, 755) / (860, 794); f814–863 Undo this
  edit (1215, 755) / (330, 794).

**S5c Held (864–1007).**
- **f864: hard cut** (chapter `tested`) to the conversation, on the framing of the whole held run (**stage 1**, REVIEW-G2
  P0-1, lane G-fix): 16:9 m 2.03, ROI x 228–720.6, y 324–793; square m 2.2, ROI x 242.7–711.8, y 420.5 → the frame's
  bottom. The whole block shows: the avatar, "Blocked", the full sentence and all three choices ("Details" just
  outside), with clean edges (16:9: top between the reply and the notice, bottom between the composer's footer and the
  window's edge; square: the block 61 px from both sides). Pose `thinking`.
- Source re-keyed (§7.2): 2.5× through the streaming reply "Both edits are in: …"; the notice "Verification remains
  incomplete: Pebble changed dates.py, test_dates.py but did not run the tests that cover them." at f888; **at f890
  AgentGuard holds the task**: "Blocked" and "Pebble's change isn't verified yet. · 2 file(s) changed and no tests were
  run, but 1 test file(s) cover this code: ["tests/test_dates.py"]. Run them (RunTests) before finishing and report what
  they said." with **Run the tests / Ask Pebble to finish / Accept as unverified** (all verbatim, real). The app scrolls
  it into view at 1× (f896–914); from f914 the run is settled (only its small avatar animates) until the click: 76
  frames, 2.5 s. Pose `blocked` at f890 (26 frames after `thinking`).
- **f954–977: stage 2**, a push-in on `EASE.camera` to read it, held to the cut at f1008: 16:9 m 3.16, ROI x 222–538.5,
  y 392–693.3; square m 3.28, ROI x 222.6–537.2, y 420.8 → bottom. "Blocked", the sentence (ink 35 px in 16:9, 36 px in
  the square; it runs off the right edge) and Run the tests, with Ask Pebble to finish whole and Accept as unverified
  wholly outside: the edge falls in the 9 px between them, so no choice is ever sliced.
- **T8** "AgentGuard checks" / "the evidence", in **f936** (the bar-14 downbeat, with the run in view), out f1038.
- **Cursor** enters f960, arrives by f985, **click-down f990 on Run the tests** (source 16.0, 1:1). Run the tests is
  at frame (1301, 627) / (337, 797). At f993–996 the "Run isolated tests" card arrives in the drawer; pose `review` at
  f995.
- Focal: f864–930 the notice (1180, 200) / (500, 560); f931–989 "Pebble's change isn't verified yet." (1170, 480) /
  (560, 640); f990 the button.

**S5d Tests (1008–1151).**
- **f1008: hard cut** (lane G-fix, REVIEW-G2 P2-1: from stage 2 a camera move would travel about 200 px a frame) to the
  drawer's "Run isolated tests" card the click just put there (16:9 m 2.8, ROI x 802.9–1160, y 213.5–553.5, the whole
  card; square m 2.9, its upper part). Source 16.57 → 17.34 s, 1×; then
  a 0.25× crawl to 17.74 s (f1032–1079) so the card holds: **"Runs the project's tests in a temporary copy. Your
  project files don't change."** and "pytest in a temporary project copy. Network and original project writes are
  blocked." (real strings; no invented counter, C3).
- **T9** "Tests run in" / "an isolated copy", in f1044, out f1140.
- **Cursor** enters f1050, arrives by f1075, **click-down f1080 on Run tests** (bar 16; source 17.80). Square only: the
  camera tilts down f1050–1073 (ROI y 300–581) so Run tests sits at y ≈ 895.
- **f1080–1151:** source 17.80 → 20.55 s (≈1.16×). With capture request R2 (§17) the drawer scrolls to its newest
  steps: "Approved: Requesting isolated tests", then **"Requesting isolated tests"** (pose `testing` at f1094, tick
  f1094) and its finished form **"Requesting isolated tests · 11 s"** (f1146).
- Fallback without R2: f1086–1109 the camera follows to the conversation's status line "Testing · Stop"; at f1152 a
  punch-in cut to `main-done-timeline@3x` on the conversation's timeline rows (same row text), the Verified row revealed
  by a mask at f1152.
- **16:9, f1116–1139:** once R2's scroll has settled, the camera tilts down to y 324–655.7 (m 2.87), so "Not verified · 2
  changed files, no tests run" and "Verification remains incomplete" have left the top before Verified lands (REVIEW-G2
  P1-5, lane G-fix). The square's framing already leaves them out.
- Focal: the card's lead (1400, 225) / (540, 450); Run tests (1677, 880) / (900, 895); then the newest row.

**S5e Verified, the climax (1152–1223).**
- **f1152 (bar 17): "Verified · pytest 42 passed on current files · 2 s"** appears (source 20.60). Shimmer peaks
  f1153. The run is not finished yet: Pebble writes its final reply (pose `writing` at f1161, source 20.90), and the
  run completes at f1204 (source 22.33), when the app's pebble turns **`happy`**: the film's one celebration, held
  4.5 s as in the app (to f1339). The celebration lands as the pull-back reveals the finished reply.
- **T10** "Evidence before done" (one line), entrance (B) ink, in f1152, out f1212.
- **Check mark** (16:9 only): a stroked check, **72 px, 8 px** `#506E54`, round caps, centred at (**860**, y of the
  Verified row), outside the UI with 24 px clear of the stage (C3; REVIEW-G2 P1-5, lane G-fix); drawn on f1152–1162,
  `EASE.enter`.
- **Exit move f1188–1211:** the camera pulls back to m 1.3 (16:9 ROI x 340–1110, y 0–732; square ROI x 366–1160,
  y 0–572). The final reply streams: "The tests ran in an isolated copy of your project: 42 passed. Both edits are
  verified, and the CSV export works again for invoices issued on the 29th, 30th and 31st."
- **Cursor** enters f1196 from the right, arrives by f1219 on the window's Settings button (the gear, CSS (1036, 32);
  frame (1758, 102) / (895, 378)), **click-down f1224**.
- Focal: f1152–1187 the Verified row (1400, row y) / (560, row y); f1188–1223 the finished reply and the gear; the
  happy pebble at f1204 in the column.

### S6 Settings (1224–1583) — window world, chapters `model` (1224), `pace` (1332), `memory` (1440)

Stills `settings-*@3x` (real, light). 16:9 m 2.0, ROI x 336–836 (the modal's content, so the bins at x 799 stay
74 px inside the frame edge); square m 2.27, ROI x 346–769 (S6c's records: m 2.08, x 343–805). Each tab change is a
**match cut on the click**: the frame holds still and the content changes, as a tab does.

**S6a Your model (1224–1331).**
- **f1224: match cut on the Settings click** to `settings-models@3x`; it arrives at 1.04× and settles (`SPRING.calm`).
  ROI y 96–572 / 100–428: the tabs, "YOUR MODELS", the row "FrogNano-4B-2609-Q4_K_M · On this Mac (GGUF file) · …",
  **Add a model file / Connect provider / Rest model**, **Continue with ChatGPT**.
- **T11** "Your model," / "your choice" in f1242; **T11s** "Even one on your Mac" (support) in f1260; both out f1320.
- Pose `happy` (since f1204) until f1339, then `idle`. The eyes follow the pointer (the app's gaze rule).
- Cursor moves f1300–1326 to the **Permissions** tab, **click-down f1332**.
- Focal: the model row (1290, 406) / (540, 560); the tabs (Permissions at (1240, 134) / (500, 406)).

**S6b You set the pace (1332–1439).**
- **f1332: match cut** to `settings-permissions@3x`: "HOW PEBBLE ACTS", **Ask for approval** (selected), **Auto in
  project**, **Full access**, each with "Runs without asking: …" / "Always asks: …" (verbatim). Square only: tilt down
  f1338–1361 to ROI y 200–528 (the Auto radio at y ≈ 810).
- **T12** "You set what" / "it may do", entrance (C), in f1350, out f1428.
- Cursor f1370–1398 to **Auto in project**, **click-down f1404** → match cut to `settings-permissions-auto@3x` (critic
  C8): the selection is now Auto in project.
- Cursor f1412–1434 to the **Memory** tab (square: tilt back up f1408–1431), **click-down f1440**.
- Focal: the Ask and Auto cards (1400, 600) / (540, 700).

**S6c Memory you can read and forget (1440–1583).**
- **f1440: match cut** to `settings-memory@3x`: "Remember useful context" and **the six layers** (Working context,
  Past experiences, Facts & knowledge, Procedures, Time-sensitive information, Your preferences).
- **T13** "Memory you can" / "read and forget", in f1458, out f1578.
- **f1476–1499:** the camera pans down to the records (16:9 ROI y 324–800; square m 2.08, ROI x 343–805, y 442–800;
  31 px UI text in the square, the one place below 34 px).
- Cursor f1500–1525 to the bin icon next to "Uses metric units and 24-hour times." (its accessible label is "Forget
  this memory"; no tooltip is drawn), **click-down f1530** at (1846, 850) / (1008, 908).
- **f1530–1541:** the record dissolves: opacity 1 → 0 and blur 0 → 4 px, `EASE.exit`. **f1542:** swap to
  `settings-memory-forgotten@3x` (the app re-renders at once: the next record, "In invoice-kit, keep public function
  names stable.", takes its place). Pop peaks f1543. Cursor fades f1550–1555.
- Focal: the six layers (1400, 490) / (540, 600); the record (1300, 850) / (540, 860).

### S7 Views, the payoff (1584–1799) — chapter `views`

**S7a The dashboard (1584–1655).**
- **f1584 (bar 23, motif): hard cut to the ask** (REVIEW-G2 P1-7, lane G-fix): the stage shows `main-dashboard@3x`
  (the 1440×900 window) on the request "Turn my Lisbon trip spending into a dashboard: what I've spent, by category, and
  what's left to book." and the reply's first lines (16:9 m 2.83, ROI x 284–637.4, y 84–420.4; square m 2.92, ROI
  x 284–637.4, y 76 → bottom, the request bubble in focus and the rest under a veil). **f1602–1625:** the camera moves on
  van Wijk's path to the canvas **"Lisbon trip budget"** with its tiles and the "Spending by category" chart (16:9
  m 1.255, x 643.2–1440; square m 1.295), and holds to f1655: the ask, then the view, then the chart becomes the world.
- **T14** "Views," / "not just text", in f1584 (with the cut, on the motif); the world move takes it at f1656.
- The pebble (idle) looks at the view.
- Focal: the canvas title and tiles (1450, 300) / (540, 520).

**S7b The chart becomes the world (1656–1727).**
- **f1656: object becomes the world.** The "Spending by category" panel grows from its place in the stage to
  full-bleed over 20 frames (f1656–1675, `EASE.move`), its corner radius → 0; everything else (the stage frame, the
  column, the line, the pebble) blurs to 15 px and fades over 9 frames. End framing: 16:9 m 2.56 centred on CSS
  (1041, 640); square m 2.26 centred on (1041, 661). The bars and their labels (Flights, Stay, Food, Tours, Transit,
  Other; Planned, Spent) are the world; no bar animates (data never bounces, and the app draws no growth). Whoosh peaks
  f1666.
- Hold f1676–1727, dead still.
- Focal: the tallest bar, "Stay" (900, 450) / (500, 480).

**S7c The quiz (1728–1799).**
- **f1728: hard cut** to `main-quiz@3x`, full frame (lane G-fix, P1-8: 16:9 cy 397.7, square cy 406, so the label
  "QUIZ · CHECKED BY PEBBLE" sits 81 px and the title 141 px under the frame's top): "Python datetime check-in", "QUESTION 1 OF 5", **"What does
  date(2026, 1, 31) + timedelta(days=1) return?"** with A date(2026, 2, 1) selected, B, C, D. 16:9 m 2.6, ROI
  x 735–1145, y 330–665; square m 2.4, ROI x 735–1135, y 330–640. (The question rhymes with the film's bug.)
- **f1786–1799: zoom through the selected answer's "A" badge** (`#506E54`): aim inside the badge and away from the white
  "A" (G2a: (765, 457.3)); ×1 → ×90, `EASE.exit`; the badge fills the frame **on f1799** (lane G-fix, P1-2), the world
  changes on f1800 with the whoosh's peak. From f1794 the badge's colour covers its white "A" under the zoom blur (P2-7).
- Focal: the question (960, 300) / (540, 330); f1782–1799 the badge → frame centre.

### S8 Claims (1800–2015) — sage field, chapter `open-source`

- **f1800: seam by zoom-through.** The ground starts at the badge's `#506E54` and eases to the type ground `#425643`
  by f1812 (§4). Whoosh peaks f1800 (picture f1799 + 1).
- **The facts build a list** as the questions do (REVIEW-G2 P1-6, lane G-fix; left-aligned, the block centred on its
  widest line; each inks in whole; earlier items dim to 45 %): **T15** "Free and open source" (f1800) with **T15s**
  "Apache-2.0" (support, f1806); **T16** "No telemetry" (f1869 → f1872, bar 27); **T17** "Your keys stay in your
  Keychain" (f1923 → f1926, beat 107; one line in 16:9, two in the square). Centres y 300 / baseline 435 / 545 / 685
  (16:9) and 280 / 395 / 500 / 680 (square). The list leaves together f1998–2004, before the end card's pebble enters
  the frame (≈ f2005), so it never crosses a line (P1-3).
- Focal: (960, 450) / (540, 450).

### S9 End card (2016–2303) — paper world, chapter `get`

- **The pebble carries in:** a second pebble instance starts off-frame lower right, (2050, 1180) / (1180, 1180), dark
  palette; eyes lead at f1999; take-off f2002 (H4); **lands f2016 (bar 29, motif)** as the full stop at (1295, 422) /
  (806, 402): squash, `jelly`, pose `tap`. Pop and thud peak f2017; the bed ducks 1.5 dB.
- **Colour flood** sage → paper from the landing point (same as the reveal, deliberately: the visual motif repeats
  with the musical motif), f2016–2029; the palette changes with the light.
- **(W)** `pebble` unrolls out of the pebble f2018–2032 (no tracking settle this time).
- **T18** "A little help, right here." (side-line size, (A)), in f2088, holds to the end. Baseline y 560 / 520.
- **f2160 (bar 31, the final chord): T19** "Free for Macs with Apple silicon" (CTA words, (C)) baseline y 690 / 630
  and **T20** `github.com/tohin003/Pebble` (URL, (C), f2164) baseline y 770 / 700. 26 characters, held 4.8 s.
- **f2196: T21** "Shown with sample data" and **T22** "Pebble's character engine: bloub by Jérémy Perret (MIT)" (small
  print, fade 9 frames), baselines y 852 / 892 (16:9) and 820 / 860 (square).
- The pebble: `idle` at f2052; glances at the URL at f2166; looks at the viewer at f2214 to the end. **Last frame
  f2303: everything landed, the eyes open** (the last blink ends f2278).
- Focal: f2016–2087 the lockup (960, 380) / (540, 360); f2088–2159 the tagline; f2160+ the URL (960, 750) /
  (540, 690).

## 7. Source-time maps (real UI sequences)

Film frame → source seconds of the vclock recording. Between keys, play linearly. A speed below 1 repeats frames; above
1 skips frames. Never reverse. A jump is allowed only on a cut. Lane G checks every listed event on the recorded frames
and nudges the keys (± 3 frames) if an event lands elsewhere; the click frames do not move.

### 7.1 `pet-live-error` (S1), recorded at 3× with the avatar hidden (R1)

| Film frames | Source s | Speed | What is on screen |
|---|---|---|---|
| 0–35 | — | — | the collapsed pebble is `PebbleOnFilm` on the desktop; the capture is empty |
| 36–71 | 0.60 → 1.28 | ≈0.63× | the chat open on the click frame; the greeting (typing starts at 1.30 s and is never shown) |
| 72–143 | 3.35 → 4.50 | ≈0.53× | (cut) the sent question, "Thinking", "Task: running" |

`PebbleOnFilm` is composited at the hidden avatar's box (measure it on the frames: in the 384×456 panel the pebble's
centre is about (327, 401) CSS px), so one engine-drawn pebble carries the whole film and the zoom-through stays vector-
sharp.

### 7.2 `main-live-film` (S5), recorded at 3× (R2), source 3.8–23.0 s

| Film frames | Source s | Speed | Key events (source s → film frame) |
|---|---|---|---|
| 648–701 | 3.85 → 4.73 | 0.5× | "Reading · Reading invoice_kit/dates.py" on screen ≥ 1.2 s; reading ends 4.70 → f700 |
| 702–719 | 4.73 → 5.93 | 2× | Thinking; "Editing" 5.50 → f713 |
| 720–791 | 5.93 → 8.30 | 1× | drawer and cards 6.00 → f722; Apply edit active 8.13 → f786 |
| 792–810 | 8.33 → 9.40 | ≈1.69× | the card is static; **click Apply edit 9.40 → f810** |
| 810–813 | 9.40 | freeze | press state drawn over the frame |
| 814–863 | 11.05 | freeze | (match cut) the Done card with Undo this edit, before new steps push it down at 11.10 |
| 864–1007 | 11.80 → 16.57 | 2.5×, 1×, 0.35×, 1× | (cut) 11.80 → 14.50 s over f864–896 (2.5×: notice 13.80 → f888, **held 14.03 → f890**); the app's scroll 14.50–15.10 → f896–914 (1×); the settled run 15.10 → 15.97 over f914–989 (0.35×; only its avatar animates); **click Run the tests 16.00 → f990** (press over 15.97, f990–993); tests card 16.10–16.20 → f996–999. Re-keyed by lane G-fix (REVIEW-G2 P0-1) |
| 1008–1031 | 16.57 → 17.34 | 1× | camera to the tests card |
| 1032–1079 | 17.34 → 17.74 | 0.25× | the card holds |
| 1080 | 17.80 | — | **click Run tests** |
| 1080–1151 | 17.80 → 20.55 | ≈1.16× | testing 18.35 → f1094; "· 11 s" 20.40 → f1146 |
| 1152–1223 | 20.60 → 22.97 | 1× | **Verified row 20.60 → f1152**; final reply 20.90–22.10 → f1161–1197 |

Disk: about 580 frames at 3× (≈ 0.5 MB each, ≈ 300 MB), plus about 140 pet frames; record just in time and delete after
the master passes G3.

### 7.3 Stills (S6, S7, and the S5d fallback)

`settings-models@3x`, `settings-permissions@3x`, `settings-permissions-auto@3x`, `settings-memory@3x`,
`settings-memory-forgotten@3x`, `main-dashboard@3x`, `main-quiz@3x`, fallback `main-done-timeline@3x` (all exist in
`video/public/ui/`).

## 8. On-screen text

`in` = the frame the first word (or line) starts; `out` = the frame the exit starts (gone 6 frames later). Hold =
out − in, checked against `holdFor` (0.5 s + 0.3 s per word, ≥ 1.2 s; the last line of a shot ≥ 2 s; the end card's key
lines readable twice: ≥ 2 s and 0.6 s per word). Positions are given for 16:9 / square.

| Id | Text (line breaks shown with /) | Shot | Role, entrance | in | out | Hold (s) / needed | Position |
|---|---|---|---|---|---|---|---|
| T1 | What did it change? | S2 | headline, (B) whole, list item | 144 | 348 (dims from 213) | 6.80 / 1.70 | list, centre y 350 / 360 |
| T2 | Can I undo it? | S2 | headline, (B) whole, list item | 213 | 348 (dims from 285) | 4.50 / 1.70 | list, centre y 470 |
| T3 | Did it run the tests? | S2 | headline, (B) whole, list item | 285 | 348 | 2.10 / 2.00 | list, centre y 590 / 580 |
| T4 | An agent shouldn't / grade its own work | S3 | headline, (C) | 360 | 462 | 3.40 / 2.60 | centred block, centre y 420 |
| W1 | `pebble` (wordmark, the pebble as its full stop) | S4 | wordmark, (W) | 506 | 614 (rolls back) | — | baseline y 420 / 400 |
| T5 | A small companion for your Mac | S4 | support, (A) | 522 | 612 | 3.00 / 2.30 | centred, baseline y 560 / 530 |
| T6 | It reads / your project | S5a | side line, (A) | 666 | 718 | 1.73 / 1.70 | column / band top-left |
| T7 | Review, apply, / undo | S5b | side line, word by word with the verbs: 756, 811, 830 | 756 | 858 | 3.40 / 1.40 | column / band |
| T8 | AgentGuard checks / the evidence | S5c | side line, (A) | 936 | 1038 | 3.40 / 1.70 | column / band |
| T9 | Tests run in / an isolated copy | S5d | side line, (A) | 1044 | 1140 | 3.20 / 2.30 | column / band |
| T10 | Evidence before done | S5e | side line, (B) | 1152 | 1212 | 2.00 / 2.00 (last of S5) | column / band |
| T11 | Your model, / your choice | S6a | side line, (A) | 1242 | 1320 | 2.60 / 1.70 | column / band |
| T11s | Even one on your Mac | S6a | support, (A) | 1260 | 1320 | 2.00 / 2.00 | under T11 |
| T12 | You set what / it may do | S6b | side line, (C) | 1350 | 1428 | 2.60 / 2.00 | column / band |
| T13 | Memory you can / read and forget | S6c | side line, (A) | 1458 | 1578 | 4.00 / 2.30 (last of S6) | column / band |
| T14 | Views, / not just text | S7a | side line, (A) | 1584 | 1656 (taken by the world move) | 2.40 / 2.00 (last of S7) | column / band |
| T15 | Free and open source | S8 | headline, (B) whole, list item | 1800 | 1998 (dims from 1869) | 6.60 / 1.70 | list, centre y 300 / 280 |
| T15s | Apache-2.0 | S8 | support, (B) whole, list item | 1806 | 1998 (dims from 1869) | 6.40 / 1.20 | under T15, baseline y 435 / 395 |
| T16 | No telemetry | S8 | headline, (B) whole, list item | 1869 | 1998 (dims from 1923) | 4.30 / 1.20 | list, centre y 545 / 500 |
| T17 | Your keys stay in your Keychain (square: Your keys stay / in your Keychain) | S8 | headline, (B) whole, list item | 1923 | 1998 | 2.50 / 2.30 (last of S8) | list, centre y 685 / 680 |
| W2 | `pebble` | S9 | wordmark, (W) | 2018 | end | — | baseline y 420 / 400 |
| T18 | A little help, right here. | S9 | side line (16:9 92 px, square 72 px), (A) | 2088 | end | 7.17 / 3.00 (key) | centred, baseline y 560 / 520 |
| T19 | Free for Macs with Apple silicon | S9 | CTA words, (C) | 2160 | end | 4.80 / 3.60 (key) | centred, baseline y 690 / 630 |
| T20 | github.com/tohin003/Pebble | S9 | URL, (C) | 2164 | end | 4.67 / 2.00 (key) | centred, baseline y 770 / 700 |
| T21 | Shown with sample data | S9 | small, fade | 2196 | end | — | centred, baseline y 852 / 820 |
| T22 | Pebble's character engine: bloub by Jérémy Perret (MIT) | S9 | small, fade | 2196 | end | — | centred, baseline y 892 / 860 |

Notes.
- Every kinetic line is ≤ 6 words. Two-line statements count per line: T4 is 3 + 4 words (7 in all, so its hold is
  computed for 7: 2.6 s needed, 3.4 s given); T7, T9 and T13 are within 6 in all. T21 and T22 are small print (credit
  and sample-data notice), not read-aloud lines. `video/src/film/timeline.ts` must check words per line, not per
  statement, and carry two-line statements as two lines.
- Sources: T1–T3 and T4 OVERRIDES §2; T5, T6, T7, T9–T20 `src/content/chapters.ts` / `docs/CLAIMS.md` (C-CH-*,
  C-PRIV-4/5, C-OSS-1, C-HERO-3, C-PROJ-5/10); T8 C-AG-1 and C-PROJ-10 ("AgentGuard checks evidence"); T18 Pet.vue:692;
  T22 OVERRIDES §2 (verbatim).
- T15 replaces MASTER_PLAN's "Open source · Apache-2.0" (DESIGN.md bans middle-dot strings).

## 9. The pebble

Only Pebble's own poses (D6): `idle`, `hover`, `tap`, `thinking`, `reading`, `editing`, `review`, `blocked`, `testing`,
`writing`, `happy`. Never an engine catalogue state. Each pose follows a real event exactly as the app's reducer would (U1 §3.6);
the "!" (`review`) appears only while an approval waits (twice: the edit card and the tests card).

### 9.1 Instances

| Instance | Frames | Start | Hops | Palette |
|---|---|---|---|---|
| P-desk | 0–143 | inside the desktop world at the pet's place (it scales with the camera) | — | light |
| P-main | 432–1665 | off-frame below: (960, 1150) / (540, 1150) | H1, H2, H3 | dark until the reveal flood reaches it (f504), then light |
| P-end | 1999–2303 | off-frame lower right: (2050, 1180) / (1180, 1180) | H4 | dark until f2016, then light |

All share one cue list (§9.3) in absolute composition time. P-main is covered by the chart at f1656–1665 and not drawn
after f1665. Contact shadow on (R5 §5.9).

### 9.2 Hops (acting layer, outer transforms only)

| Hop | Take-off (s / frame) | Duration | From → to (16:9) | From → to (square) | Lands |
|---|---|---|---|---|---|
| H1 rise in | 14.400 / f432 | 0.500 | (960, 1150) → (960, 880) | (540, 1150) → (540, 880) | f447 |
| H2 the leap | 16.333 / f490 | 0.467 | (960, 880) → (1295, 422) | (540, 880) → (806, 402) | **f504** |
| H3 the carry | 21.133 / f634 | 0.600 | (1295, 422) → (330, 900) | (806, 402) → (940, 300) | f652 (cut at f648) |
| H4 into the end card | 66.733 / f2002 | 0.467 | (2050, 1180) → (1295, 422) | (1180, 1180) → (806, 402) | **f2016** |

Anticipation 0.15 s (sy 0.89) before each take-off; stretch sy 1.11 / sx 0.90; landing squash sy 0.87 / sx 1.15 for
2 frames, then `jelly`. Eyes lead each hop by 0.1 s (look cues below).

### 9.3 Cue list (absolute seconds = frame / 30)

| Frame | s | Cue | Event |
|---|---|---|---|
| 0 | 0.000 | pose `idle` (initial) | frame 0: eyes open |
| 2–28 | 0.067–0.933 | `look` from the pointer, every quantised change | `gazeToward(pointer, pet box, reach = 200 desktop pt)`; the app's eyes follow the pointer |
| 22 | 0.733 | pose `hover` | the pointer enters the pet window (measure; ≥ 14 frames before the tap) |
| 36 | 1.200 | pose `tap` | click |
| 48 | 1.600 | `look: null` | the pointer has faded |
| 72 | 2.400 | pose `thinking` | the run has started |
| 144 | 4.800 | pose `idle` | (not drawn until f432) |
| 440 | 14.667 | `look {x: 0, y: −0.75}` | looks up at T4 |
| 481 | 16.033 | `look {x: 0.625, y: −0.75}` (square `{0.5, −0.875}`) | eyes lead the leap |
| 504 | 16.800 | pose `tap` | lands: the reveal |
| 520 | 17.333 | `look: null` | |
| 540 | 18.000 | pose `idle` | tap ends (1.2 s, TAP_MS) |
| 624 | 20.800 | `look {x: −0.875, y: 0.5}` (square `{0.75, −0.625}`) | eyes lead the carry |
| 652 | 21.733 | pose `reading` | lands in the window world; the status line reads Reading |
| 660 | 22.000 | `look {x: 0.875, y: −0.375}` (square `{−0.875, 0.5}`) | toward the status line |
| 711 | 23.700 | pose `editing` | "Preparing an edit"; inside the f708–714 blink |
| 756 | 25.200 | pose `review` | the edit card waits ("!"); on a still frame, with "Review," (lane G-fix, P1-4) |
| 780–826 | | `look` from the pointer | Apply edit |
| 864 | 28.800 | pose `thinking` | both edits applied; the run continues |
| 890 | 29.667 | pose `blocked` | verification required (the re-keyed hold, lane G-fix, P0-1) |
| 960–1000 | | `look` from the pointer | Run the tests |
| 995 | 33.167 | pose `review` | the "Run isolated tests" card waits ("!") |
| 1050–1090 | | `look` from the pointer | Run tests |
| 1094 | 36.467 | pose `testing` | the tests run (orbit dots) |
| 1161 | 38.700 | pose `writing` | after "Verified", Pebble writes its final reply |
| 1196–1555 | | `look` from the pointer | Settings, tabs, Auto, Forget |
| 1204 | 40.133 | pose `happy` | the verified run completes (the one celebration) |
| 1339 | 44.633 | pose `idle` | happy ends after 4.5 s, as in the app |
| 1584 | 52.800 | `look {x: 0.875, y: −0.375}` (square `{−0.875, 0.5}`) | the dashboard |
| 1999 | 66.633 | `look {x: −0.75, y: −0.75}` (square `{−0.375, −0.875}`) | P-end: eyes lead the landing |
| 2016 | 67.200 | pose `tap` | lands in the end-card lockup |
| 2030 | 67.667 | `look: null` | |
| 2052 | 68.400 | pose `idle` | |
| 2166 | 72.200 | `look {x: −0.625, y: 0.75}` | glances at the URL |
| 2214 | 73.800 | `look {x: 0, y: 0}` | looks at the viewer to the end |

Spacing: the engine keeps one slot of history and morphs a face in 0.45 s, so two pose changes are never closer than
14 frames (the tightest: hover → tap, f22 → 36); every change into or out of `review` (the "!") is ≥ 18 frames
(0.6 s, MIN_BLOCK) from its neighbours. Directional look cues are computed from the final positions (§9.2, §6) and
quantised to 1/8; Lane G recomputes them if a position moves. Pointer look cues: `gazeToward` from the film cursor in
the pebble's own frame space (reach 200 pt × the pebble's scale), a cue only when the quantised gaze changes; the
engine's 0.24 s catch-up does the rest.

### 9.4 Blinks (natural schedule, bloub seed 0x5eed; measured with `blinkStarts`)

Blinks cover frames 42–48, 156–162, 290–304 (double), 385–391, 467–474, 570–576, 708–714, 819–825, 901–908,
1026–1032, 1098–1105, 1183–1190, 1244–1251, 1306–1312, 1405–1412, 1538–1552 (double), 1661–1675 (double), 1784–1790,
1898–1905, 1972–1979, 2095–2109 (double), 2167–2173, 2271–2278. Every key frame has open eyes: 0, 36, 504, 540, 652,
1152, 1204, 2016, 2052, 2160, 2303 (checked). No state change forces a blink (no `blinkIn` pose is used).

## 10. Cursor and clicks

Our own arrow (black fill, 3 px white stroke, card shadow); never Apple's art. Path: `cursorAt` (minimum-jerk with a
gentle arc), duration `cursorTravelS` (Fitts), arriving ≥ 5 frames before the click; dwell; press 0.88 for 0.06 s,
hold 0.04 s, release on `SPRING.snappy`; the target's press state 0.97 and 4 % darker for 4 frames. No click rings.
Hidden (0.15 s fade) whenever it is not acting.

| Click-down | Beat | Target | Shot |
|---|---|---|---|
| f36 | 2 | the pebble | S1a |
| f810 | 45 | Apply edit | S5b |
| f990 | 55 | Run the tests | S5c |
| f1080 | 60 (bar 16) | Run tests | S5d |
| f1224 | 68 (bar 18) | Settings (gear) | S5e → S6a |
| f1332 | 74 | Permissions tab | S6a → S6b |
| f1404 | 78 | Auto in project | S6b |
| f1440 | 80 (bar 21) | Memory tab | S6b → S6c |
| f1530 | 85 | the bin ("Forget this memory") | S6c |

## 11. Sound effects (intents)

The exporter (`video/scripts/export-cues.ts`, run with bun) writes `tools/audio/cues.json`: each effect **peaks at the
picture frame + 1**, except the riser, whose END sits on f504. Kit and gains: `tools/audio/sfx_kit.json`. At most three
at once; hits 3–6 dB over the bed; rotate takes. Pan = 0.4 × (x − W/2)/(W/2) of the event in the 16:9 frame.

| Picture frame | Peak | Role, take | Event | Notes |
|---|---|---|---|---|
| 36 | 37 | click, click_a | the pebble is clicked | pan +0.14 |
| 143 | 144 | whoosh, whoosh_b | into the sage field (zoom through the pebble) | the dive fills the frame on f143 (lane G-fix) |
| 360–504 | end 504 | riser | bars 6–7 | the only riser |
| 504 | 505 | hit, soft_hit_b | the reveal landing | duck the bed 2.5 dB for 0.6 s |
| 504 | 505 | thud, thud_a | texture under the hit | |
| 648 | 649 | whoosh, whoosh_a | the carry into the window world | |
| 810 | 811 | click, click_b | Apply edit | pan +0.3 |
| 814 | 815 | pop, pop_a | Done | |
| 990 | 991 | click, click_c | Run the tests | pan +0.1 |
| 1080 | 1081 | click, click_a | Run tests | pan +0.32 |
| 1094 | 1095 | tick, tick_a | "Requesting isolated tests" row | very low (−24 dB) |
| 1152 | 1153 | shimmer, shimmer_a | **Verified** | |
| 1224 | 1225 | click, click_b | Settings | pan +0.33 |
| 1332 | 1333 | click, click_c | Permissions tab | |
| 1404 | 1405 | click, click_a | Auto in project | |
| 1440 | 1441 | click, click_b | Memory tab | |
| 1530 | 1531 | click, click_c | the bin | |
| 1542 | 1543 | pop, pop_c | the record dissolves | |
| 1665 | 1666 | whoosh, whoosh_c | the chart becomes the world (its fastest frame) | |
| 1799 | 1800 | whoosh, whoosh_a | into the sage field (zoom through the badge) | the dive fills the frame on f1799 (lane G-fix) |
| 2016 | 2017 | pop, pop_b | the end-card landing | |
| 2016 | 2017 | thud, thud_b | landing texture | duck 1.5 dB |

No chimes, dings or meme sounds. No downlifter (optional in the kit; off). The final chord is music, not an effect.

## 12. Transitions and seams

Allowed kinds only: **zoom through**, **colour flood**, **the pebble carries across**, **match cut** (on action or on
a click), **object becomes the world**, plus camera moves (the camera does the transition) and hard cuts. Never a
cross-fade between worlds. One light leak at most (off by default).

| # | Frame | From → to | Kind | Cause on screen |
|---|---|---|---|---|
| 1 | 144 | hook → questions | zoom through | the camera passes into the thinking pebble's sage body |
| 2 | 504 | build → reveal | colour flood | the pebble's landing pushes paper out from where it lands |
| 3 | 648 | reveal → window | carry across (match cut on action) | the pebble's leap continues across the cut at u = 0.78 |
| 4 | 720 | reads → asks | camera move | the drawer opens; the camera follows "Preparing an edit" |
| 5 | 864 | asks → held | **hard cut** | chapter change on the bar |
| 6 | 1008 | held → tests | **hard cut** (lane G-fix, P2-1) | the Run the tests click puts the tests card in the drawer; cut to it on the bar |
| 7 | 1152 | tests → Verified | continuous (R2) / punch-in cut (fallback) | the Verified row appears |
| 8 | 1224 | Verified → Settings | match cut on a click | the Settings button |
| 9 | 1332 | Models → Permissions | match cut on a click | the tab |
| 10 | 1440 | Permissions → Memory | match cut on a click | the tab |
| 11 | 1584 | Settings → views | **hard cut** | the payoff, on the motif downbeat |
| 12 | 1656 | dashboard → chart world | object becomes the world | the chart panel grows past the frame |
| 13 | 1728 | chart → quiz | hard cut (inside the payoff) | the next view, on the bar |
| 14 | 1800 | quiz → claims | zoom through | the camera passes into the chosen answer's badge |
| 15 | 2016 | claims → end card | colour flood + carry in | the pebble lands; paper spreads from it |

Inside shots: f72 punch-in (hook), f814 match cut on the click, f1404 match cut on the click, f1542 state swap.
**Hard cuts between beats: 3 of 15 seams (20 %; lane G-fix made f1008 a cut), 4 counting the payoff's internal cut
(27 %), all under R5's one-third.** Five kinds, within R5's 3–5.

Cut strips (R5 §13.6): render frames −6, −3, 0, +3, +6 around frames 72, 144, 504, 648, 720, 814, 864, 1008, 1152,
1224, 1332, 1404, 1440, 1542, 1584, 1656, 1728, 1800, 2016.

## 13. Captions and chapters

**Captions:** `docs/film-captions.json` — 25 non-overlapping cues (lane G-fix: c12 from f936, c20 f1872–1926, c21
f1926–2016, and c24 split so c25 carries the URL and "Shown with sample data"; lane v2-film: c24 reads "[Final chord]" /
"Free for Macs with Apple silicon" over f2160–2250, 8 words in 3.0 s, and c25 f2250–2304, 5 words in 1.8 s, so every cue
reads at ≤ 3 words per second; c24 was 10 words in 2.4 s) (sound descriptions in brackets, kinetic lines word for word,
at most two lines, each shown ≥ 1.2 s at ≤ 3 words per second). One track serves all three compositions (16:9, 1:1 and
9:16 share the timeline). Convert to `public/media/v1/film.en.vtt` and `Pebble-launch-film.srt` with seconds = frame /
30 (the file states the format). No caption covers a kinetic line: all kinetic type sits above y 918 (16:9, 1:1) and
above y 1450 in 9:16 (§2). Whooshes and most clicks are not described; the music's changes, the reveal's thud, the
Verified shimmer, the end-card pop and the final chord are.

**Chapters** (`src/content/chapters.ts`, `startSeconds`; `film.chapters.vtt` and the chips come from there):

| Chapter | Starts | Frame | Chip label |
|---|---|---|---|
| On your desktop | 0.0 s | 0 | 0:00 |
| Works in your project | 21.6 s | 648 | 0:21 |
| Evidence before done | 28.8 s | 864 | 0:28 |
| Your model | 40.8 s | 1224 | 0:40 |
| You set the pace | 44.4 s | 1332 | 0:44 |
| Memory | 48.0 s | 1440 | 0:48 |
| Views | 52.8 s | 1584 | 0:52 |
| Open source | 60.0 s | 1800 | 1:00 |
| Get Pebble | 67.2 s | 2016 | 1:07 |

`FILM_DURATION_SECONDS = 76.8` ("1:16").

## 14. Review frames

**G1.5 style frames** (critic H11), both aspects, full resolution, reviewed before animating:

| Id | Frame | What it proves |
|---|---|---|
| SF1 | 0 | the thumbnail: the pebble on its desktop, eyes open |
| SF2 | 540 | the reveal lockup with T5 (paper, pool of light, the period pebble) |
| SF3 | 985 | a punch-in: the held run, the pointer on Run the tests, T8 in the column |
| SF4 | 1175 | the climax: the Verified row, the check mark, T10, the pebble writing |
| SF4b | 1216 | the finished reply after the pull-back, the pebble happy, the pointer near Settings |
| SF5 | 2280 | the end card, everything landed |
| SF6 (extra) | 1700 | the chart as the world |

**G2 animatic review frames** (half-scale render; arrival · mid-move · settled per beat):

| Shot | Frames |
|---|---|
| S1a | 0, 12, 22, 28, 36, 52 (mid pull-back), 64, 71 |
| S1b | 72, 100, 126, 135 (mid zoom), 143 |
| S2 | 146, 160, 180, 216, 250, 288, 330 |
| S3 | 362, 380, 420, 440 (pebble landed), 470, 488 (anticipation), 497 (mid-leap) |
| S4 | 504, 506 (squash), 512 (flood mid), 525, 540, 600, 620, 640 |
| S5a | 648, 652, 672, 690, 718 |
| S5b | 722, 732 (mid move), 746, 760, 786, 800, 810, 814, 833, 840, 860 |
| S5c | 864, 900, 924, 931, 954, 975, 990, 996 |
| S5d | 1008, 1020, 1032, 1050, 1075, 1080, 1094, 1120, 1146 |
| S5e | 1152, 1158, 1175, 1188, 1200 (mid pull-back), 1204 (happy), 1216 |
| S6 | 1224, 1233, 1260, 1300, 1332, 1350, 1380, 1404, 1420, 1440, 1458, 1488, 1520, 1530, 1536, 1542, 1560 |
| S7 | 1584, 1600, 1640, 1656, 1665 (mid growth), 1676, 1700, 1728, 1760, 1782, 1790 |
| S8 | 1800, 1812, 1840, 1872, 1900, 1941, 1980, 2005 |
| S9 | 2008 (mid flight), 2016, 2020, 2032, 2060, 2100, 2160, 2180, 2200, 2250, 2303 |

Plus one frame per bar (the 32 downbeats) for the contact sheets, each checked at 360 px wide, and the cut strips in
§12. Reviewer notes in the form `t=… · where · problem → change`.

## 15. Teaser T0 (`FilmTeaser`, 1280×720, 240 frames, 8 s, silent, seamless)

A recomposed excerpt of the approval → tests → Verified chain. Same worlds and rules as the film; the same vclock
frames (render T0 right after the film master, before those frames are deleted, or export them first as stills with
`record.mjs main-live-film --at=8.30,9.40,11.05,16.60,17.80,20.60,22.90 --scale=3`).

- **No pebble in T0.** The teaser autoplays on the page while the hero's live pebble may still be in view (the poster
  peeks above the fold), and the site allows one animated pebble at a time (DESIGN.md §4). The window and the work
  carry the teaser; the pebble is the film's.
- **Layout:** the riverbed desktop with Pebble's window at m 0.75 (870×600), x 205–1075, y 60–660; framed like the
  page's media (radius 28, window shadow).
- Text: none (the page's label and chapter list carry the words).
- **Veils** (lane G-fix, REVIEW-G2 P1-9): in the close framings the conversation left of the drawer recedes under S7c's
  veil (60 % paper, 10 px blur; its amount follows the camera's zoom, so frame 0 and the seam are untouched), and as
  "Verified" lands (f150) the drawer's rows above "Requesting isolated tests" recede too, so the payoff never reads as
  "Not verified · 2 changed files, no tests run".

| Frames | What happens | Source |
|---|---|---|
| 0–14 | **poster frame** (= `FilmPoster`): the window with the edit card waiting, Apply edit active | vclock 8.30 s |
| 15–38 | camera into the card's lower half, m 0.75 → 1.9 (`EASE.camera`) | 8.30 s (freeze) |
| 39–55 | cursor in from the right to Apply edit | 8.30 → 9.30 s |
| 60 | **click Apply edit**; press f60–63 | 9.40 s |
| 64 | match cut to Done + Undo this edit (1.04 → 1.0) | 11.05 s |
| 96 | hard cut to the "Run isolated tests" card, m 1.8 | 16.60 s |
| 100–120 | cursor to Run tests; **click f126** | 17.40 → 17.80 s |
| 126–149 | the drawer's newest steps (R2), sped 3.7× | 17.80 → 20.55 s |
| 150 | **"Verified · pytest 42 passed on current files"** | 20.60 s |
| 150–185 | hold | 20.60 → 21.80 s |
| 186–209 | camera back to the wide frame; cursor fades f190–194 | 22.90 s |
| 210–221 | time-passage dissolve (0.4 s, 2 px blur) to frame 0's picture | 22.90 s → 8.30 s |
| 222–239 | idle tail, identical to frame 0 | 8.30 s |

Seam: frame 239 → frame 0 shows the same window frame, the same camera and no cursor. Fallback without vclock frames:
`main-live-04-waiting-approval@3x`, `crop-approval-card@3x` (its Done twin, R3), `crop-tests-card@3x`,
`main-done-timeline@3x`.

## 16. Loops (1600×1000, 30 fps, silent, exactly N frames, frame N ≡ frame 0, frame 0 = poster)

Shared rules: idle head ≥ 0.5 s; the camera pose at the last frame equals frame 0's (the return move ends ≥ 12 frames
before N); no cursor at either end; no grain, glow or drift (nothing periodic to match); UI text ≥ 40 px at 1600 wide;
the page's HTML carries the words. Seam QA: the PSNR of frame N−1 → 0 ≥ the loop's median inter-frame PSNR − 3 dB.

| Loop | N | Sources | Frame plan | Seam | Poster (frame 0) |
|---|---|---|---|---|---|
| **L1** `loop-companion` | **300 (10 s)** | desktop + `pet-live-error` at 3×, avatar hidden, extended with a close click (R4); `PebbleOnFilm`, engine offset +1.0 s | 0–14 idle pet (m 1.8, size 266, centre (1289, 800)); 15–37 cursor in from the left, eyes follow; `hover` f28; **click f46** (`tap`; source 0.60); 46–261 source 0.60 → 7.77 s at 1×: typing f67–116, sent f118 (`sending`), `thinking` f136, reply streams f166–220 (`writing` f166), done f226 (`happy`); 240–255 cursor to the close control; **click f262** (source 7.80) → the chat collapses; `idle` f262; 270–285 cursor leaves and fades; `look` pinned f280 | collapsed pet, idle, pinned gaze, no cursor; blinks at f12, f127, f260–274 only | the pebble alone on its desktop |
| **L2** `loop-models` | 180 (6 s) | `settings-models@3x` | 0–14 ROI A (x 346–814, y 190–440, m 3.0); 15–50 camera to ROI B (model row and buttons, m 3.6) on `EASE.camera`; ring on **Add a model file** f50–62; hold to f120; ring fades f120–126; 126–156 camera back to ROI A (same ease); 156–179 idle | camera identical, no ring | the ways in: the model row, Add a model file, Connect provider, Continue with ChatGPT |
| **L3** `loop-approve-undo` | 300 (10 s); **270** since lane G-fix (REVIEW-G2 P2-19: the applied card held still 3.3 s; ring out f150, dissolve f160–172, tilt back f180–210) | `crop-approval-card@3x` + its Done twin `crop-approval-card-done@3x` (R3); fallback vclock frames 9.40 / 11.05 s | 0–14 the waiting card (m 2.0); 15–44 cursor arcs in from the lower right; **click f51** (press f51–54); f55 match cut to Done + Undo this edit (1.04 → 1.0); ring on Undo this edit f70–82; hold to f200; ring fades f200–206; cursor leaves f206–230; time-passage dissolve f236–248 back to the waiting card; idle tail | the waiting card, no cursor, no ring | the card with its diff and Apply edit |
| **L4** `loop-isolated-tests` | 240 (8 s); built by G2b from the real card and drawer (see HANDOFF-G2b); lane G-fix (REVIEW-G2 P1-9): as Verified lands (f110–122) the drawer's rows above "Requesting isolated tests" recede under S7c's veil | `main-done-timeline@3x`: the conversation's run block (ROI x 240–725, y 325–565, m 3.0) | 0–59 complete (summary, the receipt line, all seven rows); 60–71 time-passage dissolve to the "before" state (rows from "Requesting isolated tests · 11 s" on and the receipt line masked); rows reveal (mask, 0.3 s each): "Requesting isolated tests · 11 s" f84, "Explored · read 1 file, 1 search" f120, **"Verified · pytest 42 passed on current files · 2 s"** f156 with the receipt line f160, "The model responded · 4 s" f174; hold to f239 | complete state at both ends | "Verified · pytest 42 passed on current files" |
| **L7** `loop-memory` | 240 (8 s); **210** since lane G-fix (REVIEW-G2 P2-19; the pointer fades where it clicked, f79–84, P1-9; dissolve f156–168) | `settings-memory@3x` → `settings-memory-forgotten@3x`, the records (ROI x 346–814, y 560–770, m 2.8) | 0–14 the three records; 15–50 cursor in from the right to the bin of "Uses metric units and 24-hour times."; **click f60**; dissolve f60–71 (opacity + 4 px blur); f72 swap (the next record in place); hold to f170; cursor fades f180–184; time-passage dissolve f186–197 back to frame 0's picture; idle tail | records as at frame 0, no cursor | the records with their bins |
| **L8** `loop-views` | 300 (10 s) | `main-dashboard@3x` (whole window, m 1.11) and `main-quiz@3x` | 0–29 the dashboard, wide; 30–53 camera into the chart (m 1.9); hold to f119; **f120 cut** to the quiz (m 2.4 on the question); hold to f209; **f210 cut** back to the chart framing; 210–233 camera back to wide; hold to f299 | wide dashboard at both ends | the Lisbon trip budget dashboard |

MASTER_PLAN listed L1 at 8 s; the real sequence needs 10 s to open, answer and close without a jump (Root.tsx registers
240 frames today: change to 300). Scope cut line (M7): if time or disk runs short, L8 becomes its poster, then L2.

## 17. Capture requests (lanes D/G)

| Id | Request | Why | Fallback |
|---|---|---|---|
| R1 | Record `pet-live-error` at 3× with the companion avatar hidden (inject `visibility: hidden` on the pet avatar's SVG) and report the avatar's box | one engine-drawn pebble everywhere; the zoom-through needs a vector body | keep the captured avatar and switch to `PebbleOnFilm` at the zoom (f126), hidden under a blink-free 3 frames |
| R2 | Record `main-live-film` at 3× (source 3.8–23.0 s) and add one step: after Run tests, scroll the Details drawer (≈ 18.4–19.0 s, eased, as a person would) so the newest steps sit in its lower half by 20.6 s | the Verified row on screen, in the real drawer | §6 S5d fallback (stills) |
| R3 | `crop-approval-card-done@3x`: the same scene as `crop-approval-card`, the card in its applied state ("Done", "Undo this edit"), same width and position | L3 and T0's match cut | vclock frames 9.40 / 11.05 s |
| R4 | Extend the pet timeline for L1: a click on the panel's close / "Minimize to pebble" control at 7.80 s; record to 8.40 s | L1 resets through a real UI action | a 0.4 s time-passage dissolve at f262–273 |

## 18. Copy deltas for `src/content/chapters.ts` (for the main loop or lane A)

**Status: applied** to `src/content/chapters.ts` (and the `film.posterAlt` delta below to `copy.ts`) by the claims
review, 2026-10-23; see `.work/handoffs/HANDOFF-claims-review.md`.

Lane E filled only the timings (`startSeconds`, `FILM_DURATION_SECONDS`, the `bars` notes). These text changes make the
transcript, the chapter list and `video/src/film/timeline.ts`'s `line()` check match the cut. Apply them before lane G
re-derives the timeline:

| Chapter | `onScreen` (new, in order) | `description` (new) |
|---|---|---|
| desktop | "What did it change?", "Can I undo it?", "Did it run the tests?", "An agent shouldn't grade its own work", "A small companion for your Mac" | A calm sage-green desktop with the pebble in its lower-right corner. The pointer moves in and the pebble's eyes follow it. A click opens the quick chat, the question “What does ‘day is out of range for month’ mean?” is sent, and the pebble starts thinking. The camera moves into the pebble. Three questions appear one at a time on a sage background, then the line “An agent shouldn't grade its own work”. The pebble hops in, leaps and lands as the full stop of the word “pebble.”, and the screen turns light. |
| project | (unchanged) "It reads your project", "Review, apply, undo" | The pebble hops into Pebble's window on the invoice-kit project; the status line reads “Reading invoice_kit/dates.py”. An approval card for invoice_kit/dates.py shows the change. The pointer clicks Apply edit, and the card shows Done, with Undo this edit. |
| tested | "AgentGuard checks the evidence", "Tests run in an isolated copy", "Evidence before done" | Pebble's reply says both edits are in, but the task is held: “Blocked” and “Pebble's change isn't verified yet.”, with Run the tests, Ask Pebble to finish and Accept as unverified. The pointer clicks Run the tests. A “Run isolated tests” card reads “Runs the project's tests in a temporary copy. Your project files don't change.” The pointer clicks Run tests; the steps show “Requesting isolated tests · 11 s”, then “Verified · pytest 42 passed on current files”. Pebble's final reply says the tests ran in an isolated copy and both edits are verified, and the pebble celebrates. |
| model | (unchanged) | Settings › Models: the model on this Mac, and the ways to add one: Add a model file, Connect provider and Continue with ChatGPT. |
| pace | (unchanged) | Settings › Permissions. The pointer chooses Auto in project instead of Ask for approval, with each mode's own words on screen. |
| memory | (unchanged) | Settings › Memory shows the six kinds of memory and the saved records. The pointer clicks the bin next to “Uses metric units and 24-hour times.”, and the record disappears. |
| views | (unchanged) | A “Lisbon trip budget” dashboard. Its spending chart grows until it fills the screen. Then a quiz asks “What does date(2026, 1, 31) + timedelta(days=1) return?” |
| open-source | "Free and open source", "Apache-2.0", "No telemetry", "Your keys stay in your Keychain" | Lines appear one at a time on a sage background. |
| get | "A little help, right here.", "Free for Macs with Apple silicon", "github.com/tohin003/Pebble", "Shown with sample data", "Pebble's character engine: bloub by Jérémy Perret (MIT)" | The pebble hops in and becomes the full stop of the “pebble.” wordmark. The film ends on the project's GitHub address. |

The current "tested" description still describes MASTER_PLAN's withdrawn counter and "network off" (critic C3): it must
change. `sounds` stays empty: `docs/film-captions.json` is the single caption source.

One more delta, in `src/content/copy.ts`: `film.posterAlt` describes a pebble on a desktop, but the poster is T0's
frame 0 (§15), which shows the product above the fold as critic H7 asks. Suggested: "The Pebble film. Pebble's window
on a sage-green desktop, with an edit waiting for approval." (The film's own frame 0, the pebble on its desktop, is the
LinkedIn thumbnail, not the page poster.)

## 19. Departures from MASTER_PLAN §5.1, and why

| MASTER_PLAN §5.1 | This spec | Why |
|---|---|---|
| Tension: "It said it was done" · "The tests never ran" · "What did it change?" | Three neutral questions, ordered as the film answers them, then the intent line | OVERRIDES §2 (statements banned); T3 → T4 reads as one thought |
| Reveal bar 8 only | Reveal bars 8–9; proof from bar 10 | T5 needs 2.3 s; shots stay on bar lines |
| Proof 3: dark sandbox, "network off", counter 0 → 42 | The real tests card, the real steps, "Verified" | critic C3; OVERRIDES §7 climax order |
| Proof 4 check mark on the receipt | Check mark outside the UI, 16:9 only | C3 |
| Proof 5 "Any model" | "Your model, your choice" + "Even one on your Mac" | C3, Lane A |
| happy at Verified and at the payoff | happy once, when the verified run completes (f1204, held 4.5 s as in the app) | R5 "celebrates once"; AgentGuard is the climax; the app turns happy on completion, 1.7 s after the Verified row |
| Proof 5 pose `loading` | `happy` then `idle` | nothing loads when Settings › Models is opened; truthful pose |
| "Open source · Apache-2.0" | "Free and open source" + "Apache-2.0" | DESIGN.md bans middle-dot strings |
| Stills with camera moves | The real `main-live-film` sequence for the whole coding story | critic C8 |
| L1 8 s | 10 s | the sequence opens, answers and closes without a jump |
| Grain 2 % in the master | off by default | critic H8 |
| Scope challenge (optional) | not in the P0 cut; alternate in §21 | one spine; its text needs reading time; the page shows it in full |

## 20. Self-review against R5 §13.6 (with the binding overrides)

**Binding overrides for every reviewer (critic H12): films and loops are 30 fps (D7, not R5's 60); the website film is
−16 LUFS integrated, ≤ −1.5 dBTP (D10, not R5's −14); the social masters are −14 LUFS, ≤ −1.0 dBTP (OVERRIDES §4).
No reviewer may change these back.**

| Item | Result |
|---|---|
| Frame 0 meaningful; a product moment by ~3 s; first line not "Introducing"/"Meet" | ✓ the pebble on its desktop at f0; the real chat at f36 (1.2 s); first line "What did it change?" at 4.8 s |
| One spine; reveal at 20–30 %; payoff once at 60–80 %; end card performed | ✓ the 31st-of-the-month bug; reveal 21.9 %; payoff 68.8 % (the AgentGuard climax at 50 % is the proof's peak); the pebble lands and the word unrolls |
| CTA ≤ 32 characters, held ≥ 3.5 s | ✓ 26 characters, 4.8 s under the final chord |
| Claims trace to README/CLAIMS; no invented UI; illustrative numbers labelled | ✓ §8 sources; only real UI; the ring and check are drawn-on annotations, the check outside the UI; "Shown with sample data" on the end card |
| ≤ 6 words per line; one line at a time; holds per `holdFor`; titles still | ✓ §8 (T7 builds with its verbs, then stays) |
| Essential text ≥ 56 px; UI text ≥ 28 px (16:9) / 34 px (square) | ✓ smallest essential 16:9 text 52 px (URL, R5's mono range 52–56); UI ≥ 28 px in 16:9; square ≥ 34 px except S6c's records (31 px, flagged) |
| Every beat frame checked at 360 px wide | G2 task (§14) |
| No SF Pro in marketing type | ✓ Fraunces, Inter, Geist Mono (SF appears only inside the captured UI, which R5 allows) |
| Eases by role; no default spring; no bounce on UI, opacity or data | ✓ §3, §6 (calm settles, snappy release, `jelly`/`pebble` on the character only; the chart never animates) |
| One hero move per shot; secondaries later and shorter | ✓ e.g. S1a camera starts 0.13 s after the click |
| Something new every 2–4 s; nothing static > 3 s | ✓ the longest still holds are the S4 lockup (f537–612, 2.5 s, the pebble blinks at f570) and the end card (the pebble glances at f2166 and f2214) |
| Camera arrives then holds; readable UI flat; screens bleed | ✓ every stage bleeds; no tilt; moves 0.8 s on `EASE.camera` |
| Cursor: minimum-jerk arc, Fitts, dwell, press; the click causes the change; no rings | ✓ §10 |
| Motion blur only on fast moves, ≤ 12 px text / 20 px frame | ✓ zoom-throughs and the chart growth only |
| Real bloub engine, frame-driven; anticipation → action → settle; eyes lead 0.1 s; blinks; pulses ≤ 0.5 Hz | ✓ §9; every pose follows the event the app would react to (e.g. `happy` on the run's completion, not on the Verified row) |
| Beats from the index; cuts on beats; layout changes on bars | ✓ every click and seam on a beat (§10, §12) except the two caused follow-ups (f814 rebound, f1542 swap); shots on bars |
| Each effect peaks at picture + 1; one riser; rotated takes; no chimes | ✓ §11 |
| Final chord under the logo; loudness per the overrides above | ✓ f2160 with the lockup on screen |
| Brand tokens only; accent on ≤ 1 focus per frame | ✓ the ring or the check is the frame's one accent |
| Grain / vignette / shadows / banding | grain off (H8); 6 % tinted vignette, never on UI shots; `SHADOW.window` on stages; radial grounds only (check banding at G2) |
| Review pass: cut strips, banned list, notes format, remove a third if busy, no scores | ✓ §12, §14; banned looks absent (no void/glow, no glass, no 3D, no cubes/flips/clock wipes/glitch, no logo bug, nothing all-centred-and-fading) |
| OVERRIDES §2 tension; one comparative framing as intent; no benchmarks | ✓ T1–T4; nothing else compares |
| OVERRIDES §4 aspect-aware square; nothing within 60 px; same timeline and music | ✓ §2, §4, every shot's square framing |
| OVERRIDES §7 AgentGuard climax order | ✓ change → held → Run the tests → isolated tests → Verified |
| D6 Pebble's own poses only | ✓ §9.3 |

## 21. Alternate (off) and open issues

**Alternate A, the scope challenge (OVERRIDES §9), off by default.** If the lead wants it in the film:
- bar 13 (f864–935) becomes a punch-in on `crop-challenge-step@3x`: the Activity step's error, verbatim
  ("AgentGuard: AgentGuard — evidence check" / "5 file(s) changed that the task does not reach" / …, N = 5 as captured),
  with the side line "It checks the work" / "stays in scope" (in f870, out f930);
- the held beat moves one bar later: S5c's source map shifts by +72 frames (held f1003, Run the tests f1062, beat 59);
- the tests beat compresses into bar 16: camera f1080–1103, Run tests f1116 (beat 62), source 17.80 → 20.60 s at 2.3×
  so Verified still lands on f1152; T9 then holds 1.4 s, below its 2.3 s, so T9 must be cut.

Cost: a second task (another conversation, in Auto in project) inside the one-spine story, dense text with 2 s of
reading time, and the loss of T9. Recommendation: keep the challenge on the page's AgentGuard section, where it can be
read, and keep the film's climax as specified.

**Open issues.**
1. R1–R4 are capture changes for lanes D/G; each has a fallback above.
2. `chapters.ts` text deltas (§18): applied by the claims review on 2026-10-23, so `video/src/film/timeline.ts`'s
   `line()` check finds every on-screen line in `chapters.ts`.
3. The square's S6c records sit at 31 px UI text (target 34); acceptable because T13 carries the meaning.
4. T22 (the bloub credit) follows OVERRIDES §2's "wherever the character appears"; the main loop may move it to the
   LinkedIn post text instead, then drop it from the end card and from chapters.ts.
5. A music change (the C2 pass now running) keeps this spec valid if the grid stays 100 BPM / 32 bars; otherwise
   re-snap by (bar, beat, offset) as §1 says.
