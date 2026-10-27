"""Build the sound-effect kit from a plan: trim, fade, normalise and measure every take, and write KIT.json.

Each plan entry names a source and the edits. Sources:
  {"provider": "mixkit", "key": "<item id>"}             a file the person downloaded by hand (OVERRIDES §55; recorded in provenance_mixkit.json)
  {"provider": "kenney", "key": "<pack>/<file.ogg>"}     a CC0 Kenney file on disk (.work/audio/kenney)
  {"provider": "designed", "recipe": "sub_glide" | "air" | "shimmer", "params": {...}}   made from code, no samples
  {"provider": "derived", "from": "<kit id>" | "from_source": {...}, "op": "reverse_tail" | "preverb" | "reverb"}
  {"provider": "composite", "layers": [{"id": "<kit id>", "at_s": 0.0, "gain_db": 0.0}, ...]}
Edits, in this order: excerpt (a start, or "auto_stable" / "auto_clean" for beds: the steadiest stretch, or the one
whose classifier windows hear fewest of an "avoid" list) -> DC removal -> reverse -> trim (start_db / end_db below the
peak, with a pre-roll) -> fades -> one gain to the stated true peak. Nothing else touches the sound: no EQ, no
compression. Optional "loop_xfade_s" turns a bed into a seamless loop (equal-power crossfade of its end into its start).

Run through scripts/heavy.sh (multi-file audio work), one job at a time:
  scripts/heavy.sh sfx2-build /usr/sbin/taskpolicy -c utility .work/audio/.venv/bin/python -I \
      tools/audio/sfx2/build_kit.py --work .work/sfx2
Reads <work>/kit_plan.json; writes <work>/kit/<role>/<id>.wav and <work>/KIT.json.
"""
import argparse
import hashlib
import json
import math
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audiolib as al  # noqa: E402

here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.abspath(os.path.join(here, "..", "..", ".."))

LICENCES = {
    "mixkit-sfx-free": {
        "name": "Mixkit Sound Effects Free License", "url": "https://mixkit.co/license/modal/sfxFree/",
        "terms": "https://mixkit.co/terms/", "commercial_use": True, "attribution_required": False,
        "attribution": None,
        "limits": "Use inside a larger work (films, web and social video, ads, broadcast). Never redistribute a file on "
                  "its own, as stock, in a tool or template; never claim it as our own or register it on any "
                  "rights-management service (e.g. YouTube Content ID). So it can never be Pebble's sonic logo, and "
                  "raw files never go in the public repo."},
    "kenney-cc0": {
        "name": "CC0 1.0 Universal (Kenney)", "url": "https://creativecommons.org/publicdomain/zero/1.0/",
        "commercial_use": True, "attribution_required": False,
        "attribution": "Optional: 'Sounds by Kenney (www.kenney.nl), CC0'",
        "limits": "None. 'Support us by crediting Kenney or www.kenney.nl (this is not mandatory)'."},
    "designed": {
        "name": "Made for this film from code (tools/audio/sfx2), no samples", "url": None, "commercial_use": True,
        "attribution_required": False, "attribution": None, "limits": "None."},
}
KENNEY_PAGES = {"interface": "https://kenney.nl/assets/interface-sounds",
                "impact": "https://kenney.nl/assets/impact-sounds"}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def sub_glide(p):
    """A sine glide (default 60 -> 30 Hz) with a fast attack and an exponential decay; optional harmonics so a phone
    speaker hears its movement. TREATMENT §4.6 allows 'a designed sine glide 60 to 30 Hz' for the sub drops."""
    sr = al.SR
    dur, gl = float(p.get("dur_s", 1.4)), float(p.get("glide_s", 0.9))
    f0, f1 = float(p.get("f0", 60.0)), float(p.get("f1", 30.0))
    t = np.arange(int(dur * sr)) / sr
    f = f0 * (f1 / f0) ** (np.minimum(t, gl) / gl)
    ph = 2 * math.pi * np.cumsum(f) / sr
    y = np.sin(ph)
    for h, gdb in p.get("harmonics", []):
        y = y + 10 ** (gdb / 20) * np.sin(h * ph)
    att = int(float(p.get("attack_ms", 4)) / 1000 * sr)
    env = np.exp(-t / float(p.get("tau_s", 0.4)))
    env[:att] *= np.linspace(0, 1, att)
    nf = int(float(p.get("tail_fade_s", 0.25)) * sr)
    env[-nf:] *= al.raised_cos(nf)[::-1]
    return (y * env).astype(np.float32)[:, None]


