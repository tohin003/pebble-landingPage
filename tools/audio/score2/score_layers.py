"""score2 lane: write the layer sheets the masters are built from (master/layers_main.json, master/layers_x40.json).

A layer sheet is this lane's reading of the cue sheet's sound design, loudness and EQ (CUE_SHEET.md §1, §3, §4, §6 and
each cue's 'layers' in CUE_SHEET.json) on top of a cue plan (cuesheet/plan_main.json, plan_x40.json). Every time is
read from the plan (its seams, events and the Return's frames), so the sheet moves with the music. Pure Python: no audio.

The Return revision (28 Oct) differs from 26 Oct 23:50's sheet (kept in master/archive-2026-10-26-2350/) in:
  - every time after the Drop moved with the revised music (Ring 2 at 0:40.00, Ring 3 0:54.00, Ring 4 1:07.55, Enter
    1:23.03, the kept card 1:38.03, the title 1:58.03, the end 2:15.03);
  - M3 is two excerpts (M3a, M3b), each with the cue sheet's low shelf; M6 has no EQ and no J5 ramp (CUE_SHEET §3);
  - the title composite is the cue sheet's C7 (CUE_SHEET §4.1): the one-bar reverse swell from A4's title chord,
    high-passed at 300 Hz and 6 dB under the music; the stone tap (standin_tap_a, Kenney CC0, tuned to E) as the attack;
    the temp hit impact_body_cc0 (Kenney CC0) tuned to G#2, pre-limited 4 dB, high-passed at 150 Hz, its tail kept
    0.35 s after the peak then faded over 0.5 s, level with the music; sub 3 (69.3 -> 34.65 Hz); the 1.5 dB duck;
  - the 40-s cut's XJ2 is masked by the CC0 reverse swell from impact_body_cc0's room tail, tuned +13 semitones (G3),
    as plan_x40.json says; the Mixkit ring sweep that covered it on 26 Oct stays out (OVERRIDES §55 CR-13); the 40-s
    title composite gains the stone tap as its attack (CUE_SHEET.json X3 'layers').

  python3 -I tools/audio/score2/score_layers.py .work/score2
"""
import json
import os
import sys

FR = 60.0  # the film's frame rate: "12 frames early" is 0.2 s

MASTERS = {
    "web": {"lufs": -16.0, "ceiling_dbtp": -2.0, "aac_kbps": 160, "release_ms": 100.0, "aac_tp_max_dbtp": -1.5,
            "aac_reference_encoder": "apple_audiotoolbox_cbr"},
    "social": {"lufs": -14.0, "ceiling_dbtp": -1.5, "aac_kbps": 192, "release_ms": 100.0, "aac_tp_max_dbtp": -1.0,
               "aac_reference_encoder": "apple_audiotoolbox_cbr"},
}
BUDGETS = [["drop_sub", 1.0], ["climax_sub", 1.0], ["title_sub", 1.0], ["swell", 1.0], ["mask", 1.0], ["drop", 2.5],
           ["climax", 2.5], ["title", 2.5], ["name", 0.5], ["slide", 0.5], ["tick1", 0.5], ["tick2", 0.5], ["tick3", 0.5],
           ["enter", 0.5], ["ring1", 0.5], ["ring2", 0.5], ["ring3", 0.5], ["ring4", 0.5]]  # the 40-s mask is a reverse
# swell, so it is fitted with the sustained layers (1.0 dB), as the title's swell
WHY_DUCK = ("1.5 dB, not 3 dB, on the music's own loudest arrivals (B2's lift at the kept card, A4's title chord, B4's "
            "stop in the 40-s cut): the 26 Oct 23:45 build measured a 3 dB duck there as quieter than the music alone "
            "(title -1.2 dB over 400 ms); CUE_SHEET §3 carries 1.5 dB for the climax and the title.")
