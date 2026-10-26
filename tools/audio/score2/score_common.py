"""score2 lane: small helpers shared by score_build.py (audio venv) and score_strips.py / score_preview.py (qa venv).
Pure Python: no numpy, no audio."""


def apply_corrections(plan, sheet):
    """Move each cue's source in- and out-points (and a ring-out tail's end) by its track's measured correction
    (LAYERS.json 'source_time_correction_s', from beat_offsets.py), keeping its film times: the track's audible
    attacks then land on the cue sheet's film times. The cue sheet's own values are kept beside them."""
    corr = sheet.get("source_time_correction_s", {})
    for c in plan["cues"]:
        d = float(corr.get(c["track"], 0.0))
        c["src_in_cue_sheet"], c["src_out_cue_sheet"], c["src_correction_s"] = c["src_in"], c["src_out"], d
        if d:
            c["src_in"] = round(c["src_in"] + d, 6)
            c["src_out"] = round(c["src_out"] + d, 6)
            if c["tail"].get("mode") == "ring":
                c["tail"] = {**c["tail"], "until": round(c["tail"]["until"] + d, 6)}
    return plan
