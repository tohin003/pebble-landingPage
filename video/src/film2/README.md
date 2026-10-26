# film2: the motion foundation for "Ripples" (Pebble 2.0.0's launch film)

The reusable system every shot of the new film uses: the ring carrier, the seven transition kinds, the camera language
over the UI, light and depth, kinetic type, and the smoothness checks, with a demo reel that exercises all of them.
It follows the director's treatment's edit and motion bible (TREATMENT §5) exactly; where a number comes from, the
comment beside it says.

- **Local branch only.** This code lives on `film-2.0`, which is never pushed until the release session posts
  "2.0.0 published" (OVERRIDES §48–§50, D87). Nothing here is deployed, uploaded or posted.
- **Placeholder UI.** Until the 2.0.0 snapshot and the real takes exist, the demo runs on real captures of *published*
  Pebble releases (`demo/placeholders.ts`). Nothing in this folder draws Pebble's interface; no still may be presented
  as 2.0.0.
- **Honesty rules built in.** Pebble's time plays at 1× (`RecordedTake` has no rate parameter); usage and timing lines
  never show (the receipt is cropped, the take ends before its usage line); no numbers, no comparisons; the copy lint
  in `qa/checks.ts` holds the never-list.

## Layout

| Folder | What is in it |
|---|---|
| `tokens.ts` | every number: colours (DESIGN-LEXINGTON §5), eases, the seven kinds' timings (§5.1, frames at 60 fps), camera speeds (§5.3), light (§5.4), the type scale (§5.2), reading rules, ring and smoothness limits |
| `motion/` | `ease.ts` (curves with exact slopes), `camera.ts` (the velocity camera), `blur.ts` (blur matched to speed), `geometry.ts` |
| `carrier/` | the ring: `ring.ts` (pure geometry), `RingLayer.tsx`, `Ripple.tsx` (ground refraction), `apertureMath.ts` + `Aperture.tsx` |
| `transitions/` | the seven kinds: `kinds.ts` (the table), `presentations.tsx`, `momentum.ts`, `entrances.tsx`, `LightChange.tsx`, `ports.tsx` (HyperFrames moves ported to GSAP) |
| `camera/` | `World3D.tsx` (windows as planes, tilt, parallax, depth of field, motion blur), `moves.ts` (push-in, pull-back, dolly, crane, travel, leave), `MotionBlur.tsx` |
| `light/` | `grades.ts` + `Grade.tsx`, `lut.ts` + `write-lut.ts`, `Grain.tsx`, `LightLeak.tsx`, `Sweep.tsx` |
| `type/` | `gsap.ts`, `FontGate.tsx`, `KineticLine.tsx`, `Cascade.tsx`, `TextMatchCut.tsx`, `scale.ts`, `reading.ts` |
| `qa/` | `timeline.ts` (the model the checks read), `checks.ts`, `luma.ts` + `luma-scan.ts` (pixel checks on a render), `check-demo.ts` |
| `demo/` | the demo reel and its timeline, the ports lab, the grades sheet, the type specimens, the placeholder registry |
| `render/` | `render-segments.sh` (segmented renders with the disk preflight), `sheets.sh` (contact sheets and seam strips) |
| `setpieces/` | the set pieces (the Drop, the ring block, the wall, the Dusk passage, the climax shell, the convergence with the title and end card), their placeholders, music fitting and checks: see "The set pieces" below |
| `tests/` | Bun tests: `bun test video/src/film2` |

**File names differ by more than case.** This Mac's disk is case-insensitive: `ring.ts` beside `Ring.tsx` made Bun
load the React file for the pure one. Pure modules and components therefore have distinct names (`ring.ts` /
`RingLayer.tsx`, `apertureMath.ts` / `Aperture.tsx`, `grades.ts` / `Grade.tsx`).

**Pure versus React.** Everything under `motion/`, `carrier/ring.ts`, `carrier/apertureMath.ts`, `light/grades.ts`,
`light/lut.ts`, `type/reading.ts`, `type/scale.ts`, `transitions/kinds.ts`, `transitions/momentum.ts`, `qa/` and
`demo/timeline.ts` imports neither React nor `../fonts`, so validators and tests run them under Bun with no browser.
Every value is a pure function of the frame (fractional frames included: CameraMotionBlur renders between frames).

## Tokens (`tokens.ts`)

- `REF_FPS = 60`; `f60(frames60, fps)` converts the treatment's frame counts for a 30 fps master (lead ruling L2 is
  open); `speed60()` and `accel60()` convert speeds and accelerations.
