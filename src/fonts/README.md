# Fonts

Self-hosted, latin subset only. The site loads these with `next/font/local`; the films load the identical copies in
`video/public/fonts/` with `@remotion/fonts`. All three families are under the SIL Open Font License 1.1 (texts here).

| File | Family and axes | Bytes | Source (npm, packed 2026-10-22) | Original file |
|---|---|---|---|---|
| `Fraunces-Variable-latin.woff2` | Fraunces v38 (Version 1.000); axes opsz 9–144, wght 100–900, SOFT 0–100, WONK 0–1 | 121,016 | `@fontsource-variable/fraunces@5.3.0` | `files/fraunces-latin-full-normal.woff2` |
| `Fraunces-Display-latin.woff2` | Fraunces, instanced for the site's headings: wght 350, SOFT 100, WONK 0 pinned; opsz 9–144 kept | 32,860 | made from `Fraunces-Variable-latin.woff2` by `tools/assets/fonts.sh` (fontTools 4.67.0 `varLib.instancer`) | — |
| `Inter-Variable-opsz-latin.woff2` | Inter v20 (Version 4.001); axes opsz 14–32, wght 100–900 | 72,920 | `@fontsource-variable/inter@5.3.0` | `files/inter-latin-opsz-normal.woff2` |
| `Inter-Variable-latin.woff2` | Inter v20 (Version 4.001); axis wght 100–900 (opsz fixed at 14) | 48,256 | `@fontsource-variable/inter@5.3.0` | `files/inter-latin-wght-normal.woff2` |
| `GeistMono-Regular-latin.woff2` | Geist Mono v6 (Version 1.701), static 400 | 9,864 | `@fontsource/geist-mono@5.3.0` | `files/geist-mono-latin-400-normal.woff2` |
| `GeistMono-Medium-latin.woff2` | Geist Mono v6 (Version 1.701), static 500 | 10,116 | `@fontsource/geist-mono@5.3.0` | `files/geist-mono-latin-500-normal.woff2` |

Licences: `OFL-Fraunces.txt` (Copyright 2020 The Fraunces Project Authors), `OFL-Inter.txt` (Copyright 2016 The Inter
Project Authors), `OFL-GeistMono.txt` (Copyright 2024 The Geist Project Authors), each copied from its package's
`LICENSE`.

Notes:
- The Fraunces file's default instance is wght 900 and **WONK 1**. Always set the axes explicitly, for example
  `font-variation-settings: "SOFT" 100, "WONK" 0;` (D14: SOFT 100, WONK 0, weight about 440, never italic).
- The site loads `Fraunces-Display-latin.woff2` (critic M4: the four-axis file is over the font budget). It has
  no wght, SOFT or WONK axis any more, so set `font-weight: 350` and no `font-variation-settings`; the film keeps the
  full variable file in `video/public/fonts/`. The OFL names no Reserved Font Name, so the instance keeps the name.
- Pick one Inter file per surface: the opsz file adds Inter Display (opsz 32) for large text; the wght file is smaller.
  The site loads the wght file (its Inter is never larger than 25 px, and the 24.6 KB saved keeps Lighthouse's mobile
  LCP under 2.5 s); the films load the opsz file. `Inter-Variable-opsz-latin.woff2` stays here for the films' copy.

SHA-256:
```
7e744849028e2219e2aa1bc467dc4032980dc4487c9c3da3010081cd72d3b103  Fraunces-Variable-latin.woff2
c87e67922eac7bfd8f1c1a9562a102fcc6ea3178b95c871fcb0be0b3af58935d  Fraunces-Display-latin.woff2
2c295d99e26dcf357d4d01bcf270fd6924b600c9a13dd8c363ef114f4c6976fa  Inter-Variable-opsz-latin.woff2
3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62  Inter-Variable-latin.woff2
3f98383b122fe015a48536cd4a1cda855a201718923ffe74931a01597107b9b5  GeistMono-Regular-latin.woff2
72971bd4908d3984fa1b1426bb363730e4957e16a0f58bfbca76993095715488  GeistMono-Medium-latin.woff2
```