def shaped_noise(n, shape, rng, channels=2, corr=0.3):
    """Noise with a given magnitude response (shape: f -> gain), made in the frequency domain so it loops seamlessly."""
    f = np.fft.rfftfreq(n, 1 / al.SR)
    g = shape(np.maximum(f, 1.0))
    outs = []
    common = rng.standard_normal(len(f)) + 1j * rng.standard_normal(len(f))
    for _ in range(channels):
        own = rng.standard_normal(len(f)) + 1j * rng.standard_normal(len(f))
        spec = (math.sqrt(corr) * common + math.sqrt(1 - corr) * own) * g
        spec[0] = 0
        outs.append(np.fft.irfft(spec, n))
    y = np.stack(outs, axis=1)
    return (y / np.max(np.abs(y))).astype(np.float32)


def air(p):
    """A room-tone bed: pink-ish noise, high-passed at 40 Hz and rolled off above about 5 kHz, with a slow level drift
    of about +-0.5 dB. It loops seamlessly (made by inverse FFT). TREATMENT §4.6/§3.5: never true digital silence."""
    rng = np.random.default_rng(int(p.get("seed", 7)))
    n = int(float(p.get("dur_s", 24.0)) * al.SR)
    hp, lp = float(p.get("hp_hz", 40.0)), float(p.get("lp_hz", 5000.0))
    order = int(p.get("lp_order", 1))  # 2 rolls off at 12 dB an octave: a closed room, not a waterfall
    shape = lambda f: (f / 1000.0) ** -0.5 * (f / hp) ** 2 / (1 + (f / hp) ** 2) / np.sqrt(1 + (f / lp) ** (2 * order))  # noqa
    y = shaped_noise(n, shape, rng)
    t = np.arange(n) / al.SR
    drift = 10 ** (0.5 * np.sin(2 * math.pi * t / (n / al.SR)) * np.sin(2 * math.pi * 3 * t / (n / al.SR)) / 20)
    return (y * drift[:, None]).astype(np.float32)


def shimmer(p):
    """A glassy shimmer from filtered noise only (no pitched partials, so no bell or mallet): a high band of noise that
    swells and fades, with sparse bright grains. TREATMENT §4.6: 'Mixkit or filtered noise; never a bell or mallet'."""
    rng = np.random.default_rng(int(p.get("seed", 11)))
    dur = float(p.get("dur_s", 4.5))
    n = int(dur * al.SR)
    lo, hi = float(p.get("lo_hz", 4500.0)), float(p.get("hi_hz", 14000.0))
    band = lambda f: 1.0 / np.sqrt(1 + (lo / f) ** 4) / np.sqrt(1 + (f / hi) ** 4)  # noqa: E731
    y = shaped_noise(n, band, rng, corr=0.1)
    t = np.arange(n) / al.SR
    att, rel = float(p.get("attack_s", 1.2)), float(p.get("release_s", 2.4))
    env = np.minimum(1.0, (t / att) ** 1.5) * np.where(t > dur - rel, np.cos((t - (dur - rel)) / rel * math.pi / 2) ** 2,
                                                        1.0)
    y = y * env[:, None] * float(p.get("bed_level", 0.6))
    ghp = float(p.get("grain_hp_hz", 8000.0))
    grains = shaped_noise(n, lambda f: 1.0 / np.sqrt(1 + (ghp / f) ** 4), rng, corr=0.0)
    gl = max(16, int(float(p.get("grain_ms", 8.0)) / 1000 * al.SR))
    win = np.hanning(gl)
    rate = float(p.get("grains_per_s", 24.0))
    for c in rng.uniform(0, dur, int(rate * dur)):
        i = int(c * al.SR)
        if i + gl >= n:
            continue
        pan = rng.uniform(0.2, 0.8)
        amp = env[i] * rng.uniform(0.3, 1.0)
        y[i:i + gl, 0] += grains[i:i + gl, 0] * win * amp * (1 - pan)
        y[i:i + gl, 1] += grains[i:i + gl, 1] * win * amp * pan
    return y.astype(np.float32)


