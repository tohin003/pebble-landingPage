"""score2 lane: the cue sheet's authored spec for revision 2 (the Return), built from 22:13's spec (the archive) with only
the revised parts changed (MONTAGE_DESIGN §5.6). Pure JSON (standard library only): no audio is read or written.

  python3 -I tools/audio/score2/revise_spec.py [WORK_DIR]   ->  WORK_DIR/sheet_spec.json

M6a's EQ comes from the title decision (WORK_DIR/r2/g1_decision.json: the chosen composite's EQ remedy, if any, as
measured in WORK_DIR/r2/title_variants.json); without a decision, M6a has no EQ.
"""
import copy
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
W = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(REPO, ".work", "score2", "cuesheet")
OLD = json.load(open(os.path.join(W, "archive-2026-10-26-2213", "sheet_spec.json")))


def eq_text():
    """M6a's EQ in words, from the title decision and the variant's spec."""
    dp, vp = os.path.join(W, "r2", "g1_decision.json"), os.path.join(W, "r2", "title_variants.json")
    if not (os.path.exists(dp) and os.path.exists(vp)):
        return "none"
    dec = json.load(open(dp))
    vid = dec.get("title_variant_for_the_chosen_side") or dec.get("title_variant")
    v = next((x for x in json.load(open(vp)) if x["id"] == vid), None)
    if not v or not v.get("eq"):
        return "none" if not (v and v.get("dip_db")) else f"none (the dip deepened to {v['dip_db']} dB)"
    words = []
    for s in v["eq"]["specs"]:
        kind = {"highshelf": "high shelf above", "lowshelf": "low shelf below", "peaking": "peak at"}[s["type"]]
        words.append(f"{s['gain_db']:+.1f} dB {kind} {s['hz']:g} Hz" + (f" (Q {s['q']})" if s["type"] == "peaking" else ""))
    q = v["eq"]
    return (f"{' and '.join(words)} on A4 from J5 (1:54.03), in full until {q['full_until_title_plus_s']:g} s after the title and "
            f"gone by {q['zero_at_title_plus_s']:g} s after it (zero-phase, a raised-cosine ramp): the measured remedy for the "
            f"classifier's 'foghorn' reading around the swell and the title (§4.1); an edit of Born Of The Sky (CC BY 4.0)")


EQ_M6 = eq_text()
TITLE_HIT_TEMP = "impact_body_cc0 (Kenney, CC0), tuned to G#2, the title chord's fifth"
sp = copy.deepcopy(OLD)
sp["version"] = "cue sheet revision 2 (27 Oct 2026): the Return at the end only, 35 readable features, F4 on"
m = sp["main"]
oc = OLD["main"]["cues"]
c = {}
c["M1"] = oc["M1"]
c["M2a"] = {
    "role": "the Drop and Ring 1 (your browser): B2 bars 7-16, whole",
    "why": ["the person's energetic favourite (B2, §51)",
            "its own drop at 0:15.53 (+5.0 LU, onset 1.40 of p99) is the Drop's arrival",
            "its arrangement grows across the rings: -12.3, -10.6, -9.4 LUFS raw by section",
            "8-bar phrases at 0:15.53 and 0:31.53: the Drop and Ring 1 start on 4-bar lines (bars 7 and 11), and S09's "
            "send falls near the phrase line at 0:36.00"],
    "eq": "none",
    "layers": ["the Drop composite on 0:20.00 (the plunk 2 frames ahead, the hit, sub 1)",
               "ring_sweep_a 12 frames before Ring 1 (0:27.80)"],
    "exit": "M2s: B2's own forward splice at Ring 2's arrival (0:40.00)"}
