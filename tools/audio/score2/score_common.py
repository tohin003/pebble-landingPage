"""score2 lane: small helpers shared by score_build.py (audio venv) and score_strips.py / score_preview.py (qa venv).
Pure Python: no numpy, no audio."""


def apply_corrections(plan, sheet):
    """Move each cue's source in- and out-points (and a ring-out tail's end) by its measured correction, keeping its
    film times: the track's audible attacks then land on the cue sheet's film times. The correction is the track's
    (LAYERS.json 'source_time_correction_s', from beat_offsets.py) plus, for a cue named in 'cue_time_correction_s', that
    cue's own local correction (a track whose attacks are too loose to correct as a whole but tight where one cue plays:
    Born Of The Sky's M6a, the fix lane's R-08). The cue sheet's own values are kept beside them."""
    corr = sheet.get("source_time_correction_s", {})
    cue_corr = sheet.get("cue_time_correction_s", {})
    for c in plan["cues"]:
        d = float(corr.get(c["track"], 0.0)) + float(cue_corr.get(c["id"], 0.0))
        c["src_in_cue_sheet"], c["src_out_cue_sheet"], c["src_correction_s"] = c["src_in"], c["src_out"], d
        if c["id"] in cue_corr:
            c["src_correction_cue_s"] = float(cue_corr[c["id"]])
        if d:
            c["src_in"] = round(c["src_in"] + d, 6)
            c["src_out"] = round(c["src_out"] + d, 6)
            if c["tail"].get("mode") == "ring":
                c["tail"] = {**c["tail"], "until": round(c["tail"]["until"] + d, 6)}
    return plan


def apply_overrides(plan, sheet):
    """The master revision's departures from the cue plan (LAYERS.json 'cue_overrides': per cue, a new 'gain_db', 'head'
    or 'tail', each with its reason). Film times and source points never change here. The plan's own values are kept
    beside them as 'cue_sheet_<key>', so every record can say what the cue sheet planned and what the masters play."""
    ov = sheet.get("cue_overrides", {})
    for c in plan["cues"]:
        o = ov.get(c["id"])
        if not o:
            continue
        for key in ("gain_db", "head", "tail"):
            if key in o:
                c[f"cue_sheet_{key}"] = c[key]
                c[key] = o[key]
        c["override_why"] = o.get("why")
    return plan
