# Design decision — Pebble landing page

Decided by the lead on 2026-10-23 after judging three static comps (`.work/design/comp-{1,2,3}/`, screenshots in each
folder). This file is binding for the site build. It sits under `.work/research/OVERRIDES.md` (product facts, claims and
copy rules) and above MASTER_PLAN §7 where they differ. Since the v2 system, `docs/PHILOSOPHY.md` and
`docs/DESIGN-LEXINGTON.md` supersede it wherever they differ (§10).

## 1. The decision

**Base: comp 3, "Pebble at the centre"** (`.work/design/comp-3/index.html`). Port its markup patterns, CSS tokens,
spacing and the line device into the Next.js components. Don't copy its approximations; see §8.

**Grafts from comp 2, "The desktop is the stage"** (`.work/design/comp-2/`):
- **The riverbed wallpaper** (`assets/wallpaper-{light,dark}.svg`: speckled sage stones lit from the upper left) is the
  world that frames product media: the film poster, the "On your desktop" vignette and the loop frames. Rasterise it to
  AVIF/WebP at 2× for the site; never ship the 87 KB feTurbulence SVG on the critical path.
- **Split layouts** for content-heavy sections: AgentGuard, Install, and What Pebble isn't (yet). The page has a central
  axis but is never monotonously centred. Text longer than three lines is left-aligned.
- **The galet silhouette as the one ownable brand device** (critic M9): the play button, chapter marks, the dial thumb,
  media masks and the wordmark's period.

**Rejected: comp 1, "Quiet editorial".** Its heavy display serif and its hero without product read as the generated
"cream + serif" look. It also used an unsourced line ("It never phones home").

## 2. The one bold idea: the pebble's path

A single hand-drawn line leaves from under the hero pebble and carries the page:
- it is the **progress rail** of the project story (four stones, with the guide pebble on the current step);
- it is the **arch of the permission dial** (the pebble under the arch looks at the chosen mode; its gaze is the needle);
- it passes the **AgentGuard checkpoint**, a small gap or gate in the line beside the "Verified" receipt;
- it ends under the **sleeping pebble** in the footer, in a dimmer pool of light.

Construction (from comp 3):
- built in JS from the real layout, as a Catmull-Rom spline through anchors with a slow sine wobble;
- 1.35 px wide, `--trail` colour (the decorative `--accent-soft`; never used for text), `aria-hidden`;
- recomputed on resize (ResizeObserver, debounced) and drawn into one absolutely positioned SVG.

Reduced motion or paused: a static path with no wobble. Phones (≤ 560 px): the line runs in the margins only and keeps
the hero, rail and footer anchors.

## 3. Typography and the frontend-design critique (critic H1)

- **Display:** Fraunces variable at weight 350, SOFT 100, WONK 0, optical size automatic. Never italic, and never an
  accent-coloured word.
  - H1 is 66 px on desktop and 43 px on phones, with balanced lines.
  - H2 is 44–52 px.
  - Self-host it; subset or instance it if the woff2 is over budget (critic M4).
- **Text:** Inter, with body at 17/1.6. **Code and paths:** Geist Mono only.
- **Why it passes the "cream + serif display" critique:**
  - at 350 the serif is calm, not high-contrast;
  - the background is Pebble's own cool sage-white `#F8F9F6`, not cream;
  - the pebble, not the type, is the loudest element.
- **Banned:**
  - middle-dot meta strings (facts are lists with hairline separators, two rows on phones; verbatim app strings such as
    "Worked for 42 s · 6 steps" keep their own dots);
  - eyebrows and all-caps labels, "New" pills, bento or card grids, logo walls, purple or neon gradients, glassmorphism;
  - accent words in headlines, and exclamation marks.

## 4. Motion (restraint)

- **One orchestrated motion: the living pebble.** That covers the hero pebble, the rail's guide pebble, the dial pebble
  and the footer's sleeping pebble. It is driven by the real engine in `shared/pebble`, with its rules: 30 fps,
  ≤ 0.5 Hz, and a settle after 8 s without pointer input.
- **Allowed:**
  - the hero text reveal on load, CSS only (opacity plus an 8 px rise, 480 ms, 60 ms stagger), never waiting for
    hydration;
  - the line drawing on with scroll progress (stroke-dashoffset, subtle);
  - loops fading in when they start;
  - motion that answers an action: dial changes, the approval-card demo, Forget, the copy button, the film dialog.