def auto_clean(y, dur_s, avoid, sound_tags, tmp):
    """The excerpt of dur_s whose 3 s classifier windows hear the fewest of the avoid labels (birds in a bed, say),
    then the steadiest loudness. Returns (start_s, worst avoid score, loudness std)."""
    tl = al.timeline(y, sound_tags, tmp)
    k = int(math.ceil(dur_s / 3.0))
    bad = [sum(p for lab, p in w["labels"].items() if any(v in lab for v in avoid)) for w in tl]
    times, st = al.windowed_loudness(y, 3.0, 0.5)
    best = None
    for i in range(0, max(1, len(tl) - k + 1)):
        if (i + k) * 3.0 > y.shape[0] / al.SR:
            break
        worst = max(bad[i:i + k]) if bad[i:i + k] else 0.0
        sel = (times >= i * 3.0 + 3.0) & (times <= (i + k) * 3.0)
        sd = float(np.std(st[sel])) if sel.any() else 0.0
        key = (round(worst, 2), sd)
        if best is None or key < best[0]:
            best = (key, i)
    (worst, sd), i = best
    return i * 3.0, worst, round(sd, 3)


def auto_stable(y, dur_s, avoid_s=1.0):
    """The excerpt of dur_s whose 3 s short-term loudness varies least (beds: no events, no swells)."""
    times, st = al.windowed_loudness(y, 3.0, 0.5)
    n = int(dur_s / 0.5)
    best, bi = None, 0
    for i in range(int(avoid_s / 0.5), max(1, len(st) - n - int(avoid_s / 0.5))):
        v = float(np.std(st[i:i + n]))
        if best is None or v < best:
            best, bi = v, i
    start = max(0.0, float(times[bi]) - 3.0)
    return start, round(best or 0.0, 3)