c["M2b"] = {
    "role": "Ring 2 (your apps): B2 bars 19-25, after one forward splice that takes out bars 17-18 (Cascade 1's)",
    "why": ["Cascades 1-3 left the main film (§61: 35 readable features at about 2:15). B2 is shortened at bar lines, "
            "forward and in its own order, as §51 and §56 allow",
            "Ring 2 hears exactly the bars it heard on 22:13 (B2 bars 19-25), so its shots keep their timing: the '=' "
            "take, the click, and the Delete card on B2's brighter phrase (bar 23, now 0:48.00)",
            "the splice lands on Ring 2's ring-led arrival (0:40.00), under ring_sweep_c: the cut has a picture cause, "
            "and a sound covers it",
            "of the forward splices that keep Ring 1 whole, this one has the closest harmony on both sides of the cut "
            "(bar chroma cosine 0.998 before and after it)",
            "Cascade 2's bars (26-27) leave from the end: M2 exits after bar 25's hat breath (22:13's F5), into J2"],
    "eq": "none",
    "layers": ["ring_sweep_c 12 frames before Ring 2 (0:39.80): it carries the splice",
               "tick 2 on the real '=' press (S11)", "tick 3 on the real click (S12)"]}
c["M3a"] = {
    "role": "Ring 3's first shot (S15): B4's riser bar 47 and phrase B's arrival, bars 47-49",
    "why": oc["M3"]["why"][:2] + ["its own riser bar (47) and the 3.4 LU breath before 1:32.97 land the lift on Ring "
                                   "3's second arrival (film 0:55.93)"],
    "eq": oc["M3"]["eq"],
    "layers": ["ring_sweep_b, tuned to G, 12 frames before Ring 3 (0:53.80): it also covers J2"],
    "exit": "M3s: B4's own forward splice on the cut from S15 to S16 (0:59.81)"}
c["M3a"]["why"] = [oc["M3"]["why"][0], c["M3a"]["why"][-1]]
c["M3b"] = {
    "role": "the rest of Ring 3 (S16, the flyer), Ring 4 (your project, AgentGuard), Cascade 4 and the ⌘K step into "
            "Stealth: B4 bars 52-63 to its own stop",
    "why": ["Cascade 3 left the film: B4 is shortened by one forward splice of 2 bars inside phrase B (bars 50-51 "
            "out), in its own order",
            "the splice lands on the cut from S15 (the sips receipt) to S16 (the flyer). S16 keeps its four bars (52-55, "
            "7.74 s), and B4's own fill (bar 55) still leads into the phrase line where Ring 4 lands",
            "its phrase line 1:48.45 is Ring 4's start (film 1:07.55); its real stop (2:03.94) lands on the person's "
            "Enter (film 1:23.03)",
            "every shot from S16 to S20 keeps its 22:13 length"],
    "eq": oc["M3"]["eq"],
    "layers": ["ring_sweep_d (or a second take of _a) 12 frames before Ring 4 (1:07.35)",
               "tick 4 (ui_tap_enter) exactly on the stop, 1:23.03, soft: it sits alone in the hush"]}
c["M4"] = copy.deepcopy(oc["M4"])
c["M4"]["layers"] = ["glass_shimmer_a from 1:23.03 with the dusk sweep, about -27 LUFS momentary (the 23:45 build left "
                     "it out of the masters: over B4's ring-out it lifted the classifier's 'foghorn' from 0.33 to 0.46)",
                     "optional room tone under the hush (1:23.03-1:25.13) at -52 LUFS"]
c["M5"] = {
    "role": "the climax, then the Return's lead-in, release, gather and rush: B2 runs on in its own order from "
            "1:24.53 to 1:44.53",
    "why": oc["M5"]["why"] + [
        "the gather and the rush are the film's most feature-heavy 6 s, and §51 gives those to B2 and B4: B2 bars "
        "48-51 measure 2.75-3.5 onsets a beat, where A4 bars 77-79 (revision 1's rush) measure 1.75 (MONTAGE_DESIGN "
        "§2.10)",
        "one excerpt in B2's order, after M2 (which left B2 at 0:53.53) and never overlapping it: B2 shortened, not "
        "rearranged (§51, §56)",
        "the run-on holds the climax's level, so the kept card stays the film's one peak (§1.4: the Return is the "
        "climax's consequence, not a second peak)"],
    "eq": "none",
    "layers": ["the climax composite on 1:38.03 (hit, sub 2); the music ducks for 250 ms",
               "nothing under the Return's cells: no whoosh, and no tick per cell (the budgets are spent; the swaps "
               "ride the music)"]}
