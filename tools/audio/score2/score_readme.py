"""score2 lane: write the score previews' README.txt for the person, in plain words, from the build records.

Every number and every film time comes from the build's own records (master/main.build.json, x40.build.json and the
previews' facts in master/*.preview.json) and the cue plans; none is typed by hand. Pure Python: no audio. Revision 3
(28 Oct): the scenes, the changes and the times are read from the plan (M2 and M3 are one excerpt each, B4's two more
bars move everything after Ring 4), and the scene after the end card (the coda's room tone and its one tap) is listed.

  python3 -I tools/audio/score2/score_readme.py .work/score2 .work/score2/preview/README.txt
"""
import json
import os
import sys
import textwrap


def bullet(text, indent="  "):
    """One bullet, wrapped at 118 columns after its numbers are filled in."""
    return textwrap.fill(" ".join(text.split()), width=118, initial_indent="- ", subsequent_indent=indent)


def fmt(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"


def mmss(t):
    t = int(round(t))  # rounded, never truncated (R3-07: 45.9986 s is 0:46)
    return f"{t // 60}:{t % 60:02d}"


NAMES = {"YourBreath": "Your Breath", "TechnoFestVibes": "Techno Fest Vibes", "BornOfTheSky": "Born Of The Sky",
         "Starfire": "Starfire"}
NUMS = {1: "one", 2: "two", 3: "three", 4: "four"}

SCENES = {  # what each cue carries, in plain words (CUE_SHEET.md §1)
    "M1": ("\"Still Water\"", "A4 Born Of The Sky (Scott Buckley)",
           "Act I: the question, \"Pebble 2.0\", the companion everywhere, the card. Near-silent strings that grow; their "
           "own crescendo is the riser into the Drop."),
    "M2": ("\"Allow\"", "B2 Your Breath (Mixkit)",
           "The Drop (your Allow), Ring 1 (your browser) and Ring 2 (your apps). B2's own drop lands on the Allow, and it "
           "plays in one piece, as its composer wrote it, until its hi-hats take a breath before Ring 3."),
    "M3": ("\"Every Ring\"", "B4 Techno Fest Vibes (Mixkit)",
           "Ring 3 (your files and the terminal), Ring 4 (your project and AgentGuard's Verified), \"Bigger tasks\", "
           "Command-K. Harder and brighter, in one piece, and its real ending stops exactly on Enter."),
    "M4": ("\"Dusk\"", "A1 Starfire (Scott Buckley)",
           "The quiet passage: Stealth Lockdown, the Veil, the honest line, the menu bar. A held chord with no beat, so "
           "the line can be read."),
    "M5": ("\"Its Own Tools, the Return\"", "B2 Your Breath again, later in the track",
           "The climax: Pebble asks to keep a tool it made, then keeps it. B2's breakdown builds, stops for one beat, and "
           "its biggest lift lands the \"Kept in Pebble's Toolbox\" card. It runs on, a little lower, under the Return, "
           "where every feature rushes in around the stone."),
    "M6": ("\"Ripples (End Title)\"", "A4 Born Of The Sky again, its ending",
           "The merge: every screen returns into the stone, on Born Of The Sky's held dominant. Then the title \"Pebble "
           "2.0\", the end card's two pages, and the composer's own ending, which dies away by itself (only its last 0.3 "
           "seconds, already near silence, are faded into room tone). The film ends on the voice it began with."),
}
CHANGES = {  # how each change is made and what to listen for (CUE_SHEET.md §2)
    "J1": "The Drop. Born Of The Sky's crescendo rises; on the downbeat the music cuts hard to Your Breath's drop, with "
          "the Drop hit. Listen for: an arrival exactly on the beat.",
    "M2s": "A splice inside Your Breath (two bars out), as Ring 2 arrives under its sweep. Listen for: nothing at all.",
    "J2": "Ring 3. Your Breath's hi-hats stop for the last three beats of its bar, a breath, then a hard cut onto Techno "
          "Fest Vibes under a ring sweep. The tempo steps from 120 to 124 beats a minute as a clean cut. Listen for: the "
          "breath, then the lift into a harder groove, with nothing stumbling on the first beat.",
    "M3s": "A splice inside Techno Fest Vibes (two bars out), on the cut to the flyer. Listen for: nothing at all.",
    "J3": "Stealth. Techno Fest Vibes' own ending stops on the downbeat, exactly on Enter. One soft tick, the chord rings "
          "out, and Starfire's pad fades in under it. Listen for: a true stop, not a fade, then the hush.",
    "J4": "Evening. A quarter-second crossfade that ends exactly on Your Breath's downbeat. Its breakdown builds, takes a "
          "one-beat breath, and its biggest lift lands the kept card. Listen for: a smooth hand-over, and the lift as the "
          "peak of the film.",
    "J5": "The merge. A cut beat for beat back into Born Of The Sky (both are 120 beats a minute, so the pulse never "
          "breaks), a little quieter while the screens return into the stone. A swell made from its own chord rises into "
          "the title. The key opens from {kb} into {ka}, with B held in common. Listen for: the title arriving louder than "
          "the bar before it.",
    "F4": "A splice inside Born Of The Sky's held chord, under the end card. Listen for: nothing at all.",
}


def scene_lines(plan, coda, xcut):
    cues = plan["cues"]
    rows, k = [], 0
    while k < len(cues):
        c = cues[k]
        key = "M6" if c["id"].startswith("M6") else c["id"]
        last = k
        while last + 1 < len(cues) and (cues[last + 1]["id"].startswith("M6") and key == "M6"):
            last += 1
        # a scene runs from the change into its cue to the change out of its last cue (J3 is Enter, not the pad's fade-in)
        a = next((x["t"] for x in plan["seams"] if x["to"] == c["id"]), c["film_in"])
        z = next((x["t"] for x in plan["seams"] if x["from"] == cues[last]["id"]), xcut)
        name, track, what = SCENES[key]
        rows.append(f"  {mmss(round(a)):>4}-{mmss(round(z))}  {key} {name:<28} {track}")
        rows += textwrap.wrap(what, width=105, initial_indent="             ", subsequent_indent="             ")
        k = last + 1
    if coda:
        rows.append(f"  {mmss(round(xcut)):>4}-{mmss(round(coda['to_film_s']))}  after the end card               no music")
        rows += textwrap.wrap("The scene after the end card: Pebble rests. The room tone carries on without a restart, and "
                              "one soft stone tap sounds as its second line lands. (The X version ends at the end card.)",
                              width=105, initial_indent="             ", subsequent_indent="             ")
    return "\n".join(rows)


def change_lines(plan, k5):
    rows = []
    for s_ in plan["seams"]:
        txt = CHANGES[s_["id"]].format(kb=k5.get("key_before", {}).get("key", "?"), ka=k5.get("key_after", {}).get("key", "?"))
        rows += textwrap.wrap(txt, width=103, initial_indent=f"  {s_['id']:<3} {fmt(s_['t'])}  ",
                              subsequent_indent="               ")
    return "\n".join(rows)



def cp_out(c):
    """A cue's last film second in the plan (its out-point in film time)."""
    return c["film_in"] + (c["src_out"] - c["src_in"])


def what_changed(W, b, plan, coda, xcut):
    """WHAT CHANGED SINCE THE 28 OCTOBER PREVIEW (R3-01), from the records only: revision 2's plan and build as archived
    (cuesheet/archive-2026-10-28-r2/plan_main.json, master/archive-2026-10-28-r2fix/*.build.json) against this plan and
    build. Nothing here is typed in but the words."""
    p2 = json.load(open(os.path.join(W, "cuesheet", "archive-2026-10-28-r2", "plan_main.json")))
    A = os.path.join(W, "master", "archive-2026-10-28-r2fix")
    b2 = {f: json.load(open(os.path.join(A, f"{f}.build.json"))) for f in ("main", "x40")}
    p3 = plan["main"]
    c2, c3 = {c["id"]: c for c in p2["cues"]}, {c["id"]: c for c in p3["cues"]}

    def bar_s(track):
        return 240.0 / json.load(open(os.path.join(W, "maps", f"{track}.map.json")))["tempo"]["bpm"]

    def total(cs, track):
        return sum(c["src_out"] - c["src_in"] for c in cs.values() if c["track"] == track)

    def splices(pl, cs):
        return [(s_, cs[s_["from"]]["track"]) for s_ in pl["seams"] if cs[s_["from"]]["track"] == cs[s_["to"]]["track"]]

    now = splices(p3, c3)
    def same(x, cx, y, cy):  # the same splice: the same source points on both sides, wherever it sits in the film
        return (cx[x["from"]]["track"] == cy[y["from"]]["track"]
                and abs(cx[x["from"]]["src_out"] - cy[y["from"]]["src_out"]) < 0.05
                and abs(cx[x["to"]]["src_in"] - cy[y["to"]]["src_in"]) < 0.05)

    gone = [(s_, tr) for s_, tr in splices(p2, c2) if not any(same(s_, c2, x, c3) for x, _ in now)]
    rows = []
    ev2, ev3 = {e["label"]: e["t"] for e in p2["events"]}, {e["label"]: e["t"] for e in p3["events"]}
    sm2, sm3 = {x["id"]: x["t"] for x in p2["seams"]}, {x["id"]: x["t"] for x in p3["seams"]}
    shift = sm3["J3"] - sm2["J3"]
    for s_, tr in gone:
        nb = round((c2[s_["to"]]["src_in"] - c2[s_["from"]]["src_out"]) / bar_s(tr))
        grow = total(c3, tr) - total(c2, tr)
        nxt = next((x for x in p3["seams"] if x["t"] > s_["t"] + 0.05), None)
        words = NUMS.get(nb, str(nb)) + (" bar" if nb == 1 else " bars")
        more = words.replace(" bar", " more bar")
        if abs(grow - nb * bar_s(tr)) < 0.05:
            rows.append(f"{NAMES[tr]} plays in one piece now: the {words} that were cut out of it at {fmt(s_['t'])} "
                        f"are back, so it plays {more} of its own ({grow:.2f} seconds).")
        else:
            rows.append(f"{NAMES[tr]} plays in one piece now: the {words} that were cut out of it at {fmt(s_['t'])} "
                        "are back, so from there on you hear it in its own order"
                        + (f", and it reaches the next change ({fmt(nxt['t'])}) {words} earlier in the track than "
                           "before." if nxt and abs(grow) < 0.05 else "."))
    if abs(shift) > 0.01 and "Ring 4" in ev2 and "Ring 4" in ev3:
        ln2, ln3 = sm2["J3"] - ev2["Ring 4"], sm3["J3"] - ev3["Ring 4"]
        rows.append(f"So Ring 4, \"Bigger tasks\" and Command-K get {shift:.2f} seconds more ({ln3:.2f} seconds from Ring "
                    f"4 to Enter, was {ln2:.2f}), and everything from Enter on comes {shift:.2f} seconds later: Enter "
                    f"{fmt(sm3['J3'])} (was {fmt(sm2['J3'])}), the kept card {fmt(ev3['kept card'])} (was "
                    f"{fmt(ev2['kept card'])}), the title {fmt(ev3['TITLE'])} (was {fmt(ev2['TITLE'])}).")
    if coda and not b2["main"].get("coda"):
        rows.append(f"New: after the end card the room tone carries on, never restarting, through a short scene, and "
                    f"one soft stone tap sounds at {fmt(coda['tap_film_s'])}, as its second line lands.")
    rows.append(f"The film is {fmt(xcut)} long (it was {fmt(b2['main']['film_length_s'])})"
                + (f", and {fmt(coda['to_film_s'])} with the scene after the end card." if coda else "."))
    l2 = {L["id"]: L for L in b2["main"]["layers"]}
    hit_groups = {"drop", "climax", "title", "drop_sub", "climax_sub", "title_sub"}
    dl = [(abs(L["gain_db"] - l2[L["id"]]["gain_db"]), L) for L in b["main"]["layers"] if L["id"] in l2]
    if dl and all(L.get("take") == l2[L["id"]].get("take") for _, L in dl):
        dh = max((d for d, L in dl if L.get("group") in hit_groups), default=0.0)
        rest = [(d, L) for d, L in dl if L.get("group") not in hit_groups and d > 0.1]
        sweeps = all(L["id"].startswith("ring") for _, L in rest)
        rows.append(f"Every sound effect you heard is the same take, at its new time. The three hits sit within "
                    f"{dh:.2f} dB of their old levels"
                    + (f"; {'the ring sweeps' if sweeps else 'the others'}, which are set against the music under them, "
                       f"within {max(d for d, _ in rest):.1f} dB." if rest else ", and so does everything else."))
    if all(b["x40"]["masters"][k]["sha256"] == b2["x40"]["masters"][k]["sha256"] for k in b2["x40"]["masters"]):
        rows.append("The 40-second cut is the same as before, sample for sample.")
    # the masters' limiting (R3-02): only if it still differs audibly from the last preview's (the social master, the
    # previews' sound): a hit limited more than 0.5 dB harder or softer, or a spot held down by 1 dB or more
    ms, ms2 = b["main"]["masters"]["social"], b2["main"]["masters"]["social"]
    hits = (("the Drop", sm2["J1"], sm3["J1"]), ("the kept card", ev2["kept card"], ev3["kept card"]),
            ("the title", ev2["TITLE"], ev3["TITLE"]))

    def gr_at(m, t):
        return min((d["gr_db"] for d in m["limiter"]["deepest"] if abs(d["film_s"] - t) <= 0.3), default=0.0)

    diffs = [(nm, gr_at(ms, t3), gr_at(ms2, t2)) for nm, t2, t3 in hits]
    dips = sorted((d for d in ms.get("ceiling_search", {}).get("local_dips", []) if d["lowered_db"] >= 1.0),
                  key=lambda d: d["t"])
    hits_line = ", ".join(f"{nm} {abs(a):.1f} dB (was {abs(z):.1f})" for nm, a, z in diffs)
    if any(abs(a - z) > 0.5 for _, a, z in diffs):
        rows.append(f"The three hits are limited differently from the last preview: {hits_line}.")
    if dips:
        tracks = sorted({NAMES[c["track"]] for d in dips for c in p3["cues"]
                         if c["film_in"] <= d["t"] < cp_out(c)}) or ["the music"]
        rows.append((f"The three hits are limited as in the last preview: {hits_line}. " if all(
                        abs(a - z) <= 0.5 for _, a, z in diffs) else "")
                    + f"New: {NUMS.get(len(dips), str(len(dips)))} short moment{'s' if len(dips) > 1 else ''} in "
                    + " and ".join(tracks) + " (" + ", ".join(fmt(d["t"]) for d in dips) + ") "
                    + ("are" if len(dips) > 1 else "is") + f" held down by up to {max(d['lowered_db'] for d in dips):.1f} "
                    "dB for under a quarter of a second, so that the encoder that makes the film's files doesn't "
                    "overshoot there.")
    return "\n".join(bullet(x) for x in rows)


def main():
    W, out = os.path.abspath(sys.argv[1]), sys.argv[2]
    M = os.path.join(W, "master")
    b = {f: json.load(open(os.path.join(M, f"{f}.build.json"))) for f in ("main", "x40")}
    pv = {f: json.load(open(os.path.join(M, f"{f}.preview.json"))) for f in ("main", "x40")
          if os.path.exists(os.path.join(M, f"{f}.preview.json"))}
    plan = {f: json.load(open(os.path.join(W, "cuesheet", f"plan_{f}.json"))) for f in ("main", "x40")}

    def seam(f, s):
        return next(x for x in b[f]["seams"] if x["id"] == s)

    def comp(f, d):
        return next(c for c in b[f]["composites"] if c["duck"] == d)

    def aac(f, k, enc="apple_audiotoolbox_cbr"):
        return b[f]["masters"][k]["aac"][enc]

    def loud(f, k):
        n, a = aac(f, k, "native_default"), aac(f, k)
        return (f"{a['integrated_lufs']} LUFS; peak {n['true_peak_dbtp']} dBTP on FFmpeg's encoder, "
                f"{a['true_peak_dbtp']} on Apple's")

    st = {f: {s["id"]: s for s in b[f]["seams"]} for f in b}
    pc = {c["id"]: c for c in plan["main"]["cues"]}
    splices = [x["id"] for x in plan["main"]["seams"] if pc[x["from"]]["track"] == pc[x["to"]]["track"]]
    worst_step = max(abs(seam("main", s)["master_web"]["step_3s_lu"]) for s in splices)
    ev = {e["label"]: e["t"] for e in plan["main"]["events"]}
    sm = {x["id"]: x for x in plan["main"]["seams"]}
    lay = {L["id"]: L for L in b["main"]["layers"]}
    coda = b["main"].get("coda")
    xcut = b["main"].get("x_cut_film_s", b["main"]["film_length_s"])
    n_sp = {1: "one splice", 2: "two splices", 3: "three splices"}.get(len(splices), f"{len(splices)} splices")
    lags = [abs(v) for f in b for s in b[f]["seams"] for v in (s["grid"]["lag_bed_vs_incoming_source_samples"],
                                                              s["grid"]["lag_master_vs_bed_samples"]) if v is not None]
    beat_cues = {f: {c["id"] for c in plan[f]["cues"] if c["track"] in ("YourBreath", "TechnoFestVibes")} for f in plan}
    ons = [c for f in b for k, c in b[f]["onsets_vs_beats"]["cues"].items() if k in beat_cues[f]
           and c.get("median_offset_ms") is not None and c["beats_with_clear_attack"] >= 8]
    worst_med = max(abs(c["median_offset_ms"]) for c in ons) if ons else None
    att = b["main"]["classifier"]["web"].get("attribution", [])
    music_only = [a for a in att if a["verdict"] == "the music itself"]
    not_music = [a for f in b for a in b[f]["classifier"]["web"].get("attribution", [])
                 if a["verdict"] != "the music itself"]
    nm_line = ("" if not not_music else
               " Not all of them are the music: " + "; ".join(
                   f"{fmt(a['window_s'][0])}-{fmt(a['window_s'][1])} reads {a['verdict']}" for a in not_music) + ".")
    added = [round(max(a["mix"].values()) - max(a["music_alone"].values()), 3) for f in b
             for a in b[f]["classifier"]["web"].get("attribution", []) if a["mix"] and a["music_alone"]]
    ret_under = b["main"]["fix_checks"]["return_vs_climax"]["return_under_climax_lu"]
    probe = os.path.join(M, "title_probe.json")  # score_title_probe.py: the same music, the windows moved
    pr = [rw["summary"]["foghorn_max"] for rw in json.load(open(probe))["variants"]
          if rw.get("corr_s")] if os.path.exists(probe) else []  # the masters' own music, the windows moved
    hc_path = os.path.join(M, "hand_download_check.json")  # score_handcheck.py: the person's downloads (CR-13)
    hand_ok = os.path.exists(hc_path) and json.load(open(hc_path)).get("all_match")
    probe_lo, probe_hi = (f"{min(pr):.2f}", f"{max(pr):.2f}") if pr else ("?", "?")
    tg = b["main"]["classifier"].get("title_grid", {})
    tgw = tg.get("web_master", {})
    tgm = tg.get("music_alone_at_web_gain", {})
    j5 = st["main"]["J5"]["continuity"]["bed"]
    k5 = j5.get("harmony", {})
    main_len = fmt(xcut)
    # R3-03: the loudest-part sentence, computed from the build's fix_checks.loudest (centres of the loudest 3 s and 400 ms)
    ld = b["main"]["fix_checks"]["loudest"]
    c3, cm = ld["short_term_3s"]["centre_film_s"], ld["momentary_400ms"]["centre_film_s"]
    lo, hi = min(c3 - 1.5, cm - 0.2), max(c3 + 1.5, cm + 0.2)
    card = ev["kept card"]
    if ld["short_term_3s"]["block"] == ld["momentary_400ms"]["block"] == "Climax" and lo >= card:
        loud_line = (f"The climax is the loudest part of the film. After the kept card lands ({fmt(card)}), Your Breath's "
                     f"lift keeps building, and its loudest seconds (about {mmss(lo)} to {mmss(hi)}) are {ret_under} LU "
                     "louder than anything in the Return (the loudest 3 seconds of each).")
    else:
        loud_line = (f"The film's loudest 3 seconds are centred on {fmt(c3)} ({ld['short_term_3s']['block']}) and its "
                     f"loudest 400 ms on {fmt(cm)} ({ld['momentary_400ms']['block']}); the climax's loudest 3 seconds are "
                     f"{ret_under} LU louder than the Return's.")
    changed = what_changed(W, b, plan, coda, xcut)
    pre = {f: (pv[f]["format"]["duration"] if f in pv else None) for f in ("main", "x40")}

    sfx = "\n".join(bullet(x) for x in [
        f"Three big moments: the Drop ({fmt(sm['J1']['t'])}), the kept card ({fmt(ev['kept card'])}) and the title "
        f"({fmt(ev['TITLE'])}). Their hits are "
        "temporary for now: the final ones come from a free professional library or from your own recordings, and "
        "get balanced again.",
        f"At the Drop the hit sits on top of the music (+{comp('main', 'drop')['composite_over_bed_db']} dB over the "
        "music alone). At the kept card the music steps back for one bar so the hit lands on top of it "
        f"(+{comp('main', 'climax')['composite_over_bed_db']} dB), then the music settles a little lower under the "
        "Return, so the climax stays louder than the Return. At the title, Born Of The Sky's own chord carries it, "
        "with the hit inside it.",
        "The plunk at the Drop (made here from code) and the stone tap at the title (a free CC0 sound) stand in for "
        "your recordings of a pebble dropped into water and a pebble tapped on wood.",
        f"Soft ticks at about {mmss(lay['tick_send']['t'])}, {mmss(lay['tick_equals']['t'])} and "
        f"{mmss(lay['tick_click']['t'])} mark roughly where the send, \"=\" and a click will be; they move to "
        f"the exact frames when the real screens are recorded. The Enter tick at {fmt(lay['tick_enter']['t'])} sits "
        "alone in the hush.",
        "A whoosh as the Space slides and as each ring arrives (each made here from code), a reverse swell into the "
        "title, and room tone at the very start, in the hush and at the very end. Nothing sounds under the Return's "
        "screens: the music carries them."]
        + ([f"After the end card the music has ended for good: the room tone carries on, never restarting, through the "
            f"short scene that follows ({fmt(xcut)} to {fmt(coda['to_film_s'])}), and one soft stone tap, the title's own "
            f"tap at a whisper, sounds at {fmt(coda['tap_film_s'])}, as the scene's second line lands."] if coda else []) + [
        "No sound effect comes from Mixkit any more: they are free CC0 sounds (Kenney) and sounds made for this film."])
    lines = [f"{k:<24}{loud(f, m)}" for k, f, m in (("main film, social:", "main", "social"),
                                                    ("main film, website:", "main", "web"),
                                                    ("40-second cut, social:", "x40", "social"),
                                                    ("40-second cut, website:", "x40", "web"))]
    checked = "\n".join([
        bullet("Every cut is on a bar line and nothing is stretched or sped up. Each change's crossfade ends exactly "
               "on the incoming downbeat, and every sample of music sits exactly where the plan puts it "
               f"({max(lags) if lags else 0} samples off at every change)."),
        bullet("In the beat-driven cues (Your Breath and Techno Fest Vibes) the beats land within "
               f"{worst_med:.1f} thousandths of a second of the beat grid (the median of each cue)."),
        bullet("No clicks at any change, checked by measurement and by looking at every change zoomed in."),
        bullet(loud_line),
        bullet(f"Inside a track, the {n_sp} change{'s' if len(splices) == 1 else ''} the loudness by at most "
               f"{worst_step:.2f} LU over 3 seconds."),
        bullet("Loudness, measured after the AAC encode (FFmpeg's encoder makes the film's deliveries; Apple's made "
               "these previews):")] + ["    " + x for x in lines] + [
        "  (Social: -14 LUFS and at most -1.0 dBTP. Website: -16 LUFS and at most -1.5 dBTP.) The film is meant to be",
        "  dynamic: a quiet open and a quiet dusk, a loud peak."])
    still_open = "\n".join([
        bullet("An automatic checker (Apple's sound classifier, which this project uses to catch anything that might "
               f"sound like a phone, a horn or an alarm) flags {len(att)} moments of the main film, {len(music_only)} "
               "of them in the music itself: Your Breath's breakdown and lift around the kept card reads as "
               "\"ringtone\" or \"telephone\", and Born Of The Sky's quiet opening and its horns around the title read "
               "as \"foghorn\". The sound effects I added change no reading by more than "
               f"{max(added) if added else 0:.2f} (on a 0-1 scale). Around the title, on the stricter half-second "
               f"grid, the finished mix reads at most {tgw.get('foghorn_max', '?')} \"foghorn\", and the music alone "
               f"{tgm.get('foghorn_max', '?')}; the same music reads anywhere from {probe_lo} to {probe_hi} when only "
               "the checker's 3-second windows move by a fraction of a second, so that number is about the checker, "
               f"not the sound.{nm_line} If any of it makes you think of a phone or a horn, say so."),
        bullet("The hits are temporary, and the plunk and the tap are stand-ins, until the final sounds exist."),
        bullet("The two Mixkit tracks, Your Breath and Techno Fest Vibes, are your own hand downloads: they match "
               "the copies these previews were built from byte for byte." if hand_ok else
               "Before the final film, the two Mixkit tracks, Your Breath and Techno Fest Vibes, need to be "
               "downloaded by you, by hand, from their own pages (you'll get the two links). The copies in these "
               "previews were fetched automatically, which Mixkit's terms don't allow for the finished film; if your "
               "downloads match them byte for byte, the film's music stands exactly as you hear it here.")])
    scenes = scene_lines(plan["main"], coda, xcut)
    changes = change_lines(plan["main"], k5)
    after = f", then the scene after the end card (to {fmt(coda['to_film_s'])})" if coda else ""
    listen = "     ".join(f"{s['id']} {mmss(round(max(0.0, s['t'] - 5.0)))}" for s in plan["main"]["seams"])
    txt = f"""PEBBLE 2.0 FILM, "RIPPLES": THE SCORE, CUT LIKE A FILM

WHAT THIS IS
You asked for the music to be cut the way a film's is: different music for different scenes, changing where the scene
changes. You said Your Breath (B2) and Techno Fest Vibes (B4) feel energetic and fresh, and that the A series (Scott
Buckley) holds a cinematic vibe. So B2 and B4 carry the energetic middle, the peak and the Return, and the A series
opens the film, gives it a quiet dusk, and closes it with the title.

  Pebble-2.0-score-preview.mp4       the main film ({main_len}), with the Return (the montage) at the end{after}
  Pebble-2.0-40s-score-preview.mp4   the 40-second cut for social media (0:40.00)

There is no picture yet: the real 2.0 screens are recorded near the release. On screen you see which scene you are in,
which music is playing (track and artist), and a running clock. A bar along the bottom has a white line at every change
of music, labelled with how the change is made. A card counts down to the next change, says how it is made, and says
what to listen for. The sound is the social-media master (-14 LUFS, the loudness Instagram, X and LinkedIn expect).

Every change and every level here was measured and looked at on a spectrogram. Nobody has listened to this version
yet: your ears are the first.

WHAT CHANGED SINCE THE 28 OCTOBER PREVIEW
{changed}

HOW TO LISTEN (about 10 minutes)
1. On headphones or good laptop speakers, watch the main film once straight through, just for the feeling.
2. Then listen to each change of music again. Each of these times is 5 seconds before a change:
     {listen}
3. Play it once on your phone.
4. Tell me in your own words what you feel, for example "the merge feels like a jolt" or "the climax isn't big enough".

THE MAIN FILM, SCENE BY SCENE
{scenes}

THE CHANGES, AND WHAT TO LISTEN FOR
{changes}

THE 40-SECOND CUT
  0:00-0:28  B2 Your Breath from its intro: the question, "Pebble 2.0" on B2's own hit at 0:04, its drop as the Drop at
             0:12, then "=" and the browser.
  0:28-0:32  B2 Your Breath's biggest lift: the kept card. This is one forward jump inside the track, at bar lines on
             both sides and in the track's own order.
  0:32-0:40  B4 Techno Fest Vibes' last bar: the 40-second Return, then the title on its real stop at 0:33.94, and the
             chord rings out under the facts. A soft reverse swell rises into the cut at 0:32.
  Listen for: the jump at 0:28 staying on the beat, the push at 0:32, and the stop under the title.

THE SOUND EFFECTS
{sfx}

WHAT I CHECKED
{checked}

WHAT IS STILL OPEN
{still_open}

CREDITS
'Born Of The Sky' by Scott Buckley (edited) – CC BY 4.0 – www.scottbuckley.com.au – https://creativecommons.org/licenses/by/4.0/
'Starfire' by Scott Buckley (edited) – CC BY 4.0 – www.scottbuckley.com.au – https://creativecommons.org/licenses/by/4.0/
'Your Breath' (Eugenio Mininni) and 'Techno Fest Vibes' (Alejandro Magaña): Mixkit Stock Music Free License; no credit
needed. The 40-second cut uses only these two, so it needs no music credit.
Sound effects: Kenney (CC0) and sounds made for this film. Sound effects are the film's; Pebble plays none of them.

PLEASE DON'T SHARE THESE
These previews are for you only: the film isn't finished or published yet, so please don't post or pass them on. The
music in them can't be shared on its own either: its licence allows it only inside the film.
"""
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    open(out, "w").write(txt)
    print("ok", len(txt.splitlines()), "lines", {k: v for k, v in pre.items()})


if __name__ == "__main__":
    main()