RULES = {
    "levels": "Pre-master levels. 'rel': the layer's loudest 400 ms is set to the music bed's K-weighted loudness over "
              "'ref' plus 'offset_db' (KIT.md §2.1's relations to the score: hits +3 with their duck, subs -4, the plunk "
              "0, ring sweeps -4, the slide -6, ticks by peak -9). 'abs_m' and 'abs_i' are the cue sheet's absolute "
              "levels (the name's soft hit and the Enter tick about -30, room tone).",
    "align": "peak: the take's loudest sample on t; start: its first sample on t (whooshes 12 frames before their move, "
             "subs on the downbeat); end: its last sample just before t (the swells).",
    "limiter_budget": "A budget group adds at most this many dB of gain reduction to the social master's limiter at "
                      "any 10 ms; its gain is lowered until it does not (twice, in this order: the sustained layers "
                      "first, each sub and each reverse swell 1.0 dB; then the hit composites 2.5 dB; then the small "
                      "layers 0.5 dB).",
    "title_c7": "CUE_SHEET §4.1: composite C7, carried while the 'foghorn' flag stays open (round 2's rule; worst 0.387 "
                "on the 0.5-s grid, a warn at most on the master's own grids). Temp hit until the Sonniss boom and the "
                "person's tap (P9).",
    "licences": "OVERRIDES §55 CR-13 and §60: every Mixkit take in the kit was fetched by script. They stand in this "
                "WORKING build exactly as the cue sheet names them ('Mixkit, by hand'), and the person downloads each "
                "by hand from its page before the final masters (SCORE_PROVENANCE.json lists them). The 20 takes §60 "
                "removed are never picked.",
}


def seam_t(plan, sid):
    return next(s["t"] for s in plan["seams"] if s["id"] == sid)


def event_t(plan, label):
    return next(e["t"] for e in plan["events"] if e["label"] == label)


def r4(v):
    return round(float(v), 4)


def sweep(lid, group, label, take, t, dur, cue, tune=None):
    L = {"id": lid, "group": group, "label": label, "role": "sweep", "take": take, "t": r4(t), "align": "start",
         "level": {"mode": "rel", "ref": [r4(t), r4(t + dur)], "offset_db": -4.0}, "cue_sheet": cue}
    if tune:
        L["tune"] = tune
    return L


def tick(lid, group, label, take, t, note, cue, provisional=None):
    L = {"id": lid, "group": group, "label": label, "role": "tick", "take": take, "t": r4(t), "align": "peak",
         "level": {"mode": "peak_rel", "ref": [r4(t - 1.5), r4(t + 1.5)], "offset_db": -9.0}, "cue_sheet": cue}
    if note:
        L["tune"] = {"to_note": note}
    if provisional:
        L["provisional"] = provisional
    return L


def drop_group(t, plunk_frames=2):
    ref = [r4(t), r4(t + 3.0)]
    lab = "THE DROP: the plunk (stand-in), the hit (temp), sub 1"
    return [
        {"id": "drop_plunk", "group": "drop", "label": lab, "role": "plunk", "take": "standin_plunk_a",
         "t": r4(t - plunk_frames / FR), "align": "peak", "level": {"mode": "rel", "ref": ref, "offset_db": 0.0},
         "cue_sheet": "§4: the plunk, standin_plunk_a (Mixkit, by hand) until the person's recording, 2 frames ahead "
                      "of the hit; it stays at the Drop (§61 R3)"},
        {"id": "drop_hit", "group": "drop", "label": lab, "role": "hit", "take": "drop_impact_a", "t": r4(t),
         "align": "peak", "level": {"mode": "rel", "ref": ref, "offset_db": 3.0}, "prelimit_db": 4.0, "highpass_hz": 70.0,
         "cue_sheet": "§4: the Drop: final from Sonniss or our recording; temp drop_impact_a (Mixkit, by hand); CC0 "
                      "fallback drop_impact_cc0; the music ducks 3 dB"},
        {"id": "drop_sub", "group": "drop", "label": lab, "role": "sub",
         "designed": {"base": "sub_drop_b", "params": {"f0": 49.0, "f1": 24.5}}, "t": r4(t), "align": "start",
         "level": {"mode": "rel", "ref": ref, "offset_db": -4.0}, "budget_group": "drop_sub",
         "cue_sheet": "§4: sub_drop_b from 49.0 Hz (G1, B2's tonic), an octave down"},
    ]


