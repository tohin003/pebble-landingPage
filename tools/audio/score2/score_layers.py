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

The fix revision (28 Oct, after the score review's R-01 to R-11) changes, on top of that:
  - R-01 (OVERRIDES §55 CR-13, §60): no Mixkit sound effect is left. The Space slide's whoosh and the four ring sweeps
    are designed noise whooshes (score_designed.whoosh, each with the length of the take it replaces); the plunk is a
    designed water plunk (score_designed.plunk) until the person's recording; the Drop's and the climax's temp hit is a
    CC0 composite (Kenney's impactPunch_heavy_000, the kit's impact_body_cc0 3 dB under it, a designed crack 8 dB under)
    until the Sonniss booms. Only the music (B2, B4) is still the script-fetched audition copy;
  - R-02: the kept card is the film's biggest moment. M5 dips 2 dB for one bar under the climax hit (back by 1:40.03)
    with the treatment's 3 dB duck, and rides RIDE_DB down over the bar before R0 (1:44.03-1:46.03), held to J5; M6a's
    dip deepens to M6A_DIP_DB so the merge stays a dip under the lower rush (cue_overrides);
  - R-05: J4 is a J4_XF equal-power crossfade ending on the same downbeat (cue_overrides on M4 and M5);
  - R-06: the name's soft hit is 6 dB louder (-24 LUFS momentary), high-passed at 50 Hz (still no sub);
  - R-08: M6a's source moves 18 ms earlier (cue_time_correction_s), as B2 and B4 do as a whole; the main title's duck
    is then 0.5 dB, as the 40-s title's;
  - R-03 (the 40-s cut): its title duck is 0.5 dB, X3 plays 1 dB lower, and the kept card at XJ1 gets the climax
    composite only if it passes the rule written before the build (else it stays out, with its numbers).

Revision 3 (28 Oct, OVERRIDES §65-§68; CUE_SHEET.md revision 3) changes, on top of that:
  - every time is still read from the plan: Ring 2 arrives on an event of the plan (M2 is one excerpt, so there is no
    splice seam to read it from), Ring 4 and Enter move with B4's two more bars, and everything after Enter is 232
    frames later; the layer notes print the plan's own times, never typed ones;
  - M3 is one excerpt: every B4 cue of the plan gets the cue sheet's low shelf;
  - the coda (OVERRIDES §65): the end card's room tone is carried on without a restart to the coda's last frame (one
    excerpt of room_tone_b, about -52 LUFS), and the coda's one stone tap (standin_tap_a, Kenney CC0, about -30 LUFS)
    peaks on L-C2's landing, tuned as cuesheet/r3/coda_tap_decision.json decides. The coda's frames are read from its
    own plan (coda_timing.ts writes CODA_TIMING.json at build time), never typed in; the levels are the coda lane's
    CODA_SOUND. The master then runs to the coda's last frame; the X version is the master cut at the coda's L0.

  python3 -I tools/audio/score2/score_layers.py .work/score2 [OUT_DIR] [CODA_TIMING.json]
      OUT_DIR defaults to .work/score2/master; CODA_TIMING.json to OUT_DIR/coda_timing.json (needed when the plan has a
      coda span)
"""
import json
import os
import sys

FR = 60.0  # the film's frame rate: "12 frames early" is 0.2 s

# the gate is on the encoded file (TREATMENT §4.8): every master must pass on FFmpeg's native AAC encoder (what
# tools/encode/encode.sh delivers with: '-c:a aac') and on Apple's (the score previews'); the build lowers a ceiling only
# by what the worse of the two exceeds its gate
ENCODERS = ["native_default", "apple_audiotoolbox_cbr"]
MASTERS = {  # the ceiling search keeps 0.2 dB under each gate on both encoders (the review's R-03: 0.1 dB was too thin)
    "web": {"lufs": -16.0, "ceiling_dbtp": -2.0, "aac_kbps": 160, "release_ms": 100.0, "aac_tp_max_dbtp": -1.5,
            "aac_tp_margin_db": 0.2, "aac_reference_encoder": ENCODERS},
    "social": {"lufs": -14.0, "ceiling_dbtp": -1.5, "aac_kbps": 192, "release_ms": 100.0, "aac_tp_max_dbtp": -1.0,
               "aac_tp_margin_db": 0.2, "aac_reference_encoder": ENCODERS},
}
# the main film's masters since the R3-02 fix (the lead's ruling, 31 Oct): revision 3's first build lowered the whole web
# ceiling from -2.0 to -4.5 and the social from -1.5 to -3.2 dBTP to keep FFmpeg's native AAC under its gate, which halved
# the title's arrival on the social master. The fix round measured why (score lane, 31 Oct, on the mix as built): the
# native encoder's overshoot is its perceptual noise substitution, a coin toss at the Drop and in B4's noisy bars (±0.02 dB
# of gain moves the Drop's decoded peak between -2.0 and +0.8 dBTP; with '-aac_pns 0' it reads -1.7 to -1.8), and a softer
# limiter attack or a 16.5 kHz low-pass changes nothing. So the search starts from revision 2's ceilings as built (the
# masters the person heard on 28 Oct) and lowers the ceiling only around a spot where an encoder overshoots, by what it
# overshoots; the whole ceiling falls only if a spot reaches its cap. 'ceiling_dbtp' stays the stated ceiling the limiter
# budgets are fitted at, so every layer's level is the one revision 2 fitted. The 40-second cut keeps MASTERS unchanged.
LOCAL_SEARCH = {"max_tries": 8, "global_fallback_tries": 4, "step_cap_db": 1.5, "total_cap_db": 3.0, "half_width_s": 0.06,
                "ramp_s": 0.05, "merge_s": 0.25, "jitter_probe_db": [-0.02, 0.02],
                "why": "R3-02 (31 Oct): each spot where a reference encoder's decoded true peak is over its gate less the "
                       "margin gets its own ceiling, the master's peak there lowered by the excess and 0.1 dB (at most 1.5 dB "
                       "a try and 3 dB in all), over 120 ms with 50 ms raised-cosine ramps; the rest of the film keeps the "
                       "start ceiling"}
MASTERS_MAIN = {
    "web": {**MASTERS["web"], "start_ceiling_dbtp": -2.5, "local_search": LOCAL_SEARCH,
            "start_ceiling_why": "revision 2's web ceiling as built (28 Oct, archive-2026-10-28-r2fix/main.build.json)"},
    "social": {**MASTERS["social"], "start_ceiling_dbtp": -2.3, "local_search": LOCAL_SEARCH, "title_arrival_min_lu": 2.0,
               "start_ceiling_why": "revision 2's social ceiling as built, the master of the preview the person heard on "
                                    "28 Oct (the title +2.2 LU over the second before it)",
               "title_arrival_why": "the lead's ruling on R3-02 (31 Oct): on the social master the title's first second "
                                    "and its first 400 ms are each at least +2.0 LU over the same span before it"},
}
BUDGETS = [["drop_sub", 1.0], ["climax_sub", 1.0], ["title_sub", 1.0], ["swell", 1.0], ["mask", 1.0], ["drop", 2.5],
           ["climax", 2.5], ["title", 2.5], ["name", 0.5], ["slide", 0.5], ["tick1", 0.5], ["tick2", 0.5], ["tick3", 0.5],
           ["enter", 0.5], ["ring1", 0.5], ["ring2", 0.5], ["ring3", 0.5], ["ring4", 0.5], ["coda", 0.5]]  # the 40-s mask is a reverse
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
    "licences": "OVERRIDES §55 CR-13 and §60: no Mixkit sound effect is in these masters (the score review's R-01): the "
                "whooshes and the plunk are made here from code, the hits are CC0 (Kenney) and designed parts, the "
                "ticks, the tap and the room tone are the kit's CC0 and designed takes. score_build.py refuses any "
                "Mixkit take and the 20 takes §60 removed. Only the music, B2 and B4, is still the script-fetched "
                "audition copy: the person downloads both by hand before the final masters (SCORE_PROVENANCE.json).",
    "cue_overrides": "The master revision's departures from the cue plan (a cue's gain points, head or tail), each with "
                     "its reason; the cue sheet's own values stay in the build record beside what the masters play. "
                     "Film times and source points never change here; fades and gain rides are modifications within "
                     "§51's Mixkit limits.",
}

HIT = os.environ.get("SCORE2_HIT", "drop_impact_cc0")  # the Drop's and the climax's temp hit, the review's pick. The
# fix lane's rule (score2-fix PROGRESS.md) asked for its CC0 alternative H_c4 if drop_impact_cc0 gave the Drop under
# +2.5 dB (it gave +2.16) or the climax under 0 dB against the planned music (-0.15); H_c4 measured worse on both (Drop
# +0.24 dB, climax -2.54 dB; its punch's peaks spend the limiter budget: trims -4.3 and -8.9 dB), so the better one stays
HITS = {
    "drop_impact_cc0": {"take": "drop_impact_cc0", "what": "the kit's drop_impact_cc0 (Kenney CC0 with a designed sub)"},
    "H_c4": {"composite": [{"src": {"kenney": "impact/Audio/impactPunch_heavy_000.ogg"}, "at_s": 0.0, "gain_db": 0.0},
                           {"src": {"kit": "impact_body_cc0"}, "at_s": 0.0, "gain_db": -3.0},
                           {"src": {"designed": {"recipe": "crack", "params": {"dur_s": 0.25, "band_hz": [1200, 5000],
                                                                               "tau_s": 0.012, "seed": 19}}},
                            "at_s": 0.004, "gain_db": -8.0}],
             "what": "a CC0 composite: Kenney impactPunch_heavy_000, the kit's impact_body_cc0 3 dB under it, a designed "
                     "crack 8 dB under"},
}


def hit_source(choice=None):
    h = HITS[choice or HIT]
    return ({"take": h["take"]} if "take" in h else {"composite": h["composite"]}), h["what"]


# the designed takes (score_designed.py), chosen by measurement in the fix lane's auditions (score_sfx_audition.py,
# 28 Oct 09:09-09:12): each reads 'whoosh_swoosh_swish' (the plunk 'water, liquid_dripping') with no watched label
WHOOSH = {
    "slide": {"dur_s": 0.48, "peak_s": 0.34, "fc_peak_hz": 2200, "rise_oct": 1.0, "fall_oct": 0.6, "sigma_oct": 0.9,
              "decay20_s": 0.08, "rise_pow": 2.0, "air_db": -10, "pan": [0.5, -0.5], "fade_s": 0.02, "seed": 11},
    "ring1": {"dur_s": 1.03, "peak_s": 0.24, "fc_peak_hz": 1000, "rise_oct": 1.3, "fall_oct": 0.9, "sigma_oct": 0.85,
              "decay20_s": 0.3, "rise_pow": 2.2, "body_db": -14, "body_hz": 200, "air_db": -16, "flutter": [0.12, 16],
              "pan": [-0.4, 0.4], "seed": 21},
    "ring2": {"dur_s": 1.11, "peak_s": 0.24, "fc_peak_hz": 520, "rise_oct": 1.2, "fall_oct": 0.8, "sigma_oct": 0.9,
              "decay20_s": 0.26, "rise_pow": 2.0, "body_db": -10, "body_hz": 180, "air_db": -18, "flutter": [0.12, 14],
              "pan": [0.4, -0.4], "seed": 31},
    "ring3": {"dur_s": 2.83, "peak_s": 0.30, "fc_peak_hz": 400, "rise_oct": 1.4, "fall_oct": 0.6, "sigma_oct": 1.3,
              "decay20_s": 0.4, "rise_pow": 2.0, "body_db": -6, "body_hz": 130, "air_db": -16, "pan": [-0.3, 0.3],
              "seed": 61},
    "ring4": {"dur_s": 1.2, "peak_s": 0.24, "fc_peak_hz": 5200, "rise_oct": 1.2, "fall_oct": 0.9, "sigma_oct": 0.8,
              "decay20_s": 0.55, "rise_pow": 2.0, "air_db": -6, "flutter": [0.1, 20], "pan": [0.4, -0.4], "seed": 51},
}
PLUNK = {"dur_s": 0.6, "f0_hz": 392.0, "f1_hz": 784.0, "glide_s": 0.025, "tau_s": 0.035, "splash_db": -2,
         "splash_tau_s": 0.015, "splash_band_hz": [800, 8000],
         "swarm": {"n": 16, "t": [0.012, 0.16], "f": [1200, 3600], "rise": [1.3, 1.8], "tau": [0.004, 0.010],
                   "db": [-12, -26]},
         "droplets": {"n": 8, "t": [0.08, 0.32], "db": [-26, -34], "band": [2500, 9000]}, "room_size": 0.22,
         "wet": 0.12, "seed": 9}


def seam_t(plan, sid):
    return next(s["t"] for s in plan["seams"] if s["id"] == sid)


def event_t(plan, label):
    return next(e["t"] for e in plan["events"] if e["label"] == label)


def r4(v):
    return round(float(v), 4)


def ft(t):
    """A film time as the cue sheet prints it, with its frame: 1:26.90 (5214)."""
    return f"{int(t // 60)}:{t % 60:05.2f} ({round(t * FR)})"


def sweep(lid, group, label, which, t, cue, replaces, offset_db=-4.0):
    """A designed whoosh (WHOOSH[which]) starting at t, set to the music under it as long as it lasts."""
    p = WHOOSH[which]
    return {"id": lid, "group": group, "label": label, "role": "sweep",
            "designed": {"recipe": "whoosh", "params": p}, "status": "primary", "t": r4(t), "align": "start",
            "level": {"mode": "rel", "ref": [r4(t), r4(t + p["dur_s"])], "offset_db": offset_db}, "cue_sheet": cue,
            "replaces": replaces}


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
    lab = "THE DROP: the plunk (designed stand-in), the hit (CC0 temp), sub 1"
    src, what = hit_source()
    return [
        {"id": "drop_plunk", "group": "drop", "label": lab, "role": "plunk",
         "designed": {"recipe": "plunk", "params": PLUNK}, "status": "stand-in",
         "t": r4(t - plunk_frames / FR), "align": "peak", "level": {"mode": "rel", "ref": ref, "offset_db": 0.0},
         "cue_sheet": "§4: the plunk until the person's recording (P9), 2 frames ahead of the hit; it stays at the Drop "
                      "(§61 R3)", "replaces": "standin_plunk_a (Mixkit #1320, script-fetched: CR-13)",
         "departure": "a designed water plunk (score_designed.plunk: a splash, the bubble's note rising from G4 to G5, "
                      "a swarm of tiny bubbles, droplets, a small room) in place of the Mixkit stand-in; alone it reads "
                      "'water, liquid_dripping'"},
        {"id": "drop_hit", "group": "drop", "label": lab, "role": "hit", **src, "status": "temp", "t": r4(t),
         "align": "peak", "level": {"mode": "rel", "ref": ref, "offset_db": 3.0}, "prelimit_db": 4.0, "highpass_hz": 70.0,
         "cue_sheet": "§4: the Drop: final from Sonniss or our recording; the music ducks 3 dB",
         "replaces": "drop_impact_a (Mixkit #563, script-fetched: CR-13)", "departure": "temp hit: " + what},
        {"id": "drop_sub", "group": "drop", "label": lab, "role": "sub",
         "designed": {"base": "sub_drop_b", "params": {"f0": 49.0, "f1": 24.5}}, "t": r4(t), "align": "start",
         "level": {"mode": "rel", "ref": ref, "offset_db": -4.0}, "budget_group": "drop_sub",
         "cue_sheet": "§4: sub_drop_b from 49.0 Hz (G1, B2's tonic), an octave down"},
    ]


def main_sheet(plan):
    t_drop = seam_t(plan, "J1")
    ev = {e["label"] for e in plan["events"]}
    t_ring2 = event_t(plan, "Ring 2") if "Ring 2" in ev else seam_t(plan, "M2s")  # revision 3: M2 has no splice
    t_ring3 = seam_t(plan, "J2")
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
                "cue_sheet": "§4: 0:00.00-0:01.00 room tone, room_tone_b, -58 LUFS",
                "departure": "-58 LUFS, as the 26 Oct build: at -52 it added 0.07 'foghorn' to the opening window, "
                             "where Born Of The Sky's quiet pad at +12 dB already reads high on its own (CUE_SHEET §1 M1)"})
    lay.append(tick("tick_send", "tick1", "tick 1: the question is sent (placeholder time)", "ui_tap_send", 3.0, "E",
                    "§4: tick 1, the send, ui_tap_send (Kenney CC0), tuned to E, 6-12 dB under",
                    "the real send's frame comes with the 2.0.0 take (BEAT_SHEET: 'about 0:03.00')"))
    lay.append({"id": "name_hit", "group": "name", "label": "the name's soft hit: “Pebble 2.0”", "role": "soft_hit",
                "take": "impact_body_cc0", "t": r4(event_t(plan, "name") - 0.0004), "align": "peak",
                "highpass_hz": 50.0, "level": {"mode": "abs_m", "lufs": -24.0},
                "cue_sheet": "§4: 0:04.00 (240) impact_body_cc0 (Kenney CC0), a soft hit, no sub",
                "departure": "-24 LUFS momentary, not about -30, and high-passed at 50 Hz (still no sub): at -30 it sat "
                             "3.3 LU under the music and the name landed with no measurable accent (the score review's "
                             "R-06: -1.2 LU over 400 ms at 0:04.00); at -25 the step read +0.9 LU (the fix lane's first "
                             "build), under the +1 LU the review asks"})
    lay.append({**sweep("slide_whoosh", "slide", "whoosh: the Space slide, on A4's own lift", "slide", 7.7991,
                        "§4: 0:07.80 (468), 12 frames before the slide; whoosh 1 of 5",
                        "whoosh_slide_a (Mixkit #1530, script-fetched: CR-13)", offset_db=-6.0)})
    lay += drop_group(t_drop)
    lay.append(sweep("ring1_sweep", "ring1", "ring sweep: Ring 1 arrives (your browser)", "ring1",
                     t_ring1 - 12 / FR, "§4: 0:27.80 (1668); whoosh 2 of 5",
                     "ring_sweep_a (Mixkit #2632, script-fetched: CR-13)"))
    splice2 = any(s_["id"] == "M2s" for s_ in plan["seams"])
    lay.append(sweep("ring2_sweep", "ring2", "ring sweep: Ring 2 arrives (your apps)" + (", across the splice" if splice2 else ""),
                     "ring2", t_ring2 - 12 / FR, f"§4: {ft(t_ring2 - 12 / FR)}" + (", carries M2s" if splice2 else "")
                     + "; whoosh 3 of 5", "ring_sweep_c (Mixkit #1471, script-fetched: CR-13)"))
    lay.append(tick("tick_equals", "tick2", "tick 2: Calculator's “=” (placeholder time)", "ui_tap_key",
                    t_ring2 + 1.5, "G", "§4: tick 2, '=', ui_tap_key (Kenney CC0), tuned to G",
                    "the real press's frame comes with the take (CUE_SHEET §4: 'in S11, about 0:41-0:42')"))
    lay.append(tick("tick_click", "tick3", "tick 3: the click (placeholder time)", "ui_tap_click", t_ring2 + 6.0, None,
                    "§4: tick 3, the click, ui_tap_click (Kenney CC0)",
                    "the real click's frame comes with the take (CUE_SHEET §4: 'in S12, about 0:46'); not tuned: the "
                    "take has no measurable pitch"))
    lay.append(sweep("ring3_sweep", "ring3", "ring sweep: Ring 3, across the cut to Techno Fest Vibes", "ring3",
                     t_ring3 - 12 / FR, f"§4: {ft(t_ring3 - 12 / FR)}, covers J2; whoosh 4 of 5 (a noise whoosh has no "
                     "pitch, so it needs no tuning to G)", "ring_sweep_b (Mixkit #2604, script-fetched: CR-13)"))
    lay.append(sweep("ring4_sweep", "ring4", "ring sweep: Ring 4 arrives (your project)", "ring4",
                     t_ring4 - 12 / FR, f"§4: {ft(t_ring4 - 12 / FR)}; whoosh 5 of 5",
                     "ring_sweep_d (Mixkit #2611, script-fetched: CR-13)"))
    lay.append({"id": "tick_enter", "group": "enter", "label": "tick 4: Enter, alone in the hush, on B4's stop",
                "role": "tick", "take": "ui_tap_enter", "t": r4(t_enter), "align": "peak", "tune": {"to_note": "A#"},
                "level": {"mode": "abs_m", "lufs": -30.0},
                "cue_sheet": f"§4: {ft(t_enter)} tick 4, Enter, on B4's stop, ui_tap_enter (Kenney CC0), soft (about "
                             "-30 LUFS), tuned to Bb"})
    lay.append({"id": "dusk_shimmer", "group": "enter", "label": "the dusk shimmer", "role": "shimmer",
                "take": "glass_shimmer_a", "t": r4(t_enter), "align": "start", "level": {"mode": "abs_m", "lufs": -27.0},
                "cue_sheet": f"§4: {ft(t_enter)} glass_shimmer_a, about -27 LUFS momentary; the 23:45 build left it out",
                "omit": "left out of the masters, as the 26 Oct 23:45 build and CUE_SHEET §4 record: over B4's "
                        "ring-out and the Starfire pad it lifts the classifier's 'foghorn' (0.33 to 0.46); the Enter "
                        "tick sits alone in the hush, as J3 describes"})
    lay.append({"id": "room_hush", "group": "room", "label": "room tone under the hush", "role": "room",
                "take": "room_tone_b", "t": r4(t_enter), "align": "start",
                "excerpt": {"from_s": 3.0, "dur_s": 2.1, "fade_in_s": 0.1, "fade_out_s": 0.6},
                "level": {"mode": "abs_i", "lufs": -52.0},
                "cue_sheet": f"M4 layers: room tone under the hush ({ft(t_enter)}-{ft(t_enter + 2.1)}) at -52 LUFS"})
    ref_k = [r4(t_kept), r4(t_kept + 3.0)]
    lab_k = "THE KEPT CARD: the climax hit (CC0 temp) and sub 2"
    src_k, what_k = hit_source()
    lay.append({"id": "climax_hit", "group": "climax", "label": lab_k, "role": "hit", **src_k, "status": "temp",
                "t": r4(t_kept), "align": "peak", "level": {"mode": "rel", "ref": ref_k, "offset_db": 3.0},
                "prelimit_db": 4.0, "highpass_hz": 70.0,
                "cue_sheet": f"§4: {ft(t_kept)} the climax: final EffectiveTrailer_Booms_Vol2_011 (Sonniss); the music "
                             "ducks 250 ms", "replaces": "drop_impact_a (Mixkit #563, script-fetched: CR-13)",
                "departure": "temp hit: " + what_k + "; the music under it dips 2 dB for one bar and ducks 3 dB (R-02)"})
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
                "cue_sheet": f"§4, C7: {ft(t_title - 2.0)}-{ft(t_title)} the one-bar reverse swell from A4's own title "
                             "chord (2:44.52, 4 beats, reversed), its last sample on the title frame, high-passed at 300 "
                             "Hz, its loudest 400 ms 6 dB under the music over its last second (CC BY, edited)"})
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
    coda = coda_span(plan) if plan.get("coda") else None
    room_to = coda["to_film_s"] if coda else end
    lay.append({"id": "room_end", "group": "room", "label": "room tone after the decay" + (", carried on through the coda"
                                                                                          if coda else ""),
                "role": "room", "take": "room_tone_b", "t": r4(room_fade_from), "align": "start",
                "excerpt": {"from_s": 9.0, "dur_s": r4(room_to - room_fade_from), "fade_in_s": round(m6b["tail"]["fade"], 3),
                            "fade_out_s": 0.02},
                "level": {"mode": "abs_i", "lufs": coda["room_lufs"] if coda else -52.0},
                "cue_sheet": f"§4: {ft(room_fade_from)}-{ft(end)} room tone, room_tone_b, after the decay (it fades in "
                             "under A4's last 0.3 s, so the film never falls to digital silence)"
                             + (f"; carried on without a restart to the coda's last frame, {ft(room_to)} (OVERRIDES §65: "
                                "one excerpt of the loop, no second start)" if coda else "")})
    if coda:
        lay.append({"id": "coda_tap", "group": "coda", "label": "the coda's one stone tap, on L-C2's landing",
                    "role": "tap", "take": coda["tap_take"], "t": r4(coda["tap_film_s"]), "align": "peak",
                    **({"tune": {"to_note": "E"}} if coda["tune_to_e"] else {}),
                    "level": {"mode": "abs_m", "lufs": coda["tap_lufs"]},
                    "cue_sheet": f"OVERRIDES §65: the coda's one one-shot, {coda['tap_take']} (Kenney CC0), about "
                                 f"{coda['tap_lufs']:g} LUFS, its peak on L{coda['tap_local']} ({ft(coda['tap_film_s'])}), "
                                 "L-C2's landing as the coda's plan gives it"
                                 + (", tuned to E as the title's tap (cuesheet/r3/coda_tap_decision.json)"
                                    if coda["tune_to_e"] else ""),
                    "coda_timing": coda["source"]})
    ducks = [
        {"id": "drop", "t": r4(t_drop), "db": -3.0, "attack_s": 0.01, "hold_s": 0.15, "release_s": 0.4},
        {"id": "climax", "t": r4(t_kept), "db": -3.0, "attack_s": 0.01, "hold_s": 0.25, "release_s": 0.4,
         "why": "the treatment's 3 dB (§4.6, §4.8), on top of M5's one-bar 2 dB dip (cue_overrides): the score review's "
                "R-02 measured the 1.5 dB duck leaving the climax composite -0.06 dB over the music alone"},
        {"id": "title", "t": r4(t_title), "db": -0.5, "attack_s": 0.01, "hold_s": 0.25, "release_s": 0.4,
         "why": "0.5 dB, not 1.5 dB: with M6a's attacks moved onto the grid (R-08), A4's title chord and the hit land "
                "together and the limiter budget trims the hit 1.5 dB more; with 1.5 dB the composite read -0.29 dB "
                "under the music alone (the fix lane's first build), as the 40-s title did (R-03)"},
    ]
    shelf = {"type": "lowshelf", "hz": 60.0, "gain_db": -1.5, "q": 0.7071,
             "why": "CUE_SHEET §1 M3 and §3: a low shelf of -1.5 dB below 60 Hz (B4's sub share is about twice B2's)"}
    return lay, ducks, {c["id"]: [shelf] for c in plan["cues"] if c["track"] == "TechnoFestVibes"}


CODA_TIMING = None  # set by main(): the coda's timing as coda_timing.ts read it from the coda's plan at build time
WORKDIR = None  # set by main(): .work/score2


def coda_span(plan):
    """The coda's span and its two layers' timing and levels, from the coda's own plan (coda_timing.ts), never typed in;
    the tap's tuning from the rule's decision (cuesheet/r3/coda_tap_decision.json)."""
    if CODA_TIMING is None:
        raise SystemExit("the plan has a coda span: run tools/audio/score2/coda_timing.ts first and pass its JSON")
    T = CODA_TIMING
    if T["L0_frame"] != plan["coda"]["L0_frame"]:
        raise SystemExit(f"the coda timing was read for L0 {T['L0_frame']}, the plan's L0 is {plan['coda']['L0_frame']}")
    if not (T["aspects_agree"] and T["bed_covers_every_frame"] and T["tap_on_line2"] and len(T["one_shots"]) == 1):
        raise SystemExit("the coda's plan does not give one bed under every frame and one tap on L-C2's landing")
    dec = os.path.join(WORKDIR, "cuesheet", "r3", "coda_tap_decision.json")
    if not os.path.exists(dec):
        raise SystemExit("the coda's tap has no tuning decision: run revise3_plan.py decide (the rule's CODA_TAP)")
    tune = json.load(open(dec))["tune_to_E"]
    tap, bed = T["one_shots"][0], T["beds"][0]
    for L in (tap, bed):
        if "mixkit" in f"{L['take']} {L['licence']}".lower():
            raise SystemExit(f"a Mixkit take in the coda's plan ({L['take']}): OVERRIDES §55, §60")
    if bed["take"] != "room_tone_b":
        raise SystemExit(f"the coda's bed is {bed['take']}, not the end card's room_tone_b: it would restart")
    return {"from_film_s": T["L0_film_s"], "to_film_s": T["end_film_s"], "L0_frame": T["L0_frame"],
            "end_frame": T["end_frame"], "tap_film_s": T["tap_film_s"], "tap_local": T["tap_local"],
            "tap_take": tap["take"], "tap_lufs": tap["lufs"], "room_lufs": bed["lufs"], "tune_to_e": tune,
            "source": {"read_at": T["read_at"], "git_head": T["git_head"], "coda_ts_uncommitted": T["coda_ts_uncommitted"],
                       "from": T["source"]}}


M6A_DIP_DB = float(os.environ.get("SCORE2_M6A_DIP", "-4.5"))  # the merge's dip on A4 bars 80-81 (the cue sheet: -2.8)
RIDE_DB = float(os.environ.get("SCORE2_RIDE", "-2.0"))  # M5 over the bar before R0, held to J5 (the review: about -1.5)
J4_XF = float(os.environ.get("SCORE2_J4_XF", "0.25"))  # J4's crossfade (the cue sheet: 1.0 s; MUSIC_RESEARCH §3.5: 1/8-1/2 beat)


def main_overrides(plan):
    """R-02 and R-05 as departures from the cue plan, with their reasons (score_common.apply_overrides)."""
    c = {x["id"]: x for x in plan["cues"]}
    t_kept = event_t(plan, "kept card")
    r0 = plan["return"]["R0_film_s"]
    j4 = seam_t(plan, "J4")
    bar = 2.0002  # one bar of B2 at 119.994 BPM
    m5 = c["M5"]["gain_db"]
    assert [p[1] for p in m5] == [-7.8, -7.8, -3.8], m5  # the cue sheet's M5 as revision 2 wrote it
    m5_new = [list(p) for p in m5] + [
        [r4(t_kept - 0.02), -3.8], [r4(t_kept), -5.8], [r4(t_kept + 0.5), -5.8], [r4(t_kept + bar), -3.8],
        [r4(r0 - bar), -3.8], [r4(r0), -3.8 + RIDE_DB]]
    m6a = c["M6a"]["gain_db"]
    assert [p[1] for p in m6a] == [-2.8, -2.8, -0.3], m6a
    m6a_new = [[m6a[0][0], M6A_DIP_DB], [m6a[1][0], M6A_DIP_DB], list(m6a[2])]
    return {
        "M5": {"gain_db": m5_new, "head": {"mode": "fade", "start": r4(j4 - J4_XF), "len": J4_XF},
               "why": f"R-02 and R-05. Gain: a one-bar dip of 2 dB under the climax hit ({ft(t_kept)}, recovering by the "
                      f"next bar line, {ft(t_kept + bar)}) with the 3 dB duck, so the composite stands over the music; then "
                      f"{-RIDE_DB:g} dB down over the bar before R0 ({ft(r0 - bar)}-{ft(r0)}), held to J5, so the Return's B2 "
                      f"plateau sits under the climax's instead of above it. Head: J4's crossfade shortened to "
                      f"{J4_XF:g} s, ending on the same downbeat. Fades and gain rides only, B2 in its own order (§51)."},
        "M6a": {"gain_db": m6a_new,
                "why": f"R-02: the merge's dip deepened from -2.8 to {M6A_DIP_DB:g} dB on A4 bars 80-81 (CC BY, edited), "
                       f"so the merge stays a dip under the {-RIDE_DB:g} dB lower rush (MONTAGE_DESIGN §1.4: 'the merge "
                       f"dips 2.5 LU') and the title still lands as an arrival; back to -0.3 dB on the title's downbeat."},
        "M4": {"tail": {"mode": "fade", "end": c["M4"]["tail"]["end"], "len": J4_XF},
               "why": f"R-05: J4 as a {J4_XF:g} s equal-power crossfade (half a beat; MUSIC_RESEARCH §3.5's 1/8-1/2 beat) "
                      f"ending on the same downbeat, so the Dusk pad covers B2's rest: the 1 s fade left a 5.5 LU hole in "
                      f"its last 400 ms, and a 0.5 s one (one beat) still 3.4 LU (the fix lane's first build)"},
    }


X40_ACCENT_OMIT = ("left out of the 40-second cut: the rule written before the build (score2-fix PROGRESS.md) needs the "
                   "composite at least +1.5 dB over the music; with drop_impact_cc0 it read -0.26 dB (the climax group "
                   "trimmed 8.35 dB by its limiter budget: B2's biggest lift already fills the social limiter) and with "
                   "the CC0 punch composite -1.83 dB. Fading X1's last beat (the review's other route) changes the 40-s "
                   "cut's music and waits for the lead")


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
    why_omit = os.environ.get("SCORE2_X40_ACCENT_OMIT", X40_ACCENT_OMIT)  # "" puts the accent back (a test)
    ref_k = [r4(t_kept), r4(t_kept + 3.0)]
    src_k, what_k = hit_source()
    lab_k = "the kept card: the climax hit (CC0 temp) and sub 2"
    hit = {"id": "climax_hit", "group": "climax", "label": lab_k, "role": "hit", **src_k, "status": "temp",
           "t": r4(t_kept), "align": "peak", "level": {"mode": "rel", "ref": ref_k, "offset_db": 3.0}, "prelimit_db": 4.0,
           "highpass_hz": 70.0, "cue_sheet": "X2 layers: the climax composite at 0:28.00 (hit, sub 2) covers XJ1",
           "departure": "R-03: the accent the 05:15 build left out, back as " + what_k + ", kept only under the rule "
                        "written before the build (score2-fix PROGRESS.md)"}
    sub = {"id": "climax_sub", "group": "climax", "label": lab_k, "role": "sub",
           "designed": {"base": "sub_drop_a", "params": {"f0": 49.0, "f1": 24.5}}, "t": r4(t_kept),
           "align": "start", "level": {"mode": "rel", "ref": ref_k, "offset_db": -4.0}, "budget_group": "climax_sub",
           "cue_sheet": "X2 layers: sub 2"}
    if why_omit:
        hit["omit"] = sub["omit"] = why_omit
    lay += [hit, sub]
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
    ducks = [{"id": "drop", "t": r4(t_drop), "db": -3.0, "attack_s": 0.01, "hold_s": 0.15, "release_s": 0.4}]
    if not why_omit:
        ducks.append({"id": "climax", "t": r4(t_kept), "db": -3.0, "attack_s": 0.01, "hold_s": 0.25, "release_s": 0.4,
                      "why": "the treatment's 3 dB under the kept card's composite (R-03), as in the main film"})
    ducks.append({"id": "title", "t": r4(t_title), "db": -0.5, "attack_s": 0.01, "hold_s": 0.25, "release_s": 0.4,
                  "why": "0.5 dB, not 1.5 dB (the score review's R-03): with 1.5 dB the 40-s title composite read 0.5 dB "
                         "under the music alone over its first 400 ms"})
    return lay, ducks, {}


X3_DB = float(os.environ.get("SCORE2_X3", "-3.5"))  # B4's last bar in the 40-s cut (the cue sheet: -2.0)


def x40_overrides(plan):
    """R-03 as a departure from the 40-s plan: B4's last bar 1 dB lower, so the social limiter works less on its kicks."""
    c = {x["id"]: x for x in plan["cues"]}
    g = c["X3"]["gain_db"]
    assert g == [[0.0, -2.0]], g
    return {"X3": {"gain_db": [[0.0, X3_DB]],
                   "why": f"R-03: B4's last bar at {X3_DB:g} dB, not -2.0: at -2.0 the social master's limiter reached "
                          f"-3.91 dB (1.84 s over 1 dB; -2.79 dB on the music alone), on its last-bar kicks and the "
                          f"title; at -3.0 the music alone still cost -2.1 dB once the ceiling search kept 0.2 dB under "
                          f"both AAC gates (the fix lane's build 4). A gain change only (the 40-s cut's music is "
                          f"otherwise unchanged)."}}


CUE_CORR = {"M6a": -0.018}
CUE_CORR_EVIDENCE = ("master/beat_offsets.json: Born Of The Sky's attacks are too loose to correct as a whole (IQR -30.9 to "
                     "+18.4 ms), but where M6a plays (bars 80-85, source 160.4-172.6 s) its 12 clear attacks sit "
                     "-17.95 ms (median, flux) before the map's beats, and the three into the title (163.02, 163.52, "
                     "164.02 s) -17.0, -16.9 and -18.9 ms (flux), -17.1, -16.4 and -18.3 ms (high-frequency rise). So "
                     "M6a's source moves 18 ms earlier and its attacks land on the grid with the title's hit (the score "
                     "review's R-08: a 16 ms phase step at J5 against B2, which is corrected by -30 ms).")


def main():
    global CODA_TIMING, WORKDIR
    W = WORKDIR = os.path.abspath(sys.argv[1])
    out_dir = os.path.abspath(sys.argv[2]) if len(sys.argv) > 2 else os.path.join(W, "master")
    ct = sys.argv[3] if len(sys.argv) > 3 else os.path.join(out_dir, "coda_timing.json")
    CODA_TIMING = json.load(open(ct)) if os.path.exists(ct) else None
    os.makedirs(out_dir, exist_ok=True)
    old = json.load(open(os.path.join(W, "master", "archive-2026-10-26-2350", "layers_main.json")))
    for film, fn, ovf in (("main", main_sheet, main_overrides), ("x40", x40_sheet, x40_overrides)):
        plan = json.load(open(os.path.join(W, "cuesheet", f"plan_{film}.json")))
        lay, ducks, eq = fn(plan)
        sheet = {"film": film, "revision": "the Return revision (CUE_SHEET.md revision 2, 28 Oct 2026)",
                 "about": f"What CUE_SHEET.json asks for on top of cuesheet/plan_{film}.json: EQ (§1, §3), the ducks "
                          f"(§3) and the sound-design layers (§4, §6, each cue's 'layers'). Times are film seconds read "
                          f"from the plan. Written by tools/audio/score2/score_layers.py.",
                 "rules": RULES, "masters": MASTERS_MAIN if film == "main" else MASTERS, "eq": eq, "ducks": ducks,
                 "edges": {"fade_in_s": 0.005, "fade_out_s": 0.02}, "layers": lay,
                 "source_time_correction_s": old["source_time_correction_s"],
                 "source_time_correction_evidence": old["source_time_correction_evidence"],
                 "cue_overrides": ovf(plan),
                 "limiter_budget_db": BUDGETS, "limiter_budget_passes": 2}
        if film == "main":
            sheet["cue_time_correction_s"] = CUE_CORR
            sheet["cue_time_correction_evidence"] = CUE_CORR_EVIDENCE
            if plan.get("coda"):
                sheet["coda"] = {k: v for k, v in coda_span(plan).items()} | {
                    "x_cut_film_s": plan["end_film_s"],
                    "why": "OVERRIDES §65: the score lane owns the coda's sound layer; the master runs to the coda's last "
                           "frame, and the X version is the master cut at the coda's L0 (X's 2:20 cap)"}
        rev = plan.get("revision", {}).get("n")
        sheet["revision"] = (("revision 3 (28 Oct 2026, OVERRIDES §65-§68): CUE_SHEET.md revision 3's plan, with the fix "
                              "revision's CC0 and designed sounds and cue overrides, and the coda's sound")
                             if rev == 3 else
                             "the fix revision (28 Oct 2026, after the score review): the Return revision's sheet "
                             "(CUE_SHEET.md revision 2) with R-01's CC0 and designed sounds and the cue overrides")
        out = os.path.join(out_dir, f"layers_{film}.json")
        json.dump(sheet, open(out, "w"), indent=1, ensure_ascii=False)
        print("wrote", os.path.relpath(out, W), len(lay), "layers", "(the coda's span to "
              f"{sheet['coda']['to_film_s']:.4f} s)" if sheet.get("coda") else "")


if __name__ == "__main__":
    main()
