"""The narrated twin's voice (OVERRIDES §38 and §39; TRAILER_RESEARCH §6 and its report.music "THE NARRATED TWIN").

Four CLAIMS lines, one synthetic narrator (Sarvam AI's Bulbul: bulbul:v4-flash, speaker simran_en_narration), spoken
only over pebble-free frames of the trailer. The master stays wordless; this voice is for the narrated twin alone.
The tool requests the takes, measures them, picks the cleanest take of each line by the rule in `rank`, processes the
picks and places them in one full-length mono stem.

  plan                          the lines, their frames and the request plan (sends nothing)
  takes --round 1|2 [--pace P] [--lines n1,n3]
                                request takes from Sarvam (two in round 1, a third in round 2; the key: see below)
  measure                       measure every take -> takes.json and a ranking per line (runs sound_tags: heavy)
  build [--pick n1=FILE ...]    process the picks -> the stem, the lines, the report and the cue file (heavy)
  sheets --what takes|lines --out DIR
                                spectrogram sheets for review, one PNG per line (heavy)

Run the heavy commands through scripts/heavy.sh at utility priority, from the repo root after `source scripts/env.sh`:
  scripts/heavy.sh vo-build /usr/sbin/taskpolicy -c utility .work/audio/.venv/bin/python -I tools/audio/narration.py build

The key is read from its file (OVERRIDES §38 names it; its location is never committed, as env.sh keeps local paths
out of git) into an environment variable inside the calling command only:
  SARVAM_API_KEY="$(tr -d '[:space:]' < "$SARVAM_KEY_FILE")" \
    .work/audio/.venv/bin/python -I tools/audio/narration.py takes --round 1
This process removes it from its environment at once, hands it to curl on stdin as a header line (never in argv and
never on disk), scrubs it from anything curl or the server says, and never prints or logs it. Every attempted request
is counted in the ledger (request IDs and settings, never the key); nothing is sent once the ledger holds CAP requests.

Audio is never committed (*.wav is ignored), and the stem and takes are never published on their own: Sarvam's Terms
of Service (2.0, 29 July 2026) §10.2 item 9 bar distributing audio output as isolated files, samples or libraries.
The voice ships only mixed into the narrated twin. The processing is ordinary mastering (a high pass, a de-esser in
5-8 kHz, gain and fades); nothing here filters above 16 kHz or tries to find or remove a provenance signal (§10.2
item 8, §9 item 12).

Frames: 30 fps, 1,600 samples a frame at 48 kHz (tools/audio/beatmap.json); the stem is 2,304 frames, 3,686,400
samples. A line's clip starts on its frame's first sample; a cue's `end` is the first frame after the voice.
"""
from __future__ import annotations

import argparse
import base64
import datetime
import hashlib
import json
import os
import pathlib
import struct
import subprocess
import sys
import tempfile
import time

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
import soxr
from numpy.lib.stride_tricks import sliding_window_view
from scipy import signal

REPO = pathlib.Path(__file__).resolve().parents[2]
OUT = REPO / ".work" / "audio" / "render" / "candidates" / "voice"
TAKES = OUT / "takes"
LEDGER = OUT / "ledger.jsonl"
MEASURED = OUT / "takes.json"
LINES_DIR = OUT / "lines"
STEM = OUT / "vo.wav"
REPORT = OUT / "vo.json"
DOC = REPO / "docs" / "film-narration.json"
SOUND_TAGS = REPO / ".work" / "audio" / "sound_tags"
FFMPEG = os.environ.get("FF", "/opt/homebrew/bin/ffmpeg")

SR, FPS = 48000, 30
SPF = SR // FPS                     # 1,600 samples a frame
TOTAL_FRAMES = 2304
TOTAL_SAMPLES = TOTAL_FRAMES * SPF  # 3,686,400

URL = "https://api.sarvam.ai/text-to-speech"
CAP = 20                            # requests in this ledger, failures included (the lane's budget)
# The research's settings (VOICEOVER_RESEARCH.json sarvam.recommendation): en-IN is Bulbul's only English, 48 kHz WAV
# needs the REST endpoint, and loudness 0.7 is the v4 Flash guide's output gain ("prefer over downstream
# amplification"), which kept the research's test take 4 dB under full scale where default takes clipped.
VOICE = {"model": "bulbul:v4-flash", "speaker": "simran_en_narration", "language_code": "en-IN",
         "speech_sample_rate": SR, "output_audio_codec": "wav", "loudness": 0.7}
ROUNDS = {1: [("t1", 0.90), ("t2", 0.90)], 2: [("t3", 0.85)]}
PACE_RANGE = (0.85, 0.95)           # OVERRIDES §38

# The four lines (17 words, exactly §38's limit). card: the frames the line is the focus on screen [start, end).
# start: the line's first frame, 3 frames after the slam (blueprint, bars 2, 4, 6 and 26-28).
# deadline: the first frame the clip must not reach: the card's last 6 frames (its blur-out) for the questions, and
# the pre-roll of "No telemetry" (f1869, FILM_SPEC S8) for the claims line: 63 and 66 frames, 2.1 s and 2.2 s.
LINES = [
    {"id": "n1", "slug": "what-did-it-change", "text": "What did it change?", "claims": "C-CH-1", "kind": "wh",
     "syllables": 4, "card": [72, 144], "start": 75, "deadline": 138},
    {"id": "n2", "slug": "can-i-undo-it", "text": "Can I undo it?", "claims": "C-CH-1", "kind": "yes-no",
     "syllables": 5, "card": [216, 288], "start": 219, "deadline": 282},
    {"id": "n3", "slug": "did-it-run-the-tests", "text": "Did it run the tests?", "claims": "C-CH-1",
     "kind": "yes-no", "syllables": 5, "card": [360, 432], "start": 363, "deadline": 426},
    {"id": "n4", "slug": "free-and-open-source", "text": "Free and open source.", "claims": "C-CH-12",
     "kind": "statement", "syllables": 5, "card": [1800, 1872], "start": 1803, "deadline": 1869},
]
BY_ID = {ln["id"]: ln for ln in LINES}

