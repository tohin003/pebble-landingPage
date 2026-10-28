"""score2 lane, revision 3 (OVERRIDES §65): the post-credit scene's sound, checked on the mix side, every check with a
planted canary.

The coda's plan (video/src/film2/setpieces/coda.ts) holds the plan's half of the rules (codaChecks.ts codaSound: one bed
under every frame, one one-shot on L-C2's landing, CC0 or ours, no music). These are the mix's half, on the master
score_build.py made from the layer sheet (score_layers.py: the end card's room tone carried on without a restart to the
coda's last frame, and the one stone tap):

  C1 no run of digital zero anywhere in the master (no stretch of more than ZERO_RUN exactly-zero samples on both channels),
     outside the master's own edge fades (its first 5 ms and last 20 ms fade to zero by design; in 24 bits their quietest
     samples are exact zeros, which is not digital silence in the film)
  C2 room tone under every frame of the coda: no 1/60-s frame more than HOLE_DB under the coda's median frame (the tap's
     second excluded)
  C3 the room tone about -52 LUFS before the master's gain (the build's layer record), and on each master within 2.5 LU
     of -52 plus that master's gain
  C4 one one-shot: exactly one attack in the coda that stands TRANSIENT_DB over the room tone, its peak within one frame of
     the tap's planned time (L0 + L-C2's landing, from the coda's plan)
  C5 the tap about -30 LUFS (its loudest 400 ms) before the master's gain, within 1 LU
  C6 no restart: one room-tone layer spans the end card's last frame into the coda's last (one excerpt of the loop), and
     the level across L0 holds (the 0.2 s before and after within 1.5 dB: room tone alone on both sides)
  C7 no Mixkit take in the coda (every layer sounding there is CC0 or designed, OVERRIDES §55, §60)
  C8 the tap tuned as decided: its spectral peak within 30 cents of the note the build tuned it to (E: 329.63 Hz or an
     octave of it), when the decision tunes it

  score_coda.py canaries          the checks on small synthetic masters: the clean one passes, each planted fault fails
                                  (light: no file read; arrays of a few seconds in memory)
  score_coda.py check MASTER_DIR  the main masters (MASTER_DIR/main.web.wav, main.social.wav) and main.build.json
                                  -> MASTER_DIR/main.coda.json (audio venv; a heavy job: it reads the masters)
"""
import json
import math
import os
import sys

import numpy as np

SR = 48000
FPS = 60
ZERO_RUN = 2           # samples: a run of exactly-zero samples on both channels longer than this fails C1
HOLE_DB = 12.0         # dB under the coda's median frame RMS: a hole (C2)
TRANSIENT_DB = 20.0    # dB over the room tone's median frame RMS: an attack (C4); the room tone's own crest is 13.6 dB
ROOM_LUFS = -52.0      # OVERRIDES §65
TAP_LUFS = -30.0       # OVERRIDES §65


def frames_rms_db(y, a, b):
    """RMS per 1/60-s frame of y (stereo) in [a, b) seconds, dBFS."""
    n = SR // FPS
    i0, i1 = int(round(a * SR)), int(round(b * SR))
    k = (i1 - i0) // n
    seg = y[i0:i0 + k * n].astype(np.float64).reshape(k, n, -1)
    return 10 * np.log10((seg ** 2).mean(axis=(1, 2)) + 1e-20)


def zero_runs(y, limit=ZERO_RUN):
    """The longest run of samples that are exactly zero on every channel, and where it starts (seconds)."""
    z = np.all(y == 0.0, axis=1).astype(np.int8)
    if not z.any():
        return 0, None
    d = np.diff(np.concatenate([[0], z, [0]]))
    starts, ends = np.where(d == 1)[0], np.where(d == -1)[0]
    lens = ends - starts
    j = int(np.argmax(lens))
    return int(lens[j]), round(starts[j] / SR, 4)


def lufs(y, a, b):
    import pyloudnorm as pyln
    seg = y[int(round(a * SR)):int(round(b * SR))].astype(np.float64)
    return float(pyln.Meter(SR).integrated_loudness(seg))