- `COLOR`: the page's tokens; the ring is `accent` #506E54 (#A6C795 on dark); shadows and vignettes use `shadeRgb`, never
  black; `dusk` (#44528C) is the Veil's blue, for the Stealth passage only.
- `BEZIER`: E-arrive (0.16, 1, 0.3, 1), E-leave (0.3, 0, 0.8, 0.15), E-move (0.45, 0, 0.55, 1), and the text match
  cut's (0.85, 0, 0.15, 1).
- `TRANSITION`: the seven kinds' limits; `CAMERA`: reading ≤ 4.6 px a frame, travel ≤ 30, whips ≥ 50 (reserved), the
  glide's τ, tilt ranges, the 28 px reading floor; `LIGHT`; `SHADOW_WINDOW` (exactly `--shadow-window`).
- `TYPE_SIZE`, `TYPE_FACE`, `TYPE_MOTION`, `SAFE_MARGIN_PX`, `READING`, `RING`, `LIMITS`.

## Motion (`motion/`)

**Curves** (`ease.ts`). `cubicBezier(x1, y1, x2, y2)` returns a `Curve`: call it for eased progress, `.slope(t)` for
its speed as a multiple of the mean, `.v0` and `.v1` for its end speeds. `E_ARRIVE`, `E_LEAVE`, `E_MOVE`, `E_MATCH`, and
`curve(name)` for GSAP's names ("power3.inOut", "expo.out", "sine.inOut" …), re-implemented from GSAP 3.15's own source
and tested against `gsap.parseEase()`. `CUSTOM_EASES` registers the film's curves as GSAP CustomEases (`type/gsap.ts`).
`glideDistance()` / `glideVelocity()` are the glide v(t) = v_d + (v0 − v_d)·e^(−t/τ).

**The velocity camera** (`camera.ts`). The state is the world point at the frame's centre and the log of the zoom
(world units are CSS px of a capture at 1×). A track is a chain of segments, each with an exact velocity:

```ts
const cam = new VelocityCamera({ x, y, zoom }, { lz: 0.0004 }); // already pushing in on frame 0
cam.hermite(160, { x, y, zoom: zoom * 1.08 }, { lz: 0.00025 });   // C1 Hermite on x, y and log zoom
cam.glide(240, 24, { x: 0.3 });                                   // coast into a drift (τ in frames)
cam.ease(258, pose, "E-leave");                                   // accelerate into a cut
cam.sample(f) // { state, vel (per frame), pose }   cam.pose(f)
```

Past its last segment a track keeps its last velocity (a shot that runs long never freezes). `screenVelocity(sample,
point, w, h, depth)` is the speed of the content under a frame point (−zoom·v + (P − centre)·v_lz); `maxScreenSpeed()`
probes the centre and corners. `planePose()` gives a parallax plane's pose; `worldToFrame()`, `poseMatrix()`.
`ScalarTrack` is a Hermite track for one number (tilt, focus, a mix).

**Momentum across a cut** (T01). `arriveWithMomentum({ target, frames, vScreen, mode })` builds the incoming camera so
its first frame moves the centre's content at the outgoing screen velocity, then lands on E-arrive (D = v·T/6.25) or
glides; `transitions/momentum.ts momentumCut()` appends the outgoing E-leave (12–24 frames) and returns both cameras
and the seam's two velocities.

**Blur** (`blur.ts`). `sigmaForTravel(px) = travel ÷ 7` (a 180° shutter); `blurForTravel()` is 0 at or below the
reading speed; `directionalSigma(v)` gives the SVG blur's "σx σy"; `hybridGapSigma()` (travel ÷ 55) fills
CameraMotionBlur's gaps; `blurIsEnough()` is the audit's rule.

## The ring carrier (`carrier/`)

A ring is data: a `RingSpec` with a start frame, the stone's centre and radius (world units) and a list of phases:

| Phase | Does | Default ease |
|---|---|---|
| `emit { radius }` | leaves the stone: born at its edge, invisible on its first frame | E-arrive |
| `appear { radius, at? }` | fades in where it is (the convergence's start) | E-move |
| `travel { to, radius? }` | moves its centre: it leads, the camera follows | E-move |
| `frame { rect, clearance? }` | settles round an ask; radius = the rect's half-diagonal + 40, so it never crosses the ask | E-arrive |
| `hold` | stays | — |
| `burst { radius \| "edge" }` | to the frame's farthest corner in 60–90 frames (the Drop); "edge" is resolved from the camera | E-arrive |
| `return` | back to the stone, accelerating; gone before contact | E-leave |
| `fade` | fades where it is | E-move |

`echoes` adds fainter rings: as ripples after the emit (`echoMode: "emit"`), or as a delayed train repeating every
phase (`"all"`, the convergence). `layer: "ground"` (default) draws it behind every window, so UI occludes it;
`"front"` makes it an iris edge, and the checks hold it off every readable rect.

- `ringStates(spec, frame, fps, edgeRadius?)`, `rippleStates()`, `phaseWindows()`, `ringEnd()`, `ringsInFlight()`.
- `<RingLayer specs pose layer offset? poseAt?>`: the hairlines in frame space, 1.5–2 px at 1080 whatever the zoom.
- `<RippleGround specs pose poseAt? highlight?>{ground}</RippleGround>`: the ground ripple (≤ 6 px, gone after 30
  frames), as two masked, slightly scaled copies of the ground about the crest, plus a crest lit from above left. On
  the ground only.
- `<Aperture open centerY? />` with `apertureRect()` and `apertureOpenForRing()` (`apertureMath.ts`): 16:9 opens from
  2.39:1, 9:16 from 4:5, 1:1 from 16:9. The demo opens it over 33 frames from the frame the ring touches its edge.

## The seven transition kinds (`transitions/`, §5.1)

| Kind | Build it with | Frames (60 fps) |
|---|---|---|
| 1 The ring (iris, mask, hairline) | the ring phases above; `ringIris({ center, featherPx, startRadiusPx })` for a seam | iris 20–36, burst 60–90 |
| 2 Momentum cut | `momentumCut()`; `<CutTheCurve>` for a subject (a card, the pointer) | out 12–24 on E-leave; in matched |
| 3 The product's own motion | `<RecordedTake frames sourceFps at inPoint>` (1×, no rate parameter); `askCardPlaneStyle()` / `<AskCardEntrance>` for the entrance every ask shares | as recorded |
| 4 Push-in and pull-back | `camera/moves.ts`: `pushIn`, `pushInCarried`, `pullBack`, `dolly`, `crane`, `travelTo`, `leave` | 90–240; 1.00 → 1.06–1.15 |
| 5 Swap in place | `type/Cascade.tsx` (`cascadeSchedule`, `<Cascade>`); `swapInPlace()` for a scene | 8 out + 8 in |
| 6 Rack focus | `rackFocus({ blurPx })` for a seam; `focusPull(from, to, at, frames)` feeding `<World3D focus>` inside a shot | 24–48; 10–16 px |
| 7 Light change | `light/grades.ts` cues; `<LightChange initial cues>` or `gradeAt()` + `<GradeLayer>` | ≥ 30, continuous |

The presentations are custom `@remotion/transitions` presentations, pure functions of progress, none HTML-in-canvas (so
they render on the headless shell 145). Use them with `linearTiming()`. They keep the outgoing shot opaque under the
incoming one (a double fade over a third layer dipped the seam by up to 34 levels in TOOLS_TESTS), swap while the frame
is covered (the rack crosses over its middle 28 %, both shots at 85 % of full defocus or more wherever the cross shows;
a 12 % cross read as a pop), and leave grounds out of the fades. `zoomThrough()` and `<WhipPanCut>` are kept but **reserved**, as the
treatment reserves zoom-throughs and whips.

**Ported from HyperFrames** (Apache-2.0, heygen-com/hyperframes at tag v0.8.202, read as source; the files and their
git blob hashes are in `.work/film2/hf-registry@v0.8.202/MANIFEST.json`, gitignored): `whip-pan-cut` → `<WhipPanCut>`;
`cut-the-curve` → `<CutTheCurve>`; `text-match-cut` → `<TextMatchCut>`; `light-leak` → `<LightLeak>`;
`light-sweep-pass` → `<LightSweep>` and `<TextSweep>`; `rack-focus` and `focus-rack` → `focusPull()` (focus moves in
dioptres) and the depth-of-field model in `World3D.tsx`; `grain-overlay` → `<FilmGrain>`. Each file says what changed and why (blur as travel ÷ 7 instead of
capped; no cyan gradients or neon; fromTo tweens instead of onUpdate callbacks).

## The camera language (`camera/`, §5.3)

```tsx
<World3D cam={{ pose, ref, vel }} focus={1} dofScale={14} perspective={2200}>
  <Plane kind="ground" depth={0.4}><Riverbed center={ref} /></Plane>
  <Plane kind="pebble" rect={place} tilt={{ rx, ry }}><UiImage ph={...} /></Plane>   {/* Pebble's own: may tilt */}
  <Plane kind="thirdParty" rect={place}>…</Plane>                                   {/* flat: tilting throws */}
  <Plane kind="film"><Stone at={stone} offsetFrames={n} /></Plane>
</World3D>
```

- **One world:** places on one plane; the camera travels between them. **Parallax:** `depth` (0.4 ground, 1 UI, 1.15
  near). **Tilt:** Pebble's own windows only, while travelling (`tiltForTravel()` gives a lean), flattened before
  reading; a flat plane is a 2D matrix only, so text stays crisp.
- **Depth of field:** blur ∝ |depth − focus| (the thin-lens circle of confusion is linear in 1/distance); only Pebble's
  windows and the ground defocus; `reading` forces a plane sharp. A focus pull is `focusPull()` on `focus`.
- **Motion blur:** each plane carries σ = travel ÷ 7 from its own screen velocity; the ground carries none.
  `<ForegroundMotionBlur windows>` wraps the foreground in CameraMotionBlur (8 samples, 180°) for seams and dives; inside
  it the planes switch to the hybrid's travel ÷ 55. Switch it on and off only where the camera is nearly still (it
  renders 0.5–0.94 of a frame ahead), and never around the ground, type or anything heavy: it multiplies the subtree
  eight times (see Memory below).
- **Moves:** `pushIn` (E-move from rest) and `pushInCarried` (from the current velocity) start with the shot; `pullBack`
  eases into a glide; `dolly`; `crane`; `travelTo` (a ring-led arrival with momentum that hands off to a glide ending
  on the framing); `leave` (E-leave into a cut).

## Light and depth (`light/`, §5.4)

- **Grades** (`grades.ts`): `GRADES.morning | warm | day | dusk | evening | page | night` (numbers: brightness ≤ 1 on light
  grounds so the page never clips, contrast, saturation, warmth and a tint as soft-light washes, `groundDim`, the key
  light above left, a shade-green vignette). `gradeAt(frame, initial, cues)`; `mixGrade()`; `checkLightCues()` refuses a
  step (< 30 frames) or overlapping cues; `gradeColor()` and `gradeLuminance()` model the result for the checks.
- `<GradeLayer grade>`: the CSS version (filter chain, washes, key light, vignette with eased stops). Keep type outside.
- **The LUT** (`lut.ts`): the film look (shadows lifted 2 % toward the shade green, a soft shoulder above 0.88,
  saturation −5 % in linear light), `filmCube()` / `gradeCube()`; write it with
  `bun video/src/film2/light/write-lut.ts .work/film2/pebble-film-33.cube`. **The finish in FFmpeg** (one heavy job):

  ```
  ffmpeg -i master.mp4 -vf "lut3d=file=pebble-film-33.cube:interp=tetrahedral,format=yuv420p" \
    -c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 -movflags +faststart -c:a copy graded.mp4
  ```

  The vignette stays in the render (FFmpeg's darkens toward black). Grain stays off (OVERRIDES §8 H8); if the lead keeps
  it, add `noise=alls=4:allf=t` before `format`, or `<FilmGrain on>` in the master (24 Hz, 2 %).
- `<LightLeak at frames tone>`: a code leak (port), capped well under WCAG's 10 % swing; at most once or twice, where
  light motivates it. `<LightLeakEffect>` is @remotion/effects' `lightLeak()` on a `<Solid>`.
- `<LightSweep>`, `<TextSweep>` and `<RimLight>`: motivated light on Pebble's own surfaces only. **They wait for the
  lead's ruling L3a** (PHILOSOPHY lists glow among the never-items); the demo shows them so the lead can rule.
- Shadows: `SHADOW_WINDOW` is DESIGN-LEXINGTON's `--shadow-window`, the allowance for a window inside a riverbed picture.

## Kinetic type (`type/`, §5.2)

- `<FontGate>` holds the render until Fraunces, Inter and Geist Mono have loaded (SplitText must split identical lines
  in every render tab). Put all type inside one gate, and never inside CameraMotionBlur.
- `<KineticLine text tier at exitAt? entrance? exit? sizeT? align? style>`: SplitText reveals under masks, through
  `@remotion/gsap`'s `useGsapTimeline()` (fromTo at absolute positions, no callbacks). Entrances: `lineRise` (30 frames,
  lines 8 apart: the expressive default), `wordRise`, `wordBlur` (6 → 0 px over 9 frames, words 4 apart), `lineBlur`
  (8 frames: the functional default). Exits are 40–50 % shorter: `blur`, `lift`, or `camera` (none of its own). A
  landed line is dead still.
- `<Cascade items start beats? holdLast? ui?>` and `cascadeSchedule()`: one stage, 8 out and 8 in on E-move (E-leave
  out and E-arrive in put the two fastest frames at the hand-off, which the pixel check read as a pop), each swap
  landing 2–3 frames before a beat; `checkCascade()` refuses items over four words and short holds.
- `<TextMatchCut a b at frames? mode>`: one line becomes another at the speed peak of one curve.
- `typeSizePx(tier, w, h, t)` / `typeStyle()`: 16:9 / 1:1 / 9:16 sizes at 1080 on the short side (so a half-size proxy is
  right too); `safeMarginPx()` (60 at 1080). `reading.ts`: `wordCount`, `requiredHoldS` (max(50 frames, 0.5 s + 0.3 s a
  word); key 2 s; the honest line 9 s), `readingLoad`, `earliestExit`.

## The smoothness checks (`qa/`, §5.5)

A lane describes its stretch as a `FilmTimelineQa` (`qa/timeline.ts`): shots with their cameras (frames local to the
shot), seams with their kind, lines with their rects, readable UI with its words (and `receipt: true`), rings and the
pose of their plane, light cues, hits, waiting states, acts. `checkAll(timeline, moves)` runs:

| Check | Enforces |
|---|---|
| `cutRate` | ≤ 18 shot changes a minute in any act |
| `holds` | the hold formula, key lines, the honest line, promise + limit together ≥ 2.5 s, UI shots ≥ 2 s, the 130-word budget |
| `readingLoads` | ≤ 3.14 words a second per shot (3.0 flags) |
| `velocityContinuity` | ≤ 30 px a frame² between frames (60 fps), outside marked hits |
| `cutAudit` | at hard cuts: speeds within ±25 %, directions within 30°, no cut between two rests; transitions swap while covered |
| `blurAudit` | σ ≥ 0.8 × travel ÷ 7 above the reading speed |
| `deadFrames` | no 1 s in which the picture moves less than 12 px (at 1080) with nothing else changing, outside waiting states (model) |
| `flashes` | light changes continuous, ≤ 1 large change a second, ≤ 3 flashes a second |
| `rings` | one ring chapter in flight; never across a line being read; front rings never across readable UI; never around a receipt |
| `timing`, `kinds`, `leaks`, `copy` | §5.1's frame ranges; which kinds appear; leaks ≤ 2; the never-list |

Use it in a test (`tests/qa.test.ts` shows the pattern, with a planted canary for every check):

```ts
import { expect, test } from "bun:test";
import { checkAll } from "../qa/checks";
test("the Drop is smooth", () => expect(checkAll(dropTimeline(), dropMoves).errors).toEqual([]));
```

On a render, `qa/luma-scan.ts` (FFmpeg: a heavy job) decodes 192 × 108 grey frames and runs `analyseLuma()`: WCAG
flashes per 2.8 % tile and for the whole frame; dead windows, measured across each whole second (frame-to-frame
differences cannot see a drift too slow for the eye); pops away from cuts; and luma dips at seams. The model and the
pixel check agree on the demo: both flagged its first reading holds as stills (a drift of 0.05–0.1 px a frame), and
both pass since the holds drift about 0.3 px a frame (§5.3 allows up to 1).

## The compositions (folder "Film2" in Studio)

| Id | What |
|---|---|
| `F2-Foundation-Demo` | the demo reel, 28 s, 1920 × 1080, 60 fps: every kind, a ring leading a push-in, type reveals, five grades (S2 is the companion minimized to its pebble at a place east of S1, so the take's later frames, with their usage line, never show) |
| `F2-Foundation-Ports` | 10 s lab of the ported HyperFrames moves, the reserved zoom-through and a code leak |
| `F2-Foundation-Grades` | one frame per grade (seven), for a contact sheet |
| `F2-Type-16x9`, `F2-Type-1x1`, `F2-Type-9x16` | the type scale per aspect, with the safe margin and Act I's aperture drawn |

Check, render and look (from the repo root, after `source scripts/env.sh`; renders only through heavy.sh, one at a
time, never while `.work/HOLD` exists):

```
bun video/src/film2/qa/check-demo.ts
bun test video/src/film2
scripts/heavy.sh f2-demo /usr/sbin/taskpolicy -c utility \
  bash video/src/film2/render/render-segments.sh F2-Foundation-Demo .work/film2/demo 1680 480 0.5
scripts/heavy.sh f2-sheets /usr/sbin/taskpolicy -c utility \
  bash video/src/film2/render/sheets.sh .work/film2/demo/F2-Foundation-Demo.mp4 .work/film2/look 30 350,994,1364
scripts/heavy.sh f2-luma /usr/sbin/taskpolicy -c utility \
  bun video/src/film2/qa/luma-scan.ts .work/film2/demo/F2-Foundation-Demo.mp4 --fps 60 --cuts 350,994,1364
```

`render-segments.sh` renders ≤ 480-frame segments on the headless shell 145 (`--chrome-mode=headless-shell --gl=angle
--concurrency=2`), checks free disk before each against 2 × the largest drop it measured plus the 2 GiB floor, logs the
lowest free disk per segment (`render-log.tsv`), and joins with the concat demuxer. Scenes that use HTML-in-canvas
presentations need Chrome ≥ 149 and are out of its scope.

**Memory.** A render that pushes this 8 GB Mac into swap makes macOS add a 1 GiB swap file on the same disk. Measured
on 26 Oct: a 60-frame test with CameraMotionBlur wrapped round the whole world (three riverbed copies for the ripple,
times eight samples) took free disk from 2.72 to 1.57 GiB that way. Hence the demo's split into a ground world and a
foreground world, with the camera blur on the foreground only, at the cut, for 18–24 frames.

## How the set-piece lane uses this

1. **Write the shot as data first** (a `timeline.ts` beside the scene, like `demo/timeline.ts`): places in world units,
   one `VelocityCamera` per shot built with `camera/moves.ts`, `momentumCut()` at every hard cut, `RingSpec`s for the
   carrier, `LightCue`s, `TextEvent`s with rects, readable UI with its words. Fit the frames to `map.json` once the music
   is locked (TREATMENT §4.7): section changes on downbeats; cascades' swaps 2–3 frames before beats (pass `beats`).
2. **Check it before drawing anything**: a Bun test that calls `checkAll()`; fix every error at the data level.
3. **Draw it** with `World3D` and `Plane`s (Pebble's windows `kind="pebble"`, everything else flat), the ground in a
   `RippleGround`, rings in `RingLayer`s, the stone with `PebbleOnFilm` (Pebble's own poses, cues in a `*.cues.ts` file
   so the engine tests check them), takes with `RecordedTake` at 1×, type in one `FontGate` outside the grade, the light
   with `gradeAt()` + `GradeLayer`, seams in a `TransitionSeries` with these presentations.
4. **The Drop** (S06–S07): a `burst` ring from the stone on the entrance's downbeat, `Aperture` opened with it,
   `warm` light over ≥ 30 frames, `pullBack()` into a glide, the browser recording kept at 1× inside the composite.
5. **A ring chapter** (S08–S18): `emit` → `frame` the ask (the ring leads; `travelTo()` follows 10–14 frames behind) →
   the camera dollies in to reading magnification (UI text ≥ 28 px at 1080) → the receipt lands → `return` to the stone.
   Never `frame` a receipt (the checks refuse it).
6. **Cascades** (S10, S14, S17, S19): `<Cascade>` for the item, `cascadeSchedule()` for the UI cards' swaps.
7. **The convergence** (S25): one spec with `appear` → `return`, `echoes` and `echoMode: "all"`.
8. **Render** in segments at half size for review, look at the sheets and seam strips, run `luma-scan`; then masters.

## The set pieces (`setpieces/`)

The lane's six set pieces, each a **plan** (pure data: `setpieces/scene.ts` `ScenePlan`) that one component draws
(`setpieces/views/PieceView.tsx`) and the checks read (`setpieces/qa.ts`), so the picture and the validators never
disagree. Every frame in a plan is the piece's LOCAL frame; put the piece in a `<Sequence from={start}>` and give its
plan the music in local frames (`shiftGrid(grid, −start)`). Every piece is framed on its own in 16:9, 1:1 and 9:16
(§3.12): pass `w`, `h` and the plan lays itself out for that aspect.

| File | What |
|---|---|
| `music.ts` | the music grid: `steadyGrid()`, `gridFromMap()` (a `map.json` stretch), `shiftGrid()`, `place()`, `nextPoint()`, `prevPoint()`, `halfBars()`, `leadFrames()` |
| `take.ts` | takes at 1×: `TakeManifest` (events, views), `solveInPoint()`, `eventFrame()`, `checkTakeUse()`; the placeholder manifests RS-9, HS-F, RS-W, HS-B3, RS-13 |
| `standins.ts` | the PLACEHOLDERS: published stills (`STILL`), labelled slots (`SLOT`), the wall's 28 cells (`CELL_SOURCES`) |
| `world.ts` | the composed world per aspect (browser, companion, Calculator, Finder, the project, the Toolbox; the stone) |
| `scene.ts`, `kit.ts`, `frame.ts` | the plan model; type events, anchored cues, ring-clear frames; framing, line breaking, type timing |
| `drop.ts`, `ringBlock.ts` + `rings.ts`, `wall.ts`, `dusk.ts`, `climax.ts`, `finale.ts` | the six plans |
| `sweep.ts` | the title's sage sweep and its 15 % cap (L3a) |
| `pieces.cues.ts` | the stone's cue templates (checked by the engine tests, D6) |
| `qa.ts` | `planQa()` (a plan as the foundation's `FilmTimelineQa`) and `checkPlan()` (every foundation check, plus the set pieces': band contrast, takes, type in the safe area, type over UI being read (an error), type over any other UI plane (a warning; over a slot, a note to check the 2.0.0 capture), UI read size, UI read wholly in frame, music placement, cues, the wall, small print) |
| `align.ts` | one timeline for all three aspects: `alignAspects()` and `timelineDiffs()` |
| `views/` | `PieceView`, `ShotView`, `TypeView`, `StandInViews` (stills, slots with a ticking source time, take views), `VeilCast`, `SageSweep`, `WallView` |
| `demo/` | the demo reels and the measured stretches they are fitted to (`grids.ts`) |
| `tools/make-cells.ts` | makes the wall's cell thumbnails into `video/public/ui/f2-cells` (gitignored) |

**The music rule (lead ruling L3d) is in every plan.** An event is placed with `place(earliest, grid, { level, frames,
lead })`: its first readable frame lands on the first point of `level` (beat, half bar, bar, phrase) at or after the
earliest frame its reading allows, and a transition completes `lead` frames (2–3 at 60 fps) before it. Nothing is ever
placed earlier: a hold is never shortened to land a cut; the music is edited at bar lines instead. Each plan reports
where its events landed (`plan.music`: event, frame, point, level, frames waited), and `checkPlan(plan, grid)` checks
every point. Only marked hits snap (the Drop's burst; the title's downbeat is where the wordmark lands).

**One timeline for all three aspects (§3.12).** A piece's framing can move a timed event in one aspect (a line that
breaks in two lands later; a ring clears a line's band later), so plan pieces with `alignAspects((aspect, align) =>
planX({ ..., align }))`: it plans every aspect, takes the latest frame of each timed event (`plan.extra.timing`: line
landings, receipts, cuts, ends), and plans again with those as minimums. Every aspect then cuts, lands and ends on the
same frames, and `timelineDiffs()` proves it (tested on the demo and on random grids). Only framing and the entrance
starts of lines that break differently may differ.

**Takes never speed up.** A take's in-point is solved so its event lands on its beat (`solveInPoint`); the take then
plays at 1× from its first shown frame. One recording may feed several planes (a view each: RS-9 is the companion's card
and the browser), all on one clock. Until the 2.0.0 takes exist the views are published stills or labelled slots, and a
slot shows the take's source time ticking at 1× (`src 0:09.40 · 1×`), so the in-points can be seen on the reel.

### 1. The Drop — `planDrop({ w, h, fps, hit, grid?, take?, lines?, apertureCenterY?, band? })`

`hit` is the track's entrance (a local frame): the person's Allow lands on it (RS-9's in-point is solved), a ring bursts
from the stone (E-arrive: the Drop's one snap), the frame opens with it from the narrow aperture (16:9 from 2.39:1, 1:1
from 16:9, 9:16 from 4:5) over 34 frames from the frame the ring reaches its edge, the light warms over 60 frames, one
code light leak plays (one of the film's two). "Now it works across your Mac." and "Where you allow it." each land on a
beat once the burst has left their rect, and are held together (3.6 s and ≥ 3.0 s: the reference's 4.8 and 4.3 s would
still be on screen when the reveal ring passes them). At hit + 4 s the camera pulls back in log space to the whole Mac
(160 frames) and glides toward the browser; a second ring travels out through the world and each dimmed place lifts into
light as it passes. The piece ends on the next phrase line at least 7.5 s after the hit (up to 4 s later), else a bar
line. The frames before `hit` are the pre-roll: the companion's card waiting in the aperture, and S05's lead-in line
(L04) in a band on the night green, gone before the burst could reach it (`lines.leadIn: null` drops it; it needs about
150 frames of pre-roll). **To fit it:** start the piece `hit` frames before the entrance's downbeat; its `exit` (pose and
velocity) continues into Ring 1 in the same world without a cut.

### 2. A ring block — `planRingBlock({ w, h, fps, content, grid?, entry? })` with `RingContent` (`rings.ts`)

`content` names the place: the stone, the context planes, the **ask** the ring frames (a still or slot, its must-read
words and text size), the **act** (a take, its view and rect, its start event), the **receipt** (the take's event that
lands on a beat, where it shows, its words) and up to three lines (`lines.chapter` and its `limit`), then the
**cascade** (`fixed` line and 2–6 items of four words or fewer, each with its UI card). Local frame 0 is the ring's
start: put it on a phrase downbeat. A fresh block opens on the companion (`startRect`), so the ring is seen to leave the
stone; the ring travels to the place and frames the ask; the camera follows 24 frames behind and arrives with momentum
(a long journey bows out in zoom halfway, paced by the frame's half-diagonal so its corners never pass 30 px a frame,
tested for every demo shot; the momentum cuts leave over 118 px, 28 px a frame at the cut); the lines land
on beats once no ring crosses them and leave before the camera moves in (the held ring grows with the zoom); the camera
dollies in to reading size (≥ 28 px at 1080, ≤ 2.4×); the take's receipt event lands on a beat after the ask and the act
have been read, and the ring returns to the stone on that beat; the camera glides to the receipt (no freeze, no mark, no
hit) and holds it for its reading time; a momentum cut on a bar line takes it to the cascade's stage, whose swaps land
2–3 frames before beats; the block ends on the bar line after the last item's hold. `entry` continues a previous piece's
camera (the same world). **To fit it:** start
it on a phrase downbeat, pass the grid; if its length (`plan.duration`) is longer than the phrase you have, lengthen the
music at a bar line or move the block (§3.2: never a hold).

### 3. The wall — `planWall({ w, h, fps, grid?, centre?, entry?, minS? })`

The 28 cells (inner 8, middle 8, outer 12; no Stealth cell, checked) on three concentric rings around the stone, orbiting
slowly in alternate directions (≤ 1.6° a second), each at 1× or still (the placeholders are still). The camera pulls back
in log space from the inner ring to the whole wall (150 frames) and drifts on; in 9:16 the rings are cropped by the frame
on purpose. Every cell's text stays under 16 px at 1080 on every frame (checked): seen, not read. It ends on a bar line.
**To fit it:** start it on a bar line; its `exit` hands the camera to the convergence.

### 4. The Dusk passage — `planDusk({ w, h, fps, grid?, focusLine? })`

⌘K (HS-B3: its Enter is solved onto a beat; the palette fades in, a placeholder of its own entrance; the typed word and
the lit row read at ≥ 28 px), a slow push-in and the
light cooling to dusk over 6.1 s (day to dusk is 0.33 of luminance and the film allows one large change a second); a rack
focus into the Veil rendered with Pebble's own code (`views/VeilCast.tsx`: `stealthVeil.ts` and `veilDraw()`, the
1.25-s cast), with "A render, not a screen recording." beside it from the rack's cross to the cut; a momentum cut on a bar
line into a crane over RS-13 (the Dock icon leaves on a beat; the crane arrives on the menu-bar icon's new state). The
honest line, word for word from `STEALTH_HONEST`, holds from the rack's first frame (just after the Enter, as the palette
defocuses under it) to the passage's end (≥ 12 s, across the rack and the cut; it needs 9). The crane frames the Dock and
the menu bar above the line's band; the Dock is marked `textless` (icons), so the line may pass over it. No leak, sweep or rim in the passage; L23 (the focus line) only with
`focusLine: { text, releaseNotesConfirmed: true }`, default out. **To fit it:** start it on the quiet section's first
downbeat; it ends on a bar line.

### 5. The climax shell — `planClimax({ w, h, fps, peak, grid?, take?, entry? })`

S23 ("Glaze"): the ask card arrives (the shared entrance, a placeholder of the recording's own), readable from its first
frame, a carried push-in, "Its own tools." on a beat. A momentum cut on the last beat at least 0.75 s before `peak` (so
the card lands 0.75–1.25 s into the take, §3.6 chain 11) into S24 ("Kiln"): RS-W's in-point is solved so the kept card
lands exactly on `peak`; the avatar turns happy on the take's own event; the camera glides through the landing (never
still, tested) and then pushes in until the whole card, Remove included, reads at ≥ 28 px; "Kept on its own only after an
independent check." lands on a beat beside it and holds 6.5 s. The take's frames fill the slot from a frame sequence
(`TakeManifest.pattern`, views cropped from it) as soon as RS-W is recorded. **To fit it:** `peak` is the peak's first
strong downbeat in local frames; the piece needs about 3.5 s before it.

### 6. The convergence, the title and the end card — `planFinale({ w, h, fps, hit, grid?, lastNote?, decayS?, roomToneS?, musicCredit?, centre?, entry? })`

The wall's cells travel inward along their rings and shrink into the stone (E-leave, accelerating) while rings return to
the stone in a train and the camera pushes in; the light goes from evening to the page; a ring iris on E-move (30 frames,
the lead's ruling) opens the sage-white page from the stone; "Pebble" and "2.0" rise to land ON `hit` (the final strong
downbeat), the stone at rest beside them; one sage sweep crosses the wordmark 1 frame after it (`SageTextSweep`: inside
the glyphs only, its alpha capped so their L* rises by at most 15, tested); the README's line rises beneath. Page 1: the
facts rise from masks 8 frames apart at one size, each limit beside its promise, landing on `lastNote` (the track's last
strong note); page 2: "Shown with sample data.", the method line (L4: "Real Pebble 2.0 screens, composed in one space.
Nothing Pebble does is sped up.") and the small print, with the music credit. The piece ends after the ending's decay and
0.5–1 s of room tone. **To fit it:** start it where the wall ends; `hit` at least ~4 s in; time the track's real ending
back so its last strong note lands on `lastNote` (a splice at a real stop, never a fade).

### The demo and the checks

`F2-SetPieces-Demo` (16:9), `F2-SetPieces-Demo-1x1` and `-9x16` play the six pieces in the film's order, each fitted to
a real measured stretch of an audition track (`demo/grids.ts`, from the score lane's maps: no audio is used), with a slate
on every frame saying the UI is a placeholder. `F2-SP-<piece>-<aspect>` renders one piece. `bun test video/src/film2`
runs `checkPlan()` on every piece in every aspect, for the demo's stretches and for random tempos and hit times.

```
bun test video/src/film2
bun video/src/film2/setpieces/tools/check-setpieces.ts [16:9|1:1|9:16] [--verbose]   # every check, and the music report
bun video/src/film2/setpieces/tools/reel-marks.ts 16:9                               # cuts and still holds, for the sheets
/usr/sbin/taskpolicy -c utility bun video/src/film2/setpieces/tools/make-cells.ts    # once: the wall's thumbnails
scripts/heavy.sh f2-sp-demo16 /usr/sbin/taskpolicy -c utility \
  bash video/src/film2/render/render-segments.sh F2-SetPieces-Demo .work/film2/sp/demo16 5692 480 0.5
```

**What the demo shows (26 Oct, half size, 60 fps, 5,702 frames each; gitignored evidence in `.work/film2/sp/`).**
16:9, 1:1 and 9:16 rendered in 185–187 s each through heavy.sh (segments of 480 frames; free disk moved by at most
43 MiB a segment); all three pass the pixel checks (`qa/luma-scan.ts`): no pops away from cuts, no dead second, no dip at
a seam, at most one flash a second. Sheets and seam strips (`look/sheet.jpg`, `look/seam-<frame>.jpg`) were looked at, and fixed where
they showed a fault: multi-line type running as one line (SplitText), a line outliving its shot, an empty cascade
stage after the cut, a card popping in at a take's start, two stones at the title's iris, a palette thrown in too fast.
The model checks (`check-setpieces.ts`) pass in every aspect, with only notes where type crosses a slot, to check on the
2.0.0 captures.

**Placeholders.** Every picture of Pebble in the set pieces is a real capture of a published release (1.0.x–1.5.0,
cropped, never stretched, never showing a usage or timing line) or a labelled slot for what has no published capture
(the browser take, Apple's apps, the Workshop's cards, ⌘K, the menu bar, the agents panel). Nothing is drawn Pebble UI,
and nothing may be presented as 2.0.0. The 2.0.0 captures replace them through the manifests (`take.ts`) and
`standins.ts`; the plans do not change.

## The lead's rulings (OVERRIDES §52), as decided and as built

- **L2, the frame rate: 60 fps.** Every master and cut renders natively at 60 fps in all three aspects; review proxies
  render natively at 30 fps at quarter size; a 60 fps master is never decimated. Everything is written at 60 fps and
  converts with `f60()` (the set pieces' tests run at 60; their timings convert).
- **L3a, motivated light, narrowly.** `RimLight` and `LightSweep` only on Pebble's own windows while they travel or turn,
  at most an 8 % luminance lift with a soft falloff, never on receipts, third-party or Apple windows, reading holds or the
  honest line (the set pieces use neither). `TextSweep` once, at the title, as the converging rings arrive: in sage,
  inside the glyphs, at most 15 % (built as `setpieces/views/SageSweep.tsx`; the foundation's white `TextSweep` is not
  used). The ripple's crest highlight as built. Light leaks at most twice in the hero film, where the light changes (the
  Drop's warming is one).
- **L3b:** the composed whole Mac at the Drop (one moving task, the other places as dimmed stills lifting into light) and
  the wall are the two departures from one moment per frame; the wall's cells play at 1× or hold still.
- **L3c:** the ground is the page's riverbed under still water, through every grade.
- **L3d:** every cut has a musical cause (above: `place()`); reading holds are never shortened; only hits snap.
- **L4, the method line**, after "Shown with sample data.": "Real Pebble 2.0 screens, composed in one space. Nothing
  Pebble does is sped up." (`setpieces/finale.ts`). It holds only while §3.6's time rules hold (`checkTakeUse`).
- **The ring iris between places:** E-move over 24–36 frames with the outgoing shot still drifting (`ringIris({ ease:
  "move" })`, added for the ruling); E-arrive's burst only on the Drop and on hits the cue marks.
- **Act I's aperture bands:** opaque night green (`COLOR.nightPage`), never black; the set pieces' check measures
  11.8:1 against the riverbed's edge under the morning grade (at least 3:1), and the Drop's demo sheet shows the
  2.39:1 frame at 320 px.
- **Grain** stays off.
- **The 3D pebble reveal: not built** (the set-piece lane's call). The stone is Pebble's own 2D character engine (bloub)
  everywhere, so a 3D pebble would be a look Pebble does not have; @remotion/three is not added and the GPU test is not
  needed.
- **Never wrap the whole world in CameraMotionBlur.** The set pieces use it only on the foreground at a momentum cut's
  first 16–20 frames.
- **The card entrance** (§5.1's shared ask entrance) is the film's framing of the card arriving; on the 2.0.0 captures it
  is used only where the recording shows Pebble's card arriving the same way (every use in the set pieces is a
  placeholder of the recording's own arrival).
