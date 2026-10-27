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
| `qa/` | `timeline.ts` (the model the checks read), `checks.ts`, `luma.ts` + `luma-scan.ts` (pixel checks on a render), `ink.ts`, `stones.ts`, `bands.ts` (render checks added after the craft review), `check-demo.ts` |
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
| 1 The ring (iris, mask, hairline) | the ring phases above; `ringIris({ center, featherPx, startRadiusPx, ease })` for a seam: `ease` is `"move"` by default (an iris between places, E-move, lead ruling §52); `"arrive"` only on a seam that declares one of the cue's marked hits (`qa/checks.ts` irisEase refuses it otherwise, CR-21) | iris 20–36 (E-move 24–36), burst 60–90 |
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
  grounds so the page never clips, contrast, saturation, warmth and a tint as soft-light washes, the key light above
  left, a shade-green vignette) and, since the craft review (CR-14), **the light in the ground**: `ground`, linear-light
  gains on the riverbed alone (warm `[1.12, 0.985, 0.8]`, dusk `[0.7, 0.74, 0.9]`, evening `[1.04, 0.9, 0.72]`), and `ui`,
  a few per cent of the same light on the windows, so the UI keeps its own colours. A 14 % soft-light wash barely moved
  the near-white ground ("warm" measured cooler than day); gains in linear light do. `gradeAt(frame, initial, cues)`;
  `mixGrade()`; `checkLightCues()` refuses a step (< 30 frames) or overlapping cues; `gradeColor()`, `groundSample()` and
  `gradeLuminance()` model the result; `modelArc()` and `lightArcProblems()` hold the arc to the lead's targets (warm and
  evening +10 levels R − B on day, dusk 10 % darker and bluer, evening slightly darker, neighbours ΔE ≥ 5), on the model
  and, through `setpieces/tools/ground-light.ts`, on a render's ground pixels.