# Processing (build). Loudness is measured on the mono file (BS.1770, one channel); mix_master.py loads a mono stem
# as dual mono at unity, which reads 3.01 LU louder.
TARGET_LUFS = -18.0
CEILING_DBTP = -1.5                 # true peak; the brief's limit is -1 dBFS
HP_HZ = 80.0
DEESS = {"band_hz": (5000.0, 8000.0), "ratio": 4.0, "max_gr_db": 8.0, "rms_ms": 4.0, "hold_ms": 1.5,
         "smooth_ms": 3.0, "threshold_vs_lufs_db": -12.0}
LEAD_MS, TAIL_MS = 15.0, 30.0       # kept before the onset (-45 dB) and after the offset (-50 dB)
FADE_IN_MS, FADE_OUT_MS = 5.0, 10.0
DISCLOSURE = "Narration: an AI voice by Sarvam AI, Bulbul"
# The same label without the provider's name, if the lead prefers not to name Sarvam (ToS §11.1, below): §10.2 item 8
# asks for a clear label of synthetic speech, not for the provider's name.
DISCLOSURE_UNNAMED = "Narration: an AI-generated voice"
# Sarvam's Terms of Service, version 2.0, effective 29 July 2026, read at https://www.sarvam.ai/terms-of-service on
# 25 Oct 2026, and its Commercial Licensing page (docs.sarvam.ai/api/getting-started/commercial-licensing).
TERMS = [
    "Commercial use: audio generated on our account while credits are consumed carries the Production License "
    "(Commercial Licensing page; ToS §4.1 'including for commercial purposes'). It covers the output only, not "
    "Sarvam's voices, models or trademarks.",
    "§10.2 item 8: where the law requires it, clearly label synthetic audio that could be mistaken for genuine human "
    "speech; never present AI output as wholly human-generated or as an authentic original recording; never remove, "
    "alter or defeat a watermark, label, disclosure or provenance signal Sarvam applies. §17.6 and §9 item 12 say "
    "the same.",
    "§10.2 item 9: never sell or distribute audio output on a standalone basis (isolated files, audio samples, "
    "sound libraries): the voice ships only mixed into the narrated twin.",
    "Attribution: no clause requires crediting Sarvam (§4.1 leaves attribution to product-specific terms, and none "
    "were found for text-to-speech).",
    "§11.1: Sarvam's trademarks and logos are its IP, not to be displayed or exploited without written permission. "
    "The credit therefore names Sarvam and Bulbul in plain text only, as the factual source of the voice: no logo, "
    "no styling and no suggestion of endorsement.",
]


def die(msg: str, code: int = 1) -> None:
    print(f"narration.py: {msg}", file=sys.stderr)
    sys.exit(code)


def rel(p: pathlib.Path) -> str:
    try:
        return str(p.resolve().relative_to(REPO))
    except ValueError:
        return str(p)


def db(v) -> float:
    return float(20.0 * np.log10(max(float(v), 1e-12)))


def sha256(p: pathlib.Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def write_float_wav(p: pathlib.Path, x: np.ndarray, sr: int = SR) -> None:
    """A mono 32-bit float WAV (format 3: fmt, fact and data chunks), so the same samples always give the same bytes.
    libsndfile (soundfile) adds a PEAK chunk to float files that holds the time of writing, so its hash changed on
    every build of the same audio."""
    data = np.ascontiguousarray(np.asarray(x, dtype="<f4").reshape(-1)).tobytes()
    n = len(data) // 4
    fmt = struct.pack("<HHIIHH", 3, 1, sr, sr * 4, 4, 32)
    body = (b"WAVE" + b"fmt " + struct.pack("<I", len(fmt)) + fmt + b"fact" + struct.pack("<II", 4, n)
            + b"data" + struct.pack("<I", len(data)) + data)
    p.write_bytes(b"RIFF" + struct.pack("<I", len(body)) + body)


def take_name(line: dict, take: str, pace: float) -> str:
    return f"{line['id']}-{line['slug']}-{take}-p{pace:.2f}.wav"


def line_of(name: str) -> dict:
    lid = name.split("-", 1)[0]
    if lid not in BY_ID:
        die(f"{name}: not a take of a known line")
    return BY_ID[lid]


# ----------------------------------------------------------------------------------------------------------- requests

def ledger_rows() -> list:
    if not LEDGER.exists():
        return []
    return [json.loads(s) for s in LEDGER.read_text().splitlines() if s.strip()]


def jobs_for(a) -> list:
    if a.round not in ROUNDS:
        die(f"--round must be one of {sorted(ROUNDS)}")
    wanted = [s.strip() for s in a.lines.split(",")] if a.lines else [ln["id"] for ln in LINES]
    jobs = []
    for lid in wanted:
        line = BY_ID.get(lid) or die(f"unknown line {lid}")
        for take, pace in ROUNDS[a.round]:
            pace = a.pace if a.pace is not None else pace
            if not PACE_RANGE[0] <= pace <= PACE_RANGE[1]:
                die(f"pace {pace} is outside {PACE_RANGE} (OVERRIDES §38)")
            jobs.append({"line": lid, "take": take, "pace": round(pace, 2), "text": line["text"],
                         "file": take_name(line, take, pace)})
    return jobs


def cmd_plan(a) -> int:
    for ln in LINES:
        room = (ln["deadline"] - ln["start"]) / FPS
        print(f"{ln['id']} {ln['text']!r:26} {ln['claims']:8} card f{ln['card'][0]}-{ln['card'][1]}  "
              f"from f{ln['start']} ({ln['start'] / FPS:.2f} s), done before f{ln['deadline']} ({room:.2f} s of room)")
    words = sum(len(ln["text"].split()) for ln in LINES)
    print(f"{words} words (limit 17); voice: {json.dumps(VOICE)}")
    rows = ledger_rows()
    print(f"ledger: {len(rows)} of {CAP} requests used")
    for r in sorted(ROUNDS):
        print(f"round {r}: " + ", ".join(f"{t} at pace {p}" for t, p in ROUNDS[r]) + " for each line")
    return 0


def cmd_takes(a) -> int:
    key = os.environ.pop("SARVAM_API_KEY", "").strip()
    if not key:
        die("no key in SARVAM_API_KEY: read it from its file inside the command (see this file's docstring)")
    child_env = {k: v for k, v in os.environ.items() if k != "SARVAM_API_KEY"}
    scrub = lambda s: (s or "").replace(key, "[key]")  # noqa: E731
    TAKES.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=OUT, prefix=".req-") as td:
        os.chmod(td, 0o700)
        for job in jobs_for(a):
            out = TAKES / job["file"]
            if out.exists():
                print(f"skip (exists): {out.name}")
                continue
            n = len(ledger_rows())
            if n >= CAP:
                print(f"budget reached: {n} requests in the ledger; nothing more is sent")
                return 3
            body = {"text": job["text"], **VOICE, "pace": job["pace"]}
            body_path, resp_path = pathlib.Path(td) / "body.json", pathlib.Path(td) / "resp.json"
            body_path.write_text(json.dumps(body, ensure_ascii=False))
            t0 = time.time()
            cmd = ["/usr/bin/curl", "-sS", "--max-time", "90", "-X", "POST", URL, "-H", "@-",
                   "-H", "Content-Type: application/json", "--data-binary", f"@{body_path}",
                   "-o", str(resp_path), "-w", "%{http_code}"]
            proc = subprocess.run(cmd, input=f"api-subscription-key: {key}\n", capture_output=True, text=True,
                                  env=child_env)
            secs = round(time.time() - t0, 2)
            http = scrub(proc.stdout).strip() or "000"
            entry = {"n": n + 1, "ts": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
                     "line": job["line"], "take": job["take"], "file": out.name, "text": job["text"],
                     "params": {k: v for k, v in body.items() if k != "text"}, "http": http, "secs": secs}
            try:
                payload = json.loads(resp_path.read_text()) if resp_path.exists() else {}
            except (ValueError, UnicodeDecodeError) as exc:
                payload = {"_parse_error": str(exc)[:200]}
            entry["request_id"] = payload.get("request_id") if isinstance(payload, dict) else None
            ok = http == "200" and isinstance(payload, dict) and bool(payload.get("audios"))
            if ok:
                audios = payload["audios"]
                data = base64.b64decode(audios[0])
                if data[:4] == b"RIFF" and data[8:12] == b"WAVE":
                    out.write_bytes(data)
                    entry.update(bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), audios=len(audios))
                else:
                    ok, entry["error"] = False, "the decoded audio is not a RIFF/WAVE file"
            if not ok:
                err = payload.get("error") if isinstance(payload, dict) else None
                entry.setdefault("error", scrub(json.dumps(err)[:400] if err else (proc.stderr.strip()[:300]
                                                                                    or "no audio")))
            with LEDGER.open("a") as f:
                f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            for p in (body_path, resp_path):
                p.unlink(missing_ok=True)
            print(f"#{entry['n']:02d} {http} {secs:>5}s {out.name}" + ("" if ok else f"  ERROR: {entry['error']}"))
            if not ok:
                return 2
            time.sleep(1.2)
    return 0