def loudest_400ms(y, a, b):
    import pyloudnorm as pyln
    meter = pyln.Meter(SR, block_size=0.4)
    best = -200.0
    for t in np.arange(a, b - 0.4 + 1e-9, 0.05):
        seg = y[int(round(t * SR)):int(round((t + 0.4) * SR))].astype(np.float64)
        try:
            best = max(best, float(meter.integrated_loudness(seg)))
        except ValueError:
            pass
    return best


def attacks(y, a, b, floor_db):
    """Attacks in [a, b): local maxima of the 2-ms peak envelope that stand TRANSIENT_DB over the room tone's median
    frame RMS (floor_db), merged within 150 ms; each with the time of its peak sample."""
    i0, i1 = int(round(a * SR)), int(round(b * SR))
    x = np.abs(y[i0:i1]).max(axis=1)
    h = int(0.002 * SR)
    k = len(x) // h
    env = 20 * np.log10(x[:k * h].reshape(k, h).max(axis=1) + 1e-12)
    over = env > floor_db + TRANSIENT_DB
    out = []
    j = 0
    while j < k:
        if over[j]:
            e = j
            while e + 1 < k and (over[e + 1] or (e + 1 - j) * h < 0.15 * SR):
                e += 1
            blk = slice(j * h, (e + 1) * h)
            pk = int(np.argmax(x[blk])) + j * h
            out.append({"peak_film_s": round(a + pk / SR, 5), "peak_db": round(float(20 * np.log10(x[pk] + 1e-12)), 2)})
            j = e + 1
        else:
            j += 1
    return out


def peak_pitch_cents(y, t, target_hz):
    """The strongest spectral peak in the 120 ms from t (Hann, zero-padded), in cents from the nearest octave of
    target_hz."""
    i = int(round(t * SR))
    seg = y[i:i + int(0.12 * SR)].mean(axis=1).astype(np.float64)
    seg = seg * np.hanning(len(seg))
    nfft = 1 << 18
    sp = np.abs(np.fft.rfft(seg, nfft))
    f = np.fft.rfftfreq(nfft, 1 / SR)
    band = (f > 80) & (f < 2000)
    fp = float(f[band][int(np.argmax(sp[band]))])
    c = 1200 * math.log2(fp / target_hz)
    return fp, c - 1200 * round(c / 1200)


EDGE_IN_S, EDGE_OUT_S = 0.01, 0.025  # the master's edge fades (score_layers.py 'edges': 5 ms in, 20 ms out) and a margin