c["M6a"] = {
    "role": "the Return's merge on A4's dominant (bars 80-81, dipped 2.5 dB), the title on bar 82, the end card's "
            "page 1 on IV (bar 84)",
    "why": ["the pulse thins at the merge: A4 bars 80-81 measure 1.25 and 1.5 onsets a beat against B2's 2.75-3.5, as "
            "Loops' strong onsets stop for its merge (MONTAGE_DESIGN §2.10; R2 §1.3)",
            "the dip (bars 80-81 at -2.8 dB against M6's -0.3 dB) turns the title into an arrival: raw, A4's bar 81 "
            "is 1.5 LU louder than the title's bar; dipped, it sits under it",
            "the film closes on the voice it opened with (M1): V (bars 80-81), vi (bar 82, the title), IV (bar 84), "
            "I (bar 86)",
            "2:44.52 is the plateau's last strong downbeat (-10.4 LUFS momentary peak), and it rings and steps down: "
            "a title that rings",
            "tempo-matched with B2 (120.014 against 119.994 BPM), so J5 is a beat cut"],
    "eq": EQ_M6,
    "layers": ["the one-bar reverse swell made from A4's own title chord (2:44.52, 4 beats, reversed), 1:56.03-1:58.03, "
               "its last sample on the title frame (7082)",
               "nothing on the blink (R646, 1:56.80): a sound would claim a reaction",
               "the title composite on 1:58.03: the stone tap as its attack (Kenney's standin_tap_a, CC0, tuned to E, "
               "until the person's recording, P9), the hit (final Sonniss EffectiveTrailer_Booms_Vol2_075; temp "
               f"{TITLE_HIT_TEMP}), sub 3 (sub_drop_b, 69.3 to 34.6 Hz), the music ducked for 250 ms; the light "
               "sweep starts 0-2 frames after"]}
c["M6b"] = {
    "role": "after F4: the I chord (2:04.03), page 2 over the composed diminuendo, room tone",
    "why": ["F4 on (§61; MONTAGE_DESIGN §5.6): bar 85, the second bar of A4's held IV chord, is taken out; bars 84 and "
            "85 are near-identical (chroma cosine 0.995, MFCC cosine 0.996, -17.1 against -18.2 LUFS raw)",
            "its composed diminuendo carries page 2 and decays to -45 LUFS momentary about 0.6 s before the end: a "
            "real ending, never a fade"],
    "eq": "none",
    "layers": ["room tone after the decay (2:14.81-2:15.03)"],
    "exit": "the track's own composed ending: vi, IV, I and a diminuendo that falls below -45 LUFS momentary at about "
            "2:14.41; room tone to the last frame (2:15.03); never a fade"}
m["cues"] = c
oj = OLD["main"]["joins"]
j = {}
j["J1"] = oj["J1"]
j["M2s"] = {
    "name": "Ring 2 (the splice)",
    "methods": ["a forward splice at bar lines inside one track", "a ring sound effect carrying across"],
    "how": "B2 bar 16 runs into bar 19: bars 17-18 (Cascade 1's) are taken out. The 60 ms pre-roll crossfade ends on "
           "bar 19's downbeat, the cutter's rule, and ring_sweep_c starts 12 frames before it as Ring 2 arrives. B2's "
           "order is kept (§51: shortened at bar lines).",
    "motivation": "Ring 2's ring-led arrival (your apps): the cascade between the rings left the film, and the music "
                  "joins the two rings where the picture does",
    "tempo": "the same track: the grid holds (119.994 BPM)",
    "key": "the same section (G major): bars 16 and 18 share their harmony (bar chroma cosine 0.998), as do bars 17 "
           "and 19"}
j["J2"] = copy.deepcopy(oj["J2"])
j["J2"]["how"] = ("B2's hats thin over the last two beats of bar 25 (its milder breath: 22:13's F5). The cut lands on "
                  "B4's bar 47, its own riser bar, with Ring 3's sweep pre-lapped 12 frames. B4's riser and its own "
                  "3.4 LU breath lift into its phrase B at 0:55.93, the second ring arrival. 60 ms pre-roll; no beat "
                  "overlap.")
