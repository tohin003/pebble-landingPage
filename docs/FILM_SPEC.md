# FILM_SPEC — the Pebble launch film, its teaser and the feature loops

Lane E, 2026-10-23. **This file is the source of truth for the films** (gate G1). Lane G builds from it, and
`video/src/film/timeline.ts` is re-derived from it. Every frame number below comes from `tools/audio/beatmap.json`.
Captions live in `docs/film-captions.json`. Chapter timings live in `src/content/chapters.ts`.

Precedence: `OVERRIDES.md` > this file > `MASTER_PLAN.md` §5 > the research reports. Where this file departs from
MASTER_PLAN §5.1, §19 below says why. The look is `docs/PHILOSOPHY.md`'s (lane v2-film, 2026-10-23): the film uses
the page's identity, so any frame of it could sit on the page without restyling (§4 says how).

**The energetic recut (25 Oct 2026; the design is the director's ENERGY_SPEC, with the lead's decisions in OVERRIDES
§35).** The film keeps its story, its words, its grid, its chapters and its pinned UI events; it changes how it moves
and sounds: a real click on f18 opens the quick chat and the question types itself (§6 S1, §7.1), ten lines slam onto
their beats (§3), the pebble hangs mid-leap into the drop (§9.2), Verified is pointed with the app's own focus (§6
S5e), and a drum-and-sub drive with UI sounds and mix automation sits under the kept bed (§11). The sections below
record it where it lives.

**The trailer (25 Oct 2026; OVERRIDES §38–§43).** The launch film is now a trailer: 76.8 s, 32 bars, in four
movements (Tension, Reveal, Proof, Title), with the drop on bar 10 (f648). §24 records it, and where §1–§23 differ, §24
is the film; §1–§23 stay as the record of the recut it replaced. §2's safe areas and type floors, §15 (the teaser) and
§16 (the loops) still hold.

Contents: 1 Grid · 2 Compositions and safe areas · 3 Type · 4 Worlds and layouts · 5 Bar map · 6 Shot list ·
7 Source-time maps · 8 On-screen text · 9 The pebble · 10 Cursor and clicks · 11 Sound effects · 12 Transitions ·
13 Captions and chapters · 14 Review frames · 15 Teaser T0 · 16 Loops · 17 Capture requests · 18 Copy deltas for
chapters.ts · 19 Departures from MASTER_PLAN · 20 Self-review (R5 §13.6) · 21 Alternate (scope challenge) and open
issues · 22 The vertical (9:16) · 23 The 30 s cut `x30` · **24 The trailer**.

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
| Breaths and the hold (the energetic recut) | four 9-frame gaps that end the frame before a bar line, f135, 1143, 1575 and 2151, each opening onto a hit (f144, 1152, 1584, 2160), plus the composed breath f486–503 before the drop; the hits after them are ≥ 4 bars apart. The hold f891–989 (the drive muted, the bed behind a low-pass) is released by the f990 click to the f1008 bar line. The hook's ride keeps the bed and the drive 1.5 dB down over bars 1–2 (f0–143). The tail fades f2214–2249 on an equal-power curve; f2250–2303 is digital silence (§11) |
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
| `LaunchFilm` | 1920×1080 | 2,304 | website film (−16 LUFS, D10), X and LinkedIn 16:9 master (−14 LUFS) |
| `LaunchFilmSquare` | 1080×1080 | 2,304 | LinkedIn feed (−14 LUFS, OVERRIDES §4) |
| `LaunchFilmVertical` | 1080×1920 | 2,304 | X and LinkedIn on phones (−14 LUFS, OVERRIDES §14; §22) |
| `FilmTeaser` (T0) | 1280×720 | 240 | silent, seamless, in the film's poster frame (§15) |
| `FilmPoster` | 1280×720 | still | = T0 frame 0 |
| Loops L1–L4, L7, L8 | 1600×1000 | §16 | silent, seamless |

One timeline, one music bed, one caption track for the three film compositions. Layout reads `useVideoConfig()`;
`video/src/motion/layout.ts` holds the numbers below. Each aspect has its own framing, never a crop of another
(OVERRIDES §14); the square and the vertical are both 1,080 px wide and share a stage size, so they share the window
world's stage framings where their edges allow (§6.1).