def check(masters, layers, T, gains_db, tune_hz=None):
    """masters: {name: stereo array}; layers: the build record's layers (id, take, licence, role, film_s, gain_db_rule,
    in_film_loudest_400ms_lufs, level_rule, target); T: {L0_s, tap_s, end_s}; gains_db: {name: the master's gain}."""
    res = {"timing": T, "checks": {}}
    L0, tap, end = T["L0_s"], T["tap_s"], T["end_s"]
    C = res["checks"]
    # C1 digital zero, on every master, everywhere (the film's last samples fade by design, one sample reaches zero)
    ei, eo = int(EDGE_IN_S * SR), int(EDGE_OUT_S * SR)
    zr = {}
    for k, y in masters.items():
        n_, at_ = zero_runs(y[ei:len(y) - eo])
        zr[k] = (n_, None if at_ is None else round(at_ + EDGE_IN_S, 4))
    C["C1_no_digital_zero_run"] = {"ok": all(v[0] <= ZERO_RUN for v in zr.values()),
                                   "outside_the_edge_fades_s": [EDGE_IN_S, EDGE_OUT_S],
                                   "longest_run_samples": {k: {"samples": v[0], "at_s": v[1]} for k, v in zr.items()}}
    per = {}
    for k, y in masters.items():
        fr = frames_rms_db(y, L0, end - 1 / FPS)
        t_fr = L0 + (np.arange(len(fr)) + 0.5) / FPS
        quiet = np.abs(t_fr - tap) > 0.5
        med = float(np.median(fr[quiet]))
        holes = t_fr[quiet & (fr < med - HOLE_DB)]
        at = attacks(y, L0 + 0.02, end - 0.02, med)
        b0 = frames_rms_db(y, L0 - 0.2, L0)  # room tone only on both sides: A4's decay ends 0.22 s before L0
        b1 = frames_rms_db(y, L0, L0 + 0.2)
        room = lufs(y, L0 + 0.05, tap - 0.6) if tap - 0.6 - (L0 + 0.05) >= 0.5 else None
        fp = peak_pitch_cents(y, at[0]["peak_film_s"] if at else tap, tune_hz) if tune_hz else (None, None)
        per[k] = {"median_frame_rms_dbfs": round(med, 2), "holes_at_s": [round(float(t), 3) for t in holes[:10]],
                  "attacks": at, "room_lufs_before_the_tap": None if room is None else round(room, 2),
                  "level_across_L0_db": round(float(np.mean(b1) - np.mean(b0)), 2),
                  "tap_peak_hz": None if fp[0] is None else round(fp[0], 2),
                  "tap_cents_from_target": None if fp[1] is None else round(fp[1], 1)}
    res["per_master"] = per
    C["C2_room_tone_under_every_frame"] = {"ok": all(not v["holes_at_s"] for v in per.values()),
                                           "hole_db": HOLE_DB, "holes": {k: v["holes_at_s"] for k, v in per.items()}}
    room_layers = [L for L in layers if L.get("role") == "room" and L["film_s"][0] <= L0 - 0.1 and L["film_s"][1] >= end - 1e-3]
    rl = room_layers[0] if room_layers else None
    pre = rl.get("in_film_loudest_400ms_lufs") if rl else None
    C["C3_room_tone_about_-52_LUFS"] = {
        "ok": bool(rl) and abs(rl["target"] - ROOM_LUFS) <= 1.0
              and all(v["room_lufs_before_the_tap"] is not None and abs(v["room_lufs_before_the_tap"] - (ROOM_LUFS + gains_db[k])) <= 2.5
                      for k, v in per.items()),
        "layer_target_lufs": rl["target"] if rl else None, "layer_loudest_400ms_lufs": pre,
        "on_the_masters": {k: {"lufs": v["room_lufs_before_the_tap"], "expected": round(ROOM_LUFS + gains_db[k], 2)}
                           for k, v in per.items()}}
    C["C4_one_one_shot_on_its_frame"] = {
        "ok": all(len(v["attacks"]) == 1 and abs(v["attacks"][0]["peak_film_s"] - tap) <= 1 / FPS for v in per.values()),
        "tap_planned_s": round(tap, 5), "attacks": {k: v["attacks"] for k, v in per.items()}}
    taps = [L for L in layers if L.get("role") == "tap" and L0 <= L["t"] < end]
    C["C5_the_tap_about_-30_LUFS"] = {
        "ok": len(taps) == 1 and abs(taps[0]["in_film_loudest_400ms_lufs"] - TAP_LUFS) <= 1.0,
        "layer_loudest_400ms_lufs": [L["in_film_loudest_400ms_lufs"] for L in taps]}
    C["C6_no_restart"] = {
        "ok": len(room_layers) == 1 and all(abs(v["level_across_L0_db"]) <= 1.5 for v in per.values()),
        "room_layers_spanning_L0_to_the_end": [L["id"] for L in room_layers],
        "level_across_L0_db": {k: v["level_across_L0_db"] for k, v in per.items()}}
    sounding = [L for L in layers if L["film_s"][1] > L0 + 1e-3]
    mix = [L["id"] for L in sounding if "mixkit" in f"{L.get('take')} {L.get('licence')}".lower()]
    C["C7_no_mixkit_in_the_coda"] = {"ok": not mix, "layers_sounding_in_the_coda": [
        {"id": L["id"], "take": L.get("take") or L.get("designed"), "licence": L.get("licence")} for L in sounding],
        "mixkit": mix}
    if tune_hz:
        C["C8_the_tap_tuned"] = {"ok": all(v["tap_cents_from_target"] is not None and abs(v["tap_cents_from_target"]) <= 30
                                           for v in per.values()),
                                 "target_hz": tune_hz, "cents": {k: v["tap_cents_from_target"] for k, v in per.items()}}
    res["ok"] = all(c["ok"] for c in C.values())
    return res