j["M3s"] = {
    "name": "Ring 3 (the splice)",
    "methods": ["a forward splice at bar lines inside one track", "a hard cut in the picture on the same frame"],
    "how": "B4 bar 49 runs into bar 52: bars 50-51 are taken out of phrase B, so S16 keeps its four bars (52-55) and "
           "B4's own fill (bar 55) still leads into the phrase line where Ring 4 lands. The 60 ms pre-roll ends on bar "
           "52's downbeat.",
    "motivation": "the cut from S15 (the sips receipt) to S16 (the flyer)",
    "tempo": "the same track: the grid holds (123.995 BPM)",
    "key": "the same riff (G-centred, 6A): bars 49 and 51 share their harmony (bar chroma cosine 0.999), as do bars 50 "
           "and 52 (0.998)"}
j["J3"] = copy.deepcopy(oj["J3"])
j["J3"]["how"] = j["J3"]["how"].replace("M4 fades in from 1:36.40", "M4 fades in from 1:24.53")
j["J4"] = copy.deepcopy(oj["J4"])
j["J4"]["how"] = j["J4"]["how"].replace("on the lift at 1:49.90", "on the lift at 1:38.03")
j["J5"] = {
    "name": "The merge",
    "methods": ["a tempo-matched beat cut where the tempos line up",
                "a planned dip into an arrival (the title), with a one-bar reverse swell made from the track's own chord"],
    "how": "B2 (119.994 BPM) cuts to A4 (120.014) on A4's bar-80 downbeat at R480, with a 60 ms pre-roll: the pulse "
           "never breaks. B2's lift has run on in its own order to 1:44.53 (a measured downbeat, the end of the lift's "
           "first 8-bar phrase). A4 bars 80-81 (V) play 2.5 dB under M6's level while the cells return into the stone; "
           "a one-bar reverse swell made from A4's own title chord rises into the title, where M6 is back at -0.3 dB.",
    "motivation": "Every cell returns into the stone, and the score folds back into the film's opening voice; the "
                  "pulse thins as the field drains, and the title lands as an arrival.",
    "tempo": "120 to 120 (0.017 %)",
    "key": "B2's lift into A4's B major (bars 80-81, V of E): the move 22:13 analysed for bar 81, one bar earlier, "
           "measured across the seam in §2; then V to vi at the title"}
j["F4"] = {
    "name": "The end card (the splice)",
    "methods": ["a forward splice at bar lines inside one track (CC BY, edited)", "a crossfade inside a held chord"],
    "how": "A4 bar 84 runs into bar 86: bar 85, the second bar of the held IV chord, is taken out, with a 200 ms "
           "equal-power crossfade ending on bar 86's downbeat (I). Page 1 hears one bar of IV before I.",
    "motivation": "F4 on (§61): the film runs about 2:15, and page 2 keeps 7.0 s (it needs 6.2)",
    "tempo": "the same track",
    "key": "IV held, then I"}
