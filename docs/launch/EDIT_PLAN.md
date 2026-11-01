# Pebble 2.0 launch film: the edit plan (shot by shot)

Status: v1 draft, 1 Nov 2026, by the director. Times are seconds from each scene's start, at an assumed ~120 BPM
(1 beat ≈ 0.5 s, 1 bar ≈ 2 s); the director retimes everything to the chosen track's beat map. Source seconds come
from `video/src/launch/data/takes.ts` (real takes), `data/ui.ts` (harness captures) and `data/remote.ts` (the iPhone
app). Every scene is built for 16:9 and 4:5 (TREATMENT §1).

Scene components live in `video/src/launch/scenes/S<nn><Name>.tsx`, take `{durationInFrames}` from the master and
place their beats relative to it. Each scene also registers a preview composition `Launch-S<nn>-16x9` / `-4x5`.

## Running order (target ≈ 92–98 s)

| Scene | Bars | ~Length | Music section |
|---|---|---|---|
| S00 Cold open | 4 | 8 s | intro (sparse) |
| S01 Title | 2 | 4 s | the drop |
| S02 Lives on your Mac | 4 | 8 s | drive A |
| S03 Uses your Mac | 6 | 12 s | drive A |
| S04 AgentGuard | 5 | 10 s | drive B |
| S05 Pebble's Workshop | 4 | 8 s | drive B |
| S06 Memory | 3.5 | 7 s | drive C (lift) |
| S07 Context warping | 3 | 6 s | drive C |
| S08 Pebble Remote | 3.5 | 7 s | drive C |
| S09 Stealth Lockdown | 4 | 8 s | the breath, then the riser |
| S10 Benchmarks | 6 | 12 s | the payoff |
| S11 Outro | 4 | 8 s | resolve and end |

## S00 Cold open (8 s): "the challenger"

- 0.0 (frame 0 = the thumbnail, a finished composition) Night stage, a soft sage light behind the pebble. The pebble,
  **small** (≈ 120 px tall at 1080p), awake at centre low, and "This is Pebble." already landed above it (Inter 650,
  ≈ 120 px). 0.3 it blinks. Ground drift only; the title stays still.
- 1.2 Swap to "It's small." (per-word blur entrance). The pebble does a tiny hop and squash (comic beat, on the beat).
  SFX: soft pop on the landing.
- 2.4 "It just went up against" (stone-1, ≈ 64 px), then on the next two beats "Claude Code" and "and Codex." in huge
  heavy type (mute grey, 220–260 px, filling the width like monoliths). The pebble, tiny at their feet, looks up at
  them (gaze toward the words). Premise on screen by ~3 s.
- 4.8 "Same model. Same tasks." (Geist Mono 500, sage, ≈ 56 px). The riser starts.
- until the drop: the pebble turns to camera and blinks; the stage darkens ~40 % for 3 frames before the drop.

## S01 Title (4 s): the drop

- 0.0 Low hit + whoosh. The pebble hops big into frame (anticipation, stretch, landing squash) beside the wordmark:
  "Pebble" + "2.0" (Inter 700, ≈ 200 px; "2.0" in sage). One diagonal light sweep across the lockup.
- 1.0 The tagline rises under it: "The desktop companion that does real work, and shows its evidence." (Inter 500,
  ≈ 44 px, stone-1; "real work" may take Fraunces italic).
- 3.4 Scale-through: the camera dives into the pebble's body; its sage fills the frame and becomes the next scene.

## S02 Lives on your Mac (8 s)

- 0.0 RS1-03 in a FloatingWindow (the whole Mac screen floating, tilted, flattening): the Spaces swipe; the
  desktop slides, the pebble stays. Zoom follows the pebble. Text: "It lives on your Mac." then "On every Space."
- 4.0 Cut on the downbeat to RS15-01: tight on the pebble; the click; the quick chat opens; "What can you do now?"
  typed (ramped ×2 where it waits). Text: "Click. Ask."
- 7.5 Return pressed: whip to S03.

## S03 Uses your Mac (12 s)

- 0.0 Act card: "Now it can use your Mac." (big, 1.5 s).
- 1.5 RS4-07: the window card "Use Calculator" and its Allow (ramped), Calculator forward; zoom to the keypad. Each
  press lands with a key-tap SFX; "=" → **600** gets a punch-in and a soft shimmer. Text: "Your apps."
- 5.5 RS5C-04: the app-action card, "Do it", the "Glaze order" event appears; zoom on the event. Text: "Your calendar."
- 8.5 RS9B-02: the website approval and its Allow; the "Pebble is working in this tab" pill. Text: "Your browser."
- 11.0 The limit, under the last shot: "Only the windows and sites you allow." Hard cut on the downbeat.

## S04 AgentGuard (10 s)

- 0.0 "Done means checked." (big; "done" may take quotes in Fraunces italic).
- 1.5 Real UI (harness, v2.0.1): "Pebble's change isn't verified yet." with Run the tests / Ask Pebble to finish /
  Accept as unverified. A clay glow on the held state. The pointer clicks Run the tests; the tests run;
  "Verified · … passed on current files" lands with a sage glow and the shimmer SFX.
- 6.0 Title "AgentGuard." with "Evidence before "done"." and three labels on beats (diagram chips, not UI):
  "Tests the host ran, not the model's word." / "Files you asked to keep, kept." / "Output compared byte for byte."
- 10.0 Cut.

## S05 Pebble's Workshop (8 s)