| | 16:9 (1920×1080) | Square (1080×1080) | Vertical (1080×1920, §22) |
|---|---|---|---|
| Text safe | x 96–1824, y 64–1016 | x 80–1000, y 80–1000 (stricter than OVERRIDES' 60) | x 80–1000, y 290–1630 |
| **The band** every essential element stays in | the frame | the frame | **y 250–1670** (1080 × 1420): X's and LinkedIn's phone UI covers the rest |
| **Caption band** (no kinetic type, no click target) | y > 918 | y > 918 | y > 1460 |
| UI ROI inside a stage | ≥ 60 px from every frame edge | ≥ 60 px from every frame edge | ≥ 60 px from every frame edge |
| Smallest UI text a viewer must read, after magnification | ≥ 28 px | ≥ 34 px (judged at 360 px wide) | ≥ 34 px (judged at 360 px wide) |
| Cursor height | 56 px | 52 px | 52 px |

The caption band keeps the bottom of the picture free for player captions (website VTT, X and LinkedIn SRT). UI may
bleed into it; kinetic type and click targets may not. UI text sizes are type size × magnification, as R5 §4 counts
them (the app's 12.5 px text at m 3.0 is 37.5 px, its ink 34 px; its 12 px labels at m 2.85, 34.2 px).

## 3. Type

Faces, PHILOSOPHY's three voices (`video/src/motion/system.ts` writes each value with its job): **Fraunces**
(variable, `font-variation-settings: "SOFT" 100, "WONK" 0`, weight 350 as on the page, never italic) for every line,
the stone's voice; **Inter** 500/400 for support, the CTA's words and the small print, the app's voice; **Geist Mono**
500 with tabular numerals for anything that carries a digit, the data's voice: the URL and "Apache-2.0". From
`video/public/fonts/` via `@remotion/fonts`. No accent-coloured words. No trailing periods except the app's own
tagline "A little help, right here." (verbatim). ≤ 6 words per line. Lines are dead still once they land.

**No numbers on film** (PHILOSOPHY, "Film and social"): the film's own words carry no version, size, count, test
number or benchmark; the only digits in its type are names (the licence, the URL's account). Numbers inside the real
UI captures are sample data, and the end card says so ("Shown with sample data").

| Role | Face | 16:9 px | Square and vertical px | Colour |
|---|---|---|---|---|
| Wordmark `pebble` | Inter 650, tracking −0.035 em, lowercase | 216 | 172 | ink `#1D2520` |
| Headline (sage field, full frame) | Fraunces 350, leading 1.05, tracking −0.02 em | 112 | 92 | `#FFFFFF` on sage (7.9:1) |
| Side line (proof/tour column, end-card tagline) | Fraunces 350 | 92 | 92 (tagline 72) | ink `#1D2520` |
| Support | Inter 500, tracking −0.01 em | 58 | 50 | `#5D665E` on paper; `#FFFFFF` at 80 % on sage |
| Data ("Apache-2.0") | Geist Mono 500, tabular | 54 | 46 | `#FFFFFF` at 80 % on sage |
| CTA words | Inter 500 | 56 | 48 | `#5D665E` |
| URL | Geist Mono 500, tabular | 52 | 44 | ink `#1D2520` |
| Small print | Inter 400 | 32 | 34 | `#5D665E` |

The ink is the page's (`#1D2520`, 14.9:1 on paper; DESIGN-LEXINGTON §3.3), not the app's `#252C28`: the film follows
the page.

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
- **(S) slam** (the energetic recut, `motion/spec.ts` slamIn): the line LANDS on its `in` frame, a beat or an eighth.
  Over the 3 frames before it, p = ramp(frame, in − 3, 3, `EASE.exit`): scale 1 + (k − 1)(1 − p), blur 6(1 − p) px,
  opacity min(1, 3p), so it is invisible on in − 3, faint and blurred on in − 2 (opacity 0.19, k 1.10 → 1.094), nearly
  whole on in − 1 (0.90, 1.070) and at rest (no transform, no filter) from `in`. It scales about the line's left middle
  (left-aligned) or its centre (centred); T7 slams word by word, each word about its own left middle. k (the
  overscale): 1.10 in 16:9; 1.06 on the narrow aspects' lists and the centred end-card line; 1.04 on their band lines.
  A line that lands on a cut appears already landed: its pre-roll falls in the previous shot, which never draws it
  (T1 f144, T14 f1584, T15 f1800). At most ten lines slam (validateTimeline): T1, T2, T3, T7, T10, T14, T15, T16, T17
  and T19. The worst case, T17 in 16:9, grows from x 310 to 1737 on its first visible frame, inside the safe area's
  1824. Every other line keeps its calm entrance.
- **Exit:** blur 0 → 8 px plus opacity → 0 over 6 frames (`T2.lineOut` 0.2 s), unless a shot's move takes the line.

## 4. Worlds, layouts and finish

**Worlds.**

Lane v2-film restyled the worlds to PHILOSOPHY ("A precise world, and one soft stone"): one flat ground per world,
no grain, no glow, no vignette, no pool of light. Colour and texture live only in imagery: the riverbed, behind the
one scene, and the pebble, the only thing that casts a shadow.

| World | Look |
|---|---|
| **Desktop** (S1, the film's one scene) | the riverbed wallpaper (comp 2, rasterised plate `RiverbedPlate`), light, full frame; no menu bar in close framings; nothing laid over it |
| **Sage field** (S2, S3, S8; S4 and S9 outside the flood) | **flat** type ground `#425643` (white type 7.9:1, the lead's ≥ 7:1). A field arrives on the colour it is entered through (the pebble's `#536B54`; the quiz badge's `#506E54` after S7c) and settles on the type ground within 12 frames: a colour change, never a gradient |
| **Paper** (S4 reveal, S9 end card) | **flat** `#F8F9F6`, the page's ground. The lockup stands on the pebble's line (the page's hand-drawn stroke, 2.5 px `#AABDA7`, faded over its first and last 12 %), as the page's footer wordmark does with the sleeping pebble as its full stop, so the film's last frame is the page's last screen |
| **Window** (product UI, S5–S7a) | a **moment in a hairline frame** on the paper ground: the stage, a viewport into Pebble's real UI, radius 16 on its framed corners, a 2 px `#DBE1D9` ring drawn over the picture's edge (the page's 1 px `::after` ring at the film's scale), **no shadow**. The pebble stands at its spot on a short stretch of its line |

Grain: off in every master (critic H8). Annotations draw no colour of their own except the one state mark, the check
beside "Verified" (16:9; the accent's third job). Pointing is a focus (R5 §5.3, the loops' way): the rest of the same
picture recedes under a veil of the window's own colour (`#F7F8F5`, 45 %, 2.5 px on-screen blur) and the region in focus
keeps its own pixels.

**Layouts in the window world (proof and tour shots).**

| | 16:9: side split | Square: stacked | Vertical: stacked in the band (§22) |
|---|---|---|---|
| Text | column x 96–860, line block top y 300 | band x 80–860, line block top y 96 | band x 80–860, line block top y 380 |
| Stage | x 920–1920 (bleeds off the right), y 64–1016, left corners radius 16 | x 24–1080 (bleeds off the right), y 336 → bleeds off the bottom, top-left corner radius 16 | x 24–1080 (bleeds off the right), y 700–1444 (its bottom a visible hairline above the caption band), left corners radius 16 |
| Pebble | foot (330, 900), size 210, on its line x 150–510 | foot (940, 300), size 170, on its line x 850–1030 | foot (930, 660), size 170, on its line x 840–1020 |
| Check-mark annotation (S5e) | centre (860, y of the Verified row), 72 px, 8 px stroke | none | none |

The same line breaks work in the three aspects (column 764 px, band 780 px), except where §8 gives the narrow
compositions their own (T10, T17). The camera works *inside* the stage: a
framing is a magnification `m` (frame px per UI CSS px) plus a region of interest (ROI, UI CSS px of the 1160×800
window, or 1440×900 for the dashboard) fitted to the stage. Stage ROIs bleed; a ROI never extends past the captured
window (y ≤ 800).

**Pebble sizes** (`PebbleOnFilm.size`, the 220-unit viewBox box; the body is about 0.59 of it): desktop scenes at the
desktop's scale (148 desktop units, so 385 px at m 2.6, 222 px at m 1.5, 326 px at m 2.2; the vertical's frame 0 at
m 3.4, 503 px); type worlds and the window world 210 (16:9) / 170 (square and vertical).

## 5. Bar map

| Bar | Frames | Music | Shot | What happens | Chapter |
|---|---|---|---|---|---|
| 1 | 0–71 | hook, motif | S1a | the pebble on its desktop; the pointer drops in; click (f18): the quick chat opens; the camera makes room (f19–30); the question types itself; Enter (f54) | desktop |
| 2 | 72–143 | hook | S1b | punch-in cut (f72); Pebble thinks, then its answer streams (f102); the breath and the dive into the pebble (f135–143) | desktop |
| 3 | 144–215 | tension | S2 | "What did it change?" (slam, landed on the seam) | desktop |
| 4 | 216–287 | tension | S2 | "Can I undo it?" (slam) | desktop |
| 5 | 288–359 | tension | S2 | "Did it run the tests?" (slam) | desktop |
| 6 | 360–431 | build, riser | S3 | "An agent shouldn't / grade its own work" | desktop |
| 7 | 432–503 | build, riser, breath 486–503 | S3 | the pebble rises into the sage field, looks up, anticipates, leaps (f486) and hangs at the apex | desktop |
| 8 | 504–575 | **reveal**, motif | S4 | lands as the full stop of `pebble`; paper floods out; "A small companion for your Mac" | desktop |
| 9 | 576–647 | proof | S4 | the lockup holds; the wordmark rolls back into the pebble; it leaps (f634) | desktop |
| 10 | 648–719 | proof | S5a | mid-leap cut into the window world; "Reading invoice_kit/dates.py"; "It reads your project" | project |
| 11 | 720–791 | proof | S5b | the approval card arrives; "Review," | project |
| 12 | 792–863 | proof | S5b | Apply edit (f810) → Done, Undo this edit; "apply," "undo" | project |
| 13 | 864–935 | proof | S5c | both edits in; AgentGuard holds the task (f890): the music muffles (the hold, f891) | tested |
| 14 | 936–1007 | proof | S5c | "AgentGuard checks the evidence"; Run the tests (f990) | tested |
| 15 | 1008–1079 | proof | S5d | the "Run isolated tests" card; "Tests run in an isolated copy" | tested |
| 16 | 1080–1151 | proof | S5d | Run tests (f1080); the tests run; the breath (f1143–1151): the focus on "Requesting isolated tests", "· 11 s" (f1146) | tested |
| 17 | 1152–1223 | proof | S5e | **"Verified · pytest 42 passed on current files"** (f1152): the focus jumps to it, held to f1187; "Evidence before done" (slam); happy (f1204) | tested |
| 18 | 1224–1295 | proof | S6a | Settings (f1224) › Models; "Your model, your choice" / "Even one on your Mac" | model |
| 19 | 1296–1367 | proof | S6a/S6b | Permissions tab (f1332) | model → pace |
| 20 | 1368–1439 | proof | S6b | Auto in project (f1404); "You set what it may do" | pace |
| 21 | 1440–1511 | proof | S6c | Memory tab (f1440): the six layers; "Memory you can read and forget" | memory |
| 22 | 1512–1583 | proof | S6c | forget a record (f1530) | memory |
| 23 | 1584–1655 | **payoff**, motif, the second lift | S7a | the Lisbon trip budget dashboard; "Views, not just text" (slam, landed on the cut) | views |
| 24 | 1656–1727 | payoff | S7b | the chart becomes the world | views |
| 25 | 1728–1799 | payoff | S7c | the datetime quiz; the camera passes into its chosen answer | views |
| 26 | 1800–1871 | breakdown | S8 | "Free and open source" / "Apache-2.0" | open-source |
| 27 | 1872–1943 | breakdown | S8 | "No telemetry" | open-source |
| 28 | 1944–2015 | breakdown | S8 | "Your keys stay in your Keychain" (from f1941) | open-source |
| 29 | 2016–2087 | end card, motif | S9 | the pebble lands; `pebble` lockup on paper | get |
| 30 | 2088–2159 | end card | S9 | "A little help, right here." | get |
| 31 | 2160–2231 | **final chord**, the final hit | S9 | "Free for Macs with Apple silicon" (slam) + `github.com/tohin003/Pebble` | get |
| 32 | 2232–2303 | final chord rings; digital silence from f2250 | S9 | hold; small print | get |

Beat shares: hook 6.3 %, tension 9.4 %, build + reveal 12.5 %, proof 40.6 % (AgentGuard climax at 50 %), payoff 9.4 %
(starts at 68.8 %), claims 9.4 %, end card 12.5 %.

## 6. Shot list

Shots tile the film on bar lines: **S1** 0–143, **S2** 144–359, **S3** 360–503, **S4** 504–647, **S5** 648–1223,
**S6** 1224–1583, **S7** 1584–1799, **S8** 1800–2015, **S9** 2016–2303. Sub-beats (S5a…) are inside a shot. Text ids
(T…) are in §8, pebble cues in §9, sound effects in §11, seams in §12, review frames in §14. Focal points are frame
px (16:9 / square).

### S1 Hook (0–143) — desktop world, chapter `desktop`

The energetic recut (ENERGY_SPEC §5; OVERRIDES §35 decisions 1 and 2): proof first, legible muted by 2 s, and none of
Pebble's own time cut. Measured on `pet-live-error-light-hidden` (§7.1): the panel opens at 0.60 s; the question types
itself 1.30–2.93 s; Enter at 3.00 s shows "Sending" and "Task: queued"; "Thinking" from 3.30 s; the answer's first
word, "Python", at 4.60 s; at 5.43 s the feed scrolls up 17 CSS px as the answer takes its second line; "Task:
completed" at 6.60 s, after the dive, so it never shows. Panel rows (CSS px): the header 25–61, the greeting 126–204,
the composer 263–317, the toolbar 328–351, the card's bottom 361; the pebble's centre 397.3, its foot 435.5; the
question's text 113–143 at 3.00 s, 97–127 from 3.30 s, 80–110 from 5.43 s (its box from CSS y 71); the answer from
y 162 (x 26–350.3).

**S1a, the click and the question (0–71).**
- **Frame 0 is the thumbnail, unchanged** in every aspect: the riverbed desktop, the pebble large (m 2.6 at (1300, 640)
  / (640, 620); 9:16 m 3.4 at (540, 1080)), idle, eyes open and already turned toward where the pointer will enter
  (the f−15 look, gazeToward from the entry point: 16:9 and 1:1 {−0.25, −1}, 9:16 {−0.875, −0.5}).
- **f1–13: the pointer drops in** on a minimum-jerk arc (12 frames) from (1150, −60) / (500, −60) / (−70, 700) frame
  px at C0 (above the frame and a little left of the pebble; from the left inside the 9:16 band) and lands on the
  pebble; it dwells 5 frames while the eyes follow it.
- **f18 (beat 2): the click** (pose `tap`). The real quick chat opens on this frame at source 0.60 s, as the app opens
  it (no expand animation exists), seen at C0, its upper part above the frame.
- **f19–30: the camera makes room** for the panel: a 12-frame move on `EASE.ramp` (focus and log-zoom on one eased
  progress) with motion blur (FrameBlur = min(8, the pebble's frame travel since the last frame / 16) px: 6.0 / 6.7 /
  8 px on its fastest frames, f24–25). It replaces the 24-frame pull-back to m 1.5, which shrank the chat to 19 px.
  The pointer fades f24–28; `look: null` on f30.
- **C1 (f30, held to f71): the whole panel.** 16:9 m 2.35, pebble (1300, 938): header to toolbar ("pebble." at
  y 64), UI text 30.6 px. Square m 2.62 at (900, 846): the text centred, the header above the frame, 34.1 px (the
  narrow floor; the spec's m 2.6 read 33.8), the posted question's first line 60 px under the top from 3.30 s.
  Vertical m 2.62 at (900, 1400): the whole panel inside the band, its header at y 425. The 16:9 and 9:16 framings
  show the app's own tagline "A little help, right here.", which T18 rhymes with at the end.
- **f29–53: the question types itself** in the real composer with the app's own caret: "What does 'day is out of range
  for month' mean?", complete on f53. No typing ticks.
- **f54 (beat 4): Enter.** The bubble posts at the top of the feed; the header reads "Sending" and the feed "Task:
  queued"; pose `sending`. From here the recording plays at 1× to the dive. Muted check: on f60 (2.0 s) the posted
  question is on screen and legible (SF0b). The header grows a line for f54–58 ("pebble." / "Sending" / "A little
  help, right here.") before "Thinking" replaces it; in the square that line sits at the frame's top edge, the one
  allowed slice (the app's own movement).

**S1b, Pebble's answer and the dive (72–143).**
- **f72 (bar 2): a punch-in cut** to C2, the conversation from the bubble to the pebble; pose `thinking` (queued at
  3.15 s, "Thinking" in the header since 3.30 s). C2 is reframed from ENERGY_SPEC's numbers on a measurement: at 5.43 s
  (f127) the feed scrolls up 17 CSS px, and the spec's 16:9 m 2.9 at y 935 and square m 2.95 at (949, 951) then put the
  question's first line 16 px under the frame's top for f127–134, its box sliced. Here: 16:9 m 2.8 at (1300, 945)
  (+19 %, 36.4 px) and square m 2.8 at (928, 945) (+7 %: the most the bubble-to-pebble height allows at 1,080 px; the
  answer's lines 83 px inside both sides), the pebble's foot 28 px above the bottom. The header's status line
  ("Thinking", "Writing", ink to CSS y 59) stays wholly above the frame (at y 950 its descender showed as a sliver),
  and the question's first line sits 105 px under the top to f126 and 57 px for f127–134, after the app's scroll: 3 px
  inside the 60 px rule, the one documented exception, since the two lines are 21 CSS px apart and m ≥ 2.82 would push
  the pebble's foot off the frame. Vertical m 2.95 at (949, 1216) as specified (the band starts at y 250 and the line
  sits at 281; the answer's lines 62 px inside both sides; the header whole in the phone UI's top zone).
- **f102 (source 4.60 s): the answer starts** under the question ("Python…"); pose `writing`. By f135 the frame reads
  "Python is being asked for a date that doesn't exist, like 31 February. If it's" under the question: what the person
  asked and what Pebble answered, in one frame. (For f127–128 the app's stream shows "like **31" before its Markdown
  renders: real UI, two frames.)
- **f135–143: the breath and the dive** into the pebble (ZOOM_THROUGH from f135; zoom blur f141–143). The body's
  `#536B54` fills the frame on f143; the world changes on f144 with the whoosh's peak. It is one light-to-dark change
  that must take ≥ 3 frames from 20 % to 80 % of its swing (ENERGY_SPEC §11), with no reversal until f504. Measured on
  renders, the spec's ×30 on `EASE.exit` in nine frames took 1.8–2.3 frames (the body covers the frame between ×1.8
  and ×8.3, and EASE.exit crosses that in two), so the dive follows hook.ts DIVE_LOG_ZOOM instead: it lunges in over
  f135–137 (×1.43 a frame), slows through the band where the body covers the frame (×1.26 a frame, f137–141), quickens
  (×1.35) and rushes into the fill on its last frame (×2.4), reaching ×17 on f143; measured: 3.92 frames (16:9), 3.18
  (1:1), 3.52 (9:16). It aims at the body point (−3, 20) viewBox units, below the eyes, drifting to the frame's centre
  on `EASE.camera`: G2a's (−36, −10) was chosen for the `thinking` pose, and the recut's hook ends on `writing`, whose
  left eye then showed in the 16:9 fill frame's corner.
- "Task: completed" (6.60 s) is never shown, and the hook has no happy pose (the one celebration is f1204).

### S2 Questions (144–359) — sage field, chapter `desktop`

- **f144: seam by zoom-through** (the pebble's own sage becomes the world). Whoosh peaks f144 (picture f143 + 1).
- Three neutral questions a careful person asks of any AI helper (OVERRIDES §2), one per bar. **They build a list**
  (REVIEW-G2 P1-6, lane G-fix): left-aligned, the block centred on its widest line, line centres y 350 / 470 / 590
  (16:9) and 360 / 470 / 580 (square). The energetic recut: each **slams** onto its downbeat ((S), §3: k 1.10 in 16:9,
  1.06 narrow, anchored on the list's left edge), its pre-roll the 3 frames before: **T1** "What did it change?" lands
  on the seam frame f144 already at rest (its pre-roll falls in the hook), **T2** "Can I undo it?" lands f216 (pre-roll
  f213–215), **T3** "Did it run the tests?" lands f288 (f285–287) and holds exactly its 2.0 s. As a question arrives,
  the one before dims to 45 % from f213 / f285 and stays; the current one is white at ≥ 7:1 (the lead's addendum). All
  three blur out together f348–354; the field is empty f354–359 (flat frames by design). No camera moves and no
  presses: they would move landed type.
- They are ordered as the film answers them: the approval card answers T1 and T2 (S5b); AgentGuard answers T3
  (S5c–S5e), and T3 sets up the intent line.
- Focal: (960, 470) / (540, 470).

### S3 Build (360–503) — sage field, chapter `desktop`

- **f360: T4** "An agent shouldn't" / "grade its own work" (the one allowed comparative framing, as intent; OVERRIDES §2),
  entrance (C), block centred, centre y 420. Exit f462–467. The riser runs under bars 6–7.
- **f432: the pebble rises in** (hop H1 from off-frame below to foot (960, 880) / (540, 880), lands f447), dark palette
  (`#B4CDA6` body, `#23351F` eyes) because the ground is sage. f440 it looks up at the line.
- **f477:** eyes lead toward the lockup spot; **anticipation f481.5–486**, take-off f486 (H2), flight 0.6 s. The
  energetic recut: **H2 hangs** (§9.2's HANG): 45 % of its path by f494 (`EASE.enter`), the apex f494–500 covering only
  10 %, then a dart through the last 45 % in f500–504 on t², landing on the drop. f486–503 is the composed breath: the
  bed and the drive are silent by their own notes and the riser plays alone to its loudest last sample on f504.
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

Layout §4 (side split / stacked). Source: `main-live-film` recorded at 3× (§7.2; re-recorded from Pebble 1.0.4 by
lane v2-shots). The pebble keeps the spot (330, 900) / (940, 300) / (930, 660) from its landing at f652 to the end of
S7a, acting the app's real poses. The ROIs below are the 16:9's and G-fix's square; the square and the vertical now
share the framings of §6.1, measured on the 1.0.4 frames.

**S5a Reads (648–719).**
- **f648: the pebble carries across** (match cut on action, mid-flight); it lands f652; pose `reading`.
- Stage: 16:9 m 2.5, ROI x 345–745, y 172–552.8 (lane v2-film, REVIEW-G2 P2-9: the status line whole with its Stop button, the request bubble wholly above the top edge; G2a's m 2.6 sliced the bubble at the right edge); the narrow aspects §6.1. The request
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
- **T7** slams word by word with its verbs (§3 (S), k 1.10 / 1.04): "Review," lands f756 (with the review pose, on
  the still frame after the camera move), "apply," on the Apply edit click f810, "undo" on the beat f828 (was f830);
  line 1 "Review, apply,", line 2 "undo". Each word's pre-roll is its 3 frames before.
- **f774–797:** the camera tilts down to the card's lower part as the pointer enters (16:9 ROI y 404–800; square
  ROI y 519–800), so **Apply edit** sits at y ≈ 755 / 794, above the caption band. Apply edit becomes active at f786
  (source 8.13), as in the app.
- **Cursor** enters f780 from the stage's lower right, arrives by f803, **click-down f810** (source 9.40). Press
  f810–813: the button 0.97 and 4 % darker, drawn over the frozen 9.40 frame.
- **f814: match cut on the click** to the frozen 11.05 s frame: the same card, now in Earlier actions with "Done" and
  **Undo this edit**, aligned so its button row sits where Apply edit was; it arrives at 1.04× and settles on
  `SPRING.calm`. The card's width is identical (both frames come from one recording). Pop peaks f815.
- **Narrow aspects, lower framing** (REVIEW-G2 P0-2): the card's lower part at m 3.0, y 486–734 (§6.1), its bottom in
  the drawer's ground between the cards, so the next card's header and status ("tests/test_dates.py · Needs your
  review", then "· Done" on the match cut's frame) never show: one click never shows two edits applied. The square's
  pointer clicks Apply edit's upper part (css y 679, frame y 915); the vertical's its centre.
- **Focus on "Undo this edit"** (lane v2-film; it replaces G-fix's accent callout ring, which at 15 px still read as the
  text button's own outline, REVIEW-G2 P2-12, and pointing is not one of the accent's jobs): the rest of the frame
  recedes under the window's own colour (45 %, 2.5 px on-screen blur) over f826–837 (`EASE.enter`) and comes back
  f852–857; the button and 8 css px of air around it keep their own pixels. The loops point the same way.
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
- **f1143–1151, the breath** (the energetic recut): the picture holds while the focus comes onto the still-running
  "Requesting isolated tests" row over f1143–1148 (`EASE.enter`; rect CSS x 826–1147, y 377–404; the rest of the
  drawer recedes under the window's own veil, 45 %, 2.5 px): the camera points at the step still running, and on f1146
  the app's own "· 11 s" lands on it, the only sound in the gap.
- Focal: the card's lead (1400, 225) / (540, 450); Run tests (1677, 880) / (900, 895); then the newest row.

**S5e Verified, the climax (1152–1223).**
- **f1152 (bar 17): "Verified · pytest 42 passed on current files · 2 s"** appears (source 20.60). Shimmer peaks
  f1153. The run is not finished yet: Pebble writes its final reply (pose `writing` at f1161, source 20.90), and the
  run completes at f1204 (source 22.33), when the app's pebble turns **`happy`**: the film's one celebration, held
  4.5 s as in the app (to f1339). The celebration lands as the pull-back reveals the finished reply.
- **The pointing** (the energetic recut; OVERRIDES §35 decision 4): no magnification (the measured row with its bullet
  and its "+30.0 s" spans CSS x 834–1139.3, so no tighter framing keeps it whole 60 px inside the frame: s5dVerified
  stays in every aspect). On f1152 the focus JUMPS from "Requesting isolated tests" to "Verified · pytest 42 passed on
  current files · 2 s" (rect CSS x 826–1147, y 401–445) at full amount, with no ramp; every other row, and "Waiting for
  the model" when it arrives at 20.70 s, stays receded. Held to f1187 with no cut and no camera move (validateTimeline);
  released f1182–1187 (`EASE.exit`) with the check.
- **T10** "Evidence" / "before done" (16:9: two lines, as the column's other statements; one line in the narrow
  aspects), the energetic recut's slam (§3), landing f1152 (pre-roll f1149–1151, the breath's last three frames), out
  f1212, holding exactly 2.0 s. On one line its "done" ended 6 px from the check, which then read as "done✓" (lane
  v2-film).
- **Check mark** (16:9 only, the accent's state-mark job): a stroked check, **72 px, 8 px** `#506E54`, round caps,
  centred at (**860**, y of the Verified row), outside the UI with 24 px clear of the stage (C3; REVIEW-G2 P1-5, lane
  G-fix); drawn on f1152–1162, `EASE.enter`.
- **Exit move f1188–1211:** the camera pulls back to the whole window (framing.ts s5eOut), the energetic recut's
  speed-ramped move (`EASE.ramp`, with the stage's motion blur), landing on the finished reply as the pebble turns happy
  at f1204. The final reply streams: "The tests ran in an isolated copy of your project: 42 passed. Both edits are
  verified, and the CSV export works again for invoices issued on the 29th, 30th and 31st."
- **Cursor** enters f1196 from the right, arrives by f1219 on the window's Settings button (the gear, CSS (1036, 32);
  frame (1758, 102) / (895, 378)), **click-down f1224**.
- Focal: f1152–1187 the Verified row (1400, row y) / (560, row y); f1188–1223 the finished reply and the gear; the
  happy pebble at f1204 in the column.

### S6 Settings (1224–1583) — window world, chapters `model` (1224), `pace` (1332), `memory` (1440)

Stills `settings-*@3x` (real, light; retaken from Pebble 1.0.4). 16:9 m 2.025, ROI x 342–835.8 (the modal's content,
so the bins at x 799 stay 79 px inside the frame edge); the narrow aspects at the 34 px floor, §6.1 (the match cut
lands on Models' ways in, the camera tilts to the tabs before each tab click, to the modes, and to the six layers).
Each tab change is a **match cut on the click**: the frame holds still and the content changes, as a tab does.

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
- Narrow aspects (lane v2-film): f1444–1467 the camera tilts from the tabs to the six layers (m 2.85: all six names
  whole, 60 px inside the frame, at 34 px) and holds them 1.1 s; **f1500–1523** it pans out to the records (m 2.12, the
  most that keeps the records' text and the bin's click 60 px inside the frame; 26.5 px, the one documented exception:
  the action carries the shot), landing before the pointer reaches the bin.
- **16:9, f1476–1499:** the camera pans down to the records (ROI y 328–798.1).
- Cursor f1500–1525 to the bin icon next to "Uses metric units and 24-hour times." (its accessible label is "Forget
  this memory"; no tooltip is drawn), **click-down f1530** at (1841, 853) / (1018, 892) / (1018, 1373), above each
  aspect's caption band.
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
- **T14** "Views," / "not just text", the energetic recut's slam landing on the cut (f1584, the second lift: it
  appears already landed); the world move takes it at f1656.
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
  x 421.5–1160, y 190–605.4 (the conversation left of the canvas recedes under a veil). The narrow aspects at the 34 px
  floor (lane v2-film, measured on the 1.0.4 still): the left edge 2 css px inside the canvas's border, the right edge
  before the timer "07:39 left" (x 1078), which an edge at 1085 cut to a lone "0"; square m 3.08, y 186–536.6 (the
  label 108 px under the top); vertical m 3.17, y 120–725.7, the canvas's toolbar in the phone UI's top zone receding
  under the same veil, the label at y 320 inside the band. (The question rhymes with the film's bug.)
- **f1786–1799: zoom through the selected answer's "A" badge** (`#506E54`): aim inside the badge and away from the white
  "A" (G2a: (765, 457.3)); ×1 → ×90, `EASE.exit`; the badge fills the frame **on f1799** (lane G-fix, P1-2), the world
  changes on f1800 with the whoosh's peak. From f1794 the badge's colour covers its white "A" under the zoom blur (P2-7).
- Focal: the question (960, 300) / (540, 330); f1782–1799 the badge → frame centre.

### S8 Claims (1800–2015) — sage field, chapter `open-source`

- **f1800: seam by zoom-through.** The ground starts at the badge's `#506E54` and eases to the type ground `#425643`
  by f1812 (§4). Whoosh peaks f1800 (picture f1799 + 1).
- **The facts build a list** as the questions do (REVIEW-G2 P1-6, lane G-fix; left-aligned, the block centred on its
  widest line; earlier items dim to 45 %). The energetic recut: the facts slam ((S), §3): **T15** "Free and open
  source" lands on the seam f1800 already at rest, with **T15s** "Apache-2.0" (data: Geist Mono) inking in calmly at
  f1806; **T16** "No telemetry" lands f1872 (bar 27; pre-roll f1869–1871, as T15 and T15s dim); **T17** "Your keys stay
  in your Keychain" lands f1926 (beat 107; pre-roll f1923–1925, as T16 dims; one line in 16:9, two in the narrow
  aspects) and holds 2.4 s. Centres y 290 / baseline 425 /
  530 / 690 (16:9), 285 / 400 / 505 / 690 (square) and 735 / 850 / 955 / 1140 (vertical). The list leaves together
  f1998–2004, before the end card's pebble enters the frame (≈ f2005), so it never crosses a line (P1-3).
- Focal: (960, 450) / (540, 450).

### S9 End card (2016–2303) — paper world, chapter `get`

- **The pebble carries in:** a second pebble instance starts off-frame lower right, (2050, 1180) / (1180, 1180), dark
  palette; eyes lead at f1999; take-off f2002 (H4); **lands f2016 (bar 29, motif)** as the full stop at (1295, 422) /
  (806, 402): squash, `jelly`, pose `tap`. The thud peaks f2017 and the bed ducks 1.5 dB. No pop: the one layered on
  the thud here left the mix in 9535d46 (§11).
- **Colour flood** sage → paper from the landing point (same as the reveal, deliberately: the visual motif repeats
  with the musical motif), f2016–2029; the palette changes with the light.
- **(W)** `pebble` unrolls out of the pebble f2018–2032 (no tracking settle this time).
- The flat paper of the page; the lockup stands on the pebble's line (§4), the page footer's picture.
- **T18** "A little help, right here." (side-line size, (A)), in f2088, holds to the end. Baseline y 560 / 520 / 950.
- **f2160 (bar 31, the final chord and the final hit): T19** "Free for Macs with Apple silicon" (CTA words; the
  energetic recut's slam, centred: k 1.10 / 1.06, its pre-roll f2157–2159 in the last breath's last three frames)
  baseline y 690 / 630 / 1060 and **T20** `github.com/tohin003/Pebble` (URL, Geist Mono, (C), rising from f2164)
  baseline y 770 / 700 / 1130. 26 characters, held 4.8 s. The master fades f2214–2249; digital silence from f2250.
- **f2196: T21** "Shown with sample data" and **T22** "Pebble's character engine: bloub by Jérémy Perret (MIT)" (small
  print, fade 9 frames), baselines y 852 / 892 (16:9), 820 / 860 (square) and 1250 / 1290 (vertical).
- The pebble: `idle` at f2052; glances at the URL at f2166; looks at the viewer at f2214 to the end. **Last frame
  f2303: everything landed, the eyes open** (the last blink ends f2278).
- Focal: f2016–2087 the lockup (960, 380) / (540, 360); f2088–2159 the tagline; f2160+ the URL (960, 750) /
  (540, 690).

### 6.1 The narrow framings (1:1 and 9:16), lane v2-film

The square's and the vertical's stages are both 1,056 × 744 (the square's at y 336, bleeding off the right and bottom
edges; the vertical's at y 700, bleeding off the right, its bottom a visible hairline at y 1444), so they share one
set of framings (`video/src/film/framing.ts` SETS.square; the vertical's own in VERTICAL_ONLY). Each is written as its
visible rect and was checked on Pebble 1.0.4's recording and stills: top and left edges in clear space, the bottom too
(the vertical shows it), click targets ≥ 60 px inside the frame and above the caption band, and every shot whose text
is the point at m ≥ 2.85 so the app's 12–12.5 px type reads at ≥ 34 px.

| Framing | Frames | m | Visible rect (css px) | What it shows |
|---|---|---|---|---|
| s5a | 648–719 | 3.02 | x 328–677.7, y 172–418.4 | the status line alone ("Reading · Reading invoice_kit/dates.py · 5 s", ink 41 px); the request bubble and the long line's Stop button wholly outside |
| s5bTop | 753–773 | 3.0 | x 808–1160, y 202–450 | the edit card's upper part: header, lead, the diff's first lines |
| s5bLow | 797–863 | 3.0 | x 808–1160, y 486–734 | the diff's last lines, Don't allow / Apply edit; after the match cut, Done and Undo this edit; the next card never shows (P0-2) |
| s5c (stage 1) | 864–953 | 2.25 | x 242.7–711.8, y 420.5–751 | the whole held run, all three choices whole (a transition: 27 px) |
| s5cRead (stage 2) | 977–1007 | 3.36 | x 222.6–537.2, y 420.8–642.5 | "Blocked", the sentence (ink 38 px), Run the tests and Ask Pebble to finish whole, Accept as unverified wholly outside (P0-1) |
| s5dTop | 1008–1050 | 3.0 | x 808–1160, y 202–450 | the "Run isolated tests" card: title, lead, the sandbox note, recipe, command |
| s5dTilt | 1073–1116 | 3.0 | x 808–1160, y 374–622 | Command, Technical details, Don't allow / Run tests (the click), the first steps |
| s5dVerified | 1139–1188 | 3.0 | x 808–1160, y 380–628 | the newest steps down to "Verified · pytest 42 passed on current files · 2 s" |
| s5eOut | 1211–1223 | 1.14 | x 230–1160, y 0–655 | the pull-back to the whole window and the gear (a transition) |
| s6aWays | 1224–1290 | 3.0 | x 340–692, y 195–443 | YOUR MODELS, the model row, Add a model file, Connect provider, Continue with ChatGPT |
| s6a | 1313–1338, 1431–1444 | 3.0 | x 340–692, y 100–348 | the tabs (the Permissions and Memory clicks) |
| s6bTilt | 1361–1408 | 3.0 | x 340–692, y 218–466 | Ask for approval and Auto in project (the click) with their own words |
| s6cLayers | 1467–1500 | 2.85 | x 335–705.5, y 195–456 | "Remember useful context", the six layers, all six names whole |
| s6c (square) | 1523–1583 | 2.12 | x 328–826.1, y 455–806 | the records and their bins (the forget click at y 892); the blurred app under the modal shows in the caption band |
| s6c (vertical) | 1523–1583 | 2.12 | x 328–826.1, y 400–750.9 | the records, the bottom before the modal's edge |
| s7aAsk | 1584–1602 | 2.99 | x 284–637.4, y 76–325 | the request, the reply under a veil |
| s7a | 1625–1655 | 1.33 | x 643.1–1440, y 66–627.5 | the canvas (a picture) |

The full-frame worlds have their own: the chart (square m 2.55; vertical m 3.7 on Flights, Stay and Food, the panel
growing only to its rows, §22) and the quiz (S7c).

## 7. Source-time maps (real UI sequences)

Film frame → source seconds of the vclock recording. Between keys, play linearly. A speed below 1 repeats frames; above
1 skips frames. Never reverse. A jump is allowed only on a cut. Lane G checks every listed event on the recorded frames
and nudges the keys (± 3 frames) if an event lands elsewhere; the click frames do not move.

### 7.1 `pet-live-error` (S1), recorded at 3× with the avatar hidden (R1)

The energetic recut plays `ui-frames/pet-live-error-light-hidden` (light theme, 270 frames, 0–8.97 s; the older
140-frame `pet-live-error` stays on disk) on a map with **no jump and no skip of Pebble's time** (OVERRIDES §35
decision 2). The person's part, from the click to Enter, plays at 2× so the question is sent by 1.8 s; from Enter on,
Pebble's part plays at exactly 1× (1/30 s a frame, validateTimeline), so everything Pebble does keeps its real
timing: "Sending", "Thinking", the first word at 4.60 s. Why 2× and not a cut: the typing is the person's own act,
shown whole and legible, and compressing it changes nothing Pebble did; the drop plan's 3.58 → 5.00 s skip was
rejected because it would have shortened Pebble's own time (the Gemini demo's faked latency, ENERGY_SPEC §2). The
answer is still streaming when the dive begins, so "Task: completed" (6.60 s) never shows.

| Film frames | Source s | Speed | What is on screen |
|---|---|---|---|
| 0–17 | — | — | the capture is empty; the collapsed pebble is `PebbleOnFilm` on the desktop |
| 18 → 54 | 0.60 → 3.00 | 2× (the person's part) | the chat opens on the click frame; the greeting; the question types itself 1.30–2.93 s (f29–53) |
| 54 → 143 | 3.00 → 5.9667 | 1× (Pebble's part) | Enter: "Sending", "Task: queued"; "Thinking" from 3.30 s (f63); the answer from 4.60 s (f102); the feed scrolls at 5.43 s (f127) |

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

### 7.4 The trailer's maps (§24.5) and a capture-artifact repair

The trailer plays v1.5.0's fidelity-round-2 captures (retake 2b) on the maps in §24.5. One capture artifact is repaired
(OVERRIDES §43): **the quick chat's caret.** In `pet-live-150-light-hidden` the composer's caret, CSS [25, 273, 1, 15]
of the 384 × 456 panel, blinks on Chrome's real clock from the send on (source frame 90): every 2–3 frames, about
10 Hz in the film. The app blinks it about once a second. `QuickChat.tsx` covers the caret's box on every frame
(f792–935) with the same box from source frame 94, a recorded frame with the caret off, so the placeholder's first
column, which the caret overlaps, stays as recorded. It then draws the caret (#252C28, the recorded caret's colour) to
the app's rhythm: on for 15 frames from the send, when the cleared composer resets it, then off for 15, and so on.
No other recording the trailer frames has a caret in view: the conversation's composer in bar 21 (source 455–485)
does not change.

## 8. On-screen text

`in` = the frame the first word (or line) starts; `out` = the frame the exit starts (gone 6 frames later). Hold =
out − in, checked against `holdFor` (0.5 s + 0.3 s per word, ≥ 1.2 s; the last line of a shot ≥ 2 s; the end card's key
lines readable twice: ≥ 2 s and 0.6 s per word). Positions are given for 16:9 / square.

| Id | Text (line breaks shown with /) | Shot | Role, entrance | in | out | Hold (s) / needed | Position |
|---|---|---|---|---|---|---|---|
| T1 | What did it change? | S2 | headline, (S) slam, list item | 144 (landed on the seam) | 348 (dims from 213) | 6.80 / 1.70 | list, centre y 325 / 350 / 840 |
| T2 | Can I undo it? | S2 | headline, (S) slam, list item | 216 | 348 (dims from 285) | 4.40 / 1.70 | list, centre y 470 / 470 / 960 |
| T3 | Did it run the tests? | S2 | headline, (S) slam, list item | 288 | 348 | 2.00 / 2.00 | list, centre y 615 / 590 / 1080 |
| T4 | An agent shouldn't / grade its own work | S3 | headline, (C) | 360 | 462 | 3.40 / 2.60 | centred block, centre y 420 |
| W1 | `pebble` (wordmark, the pebble as its full stop) | S4 | wordmark, (W) | 506 | 614 (rolls back) | — | baseline y 420 / 400 |
| T5 | A small companion for your Mac | S4 | support, (A) | 522 | 612 | 3.00 / 2.30 | centred, baseline y 560 / 530 |
| T6 | It reads / your project | S5a | side line, (A) | 666 | 718 | 1.73 / 1.70 | column / band top-left |
| T7 | Review, apply, / undo | S5b | side line, (S) slam word by word with the verbs: 756, 810, 828 | 756 | 858 | 3.40 / 1.40 | column / band |
| T8 | AgentGuard checks / the evidence | S5c | side line, (A) | 936 | 1038 | 3.40 / 1.70 | column / band |
| T9 | Tests run in / an isolated copy | S5d | side line, (A) | 1044 | 1140 | 3.20 / 2.30 | column / band |
| T10 | Evidence / before done (narrow: Evidence before done) | S5e | side line, (S) slam | 1152 | 1212 | 2.00 / 2.00 (last of S5) | column / band |
| T11 | Your model, / your choice | S6a | side line, (A) | 1242 | 1320 | 2.60 / 1.70 | column / band |
| T11s | Even one on your Mac | S6a | support, (A) | 1260 | 1320 | 2.00 / 2.00 | under T11 |
| T12 | You set what / it may do | S6b | side line, (C) | 1350 | 1428 | 2.60 / 2.00 | column / band |
| T13 | Memory you can / read and forget | S6c | side line, (A) | 1458 | 1578 | 4.00 / 2.30 (last of S6) | column / band |
| T14 | Views, / not just text | S7a | side line, (S) slam (landed on the cut) | 1584 | 1656 (taken by the world move) | 2.40 / 2.00 (last of S7) | column / band |
| T15 | Free and open source | S8 | headline, (S) slam, list item (landed on the seam) | 1800 | 1998 (dims from 1869) | 6.60 / 1.70 | list, centre y 290 / 285 / 735 |
| T15s | Apache-2.0 | S8 | data (Geist Mono), (B) whole, list item | 1806 | 1998 (dims from 1869) | 6.40 / 1.20 | under T15, baseline y 425 / 400 / 850 |
| T16 | No telemetry | S8 | headline, (S) slam, list item | 1872 | 1998 (dims from 1923) | 4.20 / 1.20 | list, centre y 530 / 505 / 955 |
| T17 | Your keys stay in your Keychain (square and vertical: Your keys stay / in your Keychain) | S8 | headline, (S) slam, list item | 1926 | 1998 | 2.40 / 2.30 (last of S8) | list, centre y 690 / 690 / 1140 |
| W2 | `pebble` | S9 | wordmark, (W) | 2018 | end | — | baseline y 420 / 400 |
| T18 | A little help, right here. | S9 | side line (16:9 92 px, square 72 px), (A) | 2088 | end | 7.17 / 3.00 (key) | centred, baseline y 560 / 520 |
| T19 | Free for Macs with Apple silicon | S9 | CTA words, (S) slam, centred | 2160 | end | 4.80 / 3.60 (key) | centred, baseline y 690 / 630 |
| T20 | github.com/tohin003/Pebble | S9 | URL (Geist Mono), (C) | 2164 | end | 4.67 / 2.00 (key) | centred, baseline y 770 / 700 / 1130 |
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

Only Pebble's own poses (D6): `idle`, `hover`, `tap`, `sending`, `thinking`, `reading`, `editing`, `review`, `blocked`,
`testing`, `writing`, `happy` (`sending` is companionState's row 7.5, the app's pose on Enter, used by the recut's
hook; `hover` is no longer cued: §9.3). Never an engine catalogue state. Each pose follows a real event exactly as the app's reducer would (U1 §3.6);
the "!" (`review`) appears only while an approval waits (twice: the edit card and the tests card).

### 9.1 Instances

| Instance | Frames | Start | Hops | Palette |
|---|---|---|---|---|
| P-desk | 0–143 | inside the desktop world at the pet's place (it scales with the camera) | — | light |
| P-main | 432–1665 | off-frame below: (960, 1200) / (540, 1200) / (540, 2050) (G2a: at 1150 its top showed) | H1, H2, H3 | dark until the reveal flood reaches it (f504), then light |
| P-end | 1999–2303 | off-frame lower right: (2050, 1180) / (1180, 1180) / (1180, 2010) | H4 | dark until f2016, then light |

All share one cue list (§9.3) in absolute composition time. P-main is covered by the chart at f1656–1665 and not drawn
after f1665. Contact shadow on (R5 §5.9).

### 9.2 Hops (acting layer, outer transforms only)

| Hop | Take-off (s / frame) | Duration | From → to (16:9) | From → to (square) | From → to (vertical, §22) | Lands |
|---|---|---|---|---|---|
| H1 rise in | 14.400 / f432 | 0.500 | (960, 1200) → (960, 880) | (540, 1200) → (540, 880) | (540, 2050) → (540, 1300) | f447 |
| H2 the leap (hangs) | 16.200 / f486 | 0.600, timing HANG | (960, 880) → (1295, 422) | (540, 880) → (806, 402) | (540, 1300) → (806, 832) | **f504** |
| H3 the carry | 21.133 / f634 | 0.600 | (1295, 422) → (330, 900) | (806, 402) → (940, 300) | (806, 832) → (930, 660) | f652 (cut at f648) |
| H4 into the end card | 66.733 / f2002 | 0.467 | (2050, 1180) → (1295, 422) | (1180, 1180) → (806, 402) | (1180, 2010) → (806, 832) | **f2016** |

Anticipation 0.15 s (sy 0.89) before each take-off; stretch sy 1.11 / sx 0.90; landing squash sy 0.87 / sx 1.15 for
2 frames, then `jelly`. Eyes lead each hop by 0.1 s (look cues below).

**H2's timing (the energetic recut, `Hop.timing` in `video/src/pebble/acting.ts`):** a hop's timing maps the flight's
linear progress u to the progress the ground, the lift and the stretch use (identity by default; 0 → 0 and 1 → 1, so
the take-off and the landing keep their frames). H2's HANG (timeline.ts) runs 0 → 0.45 by 8/18 of the flight on
`EASE.enter` (the take-off's burst: f486–494), linear 0.45 → 0.55 to 14/18 (the hang at the apex, f494–500), then
0.55 → 1 on t² (the dart, f500–504), landing on the drop at full speed. Its anticipation runs f481.5–486, inside bar 7
before the composed breath; validateTimeline's "H2 lands on the reveal" holds (16.2 + 0.6 s = f504).

### 9.3 Cue list (absolute seconds = frame / 30)

| Frame | s | Cue | Event |
|---|---|---|---|
| −15 | −0.500 | `look` toward the pointer's entry point (gazeToward from the pebble's box at C0: 16:9 and square `{−0.25, −1}`, vertical `{−0.875, −0.5}`) | frame 0 already looks where the pointer comes from |
| 0 | 0.000 | pose `idle` (initial) | frame 0: eyes open |
| 1–27 | 0.033–0.900 | `look` from the pointer, every quantised change | `gazeToward(pointer, pet box, reach = 200 desktop pt)`; the app's eyes follow the pointer |
| 18 | 0.600 | pose `tap` | the click opens the quick chat (tap lasts 1.2 s, to f54). No `hover`: the pointer is in the pet window under 14 frames before the tap (the engine's 0.45 s morph), so the app's tap supersedes it |
| 30 | 1.000 | `look: null` | the pointer has faded |
| 54 | 1.800 | pose `sending` | Enter: the message is sent (3.00 s) |
| 72 | 2.400 | pose `thinking` | queued at 3.15 s, "Thinking" from 3.30 s; on the cut |
| 102 | 3.400 | pose `writing` | the answer's first word (4.60 s) |
| 144 | 4.800 | pose `idle` | (not drawn until f432) |
| 440 | 14.667 | `look {x: 0, y: −0.75}` | looks up at T4 |
| 477 | 15.900 | `look {x: 0.625, y: −0.75}` (square and vertical `{0.5, −0.875}`) | eyes lead the leap (H2 takes off on f486) |
| 504 | 16.800 | pose `tap` | lands: the reveal |
| 520 | 17.333 | `look: null` | |
| 540 | 18.000 | pose `idle` | tap ends (1.2 s, TAP_MS) |
| 624 | 20.800 | `look {x: −0.875, y: 0.5}` (square `{0.75, −0.625}`; vertical `{0.625, −0.75}`) | eyes lead the carry |
| 652 | 21.733 | pose `reading` | lands in the window world; the status line reads Reading |
| 660 | 22.000 | `look {x: 0.875, y: −0.375}` (square `{−0.875, 0.5}`; vertical `{−0.625, 0.75}`) | toward the status line |
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
| 1584 | 52.800 | `look {x: 0.875, y: −0.375}` (square `{−0.875, 0.5}`; vertical `{−0.75, 0.625}`) | the dashboard |
| 1999 | 66.633 | `look {x: −0.75, y: −0.75}` (square `{−0.375, −0.875}`; vertical `{−0.25, −0.875}`) | P-end: eyes lead the landing |
| 2016 | 67.200 | pose `tap` | lands in the end-card lockup |
| 2030 | 67.667 | `look: null` | |
| 2052 | 68.400 | pose `idle` | |
| 2166 | 72.200 | `look {x: −0.625, y: 0.75}` | glances at the URL |
| 2214 | 73.800 | `look {x: 0, y: 0}` | looks at the viewer to the end |

Spacing: the engine keeps one slot of history and morphs a face in 0.45 s, so two pose changes are never closer than
14 frames (the tightest: sending → thinking, f54 → 72, 18 frames; validateTimeline checks it); every change into or out of `review` (the "!") is ≥ 18 frames
(0.6 s, MIN_BLOCK) from its neighbours. Directional look cues are computed from the final positions (§9.2, §6) and
quantised to 1/8; Lane G recomputes them if a position moves. Pointer look cues: `gazeToward` from the film cursor in
the pebble's own frame space (reach 200 pt × the pebble's scale), a cue only when the quantised gaze changes; the
engine's 0.24 s catch-up does the rest.

### 9.4 Blinks (natural schedule, bloub seed 0x5eed; measured with `blinkStarts`)

Blinks cover frames 42–48, 156–162, 290–304 (double), 385–391, 467–474, 570–576, 708–714, 819–825, 901–908,
1026–1032, 1098–1105, 1183–1190, 1244–1251, 1306–1312, 1405–1412, 1538–1552 (double), 1661–1675 (double), 1784–1790,
1898–1905, 1972–1979, 2095–2109 (double), 2167–2173, 2271–2278. Every key frame has open eyes: 0, 18, 504, 540, 652,
1152, 1204, 2016, 2052, 2160, 2303 (checked). No state change forces a blink (no `blinkIn` pose is used).

## 10. Cursor and clicks

Our own arrow (black fill, 3 px white stroke, card shadow); never Apple's art. Path: `cursorAt` (minimum-jerk with a
gentle arc), duration `cursorTravelS` (Fitts), arriving ≥ 5 frames before the click; dwell; press 0.88 for 0.06 s,
hold 0.04 s, release on `SPRING.snappy`; the target's press state 0.97 and 4 % darker for 4 frames. No click rings.
Hidden (0.15 s fade) whenever it is not acting.

| Click-down | Beat | Target | Shot |
|---|---|---|---|
| f18 | 1 (the hook's click moves from f36 by design; the recording's 0.60 s is still drawn on it) | the pebble | S1a |
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

The energetic recut (ENERGY_SPEC §8.4): designed UI sounds on real events, impacts on the hits, all unpitched. The
kept bed (compose_score.py --seed 7, rendered by render_sampled.py, bit for bit) now has a drum-and-sub stem under it
(`tools/audio/drive.py`, the score lane's), and the mix applies the timeline's automation (below).

| Picture frame | Peak | Role, take | Event | Notes |
|---|---|---|---|---|
| 18 | 19 | click, click_a | the pebble is clicked | pan +0.13 |
| 54 | 55 | key, tick_c | the message is sent (Enter) | −15 dB |
| 143 | 144 | whoosh, whoosh_b | into the sage field (the dive) | it rises through the gap |
| 360–504 | end 504 | riser | bars 6–7 | the only riser |
| 504 | 505 | impact, impact_a | the drop: the pebble lands as the full stop | duck the bed 2.5 dB; replaces soft_hit_b |
| 504 | 505 | thud, thud_a | texture under the drop | three at once with the riser's end, the limit |
| 648 | 649 | whoosh, whoosh_a | the carry into the window world | |
| 722 | 723 | ui, ui_card | the drawer opens with the edit card | |
| 810 | 811 | click, click_b | Apply edit | pan +0.3 |
| 814 | 815 | ui, ui_done | Done | replaces the tuned pop_a |
| 890 | 891 | ui, ui_lock | AgentGuard holds the task | |
| 900, 918, 936, 954, 972 | +1 | rim, rim_a / rim_b alternating | the hold's clock on every beat | −15 dB; OVERRIDES §35 decision 3 and §36: beats 1 and 3 to begin with, every beat because the classifier stayed clean (the hold window 29–34 s reads phone 0.166 web, 0.171 social, 0.164 x30, no voice or alarm label) |
| 936 | 937 | thump, soft_hit_a | T8 lands in the hold | −12 dB |
| 990 | 991 | click, click_c | Run the tests | pan +0.09; it releases the hold |
| 1080 | 1081 | click, click_a | Run tests | pan +0.3 |
| 1094 | 1095 | tick, tick_a | "Requesting isolated tests" | −18 dB |
| 1146 | 1147 | tick, tick_b | the app's own "· 11 s" | −18 dB, alone in the gap |
| 1152 | 1153 | impact, impact_b | **Verified** | duck 1.5 dB |
| 1152 | 1153 | ui, ui_verified | **Verified** | replaces shimmer_a |
| 1224 / 1332 / 1404 / 1440 | +1 | click, b / c / a / b | Settings, Permissions, Auto in project, Memory | pans +0.37 / +0.12 / +0.06 / +0.21 |
| 1530 | 1531 | click, click_c | the bin | pan +0.37 |
| 1530 | 1531 | ui, ui_forget | the record dissolves | runs under the dissolve; pop_c at f1542 is removed |
| 1584 | 1585 | impact, impact_a | the second lift | duck 1.5 dB |
| 1665 | 1666 | whoosh, whoosh_c | the chart becomes the world (its fastest frame) | |
| 1799 | 1800 | whoosh, whoosh_a | into the sage field (the badge dive) | |
| 1800 | 1801 | impact, impact_b | the breakdown's one hit | |
| 2016 | 2017 | thud, thud_b | the end-card landing | duck 1.5 dB |
| 2016 | 2017 | impact, impact_b | the end-card landing | |
| 2160 | 2161 | impact, impact_a | the final hit | duck 2 dB |

36 effects, as ENERGY_SPEC §8.4 lists them. No chimes, dings, pitched pops or anything voice-like: the pitched pop_a
and pop_c, the reveal's soft_hit_b and the shimmer left the film (they stay in the kit, unused). No downlifter. The
final chord is music, not an effect. Gains are the kit's (`tools/audio/sfx_kit.json`); the score lane's final mixes
set impact at −4 dB and the riser at −11 dB, so the hits sit 3.4–5.6 dB over the bed (the impact with the effects and
the drive's hit on its frame, K-weighted over the impact's peak ± 100 ms).

**Mix automation** (timeline.ts AUTOMATION; exported after the effects as entries with no file, in the kit's
"automation" format: role, frame, to_frame, release_frame, t, t_end, the role's params; mix_master.py applies them,
cut_cues.py clips them to a cut's ranges, and they never count toward the three-at-once limit; effects are never
gapped):

| Role | Frames | What |
|---|---|---|
| ride | f0–143, back on f144 | the hook's level (OVERRIDES §36: at most 2 dB, the bed file unchanged): bed and drive −1.5 dB, back in 4 ms on the first slam's hit with the gap, so bars 1–2 sit 4.89 LU under the web master (4–8 wanted; 3.5 without it). Not a breath: the gap rules don't apply to it |
| gap | f135–143, the hit on f144 | bed and drive −24 dB (10 ms down, 4 ms back on the hit frame); the whoosh rises through it |
| hold | f891–989, release f990–1007 | the drive muted; the bed −6 dB behind a 1.2 kHz low-pass (a 30 ms crossfade to a filtered copy); from the click the filter opens and the gain returns into the f1008 downbeat. Caption c11b "[Music muffles]" |
| gap | f1143–1151, then f1152 | as above; tick_b sounds inside |
| gap | f1575–1583, then f1584 | as above |
| gap | f2151–2159, then f2160 | as above |
| tail | fade f2214–2249; zeros f2250–2303 | the whole master, after the limiter, on an equal-power curve (amplitude cos(πu/2)): a fade linear in dB took the final chord 30 dB down in 0.6 s, and SoundAnalysis heard the hit and its quick decay as "foghorn" (0.46–0.59) |
| (breath) | f486–503 | composed, with no automation: the bed and the drive are silent by their own notes; the riser alone |

Each gap swallows the bed's own pickup on the "and" of 4: that is the breath. validateTimeline checks the gaps (9
frames, ending the frame before a bar line, their hits ≥ 4 bars apart with the f504 breath), the hold (from an eighth
to the Run the tests click, released to a bar line) and that nothing cuts, moves, changes pose or lands inside a
breath (but the hook's dive, H2's take-off and slam pre-rolls in a gap's last three frames).

**The drive and the masters** (the score lane; numbers in `docs/media-provenance.json`,
`music.sampled_score.energetic_recut`). Apple's sound classifier binds over the spec's drum pattern (OVERRIDES §36):
under the kept bed's mallets a steady beat reads as a telephone or a ringtone, so `tools/audio/drive.py` plays
quarter-note hats outside the drop and the climax, no snaps in grooves A and A′, no short ghost subs, and, from the
final mixes, no sub on 3 in bars 10 and 12, half-velocity hats in bars 10–11, no claps and softer snaps in bars 24–25,
no soft snap in bar 29, and a final hit with a 1.5 s sub, a softer kick and a louder crash. Every phone reading is under
0.25 on the web, social and x30 masters. The masters: `soundtrack_web.wav` −16.1 LUFS, −1.8 dBTP (the limiter's ceiling
came down from −1.7 so that the film's AAC 160 kb/s encode reads −1.62 dBTP, under verify.mjs's −1.5),
`soundtrack_social.wav` −14.3 LUFS, −1.5 dBTP (AAC 192 kb/s −1.05) and `soundtrack_x30_social.wav` −14.4 LUFS, −1.5 dBTP
(AAC 192 kb/s −1.33), all in `.work/audio/render/`.

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
| 7 | 1152 | tests → Verified | continuous (R2): a camera seam with no cut and no settle (the energetic recut points with the focus, which jumps to the row; nothing moves f1152–1187) | the Verified row appears |
| 8 | 1224 | Verified → Settings | match cut on a click | the Settings button |
| 9 | 1332 | Models → Permissions | match cut on a click | the tab |
| 10 | 1440 | Permissions → Memory | match cut on a click | the tab |
| 11 | 1584 | Settings → views | **hard cut** | the payoff, on the motif downbeat |
| 12 | 1656 | dashboard → chart world | object becomes the world | the chart panel grows past the frame |
| 13 | 1728 | chart → quiz | hard cut (inside the payoff) | the next view, on the bar |
| 14 | 1800 | quiz → claims | zoom through | the camera passes into the chosen answer's badge |
| 15 | 2016 | claims → end card | colour flood + carry in | the pebble lands; paper spreads from it |

Inside shots: f72 punch-in (hook), f814 match cut on the click, f1404 match cut on the click, f1542 state swap. The
energetic recut adds no seam: its camera vocabulary is the f72 punch-in cut, two speed-ramped moves on `EASE.ramp` (the
hook's f19–30 and the f1188–1211 pull-back) and no whips (OVERRIDES §35 decision 7). Settles stay only on f814 and
f1224; there is none at f1152 or f1584 (they would slice text for their first frames).
**Hard cuts between beats: 3 of 15 seams (20 %; lane G-fix made f1008 a cut), 4 counting the payoff's internal cut
(27 %), all under R5's one-third.** Five kinds, within R5's 3–5.

Cut strips (R5 §13.6): render frames −6, −3, 0, +3, +6 around frames 72, 144, 504, 648, 720, 814, 864, 1008, 1152,
1224, 1332, 1404, 1440, 1542, 1584, 1656, 1728, 1800, 2016.

## 13. Captions and chapters

**Captions:** `docs/film-captions.json` — 27 non-overlapping cues since the energetic recut (below; lane G-fix: c12 from f936, c20 f1872–1926, c21
f1926–2016, and c24 split so c25 carries the URL and "Shown with sample data"; lane v2-film: c24 reads "[Final chord]" /
"Free for Macs with Apple silicon" over f2160–2250, 8 words in 3.0 s, and c25 f2250–2304, 5 words in 1.8 s, so every cue
reads at ≤ 3 words per second; c24 was 10 words in 2.4 s) (sound descriptions in brackets, kinetic lines word for word,
at most two lines, each shown ≥ 1.2 s at ≤ 3 words per second). One track serves all three compositions (16:9, 1:1 and
9:16 share the timeline). Convert to `public/media/v2/film.en.vtt` and `Pebble-launch-film.srt` with seconds = frame /
30 (the file states the format). No caption covers a kinetic line: all kinetic type sits above y 918 (16:9, 1:1) and
above y 1450 in 9:16 (§2). Whooshes and most clicks are not described; the music's changes, the reveal's thud, the
Verified shimmer, the end-card landing's thud and the final chord are. The landing's cue, c22, reads "[Soft thud]" (as
c08 does at the reveal) since 581f210; it described the pop that left the mix in 9535d46.

**The energetic recut's captions** (ENERGY_SPEC §12; the others unchanged): c01 f0–72 "[Soft piano, a click, then a
beat]" (the spec's "[Soft piano, then a click and a beat]" read 8 words in 2.4 s, 3.33 a second, over the file's own
3; one word less reads 2.92), c02 f72–144 "[A pulse builds]", c03 "[Drums hit]" / "What did it change?", c08 "[The beat
drops]" / "A small companion for your Mac", c09 "[Drum fill]", new c11b f890–936 "[Music muffles]", c12 now f936–1008,
new c12b f1008–1044 "[Music returns]", c14 "[Hit and shimmer]" / "Evidence before done", c18 "[The beat lifts]" /
"Views, not just text", c22 "[The beat returns]", c24 "[Final hit]" / "Free for Macs with Apple silicon". c07 "[Rising
swell]" stays true (the riser still runs to f504), and the last cue keeps "Shown with sample data". The fastest cue
reads 2.92 words a second. `src/content/filmCaptions.ts` mirrors the JSON (its test checks it).

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

`FILM_DURATION_SECONDS = 76.8` ("1:16"). The start frames are unchanged by the energetic recut; the desktop
description now names the typed question, Pebble's answer starting and the hang, and the tested one says that Verified
comes forward as the other steps fade back.

## 14. Review frames

**G1.5 style frames** (critic H11), every aspect (`StyleFrames`, `StyleFramesSquare`, `StyleFramesVertical`), full resolution, reviewed before animating:

| Id | Frame | What it proves |
|---|---|---|
| SF1 | 0 | the thumbnail: the pebble on its desktop, eyes open |
| SF0b | 60 | the energetic recut's 2 s muted check: the posted question legible in the open quick chat |
| SF2 | 540 | the reveal lockup with T5 (paper, pool of light, the period pebble) |
| SF3 | 985 | a punch-in: the held run, the pointer on Run the tests, T8 in the column |
| SF4 | 1170 | the climax: the focus on the Verified row (the rest receded), the check mark, T10, the pebble writing |
| SF4b | 1216 | the finished reply after the pull-back, the pebble happy, the pointer near Settings |
| SF5 | 2280 | the end card, everything landed |
| SF6 (extra) | 1700 | the chart as the world |

**G2 animatic review frames** (half-scale render; arrival · mid-move · settled per beat):

| Shot | Frames |
|---|---|
| S1 (the recut's hook) | 0, 13 (the pointer lands), 18 (the click: the chat open), 24 (mid-move), 30 (C1), 53 (typed), 54 (Enter), 60 (muted check), 71, 72 (punch-in), 102 (the first word), 135 (the breath), 139 (mid-dive), 143 (the fill) |
| S2 | 146, 160, 180, 216, 250, 288, 330 (and each slam's pre-roll frames, at 360 px wide) |
| S3 | 362, 380, 420, 440 (pebble landed), 470, 477 (eyes lead), 486 (take-off), 490, 494 (the hang begins), 497, 500 (the dart begins), 502, 504 (the drop) |
| S4 | 504, 506 (squash), 512 (flood mid), 525, 540, 600, 620, 640 |
| S5a | 648, 652, 672, 690, 718 |
| S5b | 722, 732 (mid move), 746, 760, 786, 800, 810, 814, 833, 840, 860 |
| S5c | 864, 900, 924, 931, 954, 975, 990, 996 |
| S5d | 1008, 1020, 1032, 1050, 1075, 1080, 1094, 1120, 1146 |
| S5e (with the breath) | 1143 (the breath), 1146 ("· 11 s" on the focused row), 1151 (T10's pre-roll), 1152 (Verified: the focus jumps), 1170, 1187 (the release), 1200 (mid pull-back), 1204 (happy), 1216 |
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
| Frame 0 meaningful; a product moment by ~3 s; first line not "Introducing"/"Meet" | ✓ the pebble on its desktop at f0; the real chat at f18 (0.6 s), the question sent at 1.8 s and legible by 2 s, the first cut at 2.4 s, Pebble's answer from 3.4 s (the energetic recut); first line "What did it change?" at 4.8 s |
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
| Grain / vignette / shadows / banding | lane v2-film (PHILOSOPHY): no grain, no vignette, no glow, no pool of light; flat grounds (nothing to band); stages are hairline frames without a shadow; the pebble casts the only shadow |
| Review pass: cut strips, banned list, notes format, remove a third if busy, no scores | ✓ §12, §14; banned looks absent (no void/glow, no glass, no 3D, no cubes/flips/clock wipes/glitch, no logo bug, nothing all-centred-and-fading) |
| OVERRIDES §2 tension; one comparative framing as intent; no benchmarks | ✓ T1–T4; nothing else compares |
| OVERRIDES §4 aspect-aware square; nothing within 60 px; same timeline and music | ✓ §2, §4, §6.1, every shot's square framing |
| OVERRIDES §14 the vertical: its own framing, text and the pebble in the central 1080 × 1420 band, readable on a phone | ✓ §2, §6.1, §22 (lane v2-film) |
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
3. The narrow aspects' S6c records sit at 26.5 px UI text (target 34; §6.1: m 2.12 is the most that keeps the records'
   text and the bin's click 60 px inside the frame); acceptable because T13 and the action carry the meaning.
4. T22 (the bloub credit) follows OVERRIDES §2's "wherever the character appears"; the main loop may move it to the
   LinkedIn post text instead, then drop it from the end card and from chapters.ts.
5. A music change (the C2 pass now running) keeps this spec valid if the grid stays 100 BPM / 32 bars; otherwise
   re-snap by (bar, beat, offset) as §1 says.

## 22. The vertical (9:16), lane v2-film

`LaunchFilmVertical`, 1080 × 1920: the same timeline, music and captions as the 16:9 and the square (OVERRIDES §14:
X and LinkedIn take 9:16 on phones), with its own framing per shot through `useLayout()` (`video/src/motion/layout.ts`),
never a crop of another aspect.

**The band.** X's and LinkedIn's phone UI covers the top and bottom of a 9:16 picture (the status and header bars,
the post text, the actions). Every line of text and the pebble stay inside the central **1080 × 1420 band, y 250–1670**;
player captions own y > 1460. Imagery may fill the rest of the frame (the riverbed in S1, the sage and paper grounds,
the chart's white), and nothing outside the band asks to be read.

| Shot | The vertical's framing |
|---|---|
| S1 desktop | the wallpaper is 1,000 desktop points tall and the frame 1,920 px, so no view zooms out below m 1.92. C0 (frame 0, the thumbnail) m 3.4 with the pebble's centre at (540, 1080); the energetic recut's C1 m 2.62 on the whole panel inside the band (its header at y 425), the pebble at (900, 1400); C2 m 2.95 on the conversation, the question's first line at y 331 (281 after the feed's scroll), the answer's lines 62 px inside both sides, the pebble at (949, 1216). The pointer enters from (−70, 700) |
| S2 questions | the list's centres at y 840 / 960 / 1080, its left edge at x 202 (the square's) |
| S3 build | T4 centred on y 820; H1 rises from (540, 2050) to (540, 1300), above the caption band; H2 to the lockup |
| S4 reveal, S9 end card | the lockup's foot (806, 832), its baseline y 830; T5 baseline 960; T18 950, T19 1060, T20 1130, T21 1250, T22 1290; H4 from (1180, 2010) |
| S5–S7a window world | the text band x 80–860 from y 380; the pebble's spot (930, 660) on its line x 840–1020; the stage x 24–1080, y 700–1444, the square's size, so the two share §6.1's framings (the vertical's own for S6c's records); no check mark (no room outside the stage) |
| S7b chart world | m 3.7 on (904, 680): Flights, Stay and Food, their labels at 44 px; a 9:16 frame is taller than the panel's bars and labels at that magnification, so the panel grows only to its rows (y 500–815) and the world around them is the panel's own white |
| S7c quiz | m 3.17, x 722–1062.7, y 120–725.7; the canvas's toolbar in the top zone recedes under a veil; the label at y 320 |
| S8 claims | the list's centres at y 735 / 955 / 1140, "Apache-2.0" on 850, its left edge at x 178 |

**Review.** `FilmFramesVertical` samples any list of frames (as `FilmFrames` and `FilmFramesSquare` do); the
half-scale animatic is `.work/film/animatic-9x16.mp4`. Judge every bar frame at 360 px wide with the band marked.

## 23. The 30 s cut `x30`, for X

`docs/film-cuts/x30.json` (schema `pebble-film-cut/1`; lane prep-x30's plan, `.work/film/x30/PLAN.md`, not committed):
**12 bars, 864 frames, 28.8 s**, made only of LaunchFilm's own frames. It plays four source ranges, end exclusive, in
the film's order. Each starts on the same beat of the bar in the film and in the cut (source frame ≡ cut frame, mod
72), so every click, line and seam keeps its beat, and the score's own bars play under the picture they were written
for.

| Source frames | Cut frames | Film bars | What it keeps |
|---|---|---|---|
| f0–71 | 0–71 | 1 | the hook: frame 0 (the thumbnail), the click at f18, the question typed and sent by f54 |
| f360–611 | 72–323 | 6–9 (to beat 2) | T4, the pebble's rise and leap, **the reveal** (f504 → cut 216), T5 |
| f900–1223 | 324–647 | 13 (beat 3)–17 | the AgentGuard proof: the hold, Run the tests, the isolated copy, **Verified** |
| f2088–2303 | 648–863 | 30–32 | the end card: T18, **the final chord** with T19 and T20 (f2160 → cut 720), T21 and T22 |

- **Joints:** three hard cuts, at cut 72 (bar 2), 324 (bar 5, beat 3) and 648 (bar 10). The film's own cut at f1008
  stays inside its range. Every line the cut shows enters inside its range and keeps its film hold. No new copy.
- **Music:** a 12-bar arrangement of the same score, not a splice of the bed. `tools/audio/compose_score.py --form x30`
  plays score bars **1, 6, 7, 8, 9, 14, 15, 16, 17, 30, 31, 32**, and `render_sampled.py --levels-from` the film bed's
  `.score.json` plays them at the film's gains. The reveal (score bar 7 → 8) lands on cut 216 and the final chord
  (30 → 31) on cut 720, ringing through bar 32. The effects are the film's, mapped by `tools/audio/cut_cues.py` into
  `tools/audio/cues.x30.json` (before the energetic recut: 8 cues, no whoosh, nothing in the end card; with the
  recut's effects: 19, the ui_lock add and the five rim ticks included, the final hit in the end card). One command
  builds the bed, the mix and the gates:
  `scripts/heavy.sh cut-x30 tools/audio/cut_soundtrack.sh docs/film-cuts/x30.json`, which writes
  `.work/audio/render/soundtrack_x30_social.wav` (before the recut `b8e34c32…`, −14.1 LUFS, −1.5 dBTP;
  the recut's `435f33f9…`, −14.4 LUFS, −1.5 dBTP, its AAC 192 kb/s −1.33 dBTP; exactly 864 frames). The recut keeps
  the x30 bed as rendered and re-mixes it with the cut's drive: run the `mix` and `checks` steps only. Hashes and
  gates: `docs/media-provenance.json`, `music.sampled_score.cut_x30` and `music.sampled_score.energetic_recut`.
- **Captions:** `node tools/captions/build.mjs --cut docs/film-cuts/x30.json --srt <file>` (`--check` validates only)
  maps the film's cues onto the cut. Since the energetic recut that gives 12 cues: c01, c06–c08, c12, c12b, c13, c14
  and c23–c25 whole, plus c11b "[Music muffles]" clipped to cut 324–360 (1.2 s of its 1.53 s; a note, not an error):
  the joint onto the held run is where the music muffles. The cut's own x09 "[Music picks up]" is gone. c02 and c22
  fall outside the ranges.
- **The energetic recut** (ENERGY_SPEC §10; OVERRIDES §35 decision 5): the ranges and score bars stay. The cut's
  `sfx.add` puts ui_lock on cut frame 324 (the film's sits on f890, before the range [900, 1224)), so the joint gets
  the lock; `tools/audio/cut_cues.py` maps the effects and the automation (the hook's ride on cut 0–72; the hold from
  cut 324 to the click at 414, released to 432; gaps at 567 and 711; the tail at 774), and `drive.py --cut` renders
  the cut's drum-and-sub stem from the same bar table (the score lane's tools). The cut's shape: the muted hook (the
  click at 0.6 s, the question sent at 1.8 s), T4 on a hit at cut 72, the drop at 216 (7.2 s), the muffled joint at
  324, T8 on the thump at 360, the release at 414, the groove back at 432, the gap at 567, Verified at 576, T18 at
  648, the gap at 711, the final hit at 720 (24.0 s), the fade from 774 and 1.8 s of silence from 810.
- **Picture and delivery:** there is **no separate Remotion composition**. The cut is the film's own frames, so the
  film's fixes reach it with the next encode. The `LaunchFilm30*` ids in the cut file's `compositions` are not
  registered in `video/src/Root.tsx`. Each aspect's 76.8 s master is cut and muxed in one step:
  `tools/encode/encode.sh social <LaunchFilm master> .work/audio/render/soundtrack_x30_social.wav
  Pebble-launch-film-30s-<W>x<H>.mp4 --cut docs/film-cuts/x30.json`. It seeks frame-exactly (the seeks come from
  `tools/captions/cues.mjs cut-inputs`) and concatenates. Lane fin-deliver made the 1920×1080, 1080×1080 and 1080×1920
  files this way: 864 frames each, and every sampled cut frame matches its master frame.
- **If the film's timing changes**, re-pick the ranges by the same rules, then re-run the caption check,
  `tools/audio/cut_cues.py docs/film-cuts/x30.json --check` and `cut_soundtrack.sh`. The plan's `cuts.ts` and
  `validateCut()` were not built.

## 24. The trailer (LaunchFilm, LaunchFilmSquare, LaunchFilmVertical)

Lane trailer-picture, 2026-10-25. The binding brief is the trailer research's blueprint (its §6 and its JSON: the
beat sheet, the music, the captures and the guardrails) under OVERRIDES §2 and §34–§43; §40–§43 win over the
blueprint, and the capture manifests (`"fidelity_round": 2`, retake 2b) are the source of truth for every time and box.
The film is data in `video/src/film/timeline.ts` (shots, lines, the pebble, clicks, effects, automation, seams, source
maps, style frames, `validateTimeline()`), `framing.ts` (stages, framings, camera keys, pointers, `checkFraming()`),
`desk.ts` (the desktop's cameras and pointers), `gaze.ts` (the pointer-driven looks) and `ui.ts` (the measured UI);
the scenes are `video/src/film/scenes/`. `LaunchFilm` refuses to render while `checkAll()` reports anything.

### 24.1 Grid

- `tools/audio/beatmap.json`, id `trailer`: 100 BPM, 18 frames a beat, 72 a bar, 32 bars = 2,304 frames (0–2303) at
  30 fps. Bar n starts on `72(n−1)`; frames come from `at(bar, beat, offset)`, never from sums.
- **The drop: bar 10, f648** (21.6 s, 28 % in). Sections: hook 1, tension 2–9, reveal 10–14, proof 15–20, climax
  21–25, breakdown 26–28, end card 29–30, final 31–32 (the movements Tension 1–9, Reveal 10–14, Proof 15–25, Title
  26–32).
- **Breaths:** four 9-frame gaps that end the frame before a bar line, f63, f639, f1647 and f2151, each opening onto a
  hit (f72, f648, f1656, f2160) at least 4 bars from the next; and the dead stop f612–638, silent by the score's own
  notes, while the pebble hangs. Nothing is cut, lands, starts moving or changes pose inside a breath.
- **The holds**, from the app's own hold frames: f445 to the cut to the turn (f504), released by f576; f1453 to the
  Run the tests click (f1512), released across bar 22 to f1584. The drive is muted and the bed sits −6 dB behind a
  1.2 kHz low-pass; rim ticks keep beats 2–4 of bars 7 and 21.
- **The tail:** an equal-power fade from f2214, digital silence f2250–2303 (1.8 s).
- The beat map's cues: riser_end 612 (the score's riser ends on the dead stop), tests_pass 1656, verified 1723,
  completion 1725, final_chord 2160; the motif on bars 1, 8, 10, 24 and 29.

### 24.2 Bar map

| Bars | Frames | Picture | Line (in → out) | Effects (picture frame) |
|---|---|---|---|---|
| 1 | 0–71 | the dark riverbed, the pebble in extreme close-up in the dark theme's colours (#b4cda6, eyes #23351f; tokens.css@v1.5.0); frame 0, the thumbnail, has its eyes on where the pointer will enter; the pointer drifts in (f4–16), rests beside the face (the app's attentive pose, f14–39) and slides away from f36; a natural blink near f20; the look at the viewer on f54 | — | the suck-back ending on f72 |
| 2 | 72–143 | the night field (#191E1B) | "What did it change?" (slam, f72 → 138) | (the score's hit) |
| 3 | 144–215 | glimpse 1: the dates.py card's diff, Don't allow and Apply edit, a slow push (×1.04); the pointer presses Apply edit on f198, the glimpse ramps out f198–203 | — | click f198 |
| 4 | 216–287 | the night field | "Can I undo it?" (f216 → 282) | |
| 5 | 288–359 | glimpse 2: the card reads Done, with Undo this edit; the camera stays locked on the card as the drawer's live response moves it; the focus settles on Undo this edit | — | ui_done f288 |
| 6 | 360–431 | the night field | "Did it run the tests?" (f360 → 426) | |
| 7 | 432–503 | glimpse 3: the drawer's top, "Pebble is working on this." and its live response; on f445 the hold, "Pebble's change isn't verified yet." with Run the tests, Ask Pebble to finish and Accept as unverified | — | ui_lock f445 (the music stops); rims f450, 468, 486 |
| 8 | 504–575 | the night field | "An agent shouldn't / grade its own work" (rise, f504 → 600) | |
| 9 | 576–647 | the field steps to sage (#232C25, #2E3A2F, #384839, sage, 8 frames each from f576); the pebble peeks up (f576), looks up at the line (f594) and to the lockup (f603), leaps on f612 and hangs through the dead stop | — | the suck-back ending on f648 |
| 10 | 648–719 | **the drop:** the pebble lands as the full stop of `pebble` (tap); paper floods out from it (20 frames); the wordmark unrolls f650–664 | "A small companion for your Mac" (blur, f650 → 720) | impact and thud f648 |
| 11 | 720–791 | the star beat: the wordmark rolls back (f738–752); the pebble hops down (f756 → 774) as the light desktop slides in under it (the camera tilts down, with motion blur on its fastest frames); its eyes find the pointer; a natural blink near f784 | — | whoosh f774 |
| 12–13 | 792–935 | the quick chat (pet-live-150, v1.5.0) at 1×: a cut to the whole panel as the question is sent (Enter, f792); Thinking, ~1s, ~2s, Reasoning it through; the answer whole on f898, "Task: completed" on f900; on f918 a punch-in on the question and the answer, the pebble out of frame | — | send key f792; whoosh f935 |
| 14 | 936–1007 | the whole workspace (main-welcome, v1.5.0, its own pebble hidden): "Good to see you.", the pebble in the home pebble's place, a pull-back ×1.04 → 1 | — | impact f936 |
| 15 | 1008–1079 | views: the Lisbon trip budget canvas, then a push into its chart (f1034–1058) | "Views, / not just text" (slam, f1008 → 1080) | impact f1008; whoosh f1046 |
| 16 | 1080–1151 | your model: the three ways in come forward on beats 1, 2 and 3 | "Your model, / your choice" (f1080 → 1146) | whoosh f1079 |
| 17 | 1152–1223 | memory: the bin clicked on f1170, the record dissolves (f1170–1181), the list closes up (f1182) | "Memory you can / read and forget" (f1152 → 1224) | whoosh f1151; click and ui_forget f1170 |
| 18 | 1224–1295 | permissions (v1.5.0): Auto in project chosen on f1260; from f1266 the focus settles on its card (1:1 and 9:16 punch in, f1266–1290) | "You set what / it may do" (rise, f1224 → 1296) | whoosh f1223; click f1260 |
| 19 | 1296–1367 | your tests stay yours: the waiting tests/test_dates.py card, a slow push on its lead (f1300–1366) | "Your tests / stay yours" (slam, f1296 → 1368) | whoosh f1295; ui_card f1296 |
| 20 | 1368–1439 | the scope challenge: the red refused step; the person opens Details on f1386 ("AgentGuard — evidence check", "5 file(s) changed that the task does not reach"); the camera stays locked on the step through their scroll | — | whoosh f1367; click f1386 |
| 21 | 1440–1511 | the held run: the drawer, the hold on f1453; f1494 a cut to the conversation's "Blocked" block, the focus on Run the tests | "AgentGuard checks / the evidence" (f1440 → 1500) | ui_lock f1453 (the stopdown); rims f1458, 1476, 1494 |
| 22 | 1512–1583 | Run the tests on f1512 (the press drawn over the frame before the click); a match cut on its rebound (f1516) to the Run isolated tests card it put in the drawer; the person reads it; the tilt to Run tests (f1554–1577) | "Tests run in / an isolated copy" (f1548 → 1626) | click f1512 (it releases the hold) |
| 23 | 1584–1655 | Run tests on f1584; the camera settles on the card (f1586–1606), which reads Running for exactly 2.4 s, the focus on it from f1620 | — | click f1584; tick f1651 in the gap |
| 24 | 1656–1727 | **the tests pass on f1656:** the card reads Done, the Result in view by f1680; up to the steps (f1698–1716); **Verified · pytest 42 passed on current files on f1723**, the focus jumping onto it, held 36 frames, a check mark beside it in 16:9 | "Evidence / before done" (slam on f1723 → 1788) | impact and ui_done f1656; impact and ui_verified f1723 |
| 25 | 1728–1799 | the run completes on f1725: the one celebration; the pull-back to the final reply (f1760–1783) | | |
| 26–28 | 1800–2015 | the sage breakdown (the recut's claims list) | "Free and open source" with "Apache-2.0", "No telemetry", "Your keys stay in your Keychain" | impact f1800 |
| 29–30 | 2016–2159 | the title: the pebble lands as the full stop of `pebble.` on f2016, paper spreads from it | "A little help, right here." (f2088) | thud and impact f2016 |
| 31–32 | 2160–2303 | the final hit; the pebble glances at the URL (f2166) and looks at the viewer (f2214) to the end | "Free for Macs with Apple silicon" (slam) with "Not notarized" under it (f2160), the URL (f2164), "Shown with sample data" and the bloub credit (f2196) | impact f2160 |

Ten slams in all (the three questions, Views, Your tests, Evidence before done and four in the title): each lands on
an eighth or on its shot's first frame, except "Evidence before done", which lands with Verified (OVERRIDES §41).
Every line is a `chapters.ts` line, at most 6 words a line and 3 words a second, held at least 0.5 s + 0.3 s a word
and 1.2 s (2 s for a shot's last line), and stays above each aspect's caption band.

### 24.3 Worlds and stages

- **Night** (bars 2–9): #191E1B with #E8EEE6 type; the glimpses are hairline-framed stages (ring #2B342C, all corners
  rounded) of the dark twin, rising out of the night over 6 frames (f140–146, f284–290, f428–434). Their UI at
  ≥ 28 px (16:9) and ≥ 34 px (1:1, 9:16), as §2 requires. The focus veil on the dark UI is #1C211E.
- **Paper** (bars 10–11 and 29–32), **desktop** (bar 1 dark: `riverbed-dark@3x`, ground #29312B; bars 11–13 light),
  **sage** (bars 9 and 26–28).
- **The window world** (bars 14–25): the page's paper ground, the text column (16:9, x 96–860) or band (1:1, 9:16),
  and the stage, which ends above its aspect's caption band: 16:9 x 920, y 64, 1000 × 854; 1:1 x 24, y 336,
  1056 × 582; 9:16 x 24, y 700, 1056 × 744. From f1440 the pebble stands on its line at the window world's spot.
- The desktop's cameras (`DESK_CAMERA`): bar 1 m 7.0 / 6.0 / 7.5; the star beat's landing at the lockup's size
  (16:9 m 1.42, 1:1 m 1.15, 9:16 m 1.92, the wallpaper's least); the quick chat's whole panel m 2.35 / 2.62 / 2.62;
  the answer's punch-in m 5.4 / 3.0 / 3.14.

### 24.4 Framings and the edge rules

A framing is the CSS rect of the window a stage shows (16:9 · 1:1 · 9:16; m is frame px per CSS px):

| Framing | 16:9 | 1:1 | 9:16 |
|---|---|---|---|
| G1 the diff (before its ×1.04 push) | m 2.34 · x 808–1160, y 372–729 | m 2.85 · x 808–1159, y 470–731 | m 2.85 · x 808–1159, y 428–730 |
| G2 the Done card (tracked) | m 3.05 · x 811–1157, 245 tall | m 2.85 · x 808–1159, 245 tall | the same |
| G3 the drawer's top | m 3.18 · x 812–1144, y 115–353 | m 2.85 · x 808–1159, y 115–353 | the same |
| m1Canvas, m1Chart | m 1.255, the canvas; m 2.0 · x 670–1170, y 408–835 | m 1.325; m 1.85 · x 670–1241, y 420–735 | m 1.325; m 1.72 · x 670–1284, y 404–837 |
| m2 models | m 2.083 · x 339–819, y 190–600 | m 2.7 · x 340–731, y 197–413 | m 2.7 · x 340–731, y 145–421 |
| m3 memory | m 2.025 · x 342–836, y 330–752 | m 2.12 · x 330–828, y 468–743 | m 2.05 · x 323–838, y 378–741 |
| m4, m4Auto permissions | m 1.96 · x 324–834, y 196–632 (both) | m 2.8 · x 340–717, y 221–429; m 3.0 · x 354–706, y 326–520 | m 2.8 · x 340–717, y 221–487; m 3.0 · x 354–706, y 332–580 |
| m5, m5Lead the test-file card | m 2.84 → 3.1 | m 3.0 → 3.2 | m 3.0 → 3.2 |
| m6 the scope challenge (before the scroll) | m 2.33 · x 650–1079, y 425–792 | m 2.72 · x 649–1037, y 520–734 | m 2.72 · x 649–1037, y 520–794 |
| c1Drawer, c1Held | m 2.84 on the drawer; m 3.4 · x 243–537, y 432–683 | m 3.0; m 3.6 · x 244–537, y 440–602 | m 3.0; m 3.6 · x 244–537, y 436–643 |
| c2Top, c2Click, c3, c4 | the drawer, m 2.81–2.84 | the drawer, m 3.0 | the drawer, m 3.0–3.15 |
| c5 the final reply | m 1.9 · x 243–769, y 52–502 | m 2.21 · x 289–767, y 242–505 | m 2.0 · x 243–771, y 129–501 |

The rules (`checkFraming()` enforces the first four on every frame of every aspect):
- the visible rect never leaves the captured window or still;
- **no usage line is ever in frame** while the recording shows it (each shows a rate and a cached count; OVERRIDES
  §42): the boxes per source frame are `video/src/film/usage-lines.json`, from the capture report. Bar 7 and bar 21
  frame the drawer side, and the conversation only from source 462 and below y 432; the final reply's frame ends
  above its usage line (ink from 510);
- the "Action completed" toast never; and across source 675–677 (f1725–1727), where the drawer's cards jump, the
  frame stays above the drawer's lower half;
- every click sits at least 60 px inside the frame and above the caption band;
- by measurement of each capture's ink rows and columns: the top and bottom edges fall between lines on every settled
  frame (while the drawer's live response streams, before glimpse 3's hold, a row may pass under the bottom edge); a
  side edge never cuts into a line's start and never slices a control; a line runs off the right edge only where §2's
  floor (≥ 28 px / ≥ 34 px) leaves no room for it, as v2's held block did. In 16:9, where a moment fits whole at about
  v2's m 2.0, it is shown whole (models, permissions, memory).
- Where the held block's explanation runs past the right edge (c1Held, f1494–1515), it stays under the focus veil:
  only Run the tests is sharp.

### 24.5 Time honesty: the source maps

Film frame → source frame (`SOURCE_MAPS`, linear between keys). Pebble's time runs at exactly 1× inside a shot; only
the person's spans may run faster (at most 2×); only waiting states run slower or freeze; a jump only on a cut; across
the cuts of one recording, the film never shows two moments closer than they were.

| Map | Recording (v1.5.0, fidelity round 2) | Film → source frames | Speed |
|---|---|---|---|
| g1 | main-live-film-150-dark | f140–197 → 218–275; held on 275 to f203 | 1×; the card waits for Apply edit (the press is drawn over 275) |
| g2 | the same | f284–359 → 320–395 | 1× |
| g3 | the same | f428–503 → 404–479 | 1× (the hold, 14.033 s, on f445) |
| chat | pet-live-150-light-hidden | f792–935 → 90–233 | 1× (Enter 3.00 s; the answer whole 6.533 s on f898) |
| m5 | main-live-film-150 | f1296–1367 → 285 | a freeze on a waiting state (the card waits for the person) |
| m6 | main-challenge-live | f1368–1439 → 252–323 | 1× (Details at 9.00 s on f1386) |
| climax | main-live-film-150 | f1440–1512 → 408–480; f1512–1516 → 480–484; f1516–1584 → 484–534; f1584–1799 → 534–749 | 1×; 1× (the press over 479 on f1512–1515); 0.74×, waiting (the person reads the card); 1× |

The person's typing before the send is elided by the cut into the quick chat (OVERRIDES §42). The questions cover
the app's response times between the glimpses (g1 → g2: 1.5 s of source in 2.7 s of film). Bar 21 replays glimpse
3's span (a repeat, never a skip). The capture-artifact repair (the quick chat's caret) is in §7.4.

### 24.6 The pebble

One engine-drawn pebble (`shared/pebble`), in Pebble's own poses only, as v1.5.0's reducer (companionState.ts) gives
them: hover while the pointer is in the pet window (bar 1); idle, tap on the drop, idle (bars 9–11); sending, thinking
and idle in the quick chat; idle at home (bar 14); writing, blocked on the hold (f1453), review while the tests card
waits and its tests run, thinking when the run resumes (f1656), and **happy once, on the run's completion (f1725)**.
The quick chat's own celebration (the host's idle at 7.20 s, f918) is kept out of frame by the punch-in on that beat.
Instances shift their engine clocks so the natural blinks fall where the beat wants them (bar 1 +22 frames, bars
9–13 +36). The hops: H1 the peek (f576, 0.2 s), H2 the leap (f612 → 648, hanging: 45 % of its path by f618, 10 % over
f618–642, the last 45 % in f642–648), H3 down to the desktop (f756 → 774), H4 into the title (f2002 → 2016).

### 24.7 Pointer and clicks

| Click | Frame | Source |
|---|---|---|
| Apply edit (glimpse 1) | f198 | the recording's click at 9.20 s (source 276); the press drawn over 275 |
| the bin (Forget this memory) | f1170 | a still (settings-memory → settings-memory-forgotten) |
| Auto in project | f1260 | a still (v150/settings-permissions → -auto) |
| Details (the refused step) | f1386 | the recording's click (source 270) |
| Run the tests | f1512 | the recording's click (source 480); the press over 479, f1512–1515 |
| Run tests | f1584 | the recording's click (source 534) |

Every click is on a beat and arrives at least 5 frames early; the pointer never rides the camera, so a match cut
keeps it where it clicked.

### 24.8 Sound

The score lane's score carries the questions' hits, the riser into the dead stop, the crashes and the downlifter; the
timeline's 41 effects (`SFX`) are the film's sound design on the real events, the kit's impacts on the hits the score
doesn't carry alone, the suck-backs inside the gaps (role `suck`, `suck_a.wav`, end-aligned), the rim ticks of both
holds and a whoosh on each montage cut. Pebble 1.5.0 makes no sounds. Each effect peaks one frame after its picture
(a suck-back ends on its frame), at most three at once. The mix automation (`AUTOMATION`) is the four gaps, the two
holds and the tail. `bun video/scripts/export-cues.ts` writes `tools/audio/cues.json` (41 effects, 7 spans), and
`tools/audio/cut_cues.py docs/film-cuts/x30.json` the cut's.

### 24.9 Captions, descriptions, chapters

`docs/film-captions.json` (and `src/content/filmCaptions.ts`, the same cues): 25 cues, c01–c25, each at least 1.2 s
and at most 3 words a second (the fastest 3.00), the sounds in square brackets; 21 time-coded descriptions, d01–d21.
The chapters (`src/content/chapters.ts`, the same nine ids) start at 0 (desktop), 33.6 (views), 36 (model), 38.4
(memory), 40.8 (pace), 43.2 (project), 48 (tested), 60 (open-source) and 67.2 s (get). CLAIMS adds C-CH-18 ("Your
tests stay yours") and C-CH-19 ("Not notarized"); the trailer no longer shows C-CH-3, C-CH-4 or C-CH-8. The narrated
twin's SRT (`build.mjs --narrated-srt`, OVERRIDES §38) is these 25 cues with the four spoken lines of
`docs/film-narration.json` marked "Narrator: …" in c02, c04, c05 and c19 (the fastest still 3.00 words a second).

### 24.10 The 30 s cut

`docs/film-cuts/x30.json`: the ranges [0, 72), [360, 720), [1512, 1800) and [2160, 2304), 864 frames, each starting on
the same beat in the film and in the cut; the score bars 1, 6, 7, 8, 9, 10, 22, 23, 24, 25, 31, 32. The look; "Did it
run the tests?" and the hold; the turn, the build, the dead stop and **the drop at 12.0 s**; Run the tests, the run at
1×, Verified at 21.4 s with "Evidence before done" whole and the celebration; **the final hit at 24.0 s** and the
title's small print; the silence. Its captions: 11 (`build.mjs --check --cut`); its effects are the film's, mapped.

### 24.11 Checks

- `checkAll()` (timeline and framing): 0 problems. `bun video/scripts/export-cues.ts` (it runs `validateTimeline()`
  first), `node tools/captions/build.mjs --check` and `--check --cut docs/film-cuts/x30.json`, and
  `tools/audio/cut_cues.py docs/film-cuts/x30.json --check`.
- The review: the 35 style frames (`STYLE_FRAMES`, every beat's key frame) in all three aspects, and stage views of
  every framing on its capture; the half-scale animatics and the masters through a copy of `.work/film/v2/analyze.py`
  with the trailer's flood windows (the flash counter, the floods, flat frames, glitches, the largest changes).
- The picture masters (`video/out/masters/`, not tracked): `LaunchFilm.mp4` 1920 × 1080, `LaunchFilmSquare.mp4`
  1080 × 1080 and `LaunchFilmVertical.mp4` 1080 × 1920, each 2,304 frames at 30 fps, H.264 High, CRF 12, yuv420p,
  BT.709, muted (the mix lane muxes the sound). Their scans (2026-10-26):

  | | 16:9 | 1:1 | 9:16 |
  |---|---|---|---|
  | Flash counter (≤ 3 flashes in any 1 s) | frame 0, regions 2: pass | frame 0, regions 1: pass | frame 0, regions 1: pass |
  | The drop's flood, 20 → 80 % (frames) | 7.02 | 6.96 | 6.83 |
  | The title's flood | 7.00 | 6.92 | 6.81 |
  | Glitches (isolated outlier frames) | none | none | none |
  | Flat frames | f203–215 (the dark after glimpse 1's press, before the second question), f504 (the turn's first frame, before its line rises) | the same | the same |

  The largest changes all sit on beats, except the floods' own frames and the dawn's 8-frame steps.

### 24.12 Departures from the blueprint

- **Bar 1** is the dark theme's own pebble (#b4cda6, eyes #23351f): the app's colours on the dark desktop.
- **Glimpse 1** ends with the press: the press is drawn over source 275 and the glimpse ramps out over f198–203, so
  the click's result and the second card never show out of order.
- **Glimpse 3 and bar 21** frame the drawer's held state, and bar 21 reaches the conversation's "Blocked" block by a
  cut on f1494 (source 462): the conversation's usage line, with its rate, is in view from source 446 (OVERRIDES §43).
  So "Blocked" itself first shows in bar 21.
- **Bars 12–13** follow OVERRIDES §42, not the blueprint's streamed answer; the f918 punch-in keeps the quick chat's
  celebration out, so the film has one.
- **Bar 15** pushes into the chart on the stage (m 1.255 → 2.0 in 16:9) instead of growing it into a world of its
  own: the montage keeps one stage, so each of its six cuts is a clean cut on a bar line.
- **Bar 18** shows v1.5.0's permissions (the blueprint named 1.2.0's stills); **bar 19** shows the test-file card from
  main-live-film-150 (v1.5.0, source frame 285) instead of 1.2.0's still. In 16:9, bar 18 keeps its framing and the
  focus brings Auto's card forward: a punch-in with Auto's lines whole would take in the paragraph under the cards,
  cut at a side.
- **Bar 22** plays the person's reading at 0.74× (the blueprint said 0.75×): 50 source frames over the 68 from the
  card's arrival (f1516) to Run tests (f1584).
- **Bar 24:** the tests pass on f1656 and Verified lands on f1723 (OVERRIDES §41, not the blueprint's Verified on f1656).
- **No kit riser:** the score's riser ends on the dead stop.
- **The x30** keeps bar 25 instead of bar 29 (the blueprint's [1512, 1728) and [2016, 2088)): "Evidence before done"
  lands on f1723, so the blueprint's range would show it for 5 frames.
- **The montage stills** of bars 15–17 (`main-dashboard`, `settings-models`, `settings-memory` and its `-forgotten`
  state, the Pebble 1.0.4 retake of 23 Oct) carry no `fidelity_round` mark, and round 2's report names only the home
  and permissions stills as needing no change. They show no run. By source, what they frame is v1.5.0's: between the
  v1.0.4 and v1.5.0 tags, `AdvancedSettings.vue` (the Models and Memory tabs), `MemoryArchive.vue`,
  `NotificationSettings.vue` and the canvas's components are unchanged, and `tokens.css` and `style.css` only gained
  rules for new classes (Stealth Lockdown's row, which sits below the framed sections). The lead should confirm them.