m["joins"] = j
m["shots"] = [
    ["S01", "Act I", {"cue": "M1", "src": 12.5427}, "the question typed and sent (tick 1)"],
    ["S02", "Act I", {"cue": "M1", "src": 16.5423}, "'Pebble 2.0' lands on the downbeat (designed soft hit); the reply streams"],
    ["S03", "Act I", {"cue": "M1", "src": 20.5418}, "the Space swipe on A4's own lift (whoosh 12 frames early)"],
    ["S04", "Act I", {"cue": "M1", "src": 24.5413}, "the banner"],
    ["S05", "Act I", {"cue": "M1", "src": 26.5411}, "the card 'Use youtube.com'; L04; the pointer to Allow over A4's crescendo"],
    ["S06", "The Drop", {"cue": "M2a", "src": 15.5267}, "Allow on the downbeat; the ring leaves the stone; the frame opens; L05 and L06"],
    ["S07", "The Drop", {"cue": "M2a", "src": 19.5269}, "the whole Mac; the browser keeps its 1x time"],
    ["S08", "Ring 1", {"cue": "M2a", "src": 23.5271}, "ring-led arrival on Pebble's tab; the video starts; L07, L08"],
    ["S09", "Ring 1", {"cue": "M2a", "src": 29.5274}, "'Play the next one.' (the send falls near B2's phrase line at 0:36.00); L09"],
    ["S11", "Ring 2", {"cue": "M2b", "src": 39.5279}, "ring-led arrival on B2's splice (M2s); Calculator '=' at 1x (tick 2); L11"],
    ["S12", "Ring 2", {"cue": "M2b", "src": 44.0279}, "a click by picture after the first-action card (tick 3)"],
    ["S13", "Ring 2", {"cue": "M2b", "src": 47.5283}, "the Delete card waits; L12; on B2's brighter phrase"],
    ["S15", "Ring 3", {"cue": "M3a", "src": 91.0326}, "two ring-led moves; the second lands on B4's phrase B (0:55.93); the sips receipt; L14, L15"],
    ["S16", "Ring 3", {"cue": "M3b", "src": 100.7104}, "the flyer, on B4's splice (M3s): the folder card, Allow, 'Wrote ...', the push to Undo"],
    ["S18", "Ring 4", {"cue": "M3b", "src": 108.4527}, "studio-bookings: Running to Done to Verified at 1x; L17, L18; on B4's phrase line"],
    ["S19", "Cascade 4", {"cue": "M3b", "src": 116.1949}, "'Bigger tasks' (4 items)"],
    ["S20", "Quiet passage", {"cue": "M3b", "src": 120.066}, "⌘K, 'stealth', the row lights; Enter lands on B4's stop; the light starts to cool"],
    ["S21", "Quiet passage", {"cue": "M3b", "src": 123.9372}, "the Veil (a render, labelled); the honest line begins; B4 rings out, then the Dusk pad"],
    ["S22", "Quiet passage", {"film": 89.0327}, "the crane to the menu bar; the honest line holds; B2's breakdown pre-rolls in for the last second"],
    ["S23", "Climax", {"cue": "M5", "src": 84.53}, "evening; 'Keep this tool in Pebble's Toolbox?'; L24; the build"],
    ["S24", "Climax", {"cue": "M5", "src": 87.53}, "Kiln, one 1x take; the kept card lands on B2's lift at +1.0 s (1:38.03); L25"],
    ["S25", "The Return", {"cue": "M5", "src": 95.5305},
     "the Return (MONTAGE_DESIGN §2): R-60 the pull-back from S24's last frame; R0 the release; R120 the gather; R360 "
     "the rush; R480 J5, the merge on A4's dominant; R600 the swell; R646 the blink; one continuous shot"],
    ["S26", "Title", {"cue": "M6a", "src": 164.5244}, "the stone at rest; 'Pebble 2.0' on A4's last strong downbeat (R720); the tap, the hit, sub 3; the light sweep; L26, L27"],
    ["S27", "End card", {"cue": "M6a", "src": 168.5239}, "page 1, the facts, on IV; the I chord arrives 2 s in (2:04.03, after F4)"],
    ["S28", "End card", {"cue": "M6b", "src": 176.5229}, "page 2, the small print, over the composed diminuendo; room tone for the last 0.22 s"],
]
m["end_film_s"] = 135.0333
m["swell"] = {"beats": 4, "bpm": 120.014, "end_film_s": 118.0332, "from_src_s": 164.5244,
              "what": "a reverse swell made from A4's own title chord (2:44.52; CC BY 4.0, edited) with the kit's preverb, "
                      "one bar long, its last sample on the title frame; its loudest 400 ms 3 dB under the music over its "
                      "last second; high-passed at 150 Hz so sub 3 owns the low end"}
m["acts"] = [["Act I and the Drop", "S01", "S07"], ["The rings", "S08", "S19"],
             ["The quiet passage to the end", "S20", "S28"]]