# ------------------------------------------------------------------------------------------------ the canaries
def synth(fault=None, seed=3):
    """A small master: 2 s of end card, then an 8-s coda: room tone (filtered noise at about -52 LUFS before any gain)
    from 0.3 s before L0 to the end, one decaying 329.63-Hz tap at L0 + 4.0 s, about -30 LUFS; plus a fault."""
    rng = np.random.default_rng(seed)
    L0, end = 2.0, 10.0
    tap = L0 + 4.0 + (3 / FPS if fault == "late_tap" else 0.0)
    n = int(end * SR)
    room = rng.standard_normal((n, 2))
    k = np.ones(64) / 64
    room = np.stack([np.convolve(room[:, c], k, mode="same") for c in range(2)], axis=1)
    room /= np.sqrt((room ** 2).mean())
    a_room = 10 ** ((-52.0 + 0.691 - 3.0) / 20)  # about -52 LUFS for this low-passed noise (checked by the clean run)
    y = room * a_room
    y[: int((L0 - 0.3) * SR)] = 0.0  # the end card's music is not modelled: silence before the room tone fades in
    y[: int((L0 - 0.3) * SR)] += 1e-4 * np.sin(2 * np.pi * 220 * np.arange(int((L0 - 0.3) * SR)) / SR)[:, None]
    if fault == "restart":  # the end card's room tone fades out at L0 and a new one starts 20 ms later
        i = int(L0 * SR)
        f = int(0.05 * SR)
        y[i - f:i] *= np.linspace(1, 0, f)[:, None]
        y[i:i + int(0.02 * SR)] = 0.0
        y[i + int(0.02 * SR):i + int(0.02 * SR) + f] *= np.linspace(0, 1, f)[:, None]
    if fault == "hole":
        y[int((L0 + 1.0) * SR):int((L0 + 1.3) * SR)] *= 0.01
    if fault == "zeros":
        y[int((L0 + 2.0) * SR):int((L0 + 2.0) * SR) + 100] = 0.0
    if fault == "loud_room":
        y[int(L0 * SR):] *= 10 ** (6 / 20)

    def add_tap(t, hz):
        m = int(0.25 * SR)
        tt = np.arange(m) / SR
        s = np.sin(2 * np.pi * hz * tt) * np.exp(-tt / 0.03)
        s /= np.abs(s).max()
        i = int(round(t * SR))
        y[i:i + m] += (s * 10 ** (-12.0 / 20))[:, None]
    add_tap(tap, 306.31 if fault == "untuned" else 329.63)
    if fault == "two_taps":
        add_tap(L0 + 6.0, 329.63)
    layers = [{"id": "room_end", "role": "room", "take": "room_tone_b", "licence": "designed", "film_s": [L0 - 0.3, end],
               "target": -52.0, "in_film_loudest_400ms_lufs": -52.0, "t": L0 - 0.3},
              {"id": "coda_tap", "role": "tap", "take": "standin_tap_a", "licence": "kenney-cc0", "film_s": [tap, tap + 0.25],
               "target": -30.0, "in_film_loudest_400ms_lufs": -30.0 if fault != "quiet_tap" else -36.0, "t": tap}]
    if fault == "restart":
        layers[0]["film_s"] = [L0 - 0.3, L0]
        layers.append({"id": "coda_room", "role": "room", "take": "room_tone_b", "licence": "designed",
                       "film_s": [L0 + 0.02, end], "target": -52.0, "in_film_loudest_400ms_lufs": -52.0, "t": L0 + 0.02})
    if fault == "mixkit":
        layers.append({"id": "coda_whoosh", "role": "sweep", "take": "whoosh_slide_a", "licence": "mixkit-sfx-free",
                       "film_s": [L0 + 1.0, L0 + 1.5], "t": L0 + 1.0})
    return {"web": y.astype(np.float32)}, layers, {"L0_s": L0, "tap_s": L0 + 4.0, "end_s": end}