def main_sheet(plan):
    t_drop = seam_t(plan, "J1")
    t_ring2, t_ring3 = seam_t(plan, "M2s"), seam_t(plan, "J2")
    t_ring4 = event_t(plan, "Ring 4")
    t_enter = seam_t(plan, "J3")
    t_kept = event_t(plan, "kept card")
    t_title = plan["return"]["R720_film_s"]
    t_ring1 = 27.998  # B2 bar 11's downbeat: Ring 1's arrival (CUE_SHEET.json sync points, 0:28.00, frame 1680)
    end = plan["end_film_s"]
    m6b = next(c for c in plan["cues"] if c["id"] == "M6b")
    music_end = m6b["film_in"] + (m6b["tail"]["until"] - m6b["src_in"])  # A4's decay ends here (ring-out, then silence)
    room_fade_from = music_end - m6b["tail"]["fade"]
    lay = []
    lay.append({"id": "room_open", "group": "room", "label": "room tone under the first frame", "role": "room",
                "take": "room_tone_b", "t": 0.0, "align": "start",
                "excerpt": {"from_s": 0.0, "dur_s": 1.0, "fade_in_s": 0.005, "fade_out_s": 0.4},
                "level": {"mode": "abs_i", "lufs": -58.0},
                "cue_sheet": "§4: 0:00.00-0:01.00 room tone, room_tone_b, -52 LUFS (the build used -58)",
                "departure": "-58 LUFS, as the 26 Oct build: at -52 it added 0.07 'foghorn' to the opening window, "
                             "where Born Of The Sky's quiet pad at +12 dB already reads high on its own (CUE_SHEET §1 M1)"})
    lay.append(tick("tick_send", "tick1", "tick 1: the question is sent (placeholder time)", "ui_tap_send", 3.0, "E",
                    "§4: tick 1, the send, ui_tap_send (Kenney CC0), tuned to E, 6-12 dB under",
                    "the real send's frame comes with the 2.0.0 take (BEAT_SHEET: 'about 0:03.00')"))
    lay.append({"id": "name_hit", "group": "name", "label": "the name's soft hit: “Pebble 2.0”", "role": "soft_hit",
                "take": "impact_body_cc0", "t": r4(event_t(plan, "name") - 0.0004), "align": "peak",
                "level": {"mode": "abs_m", "lufs": -30.0},
                "cue_sheet": "§4: 0:04.00 (240) impact_body_cc0 (Kenney CC0), about -30 LUFS momentary, no sub"})
    lay.append({"id": "slide_whoosh", "group": "slide", "label": "whoosh: the Space slide, on A4's own lift",
                "role": "sweep", "take": "whoosh_slide_a", "t": 7.7991, "align": "start",
                "level": {"mode": "rel", "ref": [7.7991, 8.2731], "offset_db": -6.0},
                "cue_sheet": "§4: 0:07.80 (468) whoosh_slide_a (Mixkit, by hand), 12 frames before the slide; whoosh 1 of 5"})
    lay += drop_group(t_drop)
    lay.append(sweep("ring1_sweep", "ring1", "ring sweep: Ring 1 arrives (your browser)", "ring_sweep_a",
                     t_ring1 - 12 / FR, 1.0314, "§4: 0:27.80 (1668) ring_sweep_a (Mixkit, by hand); whoosh 2 of 5"))
    lay.append(sweep("ring2_sweep", "ring2", "ring sweep: Ring 2 arrives (your apps), across the splice",
                     "ring_sweep_c", t_ring2 - 12 / FR, 1.1084,
                     "§4: 0:39.80 (2388) ring_sweep_c (Mixkit, by hand), carries M2s; whoosh 3 of 5"))
    lay.append(tick("tick_equals", "tick2", "tick 2: Calculator's “=” (placeholder time)", "ui_tap_key",
                    t_ring2 + 1.5, "G", "§4: tick 2, '=', ui_tap_key (Kenney CC0), tuned to G",
                    "the real press's frame comes with the take (CUE_SHEET §4: 'in S11, about 0:41-0:42')"))
    lay.append(tick("tick_click", "tick3", "tick 3: the click (placeholder time)", "ui_tap_click", t_ring2 + 6.0, None,
                    "§4: tick 3, the click, ui_tap_click (Kenney CC0)",
                    "the real click's frame comes with the take (CUE_SHEET §4: 'in S12, about 0:46'); not tuned: the "
                    "take has no measurable pitch"))
    lay.append(sweep("ring3_sweep", "ring3", "ring sweep (tuned to G): Ring 3, across the cut to Techno Fest Vibes",
                     "ring_sweep_b", t_ring3 - 12 / FR, 2.8335,
                     "§4: 0:53.80 (3228) ring_sweep_b (Mixkit, by hand), retuned to G, covers J2; whoosh 4 of 5",
                     tune={"to_note": "G", "keep_length": True}))
    lay.append(sweep("ring4_sweep", "ring4", "ring sweep: Ring 4 arrives (your project)", "ring_sweep_d",
                     t_ring4 - 12 / FR, 1.201, "§4: 1:07.35 (4041) ring_sweep_d (Mixkit, by hand); whoosh 5 of 5"))
    lay.append({"id": "tick_enter", "group": "enter", "label": "tick 4: Enter, alone in the hush, on B4's stop",
                "role": "tick", "take": "ui_tap_enter", "t": r4(t_enter), "align": "peak", "tune": {"to_note": "A#"},
                "level": {"mode": "abs_m", "lufs": -30.0},
                "cue_sheet": "§4: 1:23.03 (4982) tick 4, Enter, on B4's stop, ui_tap_enter (Kenney CC0), soft (about "
                             "-30 LUFS), tuned to Bb"})
    lay.append({"id": "dusk_shimmer", "group": "enter", "label": "the dusk shimmer", "role": "shimmer",
                "take": "glass_shimmer_a", "t": r4(t_enter), "align": "start", "level": {"mode": "abs_m", "lufs": -27.0},
                "cue_sheet": "§4: 1:23.03 glass_shimmer_a, about -27 LUFS momentary; the 23:45 build left it out",
                "omit": "left out of the masters, as the 26 Oct 23:45 build and CUE_SHEET §4 record: over B4's "
                        "ring-out and the Starfire pad it lifts the classifier's 'foghorn' (0.33 to 0.46); the Enter "
                        "tick sits alone in the hush, as J3 describes"})
    lay.append({"id": "room_hush", "group": "room", "label": "room tone under the hush", "role": "room",
                "take": "room_tone_b", "t": r4(t_enter), "align": "start",
                "excerpt": {"from_s": 3.0, "dur_s": 2.1, "fade_in_s": 0.1, "fade_out_s": 0.6},
                "level": {"mode": "abs_i", "lufs": -52.0},
                "cue_sheet": "M4 layers: optional room tone under the hush (1:23.03-1:25.13) at -52 LUFS"})
    ref_k = [r4(t_kept), r4(t_kept + 3.0)]
    lab_k = "THE KEPT CARD: the climax hit (temp) and sub 2"
    lay.append({"id": "climax_hit", "group": "climax", "label": lab_k, "role": "hit", "take": "drop_impact_a",
                "t": r4(t_kept), "align": "peak", "level": {"mode": "rel", "ref": ref_k, "offset_db": 3.0},
                "prelimit_db": 4.0, "highpass_hz": 70.0,
                "cue_sheet": "§4: 1:38.03 (5882) the climax: final EffectiveTrailer_Booms_Vol2_011 (Sonniss); temp "
                             "drop_impact_a (Mixkit, by hand; drop_impact_d read 'telephone'); the music ducks 250 ms"})
    lay.append({"id": "climax_sub", "group": "climax", "label": lab_k, "role": "sub",
                "designed": {"base": "sub_drop_a", "params": {"f0": 49.0, "f1": 24.5}}, "t": r4(t_kept),
                "align": "start", "level": {"mode": "rel", "ref": ref_k, "offset_db": -4.0}, "budget_group": "climax_sub",
                "cue_sheet": "§4: sub_drop_a from 49.0 Hz (G1)"})
    ref_t = [r4(t_title), r4(t_title + 3.0)]
    lab_t = "THE TITLE: the stone tap (stand-in), the hit (temp), sub 3"
    lay.append({"id": "title_swell", "group": "swell", "label": "the one-bar reverse swell from Born Of The Sky's own "
                "title chord", "role": "swell",
                "swell": {"track": "BornOfTheSky", "at_src": 164.5244, "beats": 4, "bpm": 120.014},
                "t": r4(t_title), "align": "end", "highpass_hz": 300.0,
                "level": {"mode": "rel", "ref": [r4(t_title - 1.0), r4(t_title)], "offset_db": -6.0},
                "budget_group": "swell",
                "cue_sheet": "§4, C7: 1:56.03-1:58.03 the one-bar reverse swell from A4's own title chord (2:44.52, 4 "
                             "beats, reversed), its last sample on the title frame (7082), high-passed at 300 Hz, its "
                             "loudest 400 ms 6 dB under the music over its last second (CC BY, edited)"})
    lay.append({"id": "title_tap", "group": "title", "label": lab_t, "role": "tap", "take": "standin_tap_a",
                "t": r4(t_title), "align": "peak", "tune": {"to_note": "E"},
                "level": {"mode": "rel", "ref": ref_t, "offset_db": -3.0},
                "cue_sheet": "§4, C7: the stone tap as the attack, standin_tap_a (Kenney CC0), tuned to E, until the "
                             "person's recording (P9); moved here from S06 (§61 R3)"})
    lay.append({"id": "title_hit", "group": "title", "label": lab_t, "role": "hit", "take": "impact_body_cc0",
                "t": r4(t_title), "align": "peak", "tune": {"to_note": "G#"}, "prelimit_db": 4.0, "highpass_hz": 150.0,
                "tail": {"keep_s_after_peak": 0.35, "fade_s": 0.5},
                "level": {"mode": "rel", "ref": ref_t, "offset_db": 0.0},
                "cue_sheet": "§4, C7: the hit, final Sonniss EffectiveTrailer_Booms_Vol2_075 (by hand); temp "
                             "impact_body_cc0 (Kenney CC0) tuned to G#2 (the title chord's fifth), shortened (0.35 s + "
                             "a 0.5-s fade), high-passed at 150 Hz, level with the music"})
    lay.append({"id": "title_sub", "group": "title", "label": lab_t, "role": "sub",
                "designed": {"base": "sub_drop_b", "params": {"f0": 69.3, "f1": 34.65}}, "t": r4(t_title),
                "align": "start", "level": {"mode": "rel", "ref": ref_t, "offset_db": -4.0}, "budget_group": "title_sub",
                "cue_sheet": "§4, C7: sub 3, sub_drop_b 69.3 -> 34.65 Hz (C#2, the title chord's root)"})
    lay.append({"id": "room_end", "group": "room", "label": "room tone after the decay", "role": "room",
                "take": "room_tone_b", "t": r4(room_fade_from), "align": "start",
                "excerpt": {"from_s": 9.0, "dur_s": r4(end - room_fade_from), "fade_in_s": round(m6b["tail"]["fade"], 3),
                            "fade_out_s": 0.02},
                "level": {"mode": "abs_i", "lufs": -52.0},
                "cue_sheet": "§4: 2:14.81-2:15.03 room tone, room_tone_b, after the decay (it fades in under A4's last "
                             "0.3 s, so the film never falls to digital silence)"})
    ducks = [
        {"id": "drop", "t": r4(t_drop), "db": -3.0, "attack_s": 0.01, "hold_s": 0.15, "release_s": 0.4},
        {"id": "climax", "t": r4(t_kept), "db": -1.5, "attack_s": 0.01, "hold_s": 0.25, "release_s": 0.4, "why": WHY_DUCK},
        {"id": "title", "t": r4(t_title), "db": -1.5, "attack_s": 0.01, "hold_s": 0.25, "release_s": 0.4, "why": WHY_DUCK},
    ]
    shelf = {"type": "lowshelf", "hz": 60.0, "gain_db": -1.5, "q": 0.7071,
             "why": "CUE_SHEET §1 M3 and §3: a low shelf of -1.5 dB below 60 Hz (B4's sub share is about twice B2's)"}
    return lay, ducks, {"M3a": [shelf], "M3b": [shelf]}


