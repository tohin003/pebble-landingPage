# How it was made

The story of Pebble's website and launch film, for a curious engineer: the ideas behind them, the pipeline, the gates
every piece had to pass, the tools, and what was tried and turned down. The commands are in `docs/BUILDING.md`.

Everything here was built with Claude Code, by teams of agents working in parallel in one checkout, in October 2026.

## The pipeline

```
Pebble's source at a published release (its tag, frozen from GitHub, or a read-only checkout at that release)
 |
 |-- capture/   Pebble's own Vite frontend in Chrome, Tauri's IPC mocks, a fictional sample world
 |      |-- stills (PNG at 2x to 5x) --> tools/assets (sharp) --> public/ui/v1 (AVIF, WebP)
 |      `-- recordings on a virtual clock (one PNG per frame) --> video/public/ui-frames
 |
 |-- the pebble's engine (bloub, MIT) --> shared/pebble --+--> the site's live pebble
 |                                                        `--> the films, replayed frame by frame
 |
 `-- the Veil (stealthVeil.ts) --> shared/pebble --> the site's pebble in the Stealth Lockdown section

tools/audio   synth/ + scores/trailer_b.py (synthesised, no samples) --> the score's bed and drive stems, on the beat map
                                                                              |
video/        the film's timeline, snapped to the beat map --> 16:9, 1:1 and 9:16 masters, the loops, the posters
                     |
                     `--> export-cues.ts --> cues.json --> mix_master.py --> web and social soundtracks

tools/encode  masters + soundtrack --> HEVC and H.264 --> public/media/v1, v2 --> the Next.js site --> Vercel
                                   `--> the social films and the 30 s cut (kept outside the repository)
