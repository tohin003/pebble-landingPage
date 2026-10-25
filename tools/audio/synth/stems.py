"""Stems: 48 kHz stereo float32 WAVs at an exact sample count with clean fades, plus loudness, true peak and a
preview master (the same chain as tools/audio/mix_master.py: a 28 Hz high pass, loudness normalisation, pedalboard's
true-peak BrickwallLimiter).

The film's delivered masters are always made by mix_master.py from these stems (see README.md); master() here is for
auditions and for the classifier checks of a demo.
"""
from __future__ import annotations

import hashlib
import os

import numpy as np
import pyloudnorm as pyln
import soundfile as sf
import soxr

from . import core, fx


def write_stem(path, x, n=None, sr=core.SR, fade_in_ms=2.0, fade_out_ms=10.0, zeros_from=None, peak_limit_db=0.0):
    """Write x as a 48 kHz stereo float32 WAV of exactly n samples (default: its own length): padded with zeros or cut,
    a raised-cosine fade-in from an exact zero and a fade-out to an exact zero, and exact zeros from sample
    `zeros_from` on (when given). Refuses NaN or infinity, and a peak above peak_limit_db (float WAVs would carry it,
    but nothing downstream expects it). Returns the stem's report."""
    y = core.stereo(np.asarray(x, dtype=float))
    n = y.shape[-1] if n is None else int(n)
    y = core.fit(y, n)
    y = core.fade(y, fade_in_ms / 1000.0, fade_out_ms / 1000.0, sr)
    if zeros_from is not None:
        y[:, max(0, int(zeros_from)):] = 0.0
    core.check(y, path)
    pk = core.peak_db(y)
    if pk > peak_limit_db + 1e-9:
        raise ValueError(f"{path}: peaks at {pk:.2f} dBFS, above {peak_limit_db} (lower the bus gain)")
    os.makedirs(os.path.dirname(os.path.abspath(path)) or ".", exist_ok=True)
    sf.write(path, y.T.astype(np.float32), sr, subtype="FLOAT")
    rep = report(y, sr)
    rep.update(path=path, sha256=sha256(path))
    return rep


def read_stem(path, sr=core.SR):
    """A WAV as float64 stereo (2, n) at sr (resampled with soxr when it differs)."""
    x, s = sf.read(path, always_2d=True, dtype="float64")
    if s != sr:
        x = soxr.resample(x, s, sr, quality="VHQ")
    return core.stereo(x.T if x.shape[1] == 2 else x[:, 0])


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def loudness(x, sr=core.SR):
    """Integrated loudness (BS.1770, pyloudnorm), LUFS; None for silence or a clip under 0.4 s."""
    y = core.stereo(np.asarray(x, dtype=float))
    if y.shape[-1] < int(0.4 * sr) or not np.any(y):
        return None
    v = pyln.Meter(sr).integrated_loudness(y.T)
    return None if not np.isfinite(v) else float(v)


def true_peak_db(x, sr=core.SR, factor=4):
    """The true peak, dBTP: the sample peak of a 4 x oversampled copy (soxr, VHQ), one channel at a time in float32
    (a 77 s stereo stem would need 245 MB at once in float64)."""
    y = core.stereo(np.asarray(x, dtype=float))
    pk = 0.0
    for ch in y:
        up = soxr.resample(ch.astype(np.float32), sr, sr * factor, quality="VHQ")
        pk = max(pk, float(up.max()), -float(up.min())) if up.size else pk
    return core.db(pk)


def report(x, sr=core.SR):
    y = core.stereo(np.asarray(x, dtype=float))
    lu = loudness(y, sr)
    return {"samples": int(y.shape[-1]), "seconds": round(y.shape[-1] / sr, 6), "peak_dbfs": round(core.peak_db(y), 2),
            "true_peak_dbtp": round(true_peak_db(y, sr), 2), "lufs": None if lu is None else round(lu, 2)}


def master(x, lufs=-16.0, ceiling_db=-1.7, hp_hz=28.0, sr=core.SR, glue=None):
    """A preview master: high pass, optional glue compression (a dict of fx.compressor arguments), normalised to
    `lufs`, then the true-peak brickwall at ceiling_db. Returns (master, report)."""
    y = fx.eq(x, ("hp", hp_hz), sr=sr) if hp_hz else core.stereo(np.asarray(x, dtype=float))
    if glue:
        y = fx.compressor(y, sr=sr, **glue)
    l0 = loudness(y, sr)
    if l0 is None:
        raise ValueError("master: the mix is silent or shorter than 0.4 s")
    y = y * core.amp(lufs - l0)
    y = fx.brickwall(y, ceiling_db, true_peak=True, sr=sr)
    rep = report(y, sr)
    rep.update(target_lufs=lufs, ceiling_dbtp=ceiling_db, gain_db=round(lufs - l0, 2))
    return y, rep