def x40_sheet(plan):
    t_drop = event_t(plan, "DROP")
    xj2 = next(s for s in plan["seams"] if s["id"] == "XJ2")
    t_title = event_t(plan, "TITLE (stop)")
    t_kept = event_t(plan, "kept card")
    lay = [tick("tick_send", "tick1", "tick 1: the question is sent (placeholder time)", "ui_tap_send", 3.0, "D",
                "X1 layers: tick 1 on the send (tuned to D, a chord tone of B2's G major)",
                "the real send's frame comes with the take")]
    lay += drop_group(t_drop)
    lay.append(tick("tick_equals", "tick2", "tick 2: Calculator's “=” (placeholder time)", "ui_tap_key", 19.5, "G",
                    "X1 layers: tick 2 on '='", "the real press's frame comes with the take (slot x5)"))
    why_omit = ("left out of the 40-second cut's masters, as on 26 Oct: B2's own biggest arrival is the peak at the "
                "splice (XJ1 measures clean without cover), and a hit within its limiter budget still lifted the "
                "classifier's 'telephone' from 0.31 to 0.36 in 27-30 s; with no hit, the music does not duck there")
    ref_k = [r4(t_kept), r4(t_kept + 3.0)]
    lay.append({"id": "climax_hit", "group": "climax", "label": "the kept card: the climax hit and sub 2", "role": "hit",
                "take": "impact_body_cc0", "t": r4(t_kept), "align": "peak", "level": {"mode": "rel", "ref": ref_k,
                "offset_db": 3.0}, "prelimit_db": 4.0, "highpass_hz": 70.0,
                "cue_sheet": "X2 layers: the climax composite at 0:28.00 (hit, sub 2) covers XJ1", "omit": why_omit})
    lay.append({"id": "climax_sub", "group": "climax", "label": "the kept card: the climax hit and sub 2", "role": "sub",
                "designed": {"base": "sub_drop_a", "params": {"f0": 49.0, "f1": 24.5}}, "t": r4(t_kept),
                "align": "start", "level": {"mode": "rel", "ref": ref_k, "offset_db": -4.0}, "budget_group": "climax_sub",
                "cue_sheet": "X2 layers: sub 2", "omit": why_omit})
    m = xj2["mask"]
    lay.append({"id": "xj2_mask", "group": "mask", "label": "a reverse swell (CC0) rising into the 40-s Return's cut",
                "role": "swell", "tail_swell": {"take": m["take"], "tune_semitones": m["tune_semitones"],
                                                 "length_s": m["length_s"], "from_peak_s": 0.08},
                "t": r4(xj2["t"]), "align": "end", "level": m["level"],
                "cue_sheet": "X3 layers and plan_x40.json XJ2 mask: " + m["made"],
                "licence_note": m["licence"]})
    ref_t = [r4(t_title), r4(t_title + 3.0)]
    lab_t = "THE TITLE on B4's real stop: the stone tap (stand-in), the hit (temp), sub 3"
    lay.append({"id": "title_tap", "group": "title", "label": lab_t, "role": "tap", "take": "standin_tap_a",
                "t": r4(t_title), "align": "peak", "tune": {"to_note": "C#"},
                "level": {"mode": "rel", "ref": ref_t, "offset_db": -3.0},
                "cue_sheet": "X3 layers: the title composite on the stop at 0:33.94 (the tap, the hit, sub 3); the tap "
                             "tuned to Db, the minor third of B4's ringing Bb-minor chord, as the main film's tap is the "
                             "minor third (E) of A4's C#-minor title chord"})
    lay.append({"id": "title_hit", "group": "title", "label": lab_t, "role": "hit", "take": "impact_body_cc0",
                "t": r4(t_title), "align": "peak", "level": {"mode": "rel", "ref": ref_t, "offset_db": 3.0},
                "prelimit_db": 4.0, "highpass_hz": 70.0,
                "cue_sheet": "X3 layers: the title hit on the stop (temp impact_body_cc0, Kenney CC0), as built on 26 Oct"})
    lay.append({"id": "title_sub", "group": "title", "label": lab_t, "role": "sub",
                "designed": {"base": "sub_drop_b", "params": {"f0": 58.27, "f1": 29.135}}, "t": r4(t_title),
                "align": "start", "level": {"mode": "rel", "ref": ref_t, "offset_db": -4.0}, "budget_group": "title_sub",
                "cue_sheet": "X3 layers: sub 3, tuned to Bb1 (58.27 Hz), the root of B4's ringing stop chord"})
    lay.append({"id": "room_end", "group": "room", "label": "room tone after the ring-out", "role": "room",
                "take": "room_tone_b", "t": 38.15, "align": "start",
                "excerpt": {"from_s": 6.0, "dur_s": 1.85, "fade_in_s": 0.35, "fade_out_s": 0.02},
                "level": {"mode": "abs_i", "lufs": -52.0},
                "cue_sheet": "X3 layers: room tone from 0:38.5 to 0:40.0 (faded in from 38.15)"})
    ducks = [{"id": "drop", "t": r4(t_drop), "db": -3.0, "attack_s": 0.01, "hold_s": 0.15, "release_s": 0.4},
             {"id": "title", "t": r4(t_title), "db": -1.5, "attack_s": 0.01, "hold_s": 0.25, "release_s": 0.4,
              "why": WHY_DUCK}]
    return lay, ducks, {}