- **Not allowed:** a fade-up on every section, a hover lift on every card, parallax on content, scroll-jacking.
- **Reduced motion or "Pause motion"** (header and footer, `html[data-motion=paused]`, saved in localStorage inside
  try/catch): everything is static, pebbles show a settled frame, loops show a poster and a play button, the line is
  static, and widget state changes are instant.

## 5. Section order and layout (final)

| # | Section | Layout | Media / interaction |
|---|---|---|---|
| 0 | Header | Comp 3: nav on the left, the centred wordmark with the galet period, and GitHub, Pause motion, theme and Download on the right. Phones: menu sheet | Translucent after 24 px of scroll |
| 1 | Hero | Comp 3, centred: the pebble on the line in a pool of light, the H1 "A little help, right here.", the lead, the CTA cluster, the facts list, and the short honest line ("Signed with its own identity, not an Apple Developer ID, and not notarized. No independent security audit yet. Read the limits") | Live pebble with a static SSR first frame. The film poster (in the riverbed frame) peeks above the fold at 1440×900 |
| 2 | Film | Comp 3: the poster as a large framed screen, "Watch Pebble at work." as its label, and a chapter list | Galet play button; T0 teaser after the first scroll or in idle time; `<dialog>` theatre |
| 3 | **AgentGuard: the headline difference** (OVERRIDES §7, §9) | Split. Left: the H2 and the evidence-layer explanation, plus the allowed intent line "An agent shouldn't grade its own work." and "Reliability, not security", with the host-safety facts. Right: a stacked sequence of real captures — the Activity step with the verbatim challenge, the held run ("Pebble's change isn't verified yet." with Run the tests / Ask Pebble to finish / Accept as unverified), then the "Verified" receipt | The line passes a checkpoint gap here. Loop L6 if built; otherwise stills with an Interactive-example toggle |
| 4 | On your desktop | The comp 2 riverbed vignette with the companion; short copy | Loop L1 |
| 5 | Works in your project, under your review. | Comp 3's 01–04 rail with the guide pebble, and a sticky stage | ApprovalCardDemo (interactive) plus loops L3 and L4. Step copy is mode-qualified (OVERRIDES §8 C2) |
| 6 | Your model, your choice | Three ways in, as a quiet three-item list (not cards) | Loop L2 |
| 7 | You set the pace | Comp 3's arc dial | PermissionDial, verbatim text, attributed "In Pebble's Settings, under the three modes:" |
| 8 | Memory you can see | The six labelled layers (OVERRIDES §10) and the recall rule | MemoryForgetDemo plus loop L7 |
| 9 | Views, and what else is inside | The views paragraph plus the orchestration and feature-tour list (OVERRIDES §10) | Loop L8 (or a still, per the M7 cut line) |
| 10 | Built like infrastructure | Quiet and typographic: the stack sentence, plus the facts 8,421 automated tests, 1,772 service checks and 40 validator suites in source and frozen modes, and the release gates. No stat tiles | — |
| 11 | Private by default | Two columns: "Stored on your Mac" and "What leaves your Mac" with **five** destinations (OVERRIDES §8 C1) | The line becomes the diagram's arrows |
| 12 | Install | Comp 2's split install: the requirements list, the one-line command block with Copy, what the installer does, and "or download and check" with `SHA256SUMS`, with honest first-run steps | InstallPill copy, with the pebble `tap` |
| 13 | What Pebble isn't (yet) | Comp 2's two-column limits list. All four status-file limits plus OVERRIDES §8 H14 | — |
| 14 | Open source + FAQ | Repo card (no star count while small) and `<details>` FAQ | — |
| 15 | Final CTA and footer | The sleeping pebble where the line ends: "Pebble is resting." Credits including the bloub line, the honesty stamp, theme and motion toggles, the trademark notice | — |

## 6. Media framing (critic H6)

- Product media always sits in a frame: the riverbed desktop vignette (radius 28, green-tinted shadow) or a window on
  the sage field. Never a raw rectangle on the page, so video colours never have to match a page colour exactly.