def loopify(y, dur_s, xf_s):
    """Seamless loop of dur_s: the xf_s that follows the loop's end is crossfaded (equal power) into its start."""
    n, x = int(dur_s * al.SR), int(xf_s * al.SR)
    if y.shape[0] < n + x:
        raise SystemExit("loop needs dur_s + loop_xfade_s of source")
    out = y[:n].copy()
    t = np.linspace(0, math.pi / 2, x)[:, None]
    out[:x] = y[:x] * np.sin(t) + y[n:n + x] * np.cos(t)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--work", default=os.path.join(repo, ".work", "sfx2"))
    ap.add_argument("--plan", default=None, help="default: <work>/kit_plan.json")
    ap.add_argument("--kenney", default=os.path.join(repo, ".work", "audio", "kenney"))
    ap.add_argument("--sound-tags", default=os.path.join(repo, ".work", "audio", "sound_tags"))
    ap.add_argument("--only", nargs="*", help="build only these ids (and what they need)")
    ap.add_argument("--no-tags", action="store_true")
    a = ap.parse_args()
    plan = json.load(open(a.plan or os.path.join(a.work, "kit_plan.json"), encoding="utf-8"))
    fmt = plan["format"]
    prov = json.load(open(os.path.join(a.work, "provenance_mixkit.json"), encoding="utf-8"))["items"]
    tmp = os.path.join(a.work, "tmp")
    os.makedirs(tmp, exist_ok=True)
    out_files = []
    old_kit = {}
    if a.only and os.path.exists(os.path.join(a.work, "KIT.json")):
        old_kit = {f["id"]: f for f in json.load(open(os.path.join(a.work, "KIT.json"), encoding="utf-8"))["files"]}

    class Built(dict):  # a take built in this run, else the one on disk from the last full build
        def __missing__(self, key):
            f = old_kit[key]
            y_, _ = al.load(os.path.join(a.work, f["file"]))
            self[key] = {"audio": y_, "licence": f["licence"]}
            return self[key]

    built = Built()
    t0 = time.time()
    for ent in plan["files"]:
        if a.only and ent["id"] not in a.only:
            continue
        src, ed = ent["source"], ent.get("edit", {})
        rec = {k: ent[k] for k in ent if k not in ("source", "edit")}
        s_out = {"provider": src["provider"]}
        def load_raw(s):
            out = {"provider": s["provider"]}
            if s["provider"] == "mixkit":
                p = prov[str(s["key"])]
                path = os.path.join(a.work, "dl", "mixkit", f"mixkit-{s['key']}.wav")
                yy, sfmt = al.load(path)
                out.update({"item_id": int(s["key"]), "title": p["title"], "source_page": p["listed_on"][0],
                            "listed_on": p["listed_on"], "download_url": p["url"], "sha256": p["sha256"],
                            "fetched_at": p["fetched_at"], "original": sfmt})
                return yy, out, "mixkit-sfx-free"
            pack, fn = s["key"].split("/", 1)
            path = os.path.join(a.kenney, pack, "Audio", fn)
            yy, sfmt = al.load(path)
            out.update({"pack": pack, "file": fn, "source_page": KENNEY_PAGES[pack], "sha256": sha256(path),
                        "original": sfmt})
            return yy, out, "kenney-cc0"

        if src["provider"] in ("mixkit", "kenney"):
            y, raw, lic = load_raw(src)
            s_out.update(raw)
        elif src["provider"] == "designed":
            recipes = {"sub_glide": sub_glide, "air": air, "shimmer": shimmer}
            if src["recipe"] not in recipes:
                raise SystemExit(f"unknown recipe {src['recipe']}")
            y = recipes[src["recipe"]](src.get("params", {}))
            s_out.update({"recipe": src["recipe"], "params": src.get("params", {})})
            lic = "designed"
        elif src["provider"] == "derived":
            if "from_source" in src:  # straight from a downloaded or CC0 file
                yb, raw, lic_b = load_raw(src["from_source"])
                base = {"audio": yb, "licence": lic_b}
                s_out["from_source"] = raw
            else:
                base = built[src["from"]]
            y = base["audio"].copy()
            if src["op"] == "reverse_tail":
                # the take reversed, so its decay becomes a swell that ends where the original's attack began
                y = y[::-1].copy()
                keep = int(float(src.get("keep_s", 2.0)) * al.SR)
                y = y[-keep:] if y.shape[0] > keep else y
            elif src["op"] == "preverb":
                # the take's own reverb, reversed: a swell that ends exactly where the take begins (place its end on
                # the downbeat, then the take itself)
                y = al.preverb(y, float(src.get("at_s", 0.0)), float(src.get("len_s", 2.0)),
                               room=float(src.get("room_size", 0.92)), curve=float(src.get("curve", 1.6)))
            elif src["op"] == "reverb":
                # a room around a dry take (pedalboard's Freeverb-style Reverb; GPL-3.0, run here, never shipped)
                import pedalboard
                tail = int(float(src.get("tail_s", 2.5)) * al.SR)
                y = al.as_stereo(np.vstack([y, np.zeros((tail, y.shape[1]), dtype=np.float32)]))
                rv = pedalboard.Reverb(room_size=float(src.get("room_size", 0.85)),
                                       damping=float(src.get("damping", 0.5)), wet_level=float(src.get("wet", 0.35)),
                                       dry_level=float(src.get("dry", 1.0)), width=1.0)
                y = pedalboard.Pedalboard([rv])(y.T, al.SR).T.astype(np.float32)
            else:
                raise SystemExit(f"unknown op {src['op']}")
            s_out.update({"from": src.get("from"), "op": src["op"],
                          "params": {k: v for k, v in src.items() if k not in ("provider", "from", "op",
                                                                              "from_source")}})
            if "from" in src:  # where the take it came from came from
                s_out["from_source_page"] = next((f["source"].get("source_page") for f in out_files
                                                  if f["id"] == src["from"]), None)
            lic = base["licence"]
        elif src["provider"] == "composite":
            span = max(built[L["id"]]["audio"].shape[0] / al.SR + float(L.get("at_s", 0)) for L in src["layers"])
            y = np.zeros((int(math.ceil(span * al.SR)), 2), dtype=np.float32)
            lics = []
            for L in src["layers"]:
                la = al.as_stereo(built[L["id"]]["audio"]) * 10 ** (float(L.get("gain_db", 0)) / 20)
                i = int(float(L.get("at_s", 0)) * al.SR)
                y[i:i + la.shape[0]] += la
                lics.append(built[L["id"]]["licence"])
            s_out.update({"layers": src["layers"]})
            lic = "mixkit-sfx-free" if "mixkit-sfx-free" in lics else ("kenney-cc0" if "kenney-cc0" in lics
                                                                       else "designed")
        else:
            raise SystemExit(f"unknown provider {src['provider']}")

        e_out = {}
        if "excerpt" in ed:
            ex = ed["excerpt"]
            if ex.get("start_s") == "auto_stable":
                st, sd = auto_stable(y, float(ex["dur_s"]) + float(ed.get("loop_xfade_s", 0)))
                e_out["excerpt_auto_stable_std_lu"] = sd
            elif ex.get("start_s") == "auto_clean":
                st, worst, sd = auto_clean(y, float(ex["dur_s"]) + float(ed.get("loop_xfade_s", 0)),
                                           ex.get("avoid", []), a.sound_tags, tmp)
                e_out["excerpt_auto_clean"] = {"avoid": ex.get("avoid", []), "worst_window_score": worst,
                                               "short_term_std_lu": sd}
            else:
                st = float(ex.get("start_s", 0))
            n = int((float(ex["dur_s"]) + float(ed.get("loop_xfade_s", 0))) * al.SR)
            y = y[int(st * al.SR): int(st * al.SR) + n]
            e_out["excerpt"] = {"start_s": round(st, 3), "dur_s": ex["dur_s"]}
        y = al.remove_dc(y)
        if ed.get("reverse"):
            y = y[::-1].copy()
            e_out["reversed"] = True
        if ed.get("trim", True):
            s, e = al.trim_points(y, float(ed.get("start_db", -50)), float(ed.get("end_db", -60)),
                                  float(ed.get("preroll_ms", 5)) / 1000)
            e_out["trim"] = {"start_s": round(s / al.SR, 4), "end_s": round(e / al.SR, 4),
                             "start_db": ed.get("start_db", -50), "end_db": ed.get("end_db", -60)}
            y = y[s:e]
        if ed.get("loop_xfade_s"):
            y = loopify(y, float(ed["excerpt"]["dur_s"]), float(ed["loop_xfade_s"]))
            e_out["loop_xfade_s"] = ed["loop_xfade_s"]
            fi, fo = 0.0, 0.0
        else:
            dur = y.shape[0] / al.SR
            fi = float(ed.get("fade_in_ms", 2)) / 1000
            fo = ed.get("fade_out_ms")
            # default: 5 % of the take, at least 30 ms (a fifth of a take under 0.15 s), at most 400 ms; the end was
            # already cut 60 dB under the loudest moment, so the fade only touches the last of the tail
            fo = min(max(0.05 * dur, min(0.03, 0.2 * dur)), 0.4) if fo is None else float(fo) / 1000
        y = al.apply_fades(y, fi, fo)
        e_out.update({"fade_in_ms": round(fi * 1000, 1), "fade_out_ms": round(fo * 1000, 1)})
        peak = float(ed.get("peak_dbtp", fmt["peak_one_shot_dbtp"]))
        y, g = al.normalise_tp(y, peak)
        e_out.update({"peak_target_dbtp": peak, "gain_db": g})
        rel = os.path.join("kit", ent["role"], f"{ent['id']}.wav")
        al.write(os.path.join(a.work, rel), y)
        y_disk, _ = al.load(os.path.join(a.work, rel))
        meas = al.measure(y_disk)
        rec.update({"file": rel, "licence": lic, "attribution": ent.get("attribution", LICENCES[lic]["attribution"]),
                    "source": s_out, "edit": e_out, "measure": meas})
        mix = dict(ent.get("mix", {}))
        if "target_m_lufs" in mix:  # the starting gain that puts the take's loudest 400 ms at its role's level
            mix["gain_db_start"] = round(float(mix["target_m_lufs"]) - meas["lufs_m_max"], 1)
        rec["mix"] = mix
        if not a.no_tags:
            rec["classifier"] = al.classify(y_disk, a.sound_tags, tmp)
            # The classifier hears level: a whoosh that reads 'whoosh' at full scale can read 'air_horn' 14 dB down.
            # So each take is also tagged at its film level (its role's target loudness, alone, over silence).
            if "gain_db_start" in mix:
                rec["classifier_film_level"] = al.classify(
                    (y_disk * 10 ** (mix["gain_db_start"] / 20)).astype(np.float32), a.sound_tags, tmp)
        built[ent["id"]] = {"audio": y_disk, "licence": lic}
        out_files.append(rec)
        print(f"{ent['id']:28} {meas['duration_s']:7.3f}s TP {meas['true_peak_dbtp']:6.2f} "
              f"I {meas['lufs_i']} M {meas['lufs_m_max']:6.2f} {rec.get('classifier', {}).get('verdict', '-')}"
              f" / film level {rec.get('classifier_film_level', {}).get('verdict', '-')} "
              f"{rec.get('classifier_film_level', {}).get('top', [])[:3]}", flush=True)
    kit = {
        "kit": "sfx2", "made": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "secs": round(time.time() - t0, 1),
        "about": plan.get("about"), "format": fmt, "licences": LICENCES, "roles": plan.get("roles", {}),
        "files": out_files, "excluded": plan.get("excluded", []), "sonniss_upgrades": plan.get("sonniss_upgrades", {}),
        "licence_snapshots": plan.get("licence_snapshots", {}),
        "measurement_notes": {
            "loudness": "ITU-R BS.1770-4. Mono files are measured as they play in the stereo mix (both channels).",
            "lufs_i": "gated integrated loudness; files under 0.4 s are padded with silence to one 400 ms block",
            "lufs_m_max": "loudest 400 ms (momentary, ungated), the useful number for one-shots",
            "lufs_s_max": "loudest 3 s (short-term), for files of 3 s or more",
            "true_peak_dbtp": "4x oversampled", "classifier": "Apple SoundAnalysis via .work/audio/sound_tags, "
            "two passes (the second delayed 1.5 s); gates as OVERRIDES §36-§37: voice or alarm labels at 0.30 or in "
            "a window's top 3 fail, phone/ringtone/foghorn at 0.30 fail and from 0.25 warn"},
    }
    if a.only:
        keep = [f for f in old_kit.values() if f["id"] not in {r["id"] for r in out_files}]
        order = [f["id"] for f in plan["files"]]
        kit["files"] = sorted(keep + out_files, key=lambda f: order.index(f["id"]) if f["id"] in order else 1e9)
    json.dump(kit, open(os.path.join(a.work, "KIT.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    if os.path.isdir(tmp) and not os.listdir(tmp):
        os.rmdir(tmp)
    print(f"{len(out_files)} files in {time.time() - t0:.1f} s -> {os.path.join(a.work, 'KIT.json')}")


if __name__ == "__main__":
    main()