CANARIES = {"zeros": "C1_no_digital_zero_run", "hole": "C2_room_tone_under_every_frame", "loud_room": "C3_room_tone_about_-52_LUFS",
            "two_taps": "C4_one_one_shot_on_its_frame", "late_tap": "C4_one_one_shot_on_its_frame",
            "quiet_tap": "C5_the_tap_about_-30_LUFS", "restart": "C6_no_restart", "mixkit": "C7_no_mixkit_in_the_coda",
            "untuned": "C8_the_tap_tuned"}


def canaries():
    out = {}
    m, layers, T = synth()
    clean = check(m, layers, T, {"web": 0.0}, tune_hz=329.63)
    out["clean"] = {"ok": clean["ok"], "failing": [k for k, v in clean["checks"].items() if not v["ok"]],
                    "measured": clean["per_master"]["web"]}
    # the master's own edge fades, quantized to 24 bits as the WAV holds them: exact zeros there are not a fault
    y = m["web"].copy()
    fi, fo = int(0.005 * SR), int(0.02 * SR)
    y[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)[:, None]
    y[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)[:, None]
    y = np.round(y * 2 ** 23) / 2 ** 23
    e = check({"web": y.astype(np.float32)}, layers, T, {"web": 0.0}, tune_hz=329.63)
    out["clean_with_edge_fades_24bit"] = {"ok": e["ok"], "failing": [k for k, v in e["checks"].items() if not v["ok"]],
                                          "zero_runs_in_the_fades": [zero_runs(y[:fi])[0], zero_runs(y[-fo:])[0]]}
    for fault, want in CANARIES.items():
        m, layers, T = synth(fault)
        r = check(m, layers, T, {"web": 0.0}, tune_hz=329.63)
        failing = [k for k, v in r["checks"].items() if not v["ok"]]
        out[fault] = {"planted": fault, "should_fail": want, "failing": failing, "caught": want in failing}
    out["all_ok"] = (out["clean"]["ok"] and out["clean_with_edge_fades_24bit"]["ok"]
                     and all(v["caught"] for k, v in out.items() if k not in ("clean", "clean_with_edge_fades_24bit")
                             and isinstance(v, dict)))
    return out


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "canaries":
        r = canaries()
        for k, v in r.items():
            print(k, json.dumps(v)[:300])
        if len(sys.argv) > 2:
            json.dump(r, open(sys.argv[2], "w"), indent=1)
        sys.exit(0 if r["all_ok"] else 1)
    if cmd == "check":
        import soundfile as sf
        d = sys.argv[2]
        b = json.load(open(os.path.join(d, "main.build.json")))
        coda = b.get("coda")
        if not coda:
            raise SystemExit("main.build.json has no coda span: the master was built without the coda's layers")
        T = {"L0_s": coda["from_film_s"], "tap_s": coda["tap_film_s"], "end_s": coda["to_film_s"]}
        tap = next(L for L in b["layers"] if L["id"] == "coda_tap")
        tune_hz = None
        if tap.get("tune"):
            hz = tap["kit_pitch_hz"] * 2 ** (tap["tune"]["semitones"] / 12)
            tune_hz = round(hz, 2)
        masters = {k: sf.read(os.path.join(d, f"main.{k}.wav"), dtype="float32", always_2d=True)[0] for k in ("web", "social")}
        gains = {k: b["masters"][k]["gain_db"] for k in masters}
        r = check(masters, b["layers"], T, gains, tune_hz)
        r["canaries"] = canaries()
        r["ok"] = r["ok"] and r["canaries"]["all_ok"]
        json.dump(r, open(os.path.join(d, "main.coda.json"), "w"), indent=1)
        print(json.dumps({k: v["ok"] for k, v in r["checks"].items()}), "canaries", r["canaries"]["all_ok"])
        sys.exit(0 if r["ok"] else 1)
    raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
