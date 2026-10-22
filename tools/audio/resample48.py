"""Resample a decoded WAV to 48 kHz once, with soxr at very high quality, and write 24-bit PCM.

FFmpeg is the only decoder (so MP3 encoder-delay handling is the same everywhere); this script is the only resampler.
Usage: python -I resample48.py IN.wav OUT.wav
"""
import sys

import numpy as np
import soundfile as sf
import soxr

src, dst = sys.argv[1], sys.argv[2]
x, sr = sf.read(src, always_2d=True, dtype="float64")
if sr != 48000:
    x = soxr.resample(x, sr, 48000, quality="VHQ")
peak = float(np.max(np.abs(x))) if x.size else 0.0
if peak > 1.0:  # inter-sample overs from the resampler: never clip silently, scale just under full scale and say so
    x = x / peak * 0.9999
    print(f"note: scaled by {20 * np.log10(0.9999 / peak):.2f} dB to avoid clipping", file=sys.stderr)
sf.write(dst, x, 48000, subtype="PCM_24")
print(f"{dst}: {x.shape[0] / 48000:.3f} s, {x.shape[1]} ch, 48000 Hz, PCM_24 (from {sr} Hz)")
