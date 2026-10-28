"""score2 lane: measure candidate sound-design takes before they go into the masters (no audio is kept).

Each candidate is built in memory (a kit take, a Kenney CC0 file, a designed recipe from score_designed.py, or a
composite of those), then measured exactly as the kit measures its takes (sfx2/audiolib.measure: loudness, true peak,
crest, bands, centroid, pitch, attack and decay) and classified exactly as the kit classifies them (audiolib.classify:
Apple SoundAnalysis, two passes, the film's gates). The classifier's temporary WAVs are deleted as soon as they are read.
Writes OUT.json (the numbers) and OUT.npz (each candidate's log-mel spectrogram and envelope, for score_sfx_sheet.py).

  scripts/heavy.sh score2-sfx-audition /usr/sbin/taskpolicy -c utility .work/tools-eval/tools-tests/audio-venv/bin/python -I \
      tools/audio/score2/score_sfx_audition.py CANDIDATES.json OUT_PREFIX
"""
import json
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(REPO, "tools", "audio", "sfx2"))
import audiolib as al  # noqa: E402
import cue_plan as cp  # noqa: E402
import score_designed as sd  # noqa: E402

KITDIR = os.path.join(REPO, ".work", "sfx2")
KENNEY = os.path.join(REPO, ".work", "audio", "kenney")
SOUND_TAGS = os.path.join(REPO, ".work", "audio", "sound_tags")
BARRED = {"drop_impact_b", "reverse_swell_a", "reverse_swell_b", "standin_plunk_b", "standin_plunk_c", "standin_tap_b",
          "standin_tap_c", "stinger_standin", "ui_tap_key_rec", "ui_tap_soft_rec", "ui_tap_click_rec", "whoosh_slide_b",
          "whoosh_pickup_a", "whoosh_pickup_b", "ring_sweep_e", "sub_boom_rec_a", "sub_boom_rec_b", "glass_shimmer_b",
          "room_tone_a", "room_tone_c"}  # OVERRIDES §60: removed from the kit; never picked, even as a temp


def stereo(y):
    y = np.asarray(y, dtype=np.float32)
    if y.ndim == 1:
        y = y[:, None]
    return np.repeat(y, 2, axis=1) if y.shape[1] == 1 else y[:, :2]


def kit_index():
    return {t["id"]: t for t in json.load(open(os.path.join(KITDIR, "KIT.json")))["files"]}


def load_src(src, kit):
    """A candidate's audio, stereo at 48 kHz, and where it came from (licence included)."""
    if "kit" in src:
        k = kit[src["kit"]]
        if src["kit"] in BARRED:
            raise SystemExit(f"{src['kit']} was removed from the kit (OVERRIDES §60)")
        if str(k["licence"]).startswith("mixkit"):
            raise SystemExit(f"{src['kit']} is a script-fetched Mixkit take (OVERRIDES §55 CR-13)")
        y, _ = al.load(os.path.join(KITDIR, k["file"]))
        return stereo(y), {"kit": src["kit"], "licence": k["licence"]}
    if "kenney" in src:
        p = os.path.join(KENNEY, src["kenney"])
        y, info = al.load(p)
        return stereo(y), {"kenney": src["kenney"], "licence": "kenney-cc0", "source": info}
    if "designed" in src:
        d = src["designed"]
        return stereo(sd.RECIPES[d["recipe"]](d.get("params", {}))), {"designed": d, "licence": "designed"}
    if "composite" in src:
        rec = []

        def ld(s):
            y, r_ = load_src(s, kit)
            rec.append(r_)
            return y
        y = sd.composite(src["composite"], ld)
        lic = sorted({r_["licence"] for r_ in rec})
        return y, {"composite": rec, "licence": "+".join(lic)}
    raise ValueError(src)


def main():
    spec_path, out = sys.argv[1:3]
    T0 = time.perf_counter()
    spec = json.load(open(spec_path))
    kit = kit_index()
    tmp = out + "-tmp"
    os.makedirs(tmp, exist_ok=True)
    fb = cp.mel_filterbank()
    res, npz = {"spec": spec_path, "candidates": []}, {}
    for c in spec["candidates"]:
        y, src = load_src(c["src"], kit)
        m = al.measure(y)
        cl = al.classify(y, SOUND_TAGS, tmp)
        mel, mt = cp.mel_db(y, al.SR, fb)
        env = 20 * np.log10(np.maximum(np.sqrt(np.convolve((y.mean(1).astype(np.float64)) ** 2,
                                                           np.ones(240) / 240, mode="same")), 1e-6))
        npz[f"{c['id']}_mel"] = mel
        npz[f"{c['id']}_mel_t"] = mt
        npz[f"{c['id']}_env"] = env[::48].astype(np.float32)  # 1 ms steps
        res["candidates"].append({"id": c["id"], "for": c.get("for"), "src": src, "measure": m, "classifier": cl})
        print(c["id"], json.dumps({k: m.get(k) for k in ("duration_s", "lufs_m_max", "centroid_hz", "share_above_150hz",
                                                         "peak_time_s", "attack_s", "decay_20db_s")}),
              cl["verdict"], cl["top"][:4], cl["watch_max"], flush=True)
    try:
        os.rmdir(tmp)
    except OSError:
        pass
    res["secs"] = round(time.perf_counter() - T0, 1)
    json.dump(res, open(out + ".json", "w"), indent=1)
    np.savez_compressed(out + ".npz", **npz)


if __name__ == "__main__":
    main()
