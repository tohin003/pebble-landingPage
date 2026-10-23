# How it was made

The story of Pebble's website and launch film, for a curious engineer: the ideas behind them, the pipeline, the gates
every piece had to pass, the tools, and what was tried and turned down. The commands are in `docs/BUILDING.md`.

Everything here was built with Claude Code, by teams of agents working in parallel in one checkout, in October 2026.

## The pipeline

```
Pebble's source (a read-only checkout)
 |
 |-- capture/   Pebble's own Vite frontend in Chrome, Tauri's IPC mocks, a fictional sample world
 |      |-- stills (PNG at 2x and 3x) --> tools/assets (sharp) --> public/ui/v1 (AVIF, WebP)
 |      `-- recordings on a virtual clock (one PNG per frame) --> video/public/ui-frames
 |
 `-- the pebble's engine (bloub, MIT) --> shared/pebble --+--> the site's live pebble
                                                          `--> the films, replayed frame by frame

tools/audio   compose_score.py --> render_sampled.py (CC0 samples) --> the music bed and its beat map
                                                                              |
video/        the film's timeline, snapped to the beat map --> 16:9, 1:1 and 9:16 masters, the loops, the posters
                     |
                     `--> export-cues.ts --> cues.json --> mix_master.py --> web and social soundtracks

tools/encode  masters + soundtrack --> HEVC and H.264 --> public/media/v1 --> the Next.js site --> Vercel
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

Every picture of Pebble on the site and in the films is Pebble. `capture/` runs the app's own frontend, read from a
read-only checkout of its source, in Chrome. Tauri's official IPC mocks answer the calls the frontend makes to the
app's backend, with a fictional world as the data: Maya, a Python project called `invoice-kit`, a Lisbon trip budget
and a datetime quiz. The harness never writes into the checkout (Vite runs without the project's config, with its
cache in `capture/`), and a run fails on any call the mocks don't answer, any error banner and any console error.

- **Stills** are taken at 2x and 3x, in both themes, and encoded to AVIF and WebP for the page.
- **Recordings** play a timeline of backend events against a virtual clock and save one PNG per frame, so a
  recording is the same every time it is made. The film's main sequence (a request, reading, two edit cards,
  AgentGuard holding the task, Run the tests, Verified) is one such recording.
- **Words are the app's own.** "Pebble's change isn't verified yet." with Run the tests, Ask Pebble to finish and
  Accept as unverified; "Requesting isolated tests · 11 s"; "Verified · pytest 42 passed on current files". Where the
  real app had a quirk, the captures show it. Nothing on screen is labelled as a mock or a fixture, and the page marks
  the sample world "Shown with sample data."
- **When a new release changed the window's words**, everything was captured again from it. The fixtures name the
  version they were checked against.

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
  the most visible pebble on the page animates. Pause motion and reduced motion leave a still.
- **In the films**, a fresh engine is replayed up to every frame from a list of cues, so a frame is the same in any
  render and in any order. A test checks that replaying matches live playback frame for frame.

## The film, cut to the music

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

The feature loops follow the same rules. They are silent, and they must loop without a visible seam: the step from the
last frame back to the first has to look like an ordinary step of the loop (its PSNR within 3 dB of the median step).
Every key line must read at 12 px or more at the size the page shows it (11 px on a 360 px phone).

## An original score on CC0 samples

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
93, with the same beat grid, so no picture changed. The classifier earned its place: it heard a recorded kalimba as a
cowbell and a ringtone, so that part moved to the piano, and it heard violins on the pad's upper voices as a
telephone, so violas play them. It later flagged the film's first second, heard after silence, the same way; the fix
re-voices the opening bar.

The sound effects are ours (whooshes, a riser, a soft hit, a shimmer, synthesised in code and released CC0) plus
recorded CC0 foley from Kenney's Impact and Interface packs for the clicks, pops, ticks and thuds. The cue list is
exported from the film's timeline, so every effect peaks one frame after its picture event, and the riser ends on the
reveal. Taste is the one thing an agent can't measure, so the candidate beds were left as a short audition set for a
human listen. The scores, the licence checks and every source are in `docs/media-provenance.json`.

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
- **The benchmark section shows the work.** It follows the order the philosophy sets: the method first, then the
  overall result with its interval under the one allowed headline ("Pebble matches Claude Code on the same model,
  within the margin."), then where Pebble led and where it trailed at equal weight, losses included, then the cost,
  then what the result does not prove, then the raw data. When the release session found that its harness had missed
  two of the other agent's clarifying questions and scored them as failures, that comparison was withdrawn, and the
  section must carry the correction beside the results. Every number on it must match the published benchmark
  document exactly.

## The gates

Nothing was "done" until it passed its gate. The gates, in the order the work met them:

| Stage | Gate |
|---|---|
| Bootstrap | The site builds; Remotion renders a still; FFmpeg is the arm64 build with x264 and x265; the capture harness runs a scene with no unhandled call; enough disk is free |
| Captures | No unhandled IPC call, error banner or console error in any run; every recording checked for frames that failed to paint (`capture/check_frames.py`); every image looked at |
| Pebble engine | Replay equals live playback; the reference frame matches; only Pebble's poses in any cue list; the vendored files match their recorded hashes |
| Film | The spec review; the style frames; the animatic with bar sheets, cut strips and a motion audit; the adversarial review; the timeline's own validation and the cue list's freshness check |
| Loops | Seam steps no larger than the loop's ordinary steps (PSNR); no cursor at the ends; key text at 12 px or more at its slot |
| Music and mix | The downbeats within 5 ms of the grid (median), the reveal within one frame, the exact length; −16 LUFS (web) and −14 LUFS (social) within 0.5 LU, true peak at most −1.5 and −1.0 dBTP; at most 3 dB lost in mono; at least 30 % of the energy above 150 Hz; nothing the classifier hears as a voice, an alarm, a siren or a ringtone |
| Site | Typecheck and the Bun test suites; viewport tiles from 320 to 1920 px in both themes, with motion on and reduced, every one looked at; axe-core with no violations; a keyboard walk over every control; every request same-origin, no cookies, no console errors; first-load script and transfer budgets; Lighthouse on mobile and desktop (performance at least 90, largest contentful paint at most 2.5 s, layout shift at most 0.1, accessibility, best practices and SEO at 100); the copy lint |
| Media | Each encode's format, size budget and loudness (after the media phase) |
| Push | No raw audio tracked, no file over 45 MB, no local paths in committed files |

Agents can't judge a 12,000-pixel page shrunk to fit a screen, so the site's screenshots are taken as viewport-sized
tiles while scrolling, the way a visitor sees the page, and reviewed side by side in both themes.

### Final QA results

To be filled after the final QA run.

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
| Films | Remotion 4.0.538 (every `@remotion/*` package pinned to it, with Remotion's headless browser), Mediabunny 1.62.0, Zod 4.5.4 |
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
| GSAP, Lenis, scroll-jacking and scroll reveals | The page never takes control of the scroll; Motion and CSS were enough |
| 60 fps films | Calm motion doesn't need it, and 30 fps halves render time and disk |
| −14 LUFS for the web film | A film played on click gets no platform normalisation; −16 LUFS for the web, −14 only for social |
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
disk used). More than twenty lanes ran this way, many in parallel in the same checkout: copy and claims, the pebble,
the music, the captures, the film spec, the site's shell and sections, the motion, the mix, QA, and reviewers whose
only job was to find what was wrong. Every commit carries a Claude Opus 5.5 co-author line.

The Mac had 8 GB of memory and a few GB of free disk, so every heavy job went through `scripts/heavy.sh`: one at a
time, refused when disk or memory ran short, and stopped if free disk fell to the floor. Frame sequences were recorded
just in time and deleted after use.

Pebble's release was prepared at the same time by another Claude session, in Pebble's own repository. The two worked
through a shared status file outside both repositories. The release side posted the release facts (version, size,
links, test counts), corrections to claims, and when results could be published; the landing side read it before
relying on any fact, and only its lead wrote back. When the release side needed the machine for load-sensitive work,
it could ask for a hold on heavy jobs here, or for disk to be kept free, and `heavy.sh` honoured both. Pebble's
source was only ever read.

## Cost

Apart from Claude Code itself, no paid tool, stock asset, font or API was used to make the site or the media. Every
tool is free or open source; Remotion is used under its free licence for individuals.
