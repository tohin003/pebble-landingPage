# Pebble design philosophy

*By the design lead, 23 October 2026. Binding for the page, the film, every social cut and every still. The system
that implements it is `docs/DESIGN-LEXINGTON.md` (tokens, grid, sections). The product truth is `docs/CLAIMS.md`.
Where those documents and this one disagree, this one sets the intent; the claims register sets the facts.*

## A precise world, and one soft stone

Pebble is a small companion that asks before it acts and shows its evidence before it calls work done. The page has to
feel the same.

Everything made by hand is square, flat, exact and still: the grid, the rules, the type, the frames. One natural thing,
a smooth stone with two eyes, is the only object that is rounded, shadowed and alive. That contrast is the brand.
Precision earns trust; the stone earns affection.

We studied two references and took their discipline, not their looks:
- **Lexington Themes** taught the method: *write constraints, not vibes*. One grid, few tokens, hairlines instead of
  boxes, and one loud thing on a quiet page.
- **Superbrain** taught the evidence culture: say how you measured before you say what you found, show the losses with
  the wins, and set numbers as data. It also showed what to avoid: logo walls, a contrast that fails, a stale preview,
  tracking beacons.

## Eight principles, each with its test

1. **One living thing.** The pebble is the only element that moves on its own, the only free form beside its galet
   silhouette, and the only thing that casts a shadow on the page.
   *Test: in any viewport, at most one thing moves without being asked.*
2. **Evidence before adjectives.** We show the real app, its real words, real numbers with their margins. If we can't
   show it, we don't say it.
   *Test: every sentence has a row in CLAIMS.md; every product picture is a capture of Pebble; every number says what
   it counts.*
3. **The limit sits beside the promise.** A feature sentence is followed by its limit, in the same voice and at the same
   size. Honesty is a layout decision, not a footnote.
   *Test: no claim on the page without its qualifier in the same section.*
4. **Constraints, not vibes.** Six colour roles, one accent with three jobs, two typefaces with two weights each plus a
   mono for data, one grid, one radius ladder, one motion budget.
   *Test: the token lint and the grep checklist in DESIGN-LEXINGTON.md pass.*
5. **The page behaves like the product.** Pebble asks first, so the page never scroll-jacks, never plays sound
   unasked, never hides a control, and puts Pause motion in the header.
   *Test: keyboard-only and reduced-motion visits get the same story.*
6. **Show the work, losses included.** When we measure, we publish the method first, then the overall result with its
   interval, then where Pebble led and where it trailed with equal weight, then the cost, then what the result does not
   prove, then the raw data.
   *Test: every benchmark number has its denominator and its interval on the same screen.*
7. **Calm is the volume.** Generous space, a quiet ground, a modest type scale. The loud thing is the pebble, never the
   headline.
   *Test: the H1 is never larger than the pebble beside it.*
8. **One story, every frame.** The page, the film (16:9, 1:1 and 9:16), the README stills and the social posts share
   the pebble, the type, the colours and the words.
   *Test: any film frame could sit on the page without restyling.*

## The system in brief

- **Colour.** A sage-white ground (night green in dark) and six roles. Sage is the single accent, with three jobs:
  getting Pebble (Download, Copy), focus, and state marks (Verified, the selected mode, the installer's ticks). Colour
  and texture live in imagery (the riverbed, the pebble), never in chrome. The pebble is always sage, never black: a
  dark blob with eyes is another product's mark.
- **Type.** Three voices.
  - Fraunces 350, for H1 and H2: the stone's voice, soft and exact.
  - Inter 400 and 500, for everything else: the app's voice, the closest open match to the SF Pro in its captures.
  - Geist Mono with tabular numerals, for every number, version, size, path and command: the data's voice.
- **Grid.** Twelve columns. A label rail in columns 1–3, and everything starts on column 4. One left edge for the
  whole page. On phones the rail becomes a running head.
- **Surface.**
  - One ground. Hairlines only where a line means something.
  - No resting shadows: the pebble casts the only one.
  - Radii of 16, 12, 10, 8 and 6. The galet is the only free form.
- **Motion.** Two speeds.
  - The pebble drifts: 30 fps, at most 0.5 Hz, and it settles after 8 s of stillness.
  - The world snaps: 100–200 ms colour or opacity changes, and presses to 0.98.
  - Nothing moves on scroll.
- **Imagery.** Real captures only, one moment per frame.
  - Scenes sit on the riverbed in a media frame.
  - Moments sit in hairline frames, with text at 12 px or larger.
  - Interactive examples sit on flat fill, labelled "Interactive example".
- **Voice.**
  - Sentence case and periods: the feature, then its limit. No "!".
  - Numbers say what they count.
  - No comparison except the one line the release session allows. Never "beats", never "undetectable".

## Evidence, presented

- **The order:**
  1. the method (the same model, the tasks, repetitions, the grader);
  2. the overall result with its interval;
  3. where Pebble led and where it trailed, at equal weight;
  4. the cost;
  5. what this does not prove;
  6. the raw data and how to rerun it.
- **The headline**, exactly: "Pebble matches Claude Code on the same model, within the margin." It appears only after
  the release session posts the 1.0.4 release.
- **Numbers as data.** Rates with their counts, for example "79.3 % (107 of 135)", in mono with tabular numerals.
- **The chart that leads.** The paired difference: a dot at −3.3 points with its whisker from −9.2 to +2.5, crossing a
  centred zero. Sage for Pebble, a warm grey for the other agent, values printed beside every mark.

## Film and social

- **Same identity.** The film uses the page's identity: Fraunces lines, Inter support, the riverbed, flat sage
  fields, the real UI, the pebble's own engine.
- **Every cut has a cause.** Every cut lands on a beat; every transition has a cause; every on-screen line is a CLAIMS
  row.
- **Three framings.** 16:9 for the web, then 1:1 and 9:16 for social. The square and vertical cuts each get their own
  framing, not a crop, and everything sits inside the safe area.
- **Loudness and captions.** The web film is mastered to −16 LUFS, the social cuts to −14 LUFS, and captions ship with
  every cut.
- **No numbers on film.** The film never shows numbers that aren't published.
- **Unreleased features.** A feature appears on the page or on film only after the Pebble release that ships it is
  published.

## What we never do

- Decorative gradients, glass, neon, glow or purple. A released feature's own accent is the only exception, and only
  inside its own section.
- Bento grids, card grids, or icons on every feature.
- Logo walls, invented testimonials, stock photos, or invented UI.
- Scroll-jacking, scroll reveals on every section, autoplaying sound.
- Eyebrows, all caps, middle-dot meta strings, emoji, exclamation marks.
- "Magic", "seamless", "revolutionary", "secure", "private by design", "undetectable", "beats".
- Analytics, cookies, third-party requests.

## How we decide

Ask five questions:
1. Does it make the pebble louder, or the page noisier?
2. Does it show, or tell?
3. Can we prove it today?
4. Does it survive a 360 px phone, dark mode and paused motion?
5. Would a careful person, about to trust an AI with their project, feel calmer after seeing it?