m["sync_points"] = [
    [3.0, "about here: the real send of the typed question (tick 1); the take decides the frame"],
    [{"cue": "M1", "src": 16.5423}, "the name: 'Pebble 2.0' (soft designed hit)"],
    [{"cue": "M1", "src": 20.5418}, "A4's lift: the Space slide (whoosh starts 12 frames before)"],
    [{"cue": "M2a", "src": 15.5267}, "THE DROP: the Allow click, the plunk 2 frames ahead, the hit, sub 1, the frame opens"],
    [{"cue": "M2a", "src": 23.5271}, "Ring 1 arrival"],
    [{"cue": "M2a", "src": 31.5275}, "B2 phrase line (inside S09)"],
    [{"cue": "M2b", "src": 39.5279}, "Ring 2 arrival = M2's splice (M2s), under ring_sweep_c"],
    [{"cue": "M2b", "src": 47.5283}, "B2's brighter phrase (S13)"],
    [{"cue": "M3a", "src": 91.0326}, "J2: Ring 3's first ring-led move; the cut to B4"],
    [{"cue": "M3a", "src": 92.9682}, "Ring 3's second arrival on B4's phrase B: the lift"],
    [{"cue": "M3b", "src": 100.7104}, "S16 = M3's splice (M3s)"],
    [{"cue": "M3b", "src": 108.4527}, "Ring 4 on B4's phrase line"],
    [{"cue": "M3b", "src": 116.1949}, "Cascade 4"],
    [{"cue": "M3b", "src": 120.066}, "⌘K"],
    [{"cue": "M3b", "src": 123.9372}, "ENTER = B4's stop (tick 4 alone in the hush); the Veil"],
    [{"cue": "M4", "src": 12.9683}, "the Dusk pad begins (2 s fade-in)"],
    [{"cue": "M5", "src": 84.53}, "S23: the ask card; B2's breakdown at full"],
    [{"cue": "M5", "src": 88.0302}, "B2's own one-beat stop: the held breath"],
    [{"cue": "M5", "src": 88.5302}, "THE KEPT CARD on B2's lift: the climax hit, sub 2"],
    [{"cue": "M5", "src": 95.5305}, "R-60: the pull-back from the kept card begins (S25)"],
    [{"cue": "M5", "src": 96.5306}, "R0: the release (B2 bar 48)"],
    [{"cue": "M5", "src": 98.5307}, "R120: the gather (B2 bar 49)"],
    [{"cue": "M5", "src": 100.5308}, "R240: the swaps begin (B2 bar 50)"],
    [{"cue": "M5", "src": 102.5309}, "R360: the rush (B2 bar 51)"],
    [{"cue": "M6a", "src": 160.5249}, "R480 = J5: the beat cut to A4 bar 80 (V); the merge; the dip"],
    [{"cue": "M6a", "src": 162.5246}, "R600: A4 bar 81; the one-bar reverse swell begins"],
    [{"cue": "M6a", "src": 163.2913}, "R646: the blink (staged with the engine's own idle blink; no sound)"],
    [{"cue": "M6a", "src": 164.5244}, "R720 = THE TITLE on A4's vi chord: the tap, the hit, sub 3, the light sweep"],
    [{"cue": "M6a", "src": 166.0242}, "A4 breathes (beat 4) and steps down at 2:46.52 under the title's hold"],
    [{"cue": "M6a", "src": 168.5239}, "END CARD page 1 on IV"],
    [{"cue": "M6b", "src": 172.5234}, "F4: the I chord (bar 86); the music comes home"],
    [{"cue": "M6b", "src": 176.5229}, "END CARD page 2 over the diminuendo (bar 88)"],
    [{"cue": "M6b", "src": 182.9}, "the decay reaches -45 LUFS momentary; room tone to the end"]]
x = sp["x40"]
x["cues"]["X3"]["role"] = "the 40-s Return and the title on B4's real stop; the ring-out under the facts"
x["cues"]["X3"]["layers"] = ["the XJ2 mask: a reverse swell from impact_body_cc0's room tail (CC0), tuned to G, half a "
                             "bar, rising into 0:32.00 (MONTAGE_DESIGN §5.5)",
                             "the title composite on the stop at 0:33.94 (the tap, the hit, sub 3)",
                             "room tone from 0:38.5 to 0:40.0"]
