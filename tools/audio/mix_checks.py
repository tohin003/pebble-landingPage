"""Gate checks for the film's final soundtrack masters (lane M1; critic H9/H12, OVERRIDES §4, §37 and §41, FILM_SPEC §11
and §20; since 2026-10-26 the trailer's, TRAILER_RESEARCH report.music).

For one master (--name web|social sets the targets; any other name, e.g. a cut's, takes them from --target):
  length    exactly the film's frames (tools/audio/beatmap.json), or the cut's (--cut docs/film-cuts/<name>.json), at
            its fps: 76.8 s for the film, 28.8 s for x30. Gate.
  loudness  FFmpeg ebur128 (peak=true, 4x oversampled true peak): integrated loudness, LRA, true peak.
            Gates: web -16 +-0.5 LUFS and <= -1.5 dBTP; social -14 +-0.5 LUFS and <= -1.0 dBTP.
  aac       the same measurement on AAC 160 kb/s and 192 kb/s 48 kHz stereo encodes (FFmpeg's aac, as
            tools/encode/encode.sh makes the film's and the social films' audio), with the true peak read as
            tools/encode/verify.mjs reads it: the largest of ebur128's per-frame true_peak, full precision. Gate (the
            energetic recut, ENERGY_SPEC §8.5): web, the film's 160 kb/s encode <= -1.5 dBTP (verify.mjs D10); social
            and cuts, the 192 kb/s encode <= -1.0 dBTP. The encodes are deleted.
  tags      Apple SoundAnalysis through the sound_tags helper (3 s windows, no overlap).
            Gate (the helper's own windows): no voice-like label (speech, singing, shouting, laughter ...) and no
            siren/alarm/beep/buzzer label reaches 0.3 in any window or enters a window's top 3; every 'telephone',
            'ringtone' and 'foghorn' label (OVERRIDES §37) stays below 0.3 in every window.
            Boundary pass: the same labels on a copy delayed by 1.5 s, so an effect that straddles a window boundary is
            heard whole. To tell the effects from the music, the bed alone, level-matched to the master, is tagged the
            same way: a reading of 0.3 or more fails only where the bed alone stays below 0.3 (the effects push it
            over); where the bed alone is already there, it is a warning for the music, with both numbers.
            Opening pass (lane M2): the film's first 0.75 s and first 1.5 s heard after silence (a 3 s clip, silence
            first), master and bed alone. A feed starts the film from silence, so a phone or foghorn label of 0.3 or
            more fails here whatever its source, and so does a voice or alarm label at 0.3 or in the top 3.
            After-silence passes (the trailer, report.music): the same gate on the first 0.75 s and 1.5 s from the drop
            after the dead stop (f648), the climax's release (f1512) and the tests passing after their breath (f1656),
            wherever this timeline plays them (AFTER_SILENCE).
            Every phone or foghorn reading from 0.25 (lane M2's target) up to the gate is a warning, in every pass.
            Other watch labels (bell, horn, whistle ...) at 0.3 or more are notes; instruments (vibraphone ...) are not.
            The narrated twin (--voice, its voice stem): speech is expected where the narrator speaks, so a voice-like
            label in a window that overlaps one of the stem's lines is a note, never a fail; outside them every gate
            holds. Gate the music and effects themselves on mix_master.py's --me-out file, with no --voice.
            End card (lane fin-audio): a report; the passes above hold its gates. It lists every 'telephone', 'ringtone'
            and 'foghorn' reading, master and bed alone, in each window of either grid that overlaps the end card. The
            end card starts at the beat map's "endcard" section (f2016), or in a cut where it first plays a frame from
            there.
            Hold windows: the same kind of report for each hold of the film's cue list (--film-cues), from Pebble's
            hold to the click that releases it (the trailer's f445-504 and f1453-1512; in a cut, where it plays those
            frames), with the phone, voice-like, alarm and foghorn readings. The bed alone is always the score's bed
            (--bed), never the bed with the drive, so a label the drive stem causes counts against the gates as an
            effect's does.
  mono      loudness lost when the mix folds down to mono, (L+R)/2 on both channels (gate <= 3 dB), L/R correlation.
  speaker   share of signal power above 150 Hz (H9 small-speaker translation, >= 0.30).
  silence   the last 54 frames (1.8 s) at or below -70 dBFS, sample peak (ENERGY_SPEC §8.5: the tail ends in digital
            silence). Gate.
  dynamics  the trailer's loudness curve (TRAILER_RESEARCH report.music 'LOUDNESS AND DYNAMICS GATES', and
            OVERRIDES §41's climax), a report: each check is a warning when it misses, with its numbers. BS.1770
            (pyloudnorm, gated) per bar and per span of bars, and K-weighted (ungated) over short windows: bars 1-9 at
            least 6 LU under the integrated level; each question hit (f72, f216, f360) 10 dB or more over the 0.6 s
            before it; the dead stop (f612-638) 20 dB or more under the drop's first 300 ms; the drop's 3 s 6 LU or more
            over bar 9's first half; each hold's first 2 s 5-9 LU under the integrated level and under the montage
            (bars 15-20); Verified (the push on f1723) in the loudest 3 s window and 1.5 LU or more over the montage;
            the push at least as big as the tests passing (f1656): its momentary maximum (400 ms) within 0.6 s, and
            its first 0.3, 0.4 and 1.0 s; the breakdown (bars 26-28) 6 LU or more under the climax (bars 21-25); each
            gap's middle 200 ms at least 12 dB (K-weighted power) under the 300 ms from its hit (a gap in the hook's
            bar, 6 dB); bars 23-25 at least 1.5 LU over the mean of bars 9-22 and the loudest 3-bar span; bars 26-28
            at least 6 LU under bars 23-25; the last 54 frames exact zeros. LRA is reported against its 8-10 LU target.
            A cut maps the checks onto its bars by music.score_bars and its frames through its ranges (a check whose
            bars or frames the cut leaves out is skipped), its gaps from its own cue list.
  cues      for every effect in cues.json (automation entries, with no "file", are left out), placed exactly as
            mix_master.py places it, around the effect's peak (30 ms for clicks, pops, ticks and thuds; 200 ms for the
            rest), both K-weighted (BS.1770): the effect's level over the bed as the mix plays it (ducked, gapped, ridden
            and held: the automation's gains; the hold's low-pass is not modelled, so a margin in the hold reads low); its
            margin in its own loudest third-octave band (its body); and its best margin among the bands where it has
            energy (within 20 dB of its loudest), which is where it can be heard. FILM_SPEC §11 aims hits 3-6 dB over
            the bed. Not a gate: read it with the spectrograms.
  png       spectrograms (FFmpeg showspectrumpic): the full master, plus zooms on the turn, the stop and the drop, the
            climax, and the end (web; and a cut, with the film's zoom windows mapped onto the cut's timeline). Look at them, then
            delete them: mix_checks.sh (the film) and cut_soundtrack.sh (a cut) re-create them.
Usage: python -I mix_checks.py MASTER.wav OUT_DIR --name NAME [--target web|social] [--cut CUT.json] [--bed BED.wav]
       [--cues cues.json] [--film-cues tools/audio/cues.json] [--sound-tags .work/audio/sound_tags]
       [--ffmpeg /opt/homebrew/bin/ffmpeg] [--no-png] [--voice VOICE.wav]
Writes OUT_DIR/<name>.checks.json and the raw tag JSONs <name>.{tags,tags-shift,tags-open0.75,tags-open1.5}.json,
<name>.tags-after-f<frame>-<s>.json and <name>.bed-*.json, the same for the bed alone (+ PNGs). Exit 1 when a gate fails.
tools/audio/mix_checks.sh runs it on the trailer's four masters and the narrated twin's music and effects; for a cut:
--name x30 --target social --cut docs/film-cuts/x30.json, with the cut's own bed (--bed .work/audio/render/score/
bed_x30.wav) and cue list (--cues tools/audio/cues.x30.json).
"""
import argparse
import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
from scipy.signal import lfilter, resample_poly, welch

