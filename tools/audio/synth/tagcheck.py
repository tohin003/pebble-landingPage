"""Apple SoundAnalysis checks on a render, run the way tools/audio/mix_checks.py runs them on a master: the helper's
own 3 s windows; the same file delayed by 1.5 s (so a sound that straddles a window boundary is heard whole); and the
opening heard after silence (the first 0.75 s and the first 1.5 s at the end of a 3 s clip, as a feed starts the film).

Gates (mix_checks.py and OVERRIDES §37): no voice-like label (speech, singing, shouting, laughter ...) and no siren,
alarm, beep or buzzer label at 0.30 or more in any window, or in a window's top 3; every telephone and ringtone
reading under 0.30 (a warning from 0.25); foghorn under 0.30. Other watch labels (bell, horn, whistle ...) at 0.30
or more are notes. mix_checks.py also tags the bed alone to tell the music from the effects; a demo has no bed, so
here every reading counts.

Usage: python -I tools/audio/synth/tagcheck.py FILE.wav [--sound-tags .work/audio/sound_tags] [--tmp DIR] [--out JSON]
Prints the JSON report; exit 1 when a gate fails. Build the helper first if it is missing (mix_checks.sh does:
xcrun --sdk macosx swiftc -O -swift-version 5 tools/audio/sound_tags.swift -o .work/audio/sound_tags).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf

REPO = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
SOUND_TAGS = os.path.join(REPO, ".work", "audio", "sound_tags")

# mix_checks.py's lists, matched against the label's "_"-separated words by prefix
VOICE = ["speech", "speak", "talk", "conversation", "narration", "whisper", "sing", "choir", "chant", "yodel", "rap",
         "humming", "whistling", "shout", "yell", "scream", "laugh", "giggl", "snicker", "chuckle", "cry", "sigh",
         "baby", "vocal"]
NOT_VOICE = {"singing_bowl", "bird_vocalization", "whale_vocalization", "train_whistle"}
ALARM = ["siren", "alarm", "smoke", "civil", "buzzer", "beep"]
PHONE = ["telephone", "ringtone"]
INSTRUMENTS = {"vibraphone", "singing_bowl", "french_horn", "cowbell"}
LIMIT, PHONE_TARGET, SHIFT_S, OPENING_XS = 0.3, 0.25, 1.5, (0.75, 1.5)


def label_kind(lab):
    words = lab.split("_")
    has = lambda stems: any(w.startswith(s) for w in words for s in stems)  # noqa: E731
    if has(PHONE):
        return "phone"
    if lab not in NOT_VOICE and has(VOICE):
        return "voice"
    if has(ALARM):
        return "alarm"
    if lab == "foghorn":
        return "foghorn"
    return "other_watch"


def tag(path, sound_tags=SOUND_TAGS):
    out = subprocess.run([sound_tags, path], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def _summary(tg, offset=0.0):
    return {"windows": tg["windows"], "top_tags": tg["tags"][:8],
            "top3_by_window": [{"t": round(w["t"] - offset, 1), "top": [f"{x['label']} {x['p']}" for x in w["top"]]}
                               for w in tg["timeline"]],
            "watch": [{"label": w["label"], "kind": label_kind(w["label"]), "max": w["max"]} for w in tg["watch"]]}


def check(path, sound_tags=SOUND_TAGS, tmp=None):
    """Tag `path` in every pass; return the report (passes, fails, warnings, notes)."""
    x, sr = sf.read(path, always_2d=True, dtype="float32")
    fails, warnings, notes, passes = [], [], [], {}
    with tempfile.TemporaryDirectory(dir=tmp) as td:
        files = {"main": (path, 0.0)}
        sh = os.path.join(td, "shift.wav")
        sf.write(sh, np.concatenate([np.zeros((int(SHIFT_S * sr), x.shape[1]), np.float32), x]), sr, subtype="FLOAT")
        files["shift"] = (sh, SHIFT_S)
        n3 = int(round(3.0 * sr))
        for xs in OPENING_XS:
            k = min(len(x), int(round(xs * sr)))
            clip = np.zeros((n3, x.shape[1]), np.float32)
            clip[n3 - k:] = x[:k]
            p = os.path.join(td, f"open{xs}.wav")
            sf.write(p, clip, sr, subtype="FLOAT")
            files[f"open{xs}"] = (p, None)
        for view, (p, off) in files.items():
            tg = tag(p, sound_tags)
            passes[view] = _summary(tg, off or 0.0)
            top_sets = {w["t"]: [t["label"] for t in w["top"]] for w in tg["timeline"]}
            for w in tg["watch"]:
                lab, kind = w["label"], label_kind(w["label"])
                where = lambda s: (f"{s - off:.1f}-{s - off + 3:.1f} s" if off is not None  # noqa: E731
                                   else f"the opening ({view})")
                for s, conf in tg.get("watch_windows", {}).get(lab, []):
                    msg = f"{view}: {kind} '{lab}' {conf} at {where(s)}"
                    if kind in ("phone", "voice", "alarm", "foghorn") and conf >= LIMIT:
                        fails.append(msg)
                    elif kind == "phone" and conf >= PHONE_TARGET:
                        warnings.append(msg + f" (over the {PHONE_TARGET} target)")
                    elif kind == "other_watch" and conf >= LIMIT and lab not in INSTRUMENTS:
                        notes.append(msg)
                if kind in ("voice", "alarm"):
                    for s, labs in top_sets.items():
                        if lab in labs:
                            fails.append(f"{view}: {kind} '{lab}' in the top 3 at {where(s)}")
    watch_max = {}
    for v in passes.values():
        for w in v["watch"]:
            watch_max[w["label"]] = max(watch_max.get(w["label"], 0.0), w["max"])
    return {"file": path, "seconds": round(len(x) / sr, 3), "passes": passes, "watch_max": watch_max,
            "phone_max": max([m for lab, m in watch_max.items() if label_kind(lab) == "phone"], default=0.0),
            "fails": fails, "warnings": warnings, "notes": notes, "pass": not fails}


def main(argv=None):
    import argparse
    ap = argparse.ArgumentParser(description="SoundAnalysis gates on one render (mix_checks.py's passes)")
    ap.add_argument("wav")
    ap.add_argument("--sound-tags", default=SOUND_TAGS)
    ap.add_argument("--tmp", default=None, help="folder for the shifted and opening clips (deleted after)")
    ap.add_argument("--out", default=None, help="also write the report here")
    a = ap.parse_args(argv)
    if not os.path.exists(a.sound_tags):
        sys.exit(f"tagcheck: no helper at {a.sound_tags} (build it: see this file's docstring)")
    rep = check(a.wav, a.sound_tags, a.tmp)
    text = json.dumps(rep, indent=1)
    if a.out:
        with open(a.out, "w") as f:
            f.write(text)
    print(text)
    return 0 if rep["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
