"""score2 lane: the score preview video for the person (a VIDEO, never a music-only file: OVERRIDES §51).

On the page's night ground it shows the current scene, the cue playing (track, artist and licence), a running
timecode (with the frame at 60 fps), a thin progress bar with a marker at every cue change, a card that counts down to
the next cue change and says how it is made and what to listen for, and the sound-design layer sounding now. Frames
are drawn with Pillow in the brand's fonts (Fraunces, Inter, Geist Mono from src/fonts) and piped as raw RGB straight
into FFmpeg, so no frame ever touches the disk; the audio is the social master, encoded to AAC.

  scripts/heavy.sh score2-preview /usr/sbin/taskpolicy -c utility .work/qa-venv/bin/python -I \
      tools/audio/score2/score_preview.py main .work/score2/CUE_SHEET.json .work/score2/master/main.build.json \
      .work/score2/master/layers_main.json .work/score2/master/main.social.wav OUT.mp4
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
FONTS = os.path.join(REPO, "src", "fonts")
FFMPEG = os.environ.get("FFMPEG", "/opt/homebrew/bin/ffmpeg")
W, H, FPS = 1920, 1080, 30
X0, X1 = 120, 1800
BAR_Y = 990  # the progress bar
C = {"bg": (0x19, 0x1E, 0x1B), "fill": (0x21, 0x28, 0x22), "ink": (0xE8, 0xEE, 0xE6), "ink2": (0xAD, 0xB9, 0xAB),
     "line": (0x2B, 0x34, 0x2C), "sage": (0xA6, 0xC7, 0x95), "sand": (0xD9, 0xC7, 0xA0), "dim": (0x6E, 0x7A, 0x6D)}


def font(name, size, axes=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    if axes:
        f.set_variation_by_axes(axes)
    return f


F = {
    "display": font("Fraunces-Variable-latin.woff2", 92, [72, 360, 0]),
    "label": font("Inter-Variable-latin.woff2", 18, [640]),
    "head": font("Inter-Variable-latin.woff2", 22, [600]),
    "head2": font("Inter-Variable-latin.woff2", 22, [400]),
    "sub": font("Inter-Variable-latin.woff2", 34, [400]),
    "body": font("Inter-Variable-latin.woff2", 27, [400]),
    "body_m": font("Inter-Variable-latin.woff2", 27, [520]),
    "cue": font("Inter-Variable-latin.woff2", 42, [520]),
    "track": font("Inter-Variable-latin.woff2", 34, [600]),
    "track2": font("Inter-Variable-latin.woff2", 34, [400]),
    "small": font("Inter-Variable-latin.woff2", 22, [400]),
    "card_t": font("Inter-Variable-latin.woff2", 40, [600]),
    "card": font("Inter-Variable-latin.woff2", 23, [400]),
    "card_m": font("Inter-Variable-latin.woff2", 23, [540]),
    "tc": font("GeistMono-Regular-latin.woff2", 96),
    "mono": font("GeistMono-Regular-latin.woff2", 22),
    "mono_m": font("GeistMono-Medium-latin.woff2", 26),
    "mono_cue": font("GeistMono-Medium-latin.woff2", 40),
    "mono_s": font("GeistMono-Regular-latin.woff2", 18),
    "mono_xs": font("GeistMono-Regular-latin.woff2", 15),
    "count": font("GeistMono-Medium-latin.woff2", 30),
}

# What the film's scenes are, in plain words (TREATMENT §3.5, CUE_SHEET §5, the Return revision of 28 Oct)
BLOCK_SUB = {
    "Act I": "the live question, “Pebble 2.0”, the companion everywhere, the card",
    "The Drop": "your Allow; the frame opens on the whole Mac",
    "Ring 1": "your browser", "Ring 2": "your apps", "Ring 3": "your files and the terminal",
    "Ring 4": "your project, and AgentGuard's Verified", "Cascade 4": "“Bigger tasks”",
    "Quiet passage": "⌘K, Stealth Lockdown, the Veil, the menu bar",
    "Climax": "Pebble keeps a tool it made", "The Return": "every feature returns into the stone",
    "Title": "Pebble 2.0", "End card": "the facts, then the small print",
    "open": "the question, “Pebble 2.0”, the card", "Drop": "your Allow; the frame opens on the whole Mac",
    "= and browser": "Calculator's “=”, then the browser", "kept card": "Pebble keeps a tool it made",
    "Return": "a ring of features returns into the stone",
    "title, facts": "Pebble 2.0, then the facts",
}
BLOCK_NAME = {"open": "The open", "Drop": "The Drop", "= and browser": "Your apps, your browser",
              "kept card": "The kept card", "Return": "The Return", "title, facts": "The title"}

# How each cue change is made, and what to listen for (CUE_SHEET §2 and §6, in plain words)
JOINS = {
    "J1": ("Born Of The Sky's own crescendo is the riser. On the downbeat, a hard cut lands on Your Breath's drop "
           "with the Drop hit: the plunk two frames ahead, the hit and the first sub. The music ducks 3 dB under it.",
           "an arrival exactly on the beat: the strings turn into the groove (B minor into G major)."),
    "M2s": ("A splice inside Your Breath: bars 17 and 18 are taken out, so bar 16 runs into bar 19 through a 60 ms "
            "crossfade that ends on bar 19's downbeat. The track keeps its own order. Ring 2's sweep carries across.",
            "nothing at all: the groove just carries on, and bar 19's own entrance lands on the beat."),
    "J2": ("Your Breath's hi-hats stop for the last three beats of its bar: a breath. Then a hard cut onto Techno Fest "
           "Vibes' riser bar, under Ring 3's whoosh. 120 into 124 BPM, so a cut, never an overlap; both tracks sit on G.",
           "the breath, then the lift into a harder, brighter groove, with no stumble on the first beat."),
    "M3s": ("A splice inside Techno Fest Vibes: bars 50 and 51 are taken out, so bar 49 runs into bar 52 through a 60 ms "
            "crossfade that ends on the downbeat, on the picture's cut to the flyer.",
            "nothing at all: the figure runs straight across, and its own fill still leads into Ring 4."),
    "J3": ("Techno Fest Vibes' own real ending: it stops on the downbeat as Enter is pressed. One soft Enter tick sits "
           "in the hush while the chord rings out, then Starfire's pad fades in from {pad} over 2 seconds.",
           "a true stop, not a fade; the hush; the pad arriving without a bump."),
    "J4": ("A quarter-second crossfade from Starfire's pad that ends exactly on Your Breath's downbeat, into its "
           "breakdown. It builds, takes its own one-beat stop, and its biggest lift lands the kept card at {kept} with "
           "the hit; the music makes room under the hit for one bar, then settles lower under the Return.",
           "a smooth hand-over; then the held breath and the lift, the film's peak."),
    "J5": ("A beat cut, 120 into 120 BPM: Your Breath, running on under the Return, cuts on the downbeat to Born Of The "
           "Sky's dominant, a little lower while the screens return into the stone. A one-bar swell made from its own "
           "title chord rises into the title.",
           "the pulse never breaking; G major opening into B major; the title louder than the bar before it."),
    "F4": ("A splice inside Born Of The Sky: the second bar of its held IV chord is taken out, with a 200 ms crossfade "
           "onto bar 86's I chord, under the end card's first page.",
           "nothing at all: the chord resolves as the composer wrote it, one bar sooner."),
    "XJ1": ("One forward splice inside Your Breath at bar lines (0:31.53 to 1:28.53, in the track's own order): its "
            "build lands straight on its biggest lift, under the kept card. No hit: the lift itself is the arrival.",
            "the beat staying on the grid through the splice; the lift arriving as the peak."),
    "XJ2": ("A hard cut on the downbeat into Techno Fest Vibes' last bar, under a reverse swell (Kenney, CC0) tuned to "
            "G that rises into it. 120 into 124 BPM: a cut, never an overlap. The title lands on its real stop.",
            "the push into the faster last bar; then a true stop under the title, with the tap and the hit."),
}
SHORT = {"J1": "cut on the hit", "M2s": "splice", "J2": "hard cut after the breath", "M3s": "splice",
         "J3": "its own stop", "J4": "short crossfade", "J5": "beat cut", "F4": "splice", "XJ1": "splice into the lift",
         "XJ2": "cut under a swell"}
# the shots whose cue-sheet notes are the lanes' shorthand, in plain words for the person
PLAIN = {"S25": "one continuous shot: the camera pulls back from the kept card, real 2.0 screens rush in around the "
                "stone, then each returns into it; the swell, then the blink",
         "x8": "a ring of features as the camera leaves the kept card; each returns into the stone, the kept card last"}
LAST = {"main": "Born Of The Sky's composed ending carries the title and the end card and dies away by itself; only its "
                "last 0.3 s, already near silence, is faded into room tone ({fade_from} to {fade_to}), and room tone holds "
                "to the end card's last frame at {xcut}.",
        "main_coda": "Born Of The Sky's composed ending carries the title and the end card and dies away by itself; only "
                     "its last 0.3 s, already near silence, is faded into room tone ({fade_from} to {fade_to}). The room "
                     "tone carries on, never restarting, through the scene after the end card ({xcut} to {end}), where "
                     "one soft stone tap sounds at {tap}. No music there: the end card is the music's real ending.",
        "x40": "Techno Fest Vibes' stop chord rings out under the facts, then room tone."}


def clean(text):
    """Display text for the person: the brand fonts' Latin subsets have no arrow or command glyphs, and the cue sheet's
    line-register IDs (L04 ...) mean nothing outside the lanes."""
    text = text.replace("\u2318K", "Command-K").replace("\u2318", "Command-").replace("\u2192", "to")
    text = re.sub(r"(;\s*)?\bL\d\d(\s*(,|and)\s*L\d\d)*\b", "", text)
    text = re.sub(r"\s*\((MONTAGE_DESIGN|TREATMENT|CUE_SHEET)[^)]*\)", "", text)
    text = re.sub(r"\s*\(R\d+\)", "", text)
    # plain words for the lanes' labels (R3-07, 31 Oct): the person never sees 'sub 3', 'CC0 temp' or a line ID
    text = re.sub(r"\((?:CC0 )?temp\)", "(temporary)", text)
    text = re.sub(r",?\s+(?:and\s+)?sub \d\b", " and a low sub", text)
    text = text.replace("the coda's one stone tap", "one soft stone tap")
    text = re.sub(r"\bon L-C\d+'s landing", "as the second line lands", text)
    text = re.sub(r"\s+([;,.])", r"\1", text)
    text = re.sub(r"[;,]\s*$", "", text.strip())
    return re.sub(r"\s{2,}", " ", text)


def fmt(t, cs=True):
    t = max(0.0, t)
    return f"{int(t // 60)}:{t % 60:05.2f}" if cs else f"{int(t // 60)}:{int(t % 60):02d}"


def tracked(d, xy, text, fnt, fill, track=2.0):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=fnt, fill=fill)
        x += d.textlength(ch, font=fnt) + track
    return x


def wrap(d, text, fnt, width, max_lines):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        t = (cur + " " + w_).strip()
        if d.textlength(t, font=fnt) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        while d.textlength(lines[-1] + "…", font=fnt) > width:
            lines[-1] = lines[-1].rsplit(" ", 1)[0]
        lines[-1] += "…"
    return lines


def panel(w, h, draw_fn):
    im = Image.new("RGB", (w, h), C["bg"])
    draw_fn(ImageDraw.Draw(im), im)
    return im


def load(film, sheet_path, build_path, layers_path):
    cs = json.load(open(sheet_path))
    b = json.load(open(build_path))
    layers = json.load(open(layers_path))
    f = cs["main_film"] if film == "main" else cs["cut_40s"]
    end = f["film_length_s"]
    coda = b.get("coda") if film == "main" else None  # revision 3: the master runs on through the post-credit scene
    xcut = end
    if film == "main":
        blocks = [(x["start_s"], x["end_s"], x["block"], BLOCK_SUB.get(x["block"], "")) for x in f["blocks"]]
        shots = [(x["start_s"], x["end_s"], x["id"], PLAIN.get(x["id"], x["what"])) for x in f["shots"]]
        if coda:
            end = max(end, b["film_length_s"])
            blocks.append((xcut, end, "After the end card", "the post-credit scene: Pebble rests; no music"))
            shots.append((xcut, end, "coda", "the end card's room tone carries on; one soft stone tap on the second line"))
    else:
        plan = json.load(open(os.path.join(os.path.dirname(sheet_path), "cuesheet", "plan_x40.json")))
        blocks = [(a, bb, BLOCK_NAME.get(lab, lab), BLOCK_SUB.get(lab, "")) for a, bb, lab in plan["blocks"]]
        shots = [(x["start_s"], x["end_s"], x["id"], PLAIN.get(x["id"], x["what"])) for x in f["slots"]]
    cues = []
    for c in f["cues"]:
        tr = c["track"]
        fam = "A" if tr["family"] == "cc_by" else "B"
        lic = "Scott Buckley · CC BY 4.0 · credit required" if fam == "A" else "Mixkit Stock Music Free License · no credit needed"
        cues.append({"id": c["id"], "name": c["name"], "label": tr["label"], "title": tr["title"], "artist": tr["artist"],
                     "fam": fam, "lic": lic, "role": c["role"], "src_in": c["source"]["in"], "src_out": c["source"]["out"],
                     "film_in": c["film"]["in_s"], "film_out": c["film"]["out_s"], "bpm": c.get("tempo_bpm"),
                     "start": c["film"]["audio_extent_s"][0]})
    # the master revision's overrides (score_build.py 'cue_overrides'): a role that names a planned dip says the dip the
    # masters play (M6a: the cue sheet's 2.5 dB under the title's level is 4.2 dB in the fix revision)
    for c in cues:
        ov = b.get("cue_overrides", {}).get(c["id"], {}).get("gain_db")
        # the cue sheet now prints the plan's dip beside the masters' (R3-05): the preview shows only what it plays
        c["role"] = re.sub(r" in the plan, [\d.]+ dB in the masters \([^)]*\)", "", c["role"])
        if ov and re.search(r"dipped [\d.]+ dB", c["role"]):
            g = ov["master"]
            c["role"] = re.sub(r"dipped [\d.]+ dB", f"dipped {g[-1][1] - g[0][1]:.1f} dB", c["role"])
    # a cue "plays" from its film in-point to the next cue's in-point (heads that pre-roll belong to the change)
    for k, c in enumerate(cues):
        c["until"] = cues[k + 1]["film_in"] if k + 1 < len(cues) else xcut
    sync = {x.get("what", ""): x["film_s"] for x in f.get("sync_points", [])}
    pad = next((c["film_in"] for c in cues if c["id"] == "M4"), None)
    kept = next((t for w, t in sync.items() if w.startswith("THE KEPT CARD")), None)
    fill = {"pad": fmt(pad) if pad is not None else "", "kept": fmt(kept) if kept is not None else ""}
    if film == "main":
        room = next((L for L in b["layers"] if L["id"] == "room_end"), None)
        a_, z_ = (room["film_s"][0], room["film_s"][0] + room["excerpt"]["fade_in_s"]) if room else (xcut, xcut)
        last = LAST["main_coda" if coda else "main"].format(fade_from=fmt(a_), fade_to=fmt(z_), xcut=fmt(xcut), end=fmt(end),
                                                            tap=fmt(coda["tap_film_s"]) if coda else "")
    else:
        last = LAST[film]
    joins = []
    for j in f["joins"]:
        a = next(c for c in cues if c["id"] == j["from"]) if "from" in j else None
        bcue = next(c for c in cues if c["id"] == j["to"]) if "to" in j else None
        joins.append({"id": j["id"], "name": j["name"], "t": j["film_s"], "from": a, "to": bcue,
                      "methods": j.get("methods", [])})
    spans = []  # (from, to, label): what the sound line names, layer by layer (a group's layers share one label)
    for L in b["layers"]:
        lab = next((x.get("label") for x in layers["layers"] if x["id"] == L["id"]), L["id"])
        a, bb = L["film_s"]
        t = L["t"]
        span = (t - 0.35, t + 1.6) if L.get("role") not in ("room",) else (a, bb)
        if L.get("role") == "shimmer":
            span = (t - 0.35, t + 4.5)
        if L.get("role") == "swell":
            span = (a, t + 0.2)
        spans.append((span[0], span[1], clean(lab)))
    return {"end": end, "xcut": xcut, "coda": coda, "blocks": blocks, "shots": shots, "cues": cues, "joins": joins,
            "spans": spans, "build": b, "fill": fill, "last": last}


def at(rows, t):
    for row in rows:
        if row[0] - 1e-6 <= t < row[1] - 1e-6:
            return row
    return rows[-1] if t >= rows[-1][0] else rows[0]


def make_base(film, D):
    im = Image.new("RGB", (W, H), C["bg"])
    d = ImageDraw.Draw(im)
    x = tracked(d, (X0, 52), "PEBBLE 2.0  ·  RIPPLES", F["head"], C["sage"], 2.4)
    d.text((x + 18, 52), "score preview: " + ("the main film" if film == "main" else "the 40-second cut"),
           font=F["head2"], fill=C["ink2"])
    m = D["build"]["masters"]["social"]
    right = f"social master · {m['aac']['apple_audiotoolbox_cbr']['integrated_lufs']:.1f} LUFS · AAC {m['target']['aac_kbps']} kb/s"
    d.text((X1 - d.textlength(right, font=F["head2"]), 52), right, font=F["head2"], fill=C["ink2"])
    d.line([(X0, 100), (X1, 100)], fill=C["line"], width=2)
    tracked(d, (X0, 146), "SCENE", F["label"], C["sage"], 2.0)
    tracked(d, (X0, 486), "MUSIC", F["label"], C["sage"], 2.0)
    tracked(d, (1200, 146), "TIME", F["label"], C["sage"], 2.0)
    tracked(d, (X0, 822), "SOUND DESIGN NOW", F["label"], C["sage"], 2.0)
    # the progress bar: cue segments; a marker at every cue change, with how it is made; labels
    y = BAR_Y
    d.rounded_rectangle([X0, y - 4, X1, y + 4], radius=4, fill=C["line"])
    end = D["end"]
    xt = lambda t: X0 + (X1 - X0) * t / end  # noqa: E731
    for c in D["cues"]:
        col = C["sand"] if c["fam"] == "A" else C["sage"]
        a, b = xt(c["film_in"]) + 2, xt(c["until"]) - 2
        d.rounded_rectangle([a, y - 4, max(a + 2, b), y + 4], radius=4, fill=col)
        lab = f"{c['id']} · {c['label']}"
        if b - a > d.textlength(lab, font=F["mono_s"]) + 4:
            d.text((a, y + 14), lab, font=F["mono_s"], fill=col)
        else:  # a short cue (M3a: 5.8 s) gets its tag in the compact form, in a smaller size (the review's R-10)
            lab = f"{c['id']}·{c['label']}"
            if b - a > d.textlength(lab, font=F["mono_xs"]) + 2:
                d.text((a, y + 15), lab, font=F["mono_xs"], fill=col)
    for k, j in enumerate(D["joins"]):  # two rows of labels, alternating, so neighbours never collide
        x = xt(j["t"])
        ty = y - 64 if k % 2 == 0 else y - 40
        d.line([(x, ty + 20), (x, y + 10)], fill=C["ink"], width=2)
        lab = f"{j['id']} · {SHORT.get(j['id'], '')}"
        wl = d.textlength(lab, font=F["mono_s"])
        lx = x + 6 if x + 6 + wl <= X1 else x - 6 - wl
        d.text((lx, ty), lab, font=F["mono_s"], fill=C["ink"])
    if D.get("coda"):  # the post-credit scene: no music, the room tone and one tap
        a, b = xt(D["xcut"]) + 2, xt(D["end"]) - 2
        d.rounded_rectangle([a, y - 4, max(a + 2, b), y + 4], radius=4, fill=C["dim"])
        lab = "coda · no music"
        if b - a > d.textlength(lab, font=F["mono_xs"]) + 2:
            d.text((a, y + 15), lab, font=F["mono_xs"], fill=C["dim"])
    d.text((X0, 1036), "0:00", font=F["mono_s"], fill=C["dim"])
    e = fmt(end)
    d.text((X1 - d.textlength(e, font=F["mono_s"]), 1036), e, font=F["mono_s"], fill=C["dim"])
    leg = "sand = A, Scott Buckley (cinematic)    sage = B, Mixkit (energetic)    white lines = cue changes, and how"
    d.text(((X0 + X1) / 2 - d.textlength(leg, font=F["mono_s"]) / 2, 1036), leg, font=F["mono_s"], fill=C["dim"])
    return im


def scene_panel(block, shot):
    def draw(d, im):
        d.text((0, 0), block[2], font=F["display"], fill=C["ink"])
        d.text((0, 118), wrap(d, clean(block[3]), F["sub"], 990, 1)[0], font=F["sub"], fill=C["ink2"])
        x = d.textlength(shot[2] + "  ", font=F["mono_m"])
        d.text((0, 186), shot[2], font=F["mono_m"], fill=C["sage"])
        for k, ln in enumerate(wrap(d, clean(shot[3]), F["body"], 980 - x, 2)):
            d.text((x, 186 + k * 38), ln, font=F["body"], fill=C["ink2"])
    return panel(1000, 280, draw)


def coda_panel():
    def draw(d, im):
        d.text((0, 0), "No music", font=F["cue"], fill=C["ink"])
        d.text((0, 62), "the scene after the end card", font=F["track2"], fill=C["ink2"])
        d.text((0, 112), "room tone (made for this film) · one stone tap (Kenney, CC0)", font=F["small"], fill=C["ink2"])
        for k, ln in enumerate(wrap(d, "The end card is the music's real ending. The room tone carries on without a "
                                       "restart, and one soft stone tap marks the second line.", F["body"], 1000, 3)):
            d.text((0, 150 + k * 37), ln, font=F["body"], fill=C["ink2"])
    return panel(1020, 280, draw)


def cue_panel(c):
    def draw(d, im):
        d.text((0, 0), c["id"], font=F["mono_cue"], fill=C["sage"] if c["fam"] == "B" else C["sand"])
        d.text((d.textlength(c["id"] + " ", font=F["mono_cue"]) + 6, 0), f"“{c['name']}”", font=F["cue"], fill=C["ink"])
        d.text((0, 62), c["title"], font=F["track"], fill=C["ink"])
        d.text((d.textlength(c["title"], font=F["track"]), 62), f"  by {c['artist']}", font=F["track2"], fill=C["ink2"])
        d.text((0, 112), f"{c['label']} · {c['lic']}", font=F["small"], fill=C["ink2"])
        bpm = " · no pulse (a pad)" if c["id"] == "M4" or not c.get("bpm") else f" · {c['bpm']:.0f} BPM"
        d.text((0, 150), f"source {c['src_in']}–{c['src_out']}{bpm} · in the film {fmt(c['film_in'])}–{fmt(c['until'])}",
               font=F["mono"], fill=C["ink2"])
        for k, ln in enumerate(wrap(d, "For: " + clean(c["role"]), F["body"], 1000, 2)):
            d.text((0, 192 + k * 37), ln, font=F["body"], fill=C["ink2"])
    return panel(1020, 280, draw)


def change_card(state, j, sub, D, film):
    w, h = 620, 476

    def draw(d, im):
        border = C["sage"] if state == "now" else C["line"]
        d.rounded_rectangle([0, 0, w - 1, h - 1], radius=22, fill=C["fill"], outline=border, width=3 if state == "now" else 2)
        lab = {"next": "NEXT CUE CHANGE", "now": "CUE CHANGE NOW", "done": "NO MORE CUE CHANGES"}[state]
        tracked(d, (32, 28), lab, F["label"], C["sage"], 2.0)
        if state == "done":
            for k, ln in enumerate(wrap(d, D["last"], F["card"], w - 64, 8)):
                d.text((32, 70 + k * 34), ln, font=F["card"], fill=C["ink2"])
            return
        d.text((32, 56), f"{j['id']} · {j['name']}", font=F["card_t"], fill=C["ink"])
        d.text((32, 108), sub, font=F["count"], fill=C["sage"])
        frm, to = j["from"], j["to"]
        what = (f"inside {frm['title']}: shortened at bar lines" if frm["title"] == to["title"]
                else f"from {frm['title']} to {to['title']}")
        d.text((32, 152), wrap(d, what, F["card_m"], w - 64, 1)[0], font=F["card_m"], fill=C["ink"])
        how, listen = (x.format(**D["fill"]) for x in JOINS[j["id"]])
        y = 194
        for ln in wrap(d, how, F["card"], w - 64, 6):
            d.text((32, y), ln, font=F["card"], fill=C["ink2"])
            y += 30
        y += 8
        for k, ln in enumerate(wrap(d, "Listen for " + listen, F["card"], w - 64, 3)):
            d.text((32, y), ln, font=F["card_m"] if k == 0 else F["card"], fill=C["ink"])
            y += 30
    im = Image.new("RGB", (w, h), C["bg"])
    draw(ImageDraw.Draw(im), im)
    return im


def sound_line(labels):
    def draw(d, im):
        if labels:
            d.text((0, 0), "   ·   ".join(labels), font=F["body_m"], fill=C["ink"])
        else:
            d.text((0, 0), "music only", font=F["body"], fill=C["dim"])
    return panel(1680, 44, draw)


def main():
    film, sheet_path, build_path, layers_path, wav, out = sys.argv[1:7]
    D = load(film, sheet_path, build_path, layers_path)
    end = D["end"]
    n = int(round(end * FPS))
    base = make_base(film, D)
    stills = os.environ.get("STILLS")  # "t1,t2,...": draw those frames as PNGs next to OUT (a layout check), no video
    frames = range(n) if not stills else [int(round(float(s) * FPS)) for s in stills.split(",")]
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out + ".part.mp4"
    cmd = [FFMPEG, "-hide_banner", "-nostdin", "-loglevel", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", wav, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "libx264",
           "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-g", "60", "-c:a", "aac_at", "-aac_at_mode", "cbr",
           "-b:a", "192k",
           "-ar", "48000", "-ac", "2", "-movflags", "+faststart", "-shortest", tmp]
    proc = None if stills else subprocess.Popen(cmd, stdin=subprocess.PIPE)
    cache = {}

    def cached(key, fn):
        if key not in cache:
            if len(cache) > 400:
                cache.clear()
            cache[key] = fn()
        return cache[key]
    xt = lambda t: X0 + (X1 - X0) * t / end  # noqa: E731
    for f in frames:
        t = f / FPS
        im = base.copy()
        block = at(D["blocks"], t)
        shot = at(D["shots"], t)
        im.paste(cached(("s", block[2], shot[2]), lambda: scene_panel(block, shot)), (X0, 176))
        if D.get("coda") and t >= D["xcut"] - 1e-6:
            im.paste(cached(("coda",), coda_panel), (X0, 520))
        else:
            cue = next((c for c in D["cues"] if c["film_in"] - 1e-6 <= t < c["until"] - 1e-6), D["cues"][-1] if t >= D["cues"][-1]["film_in"] else D["cues"][0])
            im.paste(cached(("c", cue["id"]), lambda: cue_panel(cue)), (X0, 520))
        nxt = next((j for j in D["joins"] if t < j["t"] + 3.0), None)
        if nxt is None:
            card = cached(("done",), lambda: change_card("done", None, "", D, film))
        elif t < nxt["t"] - 0.15:
            sub = f"in {nxt['t'] - t:4.1f} s · at {fmt(nxt['t'])}"
            card = cached(("n", nxt["id"], sub), lambda: change_card("next", nxt, sub, D, film))
        else:
            sub = f"now · {fmt(nxt['t'])}"
            card = cached(("w", nxt["id"]), lambda: change_card("now", nxt, sub, D, film))
        im.paste(card, (1180, 346))
        labs = tuple(dict.fromkeys(lab for a, b, lab in D["spans"] if a <= t < b))
        im.paste(cached(("l", labs), lambda: sound_line(list(labs))), (X0, 852))
        d = ImageDraw.Draw(im)
        d.text((1196, 168), fmt(t), font=F["tc"], fill=C["ink"])
        d.text((1200, 290), f"of {fmt(end)} · frame {int(round(t * 60))} at 60 fps", font=F["mono"], fill=C["ink2"])
        x = xt(t)
        d.line([(x, BAR_Y - 16), (x, BAR_Y + 16)], fill=C["ink"], width=2)
        d.ellipse([x - 8, BAR_Y - 8, x + 8, BAR_Y + 8], fill=C["ink"], outline=C["sage"], width=3)
        if stills:
            im.save(os.path.join(os.path.dirname(out), f"still-{film}-{t:07.2f}.png"))
            continue
        proc.stdin.write(im.tobytes())
    if stills:
        print("stills", len(frames))
        return
    proc.stdin.close()
    rc = proc.wait()
    if rc != 0:
        raise SystemExit(f"ffmpeg exited {rc}")
    os.replace(tmp, out)
    res = {"out": out, "frames": n, "fps": FPS, "seconds": round(n / FPS, 3)}
    if len(sys.argv) > 7:  # the delivered file's own facts: its streams, and its AAC audio through ebur128
        probe = json.loads(subprocess.run([FFMPEG.replace("ffmpeg", "ffprobe"), "-v", "error", "-show_format",
                                           "-show_streams", "-of", "json", out], capture_output=True, text=True).stdout)
        meter = subprocess.run([FFMPEG, "-hide_banner", "-nostdin", "-nostats", "-i", out, "-map", "0:a:0", "-af",
                                "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
        s = meter[meter.rfind("Summary:"):]
        get = lambda pat: float(re.search(pat, s, re.S).group(1))  # noqa: E731
        res["streams"] = [{k: st.get(k) for k in ("codec_name", "profile", "width", "height", "r_frame_rate",
                                                   "pix_fmt", "sample_rate", "channels", "bit_rate", "duration")}
                          for st in probe["streams"]]
        res["format"] = {k: probe["format"].get(k) for k in ("format_name", "duration", "size", "bit_rate")}
        res["audio_ebur128"] = {"integrated_lufs": get(r"I:\s+(-?[\d.]+) LUFS"), "lra_lu": get(r"LRA:\s+(-?[\d.]+) LU"),
                                "true_peak_dbtp": get(r"True peak:\s+Peak:\s+(-?[\d.inf]+) dBFS")}
        import hashlib
        h = hashlib.sha256()
        with open(out, "rb") as fh:
            for blk in iter(lambda: fh.read(1 << 20), b""):
                h.update(blk)
        res["sha256"] = h.hexdigest()
        json.dump(res, open(sys.argv[7], "w"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != "streams"}))


if __name__ == "__main__":
    main()