# -------------------------------------------------------------------------------------------------------- measuring

def read_mono(p: pathlib.Path):
    info = sf.info(str(p))
    x, sr = sf.read(str(p), dtype="float64", always_2d=True)
    return x.mean(axis=1), sr, info


def rms_track(x: np.ndarray, n: int, h: int) -> np.ndarray:
    if len(x) < n:
        x = np.pad(x, (0, n - len(x)))
    w = sliding_window_view(x, n)[::h]
    return 10.0 * np.log10(np.mean(w * w, axis=1) + 1e-24)


# ITU-R BS.1770-4's K-weighting at 48 kHz: the pre-filter (a high shelf) and the RLB high pass.
K_SOS_48K = np.array([[1.53512485958697, -2.69169618940638, 1.19839281085285, 1.0, -1.69065929318241, 0.73248077421585],
                      [1.0, -2.0, 1.0, 1.0, -1.99004745483398, 0.99007225036621]])


def lufs(x: np.ndarray, sr: int = SR) -> float:
    """BS.1770-4 integrated loudness (400 ms blocks every 100 ms, gated at -70 LUFS and -10 LU), over whole blocks
    only, as FFmpeg's ebur128 counts them. pyloudnorm rounds its block count, so on a clip of about a second its last
    block can run past the end, be divided by a full block's length and read low: 'Can I undo it?' (0.86 s) read
    0.5 LU quieter by pyloudnorm than by ebur128, and was normalised that much hotter than the other lines."""
    if sr != 48000:
        return float(pyln.Meter(sr).integrated_loudness(x))
    y = signal.sosfilt(K_SOS_48K, np.asarray(x, dtype=np.float64))
    n, h = int(0.4 * sr), int(0.1 * sr)
    if len(y) < n:
        return float("-inf")
    z = np.mean(sliding_window_view(y, n)[::h] ** 2, axis=1)
    loud = -0.691 + 10.0 * np.log10(np.maximum(z, 1e-20))
    z = z[loud > -70.0]
    if not z.size:
        return float("-inf")
    rel = -0.691 + 10.0 * np.log10(np.mean(z)) - 10.0
    z = z[-0.691 + 10.0 * np.log10(z) > rel]
    return float(-0.691 + 10.0 * np.log10(np.mean(z)))


def true_peak(x: np.ndarray, sr: int = SR) -> float:
    up = soxr.resample(x.astype(np.float32), sr, sr * 4, quality="VHQ")
    return db(np.max(np.abs(up))) if up.size else -240.0


def span(x: np.ndarray, sr: int, on_db: float = 45.0, off_db: float = 50.0):
    """(onset, offset) samples from a 5 ms RMS track (2.5 ms hop): the first frame within on_db of the loudest and
    the end of the last frame within off_db of it."""
    n, h = int(0.005 * sr), int(0.0025 * sr)
    r = rms_track(x, n, h)
    on = np.where(r > r.max() - on_db)[0]
    off = np.where(r > r.max() - off_db)[0]
    return int(on[0] * h), int(min(len(x), off[-1] * h + n))


def band(x: np.ndarray, lo: float, hi: float, sr: int = SR, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, [lo, hi], btype="bandpass", fs=sr, output="sos")
    return signal.sosfiltfilt(sos, x)


def band_env_db(b: np.ndarray, ms: float, sr: int = SR) -> np.ndarray:
    """Centred RMS (Hann-weighted) of a band, dBFS; zero-phase, so it doesn't lag."""
    n = max(3, int(ms * 1e-3 * sr) | 1)
    w = np.hanning(n + 2)[1:-1]
    w /= w.sum()
    return 10.0 * np.log10(np.convolve(b * b, w, mode="same") + 1e-24)