TARGETS = {"web": {"lufs": -16.0, "tol": 0.5, "tp_max": -1.5, "aac": ["160k", -1.5]},
           "social": {"lufs": -14.0, "tol": 0.5, "tp_max": -1.0, "aac": ["192k", -1.0]}}
# Matched against the label's "_"-separated words by prefix (a plain substring test would read "vibraphone" as "rap").
VOICE = ["speech", "speak", "talk", "conversation", "narration", "whisper", "sing", "choir", "chant", "yodel", "rap",
         "humming", "whistling", "shout", "yell", "scream", "laugh", "giggl", "snicker", "chuckle", "cry", "sigh",
         "baby", "vocal"]
NOT_VOICE = {"singing_bowl", "bird_vocalization", "whale_vocalization", "train_whistle"}  # instruments, animals, horns
ALARM = ["siren", "alarm", "smoke", "civil", "buzzer", "beep"]
PHONE = ["telephone", "ringtone"]
INSTRUMENTS = {"vibraphone", "singing_bowl", "french_horn", "cowbell"}  # in the helper's watch list by substring only
LIMIT = 0.3
PHONE_TARGET = 0.25  # lane M2: phone readings at or above this (and under LIMIT) are warnings
SHIFT_S = 1.5
OPENING_XS = (0.75, 1.5)  # s of the film's start heard after silence (and of each moment in AFTER_SILENCE)
# The trailer (TRAILER_RESEARCH §6-§7, report.music; OVERRIDES §39-§41), in film frames (a cut maps them through its
# ranges and skips what it leaves out). The other moments heard after silence: the drop after the dead stop, the
# climax's release, and the tests passing after their breath (the blueprint's "Verified after its gap"; §41 moved
# Verified to the push on f1723, and f1656 kept the gap and the first big hit)
AFTER_SILENCE = ((648, "the drop, after the dead stop"), (1512, "the climax's release (Run the tests)"),
                 (1656, "the tests pass, after their breath"))
QUESTIONS = (72, 216, 360)          # the three question cards' hits (bars 2, 4 and 6)
DEAD_STOP = (612, 639)              # the dead stop, up to the suck-back's gap (f639-647) into the drop on f648
PASSED, PUSH = 1656, 1723.5         # §41: the tests pass on bar 24's downbeat; Verified (f1723) is the 16th push
ZOOMS = {"drop": (16.8, 9.6), "climax": (47.4, 12.6), "endcard": (66.0, 10.8)}


def label_kind(lab):
    words = lab.split("_")
    has = lambda stems: any(w.startswith(s) for w in words for s in stems)  # noqa: E731
    if has(PHONE):
        return "phone"
    if lab not in NOT_VOICE and has(VOICE):
        return "voice"
    if has(ALARM):
        return "alarm"
    if lab == "foghorn":       # OVERRIDES §37: gated like the phone labels (under 0.30, a warning from 0.25), as
        return "foghorn"       # tools/audio/synth/tagcheck.py gates it
    return "other_watch"


ap = argparse.ArgumentParser()
ap.add_argument("master")
ap.add_argument("out_dir")
ap.add_argument("--name", required=True, help="web, social, or a cut's name (then --target names its loudness targets)")
ap.add_argument("--target", choices=sorted(TARGETS), help="the loudness targets (default: --name)")
ap.add_argument("--cut", help="a cut file (docs/film-cuts/<name>.json): its length, end card and zoom windows")
here = os.path.dirname(os.path.abspath(__file__))
repo = os.path.abspath(os.path.join(here, "..", ".."))
ap.add_argument("--beatmap", default=os.path.join(here, "beatmap.json"))
ap.add_argument("--bed", default=os.path.join(repo, ".work", "audio", "render", "music_bed.wav"))
ap.add_argument("--cues", default=os.path.join(here, "cues.json"))
ap.add_argument("--film-cues", default=os.path.join(here, "cues.json"), help="the film's list: its hold's middle (f940)")
ap.add_argument("--sound-tags", default=os.path.join(repo, ".work", "audio", "sound_tags"))
ap.add_argument("--ffmpeg", default="/opt/homebrew/bin/ffmpeg")
ap.add_argument("--no-png", action="store_true")
ap.add_argument("--voice", help="the narrated twin's voice stem: speech is expected only in the windows that overlap its "
                                "lines, so a voice-like label there is a note; everywhere else every gate holds")
a = ap.parse_args()
target = a.target or a.name
if target not in TARGETS:
    ap.error(f"--name {a.name!r} has no loudness targets: add --target {'|'.join(sorted(TARGETS))}")
T = TARGETS[target]
os.makedirs(a.out_dir, exist_ok=True)
res = {"master": os.path.relpath(a.master, repo), "name": a.name, "target": target, "targets": T}
fails, warnings, notes = [], [], []

# The timeline: the film's (beat map), or a cut's (its ranges of film frames, in playing order)
BM = json.load(open(a.beatmap))
FPS = BM["fps"]
END_CARD_FRAME = next(s["start_frame"] for s in BM["sections"] if s["name"] == "endcard")    # f2016
if a.cut:
    cut = json.load(open(a.cut))
    RANGES, at = [], 0
    for r in cut["ranges"]:
        first, end = r if isinstance(r, list) else (r["from"], r["to"])
        RANGES.append((first, end, at))                                    # film [first, end) plays from cut frame `at`
        at += end - first
    FRAMES = at
    res["cut"] = {"file": os.path.relpath(os.path.abspath(a.cut), repo), "name": cut["name"], "frames": FRAMES}
else:
    RANGES, FRAMES = [(0, BM["total_frames"], 0)], BM["total_frames"]


def film_to_cut_s(f0, f1):
    """The cut-time span (s) where film frames [f0, f1) play, as (first, last) seconds, or None when none of them do."""
    spans = [(at + max(f0, first) - first, at + min(f1, end) - first) for first, end, at in RANGES if f0 < end and f1 > first]
    return (min(s for s, _ in spans) / FPS, max(e for _, e in spans) / FPS) if spans else None