```

## A philosophy before a page

Before any section was restyled, the design lead wrote `docs/PHILOSOPHY.md`. Its core is one contrast: everything made
by hand is square, flat, exact and still (the grid, the rules, the type, the frames), and one natural thing, a smooth
stone with two eyes, is the only object that is rounded, shadowed and alive. Precision earns trust; the stone earns
affection.

It sets eight principles, each with a test anyone can run: one living thing; evidence before adjectives; the limit
beside the promise; constraints, not vibes; the page behaves like the product (it never scroll-jacks, never plays
sound unasked, and puts Pause motion in the header); show the work, losses included; calm is the volume; one story in
every frame. `docs/DESIGN-LEXINGTON.md` turns them into a system: six colour roles and one sage accent with three
jobs, two typefaces and a mono for data, one 12-column grid with a label rail, one radius ladder and two motion speeds.

## Two references, studied for their discipline

The owner asked for two sites to be studied first. The lead took their discipline, not their looks.

- **Lexington Themes** (lexingtonthemes.com, by Michael Andreuzza) taught the method: write constraints, not vibes.
  One grid with side labels, few tokens, hairlines instead of boxes, two-tone headings, and one loud thing on a quiet
  page. Pebble already had the loudest possible thing, a living character, so the move was subtraction. Nothing was
  copied: no code, CSS, tokens, images, drawings or text.
- **Superbrain** (onesuperbrain.com), the site of another AI agent, taught the evidence culture: say how you measured
  before you say what you found, show the losses with the wins, and set numbers as data, with their denominators and
  intervals. It also showed what to leave out: logo walls, contrast that fails, a stale preview, tracking beacons.

Before that, a first round had produced three competing static comps ("Quiet editorial", "The desktop is the
stage", "Pebble at the centre"). The lead built on the third, grafted the second's riverbed wallpaper and split
layouts, and turned down the first: its heavy display serif read as the generated cream-and-serif look, and it used a
line no source supported. `docs/DESIGN.md` records that round. The Lexington system then replaced its page-wide
hand-drawn line with a short ground line under each pebble, and took the giant-wordmark footer from a second,
darker comp.

## The real interface, never a redrawing

Every picture of Pebble on the site and in the films is Pebble. `capture/` runs the app's own frontend, read from its
source at a published release, in Chrome. Tauri's official IPC mocks answer the calls the frontend makes to the app's
backend, with a fictional world as the data: Maya, a Python project called `invoice-kit`, a Lisbon trip budget and a
datetime quiz. The harness never writes into Pebble's source (Vite runs without the project's config, with its cache in
`capture/`), and a run fails on any call the mocks don't answer, any error banner and any console error.

- **Stills** are taken at 2x and 3x (5x for the smallest crops), in both themes, and encoded to AVIF and WebP for the
  page.
- **Recordings** play a timeline of backend events against a virtual clock and save one PNG per frame, so a
  recording is the same every time it is made. The film's main sequence (a request, reading, two edit cards,
  AgentGuard holding the task, Run the tests, Verified) is one such recording.
- **Words are the app's own.** "Pebble's change isn't verified yet." with Run the tests, Ask Pebble to finish and
  Accept as unverified; "Requesting isolated tests · 11 s"; "Verified · pytest 42 passed on current files". Where the
  real app had a quirk, the captures show it. Nothing on screen is labelled as a mock or a fixture, and the page marks
  the sample world "Shown with sample data."
- **Always from a published release.** Within an hour of 1.1.0's publication, Pebble's own checkout already held the
  next version's work in progress. So the captures come from the release's tag: `capture/freeze-release.py` writes the
  tag's frontend from GitHub, checks every file against the tag's git tree, and the harness serves that frozen copy.
  Every quote on the page is checked at a tag too, never in a checkout.
- **When a release changed words the page shows**, the stills that show them were captured again from that release:
  all of them for 1.0.4, the new Privacy and focus setting for 1.1.0, and the three that 1.2.0 changed (Settings ›
  Permissions, the edit cards and the finished task). The film and the loops keep their earlier captures; they show
  sample data and no version. The fixtures name the version they were checked against.

The same harness made the stills and the gaze animation for Pebble's own README, for the release session to review.

## The pebble is the pebble

Pebble's character is drawn by its own animation engine, bloub by Jérémy Perret (MIT), which Pebble vendors. The
engine was copied from Pebble's copy into `shared/pebble/` byte for byte, apart from one file trimmed to the two
shapes in use; `SOURCES.json` records every file's hash and a test checks them. The site and the films share it.

- **Only Pebble's own poses**: idle, hover, tap, thinking, reading, editing, review, testing, writing, happy, sleepy
  and the rest of the app's pose table. The engine's own catalogue of expressions never appears; a test checks every
  cue list in the repository.
- **On the site**, the server sends a still SVG of the pebble, and the live engine arrives in a small lazy chunk. Its
  eyes follow the pointer, it runs at most at 30 fps, it settles to a still after 8 seconds without input, and only
  the most visible pebble on the page animates. Pause motion and reduced motion leave a still. The feature loops play
  one at a time, and none starts on its own while a live pebble is on screen.
- **In the films**, a fresh engine is replayed up to every frame from a list of cues, so a frame is the same in any
  render and in any order. A test checks that replaying matches live playback frame for frame.

## Stealth Lockdown and the Veil

Pebble 1.1.0 added Stealth Lockdown: one switch that keeps Pebble out of screen capture and screen sharing. It reached
the page only once 1.1.0 was published, as its own section after "Private by default", in Pebble's own words: the
setting's description, its Stealth half, its state lines and, wherever Stealth is shown, the honest line word for word: "Hidden from screen capture and screen sharing, not from a camera, a
capture card or a process list. Exams and interviews that forbid assistants still forbid it." The copy lint keeps the
words the release session ruled out, such as "undetectable" and "invisible", off the site, and allows that one line by
exact match.

A window that Stealth protects can't be screen-recorded, so the page never shows, or stages, a screen share with
Pebble missing. It shows the page's own live pebble wearing the Veil instead, the dusk-blue glass with a light rim that
Pebble puts on while Stealth Lockdown is on, captioned as a render, not a screen recording.

1.1.0 also promised that Stealth Lockdown never takes keyboard focus from the app in front. On 24 October the release
session found that it hadn't kept that promise since 1.1.0: macOS observes Pebble's windows from launch, so the change
never applied, and 1.5.2 stops promising it. The page dropped the promise the same night. The description keeps its
first clause, the Lockdown half and the on line's focus clause are gone, and so is the capture of the Settings card,
which showed those lines, until a later release's card can be captured from its published tag. A test fails if
anything in the section promises focus again.

The Veil is Pebble's code. `stealthVeil.ts`, a pure function of the seconds since the switch changed, was copied from
the v1.1.0 tag into `shared/pebble/`, unchanged below a two-line provenance header, with its source and SHA-256 in
`SOURCES.json` and a test that checks them, as for the engine. The site draws its layers with the formulas of Pebble's
avatar component and the colours of Pebble's design tokens. An interactive example, on flat fill and labelled as one,
flips the pebble, and a polite live region announces the app's state line; under reduced motion or
Pause motion the Veil is a 0.3 s cross-fade. The dusk blue is the feature's own accent and appears only inside its
section: the one exception the philosophy allows.

Building it turned up a bug. Pebble 1.1.0's avatar read the Veil's state after the switch had already flipped, so in
the app the dusk colour, the rim and the glass arrived, and left, in a single frame, and only the squash, the blink and
the ring played; Pebble's own README renders showed the same. For a few hours the site matched the app. The release
session fixed it in 1.2.0, whose notes end the fix with "Found while building Pebble's landing page.", and the site went
back to the designed sweep, which is what the app plays from 1.2.0 on: the pebble gathers, the dusk colour sweeps down
over it and it opens calmer eyes (1.25 s); turning it off lifts the colour and the pebble hops back (0.65 s).

The film kept its single story: it has no Stealth beat.

## The film, cut to the music

This section and the next tell the first film's story. The launch trailer that replaced it on the page is described
after them, in "The trailer".

The launch film is a Remotion project. Its clock is the score's beat map: 100 BPM in 4/4, 18 frames a beat and 72 a
bar at 30 fps, 32 bars, 2,304 frames. Every shot starts on a bar line or a beat, and every click lands on a beat. The
pebble lands as the full stop of the wordmark on the reveal, frame 504. The proof sequence is the real recording: the
edit is made, AgentGuard holds the task, the tests run in an isolated copy, and "Verified" lands on a downbeat.

The film is made once and framed three times: 16:9 for the web and for social posts, 1:1 and 9:16 for social feeds
on phones. Each aspect has its own framing of the same timeline, never a crop of another, with every line and click
inside its safe area and above the caption band. The web film is mastered to −16 LUFS; the social cuts to −14 LUFS.

The film took four gates before any master: a written spec (`docs/FILM_SPEC.md`) reviewed against the motion rules and
the claims; full-resolution style frames for each aspect, reviewed before anything moved; a half-scale animatic with
a contact sheet of every bar, strips around every cut and a motion audit; and an adversarial review with frame numbers
and acceptance checks. That review found two blocking problems (the climax was still and readable for one second, and
in the square cut one click seemed to apply two edits), and both were fixed before any master was rendered.

The masters are the compositions themselves, rendered in one browser tab: with two or three tabs under memory
pressure, Chrome made blank and tiled frames. Each master was scanned for blank and half-painted frames before it was
encoded, and looked at on a contact sheet.

For X there is also a 30-second cut (28.8 s, 12 bars), made only of the film's own frames: the hook, the reveal, the
AgentGuard proof and the end card, four ranges that each start on the same beat of the bar in the film and in the
cut, so every click and line keeps its beat. Its music is not a splice of the film's bed but a 12-bar arrangement of
the same score, played at the film's levels, with the reveal and the final chord under the same frames as in the film.
There is no separate composition: one encode command seeks each range to its exact frame in the film's masters and
joins them, so a fix to the film reaches the cut with its next encode. The six social files (16:9, 1:1 and 9:16, each
at full length and as the cut) come with caption files and live outside this repository.

The feature loops follow the same rules. They are silent, and they must loop without a visible seam: the step from the
last frame back to the first has to look like an ordinary step of the loop (its PSNR within 3 dB of the median step).
Every key line must read at 12 px or more at the size the page shows it (11 px on a 360 px phone).

## The first score, on CC0 samples (retired)

The plan was a human-made stock track, chosen without ears. Mixkit's free stock-music catalogue was ranked from its
tags and waveforms, and five shortlisted tracks were auditioned by measurement: spectrograms (every one looked at),
Apple's SoundAnalysis classifier for voices, alarms and instruments, loudness and dynamics, the share of energy a
laptop speaker can play, and a weighted rubric with a pass mark of 70 out of 100.

None passed. The best scored 67, and it and the runner-up put 80 % and 87 % of their energy below 150 Hz, where a
laptop speaker plays little; the best track that passed every gate scored 64. So the plan's fallback ran: an original
score, composed for this film in code (`tools/audio/compose_score.py`), in D major, with the hook's motif returning on
the reveal, the payoff and the end card. A composing tool the plan had picked for the fallback was downloaded but never
run, because the session's permission system blocked running downloaded code; the score was rendered by our own
script instead, and scored 91 on the same rubric (self-assessed, like every score of our own music).

The owner then asked for a more professional sound, so the same score, note for note, is played on recorded
instruments by our own sampler (`tools/audio/render_sampled.py`): marimba, vibraphone, glockenspiel, upright piano,
bass drum and shaker from the Versilian Community Sample Library, and viola and violin sections and double bass
pizzicato from VS Chamber Orchestra Community Edition, all CC0, each file pinned to a commit and a SHA-256. It scored
93, with the same beat grid, so no picture changed.

The classifier earned its place. It heard a recorded kalimba as a cowbell and a ringtone, so that part moved to the
piano, and it heard violins on the pad's upper voices as a telephone, so violas play them. It also heard the film's
first notes, played straight after silence as a feed plays them, as a telephone (0.65): the opening bar was re-voiced,
the motif an octave lower on the upright piano with the strings' chord entering under it, and the reading fell to
0.04. And a pitched pop on the end card's landing (frame 2016) pushed the social master's end-card window to 0.24,
against a limit of 0.25: the pop was removed, the thud under it stayed, and the window now reads below 0.1.

The sound effects are ours (whooshes, a riser, a soft hit, a shimmer, synthesised in code and released CC0) plus
recorded CC0 foley from Kenney's Impact and Interface packs for the clicks, pops, ticks and thuds. The cue list is
exported from the film's timeline, so every effect peaks one frame after its picture event, and the riser ends on the
reveal. The final masters measure −16.0 LUFS and −1.7 dBTP for the web and −14.1 LUFS and −1.5 dBTP for social. Taste
is the one thing an agent can't measure, so the candidate beds were left as a short audition set for a human listen.
The scores, the licence checks and every source are in `docs/media-provenance.json`.

## The trailer

The owner watched the energetic recut of the first film, approved its motion and rejected its music: it should sound
like a frontier lab's launch. Then they asked for more: tension that grabs attention in the opening seconds, the
product revealed in glimpses, then a full reveal, like a blockbuster trailer. The research came first, and the
blueprint came from it:
- about 140 launch films;
- 13 trailers and 19 product reveals, studied beat by beat;
- Pebble's 22 features against 24 competitors, to choose what to prove.

The blueprint is 76.8 s at 100 BPM, 32 bars in four movements:
- **Tension:** three questions on a night field ("What did it change?", "Can I undo it?", "Did it run the tests?"),
  each answered by a one-bar glimpse of the app. Then "An agent shouldn't / grade its own work", a build and a dead
  stop.
- **Reveal:** the drop lands the pebble as the full stop of its name, then the desktop, the quick chat at 1× and the
  whole workspace.
- **Proof:** a six-beat montage, then the AgentGuard climax.
- **Title:** the title, with the limits on the end card.

**The real interface, again, and its real timing.** Every capture was re-recorded from a verified copy of the 1.5.0
tag. Reading the release's code showed that the earlier sample run's event model was older than the release:
- In 1.5.0's Ask mode, approved tests run inside the approval. The tests card reads Running, and "Verified" arrives
  only after the resumed run's next model turn, 2.2 s after the tests pass.
- Conversation text arrives whole, not word by word.
So the captures were redone twice until every clock, row and message matched 1.5.0, and the climax follows the app:
- the first hit lands when the tests pass, on bar 24's downbeat;
- "Verified" lands 67 frames later as the peak, a sixteenth-note push into bar 25;
- Pebble's time is never compressed.

1.5.0's usage lines print a speed rate and a cached-token count. The trailer is framed so that neither is ever on
screen: the page states no speed or savings numbers until a benchmark measures them.

**The score, synthesised.** A new deterministic engine (`tools/audio/synth`) wrote two candidates from the
blueprint's music section:
- A: hybrid trailer electronic;
- B: bright electro-pop.
They were judged by measurement against the final cue list, because taste is the one thing an agent can't measure.
B won:
- its drums and bass sit 4.3 LU over its music in the montage, where A's sit 2.1 LU under;
- its hook runs through the proof;
- 25 of the 41 cues land within a frame of one of its accents (A: 16).
After review, its push on "Verified" became the film's loudest moment, and its groove carries on through the quick
chat instead of sitting back. The classifier caught three problems on the way:
- A's opening pad, with noise air, read as a train horn (0.63);
- a supersaw riser gliding an octave read as a civil-defence siren (0.30);
- B's thin arp pluck read as a ringtone (0.31).
Each was re-voiced until it read as music. The score uses no instrument samples, so the CC0 instrument libraries no
longer play anywhere on the site.

**A narrated twin.** The master is wordless. An optional twin for social adds four of the film's own lines in an AI
voice (Sarvam AI's Bulbul v4, the voice Simran):
- the lines play only over frames without the pebble, because the pebble itself never speaks;
- the music ducks about 4.6 dB under each line;
- the voice is disclosed as AI wherever the twin is posted.

**On the page.** The poster is the trailer's own first frame, framed so the pebble peeks into the first screen and
the play button sits on the dark field. Phones get the 1:1 cut, so the proof stays readable at phone width.

Two fresh-eyes reviews judged the trailer against the blueprint, the truth rules and the owner's request. Each
finding was decided by the lead and recorded, and the fixes were made before anything shipped.

## Every sentence has a source

`docs/CLAIMS.md` maps every factual sentence on the site, in the film and in `llms.txt` to its source: a line of
Pebble's source or documentation at a tagged release, or a post from the release session. Each row says whether the
words are the app's own, a quotation, a derivation (with the reasoning) or sample data. A sentence that can't be
traced is rewritten or removed. The rules that follow from it:

- **The limit sits beside the promise.** A feature sentence is followed by its limit, in the same voice and at the
  same size. Every primary Download button carries the release's honest line: Pebble is signed with its own identity,
  not an Apple Developer ID; it is not notarized; no independent security audit has been done yet. The install
  section adds that a checksum shows the download is intact, not who made it.
- **Words that promise too much are banned**, with a lint (`tools/qa/copy-lint.mjs`) that runs on the built pages:
  "secure", "safe", "seamless", "magic", "100%", "works offline" and the like, comparisons such as "faster" and
  "better", and exclamation marks. "Every" and "always" next to an edit, a command or a test need a mode qualifier,
  because Pebble's behaviour depends on the permission mode.
- **No comparison with other agents**, apart from two lines the release session approved: one line of intent ("An
  agent shouldn't grade its own work.") and, once the results were published, the benchmark's headline. The film's
  tension asks neutral questions a careful person asks of any AI helper: "What did it change?", "Can I undo it?",
  "Did it run the tests?". The film shows no benchmark numbers.
- **Corrections flow in.** When the release session audited Pebble's documentation, the page withdrew what no longer
  held: PDF export, which Pebble doesn't have; "Done means tested" (changed code that no test covers is not held); and
  "flags invented or broken dependencies" (the check that exists challenges invented APIs, in Python code only). The
  register logs each withdrawn claim and why.
- **Releases flow in too.** Pebble went from 1.0.1 to 1.5.0 while the site was built. For each published release one
  file took the new facts, `src/content/releaseFacts.ts` (the version, the zip's size and SHA-256, the test counts),
  checked against the GitHub API and the release's own `SHA256SUMS`, and the register's rows followed. A feature
  reached the page only once the release that ships it was out: Stealth Lockdown with 1.1.0, the permission dial's new
  words with 1.2.0, and Code Mode with 1.5.0, as one short item in the app's own words, with no numbers.
- **The benchmark section shows the work.** It follows the order the philosophy sets: the method first, then the
  overall result with its interval under the one allowed headline ("Pebble matches Claude Code on the same model,
  within the margin."), then where Pebble led and every family where it trailed, at equal weight, false completions
  included, then the cost with its caveats, then what the result does not prove, then the raw data. When the release
  session found that its harness had missed two of the other agent's clarifying questions and scored them as failures,
  that comparison was withdrawn, and the section carries the correction beside the results. Every number on it matches
  the published benchmark document; a test derives each one from the published analysis, kept in this repository byte
  for byte. The benchmark measured Pebble 1.0.2, and the method block says plainly that the latest release hasn't been
  measured yet.

## The gates

Nothing was "done" until it passed its gate. The gates, in the order the work met them:

| Stage | Gate |
|---|---|
| Bootstrap | The site builds; Remotion renders a still; FFmpeg is the arm64 build with x264 and x265; the capture harness runs a scene with no unhandled call; enough disk is free |
| Captures | Captured from a published release; no unhandled IPC call, error banner or console error in any run; every recording checked for frames that failed to paint (`capture/check_frames.py`); every image looked at |
| Pebble engine | Replay equals live playback; the reference frame matches; only Pebble's poses in any cue list; the vendored files, the Veil's included, match their recorded hashes |
| Film | The spec review; the style frames; the animatic with bar sheets, cut strips and a motion audit; the adversarial review; the timeline's own validation and the cue list's freshness check |
| Loops | Seam steps no larger than the loop's ordinary steps (PSNR); no cursor at the ends; key text at 12 px or more at its slot |
| Music and mix | The downbeats within 5 ms of the grid (median), the reveal within one frame, the exact length; −16 LUFS (web) and −14 LUFS (social) within 0.5 LU, true peak at most −1.5 and −1.0 dBTP; at most 3 dB lost in mono; at least 30 % of the energy above 150 Hz; nothing the classifier hears as a voice, an alarm, a siren or a ringtone, including the opening heard after silence and the end card |
| Site | Typecheck and the Bun test suites; viewport tiles from 320 to 1920 px in both themes, with motion on and reduced, every one looked at; axe-core with no violations; a keyboard walk over every control; every request same-origin, no cookies, no console errors; first-load script and transfer budgets; Lighthouse on mobile and desktop (performance at least 90, largest contentful paint at most 2.5 s, layout shift at most 0.1, accessibility, best practices and SEO at 100); the copy lint |
| Media | Every master scanned for blank and half-painted frames before encoding; each encode's codecs and level, colour tags, faststart, frame count, size budget and loudness, and the loops' seams on the encodes (`tools/encode/verify.mjs`); the text tracks equal what their sources make |
| Push | No raw audio tracked, no file over 45 MB, `public/` at most 90 MB, no local paths in committed files |

Agents can't judge a 12,000-pixel page shrunk to fit a screen, so the site's screenshots are taken as viewport-sized
tiles while scrolling, the way a visitor sees the page, and reviewed side by side in both themes.

### Final QA results (the first launch, 24 October)

The final pass ran on 24 October 2026 from 22:32 to 23:25 (run `final-2`), on the final source and media, one heavy job
at a time (`tools/qa/all.sh` and the extra browser checks).

**The page**

- Screens: 24 views (320, 390, 768, 1024, 1440 and 1920 px; light and dark; motion on and reduced), plus 6 with Pause
  motion. None had a problem, a horizontal scroll, a console error or a failed request. The page is 25,678 px tall at
  1440 px.
- axe-core: 112 scans of five pages (`/`, `/film`, `/credits`, `/privacy` and a 404) at 320, 390, 1024 and 1440 px in
  both themes, with the phone menu, an FAQ answer, the film theatre and the download notice open: 0 violations. The
  items axe leaves undecided are text over decoration, where it can't sample the background.
- Keyboard and controls: 226 checks at 390 and 1440 px in both themes, motion on and reduced, 0 failed. They cover
  every Tab stop (visible, on screen, never under the sticky header), the skip link, the menu, the three explainers,
  the story tabs, AgentGuard's ledger, the film dialog and its focus return, Copy and its live region, and the loops'
  pause buttons.
- Requests:
  - No request to another site, no cookies, no console errors.
  - Before interaction: 193.0 KB of JavaScript (limit 200 KB) and 573 KB in all (limit 600 KB).
  - A full scroll loads 1.19 MB at 1440 px and 1.41 MB at 390 px.
  - Links: 115 internal, 65 fragments and 54 external, all answering.
- The ground line: 0 text collisions and 0 media crossings at any width.
- Copy lint: 1,900 text items, 0 findings.
- The built text:
  - Pebble 1.5.0 throughout, with its SHA-256 line in Install.
  - Stealth Lockdown's honest line word for word in its section, the FAQ and `llms.txt`.
  - None of the never-words.
- Stealth Lockdown's switch in Chrome:
  - Tab reaches it; its role is switch, with the honest line as its description.
  - Space turns it on and off, and the polite live region reads the app's own state lines.
  - Focus stays on the switch, and the section keeps its height when it flips.
- Without HEVC (Chrome with its HEVC decoder off), every video plays its H.264 file, and the film theatre plays
  `film-720.h264.mp4` with sound.
- Lighthouse 13.5 over HTTP/2 with Brotli, as Vercel serves the site: three runs each, medians.
  - `/film`: mobile performance 100, largest contentful paint 1.89 s, layout shift 0. Desktop 100 in all four
    categories, LCP 0.47 s, layout shift 0.
  - `/`, desktop: 100 in all four categories, LCP 0.63 s, layout shift 0.
  - `/`, mobile: accessibility, best practices and SEO 100, layout shift 0. Performance 91 and LCP 2.97 s were
    measured while another job compiled Rust on the same 8 GB Mac (load average 11), which inflates Lighthouse's
    simulated phone. A quiet-machine run replaces these numbers. <!-- final-qa-lcp -->
  - Plain `next start` speaks HTTP/1.1, and Lighthouse models each of its parallel requests as a new cold connection.
    That gives a higher mobile LCP (3.62 s on `/`, 3.02 s on `/film`), but it isn't how the site is served.

**What the final pass changed**

- The film page's play button keeps its place until the player is ready. It used to appear only at hydration and move
  the transcript 20 px: a 0.107 layout shift on Lighthouse's phone, now 0.
- Geist Mono is preloaded. The first screen uses it, and finding it only through the stylesheet put HTML, then CSS,
  then the font on mobile LCP's path (`/film`: 2.51 s, then 1.89 s).
- AgentGuard's held-run crop takes in its avatar, so its words aren't flush with the frame.
- The desktop loop (L1) opens on the quick chat's reply. Its poster, and the only picture under reduced motion and
  Pause motion, now shows the promise "Click it for a quick chat" rather than an empty desktop. Its resting shot is
  closer (×3.0), and it is encoded at CRF 22 (HEVC, 677 KB) and 19 (H.264, 1.14 MB), within the same budgets: the old
  encode showed blocks in its smooth gradient. Its seam scores 51.5 dB, above the loop's median frame-to-frame 48.4 dB.

**The source**

- The type checks pass for the site and the films, and so do the loops' checks (seams, frames, reading floor).
- The Bun suites pass: 103 site tests, 82 engine tests and 38 content tests.
- Tailwind's own compile of the stylesheet scans no test file and emits no `.bg-ink` rule. Before that fix, a class
  name in a test file put an unused ink-fill utility into the CSS.
- gitleaks finds no secret in any of the 207 commits.
- No committed file holds a local path, raw audio or a file over 45 MB.
- The lockfile carries the Linux x64 builds of Next's compiler, Lightning CSS and Tailwind's engine, which Vercel's
  builders need.

**The media**

- `node tools/encode/verify.mjs`: 49 files, all pass, with one warning. 7 of the film's 9 audio descriptions need more
  speech than their chapter lasts, so the player holds the film until each is read.
- The film set is 23.15 MB of its 45 MB budget, and `public/` is 37.61 MB of 90 MB.
- Codecs: the 1080p film and the loops are HEVC `hvc1.1.6.L120.90`, the 720p film and the teaser `hvc1.1.6.L93.90`,
  and every H.264 file is `avc1.640028`.
- Everything runs at 30 fps, and the film is 2,304 frames (76.8 s).
- Loudness on the encoded AAC, measured when the films were made:
  - the website film: −16.0 LUFS and −1.7 dBTP in all four files;
  - the social films: −14.1 LUFS, with −1.4 dBTP at full length and −1.5 dBTP for the 30 s cut.
- Picture and sound are in sync within 2 ms at the reveal, and every sampled frame of the 30 s cut matches its frame in
  the film's master.
- The mix checks on the soundtracks:
  - web −16.0 LUFS and −1.7 dBTP, social −14.1 LUFS and −1.5 dBTP, the 30 s cut −14.1 LUFS and −1.5 dBTP;
  - at most 1.18 dB lost in mono, and at least 65 % of the energy above 150 Hz;
  - nothing the classifier hears as a voice, an alarm, a siren or a ringtone. The opening, heard straight after
    silence, reads 0.04 as a telephone (0.65 before it was re-voiced).

### The trailer's results (26 October)

**The source**

- The type checks pass for the site and the films. `checkAll()` (the timeline, time honesty, every framing and the
  cold open's rules) reports no problem in any aspect.
- The Bun suites pass: 124 site and content tests and 82 engine tests.
- gitleaks finds no secret in the repository's history (it reads 292 of the 294 commits).
- No committed file holds a local path, raw audio or a file over 45 MB.

**The media**

- `node tools/encode/verify.mjs`, with the Desktop folder: 89 files, all pass, with one warning. 16 of the trailer's 21
  audio descriptions need more speech than their cue lasts, so the player holds the film until each is read.
- The film set is 33.88 MB of its 45 MB budget, and `public/` is 45.98 MB of 90 MB. The set holds the 16:9 film in
  1080p and 720p, its 1:1 cut for phones, the text tracks and the poster.
- Codecs: the 1080p and square films are HEVC `hvc1.1.6.L120.90` and the 720p film `hvc1.1.6.L93.90`. Every H.264
  file is `avc1.640028`.
- Loudness on the encoded AAC:
  - the website films: −16.2 LUFS and −1.6 dBTP;
  - the social films: −14.4 LUFS and −1.2 dBTP at full length;
  - the 30 s cut: −14.3 LUFS and −1.4 dBTP;
  - the narrated twin: −14.4 LUFS and −1.4 dBTP.
- Every AAC decodes to its soundtrack's exact sample count at lag 0. Every sampled frame matches its master, on both
  sides of every 30 s joint too.
- The flash counter finds at most one flash in any region in any second, against a limit of three.
- The mix checks on the masters:
  - at most 0.42 dB lost in mono;
  - 33–35 % of the energy above 150 Hz, against a gate of 30 %;
  - nothing the classifier hears as a voice, an alarm or a siren outside the narrated lines, and a highest phone
    reading of 0.23, against a gate of 0.30;
  - "Verified" is the film's loudest moment.

## Skills and tools

Project skills were installed in the repository (gitignored) with the skills CLI, then read by path by the agents
that needed them:

```bash
npx -y skills@1.7.4 add anthropics/skills --skill frontend-design -a claude-code -y
npx -y skills@1.7.4 add remotion-dev/skills --skill '*' -a claude-code -y
npx -y skills@1.7.4 add emilkowalski/skills --skill emil-design-eng --skill review-animations --skill animation-performance --skill apple-design -a claude-code -y
npx -y skills@1.7.4 add vercel-labs/agent-skills --skill web-design-guidelines -a claude-code -y
npx -y skills@1.7.4 list
```

That is eighteen skills: `frontend-design`; the twelve Remotion skills (`remotion-best-practices`, `remotion-captions`,
`remotion-create`, `remotion-docs`, `remotion-interactivity`, `remotion-maps`, `remotion-markup`,
`remotion-multimedia`, `remotion-render`, `remotion-saas`, `remotion-studio`, `remotion-upgrade`); `emil-design-eng`,
`review-animations`, `animation-performance` and `apple-design`; and `web-design-guidelines`. They landed in
`.claude/skills/`, with `skills-lock.json` recording each one's source and hash. The Vercel plugin's
`vercel:react-best-practices` review was also run over the site's components.

| Area | Tools and versions |
|---|---|
| The agent | Claude Code with Claude Opus 5.5 |
| Site | Next.js 16.4.2, React 19.3.1, Motion 14.6.0, Tailwind CSS 4.3.3, Phosphor Icons 2.1.10, TypeScript 5.9.3 |
| Films | Remotion 4.0.538 (every `@remotion/*` package pinned to it), Mediabunny 1.62.0, Zod 4.5.4; the masters rendered in the installed Google Chrome |
| Capture | puppeteer-core 25.13.0, driving the installed Google Chrome |
| Images | sharp 0.35.5; fontTools 4.67.0 to instance the display face |
| Fonts | Fraunces, Inter and Geist Mono, from the Fontsource 5.3.0 packages (SIL Open Font License 1.1) |
| Audio | Python 3.13 with numpy 2.5.4, SciPy 1.18.1, soundfile 0.14.0, soxr, librosa 1.0.0, numba 0.68.0, pedalboard 0.9.26, pyloudnorm 0.2.0, mido 1.3.3 and Matplotlib 3.11.2 (exact pins in `tools/audio/requirements.txt`); Apple's SoundAnalysis framework |
| Video encoding | Homebrew FFmpeg 9.0.2 (arm64) |
| Quality | axe-core 4.14.0, Lighthouse 13.5.0, puppeteer-core |
| Runtimes | Node.js 24, npm 11, Bun 1.3, uv |

## What was turned down, and why

| Turned down | Why |
|---|---|
| A second video engine (HyperFrames, the other popular route) | One engine, in the same language as the site; Remotion was proven on this Mac first |
| Redrawing the app's screens in React | It drifts from the real app; the captures are the app |
| Capturing from Pebble's working checkout | It can hold the next version's unpublished work; the captures come from a published tag |
| A screen share with Pebble missing, to show Stealth Lockdown | A protected window can't be screen-recorded, so such a picture would be staged; the page shows the real setting and a render of the pebble instead |
| GSAP, Lenis, scroll-jacking and scroll reveals | The page never takes control of the scroll; Motion and CSS were enough |
| 60 fps films | Calm motion doesn't need it, and 30 fps halves render time and disk |
| −14 LUFS for the web film | A film played on click gets no platform normalisation; −16 LUFS for the web, −14 only for social |
| A separate composition for the 30 s cut | The cut is the film's own frames, so one encode command cuts it from the film's masters, and the film's fixes reach it |
| The five auditioned stock tracks | None reached the pass mark; two failed the small-speaker check |
| AI music generators and paid voice or music services | Non-commercial licences, paid keys, or more memory and disk than an 8 GB Mac has |
| Running a downloaded composing tool | The permission system blocked running downloaded code; our own renderer replaced it |
| A recorded kalimba, violins on the top voices | The classifier heard a cowbell, a ringtone and a telephone |
| A baked film grain | A test encode of the sage field showed only faint contours under an 18-times contrast stretch, so grain stays off |
| AV1 encodes | Safari on M1 and M2 Macs decodes HEVC but not AV1; AV1 is left for later |
| Git LFS, and video hosted elsewhere | Media are committed once, every file under 45 MB, so LFS isn't needed; hosting them elsewhere would mean third-party requests |
| Analytics, including Vercel's own | The site counts its own cookies, trackers and third-party requests, and the answer is zero |
| A page-wide hand-drawn line | The Lexington system keeps one quiet page and one loud thing; the line became ground under each pebble |
| Filled black buttons | The accent's first job is getting Pebble; everything else is a text link or an outline |
| Generic component kits and hook-installing design plugins | The generic look, licence friction on a public repository, or hooks and binaries installed outside the project |

## How the work was organised

A lead agent wrote the plan from seven research reports, had it attacked by a completeness critic, and kept one
overrides file that won over everything else. Each piece of work then ran as a lane: an agent with one job, a list of
the files it owned, and a handoff to write at the end (what was done, the files, how to run it, the open issues, the
disk used). More than forty lanes ran this way, many in parallel in the same checkout: copy and claims, the pebble,
the music, the captures, the film spec, the site's shell and sections, the motion, the mix, the masters and the
encodes, QA, and reviewers whose only job was to find what was wrong (a design critic, a claims audit and QA),
followed by a lane that fixed what they found. Every commit carries a Claude Opus 5.5 co-author line.

The Mac had 8 GB of memory and a few GB of free disk, so every heavy job went through `scripts/heavy.sh`: one at a
time, refused when disk or memory ran short, and stopped if free disk fell to the floor. Frame sequences were recorded
just in time and deleted after use.

Pebble's releases were made at the same time by another Claude session, in Pebble's own repository: from 1.0.1 to
1.5.0 between 22 and 24 October. The two worked through a shared status file outside both repositories. The release
side posted the release facts (version, size, links, test counts), corrections to claims, and when results could be
published; the landing side read it before relying on any fact, and only its lead wrote back. When the release side
needed the machine for load-sensitive work, it could ask for a hold on heavy jobs here, or for disk to be kept free,
and `heavy.sh` honoured both. Pebble's source was only ever read.

## Cost

Apart from Claude Code itself, no paid tool, stock asset, font or API was used to make the site or the media. Every
tool is free or open source; Remotion is used under its free licence for individuals.