- Dark theme uses the dark captures and comp 2's dusk wallpaper, switched by `[data-theme]` in CSS (critic H5). Dim the
  light-theme loops slightly in dark mode if both themes are not rendered.
- The film poster is a `<picture>` overlay (AVIF/WebP, `srcset`), not the `poster` attribute (critic H3).

## 7. Phones and accessibility

- **CTA by platform, not width.** Non-Mac visitors see "Pebble is for Macs with Apple silicon." and "Send yourself the
  link" (`navigator.share`, falling back to copying the link). iPads are detected with `maxTouchPoints > 1`.
- **Loops on phones:** a poster plus an HTML caption, or 4:5 punch-ins (critic H2).
- **Reflow at 320 px with no horizontal scroll.** Focus is visible. Targets are at least 24 px (aim for 44). All
  explainers are keyboard-operable and labelled "Interactive example".

## 8. Fix while porting

- The comps approximate gaze and blink with CSS. The site drives the real engine (`shared/pebble`, Lane B).
- Re-capture any still showing "Qwen3.5 4B Instruct · Q4_K_M" with the fixture labels from OVERRIDES §8 H14.
- Chapter times and the film length come from `src/content/chapters.ts`. No hard-coded "1:17".
- The comps load Google Fonts. The site self-hosts everything, so the honesty stamp is true.
- CSS `sin()`/`cos()` (Chrome 111+, Safari 15.4+) is fine. Keep a static fallback for older engines.

## 9. Lead decisions after the claims review (2026-10-23)

- **Hero honest line:** the three trust limits ("Signed with its own identity, not an Apple Developer ID, and not
  notarized. No independent security audit yet.") plus "Read the limits". It sits under **every** primary Download
  button: hero, final CTA and sticky CTA menu. The checksum limit sits next to the `shasum` instructions in Install,
  where it applies, and in the full limits list.
- **Hero lead:** the claims review's version, aligned with the release session's showcase brief.
- **AgentGuard H2:** "Evidence before “done”." (the README's heading).
  - Pebble's CHANGELOG [1.0.3] "Corrections" also hold for 1.0.1: AgentGuard holds changed code only when tests cover
    it.
  - So "Done means tested." is withdrawn. Step 04's title is "Tests that cover a change must pass.", with the limit
    "Changed code without covering tests is not held."
  - The film's AgentGuard line is "Evidence before done" (pending the release session's confirmation, 15:25 request).
- **Project H2:** "Works in your project, under your review." ("Asks first" is true only in the default mode.)
- **Limits:** adds "Other software on your Mac" (SECURITY.md:57).
- **Never render** `copy.releasePill` ("New · …") or `hero.requirementsLine` (middle dots). Use `hero.requirements` as a
  list.
- **Film end card:** keeps the small bloub credit line (FILM_SPEC T22).
- **Music:** the film uses the original score played on recorded CC0 instruments (VCSL + VSCO 2 CE, lane C2). The
  public media README must not mention Mixkit.
- **Pebble gaze at rest (site):** the engine's default resting gaze glances up and to the right, away from the
  headline and the visitor. On the site, the static frame (server render, no-JS, reduced motion and paused) and the
  live pebble's resting gaze **look straight ahead at the visitor** (centred eyes, like the app icon), using the
  engine's own setLook with a centred target. Once the pointer moves, the live pebble follows it, and it returns to
  centre when it settles. The footer's sleeping pebble keeps its own pose.

## 10. Superseded where they differ

Since the v2 system, two later documents supersede this file wherever they differ:
- `docs/PHILOSOPHY.md`, the design philosophy, binding for the page, the film, every social cut and every still;
- `docs/DESIGN-LEXINGTON.md`, the system that implements it: tokens, grid and sections.

Between those two, PHILOSOPHY sets the intent. DESIGN-LEXINGTON §10 lists the rules here that it replaces: the centred
comp-3 hero and heads (§1), the page-wide path (§2), the type scale and Fraunces beyond H1 and H2 (§3), the line that
draws itself on (§4), the centred wordmark, the pools of light and AgentGuard's split with its Interactive-example
toggle, now a static evidence ledger (§5), and the media frames' radius and shadow (§6).
Anything those two documents leave open still follows this file. OVERRIDES and `docs/CLAIMS.md` sit above all three.