def main():
    W = os.path.abspath(sys.argv[1])
    old = json.load(open(os.path.join(W, "master", "archive-2026-10-26-2350", "layers_main.json")))
    for film, fn in (("main", main_sheet), ("x40", x40_sheet)):
        plan = json.load(open(os.path.join(W, "cuesheet", f"plan_{film}.json")))
        lay, ducks, eq = fn(plan)
        sheet = {"film": film, "revision": "the Return revision (CUE_SHEET.md revision 2, 28 Oct 2026)",
                 "about": f"What CUE_SHEET.json asks for on top of cuesheet/plan_{film}.json: EQ (§1, §3), the ducks "
                          f"(§3) and the sound-design layers (§4, §6, each cue's 'layers'). Times are film seconds read "
                          f"from the plan. Written by tools/audio/score2/score_layers.py.",
                 "rules": RULES, "masters": MASTERS, "eq": eq, "ducks": ducks,
                 "edges": {"fade_in_s": 0.005, "fade_out_s": 0.02}, "layers": lay,
                 "source_time_correction_s": old["source_time_correction_s"],
                 "source_time_correction_evidence": old["source_time_correction_evidence"],
                 "limiter_budget_db": BUDGETS, "limiter_budget_passes": 2}
        out = os.path.join(W, "master", f"layers_{film}.json")
        json.dump(sheet, open(out, "w"), indent=1, ensure_ascii=False)
        print("wrote", os.path.relpath(out, W), len(lay), "layers")


if __name__ == "__main__":
    main()
