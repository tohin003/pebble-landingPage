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
| `stealthVeil.ts` | `src/stealthVeil.ts` at **v1.1.0**: the Veil, Stealth Lockdown's look | Apache-2.0 | none (a 2-line provenance header) |
| `character.ts`, `cues.ts`, `live.ts`, `veil.ts`, `index.ts`, tests | written for this site (`veil.ts` carries Avatar.vue 1.1.0's layer formulas and tokens.css's colours) | Apache-2.0 | |

`SOURCES.json` records each source file's SHA-256 (at v1.0.1, or the file's own `tag`); `provenance.test.ts` checks the
unchanged copies byte for byte. Every file copied from v1.0.1 is byte-identical at v1.1.0.
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

## The Veil (Stealth Lockdown, Pebble 1.1.0)

While Stealth Lockdown is on, the pebble wears the Veil: a dusk-blue glass with a light rim. `stealthVeil.ts` is Pebble's
own pure function of the seconds since the switch changed; `veil.ts` drives it and turns it into numbers to draw.

```tsx
<Pebble stealth={on} name="stealth" />          // static frame in its settled look, then live: a flip plays the Veil
<PebbleStatic stealth />                        // a still frame carries the ON look (zero JavaScript)
```

- `PebbleLive`, `PebbleLiveSlot` and `Pebble` take `stealth` (absent: no Veil, and the markup is exactly as before).
  Flipping it plays the cast (1.25 s: gather, the dusk colour wipes down behind a bright hem with one ring, the eyes
  reopen to a calm 80 %, the glass arrives) or the release (0.65 s: fold, lift, hop), from wherever the Veil is, so a
  reversal mid-transition never jumps. While on, the animated pebble shimmers (1.1 s every 6 s) and never settles
  mid-cast or mid-shimmer. Reduced motion or Pause motion: one 0.3 s cross-fade, no shimmer. A pebble that isn't the
  animated one (the conductor's rule) shows the settled look at once. Under 64 px: no glass, highlight, shimmer or ring,
  and a rim about 1.3 px wide. The SVG carries `data-stealth="on" | "off"`.
- Colours: `--pebble-veil` (the dusk blue), `--pebble-veil-hi` (its highlight), `--pebble-veil-eye`, `--pebble-veil-rim`
  and `--pebble-veil-glow` (the ring). Set them on any ancestor to scope them; otherwise the pebble uses Pebble 1.1.0's
  `src/tokens.css` values for the page's theme (`PebbleVeil.module.css`; light `#44528C` / `#7684C6` / `#FFFFFF` /
  `#D6DDFF` / `#7D8DF2`, dark `#A3AEEA` / `#CCD4FB` / `#1C2246` / `#FFFFFF` / `#8494F7`). The dusk blue is the feature's own
  accent: only inside the Stealth section.
- Wherever the Veil appears it is a render of the pebble, never a screen recording, and the section carries the honest
  line word for word (OVERRIDES §21).

In a film or a still, render it frame-exactly:

- `veilFrame(on, since, from?, reduced?)`: the Veil `since` seconds after the switch went `on` (or off), from `from`
  (default: the other end state), with the shimmer while on (from 0.95 s after the switch). `veilEnd(on)`: settled.
- `veilAt(switches, t, { initial, reduced })`: a timeline `[{ at, on }]` replayed for every frame; each switch starts
  from the Veil as drawn at that moment.
- `veilDraw(frame, sizePx)`: every attribute Avatar.vue's template computes (clip rects, squash, eye scale, glass
  opacity, highlight, shimmer transform, rim width, hem, ring). The site's `src/components/pebble/PebbleVeil.tsx` is the
  reference layering (defs; plain body below the edge; dusk glass, highlight, band and eyes above it; rim and hem clipped
  to the body; the ring outside the squash). `VEIL_LIGHT` and `VEIL_DARK` are the colours for renderers without CSS.
- Pebble 1.1.0's own Avatar.vue reads the Veil after the prop has flipped, so in the app (and in the README's
  `07-stealth-veil*.gif`) a cast from a plain pebble starts from ON and a release from OFF: the colour changes at once
  and only the squash, blink and ring play. `veilFrame(on, since, on ? ON : OFF)` reproduces the app exactly; the site
  plays the designed wipe.

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
reference; D6 over every cue list in the repo; the blink schedule restarts before 840 s; provenance; the site renderers;
the Veil (Pebble's own `stealthVeil.test.mjs` and `Avatar.test.mjs` Veil cases, timelines with reversals, the live clock,
Avatar.vue's layer numbers, and the rendered layers at key times).
