# Pebble × Lexington

Proposal from the direction lane, 2026-10-23. It applies the Lexington Themes philosophy (lexingtonthemes.com, by
Michael Andreuzza) to Pebble's landing page, in Pebble's own tokens and words.

- **Status.** A proposal. `docs/DESIGN.md` stays binding until the lead approves this. On approval, DESIGN.md gets a
  §10 that points here, and the rules this replaces (§10 below) are marked as superseded. OVERRIDES and CLAIMS still
  sit above both.
- **Inputs.** The distilled system: `LEXINGTON.md`. The four research lanes: `L1-philosophy.md` to
  `L4-signature.md`, in the session scratchpad (`…/scratchpad/lexington/`). Pebble's current build: `src/app/globals.css`,
  `src/components/sections/*`, comps 2 and 3, and the real stills in `public/ui/v1/`.
- **Comps.** `.work/design/lex-A/index.html` (structured, the recommended base) and `.work/design/lex-B/index.html`
  (at dusk, the bolder reading). Static files: no build step and no network (the site's own OFL fonts are embedded in
  each comp's `fonts.css`). They use the real pebble frames from the engine and the real 1.0.1 stills. Every visible
  string comes from `src/content/copy.ts` except the short labels listed in §11. They have **not been rendered** (CPU
  hold): `.work/design/LEX-SHOTS.md` has the exact shot commands for after the hold.
- **Licence.** Nothing from Lexington is copied: no code, CSS, token files, images, drawings or text. We take the
  method (a written, checkable policy and one loud thing) and generic vocabulary (a 12-column grid, hairlines, two-tone
  headings, one accent). Lexington's signature treatments (Navy's "///" labels on an arch gradient, Brightlight's
  painted tiles, Buio's dithered globe) are not reproduced.

---

## 0. The direction in one paragraph

Lexington's page is quiet so that one thing can be loud. Pebble already has the best possible loud thing: a living
character that is the product. So the move is subtraction. Square up and calm everything around the pebble: one
12-column grid with a label rail, hairlines instead of boxes, no resting shadows, a smaller and more exact type scale,
one sage accent with three written jobs, and two-tone headings built from sentences the claims review has already
approved. The pebble keeps its line, but the line stops wandering the margins: it becomes the ground the pebble
stands on wherever it appears. Real captures stay the proof, one moment per frame. The copy stays exactly as honest as
it is. Comp A is that policy applied faithfully; comp B shows how far the same roles stretch (dark first, statements
over a rule, square plates and pill buttons). **Recommendation: build A; keep B as Pebble's second theme, and graft
B's giant-wordmark footer into A if the lead likes it.**

---

## 1. What stays Pebble (non-negotiable)

1. **The real pebble is the one living element.** Same engine (`shared/pebble`), same rules: 30 fps, ≤ 0.5 Hz, a
   settle after 8 s, a still under reduced motion and Pause motion, the resting gaze straight at the visitor
   (DESIGN §9). It is still the "Say hi to Pebble" button.
2. **Real UI captures are the proof**, cropped to one moment per frame. No invented UI, no HTML mock-ups of the app
   (the explainers stay what they are: labelled "Interactive example", words verbatim).
3. **Honest copy.** Every factual sentence keeps its CLAIMS row; the honest line sits under every primary Download;
   the limits stay in full; no comparisons; "Shown with sample data." next to sample data.
4. **Sage is the single accent.** `--accent` #506E54 light, #A6C795 dark. No new hue.
5. **The galet** stays the one ownable shape: the play button, list marks, rail stones, the wordmark's full stop.
6. **The riverbed wallpaper** stays Pebble's photography: it frames product scenes, inside frames only.
7. **Accessibility and performance bars** stay or rise: AA everywhere (muted text ≥ 4.5:1 on every surface), visible
   focus, 320 px reflow, a skip link, keyboard explainers, self-hosted fonts within the 160 KB preload budget, the
   CSP, no third-party requests.

---

## 2. Pebble's theme sheet (Lexington's recipe, filled in for Pebble)

| | |
|---|---|
| Name / category | Pebble / a desktop AI companion, free and open source / v1.0.1 |
| One-line formula (internal) | A calm, open-source companion theme where the pebble carries the page. |
| Physical analog | A well-kept workshop notebook: ruled pages, one specimen pinned to each page, and a small stone on the desk that looks up when you come in. |
| Written for | A careful person who uses an AI helper on their own Mac and wants to see the evidence before trusting it. |
| Roles | page, panel, ink, muted ink, rule, action (§3.3), plus the pebble's own decorative colours |
| Accent jobs | (1) getting Pebble: the primary Download, the install command's Copy, the download icon; (2) focus rings and the text-selection tint; (3) state marks: the "Verified" galet, the installer's ticks, the selected mode on the dial. Nothing else (the wordmark's full stop is part of the logo). |
| Type | Fraunces 350 for H1 and H2 only; Inter 400 and 500 for everything else; Geist Mono for commands and paths |
| Grid sentence (A) | Twelve columns; the label rail is columns 1–3; every heading, lead and exhibit starts on column 4; media may span 1–12. |
| Section anatomy (A) | hairline, then the label in the rail, then H2, lead, one link, then the exhibit |
| The one loud thing | The living pebble on its line: hero, story rail, permission dial, install block, footer. Its photograph, the riverbed, appears only inside media frames. |
| Signature moves | the pebble always stands on a hand-drawn line; two-tone headings from approved sentences; evidence as ruled rows of real captures (the evidence ledger); the galet as the only free-form shape |
| Policy | radius 16 / 12 / 10 / 8 / 6 (media, panels, windows in pictures, controls, chips); hairlines only where a line means something; no resting shadows on page chrome (§3.5) |
| Motion | the pebble is the only orchestrated motion; everything else is a 200 ms colour or opacity change, a 2 px chevron nudge, a 0.98 press; all gated |
| Voice | as today: short declaratives with a period, the feature then its limit, numbers that say what they count, no "!", no hype, no comparisons |

---

## 3. Decisions

### 3.1 Grid with side labels: adopt, in sentence case

- **Decision.** One 12-column grid for the header, every section and the footer. Container 1280 px; side padding
  32 / 24 / 16 px and column gap 32 / 24 / 16 px at ≥ 1024 / 561–1023 / ≤ 560 px. Columns 1–3 are the label rail;
  everything starts on column 4. Below 1024 px it is one column, and the rail label becomes the section's running head:
  the name at the left and the fact at the right of one row under the hairline.
- **Why.** "The grid does the measuring." Fifteen sections that today alternate centred heads and five split ratios
  (5 | 7, 7 | 5, 4 | 8, 5 | 6, 1 | 1) will read as one system with one left edge.
- **Not eyebrows.** DESIGN §3 bans eyebrows and all-caps labels, rightly. A rail label is a different thing: it sits
  beside the heading, not above it; it is sentence case, 14 px, ink and muted ink, never uppercase, never tracked,
  never accent. On phones it becomes a running head (a ledger row), not a kicker over the H2.
- **The labels** are a short name plus a fact that is already true on the page (§11).

### 3.2 Typography: Fraunces stays for H1 and H2 only; Inter at two weights; one step smaller

- **Fraunces stays**, at 350 (SOFT 100, WONK 0, the 33 KB instance), for H1 and H2 and one footer statement, nothing
  else. Lexington's calm-trust SaaS themes do exactly this (Alfred: a regular-weight serif in two tones; Spaziobianco:
  a serif display on paper). Fraunces also carries the film's type, so the page and the film stay one identity, and
  its SOFT axis is the type that sounds like a pebble. It leaves the four places it has crept into: the AgentGuard
  intent line (now the H2's second line), the command-card quote, the memory recall rule, the FAQ title.
- **Inter stays** as the one sans: OFL, already self-hosted, and the closest open match to the SF Pro of the app's
  own captures, so the page's text and the captured UI read as one family. Lexington uses Inter in 15 of 51 themes;
  its tell is "Inter, a gradient, three rounded cards", the combination, not the font. We drop the other two. Switzer
  (Lexington's house face) would make the page look borrowed, and its Fontshare licence would need checking before
  any font file goes into a public Apache-2.0 repo; there is no need for it.
- **Two weights.** Inter 400 and 500 only. Today the modules use 550 (27 times) and 600 (29 times); all become 500.
  The wordmark's 650 stays: it is the logo, as in the app.

| Role | Face | ≥ 1280 | 1024–1279 | 561–1023 | ≤ 560 | Line height | Tracking |
|---|---|---|---|---|---|---|---|
| H1 (`.display-1`) | Fraunces 350 | 56 | 48 | 44 | 38 | 1.04 (1.06 phones) | −0.022 em |
| H2 (`.display-2`) | Fraunces 350 | 40 | 36 | 32 | 28 | 1.10 (1.14) | −0.018 em |
| Footer statement (`.display-3`) | Fraunces 350 | 30 | 30 | 27 | 24 | 1.15 | −0.014 em |
| Lead | Inter 400, `--ink-2` | 18 | 18 | 18 | 17 | 1.55 | 0 |
| Title (h3) | Inter 500 | 17 (stage titles 19) | | | | 1.4 | −0.005 em |
| Body | Inter 400 | 16 | | | | 1.6 | 0 |
| Small, captions | Inter 400 | 14 (captions 13) | | | | 1.5 | 0 |
| Label, meta | Inter 500 / 400 | 14 | | 13 | 13 | 1.4 | 0, `tabular-nums` |
| Fine print | Inter 400 | 12.5 | | | | 1.6 | 0 |
| Command | Geist Mono 400 | 14.5 | | | 12.5 | 1.5 | 0 |
| Wordmark | Inter 650 | 22 | | | | 1 | −0.7 px |

- Today: H1 66 / 43, H2 44–52, body 17, h3 Inter 600 at 19–24. The new H1 sits at the top of Lexington's SaaS range
  (36–60) because Fraunces at 350 needs a little more size than a grotesque at 500 to hold the page; the pebble, not
  the type, is the loud thing.
- `text-wrap: balance` on headings, `pretty` on paragraphs, `tabular-nums` on every number. Tight tracking never
  reaches small text.

### 3.3 Colour: six roles, one accent with three jobs

| Role | Token | Light | Dark | Notes |
|---|---|---|---|---|
| page | `--bg` | #F8F9F6 (98.1% .004 122), unchanged | #191E1B, unchanged | |
| panel | `--fill` (new) | #EDF0EB (95.1% .007 132) | #212822 | the one flat surface; muted ink on it 5.2:1 / 7.5:1 |
| ink | `--ink` | **#1D2520** (was #252C28): 14.9:1 | **#E8EEE6** (was #E0E7DE): 14.3:1 | close to Lexington's 15–20:1 range, still not black |
| muted ink | `--ink-2` | #5D665E, unchanged: 5.6:1 | #ADB9AB, unchanged: 8.3:1 | second heading lines, leads, captions, labels |
| rule | `--line` | **#DBE1D9** (was #E5E9E1): 1.26:1 | #2B342C, unchanged: 1.31:1 | the one hairline; on `--fill`, draw cuts in `--bg` |
| action | `--accent` | #506E54, unchanged: 5.4:1, white on it 5.7:1 | #A6C795: 9.0:1, #1B281A on it 8.2:1 | three jobs (§2) |
| the pebble's world | `--pebble`, `--pebble-eye`, `--trail`, `--stone` | unchanged | unchanged | decorative only, never chrome |

Retired from page chrome: `--bg-2`, `--soft`, `--line-2` (aliases to `--fill` / `--line` during the move), `--pool`,
`--room`, `--grain*`, the hero's backdrop. `--panel` (white) stays only inside the explainers, which recreate app UI.
Hard-coded colours left in `Toggle.module.css` (#222a24) and the `MediaFrame` fallback gradients become tokens.

### 3.4 Backgrounds: one ground

The page is `--bg` from top to bottom. No pool of light, no room vignette, no grain in comp A. The only "picture
grounds" are the riverbed inside media frames and `--fill` behind explainers and the command block. (Comp B keeps a
dim lamp behind the hero pebble as part of its loud thing; §4.)

### 3.5 Borders, shadows and radius

- **Hairlines** (1 px `--line`) only where a line means something: a section's top edge, ledger rows, the
  requirements strip, the FAQ, the chapters index. No boxes around text.
- **No resting shadows on page chrome.** Today there are 45 `box-shadow` declarations. After the move, the allowed
  list is:
  1. the pebble's contact shadow (part of the character);
  2. `--shadow-window`, only for an app window *inside* a riverbed picture (part of the picture);
  3. `--shadow-float`, only for floating layers: the sticky CTA, the menu sheet, the film dialog;
  4. a 1 px inset ring drawn by `::after` on media frames and plain crop frames (a hairline, not a shadow).
  `--shadow-control` and `--shadow-panel` become `none`.
- **Radius policy:** media frames 16 px (12 on phones), panels 12, windows inside pictures 10 (7 on phones), controls
  8, chips 6. Today: 28 / 20 / 12, 15 on the primary button. The galet is the only free-form shape on the page.

### 3.6 Section anatomy

```
<section class="sec">                         padding-top: var(--section)  (112 / 88 / 72 px)
  <div class="wrap grid-12 sec-head">          border-top: 1px solid var(--line); padding-top: 24px
    <p class="rail label">                     cols 1–3: name (ink 500) / fact (ink-2), then the film chip
    <div class="main">                         cols 4–12, a 9-column grid
      <h2 class="two-tone">                    span 8: the claim, then an approved second sentence in ink-2
      <p class="lead">                         span 5, margin-top 20
      <p class="actions">                      one text link with a chevron, margin-top 24
  <div class="wrap grid-12 sec-body">          margin-top 56 (40 below 1024): the exhibit, in cols 4–12 or 1–12
```

One new primitive does this for the fourteen sections after the hero: `SectionHead` (props: `id`, `label`, `title`,
`then?`, `lead?`, `chip?`, `actions?`). It replaces the centred `.section-head` (8 sections) and the 6 bespoke heads
(Film, AgentGuard, Views, Install, Limits, Open source).

**Two-tone rule (checkable):** a heading gets a second, muted line only when that line is an approved sentence of
60 characters or fewer; otherwise one tone plus a lead. Never an accent colour, never italic, never a split sentence.

### 3.7 Hero composition: a 6 | 6 split, the pebble's field on the right

- **Comp A.** Words in columns 1–6: the H1 at the top, then the lead, the CTA row (Download, then "View on GitHub ›"
  as a text link), the honest line and the release facts pinned to the bottom. The pebble's field in columns 7–12:
  the pebble (a 400 px box, so a 236 px body, larger than today's 212) standing on its line, with
  "The pebble on this page uses the same animation engine as the app." as its caption. No backdrop. The hero is
  sized so the film poster's top shows above the fold at 1440 × 900 (to confirm on the shots).
- **Why not centred any more.** Comp 3's centred stack was right for a page built around one axis. On a page with one
  left edge, a centred hero is the one section that does not obey the grid. The split is Lexington's SaaS hero (words
  pinned top and bottom, the picture beside them), and it makes the pebble bigger, not smaller.
- **Phones.** The pebble first (236 px box), then the H1, lead, a full-width Download, the honest line and the facts.
- **Comp B** keeps a centred composition on purpose: a small field with one subject (the pebble under its lamp on a
  line from edge to edge), then the H1 large at the bottom left and the lead and CTA at the bottom right.

### 3.8 How product UI is framed

- **A scene** (a desktop, a window with the pebble beside it, the film poster) sits on the riverbed in a media frame:
  radius 16, a 1 px inner ring, no outer shadow. The window inside keeps its own soft shadow.
- **A moment** (one card, one Activity step, one reply) is a crop of a real still (the existing `UiCrop` boxes) in a
  plain frame: radius 12, a 1 px `--line` ring, on the page ground. Text inside a crop must render at 12 px or more:
  that sets each crop's width, and phones switch to the existing tighter phone crops.
- **An explainer** (approval card, permission dial, forget card) sits on flat `--fill`, never on the riverbed, so a
  recreation is never mistaken for a capture (DESIGN §5 row 5's rule, kept).
- One moment per frame; no full-window screenshot outside the film poster.

### 3.9 The pebble's path: reduce it to ground

- **Decision.** The line stops being one page-tall path through the margins. It becomes **local ground**: the same
  stroke (1.35 px, `--trail`, hand-drawn, faded at both ends) drawn where something stands or moves on it:
  1. the hero, under the pebble;
  2. the story rail, through the four stones, with the guide pebble walking it;
  3. the permission dial, as its arch;
  4. the footer, under the sleeping pebble;
  5. Privacy keeps its strands as a diagram of its own.
  The AgentGuard "gate" and the S-sweeps between sections go.
- **Why, five reasons.**
  1. *Lexington's rule:* lines only where a line means something. A line that sweeps across the page between sections
     is decoration, and it crosses the label rail and the hairlines the grid now depends on.
  2. *One loud thing:* the pebble moves; a second drawing that wobbles and draws itself on with scroll competes with it.
  3. *Meaning survives:* the pebble always stands on the same line; repetition carries the continuity (Spaziobianco's
     "one loud element, repeated in many shapes").
  4. *Simpler code and pages:* no page-tall SVG rebuilt by a ResizeObserver from 19 anchors; the 12 modules' 900–1279 px
     rules that pull content 48 px in "clear of its sway" can be deleted.
  5. *Phones already did this:* below 560 px the line already kept only its anchors.
- **Static.** No wobble and no draw-on; the motion budget belongs to the pebble.

### 3.10 Motion

- **Kept:** the living pebble and its poses; the guide pebble's walk along the rail (560 ms, answers a click); the
  dial; the approval-card demo; Forget; the copy confirmation; the film dialog; the FAQ caret; the hero's one-time
  text reveal (CSS, 8 px, 480 ms); Pause motion and reduced motion exactly as in DESIGN §4.
- **Changed:** every hover becomes a 200 ms ease-out colour or opacity change; text links nudge their chevron 2 px;
  buttons press to 0.98. The play button's hover scale drops from 1.04 to 1.03.
- **Removed:** the line's sine wobble and its draw-on with scroll; any `filter: drop-shadow` on controls.
- **Never:** Lenis or any smooth-scroll inertia (most Lexington themes ship it; scroll-jacking stays banned).

### 3.11 Voice

Pebble's copy is already Lexington's voice: sentence case, periods, no "!", the feature and then its limit. Three
additions, all checkable:
1. two-tone headings only from approved sentences (§3.6);
2. rail labels as name plus fact (§11);
3. text links carry the actions that are not Download: "View on GitHub ›", "Read the limits ›", "Read the transcript ›".

### 3.12 Accessibility and performance targets

Lighthouse at least today's scores, aiming at Lexington's published 99+ / 100 / 100 / 100 (mobile and desktop), axe clean, no horizontal scroll at 320 px,
focus visible on every control, a skip link (Lexington mostly lacks one), muted text ≥ 4.5:1 on `--bg` and `--fill`,
one `<h1>`, labelled landmarks, `aria-pressed` on the theme and motion toggles. Removing the page-wide path and the
hero backdrop lowers main-thread and paint work.

---

## 4. The two comps

| | Comp A, "structured" (recommended) | Comp B, "at dusk" |
|---|---|---|
| Reading of Lexington | the SaaS family (Navy's rail, Brightlight's split hero and two-tone, Alfred's calm) | the editorial range (Kotei's statement over a rule, Buio's dark discipline, Prima Persona's binary radius, a giant footer wordmark) |
| Ground | light first, sage-white; dark is a swap | dark first, a deeper night ground (#121714, 19.8% L); light is a swap |
| Grid sentence | 12 columns; the rail is 1–3; everything starts on 4 | 12 columns; the statement spans 1–10 over a full-width ink rule; a caption in 1–4, the content in 5–12 |
| Display | H1 56, H2 40 | H1 84, H2 56 (statements) |
| Radius | 16 / 12 / 10 / 8 / 6 | binary: plates square, controls pills |
| Hero | 6 \| 6 split: words left, the pebble's field right | a centred field: the pebble under a dim lamp on a line from edge to edge; H1 bottom left, lead and CTA bottom right; the facts as a ruled four-cell strip |
| Film | the poster first, full width; the caption on the grid with a ruled three-column chapter index | statement, rule, caption beside a square plate, two-column chapter index |
| AgentGuard | the evidence ledger: three ruled rows, each the app's own words as the title and a real capture beside them; then "Reliability, not security." as a row | held and verified as two windows on one plate in a diagonal; the scope challenge as a ruled row; "Reliability, not security." as the page's one inverted band |
| Project story | horizontal rail: four stones on the line, the guide pebble on 01; the stage below as a 4 \| 5 split | Alfred-like three columns: caption, four steps on a vertical line with the guide pebble at 01, the stage |
| Install | requirements strip, the command on `--fill` with the perched pebble, the two ways | requirements as a ledger in the caption; the command on an inverted panel |
| Footer | "Pebble is resting. / No telemetry." beside the sleeping pebble on its line; the colophon on the grid | the wordmark set huge, tone on tone, with the sleeping pebble as its full stop on the line |

**Why A first.** It is the faithful reading the person asked for, it keeps the brand's light sage identity, and it maps
onto the existing components one for one. B proves the system holds a second theme (a theme is a token file plus a
grammar), and its footer is the strongest single idea in either comp: if the lead wants it, graft it into A
(tone-on-tone letters, the sleeping pebble as the full stop, the line along the baseline).

---

## 5. Token and base CSS changes (`src/app/globals.css`)

```css
:root {
  --bg: #f8f9f6;
  --fill: #edf0eb;                 /* new: the one flat panel */
  --panel: #ffffff;                /* explainers only (recreated app UI) */
  --ink: #1d2520;                  /* was #252c28 */
  --ink-2: #5d665e;
  --line: #dbe1d9;                 /* was #e5e9e1 */
  --accent: #506e54; --on-accent: #ffffff; --accent-press: #45604a;
  --pebble: #536b54; --pebble-eye: #ffffff; --trail: #aabda7; --stone: #bfcebc;
  /* migration aliases: delete once no module uses them */
  --bg-2: var(--fill); --soft: var(--fill); --line-2: var(--line); --code-bg: var(--fill);
  --w-content: var(--container); --gutter: var(--pad);
  /* layout */
  --container: 1280px; --pad: 32px; --gap: 32px; --header-h: 64px; --section: 112px;
  /* radius */
  --r-media: 16px; --r-panel: 12px; --r-card: var(--r-panel); --r-window: 10px; --r-control: 8px; --r-chip: 6px;
  /* shadows: none on page chrome */
  --shadow-control: none;
  --shadow-panel: none;
  --ring: inset 0 0 0 1px rgba(var(--shade), 0.07);      /* frames: drawn by ::after over the picture */
  --shadow-window: 0 1px 2px rgba(var(--shade), 0.08), 0 14px 36px -10px rgba(var(--shade), 0.22); /* inside a picture */
  --shadow-float: 0 0 0 1px var(--line), 0 16px 40px -12px rgba(var(--shade), 0.24);             /* floating layers */
}
:root[data-theme="dark"] { --fill: #212822; --ink: #e8eee6; /* the rest as today */ }
@media (max-width: 1023px) { :root { --pad: 24px; --gap: 24px; --section: 88px; --header-h: 60px; } }
@media (max-width: 560px)  { :root { --pad: 16px; --gap: 16px; --section: 72px; --header-h: 56px; --r-media: 12px; --r-window: 7px; } }
```

Base type: `body` 17 → 16 px; `h1` → 56 / 48 / 44 / 38 at −0.022 em; `h2` → 40 / 36 / 32 / 28 at −0.018 em; `h3` →
Inter 500, 17 px / 1.4; `h4` → 500; `.lead` → 18 px (17 on phones); `.small` → 14 px. New helpers next to `.section`:
`.wrap` (`width: min(var(--container), 100% - 2 * var(--pad)); margin-inline: auto`), `.grid-12`, `.rail`, `.main`,
`.sec-head`, `.label`, `.two-tone`, `.chev` (text link with a chevron that moves 2 px). `.facts` becomes left-aligned
by default (`justify-content: flex-start`). Delete `.section-head`, `--w-head` and the hero's `--pool` / `--room` /
`--grain` once their users are gone.

---

## 6. Section-by-section restyle plan

Each entry: the files, what changes, what stays. Class names are today's.

### Header (`shell/SiteHeader.tsx`, `SiteHeader.module.css`, `Wordmark.module.css`)
- `.bar`: `grid-template-columns: 1fr auto 1fr` → the page grid inside `.wrap`: the wordmark in columns 1–3 (left, no
  longer centred), the section links from column 4 (`.navLeft`, 14 px, 400, `--ink-2`, hover `--ink`), GitHub, Pause
  motion, the theme and the CTA right-aligned in 9–12. Height 76 → 64 (60 / 56 below).
- `.header`: always `background: var(--bg)` with a 1 px `--line` bottom edge; drop the scrolled blur and saturation.
- The CTA: `GetPebble variant="ghost"` → a new `variant="small"`: 36 px, radius 8, ink fill, `--bg` text, hover
  opacity 0.85. (The hero's Download is the accent one.)
- Wordmark 25 → 22 px. The menu sheet: radius 24 → 16 at the bottom corners, `--shadow-float`.
- Stays: the dialog behaviour, the honest line under the sheet's Download, the toggles.

### 1. Hero (`Hero.tsx`, `Hero.module.css`, `Hero.client.tsx`)
- Delete `.backdrop`, its `::before` / `::after` pools and `.grain`.
- `.hero` → `.wrap.grid-12`, `min-height: 600px`, `padding-block: 72px 64px`. New `.copy` (columns 1–6, flex
  column, `justify-content: space-between`): `.title` at the top; `.lead` (max 30 em), `.cta`, `.honest`, `.facts` at
  the bottom, all left-aligned. `.stage` moves into a `figure.field` (columns 7–12, `align-self: center`): `--size`
  360 → 400 px (340 at 1024–1279, 300 tablet, 236 phones); a local `Horizon` under the floor; the caption
  `hero.pebble.note` (13 px `--ink-2`) under it.
- `.quiet` ("View on GitHub") → `.chev`. `.honest`'s "Read the limits" → `.chev`.
- `.bubble`: `--fill`, radius 12 12 12 4, no shadow. `.dlNotice`: `--fill`, radius 12, no shadow.
- Phones: `.field` first (`order: -1`), the caption hidden, the Download full width.
- Stays: the live pebble and HeroHello, the reveal (`.reveal`, `--i`), HeroCta and the download notice's words, the
  non-Mac notice, the release facts.

### 2. Film (`Film.tsx`, `Film.module.css`, `media/FilmTrigger.module.css`)
- `.film`: `padding-top: 8px` (the poster peeks above the fold); `.screen` spans the container (1280 px), 16 : 9.
- `.caption` → `.wrap.grid-12`: the rail label "The film / Plays with sound." (or the duration, §11); the main column:
  H2 (one tone), `.lead` (span 5), "Read the transcript ›", then `.chapters` as a three-column ruled index (each
  `li` `border-top: 1px solid var(--line)`, time first in `--ink-2` tabular, then the title in ink; two columns on
  tablets, one on phones).
- `.chapterMark` (accent on hover) → a 9 px `--stone` galet before the time, no hover colour; hover underlines the
  title.
- `.meta` facts row folds into the label and the actions.
- FilmTrigger: drop `filter: drop-shadow(…)`; hover scale 1.04 → 1.03; the galet fill `--panel` → `--bg`; the play
  triangle in ink, not the accent (playing the film is not one of the accent's jobs).
- Stays: the poster logic, the T0 teaser and its deferral, `data-film="ready"` gating, the dialog.

### 3. AgentGuard (`AgentGuard.tsx`, `AgentGuard.module.css`, `AgentGuard.client.tsx`)
- Head through `SectionHead`: label "AgentGuard / The evidence layer"; H2 two-tone: `agentGuard.heading` +
  `agentGuard.intent` ("Evidence before “done”." / "An agent shouldn’t grade its own work."); lead `layer[0]`; body
  `layer[1]` (span 6, 16 px `--ink-2`).
- Delete the sticky 5 | 7 split, `.intent` (now the H2's second line) and `.reliability`'s box.
- New **evidence ledger** in columns 4–12: three rows, `border-top` hairlines, `padding-block: 32px`, each a 3 | 6
  split inside the 9-column main:
  1. title `“5 file(s) changed that the task does not reach”` (`challenge.summary(5)`), caption `challenge.caption`
     + "Shown with sample data.", crop `CHALLENGE` / `CHALLENGE_PHONE`;
  2. title `“Pebble’s change isn’t verified yet.”` (`held.message`), caption `layer[2]` + "Shown with sample data.",
     crop `HELD` / `HELD_PHONE`;
  3. title with the accent galet + `“Verified · pytest 42 passed on current files”` (`result`), caption the lead's
     second sentence + `resultCaption`, crop `VERIFIED` / `VERIFIED_PHONE`.
  Crops in a plain frame (radius 12, `--line` ring), 624 px wide at 1440 so their text renders at 12 to 14 px.
- "Reliability, not security." becomes the last ruled row: the title (columns 4–6), the body and its three points as
  a three-column hairline list (columns 7–12).
- `EvidenceToggle` retires: the ledger shows both states without JavaScript. Keep the component if the lead prefers
  the interaction on phones. The `gate` path anchor goes.
- Stays: every string, every crop box, the chip ("tested").

### 4. On your desktop (`OnYourDesktop.tsx`, `OnYourDesktop.module.css`)
- `SectionHead`: label "On your desktop / Joins every Space"; H2 one tone; lead.
- `.vignette` spans columns 1–12 (16 : 10; 4 : 5 on phones); `MediaFrame` radius 16, ring only.
- `.caption` left-aligned under the frame. `.points`: the three facts as a three-column hairline list aligned to
  columns 4–12; `.limit` under them in columns 4–12.
- Stays: the quick-chat capture, the live pebble in the corner, loop L1 handling.

### 5. Works in your project (`ProjectStory.tsx`, `ProjectStory.module.css`, `ProjectStory.client.tsx`)
- `SectionHead`: label "In your project / How a coding task goes"; H2 one tone; lead `project.note`.
- `.railWrap`: left-aligned across columns 4–12 (was centred at 780 px). The line through the stones is a local
  `Horizon` behind `.rail` (the `stop` anchors go). `.tabLabel` weight 600 → 500; `.tabLabel b` accent → `--ink-2`.
- `.panels` → a 4 | 5 split under a hairline: `.words` (columns 4–7), the picture (columns 8–12).
- `.sage` (`--soft`, radius 28) → `--fill`, radius 12. Real captures on the riverbed tile (one card centred, about
  1 : 1 scale); explainers on `--fill`.
- `.quoteText` (Fraunces) → Inter 500, 18 px, with curly quotes; `.verdictList` keeps the galet marks, the verified
  line in ink with the accent galet.
- Stays: the tabs, the guide pebble's walk, the panels' content, the no-script rule, the loops' phone logic.

### 6. Your model, your choice (`Models.tsx`, `Models.module.css`)
- `SectionHead`: label "Models / Three ways in"; H2; lead.
- `.ways` → three columns in columns 4–12 (Buio's bare columns): each `li` with a hairline top, the title (17 px 500),
  body (16 px ink), limit (14 px `--ink-2`). Then the picture (columns 4–9, riverbed 16 : 10) beside `.note` and the chip
  (columns 10–12).
- Stays: the crop boxes and the loop L2 logic.

### 7. You set the pace (`Pace.tsx`, `Pace.module.css`, `explainers/PermissionDial*`)
- `SectionHead`: label "Permissions / Three modes"; H2 two-tone "You set the pace." / "Pick one of three modes in
  Settings › Permissions." with the lead's second sentence as the lead (§11: a split of an approved lead).
- The dial stays centred within columns 4–12: it is an object, like the pebble. Its arch is drawn by the dial itself
  (a local arc in the line's hand; the `arc` anchor goes). The dial's mode panel: `--bg-2` + ring + radius 14 →
  `--fill`, radius 12, no ring.
- `.every`: the quote in columns 4–8, the fixed rules in 9–12, under one hairline.
- Stays: the modes' verbatim words, the attribution, the pebble under the arch.

### 8. Memory you can read and forget (`Memory.tsx`, `Memory.module.css`, `explainers/MemoryForgetDemo.module.css`)
- `SectionHead`: label "Memory / Six labelled layers"; H2; lead; the chip in the rail.
- `.layersRow`: the `dl` in columns 4–8, the Settings sheet on the riverbed in columns 9–12. `.name` 17.5 / 600 →
  16 / 500; `.term` 13.5 → 13 px.
- `.controlRow`: the forget demo on `--fill` (columns 4–8), the rules in 9–12. `.recall` (Fraunces 22–26) → Inter 500,
  18 px / 1.45, ink.
- Stays: the layers, the sheet crop, the galet list marks, the demo's behaviour and words.

### 9. Views, and what else is inside (`ViewsAndTour.tsx`, `ViewsAndTour.module.css`)
- `SectionHead`: label "Views / Built from data"; H2; then a 4 | 5 split: text (columns 4–7) and the dashboard crop on
  the riverbed (columns 8–12).
- `.orchestration`: the title in columns 4–6, the points in 7–12 (today's 4 | 8, re-based on the grid). `.tour`: the
  two-column ruled `dl` across columns 4–12, `dt` weight 600 → 500.
- Stays: the crop maths, the loop L8 logic, all items.

### 10. Built like infrastructure (`Infrastructure.tsx`, `Infrastructure.module.css`)
- `SectionHead`: label "Engineering / Facts, not benchmarks"; H2; lead `stack`.
- `.ledger`: centred at 880 px → columns 4–12, the term in 4–6 (Inter 500), the text in 7–12. `.note` under it.
- Optional, after a claims check: "numbers as type" (8,421 / 1,772 / 40 at 40 px tabular, each with its words below).
  The default is the ledger, which keeps the sentences whole.

### 11. Private by default (`Privacy.tsx`, `Privacy.module.css`, `Privacy.strands.tsx`)
- `SectionHead`: label "Privacy / No telemetry"; H2 two-tone "Private by default." / "Your conversations and memories
  are stored on your Mac." with the lead's second sentence as the lead (§11). Both columns stay right under it, so
  "Private by default" is never read as "nothing leaves" (OVERRIDES §8 C1).
- `.diagram` re-based on columns 4–12; the node and strands stay (a line with meaning); the line's `stop` through the
  node becomes the strands' own origin.
- `.stored`: `--bg-2` + inset ring + radius 20 → `--fill`, radius 12, no ring; its notes' hairline in `--bg`.
- Stays: the five destinations, both columns' notes, the narrow-screen comb.

### 12. Install (`Install.tsx`, `Install.module.css`, `Install.pill.tsx`)
- `SectionHead`: label "Install / Version 1.0.1" (from `release.version`); H2 two-tone "Install Pebble." / "One line in
  Terminal, or the zip by hand."; lead "Both install the same app from the GitHub release." (§11).
- `.head` split deleted; `.requirements` strip in columns 4–12 (unchanged otherwise).
- `.pill` → a flat block: `--fill`, radius 12, no `--shadow-panel`, `padding: 8px 8px 8px 22px`. `.copy`: radius 13 →
  8, height 44, Inter 500. The perched pebble stays on its top edge.
- `.download`: `--panel` + inset ring → `--fill` button. `.steps li::before` (filled circles in `--soft` with accent
  numbers) → plain tabular numerals in `--ink-2`, no badge. `.inner code` chips: `--fill`, radius 4, no ring.
- `.ways` and `.after` as 4 | 5 splits inside the main column.
- Stays: every line of copy, the checksum note under its step, the honest line next to the downloads, the live and soon
  states, the Copy behaviour and the pebble's tap.

### 13. What Pebble isn't (yet) (`Limits.tsx`, `Limits.module.css`)
- `SectionHead`: label "Limits / Stated plainly"; H2 two-tone "What Pebble isn’t (yet)" / "Pebble states its limits
  plainly."; lead "These are the ones to know before you install it." (§11).
- `.list` (CSS columns with galet marks) → a two-column ruled list across columns 4–12: each item a hairline row; the
  four release limits first, in ink; the product limits with the title in Inter 500 and the body in `--ink-2`; no marks.
- Stays: all fifteen limits word for word, the order, the `#limits` anchor.

### 14. Free and open source, and the FAQ (`OpenSourceFaq.tsx`, `OpenSourceFaq.module.css`)
- `SectionHead`: label "Open source / Apache-2.0"; H2 two-tone "Free and open source." / "Pebble's code is on GitHub
  under the Apache License 2.0."; lead, the rest of `openSource.lead` (§11).
- `.inner`: the repo card and links in columns 4–6, the FAQ in 7–12. `.repo`: `--panel` + `--shadow-panel` + radius
  20 → `--fill`, radius 12. `.faqTitle` (Fraunces) → Inter 500, 17 px. `.question` 17 / 600 → 16 / 500.
- Stays: no star count, `<details>` with ids, the hash opener, the caret.

### 15. Final call to action (`FinalCta.tsx`, `FinalCta.module.css`)
- From centred to the grid. `SectionHead`: label "Get Pebble / 72 MB" (the release size); H2 two-tone `finalCta.h2` +
  `finalCta.lead` ("Say hi to Pebble." / "Free and open source, for Macs with Apple silicon."). Then, at column 4, the
  CTA row (accent Download + "View on GitHub ›"), the facts, the honest line, "Or install in one line ›".
- Stays: the platform logic, the honest line under the Download, the chip.

### Footer (`shell/Footer.tsx`, `Footer.module.css`, `Footer.stamp.tsx`, `Toggle.module.css`)
- `.rest` → `.wrap.grid-12` under a hairline: a two-tone `.display-3` statement from `footer.resting` ("Pebble is
  resting." / "No telemetry.") in columns 1–6, the sleeping pebble on its `Horizon` in columns 7–12 (the same columns
  as the hero's pebble: awake at the top, asleep at the bottom). Delete `.restLight`.
- `.colophon`: `grid-template-columns: auto 1fr auto` → the page grid: the wordmark in 1–3; "Pebble" (GitHub,
  Releases) in 4–6; "This site" (Film transcript, Credits, Privacy) in 7–9; "Appearance" (the theme as words, Light /
  Dark / System with `aria-pressed`, and Pause motion) in 10–12. `.fine` in columns 4–12, 12.5 px.
- Toggle `.pill`: radius 11 → 8, `--bg-2` → `--fill`, the hard-coded dark #222a24 → the token.
- Optional graft from comp B: the wordmark set huge (tone on tone, Inter 650, about 21 vw) with the sleeping pebble as
  its full stop on the line.
- Stays: the honesty stamp (counted live), the bloub credit, the licence line, the trademark lines.

### Shared components
- `MediaFrame`: radius `--r-media`; `box-shadow: var(--shadow-media)` → none, plus an `::after` ring (`var(--ring)`)
  above the picture; `variant="panel"` → `--fill`. Fallback gradients become tokens.
- `AppWindow`: radius `--r-window`; keeps `--shadow-window` (it is inside a picture).
- `UiCrop` `data-frame="window"`: radius 14 → `--r-panel`; `--shadow-frame` → none, plus the `--line` ring when the
  crop sits on the page; the window shadow only when it sits on a riverbed.
- `GetPebble`: `.primary` 54 px, radius 15, `--shadow-control` → 48 px, radius 8, no shadow, Inter 500 16 px;
  `.ghost` → `.small` (header); `.compact` (sticky) → 44 px, radius 8.
- `ChapterChip`: the mark's accent → `--stone`; weight 550 → 500. The "Interactive example" label's galet
  (`.example::before` in the explainers and AgentGuard) → `--stone`. The Pause-motion toggle's pressed state (an accent
  tint) → `--fill` with an ink icon.
- `StickyCta`: radius 18 → 12, `--panel` → `--bg`, `--shadow-float` (it floats).
- `PebblePath` → replaced by `Horizon` (a small server component: a fixed hand-drawn path per instance, 1.35 px
  `--trail`, `vector-effect: non-scaling-stroke`, a fade at both ends, `aria-hidden`). Delete the 19
  `data-path-anchor` attributes and the 12 inset media queries.
- The explainers keep their app-faithful insides (they recreate the app); only their stages change (`--fill`, 12 px).

---

## 7. Order of work

| Phase | Scope | Done when |
|---|---|---|
| P0 | Tokens and kill switches in `globals.css` only (§5): ink, line, fill, radii, shadows to none or ring, base type, aliases. | The page renders with no layout change but flatter and smaller; the shots at 1440 / 390 × light / dark look right. |
| P1 | Primitives: `.wrap`, `.grid-12`, `SectionHead`, `.label`, `.two-tone`, `.chev`, `Horizon`, GetPebble variants, Toggle. In `copy.ts`, `label` and `then` fields, after the claims check (§11). | Typecheck and tests pass; the primitives render on a `/system`-style page. |
| P2 | Bookends: header, hero, footer. | The first and last screens match comp A. |
| P3 | The line: remove `PebblePath`, the anchors and the 12 inset rules; local horizons in the hero, story rail, dial and footer; Privacy strands on their own. | `grep -rn data-path-anchor src` is empty; no layout jumps on resize. |
| P4 | Proof: Film (figure first), AgentGuard (ledger), Install, Limits. | Every crop's text is ≥ 12 px at 1440 and on phones. |
| P5 | Explain: On your desktop, the project story, Models, Pace, Memory, Views, Infrastructure, Privacy, Open source and FAQ, the final CTA. | Every section's head and exhibit start on column 4 under a hairline. |
| P6 | QA and the written system. | The checks in §12 pass; DESIGN.md §10 points here. |

Each phase is its own commit, shot at 1440 and 390 in both themes (`.work/design/LEX-SHOTS.md` has the shot tooling)
and judged against comp A before the next one starts.

---

## 8. What stays as it is

Every word in `copy.ts`, `faq.ts` and `chapters.ts` (apart from the §11 additions); the pebble engine, its poses and
its rules; the galet; the riverbed rasters; the real stills and every crop box; the explainers' behaviour; the film
player, chapters, captions and transcript; the platform CTA logic (Mac and other); the honest lines and where they
sit; Pause motion and reduced motion; the theme bootstrap; self-hosted fonts and their budget; the CSP; `release.ts`;
the section order; the anchors (`#install`, `#limits`, `#faq` …).

---

## 9. Comp B as Pebble's second theme

A theme here is a token file plus a grammar. B keeps the same six colour roles with different values (a deeper night ground
#121714, ink #EBF0EA at 15.7:1, muted #AAB5A8 at 8.5:1, rule #262E27, accent #A6C795 at 9.7:1, the lamp #232C25, a
tone-on-tone wordmark #212923, an inverted band) and changes the grammar: statements one step larger over a full-width
ink rule; a caption column in 1–4 beside content in 5–12; plates square and controls pills (binary radius); the hero
as a field with one subject. Nothing in B needs new copy beyond A's labels. If the site ever offers both, the theme
switch can carry it, but one theme per page at a time: "mixing themes reads as two websites".

---

## 10. Changes to DESIGN.md that need the lead's sign-off

| DESIGN.md today | This proposal | Recommendation |
|---|---|---|
| §1 base comp 3, "Pebble at the centre": centred hero; centred section heads | a 6 \| 6 split hero; heads on a label rail | approve |
| §2 the one bold idea: one path that "carries the page" through margins, a gate and S-sweeps | the line as local ground under the pebble (§3.9) | approve |
| §3 H1 66 / 43, H2 44–52, body 17; Fraunces also on the intent, quote, recall and FAQ title | H1 56 / 38, H2 40 / 28, body 16; Fraunces on H1 and H2 only | approve |
| §3 bans eyebrows and all-caps labels | keeps the ban; adds sentence-case rail labels beside headings (not eyebrows) | approve, with the §3.1 definition |
| §4 the line draws itself on with scroll, with a sine wobble | static lines | approve |
| §5 row 0 header with a centred wordmark | the wordmark left, on the grid | approve |
| §5 row 1 the pebble in a pool of light | no pool in comp A (comp B keeps a lamp) | approve for A |
| §5 row 3 AgentGuard as a split with an Interactive-example toggle | the evidence ledger, static | approve; keep the toggle on phones only if wanted |
| §6 media frames radius 28 with a green-tinted shadow | radius 16 with a 1 px ring, no outer shadow | approve |
| §5 row 15 the footer's dimmer pool of light | the sleeping pebble on its line beside a two-tone statement | approve |

---

## 11. New copy that needs a claims check

All are short labels or re-splits of approved strings; none adds a fact.

| Where | Text | Source |
|---|---|---|
| Rail labels | "The film / Plays with sound." | `film.playNote` (or "The film / 1:16, with sound." from `FILM_DURATION_SECONDS`, a new combination) |
| | "AgentGuard / The evidence layer" | `agentGuard.layer[0]` "an evidence layer" [C-AG-7] |
| | "On your desktop / Joins every Space" | `desktop.lead` [C-DESK-1] |
| | "In your project / How a coding task goes" | `project.rail.label` |
| | "Models / Three ways in" | `models.cards` (three ways) [C-MOD-2..7] |
| | "Permissions / Three modes" | `pace.lead` [C-PACE-1] |
| | "Memory / Six labelled layers" | `memory.layers` [C-MEM-7] |
| | "Views / Built from data" | `views.lead` "from data" [C-VIEW-1] |
| | "Engineering / Facts, not benchmarks" | `infrastructure.note` [C-INF-6] |
| | "Privacy / No telemetry" | `privacy.stays` [C-PRIV-5] |
| | "Install / Version 1.0.1" | `release.version` [C-REL-1] |
| | "Limits / Stated plainly" | `honestLimits.lead` |
| | "Open source / Apache-2.0" | `openSource.repoCard.licence` [C-OSS-1] |
| | "Get Pebble / 72 MB" | `release.sizeLabel` [C-REL-2] |
| Two-tone splits (same words, the lead cut after its first sentence) | Install, Pace, Privacy, Limits, Open source | `install.lead`, `pace.lead`, `privacy.lead`, `honestLimits.lead`, `openSource.lead` |
| Two-tone pairs from two approved strings | AgentGuard (`heading` + `intent`), final CTA (`h2` + `lead`), footer (`resting`, split at its period) | already approved |
| Footer column names | "Pebble", "This site", "Appearance" | interface labels |

Rendering rule for `copy.ts`: add `label: { name, fact }` and, where used, `then` to each section object; never
render a label or a second line that has no CLAIMS row.

---

## 12. The checklist: a Lexington-grade Pebble page

Run after P6 (greps from the repo root):
1. `grep -rnE "font-weight: (550|600)" src/components src/app` finds nothing (650 only in `Wordmark.module.css`).
2. `grep -rn "box-shadow" src/components src/app` finds only `--shadow-window`, `--shadow-float`, the `--ring`
   overlays and the contact shadows.
3. `grep -rn "var(--font-display)" src/components` finds only the display helpers and the footer statement.
4. `grep -rn "data-path-anchor\|900px) and (max-width: 1279px)" src` finds nothing.
5. `grep -rn "var(--accent)" src/components` finds only the three jobs (§2) and the focus styles.
6. Every section starts with `SectionHead`; every heading, lead and exhibit starts on column 4 at 1440.
7. Contrast: ink ≥ 14:1, muted ink ≥ 4.5:1 on `--bg` and `--fill`, in both themes.
8. One `<h1>`; a skip link; focus visible; 320 px reflow without horizontal scroll; Lighthouse no lower than today, aiming at 99+ / 100 / 100 / 100.
9. Reduced motion and Pause motion leave only stills; the pebble is the only thing that moves on its own.
10. The swap test: change the six role values and the whole page follows, the pebble's line included.