- `<GradeLayer grade>`: the CSS version (filter chain, washes, key light, vignette with eased stops). Keep type outside.
  `<GroundLight gains>` is the gains as an SVG colour matrix in linearRGB (`setpieces/views/PieceView.tsx` wraps the
  ground world in the `ground` gains and the foreground world in the `ui` gains).
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
- `<KineticLine text tier at exitAt? entrance? exit? sizeT? align? style exitFrames? blockWords?>`: SplitText reveals
  under masks, through `@remotion/gsap`'s `useGsapTimeline()` (fromTo at absolute positions, no callbacks). Entrances:
  `lineRise` (30 frames, lines 8 apart: the expressive default), `wordRise`, `wordBlur` (6 → 0 px over 9 frames, words 4
  apart), `lineBlur` (8 frames: the functional default). Exits are 40–50 % shorter and never under 10 frames
  (`type/exits.ts`, CR-03): `blur` (words blur to 8 px and fade, leading with the first, each over 60 % of the exit on
  power2.in), `lift` (to −140 % on E-leave, faded by 85 % of it), or `camera` (none of its own: the line is set in the
  world and leaves with it). A block of 12 words or more (`blockWords`, the whole spec's) blurs out over 14 frames, each
  word over 70 % of it on power1.in: at 12 frames on power2.in the honest line let 37 % of a word's ink go in one frame,
  a tile step of 3.6 levels on the 9:16 reel. A landed line is dead still.
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
| `standins.ts` | the PLACEHOLDERS: published stills (`STILL`), labelled slots (`SLOT`, each label at its `focus`, laid out by `slotLabelLayout()` for the view and the checks alike), the wall's 28 cells (`CELL_SOURCES`) |
| `world.ts` | the composed world per aspect (browser, companion, Calculator, Finder, the project, the Toolbox; the stone) |
| `scene.ts`, `kit.ts`, `frame.ts` | the plan model; type events, anchored cues, ring-clear frames; framing, line breaking, type timing |
| `drop.ts`, `ringBlock.ts` + `rings.ts`, `wall.ts`, `dusk.ts`, `climax.ts`, `finale.ts` | the six plans |
| `coda.ts`, `codaChecks.ts`, `coda.cues.ts` | the post-credit scene after the end card (D157, OVERRIDES §62), its checks and its stone's cues; drawn by `views/CodaView.tsx` |
| `sweep.ts` | the title's sage sweep and its 15 % cap (L3a) |
| `pieces.cues.ts` | the stone's cue templates (checked by the engine tests, D6) |
| `qa.ts` | `planQa()` (a plan as the foundation's `FilmTimelineQa`) and `checkPlan()` (every foundation check, plus the set pieces': band contrast, takes, type in the safe area, type over UI being read (an error), type over any other UI plane (a warning; over a slot, a note to check the 2.0.0 capture), UI read size, UI read wholly in frame, music placement, cues, the wall, small print; the checks added after the craft review, below; and fix round 1's `slotLabels`: a frame of slots always shows a slot's label whole, a read slot its own) |
| `ground.ts`, `review-ledger.ts` | the riverbed's extent and depth, sized from each shot's widest pose and shared by the view and the coverage check (CR-02); the open findings of the craft review, and the ones fix round 1 closed |
| `joins.ts` | the joins between pieces (CR-06): `cutVelocity()`, `shareGround()`, `checkJoins()` (continued worlds continuous, cuts velocity-matched and never between rests, each piece readable within 6 frames) |
| `align.ts` | one timeline for all three aspects: `alignAspects()` and `timelineDiffs()` |
| `views/` | `PieceView`, `ShotView`, `TypeView`, `StandInViews` (stills, slots with a ticking source time, take views), `VeilCast`, `SageSweep`, `WallView` |
| `demo/` | the demo reels and the measured stretches they are fitted to (`grids.ts`) |
| `tools/make-cells.ts` | makes the wall's cell thumbnails into `video/public/ui/f2-cells` (gitignored) |
| `tools/ground-light.ts` | the light arc on a render (CR-14): the median of the ground's pixels per section, held to `lightArcProblems()` (a heavy job) |

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
plays at 1× from its first shown frame. A recorded take is conformed to 60 fps by its timestamps only, and
`checkTakeManifest()` refuses one whose conform record is missing, made any other way (an input-side `-r`, `setpts`),
whose durations differ by more than a frame, or whose events sit more than a frame off their wall-clock times
(CR-12; `.work/real-takes/RUNBOOK.md` §6.2.1); `checkPlan()` runs it on every take a plan uses. One recording may feed several planes (a view each: RS-9 is the companion's card
and the browser), all on one clock. Until the 2.0.0 takes exist the views are published stills or labelled slots, and a
slot shows the take's source time ticking at 1× (`src 0:09.40 · 1×`), so the in-points can be seen on the reel.

### 1. The Drop — `planDrop({ w, h, fps, hit, grid?, take?, lines?, apertureCenterY?, band? })`

`hit` is the track's entrance (a local frame): the person's Allow lands on it (RS-9's in-point is solved), a ring bursts
from the stone (E-arrive: the Drop's one snap), and the frame opens **on the hit's next frame in every aspect** (16:9 from
2.39:1, 1:1 from 16:9, 9:16 from 4:5; CR-07: it used to wait for the ring to reach the edge, 24 frames late in 9:16) over
34 frames on power2.out, leading the ring out; the light warms over 60 frames; one code light leak plays (one of the
film's two) once the bands have cleared, never over them. The frames before `hit` are the pre-roll: the card the Allow
answers is **read in the aperture at 28 px or more** (12 words declared; CR-09), pushing in and drifting up through the
room the aperture leaves it (a pre-roll longer than the read can glide comes in from wider first), with S05's lead-in
line (L04) in a band on the night green, gone before the bands move (`lines.leadIn: null` drops it; it needs about 150
frames of pre-roll); where the aperture leaves the card no room to rise (1:1's 16:9 aperture) it drifts sideways too, so
the card itself moves at `READ_DRIFT_PX` (0.36) or more. The companion is RS-9's own view (CR-11, CR-18): a slot
holding its card until the receipt, then a real 1.0.x frame of it at work, switched in with a hard cut on the event.
The camera hands off to the opened framing as the frame opens and drifts out through "Now it works across your Mac."
and "Where you allow it.", **panning at `HOLD_PAN_PX` (0.42 px a frame) the way the reveal's glide then goes** (fix
round 2, the verifier's CR-04: the pull-back about the companion alone moved the frame's corners 0.4–0.6 px a frame
while the companion, the frame's subject, moved 0.04–0.09; the content now moves 0.33–0.57), each line landing on a
beat once the burst has left its rect and the bands have cleared, held together (3.6 s and ≥ 3.0 s), then lifting out
through their masks as they rose, the promise's lines first and the limit after (type leaves the way it came). At hit + 4 s, or
as the pair's exit starts if that is later (so the pull-back never brings a capture under a line still read), the
camera pulls back in log space to the whole Mac, composed dense
(`world.ts`: the browser, the project and the Toolbox at 25–40 % of the frame's width at the wide, overlapping, the
context windows at their own parallax depths; CR-16; in 9:16 the Toolbox sits below the pair's band and the Finder right
of the held card, fix round 2's NF-05) and glides toward the browser; a second ring travels out through
the world and each dimmed place lifts into light as it passes. The piece ends on the next phrase line at least 7.5 s
after the hit (up to 4 s later), else a bar line. **To fit it:** start the piece `hit` frames before the entrance's
downbeat; its `exit` (pose, velocity, riverbed and light) continues into Ring 1 in the same world without a cut.

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
camera (the same world: the demo's Ring 4 continues the Drop's). **Every plane of the place is a view of one take, on
one clock** (CR-11): the window, the ask, the act and the receipt inside it, each cropped at a line boundary and framed
whole while its text is legible (CR-05), every legible word counted. **The ask is a decision** (fix round 2, the
verifier's NF-01: the ask beat framed only the history's sentence, so no decision was ever framed): with
`ask.asking`, the take rolls from the card asking and a first dolly frames it whole with its buttons, its text kept
under `SEEN_TEXT_PX` (17 px: seen, not read; its 43 words at reading size would ask 3.9 words a second of the shot),
for at least `SEEN_S` before the person's click; on the click the view switches with a hard cut to its answered
sentence, and a second dolly brings that sentence, then the act, to 28 px; the receipt lands Pebble's own time after
the click (it may land while the act is still read: the camera then glides down to it); Ring 4's receipt is its
Verified line (H6, S18), the reply's list below it left out (its 41 words would take the shot past 3.14 words a
second). The chapter pair lands once no capture with text sits under its band for its whole hold
(`kit.ts planesClearFrame`; in 1:1 and 9:16 it keeps to the frame's left, in 9:16 in the top band, the place arriving
in the frame's lower part so the camera never turns back up). The reading holds glide (0.4 px a frame); the stage is
entered on a glide at the cut's speed (never landing at rest) and pans at the reading pace; the swaps cross at
mid-blur with a short matched slide, so the stage never empties (CR-17); on the stage's E-leave the fixed line lifts out
through its mask and the last item blurs out, each the way it came, both gone before the cut (CR-03). The chapter line
lifts out through its mask too, and the limit blurs out. **To fit it:** start it on a phrase downbeat, pass the grid; if its length (`plan.duration`) is longer than
the phrase you have, lengthen the music at a bar line or move the block (§3.2: never a hold).

### 3. The wall — `planWall({ w, h, fps, grid?, centre?, entry?, minS? })`

The 28 cells (inner 8, middle 8, outer 12; no Stealth cell, checked) on three concentric rings around the stone, orbiting
slowly in alternate directions (≤ 1.6° a second), each at 1× or still (the placeholders are still). The camera pulls back
in log space from the inner ring to the whole wall (150 frames) and drifts on; in 9:16 the rings are cropped by the frame
on purpose. Every cell's text stays under 16 px at 1080 on every frame (checked): seen, not read. It ends on a bar line.
**To fit it:** start it on a bar line; its `exit` hands the camera to the convergence.

### 4. The Dusk passage — `planDusk({ w, h, fps, grid?, focusLine? })`

The passage opens **on HS-B3's own frame of the workspace** (CR-06: it opened on bare ground), entered with the previous
piece's momentum and pushing on (`cutIn`); ⌘K (its Enter solved onto a beat; the palette's own entrance, a placeholder;
the typed word and the lit row read at ≥ 28 px) and the light cooling to dusk over 6.1 s; a rack focus into the Veil
rendered with Pebble's own code (`views/VeilCast.tsx`: `stealthVeil.ts` and `veilDraw()`, the 1.25-s cast), **in macro:
its body 47 % of the frame's height (42 % in 1:1), pushing in and orbiting at `VEIL_ORBIT_PX` (0.36 px a frame)
through its framing** (CR-19: it filled 19 % of the width; fix round 2: at a 0.12 px orbit the render, the frame's
subject, moved 0.14), with "A render, not a screen recording." **under it, right-aligned with its body's right edge**,
set in the render's world (`TypeSpec.carry`): on screen exactly as long as the render, kept in the safe area while it
is read; the camera carries both out of the frame's left edge (in every aspect) and they leave on the same frame, the
cut 2 frames later (fix round 2, the verifier's NF-03: set beside the render on the right, the label was the last
thing out and labelled bare ground for 24 frames, then 6 frames of ground before the cut). The palette's push pans
the way the cut came in, and the workspace hands its slot's label to the palette's as the palette opens over it
(`TakeView.labelOut`: NF-08, the two labels were drawn one over the other). A momentum cut on a bar line into RS-13 (the Dock icon leaves on a beat), a crane up that
starts late enough to cut, on a beat, while the Dock is still in frame and clear of the honest line's band (CR-19: the
crane passed empty ground, the empty middle is skipped), into its last stretch at 3.5× on the menu-bar icon's new
state (77 px at 1080). The honest line, word for word from `STEALTH_HONEST`, holds from the rack's first frame to the
passage's end (≥ 12 s across the rack and both cuts; it needs 9). No leak, sweep or rim in the passage; L23 (the focus
line) only with `focusLine: { text, releaseNotesConfirmed: true }`, default out. **To fit it:** start it on the quiet
section's first downbeat; it ends on a bar line, the menu bar drifting right and leaving on an E-leave to the right,
the way the climax then glides (fix round 2: a leave to the left turned the climax's content back through a stop).

### 5. The climax shell — `planClimax({ w, h, fps, peak, grid?, take?, entry? })`

S23 ("Glaze") **opens on its take** (CR-06: it opened on 16 frames of its slot): HS-G's ask card is 4 frames into its
entrance on the cut, entered with the previous piece's momentum, gliding into a pan at 0.45 px a frame with a slight
push; "Its own tools." lands on a beat and lifts out through its mask, as it rose, over before the cut (CR-03: its "camera" exit
drew nothing). A momentum cut on the last beat at least 0.75 s before `peak` (so the card lands 0.75–1.25 s into the
take, §3.6 chain 11) into S24 ("Kiln"): RS-W's in-point is solved so the kept card lands exactly on `peak`; the avatar
turns happy on the take's own event. **The climax's content travels one way** (`travel`: right in 16:9, down in 1:1
and 9:16, away from the lines; fix round 2, the verifier's NF-02: the Kiln hold moved left, stopped, drifted right
70 px, stopped and panned left again): the ask's pan, the cut, the incoming glide that decays the cut's speed straight
into the hold's pan (`KEPT_PAN_PX`, 0.42), the push-in for reading (about the card's trailing edge, so that edge keeps
the pan's pace) and the hold's own glide to its E-leave, the same way again (CR-04: it froze for 6.2 s on the card).
The Kiln slot's label sits under where the card lands, where the cut's first frames look, so the cut into the peak
reads at once (NF-07: it landed on 62 frames of unlabelled hatching). "Kept on its own only after an independent check." lands on a beat beside it and holds 6.5 s. The
Workshop's cards are labelled slots at the 2.0.0 cards' sizes (the 1.0.x approval and command cards stood in, with 82
and 78 legible words of other states; CR-05); a view that shows nothing yet draws nothing (no card-shaped box before the
card lands). The take's frames fill the slots from a frame sequence (`TakeManifest.pattern`) once RS-W is recorded.
**To fit it:** `peak` is the peak's first strong downbeat in local frames; the piece needs about 3.5 s before it.

### 6. The convergence, the title and the end card — `planFinale({ w, h, fps, hit, grid?, lastNote?, decayS?, roomToneS?, musicCredit?, centre?, entry? })`

**OVERRIDES §61 (27 Oct ~12:35):** the person put the montage, the Return, at the end only, and it **replaces the wall
and the convergence**; the Return lane owns that replacement (`setpieces/return*.ts`, `blink.ts`), and CR-08, the
wall's parts of CR-02 and CR-16 and CR-06's S24 → S25 pull-back close with it. What follows describes the convergence as
it stands in the demo until then; the title and the end card stay.

The wall's cells travel inward along their rings and shrink into the stone (E-leave, accelerating) while rings return to
the stone in a train and the camera pushes in (its look waits for the montage decision, OVERRIDES §54–§57: CR-08); the
light goes from evening to the page. **One stone through the iris** (CR-01): the push lands the world's stone exactly on
the title stone's pose, at its size and with its velocity, 2 frames before the iris starts, and moves with it through
it; the iris (E-move, 30 frames) opens the sage-white page from the stone; "Pebble" and "2.0" rise to land ON `hit`, the
stone at rest beside them; one sage sweep crosses the wordmark 1 frame after it (`SageTextSweep`: inside the glyphs, its
alpha capped so their L* rises by at most 15, tested); the README's line rises beneath. Page 1: the facts rise from masks
at one size, **each its own span, each row one flex row the browser lays out with `FACT_GAP_EM` (1.25 em) between its
facts** (`TypeSpec.row`; CR-20: one string with three spaces collapsed to "Apache-2.0 No telemetry."; fix round 2,
the verifier's NF-04: placed by estimated advance widths, the gaps came out 62–165 px; 9:16 sets one a line), each
limit beside its promise, landing on `lastNote`; page 2: "Shown with sample data." and the method line (L4: "Real Pebble 2.0 screens, composed in one space.
Nothing Pebble does is sped up."), held for their reading time. **The small print leaves the film's frames** (CR-10, §55:
102 words, the honest line among them, sat on screen for 6 s): the honest line is held 12 s in the Dusk passage where
Stealth shows, and the credits (bloub's, the music's CC BY line, the trademark lines, the sign-in and signing limits) are
`FILM_CREDITS`, for the description, the captions and the site's credits page. **The pages glide** (OVERRIDES §58): the
page is one rigid world, the stone and every line set in it, pushing in at 0.3 px a frame at the frame's corners from the
iris to the film's last breath; each page's lines are exact at the middle of their page (`extra.anchors`), so they sit
within a few per cent of their layout while read and stay in the safe area (checked on every frame); only the room tone
at the very end, after the music's decay, settles to a still, the one declared wait. The piece ends after the ending's
decay and 0.5–1 s of room tone. **To fit it:** start it where the wall ends; `hit` at least ~4 s in; time the track's
real ending back so its last strong note lands on `lastNote` (a splice at a real stop, never a fade).

### 7. The post-credit scene — `planCoda({ w, h, fps, endCard, align? })` (`coda.ts`, `codaChecks.ts`, `coda.cues.ts`)

The person's sneak peek of a coming feature (D157, OVERRIDES §62; the design lane's POSTCREDIT_DESIGN.md), in the main
film only (not the tour cut, the 40-s cut or the shorts), after the end card's true ending: page 2's lines leave, a ring
iris (E-move) closes onto the end card's stone, a breath of night green (the dark --bg, a declared wait), an iris opens
from the same stone asleep on the riverbed at night (the Companion's own `sleepy` pose, created asleep, in the page's
dark palette, one engine blink placed alone in line 1's hold), and "Pebble rests." / "Soon, it will learn while it
does." / "Not built yet." land one at a time (1:1 and 9:16 break the second after "learn"), the scene's one sound (the
score lane's: the title's CC0 stone tap at a whisper) on the second; a push at 0.35 px a frame (0.30 in 1:1) eases to
the film's last breath. Its frames 0–33 ARE the end card, played on past its end by `CodaView`
(`extra.coda.endCard.extended`): the end card's plan is untouched, so the X version (the main film with the coda is
over X's 140 s) is the master cut at the coda's first frame (`codaPlacement`, `xCutFrames`). A flash model (6 × 6 tiles, qa/luma.ts's rule)
lengthens the breath until no tile the iris-out darkened brightens again within a second (9 frames in 9:16: 7.75 s in
all, on one timeline). `codaChecks()`, in `checkPlan()`, holds its words (§62's four phrases, numbers, versions, dates,
names), reading holds, one stone, the camera rule (two declared waits only), the pose, no mock screen, the lockup,
flashes and the sound and captions it hands on; each has a canary in `tests/coda.test.ts`. The night plate is
`video/public/desktop/riverbed-dark-2400.jpg` (gitignored; `capture/riverbed-plate.mjs dark`, then `sips`): until it
is made, the view draws the wallpaper's mid tone.

### The demo and the checks

`F2-SetPieces-Demo` (16:9), `F2-SetPieces-Demo-1x1` and `-9x16` play the six pieces in the film's order, each fitted to
a real measured stretch of an audition track (`demo/grids.ts`, from the score lane's maps: no audio is used), with a slate
on every frame saying the UI is a placeholder. `F2-SP-<piece>-<aspect>` renders one piece. `bun test video/src/film2`
runs `checkPlan()` on every piece in every aspect, for the demo's stretches and for random tempos and hit times.

```
bun test video/src/film2
bun video/src/film2/setpieces/tools/check-setpieces.ts [16:9|1:1|9:16] [--verbose]   # every check, the joins, the music report
bun video/src/film2/setpieces/tools/reel-marks.ts 16:9                               # cuts and still holds, for the sheets
/usr/sbin/taskpolicy -c utility bun video/src/film2/setpieces/tools/make-cells.ts    # once: the wall's thumbnails
scripts/heavy.sh f2-sp-demo16 /usr/sbin/taskpolicy -c utility \
  bash video/src/film2/render/render-segments.sh F2-SetPieces-Demo .work/film2/sp3/demo16 5919 480 0.5
scripts/heavy.sh f2-ground16 /usr/sbin/taskpolicy -c utility \
  bun video/src/film2/setpieces/tools/ground-light.ts .work/film2/sp3/demo16/F2-SetPieces-Demo.mp4 16:9   # the light arc
```

**What the demo shows** now is in "Fix round 1" below (27 Oct: 5,919 frames a reel, every check passing on the plans
and on the three reels). **Before the craft review** (26 Oct, 5,702 frames each; the reels since deleted, their scans and
sheets kept in `.work/film2/sp/`), the three reels passed the whole-frame pixel checks of the time (no pops away from
cuts, no dead second, no dip at a seam, at most one flash a second), and the sheets and seam strips had been looked at
and fixed where they showed a fault (multi-line type running as one line, a line outliving its shot, an empty cascade
stage after the cut, a card popping in at a take's start, two stones at the title's iris, a palette thrown in too
fast); the checks added after the review failed those plans and reels where it saw its defects (below).

**Placeholders.** Every picture of Pebble in the set pieces is a real capture of a published release (1.0.x–1.5.0,
cropped, never stretched, never showing a usage or timing line) or a labelled slot for what has no published capture
(the browser take, Apple's apps, the Workshop's cards, ⌘K, the menu bar, the agents panel). Nothing is drawn Pebble UI,
and nothing may be presented as 2.0.0. The 2.0.0 captures replace them through the manifests (`take.ts`) and
`standins.ts`; the plans do not change.

## Checks added after the craft review

The craft review of 27 Oct (CR-01 to CR-23) found its defects on renders that every check passed: the whole-frame pixel
rules could not see one line vanish, the dead-frame rule took the stone's idle animation or a slot's ticking clock for
motion, and the plan checks looked only at what a plan declared it read. These checks were built before any fix
(OVERRIDES §55, CR-15). Each catches a planted canary and passes the same thing done right
(`tests/review-checks.test.ts`), and each fails on the current plans and reels where the review saw its defect.

| Check | Where | Enforces | For |
|---|---|---|---|
| `cameraFloor` | `qa/checks.ts` | in every second outside declared waits, the frame's corners move ≥ 0.25 px a frame at 1080; only the camera counts | CR-04 |
| `irisEase` | `qa/checks.ts` | a ring iris eases on E-arrive only with a marked hit on its seam; a seam that names no ease takes the default `ringIris()` draws (`IRIS_DEFAULT_EASE`) | CR-21 |
| `groundCoverage` | `setpieces/qa.ts` | the frame's four corners stay inside the riverbed on every frame (`setpieces/ground.ts`: the extent and depth PieceView draws) | CR-02 |
| `stoneCount` | `setpieces/qa.ts` | never two stones at once: stones shown together must be one pose (6 px, 6 %), through irises, racks and swaps | CR-01 |
| `planesInFrame` | `setpieces/qa.ts` | every plane drawn with body text of 20 px or more at 1080 is wholly in frame (a cut under 0.5 s is a glimpse, not judged) | CR-05 |
| `legibleWords` | `setpieces/qa.ts` | every legible word counts toward the reading load, which stays ≤ 3.14 words a second; no read is declared with 0 words | CR-05, CR-09 |
| `hitSync` | `setpieces/qa.ts` | the aperture's opening and each burst start within 2 frames of the hit, in every aspect (`hitSyncAcross` holds the aspects to one timeline); no light leak over the bands | CR-07 |
| `smallPrintHolds` | `setpieces/qa.ts` | each end-card page (its lines on screen together) held for its reading time; any line with the honest line's text held 9 s | CR-10 |
| `askActClock` | `setpieces/qa.ts` | a still (or another take) and a take view of the same window never share a frame; views of one take on one clock pass | CR-11 |
| `typeExits` | `setpieces/qa.ts` | no line vanishes: a "camera" exit draws nothing (type is a screen layer), nor does a line held to a piece's end | CR-03 |
| tile pops | `qa/luma.ts`, `qa/reel-scan.ts` | each of the 6 × 6 tiles above 3 levels and above 3× the larger of the medians of its three frames before and its three after; on a reel, not a move (a 2 px shift does not explain it, and it changes the tile's mean by at least a quarter of its difference) and not a line's own entrance | CR-03 |
| ink | `qa/ink.ts` | each line's coverage (pixels on its ink's side of the midpoint between its ground and its own colour) never falls by more than 50 % of its held ink within 6 frames, to under half, unless an exit is declared | CR-03 |
| stones | `qa/stones.ts` | around the plan's stones, outside its type, never two stone-sized dark blobs | CR-01 |
| bands | `qa/bands.ts` | the Drop's bands start to open within 2 frames of the hit | CR-07 |

**What they read.** Each placeholder still carries its measured body text and every legible word in its crop
(`standins.ts` `textPx`, `words`; measured 27 Oct as cap height ÷ 0.727, and smaller than some `readPx`: the held card's
body is 11.7 px against 13, the tests card's 13.1 against 15). Each still, image and take view names the window it shows
(`place`). The iris is modelled as drawn (`transitions/kinds.ts` `irisRadius`, `IRIS_DRAWN`), the riverbed's extent is
shared with the view (`setpieces/ground.ts`), and the finale says it ends the film (`endsFilm`).

**Running them.** The plan checks are part of `checkPlan()`: `check-setpieces.ts` runs them in every aspect, holds the
Drop's hit to one timeline across the aspects, and `--summary` prints one line per piece and check. The render checks
need the plans' marks, then one decode through heavy.sh per reel (without `--marks`, `luma-scan.ts` lists tile pops but
does not judge them: telling a pop from a move needs the full frames and the plan's transitions):

```
bun video/src/film2/setpieces/tools/reel-marks.ts 16:9 --out .work/film2/sp/demo16/marks.json
scripts/heavy.sh f2-scan16 /usr/sbin/taskpolicy -c utility \
  bun video/src/film2/qa/luma-scan.ts .work/film2/sp/demo16/F2-SetPieces-Demo.mp4 --fps 60 \
  --marks .work/film2/sp/demo16/marks.json --out .work/film2/sp/demo16/scan.json
```

**The open findings** (`setpieces/review-ledger.ts`). The tests hold every plan to every check except the (piece, check)
pairs listed there, and each listed finding must still fire, covering the frames the review saw: an entry that stops
firing fails the tests, so the ledger only shrinks and every fix is a visible edit to it. `check-setpieces.ts` and
`luma-scan.ts` ignore the ledger and fail while anything is open. A fix counts only when they pass AND the frames look
right (§55). Entries marked `waitsForMontage` (the wall, the convergence) wait for the montage decision (§54). After fix
round 1 (below) one entry is left: the foundation demo's own camera floor (S2 and its title), outside the set pieces.

**On the plans before fix round 1 (27 Oct), every piece failed in every aspect** (`check-setpieces.ts --summary`: cameraFloor 22,
legibleWords 31, groundCoverage 12, planesInFrame 12, askActClock 6, typeExits 6, smallPrintHolds 6, hitSync 4,
stoneCount 3), where the review saw it:

| Review | Caught (local frames; reel frame = piece start + local) |
|---|---|
| CR-01 two stones at the iris, reel 4632–4637 | `stoneCount`: finale 238–244 (16:9), 238–245 (1:1), 238–244 (9:16), 148–163 px apart |
| CR-02 the riverbed's edge, reel 4140–4560 | `groundCoverage`: wall 68–360, finale 0–193 (16:9); also Ring 4's start (0–132, visible in the review's own crop at 700–780) and, in 9:16, the Drop's wide and Dusk's crane |
| CR-03 "Its own tools." gone in 2 frames at 3368; the last item on the cut at 2054 | `typeExits`: climax L24 on 234, Ring 4's last item on 1394 |
| CR-04 frozen camera, reel 210–420 and 3664–4034 | `cameraFloor`: Drop 137–428 (0.044 px a frame), climax 499–900 (0.055); also Glaze's push end, the cascade's arrival, Dusk's start, the title |
| CR-05 cards cut at reading size; about 60 legible words, 9 counted | `planesInFrame`: Ring 4 ask 325–619, test card 326–929, receipt 615–929; `legibleWords`: 162 against 22 (12.3 words a second) |
| CR-07 9:16 opens 0.35 s after the hit; the leak over the bands | `hitSync`: 9:16 opens on 204 (16:9 and 1:1 on 182, hit 180); the leak over the bands for 30–48 frames |
| CR-09 the ask card declared as 0 words | `legibleWords`: "declared read with 0 words" |
| CR-10 page 2, about 100 words in 6 s | `smallPrintHolds`: 102 words in 5.97 s (they need 31.1); the honest line in it 5.97 s (needs 9) |
| CR-11 a still of the held card above a live, verified run | `askActClock`: Ring 4 303–929; also the Drop's 1.0.x panel around RS-9's card |
| CR-21 `ringIris()` defaults to E-arrive | `irisEase`: the foundation demo's iris at 1358 |

**On the reels before fix round 1 (27 Oct, `luma-scan.ts --marks`, 8–12 s a reel through heavy.sh), every reel failed** where the
review saw its defects; the only other things they report are the abrupt events after the table:

| Review | Caught on the render |
|---|---|
| CR-03 "Its own tools." 1,520 ink px to 0 at 3366–3368, at a whole-frame MAD of 3.15 | ink: 1,589 to 0 between 3367 and 3368 (16:9; 1,345 in 1:1, 1,872 in 9:16); tile pop at 3368: 12.9 levels against 1.0–1.4 in its own tiles (15.4 in 1:1, 10.2 in 9:16) |
| CR-03 the last cascade item gone on the cut at 2054 | ink: 1,030 to 0 between 2053 and 2054 (1,222 in 1:1, 1,721 in 9:16); no other line of the 23–26 per reel falls without an exit |
| CR-01 two stones at 4632–4637 (1:1 4632–4638, 9:16 4632–4636) | stones: two blobs on 4634–4637 (1:1 4633–4637, 9:16 4634–4637; the title's stone is faint inside the iris's feather for its first frames), one everywhere else |
| CR-07 9:16 opens about 202, 16:9 about 181 | bands: 9:16 opens on 204, 24 frames after the hit (the band 143 px at half size until then); 16:9 and 1:1 on 182 (within 2) |

They also find, in all three reels: the 4-frame blur exits of L04 (177–178), Ring 4's limit (938–940), the honest line
(3130–3132) and L25 (4022–4024), each word leaving in 2 frames (5.4–21.8 levels in a tile; CR-03 asks 10–14 frames); and
cards popping in on the shared entrance (E-arrive: 38 % opacity on its first frame, 92 % by its third): Ring 4's test card at 965 and the
climax's ask at 3148 (16:9) and kept card at 3436 (9:16). Every one was looked at in crops.

**Calibration** (on these reels, looked at in crops): the encoder's pulses and the pebble's blinks measure 2.0–2.9 levels
in still tiles, hence 3 for a tile (the whole frame keeps 2); glyphs settling a pixel at the end of a slow rise measure up
to 8.3 levels in a tile but change its mean by at most 0.11 of that, while every line or card that appeared, vanished or
faded changed it by 0.44–0.97, hence the move test; a moving plane behind a line halved an ink mass but not its
coverage; the placeholders carry Pebble's own avatar and dark controls, and Fraunces at 72–96 px makes compact dark
glyphs, hence blobs only around the plan's stones and outside its type. The marks-mode luma frames are box-filtered from
the render (FFmpeg's area scaler read 8–42 % lower on small moving type: 1.97 and 1.24 against 2.13), so the whole-frame pop rule there also
reports 1:1's 3130 and 5279, the honest line's and page 1's fast exits.

**Limits.** The ink rects use approximate advance widths; tile pops skip cuts and transitions (the ink check covers lines
that vanish on one) and the frame's opening on the hit; a lift's descender residue inside its declared exit ("gg" at
2050) is not caught; stone blobs are dark pixels at grey 140 or under; `planesInFrame` and `legibleWords` use the body
text's size, so the Drop's companion panel (about 20 px) sits on the line.

## Fix round 1 (27 Oct): the craft review's findings, fixed

The fixes OVERRIDES §55 lists under "Fix now", to its targets, and the two rulings of §58 (the title and the end card
glide; `readPx` is the measured truth). Waiting for the montage decision (§54–§57), not touched: CR-08 (the
convergence's look), the wall's parts of CR-02 and CR-16, and CR-06's S24 → S25 pull-back into the wall. CR-13 (Mixkit)
and CR-22 (the pre-push guard) are the lead's. Every check, old and new, passes the plans in all three aspects
(`check-setpieces.ts`: every piece, the joins and one timeline), the tests hold them (`tests/fix-round1.test.ts` adds a
canary for each new rule), and the three reels were rendered again and looked at where the review saw each defect.

| Finding | What changed | Held by |
|---|---|---|
| CR-01 two stones at the iris | the convergence lands the world's stone on the title stone's pose, size and velocity 2 frames before the iris; both cameras then zoom alike | `stoneCount`; stones on the reels |
| CR-02 the riverbed's edge | each shot's riverbed is sized from its own widest pose, padded 5 %, at the image's 1.6:1 (`ground.ts groundRectOf`); joined shots share one (`joins.ts shareGround`) | `groundCoverage` |
| CR-03 lines vanishing | every exit is drawn and at least 10 frames (`type/exits.ts`); "Its own tools." blurs out before its cut; the cascade's last item and fixed line leave on the stage's E-leave; a lift goes to −140 %, fading out by 85 % of it; a block of 12 words or more (the honest line) blurs out over 14 frames, each word over 10 on power1.in; the Veil's label is set in the render's world and leaves with it | `typeExits`; tests; ink and tile pops on the reels |
| CR-04 a frozen camera | every reading hold glides 0.3–0.6 px a frame at the corners (`frame.ts holdGlide`, `glideLz`); the climax's push carries across the whole hold; momentum cuts land on a glide, never at rest | `cameraFloor` |
| CR-05 cards cut by the frame | Ring 4's ask, act and receipt are crops of HS-F's views at line boundaries, framed whole; the climax's cards are slots at the 2.0.0 sizes | `planesInFrame`, `legibleWords` |
| CR-06 undesigned joins | every piece has an entry and an exit pose and velocity: the Drop's world continues into Ring 4, the cascade, the crane and the climax leave on E-leaves into momentum cuts the next piece enters at the same speed; Dusk opens on HS-B3's workspace, the climax on its card arriving | `joins.ts checkJoins` (in `check-setpieces.ts`) |
| CR-07 9:16 late on the hit | the frame opens on the hit's next frame in every aspect; the leak plays once the bands have cleared | `hitSync`, `hitSyncAcross`; bands on the reels |
| CR-09 the ask never readable | the pre-roll reads the card at 28 px or more, 12 words declared | `legibleWords`, `uiReadSize` |
| CR-10 100 words in 6 s | page 2 is the sample line and the method line (18 words, 6.2 s); the honest line stays in the Dusk passage; the credits are `FILM_CREDITS` (description, captions, the site's credits page) | `smallPrintHolds` |
| CR-11 a still beside a live take | every plane of a place is a view of one take on one clock (Ring 4's HS-F; the Drop's RS-9) | `askActClock` |
| CR-12 a frame-count conform | RUNBOOK §6.2.1: conform by timestamps only (`-vf fps=60 -fps_mode cfr`), log the durations and each event's wall-clock time; `TakeConform` and `checkTakeManifest()` refuse anything else, through `checkPlan()` | `takes`; tests |
| CR-14 no light arc | the light lives in the ground (linear-light gains, `<GroundLight>`) | `lightArcProblems` on the model and on the reels (`tools/ground-light.ts`) |
| CR-16 the Drop's sparse Mac | `world.ts`: the browser, the project and the Toolbox at 25–40 % of the frame's width at the wide, overlapping, the context windows at their own depths | the wide's sheet |
| CR-17 empty swaps | the outgoing item and card leave over the same 8 frames the incoming arrive, crossing at mid-blur with a matched slide | `stageCover` (tests); the swap's frames |
| CR-18 dissolving placeholders | placeholder states switch with a hard cut on their event frame (no `fadeOut` exists); where no capture shows a state, a slot; a view that shows nothing yet draws nothing | tests; the reel scan lists each state change |
| CR-19 a weak Dusk | the Veil's body 47 % of the frame's height, pushing in; the label carried with the render; the crane cut short on a beat while the Dock is in frame and clear of the honest line; the menu bar at 3.5× (77 px) | `typeSafe` (carried lines too); the passage's frames |
| CR-20 facts run together | each fact its own span with 1.25 em between facts (9:16 one a line) | tests; gaps on the reels (`reel-scan.ts`) |
| CR-21 E-arrive by default | `IRIS_DEFAULT_EASE` is E-move; E-arrive only on a seam with a marked hit | `irisEase` |
| CR-23 Apache-2.0 notices | each HyperFrames port's header; `THIRD_PARTY_NOTICES.md` | tests |
| §58 the title and end card | one rigid page pushing in at 0.3 px a frame, every line set in it; only the room tone at the end is still | `cameraFloor`, `typeSafe` |
| §58 `readPx` | each still's `readPx` is its measured body text (held 11.7, tests 13.1, approval 13.8, command 13.1) | tests |
| PLACEHOLDERS: the slots' labels (found on the reels) | a frame made of slots always shows a slot's label whole, and a slot being read shows its own: the Dusk's workspace and palette now name themselves where the camera reads the palette's middle row (in 1:1 and 9:16 both labels, and the palette's states "typed: stealth", "Turn Stealth Lockdown on" and "Enter", sat outside the frame's left edge for the passage's first 3.8 s); `slotLabelLayout()` places the label for the view and the check alike | `slotLabels` (in `checkPlan()`); tests |

**New tools and checks.** `setpieces/joins.ts` (the join check, CR-06); `setpieces/tools/ground-light.ts` (the ground's
light on a render: the median of the pixels the plan leaves to the ground, per section, then `lightArcProblems()`);
in the reel scan (`qa/reel-scan.ts`, fed by `reel-marks.ts`): the end card's gaps must stay empty (CR-20), a line set in
the world is measured where its world carries it (`rectAt`), and a take's placeholder state changes (`states`) and the
Veil's own cast are declared, so they are listed rather than judged as pops; `typeSafe` checks lines set in the world on
every frame they are read; `checkTakeManifest()` (CR-12); `slotLabels` (a frame made of slots, with no published
still, real take or film line to read, shows a slot's label whole, and a read slot its own; runs under half a second
and camera sweeps over 4 px a frame are not judged).

**On the reels** (27 Oct, the fix's last renders: 16:9, 1:1 and 9:16 at half size, 60 fps, 5,919 frames each, 192–200 s
each through heavy.sh; `luma-scan.ts --marks` and `ground-light.ts`; gitignored evidence in `.work/film2/sp3/demo*/`
(`scan.json`, `ground-light.json`, `marks.json`), the sheets in the lane's scratchpad;
16:9 from round 5, the code as committed but for the Dusk's slot labels: its whole round-6 render waits
for disk room, the renderer's preflight refusing it at 2.29 GiB free, so the labels' change was checked on the plans
and on a round-6 render of the Dusk's opening, reel frames 2280–2519):

| Check | 16:9 | 1:1 | 9:16 |
|---|---|---|---|
| ink: lines that vanish (CR-03) | 0 of 25 | 0 of 25 | 0 of 25 |
| stones: frames with two (CR-01) | 0 (2,823 checked) | 0 (2,835 checked) | 0 (2,849 checked) |
| bands: opening frame, hit 180 (CR-07) | 181 | 181 | 181 |
| gaps between facts holding ink (CR-20) | 0 % in all 3 | 0 % in both | (one fact a line) |
| tile pops, whole-frame pops, dead seconds, dips | none | none | none |
| flashes a second (at most 3) | 1 | 2 | 1 |
| placeholder state changes listed (CR-18) | 6 | 6 | 6 |

The light on the ground's pixels (median of each section's frames, RGB, R − B and luma in 8-bit levels; the review
measured warm at R − B +2, day +4 to +7, dusk luma 206–210 and R − B 0 to +1, evening +3 to +4 at luma 234):

| Section | 16:9 | 1:1 | 9:16 |
|---|---|---|---|
| morning (the pre-roll) | too little ground | 203/214/208, −5, 211 | 202/214/207, −5, 211 |
| warm (the Drop) | 222/219/186, +36, 217 | 219/218/185, +34, 216 | 224/222/188, +36, 220 |
| day (Ring 4) | 225/232/219, +6, 230 | 222/230/217, +5, 227 | 217/225/211, +6, 222 |
| dusk | 181/191/197, −16, 189 (18 % darker) | 179/190/197, −18, 188 (17 % darker) | 175/187/193, −18, 185 (17 % darker) |
| evening (the climax) | 221/214/185, +36, 213 (7 % darker) | the cards fill the frame | 224/218/187, +37, 217 (2 % darker) |
| page (the title) | 247/247/244, +3, 247 | 244/244/242, +2, 244 | 244/244/242, +2, 244 |

Every target the lead set holds where the ground shows (`lightArcProblems()` reports nothing): warm and evening about
30 levels warmer in R − B than day, dusk about 17 % darker and bluer, evening a few per cent darker than day, neighbours
ΔE 9.8 or more apart on the model. Where a frame is all window (1:1's climax), the evening shows as the `ui` gains' cream
on the slots.

**Looked at** (sheets every 10–30 frames and strips frame by frame, at the review's frames in each finding): the Drop's
pre-roll, hit, hold and reveal; Ring 4's travel, two reads (1:1, 9:16), receipt and cascade (the swaps cross); the
Dusk's workspace, palette, Veil and its label, the crane and the Dock clear of the honest line; the climax's ask, the
kept card arriving with its shadow and its hold; the wall and the convergence; one stone through the iris; the title
and both pages gliding; every join; the honest line's exit frame by frame; the Dusk's opening at the reel's own pixels.
**Four faults found only by looking and measuring, and fixed:** the slots' hatch stepped every 15–17 frames of a slow
push (its stops were rounded to 0.01 of a world unit: a whole-frame step of 2.2–2.8 levels on the 1:1 receipt; now
unrounded); the end card's lines snapped a whole pixel now and then as the page pushed in (a tile step of 3–8 levels;
the carried lines now sit on their own compositor layer, which moves at sub-pixel precision, measured on 40-frame tests:
steps of 0.02–0.04 px, no jump); on the 9:16 reel, where the honest line fills the frame's width, its 12-frame blur exit
let 37 % of a word's ink go in one frame (a tile step of 3.6 levels at 3352; a block of 12 words or more now leaves over
14 frames, each word over 10 on power1.in, its words going as a wave from each line's first, the last gone 5 frames
before the cut); and in 1:1 and 9:16 the Dusk opened on its slots with their labels outside the frame (the table's last
row). A plane that a placeholder view leaves empty (the kept card before it lands) drew a card-shaped box with its
shadow; it now draws nothing until its still arrives, and then arrives whole.

**Still placeholder-bound** (they change with the 2.0.0 captures, not with the plans): Ring 4's reads (published crops)
sit on the conversation's slot and the climax's cards are slots, so those frames read pale and sparse whatever the light
does; the evening light shows on the slots' cream rather than on the ground there; the cut into Kiln shows the empty
conversation slot for about 0.75 s while the camera sweeps in, before the kept card lands on the peak.

**Open:** the foundation demo's own camera floor (`review-ledger.ts`, the one entry left: its S2 lands on E-arrive at
rest and its title page breathes under 0.25 px a frame); it is the motion foundation's demo reel, not a set piece, and
the fix is the one the finale uses.

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
- **The ring iris between places:** E-move over 24–36 frames with the outgoing shot still drifting: `ringIris()`'s
  default since the craft review (CR-21; `IRIS_DEFAULT_EASE`); E-arrive's burst only on the Drop and on hits the cue marks,
  declared on the seam (`qa/checks.ts` irisEase).
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
