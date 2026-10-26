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

## Open, for the lead

- **L2, the frame rate:** everything is written at 60 fps and converts with `f60()`; the checks convert their limits.
- **L3a, motivated light:** `LightSweep`, `TextSweep`, `RimLight` and the ripple's crest highlight wait for the ruling.
- **Grain:** off by default (`FilmGrain on={false}`); the LUT is the only finish in the recipe.
- **The card entrance** (§5.1's shared ask entrance) is the film's framing of the card arriving; on the 2.0.0 captures it
  is used only where the recording shows Pebble's card arriving the same way.
