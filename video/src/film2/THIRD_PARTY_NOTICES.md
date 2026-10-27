# Third-party notices: film2

The film's motion code (`video/src/film2/`) ports a few moves from HyperFrames. The ported files are derivative works
of HyperFrames' source and carry its licence; everything else in this folder is the landing repository's own code.

## HyperFrames (Apache-2.0)

- **Project:** HyperFrames, https://github.com/heygen-com/hyperframes, read as source at tag `v0.8.202` (nothing from
  it is executed or vendored). The files read and their git blob hashes are recorded in
  `.work/film2/hf-registry@v0.8.202/MANIFEST.json` (gitignored).
- **Copyright:** Copyright 2026 HeyGen, Inc. (the repository's LICENSE).
- **Licence:** Apache License, Version 2.0, https://www.apache.org/licenses/LICENSE-2.0. HyperFrames ships no NOTICE
  file at that tag, so there are no NOTICE contents to carry forward (Apache-2.0 §4(d)).
- **Changes:** every ported file is modified for Pebble's film (Apache-2.0 §4(b)), and each says so in its header,
  with what it changed and why: blur as travel ÷ 7 instead of a capped value, no cyan gradients or neon, tweens instead
  of onUpdate callbacks, the film's own eases and limits.

| File in this folder | Ported from (HyperFrames `registry/…`) |
|---|---|
| `transitions/ports.tsx` | `components/whip-pan-cut` (`<WhipPanCut>`), `components/cut-the-curve` (`<CutTheCurve>`) |
| `type/TextMatchCut.tsx` | `components/text-match-cut` |
| `light/LightLeak.tsx` | `blocks/light-leak` |
| `light/Sweep.tsx` | `components/light-sweep-pass` (the travelling band of `<LightSweep>`) |
| `light/Grain.tsx` | `components/grain-overlay` (in spirit: a noise field re-seeded at a fixed rate) |
| `camera/moves.ts` (`focusPull()`) | `blocks/rack-focus`, `components/focus-rack` (focus interpolated in dioptres) |
| `camera/World3D.tsx` (its depth-of-field model) | `blocks/rack-focus` (blur linear in dioptres) |

Each of these files carries, in its header: "Portions Copyright 2026 HeyGen, Inc., Apache-2.0; modified for Pebble's
film" (CR-23, OVERRIDES §55). This entry must stay with the code when the film-2.0 branch is published (after
"2.0.0 published"); the repository's own licence does not change.
