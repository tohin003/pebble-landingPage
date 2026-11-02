# Pebble 2.0 launch film: the director's treatment

Status: v1, 1 Nov 2026. Branch `launch-2.0`. The director (the lead session) owns this file; workers read it and
propose changes in their handoffs. They don't edit it.

This is a fresh production. The earlier reel (`.work/reel/`, `video/src/reel/`, `video/src/film2/`) was rejected by the
owner: mostly text cards on a dark green ground, UI shown too small to read, no story, no benchmarks. Reuse its
**assets and tools** (real takes, the pebble engine, fonts, QA scans, SFX kit, beat-map tools) where they truly help.
Don't reuse its edit, its look or its rule-by-rule caution.

## 1. What we are making

| Deliverable | Spec | Use |
|---|---|---|
| **Launch film** | 16:9, 1920×1080, 30 fps (the owner's ruling of 1 Nov; was 60), 85–100 s, H.264 High, AAC 48 kHz, −14 LUFS, −1 dBTP | LinkedIn (the main post), the landing page, YouTube |
| **Mobile cut** | 4:5, 1080×1350, same edit re-laid-out (not a centre crop) | LinkedIn mobile feed |
| **Landing loops** | 6–10 s silent loops per feature, 16:9 (and a 4:5 crop where the page needs it), H.264 + poster | the site's feature sections |
| **Post kit** | LinkedIn post text, description with the credits, thumbnail/poster stills, SRT of on-screen text | the post |

**The owner's decisions (1 Nov 2026):** no voiceover: kinetic type, music and SFX tell the story (it must read
muted); the sealed-context feature is titled "Context warping." on screen, with Pebble's own explanation under it (confirmed on 2 Nov with Pebble's D55 in view: the name stays in the film and the post, with no numbers or savings; D55 still keeps it out of the site's own text);
deliver the ~90 s film in 16:9 and a 4:5 re-layout (1080×1350, not a crop). Every scene is laid out for both.

## 2. The story: "Small pebble. Real work."

An underdog story with an open loop, told mostly in kinetic type over real footage:

1. **The challenger (hook).** A tiny sage pebble blinks awake on a dark stage. *"This is Pebble." "It’s small."* Then:
   *"It just went up against Claude Code and Codex."* *"Same model. Same tasks."* The question hangs. (Open loop.)
2. **The reveal.** Drop. *Pebble 2.0*, with the README's own line: *"The desktop companion that does real work, and
   shows its evidence."*
3. **Rising action: what it can do now.** Each feature is a step up in capability, every one shown on the real app:
   lives on your Mac, then uses your apps and browser, checks its own work (AgentGuard), builds its own tools
   (Workshop), remembers (six layers), keeps long tasks light (sealed context), goes with you (Pebble Remote on
   iPhone), steps out of frame when you present (Stealth Lockdown).
4. **The payoff.** *"So. How did it do?"* The published benchmark against Claude Code and Codex, same model each:
   more tasks done correctly, fewer false "done"s, lower cost per task.
5. **Resolution.** *"Small pebble." "Real work."* The lockup, free and open source, the GitHub link. The pebble rests.

The pebble character is the protagonist and the editor's glue: it reacts (Pebble's own poses), it is the match shape
between scenes, and it rests at the end.

## 3. Script v1 (on-screen text; timings snap to the music once it is chosen)

Voice: British spelling, sentence case, statements end with a period, no exclamation marks, no all caps, no emoji.