def sibilance(x: np.ndarray, sr: int = SR) -> dict:
    """The 5-8 kHz band against the voice: its loudest 4 ms RMS, against the loudest 100-1000 Hz RMS and against the
    integrated loudness, and how long it stays within 6 dB of its own peak."""
    e = band_env_db(band(x, *DEESS["band_hz"], sr=sr), DEESS["rms_ms"], sr)
    v = band_env_db(band(x, 100.0, 1000.0, sr=sr), DEESS["rms_ms"], sr)
    lu = lufs(x, sr)
    return {"ess_peak_dbfs": round(float(e.max()), 1), "ess_vs_vowel_db": round(float(e.max() - v.max()), 1),
            "ess_vs_lufs_db": round(float(e.max() - lu), 1),
            "ess_hot_ms": round(float(np.sum(e > e.max() - 6.0)) / sr * 1000.0)}


def harsh_segments(x: np.ndarray, sr: int = SR) -> list:
    """20 ms frames within 12 dB of the loudest whose 3-11 kHz energy exceeds their 80-1000 Hz energy (a hiss, breath
    or over-bright consonant at vowel level), merged, kept when >= 60 ms (the research's measure)."""
    n2 = int(0.02 * sr)
    if len(x) < n2:
        return []
    frames = sliding_window_view(x, n2)[::n2 // 2] * np.hanning(n2)
    spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2 + 1e-20
    fb = np.fft.rfftfreq(n2, 1 / sr)
    hf = spec[:, (fb >= 3000) & (fb <= 11000)].sum(axis=1)
    lf = spec[:, (fb >= 80) & (fb <= 1000)].sum(axis=1)
    lvl = 10 * np.log10(np.mean(frames ** 2, axis=1) + 1e-20)
    hot = (lvl >= lvl.max() - 12) & (hf > lf)
    segs, start = [], None
    for i, flag in enumerate(list(hot) + [False]):
        if flag and start is None:
            start = i
        elif not flag and start is not None:
            t0, t1 = start * (n2 // 2) / sr, (i * (n2 // 2) + n2 // 2) / sr
            if t1 - t0 >= 0.06:
                segs.append([round(t0, 2), round(t1, 2)])
            start = None
    return segs


def yin(x: np.ndarray, sr: int, gate_db: float, fmin=70.0, fmax=450.0, win=0.04, hop=0.01, thresh=0.2):
    """YIN f0 (de Cheveigne and Kawahara, 2002): cumulative-mean-normalised difference, absolute threshold, parabolic
    refinement. Unvoiced or quiet frames are NaN."""
    n, h = int(win * sr), int(hop * sr)
    tmin, tmax = int(sr / fmax), int(sr / fmin)
    times, f0 = [], []
    for s0 in range(0, len(x) - n - tmax, h):
        w = x[s0:s0 + n + tmax]
        frame = w[:n]
        times.append((s0 + n / 2) / sr)
        if 10 * np.log10(np.mean(frame ** 2) + 1e-24) < gate_db:
            f0.append(np.nan)
            continue
        d = np.sum((sliding_window_view(w, n)[:tmax + 1] - frame) ** 2, axis=1)
        cm = np.ones_like(d)
        cm[1:] = d[1:] * np.arange(1, tmax + 1) / np.maximum(np.cumsum(d[1:]), 1e-12)
        cand = np.where(cm[tmin:] < thresh)[0]
        if len(cand) == 0:
            f0.append(np.nan)
            continue
        tau = int(cand[0] + tmin)
        while tau + 1 <= tmax and cm[tau + 1] < cm[tau]:
            tau += 1
        shift = 0.0
        if 1 <= tau < tmax:
            p, q, r = cm[tau - 1], cm[tau], cm[tau + 1]
            den = p - 2 * q + r
            shift = 0.5 * (p - r) / den if den else 0.0
        f0.append(sr / (tau + shift))
    t, f = np.array(times), np.array(f0)
    # drop octave slips: frames more than 7 semitones from a 5-frame running median of the voiced frames
    v = np.where(~np.isnan(f))[0]
    if len(v) >= 5:
        med = signal.medfilt(f[v], 5)
        bad = np.abs(12 * np.log2(f[v] / med)) > 7
        f[v[bad]] = np.nan
    return t, f


def pitch(x: np.ndarray, sr: int) -> dict:
    y = signal.resample_poly(x, 1, 3) if sr == 48000 else signal.resample_poly(x, 16000, sr)
    r = rms_track(y, int(0.02 * 16000), int(0.005 * 16000))
    t, f0 = yin(y, 16000, gate_db=max(float(r.max()) - 30.0, -55.0))
    v = ~np.isnan(f0)
    if v.sum() < 5:
        return {"f0_voiced_frames": int(v.sum())}
    fv, tv = f0[v], t[v]
    med = float(np.median(fv))
    k = max(2, int(len(fv) * 0.2))
    p10, p90 = np.percentile(fv, [10, 90])
    # the final movement: the last 100 ms of voicing against the 200 ms before it
    last = tv >= tv[-1] - 0.10
    prev = (tv < tv[-1] - 0.10) & (tv >= tv[-1] - 0.30)
    move = float(12 * np.log2(np.median(fv[last]) / np.median(fv[prev]))) if prev.any() else 0.0
    return {"f0_median_hz": round(med, 1), "f0_p10_p90_hz": [round(float(p10), 1), round(float(p90), 1)],
            "f0_range_st": round(float(12 * np.log2(p90 / p10)), 1),
            "f0_end_vs_median_st": round(float(12 * np.log2(np.median(fv[-k:]) / med)), 1),
            "f0_final_move_st": round(move, 1), "f0_voiced_frames": int(v.sum())}


def classify(x: np.ndarray, sr: int, tmp: pathlib.Path) -> dict:
    """Apple's SoundAnalysis (.work/audio/sound_tags) on the clip padded with silence to 3.2 s: one 3 s window."""
    if not SOUND_TAGS.exists():
        die(f"{rel(SOUND_TAGS)} is missing: build it with tools/audio/mix_checks.sh, or xcrun swiftc as its header says")
    n = max(int(3.2 * sr), len(x) + int(0.2 * sr))
    pad = np.zeros(n, np.float32)
    pad[:len(x)] = x
    p = tmp / "tag.wav"
    sf.write(str(p), pad, sr, subtype="FLOAT")
    try:
        j = json.loads(subprocess.run([str(SOUND_TAGS), str(p)], capture_output=True, text=True, check=True).stdout)
    finally:
        p.unlink(missing_ok=True)
    tags = {t["label"]: t["score"] for t in j.get("tags", [])}
    top = [[t["label"], t["score"]] for t in j.get("tags", [])[:5]]
    floor = min(tags.values()) if tags else 0.0   # a label outside the top 15 scored below the 15th
    def score(lab):
        return tags.get(lab, None)
    return {"top": top, "speech": score("speech"), "whispering": score("whispering"), "sigh": score("sigh"),
            "breathing": score("breathing"), "top15_floor": floor,
            "top3": [t[0] for t in top[:3]]}


def analyse(p: pathlib.Path, line: dict, tmp: pathlib.Path, x=None, sr=None, info=None) -> dict:
    if x is None:
        x, sr, info = read_mono(p)
    r = {"file": p.name, "line": line["id"], "sr": sr, "channels": info.channels if info else 1,
         "subtype": info.subtype if info else "FLOAT", "duration_s": round(len(x) / sr, 3)}
    r["lufs"] = round(lufs(x, sr), 2)
    r["sample_peak_dbfs"] = round(db(np.max(np.abs(x))), 2)
    r["true_peak_dbtp"] = round(true_peak(x, sr), 2)
    r["plr_db"] = round(r["true_peak_dbtp"] - r["lufs"], 1)
    r["clipped_samples"] = int(np.sum(np.abs(x) >= 32767 / 32768))
    on, off = span(x, sr)
    r["onset_ms"], r["offset_ms"] = round(on / sr * 1000), round(off / sr * 1000)
    r["tail_ms"] = round((len(x) - off) / sr * 1000)
    r["speech_span_s"] = round((off - on) / sr, 3)
    e = int(0.002 * sr)
    r["edge_start_dbfs"] = round(db(np.max(np.abs(x[:e]))), 1)
    r["edge_end_dbfs"] = round(db(np.max(np.abs(x[-e:]))), 1)
    # pauses inside the span: >= 120 ms below the 40 dB gate of a 20 ms / 5 ms track
    n, h = int(0.02 * sr), int(0.005 * sr)
    rt = rms_track(x, n, h)
    gate = max(rt.max() - 40.0, -60.0)
    act = np.where(rt > gate)[0]
    pauses, run = [], 0
    for q in rt[act[0]:act[-1] + 1] <= gate:
        if q:
            run += 1
        else:
            if run * h / sr >= 0.12:
                pauses.append(round(run * h / sr * 1000))
            run = 0
    r["internal_pauses_ms"] = pauses
    # exact digital silence (>= 10 ms of zeros) inside the span: a spliced pause
    seg = x[on:off] == 0.0
    zr, run = 0, 0
    for z in seg:
        run = run + 1 if z else 0
        if run == int(0.01 * sr):
            zr += 1
    r["zero_runs_inside"] = zr
    r.update(sibilance(x, sr))
    r["harsh_segments_s"] = harsh_segments(x, sr)
    f, pw = signal.welch(x[on:off], sr, nperseg=4096)
    tot = float(np.sum(pw)) or 1e-20
    r["energy_above_16k_db"] = round(10 * np.log10(max(float(np.sum(pw[f >= 16000])) / tot, 1e-20)), 1)
    r.update(pitch(x[on:off], sr))
    r["syllables_per_s"] = round(line["syllables"] / max(r["speech_span_s"], 1e-3), 2)
    r["classifier"] = classify(x, sr, tmp)
    return r


def gates(r: dict, line: dict) -> dict:
    room = (line["deadline"] - line["start"]) / FPS - (LEAD_MS + TAIL_MS) / 1000.0
    c = r["classifier"]
    sp = c["speech"] or 0.0
    wh = c["whispering"] if c["whispering"] is not None else c["top15_floor"]
    si = c["sigh"] if c["sigh"] is not None else c["top15_floor"]
    return {
        "format": r["sr"] == SR and r["channels"] == 1,
        "fits": r["speech_span_s"] <= room,
        # not cut off while sounding: the last 2 ms sit at least 45 dB under the peak (the research's cut-off takes
        # ended 24-30 dB under it); a take may end right after its decay
        "complete": r["edge_end_dbfs"] - r["sample_peak_dbfs"] <= -45.0,
        "no_clipping": r["clipped_samples"] == 0,
        "speech_label": bool(c["top3"]) and c["top3"][0] == "speech" and sp >= 0.80,
        "no_whisper": wh < 0.10 and "whispering" not in c["top3"],
        "no_sigh": si < 0.20 and "sigh" not in c["top3"],
        "no_splice": r["zero_runs_inside"] == 0,
    }


def penalty(r: dict, line: dict) -> dict:
    """Lower is cleaner. Each term is stated so the ranking can be checked by hand."""
    c = r["classifier"]
    sp = c["speech"] or 0.0
    wh = c["whispering"] if c["whispering"] is not None else c["top15_floor"]
    si = c["sigh"] if c["sigh"] is not None else c["top15_floor"]
    end = r.get("f0_end_vs_median_st", 0.0)
    # the ending that suits the sentence: a statement falls; a yes-no question may rise (curious), and a wh-question
    # may fall or stay level, but a strong rise on it reads as uptalk
    wrong_end = {"statement": end > -1.0, "yes-no": end < -3.0, "wh": end > 4.0}[line["kind"]]
    terms = {
        "sibilance": max(0.0, r["ess_vs_vowel_db"] + 15.0) / 3.0,
        "harsh_segments": 1.0 * len(r["harsh_segments_s"]),
        "classifier": 5.0 * (1.0 - sp) + 20.0 * wh + 10.0 * si,
        "ending": 2.0 if wrong_end else 0.0,
        "pauses": 1.0 * len(r["internal_pauses_ms"]),
        "peaky": max(0.0, r["plr_db"] - 14.0) / 2.0,
        "rate": max(0.0, abs(r["syllables_per_s"] - 3.8) - 0.8),
    }
    terms = {k: round(v, 2) for k, v in terms.items()}
    terms["total"] = round(sum(terms.values()), 2)
    return terms


def rank(rows: list) -> dict:
    out = {}
    for ln in LINES:
        cand = []
        for r in rows:
            if r["line"] != ln["id"]:
                continue
            g = gates(r, ln)
            cand.append({"file": r["file"], "clean": all(g.values()), "failed": [k for k, v in g.items() if not v],
                         "penalty": penalty(r, ln)})
        cand.sort(key=lambda c: (not c["clean"], c["penalty"]["total"]))
        out[ln["id"]] = {"text": ln["text"], "ranking": cand, "pick": cand[0]["file"] if cand else None,
                         "pick_is_clean": bool(cand and cand[0]["clean"])}
    return out


def cmd_measure(a) -> int:
    files = sorted(TAKES.glob("n*.wav"))
    if not files:
        die(f"no takes in {rel(TAKES)}")
    ledger = {r["file"]: r for r in ledger_rows() if r.get("http") == "200"}
    rows = []
    with tempfile.TemporaryDirectory(dir=OUT, prefix=".tmp-") as td:
        for p in files:
            r = analyse(p, line_of(p.name), pathlib.Path(td))
            led = ledger.get(p.name, {})
            r["pace"] = led.get("params", {}).get("pace")
            r["request_id"] = led.get("request_id")
            r["sha256"] = sha256(p)
            rows.append(r)
    ranking = rank(rows)
    MEASURED.write_text(json.dumps({"takes": rows, "ranking": ranking}, indent=1, ensure_ascii=False))
    cols = ("lufs", "true_peak_dbtp", "plr_db", "clipped_samples", "speech_span_s", "tail_ms", "edge_end_dbfs",
            "ess_vs_vowel_db", "ess_vs_lufs_db", "ess_hot_ms", "f0_median_hz", "f0_end_vs_median_st",
            "f0_final_move_st", "syllables_per_s", "internal_pauses_ms", "harsh_segments_s", "energy_above_16k_db")
    for r in rows:
        c = r["classifier"]
        print(r["file"])
        print("   " + "  ".join(f"{k}={r.get(k)}" for k in cols))
        print(f"   classifier: speech={c['speech']} whispering={c['whispering']} sigh={c['sigh']} "
              f"breathing={c['breathing']} top={c['top']}")
    for lid, v in ranking.items():
        print(f"{lid} {v['text']!r}: pick {v['pick']} (clean: {v['pick_is_clean']})")
        for c in v["ranking"]:
            print(f"    {c['file']:44} clean={c['clean']!s:5} failed={c['failed']} penalty={c['penalty']}")
    print(f"wrote {rel(MEASURED)}")
    return 0


# ---------------------------------------------------------------------------------------------------------- building

def fade(n: int, ms: float, sr: int = SR) -> np.ndarray:
    k = max(1, int(round(ms * 1e-3 * sr)))
    return 0.5 - 0.5 * np.cos(np.pi * np.arange(k) / k) if k < n else np.ones(n)


def deess(x: np.ndarray, threshold_dbfs: float, sr: int = SR):
    """Split-band de-esser: the 5-8 kHz band (zero-phase Butterworth, so x - band + band == x exactly) is turned
    down where its centred 4 ms RMS passes the threshold, at the ratio, by at most max_gr_db. The gain curve takes
    the most reduction within +-hold_ms and is smoothed by a centred Hann, so it acts on time with no lag or zipper."""
    b = band(x, *DEESS["band_hz"], sr=sr)
    e = band_env_db(b, DEESS["rms_ms"], sr)
    gr = np.clip((e - threshold_dbfs) * (1.0 - 1.0 / DEESS["ratio"]), 0.0, DEESS["max_gr_db"])
    hold = max(1, int(DEESS["hold_ms"] * 1e-3 * sr))
    gr = np.max(sliding_window_view(np.pad(gr, hold, mode="edge"), 2 * hold + 1), axis=1)
    k = max(3, int(DEESS["smooth_ms"] * 1e-3 * sr) | 1)
    w = np.hanning(k + 2)[1:-1]
    gr = np.convolve(gr, w / w.sum(), mode="same")
    y = (x - b) + b * 10.0 ** (-gr / 20.0)
    active = gr > 0.5
    return y, {"threshold_dbfs": round(threshold_dbfs, 1), "gr_max_db": round(float(gr.max()), 2),
               "gr_ms_over_0_5_db": round(float(active.sum()) / sr * 1000.0),
               "gr_ms_over_3_db": round(float((gr > 3.0).sum()) / sr * 1000.0)}


def process(x: np.ndarray, sr: int) -> tuple:
    """A raw take -> the clip, normalised to TARGET_LUFS (the shared target is applied after, in build)."""
    sos = signal.butter(2, HP_HZ, btype="highpass", fs=sr, output="sos")
    x = signal.sosfiltfilt(sos, x - np.mean(x))
    on, off = span(x, sr)
    a, b = max(0, on - int(LEAD_MS * 1e-3 * sr)), min(len(x), off + int(TAIL_MS * 1e-3 * sr))
    lead_pad = max(0, int(LEAD_MS * 1e-3 * sr) - on)   # a take that starts on its voice keeps no lead: say so
    y = x[a:b].copy()
    if not np.isfinite(lufs(y, sr)):
        die(f"a clip of {len(y) / sr:.3f} s has no measurable loudness (whole 400 ms blocks are needed)")
    g0 = TARGET_LUFS - lufs(y, sr)
    y *= 10.0 ** (g0 / 20.0)
    y, ds = deess(y, TARGET_LUFS + DEESS["threshold_vs_lufs_db"], sr)
    y *= 10.0 ** ((TARGET_LUFS - lufs(y, sr)) / 20.0)
    y[:len(fade(len(y), FADE_IN_MS, sr))] *= fade(len(y), FADE_IN_MS, sr)
    fo = fade(len(y), FADE_OUT_MS, sr)
    y[len(y) - len(fo):] *= fo[::-1]
    on2, off2 = span(y, sr)
    info = {"trim_samples": [a, b], "onset_in_clip": on2, "offset_in_clip": off2, "lead_short_by_samples": lead_pad,
            "pre_gain_db": round(g0, 2), "deess": ds}
    return y, info


def cmd_build(a) -> int:
    meas = json.loads(MEASURED.read_text()) if MEASURED.exists() else die(f"run measure first ({rel(MEASURED)})")
    picks = {lid: v["pick"] for lid, v in meas["ranking"].items()}
    for spec in a.pick or []:
        lid, _, name = spec.partition("=")
        if lid not in BY_ID or not (TAKES / name).exists():
            die(f"--pick {spec}: want n1..n4=<a file in {rel(TAKES)}>")
        picks[lid] = name
    raw = {r["file"]: r for r in meas["takes"]}
    LINES_DIR.mkdir(parents=True, exist_ok=True)
    clips, infos = {}, {}
    for ln in LINES:
        x, sr, _ = read_mono(TAKES / picks[ln["id"]])
        if sr != SR:
            die(f"{picks[ln['id']]}: {sr} Hz, want {SR}")
        clips[ln["id"]], infos[ln["id"]] = process(x, sr)
    # one shared level: TARGET_LUFS, or lower if any clip's true peak would pass the ceiling there
    plr = {k: true_peak(v) - lufs(v) for k, v in clips.items()}
    level = min(TARGET_LUFS, CEILING_DBTP - max(plr.values()))
    stem = np.zeros(TOTAL_SAMPLES, np.float64)
    report_lines, cues, fails = [], [], []
    with tempfile.TemporaryDirectory(dir=OUT, prefix=".tmp-") as td:
        for ln in LINES:
            y = clips[ln["id"]] * 10.0 ** ((level - lufs(clips[ln["id"]])) / 20.0)
            info = infos[ln["id"]]
            s0 = ln["start"] * SPF
            s1 = s0 + len(y)
            if s1 > ln["deadline"] * SPF:
                fails.append(f"{ln['id']}: ends on sample {s1}, past f{ln['deadline']} ({ln['deadline'] * SPF})")
            if np.any(stem[s0:s1]):
                fails.append(f"{ln['id']}: overlaps another line")
            stem[s0:s1] = y
            on, off = s0 + info["onset_in_clip"], s0 + info["offset_in_clip"]
            path = LINES_DIR / f"{ln['id']}-{ln['slug']}.wav"
            write_float_wav(path, y, SR)
            after = analyse(path, ln, pathlib.Path(td), x=y.astype(np.float32).astype(np.float64), sr=SR)
            g = gates(after, ln)
            r0 = raw.get(picks[ln["id"]], {})
            report_lines.append({
                "id": ln["id"], "text": ln["text"], "claims": ln["claims"], "take": picks[ln["id"]],
                "request_id": r0.get("request_id"), "pace": r0.get("pace"), "take_sha256": r0.get("sha256"),
                "clip": {"start_sample": s0, "end_sample": s1, "seconds": round(len(y) / SR, 3),
                         "start_frame": ln["start"], "end_frame_exclusive": -(-s1 // SPF),
                         "deadline_frame": ln["deadline"]},
                "voice": {"onset_sample": on, "offset_sample": off, "onset_s": round(on / SR, 3),
                          "offset_s": round(off / SR, 3), "frames": [on // SPF, -(-off // SPF)],
                          "seconds": round((off - on) / SR, 3)},
                "processing": info, "raw": {k: r0.get(k) for k in ("lufs", "true_peak_dbtp", "clipped_samples",
                                                                  "ess_vs_vowel_db", "ess_vs_lufs_db", "ess_hot_ms",
                                                                  "harsh_segments_s")},
                "after": after, "after_gates": g,
                "file": rel(path), "sha256": sha256(path)})
            if not all(g[k] for k in ("speech_label", "no_whisper", "no_sigh", "no_clipping", "complete")):
                fails.append(f"{ln['id']}: after processing, gates failed: {[k for k, v in g.items() if not v]}")
            if after["true_peak_dbtp"] > -1.0 or after["sample_peak_dbfs"] > -1.0:
                fails.append(f"{ln['id']}: peak {after['sample_peak_dbfs']} dBFS / {after['true_peak_dbtp']} dBTP")
            cues.append({"id": ln["id"], "text": ln["text"], "claims": ln["claims"], "start": on // SPF,
                         "end": -(-off // SPF), "card": ln["card"]})
    stem32 = stem.astype(np.float32)
    write_float_wav(STEM, stem32, SR)
    back, sr_b = sf.read(str(STEM), dtype="float32", always_2d=True)
    if not np.array_equal(back[:, 0], stem32):
        fails.append("the stem does not read back sample for sample")
    nz = np.flatnonzero(back[:, 0])
    inside = np.zeros(TOTAL_SAMPLES, bool)
    for r in report_lines:
        inside[r["clip"]["start_sample"]:r["clip"]["end_sample"]] = True
    stem_info = {"file": rel(STEM), "samples": int(back.shape[0]), "channels": int(back.shape[1]), "sr": int(sr_b),
                 "subtype": sf.info(str(STEM)).subtype, "sha256": sha256(STEM),
                 "peak_dbfs": round(db(np.max(np.abs(back))), 2), "true_peak_dbtp": round(true_peak(back[:, 0]), 2),
                 "nonzero_outside_lines": int(np.sum(~inside[nz])) if nz.size else 0,
                 "first_nonzero_sample": int(nz[0]) if nz.size else None,
                 "last_nonzero_sample": int(nz[-1]) if nz.size else None,
                 "level_lufs_mono": round(level, 2), "level_lufs_dual_mono": round(level + 10 * np.log10(2), 2)}
    if stem_info["samples"] != TOTAL_SAMPLES or stem_info["channels"] != 1 or stem_info["sr"] != SR:
        fails.append(f"stem shape {stem_info['samples']} x {stem_info['channels']} at {stem_info['sr']}")
    if stem_info["nonzero_outside_lines"]:
        fails.append(f"{stem_info['nonzero_outside_lines']} non-zero samples outside the lines")
    lu = [r["after"]["lufs"] for r in report_lines]
    if max(lu) - min(lu) > 0.2:
        fails.append(f"line loudness spread {max(lu) - min(lu):.2f} LU")
    report = {"schema": "pebble-narration-build/1", "built": datetime.datetime.now().astimezone().isoformat(
        timespec="seconds"), "voice": VOICE, "target_lufs_mono": TARGET_LUFS, "ceiling_dbtp": CEILING_DBTP,
        "hp_hz": HP_HZ, "deess": DEESS, "lead_ms": LEAD_MS, "tail_ms": TAIL_MS, "fade_in_ms": FADE_IN_MS,
        "fade_out_ms": FADE_OUT_MS, "stem": stem_info, "lines": report_lines, "fails": fails}
    REPORT.write_text(json.dumps(report, indent=1, ensure_ascii=False))
    if a.doc:
        write_doc(cues, report_lines, stem_info)
    for r in report_lines:
        af = r["after"]
        print(f"{r['id']} {r['text']!r:24} take {r['take']}: clip f{r['clip']['start_frame']}-"
              f"{r['clip']['end_frame_exclusive']} (deadline f{r['clip']['deadline_frame']}), voice "
              f"{r['voice']['onset_s']}-{r['voice']['offset_s']} s ({r['voice']['seconds']} s), "
              f"{af['lufs']} LUFS, {af['sample_peak_dbfs']} dBFS, {af['true_peak_dbtp']} dBTP, de-ess max "
              f"{r['processing']['deess']['gr_max_db']} dB, ess/vowel {r['raw']['ess_vs_vowel_db']} -> "
              f"{af['ess_vs_vowel_db']} dB, speech {af['classifier']['speech']}, whisper "
              f"{af['classifier']['whispering']}, sigh {af['classifier']['sigh']}")
    print(json.dumps(stem_info))
    print("FAILS:\n  " + "\n  ".join(fails) if fails else "all build checks pass")
    return 1 if fails else 0


def write_doc(cues: list, lines: list, stem: dict) -> None:
    doc = {
        "schema": "pebble-film-narration/1",
        "about": ("The narrated twin's voice: four CLAIMS lines spoken by one synthetic narrator over pebble-free "
                  "frames (OVERRIDES §38 and §39; TRAILER_RESEARCH §6, report.music 'THE NARRATED TWIN'). The master "
                  "stays wordless. Written by tools/audio/narration.py build --doc; the frames follow "
                  "tools/audio/beatmap.json (30 fps, 1,600 samples a frame at 48 kHz). The captions lane reads "
                  "`cues`."),
        "film": "the narrated twin of LaunchFilm (at least the 16:9 full film); never the master",
        "fps": FPS, "total_frames": TOTAL_FRAMES,
        "conventions": {
            "start": "the first frame of the voice; the line's audio starts on this frame's first sample",
            "end": "the first frame after the voice (exclusive); seconds = frame / 30",
            "card": ("the frames the line is the focus on screen, [start, end): a question card's whole life (it "
                     "blurs out over its last 6 frames); for n4, from its landing to the next fact's pre-roll (it then "
                     "dims to 45 % and stays until the list leaves at f1998-2004, FILM_SPEC S8)"),
            "captions": ("film-captions.json's rules still hold for a cue made from these: at least 1.2 s (36 "
                         "frames) on screen and at most 3 words a second, so a caption may stay up after the voice "
                         "ends; the spoken words are the card's words"),
        },
        "voice": {"provider": "Sarvam AI", "model": VOICE["model"], "speaker": VOICE["speaker"],
                  "language_code": VOICE["language_code"], "pace": sorted({ln["pace"] for ln in lines}),
                  "loudness": VOICE["loudness"], "sample_rate": SR, "codec": VOICE["output_audio_codec"]},
        "disclosure": {
            "credits": DISCLOSURE,
            "description": DISCLOSURE + ".",
            "unnamed_fallback": DISCLOSURE_UNNAMED,
            "why": ("OVERRIDES §38 asks for the voice to be disclosed as AI-generated in the credits or the "
                    "description, as Sarvam's terms require. The line says the voice is an AI voice and names its "
                    "source, so no viewer can take it for a human narrator or an authentic recording (§10.2 item 8, "
                    "§17.6). Use it in both places, word for word, and never beside a claim that the twin has no "
                    "voiceover (C-FILM-1 describes the wordless master only)."),
            "terms": TERMS,
        },
        "rules": [
            "Never the intent line, Pebble's own voice, a number, Stealth or a line that isn't a CLAIMS row.",
            "Only over pebble-free frames: the three question cards and the 'Free and open source' card.",
            "The music and effects duck 3-6 dB under the voice only; the 'nothing voice-like' classifier gate applies "
            "to the music and effects stems, not to the twin's master.",
            "The stem and the takes are never published on their own (Sarvam ToS §10.2 item 9); raw audio is never "
            "committed.",
        ],
        "stem": {"path": stem["file"], "sample_rate": SR, "channels": 1, "samples": stem["samples"],
                 "format": "WAV, 32-bit float", "level": (f"each line {stem['level_lufs_mono']} LUFS measured mono "
                                                          f"({stem['level_lufs_dual_mono']} as dual mono)")},
        "cues": cues,
    }
    DOC.write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {rel(DOC)}")


# ------------------------------------------------------------------------------------------------------------ sheets

def cmd_sheets(a) -> int:
    out = pathlib.Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    for ln in LINES:
        files = (sorted(TAKES.glob(f"{ln['id']}-*.wav")) if a.what == "takes"
                 else sorted(LINES_DIR.glob(f"{ln['id']}-*.wav")))
        if not files:
            continue
        ins, chain = [], []
        for i, p in enumerate(files):
            ins += ["-i", str(p)]
            chain.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=mono,apad=pad_dur=0.25[a{i}]")
        cat = "".join(f"[a{i}]" for i in range(len(files)))
        fc = ";".join(chain) + f";{cat}concat=n={len(files)}:v=0:a=1,showspectrumpic=s=1200x400:mode=combined:" \
                               "color=intensity:scale=log:fscale=lin:legend=1:stop=12000"
        png = out / f"{a.what}-{ln['id']}.png"
        subprocess.run([FFMPEG, "-v", "error", "-y", *ins, "-filter_complex", fc, str(png)], check=True)
        print(f"{png}: {', '.join(p.name for p in files)}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("plan")
    t = sub.add_parser("takes")
    t.add_argument("--round", type=int, default=1)
    t.add_argument("--pace", type=float)
    t.add_argument("--lines")
    sub.add_parser("measure")
    b = sub.add_parser("build")
    b.add_argument("--pick", action="append", help="n1=<take file name> overrides the ranking's pick")
    b.add_argument("--doc", action="store_true", help=f"also write {rel(DOC)}")
    s = sub.add_parser("sheets")
    s.add_argument("--what", choices=("takes", "lines"), default="takes")
    s.add_argument("--out", required=True)
    a = ap.parse_args()
    return {"plan": cmd_plan, "takes": cmd_takes, "measure": cmd_measure, "build": cmd_build,
            "sheets": cmd_sheets}[a.cmd](a)


if __name__ == "__main__":
    sys.exit(main())