# where the end card starts on this timeline: the first frame played from the film's end card on
END_CARD_S = next(((at + max(0, END_CARD_FRAME - first)) / FPS for first, end, at in RANGES if end > END_CARD_FRAME), None)
# The hold windows: each hold of the film's cue list, from Pebble's hold to the click that releases it (the trailer's
# f445-504 and f1453-1512: 14.8-16.8 s and 48.4-50.4 s, report.music)
FILM_HOLDS = [(c["frame"], c["to_frame"]) for c in json.load(open(a.film_cues))
              if "file" not in c and c.get("role") == "hold"]
# The narrated twin's lines (seconds on this timeline): the voice stem's non-zero runs, merged across gaps under 0.25 s
VOICE_SPANS = []
if a.voice:
    _v, _vsr = sf.read(a.voice, always_2d=True, dtype="float32")
    _nz = np.flatnonzero(np.abs(_v).max(axis=1) > 0)
    if len(_nz):
        _cut = np.flatnonzero(np.diff(_nz) > int(0.25 * _vsr))
        VOICE_SPANS = [(s0 / _vsr, (s1 + 1) / _vsr) for s0, s1 in
                       zip(np.concatenate([[_nz[0]], _nz[_cut + 1]]), np.concatenate([_nz[_cut], [_nz[-1]]]))]
    del _v


def voiced(s0, s1):
    """True when [s0, s1) s overlaps one of the narrated twin's lines."""
    return any(s0 < v1 and s1 > v0 for v0, v1 in VOICE_SPANS)


def film_to_cut_frame(f):
    """The cut frame where film frame f plays, or None when the cut leaves it out."""
    return next((at + f - first for first, end, at in RANGES if first <= f < end), None)


def ff(*args):
    subprocess.run([a.ffmpeg, "-hide_banner", "-loglevel", "error", "-y", *args], check=True)