x["joins"]["XJ2"] = {
    "name": "The 40-s Return",
    "methods": ["a reverse swell into a downbeat (CC0, from the kit)", "a hard cut on a downbeat"],
    "how": "B2's lift cuts to B4's last bar (2:02.00) on the downbeat; a half-bar reverse swell made from the room tail "
           "of impact_body_cc0 (Kenney, CC0), tuned to G, rises into it and covers the cut; B4 stops one bar later on "
           "the title. Level-matched (B4 at -2.0 dB). The Mixkit ring sweep that covered it on 22:13 stays out (CR-13).",
    "motivation": "the 40-s Return: 4-6 recall cells on one ring return into the stone, and the title lands on the stop",
    "tempo": "120 to 124 BPM: the Return accelerates into the stop",
    "key": "both G-centred; the swell is tuned to G"}
x["slots"] = [s if s[0] != "x8" else ["x8", "the 40-s Return (MONTAGE_DESIGN §5.5): 4-6 recall cells on one ring as "
                                      "the camera leaves the kept card; the returns staggered over its last 40 frames, "
                                      "the kept card last", s[2]] for s in OLD["x40"]["slots"]]
sp["flex"] = [
    ["F1", "-2.0 s: the 10-s Return",
     "if G1's viewers name the Return as the big one (MONTAGE_DESIGN §1.4, §2.2): M5 ends at B2 1:42.53 (bar 51) and "
     "J5 cuts onto A4 bar 80 at R360; the title at R600 (1:56.03); the film 2:13.03. That J5 (B2 bar 51's downbeat) is "
     "not measured yet: measure it as this J5 was before use"],
    ["F2", "+1.94 s for Rings 3-4",
     "M3 enters one bar earlier at bar 46 (1:29.10, the start of its riser); J2 stays the cut, Ring 3's lift moves to "
     "2 bars after the cut; everything after +1.94 s; the film 2:16.97"],
    ["F3", "the quiet passage",
     "M4 is a pulse-free pad: S21+S22 may run 10.0-14.5 s without touching any downbeat (M5's in-point moves with it). "
     "This is where L23's optional 2 s goes, if 2.0.0 ships the focus fix"],
    ["F4", "ON in this revision (-2.0 s at the end)",
     "a CC BY splice inside A4's held IV chord: bar 85 out (2:50.52-2:52.52; chroma cosine 0.995 and MFCC cosine 0.996 "
     "with bar 84, -17.1 against -18.2 LUFS), 200 ms crossfade ending on bar 86's downbeat; page 1 hears IV for one "
     "bar before I. Off again: +2.0 s"],
    ["F5", "Cascade 4 out (31 readable): +3.87 s for Ring 4, no change in length",
     "if Ring 4 cannot reach its 7.74-s phrase by content (MONTAGE_DESIGN §5.4): Cascade 4 leaves and Ring 4 runs on "
     "through its two bars (B4 bars 56-61, 11.61 s), so no splice and no new seam. If Ring 4 needs its whole as-built "
     "15.48 s, M3 also enters two bars earlier (bar 45, 1:27.16; F2 doubled): everything from J2 on moves +3.87 s and "
     "the film runs 2:18.90, MONTAGE_DESIGN §5.1's fallback"]]
sp["shorts"]["rule"] = sp["shorts"]["rule"].replace(
    "(the person's recorded tap and plunk; the kit's stand-in until then)",
    "(the person's recorded tap; until then the kit's CC0 standin_tap_a alone: stinger_standin held a Mixkit plunk and "
    "left the kit, §60). Each short ends on a family Return of 1-2 s (MONTAGE_DESIGN §5.5), except L (Stealth)")
sp["tour"]["rule"] += (" The tour has its own end card and no Return: the device appears once per film "
                       "(MONTAGE_DESIGN §5.5).")
with open(os.path.join(W, "sheet_spec.json"), "w") as fh:
    json.dump(sp, fh, indent=1, ensure_ascii=False)
print("wrote", os.path.join(W, "sheet_spec.json"), "| M6a EQ:", EQ_M6)