| # | Act | ~Time | Picture | On-screen text |
|---|---|---|---|---|
| 0 | Cold open | 0:00–0:08 | Dark stage; the pebble small at centre, blinks awake; looks up at the rivals' names | "This is Pebble." / "It’s small." / "It just went up against" "Claude Code and Codex." / "Same model. Same tasks." |
| 1 | Title | 0:08–0:12 | The drop: the pebble hops into the lockup | "Pebble 2.0" + "The desktop companion that does real work, and shows its evidence." |
| 2 | Lives on your Mac | 0:12–0:20 | RS1-03 (Spaces swipe, the pebble stays); RS15-01 (click the pebble, quick chat, "What can you do now?") | "It lives on your Mac." / "On every Space." / "Click. Ask." |
| 3 | Uses your Mac | 0:20–0:33 | RS4-07 (Calculator: the keys pressed, 600); RS5C-04 (Calendar event); RS9B-02 (website approval, the working pill) | "Now it can use your Mac." / "Your apps." / "Your calendar." / "Your browser." / limit: "Only the windows and sites you allow." |
| 4 | AgentGuard | 0:33–0:43 | Real UI (harness): "Pebble's change isn't verified yet." → tests run → "Verified · pytest 42 passed on current files"; a check-list motion graphic | "Most agents say "done"." / "Pebble checks." / "AgentGuard." + "Evidence before "done"." |
| 5 | Pebble's Workshop | 0:43–0:52 | RSW-01 (the kiln request, "Create, test, keep and use a kiln_ramp_time tool", the Keep card) + a forge → sandbox → blind check → Toolbox graphic | "It builds its own tools." / "Tested in a sandbox. Kept after a blind check." / "When the check disagrees, it asks you." |
| 6 | Memory | 0:52–0:59 | Six layers stack (Profile, Semantic, Procedural, Episodic, Temporal, Working); real Settings › Memory with Forget | "It remembers what matters." / "Six layers. All visible." / "Forget anything." |
| 7 | Context warping | 0:59–1:05 | A long task's context: older tool results fold into short stubs, the newest stay word for word; one stub opens back exactly | "Context warping." (the owner's name for Pebble's sealed context, 1.4.0+) / "Long tasks keep a smaller window." / "Older results sealed. Any one returned exactly." |
| 8 | Pebble Remote | 1:05–1:12 | iPhone with the real Pebble Remote app (Simulator recordings): a conversation, an approval, Face ID | "Your Mac, in your pocket." / "Pebble Remote for iPhone." / "Approve with Face ID." / small: "Open source. Build it with Xcode." |
| 9 | Stealth Lockdown | 1:12–1:20 | RS13-03 (⌘K, "Turn Stealth Lockdown on", the windows leave the recording); the Veil pebble (rendered by Pebble's own code) | "Presenting?" / "Stealth Lockdown." + the honest line, word for word (below) |
| 10 | Benchmarks | 1:20–1:33 | Bar charts, count-ups; the pebble watches, then happy | "So. How did it do?" / "Tasks done correctly." / "Said "done" when it wasn't." / "Cost per task." + the method footnote |
| 11 | Outro | 1:33–1:42 | Lockup; the pebble settles into rest | "Small pebble." / "Real work." / "Pebble 2.0" / "Free and open source for Mac." / "github.com/tohin003/Pebble" |

### The numbers (exactly as published: v2.0.0 release notes and README "Benchmarks: measured, not claimed")

| | Pebble | Rival |
|---|---|---|
| vs Claude Code, both on `claude-opus-5-5`: tasks done correctly | 235 of 255, **92.2 %** | 213 of 255, **83.5 %** |
| said done when it was not | **6.3 %** | **13.7 %** |
| cost per task | **$0.091** | **$0.117** |
| vs Codex, both on `gpt-6.1-sol`: tasks done correctly | 243 of 255, **95.3 %** | 231 of 255, **90.6 %** |
| said done when it was not | **3.9 %** | **7.1 %** |
| cost per task | **$0.042** | **$0.050** |

Footnote on screen while the numbers show: "Golden set 2.0, held-out split: 85 tasks in 17 families, 3 phrasings each,
255 runs per product. One model for both products in each comparison. Pebble 1.9.29, the source of 2.0.0. Full
results, including time and safety, in the 2.0.0 release notes." Never the word "beats" for the overall result. Time is mixed
(median faster, 95th percentile slower), so it stays in the footnote's pointer, not on a bar.

### Lines that must appear word for word

- Stealth Lockdown's honest line, on screen with it: "Hidden from screen capture and screen sharing, not from a camera,
  a capture card or a process list. Exams and interviews that forbid assistants still forbid it."
- End card or description: "Shown with sample data." and "Pebble's character engine: bloub by Jérémy Perret (MIT)".
- Music credits as the track's licence requires (description, and the end card if the licence asks).

## 4. The look: "Riverstone"

Premium, calm, confident. Apple-keynote restraint with Linear/Raycast-grade motion. The product is the hero: real UI
shown **big**, readable, moving.

**Palette** (dark stage, matching Pebble's dark UI)

| Token | Hex | Use |
|---|---|---|
| ink-0 | `#070B09` | deepest ground, letterbox |
| ink-1 | `#0E1411` | stage |
| ink-2 | `#18201B` | panels, chart tracks |
| line | `#2A342E` | hairlines |
| stone-0 | `#F2EFE7` | headline type |
| stone-1 | `#C9C6BC` | secondary type |
| mute | `#7E8681` | footnotes, rival bars |
| sage | `#A6C795` | Pebble's accent, Pebble's bars, highlights |
| pebble | `#B4CDA6` | the character's body (dark theme), never recoloured |
| sage-deep | `#506E54` | sage shadows, fills |
| glow | `#9EE6A0` | rare light accents (verified moments) |
| clay | `#E0784C` | one warm counter-accent: "not verified", warnings |
| dusk | `#44528C`, `#7684C6` | the Veil's family: **only** inside Stealth Lockdown |

Ground: ink-1 with a slow, soft sage radial light (8–14 % opacity) and a faint warm clay light opposite; animated
film grain at 4–6 %; a gentle vignette. Gradients are allowed when they read as light, never as decoration.

**Type** (fonts already in `video/public/fonts`, loaded by `video/src/fonts.ts`)

- Headlines: Inter variable, weight 650–750, `opsz` 32, letter-spacing −0.035 em, line-height 1.0, 110–190 px at 1080p.
- Accent words: Fraunces italic (`"SOFT" 100, "WONK" 0`), weight 400–500, for the emotional beats ("Real work.").
- Labels and numbers: Geist Mono 500, tabular figures.
- One idea per card; at most 7 words on screen at once outside footnotes; every line on screen ≥ 0.8 s per 3 words.

**Motion**

- Entrances: masked rise (y 100 % → 0) + blur 8 px → 0, 0.45 s, ease `cubic-bezier(0.22, 1, 0.36, 1)`; per-word stagger
  0.05–0.07 s. Exits: 0.2–0.25 s fade/rise, or a hard cut on the beat.
- Camera moves: ease `cubic-bezier(0.65, 0, 0.35, 1)`; nothing holds dead still for more than 1 s (a 1–3 %/s push or
  drift). Springs without bounce (`damping` ≥ 200) for UI; the **pebble alone** may overshoot and squash.
- **Real UI**: a window floating on the stage, 22 px corner radius, a 1 px inner highlight, a deep soft shadow; it
  enters tilted (rotateX ≈ 8°, rotateY ≈ −12°) and flattens as the action starts. **Screen-Studio-style zooms**: the
  camera glides to 1.6–2.6× on the point of action (the key pressed, the card, the result), following real event times.
- Transitions, in order of preference: a cut on the downbeat; a scale-through (zoom into an element that becomes the
  next scene); the pebble as match shape; a whip (0.2–0.3 s, directional motion blur). No generic cross-dissolves.
- Beat sync: act changes on bar downbeats, text hits on beats, 3–6 % punch-ins on accents.
- Photosensitivity: never more than 3 full-frame flashes in any second.

**Sound**: the music is the spine. SFX under it: whooshes on transitions, soft clicks on UI actions, key taps on the
Calculator presses, a pop when the pebble appears, a low hit on the title, a riser into the benchmarks, ticks on the
count-ups, a soft shimmer on "Verified". Mixed 6–12 dB under the music; master −14 LUFS integrated, −1 dBTP.

### Director's rulings v1.1 (after the craft research; `.claude/skills/launch-film-craft` holds the numbers)

- **Three worlds, never one dark canvas.** *Night* (the ink stage: the cold open, the title, act cards, Remote,
  Stealth's dusk, the outro); *Desktop* (the real Mac recordings, full-bleed or floating over a soft blur of
  themselves: acts 2, 3, 9); *Daylight* (warm stone `#ECE8DF` with ink type `#141A16`, sage `#506E54` for
  Pebble, mute `#9A9F98` for rivals: acts 4–7, where the real windows and captures float on it beside the
  explainers, and the benchmark payoff). The arc reads night →
  desktop → daylight (the evidence) → night (rest). Never cut between night and daylight: a world change is carried
  by an object (a card, the pebble, a headline scaling through) or a wipe, so no frame jumps from dark to light.
- **Frame 0 is the thumbnail.** It is a finished composition: the pebble awake at centre and "This is Pebble." already
  landed. The premise ("…Claude Code and Codex.") is on screen by about 3 s.
- **Tilt** only while a window is revealed; flat before anything is read or acted on.
- **Entrances vary:** the masked rise is the default; also per-word blur (6 px → 0, 0.13 s, 0.067 s steps),
  grey-to-ink, and per-letter for the name "Pebble 2.0". A landed title is dead still: no creeping scale on type.
  Drift (0.4–1.5 %/s) is for UI and the ground only.
- **Holds:** story-critical lines get 0.5 s + 0.3 s a word after their entrance (last line of a scene ≥ 2 s);
  secondary labels at least 0.8 s per 3 words. Must-read text ≥ 56 px in 16:9, ≥ 40 px in 4:5.
- **Seams:** hard cuts on the downbeat inside the bursts (act 3's montage); elsewhere the seam is carried by something
  on screen. 3–5 transition kinds in the film, at most a third of seams hard cuts, no crossfades between worlds.
- **Zooms:** push 0.6 s (`cubic-bezier(0.16, 1, 0.3, 1)`) to ~2×, one action per push, hold ~2.4 s, pull back 0.7 s;
  the camera arrives before the pointer.
- **Sound sync:** an effect's peak lands on the visual contact frame or 1 frame after, never more than 2 frames early.
  Mix by band against a music-only render; always also render a music-only version.
- **Review:** a fresh critic agent judges each full render from contact sheets alone (never the builder).
- **Length:** the owner chose ~90 s; a 30–45 s cut-down can be offered later from the same scenes.

## 5. Honesty rules (these still bind)

- Pebble's interface is only ever shown from **real** sources: the 10 real takes, the capture harness (Pebble's own
  frontend from a **published** tag, with sample data), or the iPhone app's own code. Never redraw Pebble's UI.
  Explainer diagrams (memory layers, sealed context, the Workshop's checks, the bars) are fine: they must read as
  diagrams, not as fake screens.
- Every number on screen is a published one, exactly as published. No savings or speed claims beyond them.
- The pebble: only Pebble's own poses (`shared/pebble/README.md`), always its own sage, never black.
- Privacy: no real names, cities, accounts, keys or personal notifications in any frame. Usage lines (tokens, cost)
  are fine to blur or crop; don't feature them.
- Sample data is labelled ("Shown with sample data.") in the description and end card.

## 6. Technical conventions

- Remotion 4.0.538 in `video/` (pinned, never upgrade). New code only under `video/src/launch/`; register compositions
  from `video/src/launch/Root.tsx` (the director wires it into `video/src/Root.tsx`). Don't edit `film`, `film2`,
  `reel` code.
- Assets under `video/public/launch/` (`takes/`, `ui/`, `remote/`, `audio/`, `stills/`). Raw audio is gitignored; never
  commit audio or video over 45 MB.
- Timing in **seconds**, converted with the composition's fps (`s(sec)`); scenes take their length from props and
  place their beats relative to it, so the director can retime to the music. Draft renders: half scale, 30 fps, or
  stills; finals: 60 fps.
- Every heavy job (renders, stills batches, Studio, Xcode builds, Simulator recordings, captures, FFmpeg batches)
  through `scripts/heavy.sh <label> …`, one at a time; this Mac has 8 GB of memory. Start every command with
  `cd <repo> && source scripts/env.sh`. Use `/usr/bin/git`.
- Work only in the files your task owns; commit only those, in small commits with the session's co-author trailer;
  leave a handoff in `.work/handoffs/launch-<lane>.md` (what was done, files, how to run, open issues).