def ebur128(path):
    p = subprocess.run([a.ffmpeg, "-hide_banner", "-nostats", "-i", path, "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True, check=True)
    summ = p.stderr[p.stderr.rfind("Summary:"):]

    def grab(label):
        m = re.search(label + r":\s+(-?[\d.]+|-inf)", summ)
        return None if not m or m.group(1) == "-inf" else float(m.group(1))

    return {"integrated_lufs": grab("I"), "lra_lu": grab("LRA"), "true_peak_dbtp": grab("Peak")}


def true_peak_full(path):
    """The true peak (dBTP) as tools/encode/verify.mjs reads it: the largest of ebur128's per-frame lavfi.r128.true_peak
    (linear), at full precision; the summary above rounds to 0.1 dB."""
    p = subprocess.run([a.ffmpeg, "-hide_banner", "-nostats", "-nostdin", "-loglevel", "error", "-i", path, "-map", "0:a:0",
                        "-af", "ebur128=peak=true:framelog=quiet:metadata=1,ametadata=mode=print:file=-", "-f", "null", "-"],
                       capture_output=True, text=True, check=True)
    pk = max((float(v) for v in re.findall(r"^lavfi\.r128\.true_peak=([\d.]+)", p.stdout, re.M)), default=0.0)
    return round(20 * np.log10(pk), 3) if pk > 0 else None


def load(p, SR):
    x, s = sf.read(p, always_2d=True)
    x = x.T.astype(np.float64)
    if x.shape[0] == 1:
        x = np.vstack([x, x])
    if s != SR:
        from math import gcd
        g = gcd(s, SR)
        x = resample_poly(x, SR // g, s // g, axis=1)
    return x


# ---- length: exactly the film's (or the cut's) frames ----
info = sf.info(a.master)
want = round(FRAMES / FPS * info.samplerate)
res["length"] = {"samples": info.frames, "expected_samples": want, "seconds": round(info.frames / info.samplerate, 6),
                 "frames_at_fps": round(info.frames / info.samplerate * FPS, 3), "fps": FPS, "expected_frames": FRAMES}
if info.frames != want:
    fails.append(f"length {info.frames} samples ({info.frames / info.samplerate:.4f} s) is not {FRAMES} frames "
                 f"({want} samples)")

# ---- loudness (FFmpeg ebur128) ----
L = ebur128(a.master)
res["loudness"] = L
if L["integrated_lufs"] is None or abs(L["integrated_lufs"] - T["lufs"]) > T["tol"]:
    fails.append(f"integrated {L['integrated_lufs']} LUFS is not {T['lufs']} +-{T['tol']}")
if L["true_peak_dbtp"] is None or L["true_peak_dbtp"] > T["tp_max"]:
    fails.append(f"true peak {L['true_peak_dbtp']} dBTP is above {T['tp_max']}")

y, SR = sf.read(a.master, always_2d=True, dtype="float64")
meter = pyln.Meter(SR)
full = meter.integrated_loudness(y)
bed = load(a.bed, SR)
bed_gain_db = round(float(full - meter.integrated_loudness(bed.T)), 2)  # the bed alone at the master's loudness
res["bed_gain_db"] = bed_gain_db

with tempfile.TemporaryDirectory(dir=a.out_dir) as tmp:
    # ---- the AAC encodes' true peak: the film's 160 kb/s and the social films' 192 kb/s (gate: the target's own) ----
    for rate in ("160k", "192k"):
        m4a = os.path.join(tmp, f"aac-{rate}.m4a")
        ff("-i", a.master, "-c:a", "aac", "-b:a", rate, "-ar", "48000", "-ac", "2", m4a)
        res[f"aac_{rate}"] = {**ebur128(m4a), "true_peak_dbtp_full": true_peak_full(m4a)}
    AAC_RATE, AAC_GATE = T["aac"]
    aac_tp = res[f"aac_{AAC_RATE}"]["true_peak_dbtp_full"]
    res["aac_gate"] = {"bitrate": AAC_RATE, "gate_dbtp": AAC_GATE, "true_peak_dbtp": aac_tp}
    if aac_tp is None or aac_tp > AAC_GATE:
        fails.append(f"the AAC {AAC_RATE} encode peaks at {aac_tp} dBTP, above {AAC_GATE} (tools/encode/verify.mjs reads "
                     f"the same; mix_master.py --aac lowers the ceiling until it fits)")

    # ---- SoundAnalysis: master and level-matched bed, on the helper's windows and shifted by 1.5 s ----
    ms = int(SHIFT_S * 1000)
    files = {("master", "main"): a.master}
    files[("master", "shift")] = os.path.join(tmp, "master-shift.wav")
    ff("-i", a.master, "-af", f"adelay={ms}|{ms}", "-c:a", "pcm_s24le", files[("master", "shift")])
    files[("bed", "main")] = os.path.join(tmp, "bed.wav")
    ff("-i", a.bed, "-af", f"volume={bed_gain_db}dB", "-c:a", "pcm_f32le", files[("bed", "main")])
    files[("bed", "shift")] = os.path.join(tmp, "bed-shift.wav")
    ff("-i", a.bed, "-af", f"volume={bed_gain_db}dB,adelay={ms}|{ms}", "-c:a", "pcm_f32le", files[("bed", "shift")])
    tags = {}
    for (src, view), path in files.items():
        out = subprocess.run([a.sound_tags, path], capture_output=True, text=True, check=True).stdout
        fname = f"{a.name}.{'bed-' if src == 'bed' else ''}tags{'-shift' if view == 'shift' else ''}.json"
        with open(os.path.join(a.out_dir, fname), "w") as f:
            f.write(out)
        tags[(src, view)] = json.loads(out)

    # ---- the opening heard after silence (lane M2): (3 - X) s of silence, then the film's first X s ----
    n3 = int(round(3.0 * SR))
    for x in OPENING_XS:
        k = int(round(x * SR))
        for src, sig in (("master", y.T), ("bed", bed * 10 ** (bed_gain_db / 20))):
            clip = np.zeros((2, n3))
            clip[:, n3 - k:] = sig[:, :k]
            path = os.path.join(tmp, f"open-{src}.wav")
            sf.write(path, clip.T.astype(np.float32), SR, subtype="FLOAT")
            out = subprocess.run([a.sound_tags, path], capture_output=True, text=True, check=True).stdout
            with open(os.path.join(a.out_dir, f"{a.name}.{'bed-' if src == 'bed' else ''}tags-open{x}.json"), "w") as f:
                f.write(out)
            tags[(src, f"open{x}")] = json.loads(out)

    # ---- the trailer's other moments heard after silence: (3 - X) s of silence, then the first X s from each ----
    AS_POINTS = [(film_to_cut_frame(fr), fr, label) for fr, label in AFTER_SILENCE]
    AS_POINTS = [(cf, fr, label) for cf, fr, label in AS_POINTS if cf is not None]
    for cf, fr, label in AS_POINTS:
        i0 = int(round(cf / FPS * SR))
        for x in OPENING_XS:
            k = int(round(x * SR))
            for src, sig in (("master", y.T), ("bed", bed * 10 ** (bed_gain_db / 20))):
                seg = sig[:, i0:i0 + k]
                clip = np.zeros((2, n3))
                clip[:, n3 - seg.shape[1]:] = seg
                path = os.path.join(tmp, f"after-{src}.wav")
                sf.write(path, clip.T.astype(np.float32), SR, subtype="FLOAT")
                out = subprocess.run([a.sound_tags, path], capture_output=True, text=True, check=True).stdout
                with open(os.path.join(a.out_dir, f"{a.name}.{'bed-' if src == 'bed' else ''}tags-after-f{fr}-{x}.json"),
                          "w") as f:
                    f.write(out)
                tags[(src, f"after{fr}-{x}")] = json.loads(out)


def readings(tg, lab):
    """{window start s: confidence} where the label reached 0.1 (the helper records watch labels from 0.1)."""
    return {s: p for s, p in tg.get("watch_windows", {}).get(lab, [])}


def top3(tg):
    return {w["t"]: [t["label"] for t in w["top"]] for w in tg["timeline"]}


tag_res = {}
for view in ("main", "shift"):
    tg, bg = tags[("master", view)], tags[("bed", view)]
    off = SHIFT_S if view == "shift" else 0.0
    t3m, t3b = top3(tg), top3(bg)
    cls = {"voice": [], "alarm": [], "phone": [], "foghorn": [], "other_watch": []}
    for w in tg["watch"]:
        lab = w["label"]
        kind = label_kind(lab)
        rm, rb = readings(tg, lab), readings(bg, lab)
        top_at = sorted(s for s, labs in t3m.items() if lab in labs)
        # the narrated twin: speech is expected in the windows that overlap its lines (a note there, never a fail)
        spoken = sorted(s for s in set(rm) | set(top_at) if kind == "voice" and voiced(s - off, s - off + 3.0))
        for s in spoken:
            if rm.get(s, 0.0) >= LIMIT or s in top_at:
                notes.append(f"{view}: voice '{lab}' {rm.get(s, '<0.1')} at {s - off:.1f}-{s - off + 3:.1f} s"
                             f"{' (top 3)' if s in top_at else ''}: the narration, expected over its line")
        over = sorted(s for s, p in rm.items() if p >= LIMIT and s not in spoken)
        top_at = [s for s in top_at if s not in spoken]
        row = {"label": lab, "max": max([p for s, p in rm.items() if s not in spoken], default=0.0) if spoken else w["max"],
               "mean": w["mean"], "windows_over_0_3": w["windows_over_0_3"],
               "in_top3_at_s": [round(s - off, 1) for s in top_at],
               "windows_over_0_1": [[round(s - off, 1), p, rb.get(s, 0.0)] for s, p in sorted(rm.items())]}
        if spoken:
            row["over_its_lines_max"] = max(rm.get(s, 0.0) for s in spoken)
        cls[kind].append(row)
        where = lambda s: f"{s - off:.1f}-{s - off + 3:.1f} s"  # noqa: E731
        if kind == "other_watch":
            if w["max"] >= LIMIT and lab not in INSTRUMENTS:
                notes.append(f"{view}: '{lab}' {w['max']} at " + ", ".join(
                    f"{where(s)} (bed alone {rb.get(s, 0.0)})" for s in over))
            continue
        for s in over:
            msg = f"{view}: {kind} '{lab}' {rm[s]} at {where(s)}; the bed alone reads {rb.get(s, '<0.1')}"
            if view == "main" or rb.get(s, 0.0) < LIMIT:
                fails.append(msg + ("" if view == "main" else ": the effects push it over"))
            else:
                warnings.append(msg + ": from the music")
        if kind in ("phone", "foghorn"):
            for s, p in sorted(rm.items()):
                if PHONE_TARGET <= p < LIMIT:
                    warnings.append(f"{view}: {kind} '{lab}' {p} at {where(s)} is over the {PHONE_TARGET} target; "
                                    f"the bed alone reads {rb.get(s, '<0.1')}")
        if kind in ("voice", "alarm"):
            for s in top_at:
                msg = f"{view}: {kind} '{lab}' in the top 3 at {where(s)}"
                if view == "main" or lab not in t3b.get(s, []):
                    fails.append(msg)
                else:
                    warnings.append(msg + " (also in the bed alone)")
    tag_res[view] = {"windows": tg["windows"], "top_tags": tg["tags"][:8],
                     **{k: sorted(v, key=lambda r: -r["max"]) for k, v in cls.items()}}
res["tags"] = {"windows_note": "windows_over_0_1 rows: [start s in film time, master, bed alone (0.0 = below 0.1)]",
               **tag_res}
res["tags"]["phone_max"] = {v: max([r["max"] for r in tag_res[v]["phone"]], default=0.0) for v in tag_res}
for k_ in ("foghorn", "voice", "alarm"):   # voice: outside the narrated twin's lines
    res["tags"][f"{k_}_max"] = {v: max([r["max"] for r in tag_res[v][k_]], default=0.0) for v in tag_res}
if VOICE_SPANS:
    res["tags"]["voice_spans_s"] = [[round(v0, 3), round(v1, 3)] for v0, v1 in VOICE_SPANS]

# the opening heard after silence: one 3 s window each; the gate holds whatever the source (a feed starts in silence)
opening = {}
for x in OPENING_XS:
    tg, bg = tags[("master", f"open{x}")], tags[("bed", f"open{x}")]
    wm = {w["label"]: w["max"] for w in tg["watch"]}
    wb = {w["label"]: w["max"] for w in bg["watch"]}
    top = [t["label"] for t in tg["timeline"][0]["top"]] if tg["timeline"] else []
    ranked = lambda d, k: sorted(([lab, p] for lab, p in d.items() if label_kind(lab) == k), key=lambda r: -r[1])  # noqa: E731
    opening[str(x)] = {"top3": top, "top_tags": tg["tags"][:6],
                       **{k: {"master": ranked(wm, k)[:3], "bed": ranked(wb, k)[:3]} for k in ("phone", "voice", "alarm")}}
    for lab, p in wm.items():
        kind = label_kind(lab)
        msg = f"opening (the first {x} s after silence): {kind} '{lab}' {p}; the bed alone reads {wb.get(lab, 0.0)}"
        if kind in ("phone", "foghorn") and p >= LIMIT:
            fails.append(msg)
        elif kind in ("phone", "foghorn") and p >= PHONE_TARGET:
            warnings.append(msg + f" (over the {PHONE_TARGET} target)")
        elif kind in ("voice", "alarm"):
            if p >= LIMIT:
                fails.append(msg)
            if lab in top:
                fails.append(f"opening (the first {x} s after silence): {kind} '{lab}' in the top 3")
res["tags"]["opening"] = opening
res["tags"]["phone_max"]["opening"] = max(
    (p for x in OPENING_XS for lab, p in ((w["label"], w["max"]) for w in tags[("master", f"open{x}")]["watch"])
     if label_kind(lab) == "phone"), default=0.0)

# the trailer's other moments heard after silence (the drop, the climax's release, the tests passing): the opening's
# gate, at each moment this timeline plays; over a narrated line, speech is a note
after = {}
for cf, fr, label in AS_POINTS:
    for x in OPENING_XS:
        tg, bg = tags[("master", f"after{fr}-{x}")], tags[("bed", f"after{fr}-{x}")]
        wm = {w["label"]: w["max"] for w in tg["watch"]}
        wb = {w["label"]: w["max"] for w in bg["watch"]}
        top = [t["label"] for t in tg["timeline"][0]["top"]] if tg["timeline"] else []
        ranked = lambda d, k: sorted(([lab, p] for lab, p in d.items() if label_kind(lab) == k), key=lambda r: -r[1])  # noqa: E731
        after[f"f{fr}-{x}"] = {"what": label, "film_frame": fr, "frame": cf, "first_s": x, "top3": top,
                               **{k: {"master": ranked(wm, k)[:3], "bed": ranked(wb, k)[:3]}
                                  for k in ("phone", "voice", "alarm", "foghorn")}}
        at = f"{label} (f{fr}: the first {x} s after silence)"
        spoken = voiced(cf / FPS, cf / FPS + x)
        for lab, p in wm.items():
            kind = label_kind(lab)
            msg = f"{at}: {kind} '{lab}' {p}; the bed alone reads {wb.get(lab, 0.0)}"
            if kind in ("phone", "foghorn") and p >= LIMIT:
                fails.append(msg)
            elif kind in ("phone", "foghorn") and p >= PHONE_TARGET:
                warnings.append(msg + f" (over the {PHONE_TARGET} target)")
            elif kind == "voice" and spoken:
                if p >= LIMIT or lab in top:
                    notes.append(msg + ": the narration, expected over its line")
            elif kind in ("voice", "alarm"):
                if p >= LIMIT:
                    fails.append(msg)
                if lab in top:
                    fails.append(f"{at}: {kind} '{lab}' in the top 3")
res["tags"]["after_silence"] = after
res["tags"]["phone_max"]["after_silence"] = max(
    (p for r in after.values() for _, p in r["phone"]["master"]), default=0.0)

# the end card (a report; the passes above gate it): every phone reading, master and bed alone, in each window of
# either grid that overlaps it
if END_CARD_S is not None:
    ec_rows = []
    for view in ("main", "shift"):
        tg, bg = tags[("master", view)], tags[("bed", view)]
        off = SHIFT_S if view == "shift" else 0.0
        labs = sorted({lab for t_ in (tg, bg) for lab in t_.get("watch_windows", {})
                       if label_kind(lab) in ("phone", "foghorn")})
        for w in tg["timeline"]:
            s = w["t"] - off
            if s + 3.0 <= END_CARD_S + 1e-9:
                continue
            ec_rows.append({"view": view, "window_s": [round(s, 1), round(s + 3.0, 1)],
                            **{lab: [readings(tg, lab).get(w["t"], 0.0), readings(bg, lab).get(w["t"], 0.0)]
                               for lab in labs}})
    res["tags"]["end_card"] = {
        "from_s": round(END_CARD_S, 3),
        "note": "per window and phone or foghorn label: [master, bed alone]; 0.0 = below 0.1", "windows": ec_rows,
        **{f"{k}_max": max((v[0] for r in ec_rows for lab, v in r.items()
                            if lab not in ("view", "window_s") and label_kind(lab) == k), default=0.0)
           for k in ("phone", "foghorn")}}
    res["tags"]["phone_max"]["end_card"] = res["tags"]["end_card"]["phone_max"]

# the hold windows (a report; the passes above gate them): each of the film's holds, from Pebble's hold to the click
# that releases it (the trailer's f445-504 and f1453-1512), wherever this timeline plays those frames; every phone,
# voice-like, alarm and foghorn reading, master and bed alone, in each window of either grid that overlaps it
kinds = lambda r, k: [v[0] for lab, v in r.items() if lab not in ("view", "window_s", "top3") and label_kind(lab) == k]  # noqa: E731
res["tags"]["hold_windows"] = []
for h0, h1 in FILM_HOLDS:
    span = film_to_cut_s(h0, h1)
    if span is None:
        continue
    hw_rows = []
    for view in ("main", "shift"):
        tg, bg = tags[("master", view)], tags[("bed", view)]
        off = SHIFT_S if view == "shift" else 0.0
        labs = sorted({lab for t_ in (tg, bg) for lab in t_.get("watch_windows", {})
                       if label_kind(lab) in ("phone", "voice", "alarm", "foghorn")})
        for w in tg["timeline"]:
            s = w["t"] - off
            if s + 3.0 <= span[0] + 1e-9 or s >= span[1] - 1e-9:
                continue
            hw_rows.append({"view": view, "window_s": [round(s, 1), round(s + 3.0, 1)],
                            "top3": [t_["label"] for t_ in w["top"]],
                            **{lab: [readings(tg, lab).get(w["t"], 0.0), readings(bg, lab).get(w["t"], 0.0)]
                               for lab in labs}})
    res["tags"]["hold_windows"].append({
        "film_frames": [h0, h1], "span_s": [round(span[0], 3), round(span[1], 3)],
        "note": "per window and watch label: [master, bed alone]; 0.0 = below 0.1", "windows": hw_rows,
        **{f"{k}_max": max((v for r in hw_rows for v in kinds(r, k)), default=0.0)
           for k in ("phone", "voice", "alarm", "foghorn")}})
res["tags"]["phone_max"]["hold_windows"] = max((h["phone_max"] for h in res["tags"]["hold_windows"]), default=0.0)

# ---- mono fold-down and small-speaker share ----
m2 = np.stack([y.mean(axis=1)] * 2, axis=1)
res["mono"] = {"lufs_lost_db": round(full - meter.integrated_loudness(m2), 2),
               "lr_correlation": round(float(np.corrcoef(y[:, 0], y[:, 1])[0, 1]), 3)}
if res["mono"]["lufs_lost_db"] > 3.0:
    fails.append(f"mono fold-down loses {res['mono']['lufs_lost_db']} dB (> 3)")
f, pxx = welch(y.mean(axis=1), fs=SR, nperseg=8192)
band = (f >= 20) & (f <= 20000)
res["speaker"] = {"power_share_above_150hz": round(float(pxx[band & (f >= 150)].sum() / pxx[band].sum()), 3)}
if res["speaker"]["power_share_above_150hz"] < 0.30:
    fails.append(f"small-speaker share {res['speaker']['power_share_above_150hz']} (< 0.30)")

# ---- the tail's digital silence: the last 54 frames at or below -70 dBFS (a gate) ----
SPF = SR / FPS
s_last = int(round((FRAMES - 54) * SPF))
peak_last = float(np.abs(y[s_last:]).max()) if y.shape[0] > s_last else 0.0
res["silence"] = {"last_frames": 54, "from_s": round(s_last / SR, 3), "exact_zeros": peak_last == 0.0,
                  "peak_dbfs": None if peak_last == 0.0 else round(20 * np.log10(peak_last), 1)}
if peak_last > 10 ** (-70 / 20):
    fails.append(f"the last 54 frames peak at {20 * np.log10(peak_last):.1f} dBFS (want <= -70: digital silence)")

# BS.1770 K-weighting at 48 kHz (high shelf, then the RLB high-pass)
KW = [([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585]),
      ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])]
THIRDS = 1000.0 * 2.0 ** (np.arange(-12, 13) / 3.0)  # third-octave centres, 63 Hz .. 16 kHz


def kweight(x):
    for b, a_ in KW:
        x = lfilter(b, a_, x, axis=1)
    return x


# ---- the loudness curve (ENERGY_SPEC §8.5): a report; a miss is a warning with its numbers ----
cues = json.load(open(a.cues))
effects = [c for c in cues if "file" in c]
auto = [c for c in cues if "file" not in c]                            # the mix automation: gaps, the hold, the tail
z = kweight(y.T)                                                       # the K-weighted master, channels x samples
BAR_F = BM["bar_frames"]
SCORE_BARS = cut["music"]["score_bars"] if a.cut else list(range(1, FRAMES // BAR_F + 1))
HOOK_END = next(s["end_frame"] for s in BM["sections"] if s["name"] == "hook")  # f72: the trailer's hook is bar 1


def kpow(s0, s1):
    """The K-weighted power over samples [s0, s1), summed over the channels as BS.1770 does, in dB."""
    seg = z[:, max(0, s0):max(0, min(z.shape[1], s1))]
    return float(10 * np.log10(np.sum(np.mean(seg ** 2, axis=1)) + 1e-20)) if seg.shape[1] else None


def lufs_bars(out_bars):
    """BS.1770 integrated (gated) loudness of the master over these bars of this timeline (1-based), or None."""
    if not out_bars:
        return None
    x = np.concatenate([y[int(round((b - 1) * BAR_F * SPF)):int(round(b * BAR_F * SPF))] for b in out_bars])
    v = meter.integrated_loudness(x)
    return round(float(v), 2) if np.isfinite(v) else None


def bars_of(score):
    """The bars of this timeline (1-based) that play these score bars (the film: the same bars)."""
    return [i + 1 for i, b in enumerate(SCORE_BARS) if b in score]


def smp(c, frame_key, t_key):
    if c.get(frame_key) is not None:
        return int(round(c[frame_key] * SPF))
    return None if c.get(t_key) is None else int(round(c[t_key] * SR))


dyn = {"integrated_lufs": round(float(full), 2),
       "per_bar": [{"bar": i + 1, "score_bar": b, "lufs": lufs_bars([i + 1])} for i, b in enumerate(SCORE_BARS)],
       "checks": []}


def check(name, value, ok, want, **extra):
    dyn["checks"].append({"check": name, "value": value, "want": want, "ok": bool(ok), **extra})
    if not ok:
        warnings.append(f"dynamics: {name} is {value} (want {want})")


def at_s(fr):
    """Seconds on this timeline where film frame fr (fractional allowed) plays, or None."""
    cf = film_to_cut_frame(int(fr))
    return None if cf is None else (cf + (fr - int(fr))) / FPS


def lu(t0, t1):
    """Ungated K-weighted loudness (LUFS) over [t0, t1) s."""
    v = kpow(int(round(t0 * SR)), int(round(t1 * SR)))
    return None if v is None else round(v - 0.691, 2)


# The trailer's dynamics report (TRAILER_RESEARCH report.music 'LOUDNESS AND DYNAMICS GATES', with OVERRIDES §41's
# climax): each check where this timeline plays its frames
tension = bars_of(set(range(1, 10)))
if tension and lufs_bars(tension) is not None:
    v = round(full - lufs_bars(tension), 2)
    check("bars 1-9 under the integrated level (LU)", v, v >= 6.0, ">= 6", bars=tension)
for fr in QUESTIONS:
    t = at_s(fr)
    if t is not None:
        h, before = lu(t, t + 0.3), lu(t - 0.6, t)
        check(f"the question hit on f{fr}: its 300 ms over the 600 ms before (dB)", round(h - before, 1),
              h - before >= 10.0, ">= 10", hit=h, before=before)
t0, t1, td = at_s(DEAD_STOP[0]), at_s(DEAD_STOP[1]), at_s(BM["reveal"]["frame"])
if None not in (t0, t1, td):
    stop, drop = lu(t0, t1), lu(td, td + 0.3)
    check(f"the dead stop f{DEAD_STOP[0]}-{DEAD_STOP[1] - 1} under the drop's first 300 ms (dB)", round(drop - stop, 1),
          drop - stop >= 20.0, ">= 20", stop=stop, drop_300ms=drop)
    t9 = at_s(BM["reveal"]["frame"] - BAR_F)
    if t9 is not None:
        drop3, first = lu(td, td + 3.0), lu(t9, t9 + BAR_F / FPS / 2)
        check("the drop's 3 s over bar 9's first half (LU)", round(drop3 - first, 2), drop3 - first >= 6.0, ">= 6",
              drop_3s=drop3, bar9_first_half=first)
montage = bars_of(set(range(15, 21)))
mont = lufs_bars(montage) if len(montage) == 6 else None
for h0, _ in FILM_HOLDS:
    t = at_s(h0)
    if t is not None:
        hl = lu(t, t + 2.0)
        check(f"the hold on f{h0}: its 2 s under the integrated level (LU)", round(full - hl, 2), 5.0 <= full - hl <= 9.0,
              "5-9", hold=hl)
        if mont is not None:
            check(f"the hold on f{h0}: its 2 s under the montage, bars 15-20 (LU)", round(mont - hl, 2),
                  5.0 <= mont - hl <= 9.0, "5-9", montage=mont)
tv, tp = at_s(PUSH), at_s(PASSED)
if tv is not None:
    st = [(k / 10, lu(k / 10, k / 10 + 3.0)) for k in range(int((y.shape[0] / SR - 3.0) * 10) + 1)]
    st = [(t, v) for t, v in st if v is not None]
    best = max(st, key=lambda q: q[1])
    holding = [v for t, v in st if tv - 2.7 - 1e-9 <= t <= tv + 1e-9]
    ver = max(holding) if holding else None
    check("Verified (the push on f1723) is in the loudest 3 s window",
          f"the loudest from {best[0]:.1f} s at {best[1]} LUFS; the best holding the push and its next 300 ms {ver}",
          ver is not None and ver >= best[1] - 0.05, "the loudest window holds the push")
    if mont is not None and ver is not None:
        check("Verified's loudest 3 s over the montage (LU)", round(ver - mont, 2), ver - mont >= 1.5, ">= 1.5")
    if tp is not None:
        mmax = lambda t: max(lu(t + k * 0.01, t + k * 0.01 + 0.4) for k in range(21))  # noqa: E731
        mv, mp = mmax(tv), mmax(tp)
        check("the push at least as big as the tests passing (f1656): momentary maximum (400 ms) within 0.6 s (LU)",
              round(mv - mp, 2), mv >= mp, ">= 0", push=mv, passed=mp)
        for win in (0.3, 0.4, 1.0):
            a_, b_ = lu(tv, tv + win), lu(tp, tp + win)
            check(f"the push at least as big as the tests passing (f1656): its first {win} s (LU)", round(a_ - b_, 2),
                  a_ >= b_, ">= 0", push=a_, passed=b_)
clim, brk = bars_of(set(range(21, 26))), bars_of({26, 27, 28})
if len(clim) == 5 and len(brk) == 3 and None not in (lufs_bars(clim), lufs_bars(brk)):
    v = round(lufs_bars(clim) - lufs_bars(brk), 2)
    check("the breakdown (bars 26-28) under the climax (bars 21-25) (LU)", v, v >= 6.0, ">= 6")
dyn["lra_lu"] = L["lra_lu"]
dyn["lra_target"] = "8-10 LU (report.music: a target, not a gate)"
for c in (c for c in auto if c.get("role") == "gap"):
    g0, g1 = smp(c, "frame", "t"), smp(c, "to_frame", "t_end")
    hook = c.get("source_frame", c.get("frame", HOOK_END)) < HOOK_END
    mid = (g0 + g1) // 2
    middle, after = kpow(mid - int(0.1 * SR), mid + int(0.1 * SR)), kpow(g1, g1 + int(0.3 * SR))
    if middle is not None and after is not None:
        v = round(after - middle, 1)
        want = 6.0 if hook else 12.0
        check(f"gap f{c.get('frame')}-{c.get('to_frame')}: the 300 ms from its hit over its middle 200 ms (dB)", v,
              v >= want, f">= {want:g}", source_frame=c.get("source_frame", c.get("frame")), hook=hook)
p = bars_of({23, 24, 25})
if len(p) == 3 and lufs_bars(p) is not None:
    lp = lufs_bars(p)
    proof = [r["lufs"] for r in dyn["per_bar"] if 9 <= r["score_bar"] <= 22 and r["lufs"] is not None]
    if proof:
        v = round(lp - float(np.mean(proof)), 2)
        check("bars 23-25 over the mean of bars 9-22 (LU)", v, v >= 1.5, ">= 1.5", bars_23_25=lp,
              mean_9_22=round(float(np.mean(proof)), 2))
    spans = [(i, lufs_bars([i, i + 1, i + 2])) for i in range(1, len(SCORE_BARS) - 1)]
    best = max((s for s in spans if s[1] is not None), key=lambda s: s[1])
    check("the loudest 3-bar span", f"bars {best[0]}-{best[0] + 2} at {best[1]} LUFS", best[0] == p[0],
          f"bars {p[0]}-{p[2]}")
    q = bars_of({26, 27, 28})
    if len(q) == 3 and lufs_bars(q) is not None:
        v = round(lp - lufs_bars(q), 2)
        check("bars 26-28 under bars 23-25 (LU)", v, v >= 6.0, ">= 6", bars_26_28=lufs_bars(q))
k_last = int(round((FRAMES - 54) * SPF))
check("the last 54 frames are digital silence", "exact zeros" if not np.any(y[k_last:]) else "not zero",
      not np.any(y[k_last:]), "exact zeros")
dyn["pass"] = all(c["ok"] for c in dyn["checks"])
res["dynamics"] = dyn

# ---- every effect over the bed as the mix plays it (ducked, gapped, held), placed as mix_master.py places it ----
base = os.path.dirname(os.path.abspath(a.cues))
duck = np.ones(bed.shape[1])
for c in effects:
    if c.get("duck_db", 0):
        d = 10 ** (-abs(c["duck_db"]) / 20)
        k = int(c["t"] * SR)
        a1, r1 = int(0.04 * SR), int(0.6 * SR)
        env = np.concatenate([np.linspace(1, d, a1), np.linspace(d, 1, r1)])
        k0 = max(0, k - a1)
        duck[k0:k0 + len(env)] = np.minimum(duck[k0:k0 + len(env)], env[: len(duck[k0:k0 + len(env)])])
def lin(env, i0, i1, v0, v1):
    """env[i0:i1] goes linearly from v0 to v1 (clipped to env)."""
    if i1 > i0:
        k0, k1 = max(0, i0), min(len(env), i1)
        if k1 > k0:
            env[k0:k1] = (v0 + (v1 - v0) * (np.arange(i0, i1) - i0 + 1) / (i1 - i0))[k0 - i0:k1 - i0]


for c in auto:                                       # the automation's gains on the bed (linear ramps; no low-pass)
    i0, i1, nb = smp(c, "frame", "t"), smp(c, "to_frame", "t_end"), bed.shape[1]
    if c.get("role") in ("gap", "ride"):                            # the hook's ride is a gap's envelope at its own db
        g = 10 ** (c.get("db", -24 if c.get("role") == "gap" else -1.5) / 20)
        ka, kr = int(c.get("attack_ms", 10) * SR / 1000), int(c.get("release_ms", 4) * SR / 1000)
        env = np.ones(nb)
        env[max(0, i0):max(0, i1)] = g
        lin(env, i0 - ka, i0, 1.0, g)
        lin(env, i1 - kr, i1, g, 1.0)
        duck *= env
    elif c.get("role") == "hold":
        ir = smp(c, "release_frame", "t_release") or i1
        kx = int(c.get("crossfade_ms", 30) * SR / 1000)
        share = np.zeros(nb)
        lin(share, i0 - kx, i0, 0.0, 1.0)
        share[max(0, i0):max(0, i1)] = 1.0
        lin(share, i1, ir, 1.0, 0.0)
        duck *= 10 ** (c.get("bed_db", -6) * share / 20)
bed_d = bed * duck


def window(x, start, a0, a1):
    """Samples a0..a1 (timeline) of a signal x placed at timeline sample `start`, zero where it doesn't sound."""
    seg = np.zeros((x.shape[0], a1 - a0))
    k0, k1 = max(a0, start), min(a1, start + x.shape[1])
    if k1 > k0:
        seg[:, k0 - a0:k1 - a0] = x[:, k0 - start:k1 - start]
    return seg


TRANSIENTS = {"click", "pop", "tick", "thud"}  # measured over 30 ms around the peak; the other roles over 200 ms


def compare(s, i, pk, half, pre=int(0.5 * SR)):
    """The effect vs the ducked bed over pk +- half, both K-weighted (with 0.5 s of pre-roll so the filters settle):
    the level difference; the difference in the effect's loudest third-octave band (its body); and the best
    difference among the bands where the effect is within 20 dB of its loudest band (where it can be heard)."""
    a0, a1 = max(0, pk - half - pre), min(bed_d.shape[1], pk + half)
    ws, wb = kweight(window(s, i, a0, a1)), kweight(bed_d[:, a0:a1])
    cut = slice(pk - half - a0, a1 - a0)
    ws, wb = ws[:, cut], wb[:, cut]
    kw = 10 * np.log10((np.mean(ws ** 2) + 1e-20) / (np.mean(wb ** 2) + 1e-20))
    n = max(ws.shape[1], 4800)  # zero-pad short windows to 10 Hz bins
    win = np.hanning(ws.shape[1])
    fs_ = np.fft.rfftfreq(n, 1 / SR)
    ps, pb = [(np.abs(np.fft.rfft(w * win, n=n, axis=1)) ** 2).sum(0) for w in (ws, wb)]
    es = np.array([ps[(fs_ >= fc / 2 ** (1 / 6)) & (fs_ < fc * 2 ** (1 / 6))].sum() for fc in THIRDS]) + 1e-20
    eb = np.array([pb[(fs_ >= fc / 2 ** (1 / 6)) & (fs_ < fc * 2 ** (1 / 6))].sum() for fc in THIRDS]) + 1e-20
    snr = 10 * np.log10(es / eb)
    j = int(np.argmax(es))
    live = es >= es[j] / 100
    k = int(np.argmax(np.where(live, snr, -np.inf)))
    return {"over_bed_kw_db": round(float(kw), 1), "body_band_hz": int(round(THIRDS[j])),
            "over_bed_body_band_db": round(float(snr[j]), 1), "best_band_hz": int(round(THIRDS[k])),
            "over_bed_best_band_db": round(float(snr[k]), 1)}


rows = []
for c in effects:
    s = load(c["file"] if os.path.isabs(c["file"]) else os.path.join(base, c["file"]), SR)
    g = 10 ** (c.get("gain_db", -6) / 20)
    ang = (float(c.get("pan", 0)) + 1) * np.pi / 4
    s = np.vstack([s[0] * np.cos(ang) * np.sqrt(2), s[1] * np.sin(ang) * np.sqrt(2)]) * g
    al = c.get("align", "start")
    mono = np.abs(s).max(0)
    off = int(np.argmax(mono)) if al == "peak" else (int(np.nonzero(mono > mono.max() * 0.1)[0][-1]) if al == "end" else 0)
    i = int(round(c["t"] * SR)) - (off if al in ("peak", "end") else 0)  # where mix_master.py starts the effect
    pk = i + int(np.argmax(mono))                                          # the effect's loudest sample
    half = int((0.015 if c.get("role") in TRANSIENTS else 0.1) * SR)
    rows.append({"frame": c.get("frame"), "role": c.get("role"), "take": c.get("take"), "event": c.get("event"),
                 "gain_db": c.get("gain_db"), "peak_s": round(pk / SR, 4), "window_ms": round(2000 * half / SR),
                 **compare(s, i, pk, half)})
res["cues"] = rows

# ---- spectrograms ----
pngs = []
if not a.no_png:
    def spec(name, ss=None, dur=None, size="1800x600"):
        out = os.path.join(a.out_dir, f"{a.name}.spec-{name}.png")
        cut = [] if ss is None else ["-ss", str(ss), "-t", str(dur)]
        ff(*cut, "-i", a.master, "-lavfi", f"showspectrumpic=s={size}:legend=1:fscale=log:mode=combined:drange=100",
           "-frames:v", "1", out)
        pngs.append(os.path.relpath(out, repo))

    spec("full")
    if a.cut:                                       # the film's zoom windows, where the cut plays them
        for zname, (ss, dur) in ZOOMS.items():
            span = film_to_cut_s(int(round(ss * FPS)), int(round((ss + dur) * FPS)))
            if span:
                spec(zname, round(span[0], 3), round(span[1] - span[0], 3), size="1400x600")
    elif a.name == "web":
        for zname, (ss, dur) in ZOOMS.items():
            spec(zname, ss, dur, size="1400x600")
res["png"] = pngs

res.update({"fails": fails, "warnings": warnings, "notes": notes, "pass": not fails})
with open(os.path.join(a.out_dir, f"{a.name}.checks.json"), "w") as f:
    json.dump(res, f, indent=1, ensure_ascii=False)
summary = {"name": a.name, "pass": not fails, "seconds": res["length"]["seconds"], "lufs": L["integrated_lufs"], "lra": L["lra_lu"],
           "tp": L["true_peak_dbtp"], "aac": res["aac_gate"],
           "aac_tp_160k_192k": [res["aac_160k"]["true_peak_dbtp_full"], res["aac_192k"]["true_peak_dbtp_full"]],
           "mono_loss_db": res["mono"]["lufs_lost_db"],
           "share_150": res["speaker"]["power_share_above_150hz"], "phone_max": res["tags"]["phone_max"],
           "silence_last_54_frames": res["silence"], "dynamics_pass": res["dynamics"]["pass"],
           "dynamics": [[c["check"], c["value"], c["ok"]] for c in res["dynamics"]["checks"]],
           "fails": fails, "warnings": warnings, "notes": notes}
print(json.dumps(summary, ensure_ascii=False))
sys.exit(1 if fails else 0)