- 0.0 "It builds its own tools."
- 1.0 RSW-01: the kiln request, then "Running a script: Create, test, keep and use a kiln_ramp_time tool…" (zoom).
- 3.0 Diagram: a small tool `kiln_ramp_time` assembles from code lines → a sandbox box → its tests tick → a blind
  check (tests written from its description alone) returns 2 of 5 → "asks you".
- 5.5 RSW-01's Keep card lands: "Keep this tool in Pebble's Toolbox? … Pebble asks because the independent check
  disagreed (2 of 5 tests passed)." Zoom on that line. Text: "When the check disagrees, it asks you."

## S06 Memory (7 s)

- 0.0 "It remembers what matters."
- 1.0 Six translucent stone slabs stack in 3D on six beats, each labelled: Profile (your preferences), Semantic (facts
  and knowledge), Procedural (how things are done here), Episodic (past tasks), Temporal (things that expire), Working
  (the current task).
- 4.0 Real Settings › Memory (harness): a layer's records; Forget and its confirmation. Text: "All visible. Forget
  anything."

## S07 Context warping (6 s)

- 0.0 Title: "Context warping."
- 1.0 Diagram: a long task's context as a column of tool-result blocks growing upward; past a budget line the older
  blocks warp (a lens-like squeeze) into thin sealed stubs; the newest stay full. Text: "Long tasks keep a smaller window."
- 3.5 One stub opens back to its full block, unchanged. Text: "Older results sealed. Any one returned exactly."

## S08 Pebble Remote (7 s)

- 0.0 "Your Mac, in your pocket."
- 0.8 The iPhone (Device) rises with the real app: a conversation; an approval arrives; Face ID; approved. Behind it,
  softly blurred, the Mac carries on.
- Text: "Pebble Remote for iPhone." / "Approve with Face ID." Small: "Open source. Build it with Xcode."

## S09 Stealth Lockdown (8 s)

- 0.0 The music breathes. "Presenting?" (quiet, smaller).
- 1.0 RS13-03: ⌘K, "stealth" typed, "Turn Stealth Lockdown on", Return, and Pebble's windows leave the recording.
  Zoom on that moment; hold half a second on the empty desktop.
- 4.5 The pebble puts on the Veil (dusk glass, Pebble's own Veil code). "Stealth Lockdown." with the honest line under
  it, word for word, readable for ≥ 3 s: "Hidden from screen capture and screen sharing, not from a camera, a capture
  card or a process list. Exams and interviews that forbid assistants still forbid it."
- 7.0 The riser starts. Cut.

## S10 Benchmarks (12 s): the payoff

- 0.0 "So. How did it do?" The pebble (sage again) glances at the camera.
- 1.5 Card 1 "Tasks done correctly." Two pairs side by side (stacked on 4:5): "vs Claude Code, same model
  (claude-opus-5-5)": Pebble **92.2 %**, Claude Code 83.5 %; "vs Codex, same model (gpt-6.1-sol)": Pebble **95.3 %**,
  Codex 90.6 %. Bars grow, digits count up (ticks).
- 5.5 Card 2 "Said "done" when it wasn't." 6.3 % vs 13.7 %; 3.9 % vs 7.1 % ("lower is better"). This is AgentGuard's
  payoff: a small "AgentGuard" tag may tie back to S04.
- 8.5 Card 3 "Cost per task." $0.091 vs $0.117; $0.042 vs $0.050.
- The footnote stays at the bottom throughout (TREATMENT §3). 11.5 The pebble's `happy` pose.

## S11 Outro (8 s)

- 0.0 "Small pebble." 1.0 "*Real work.*" (Fraunces italic, sage).
- 2.5 Lockup: the pebble + "Pebble 2.0" + "Free and open source for Mac." + "github.com/tohin003/Pebble" (Geist Mono).
- 6.0 The pebble settles into rest (`sleepy`). Small end text: "Shown with sample data." / the music credit if its
  licence asks / "Pebble's character engine: bloub by Jérémy Perret (MIT)".

## Sound map (placed by the editor on the master; scenes may export cue lists)

| Moment | SFX |
|---|---|
| The pebble wakes, appears | pop |
| Big type slams (rivals, act cards) | soft thud (low) |
| Every whip / scale-through | whoosh (short or medium) |
| UI clicks (Allow, Do it, Run the tests, Forget) | click |
| Calculator presses | key taps, one per press, on the picture's frame |
| "600", "Verified", Face ID approved | shimmer |
| Pre-drop, pre-payoff | riser |
| Title drop | low impact |
| Count-ups | ticks (one per 3 frames, rate-limited) |
| End | soft swell |

An effect's peak lands on the visual contact frame or 1 frame after (never more than 2 frames early); a whoosh's swell
starts early so its peak meets the cut. Music ducks 2–3 dB under the honest line and the footnote only if needed.

## Worlds by scene (TREATMENT rulings v1.1)

| Scene | World | Seam into the next scene |
|---|---|---|
| S00, S01 | Night | S01 → S02: scale-through the pebble's body into the desktop |
| S02, S03 | Desktop | S03 → S04: the last window shrinks to a card that carries into Daylight |
| S04–S07 | Daylight (real UI captures float on it) | objects carry each seam (a card, a slab, a block) |
| S08 | Night | the iPhone carries out of Daylight as the light drains (a wipe, not a cut) |
| S09 | Desktop → Night (dusk) | the Veil pebble carries into S10 |
| S10 | Night → Daylight (the evidence) | light rises behind the first chart |
| S11 | Night | the pebble rests |
