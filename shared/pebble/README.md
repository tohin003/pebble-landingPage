# shared/pebble: the Pebble character

Pebble's real character engine, shared by the site (`@pebble/index`) and the Remotion project
(`../../../shared/pebble`). Plain TypeScript: no React, no Remotion, no DOM, and no import from outside this folder.

## Where it comes from

| Path | Source (Pebble v1.0.1, https://github.com/tohin003/Pebble) | Licence | Change |
|---|---|---|---|
| `bloub/*.ts`, `bloub/LICENSE`, `bloub/PROVENANCE.json` | `src/vendor/bloub/`: **bloub by Jérémy Perret**, https://github.com/jeremy-prt/bloub at `b4bb3c1` | MIT | none, except `skins.ts` |
| `bloub/skins.ts` | same | MIT | `SHAPES` trimmed to `cercle` and `galet` (header in the file) |
| `avatarMotion.ts` | `src/avatarMotion.ts` | Apache-2.0 | none (a 2-line provenance header) |
| `companionState.ts` | `src/companionState.ts` | Apache-2.0 | the pose table, `poseId`, `visualFor`, `TAP_MS` only |
| `gaze.ts` | `src/companionPointer.ts` | Apache-2.0 | `quantize`, `gazeToward` (optional `reach`), `sameGaze`, `lookFor`, `REACH_PX`, `GAZE_STEPS` only |
| `character.ts`, `cues.ts`, `live.ts`, `index.ts`, tests | written for this site | Apache-2.0 | |

`SOURCES.json` records each source file's SHA-256; `provenance.test.ts` checks the unchanged copies byte for byte.
Credit line (footer, `/credits`, `CREDITS.md`): "Pebble's character engine: bloub by Jérémy Perret (MIT)", with the full
MIT notice from `bloub/LICENSE` on `/credits`.

## Rules

- **Pebble's own poses only (D6).** Drive the engine through a Pebble pose (`companionState.ts`: idle, hover, tap, reading,
  editing, review, testing, happy, sleepy, …), never an engine state. The engine then only reaches `idle`, `alert` (the
  review "!") and `notify`. The catalogue states (wink, wide, exclaim, sleep, egg, hexagon, play, orbit rings, swirl,
  burst, comet, and the three-dot `thinking` morph) never appear. `checkCues` and the tests enforce it.
- **The "!"** (`review`) only where the app shows it: the approval moment in the film and loop L3, and the guide pebble
  at step 01. Never a logo, favicon or hero.
- **`GALET` itself, never a copy**: the eye-fit table is keyed by the array's identity.
- **Static frame**: `staticView("idle")` is `engine.sample(1.0)` (eyes open, before the first blink at 1.4 s). It is the
  research reference frame exactly (`fixtures/idle-frame-t1.json`).
- **Films replay, never remember**: build a fresh engine and replay the cues up to `t` for every frame (`pebbleAt`).
- **Live clock** (`LivePebble`): engine time advances only while animating; calm poses settle after `HOLD_SECONDS`
  (8 s) without input; the timeline restarts before 840 s (the engine's blinks stop at 900 s), at a calm moment, on the
  early time that looks most like the frame on screen.

## On the site (`src/components/pebble/`)

```tsx
<Pebble size={240} name="hero" />               // server component: static SVG, live after first paint
<Pebble pose="reading" size={96} interactive={false} />
<Pebble pose="sleepy" size={48} live={false} />  // static only, zero JavaScript
```

- `PebbleStatic` (server) and `PebbleLive` (client) can also be used directly. `PebbleLive` props: `pose`, `size`,
  `interactive` (hover and tap), `followPointer`, `name`, `className`, `style`. Size it with `size` or `className`.
- Only the most visible live pebble animates (`usePebbleConductor`); it stops when hidden or off-screen; reduced motion
  or `html[data-motion="paused"]` gives a settled still frame.
- Events (`events.ts`): `tapPebble(name?)` makes a pebble tap (the "Say hi to Pebble" button, the install pill's copy);
  `onPebbleTapped(listener, name?)` hears people tapping a pebble (show the "Hi, I'm Pebble." bubble in an
  `aria-live="polite"` region). The SVG is `aria-hidden`: give every action a real button.
- Colours: `--pebble` and `--pebble-eye` (light `#536B54` / `#FFFFFF`, dark `#B4CDA6` / `#23351F`), set in
  `src/app/globals.css`.

## In the films (`video/src/pebble/`)

```tsx
<PebbleOnFilm cues={CUES} size={420} x={600} y={760} hops={HOPS} offsetFrames={sequenceFrom} />
```

- `cues`: `{at, pose?, look?, note?}` sorted by `at`, seconds of absolute composition time. Keep timelines in pure-data
  `*.cues.ts` files and name the exports `…CUES`; the engine tests check every one of them.
- `hops`: `{at, to, duration?, height?}`: anticipation 0.15 s (sy 0.89), stretch sy 1.11 / sx 0.90, landing squash
  sy 0.87 / sx 1.15 for 2 frames, then the `jelly` spring. The contact shadow follows the drawn silhouette.
- Helpers: `hopGlances` (eyes lead a hop by 0.1 s), `mergeCues`, `snapToBlink` (hide a face change in a blink),
  `blinkFreeOffset` (loop seams without blinks), `eyesOpenFrom` (never freeze mid-blink).
- `PebbleDemo` (Remotion composition) is a reference sheet; frame 30 is the static frame.

## Tests

`npm run test:engine` (bun): replay equals live sampling over 300 frames; `sample(1.0)` is stable and matches the
reference; D6 over every cue list in the repo; the blink schedule restarts before 840 s; provenance; the site renderers.
