"""tools/audio/narration.py: the plan's frames, the loudness meter, the WAV writer and the processing. No network, no
Sarvam key and no sound_tags."""
import pathlib
import tempfile
import unittest

import numpy as np
import soundfile as sf

import narration as N

SR = 48000


class TestPlan(unittest.TestCase):
    def test_stem_and_lines(self):
        self.assertEqual(N.SPF, 1600)
        self.assertEqual(N.TOTAL_SAMPLES, 3_686_400)
        self.assertEqual(sum(len(ln["text"].split()) for ln in N.LINES), 17)  # OVERRIDES §38: at most 17 words
        for ln in N.LINES:
            self.assertEqual(ln["start"], ln["card"][0] + 3)                # spoken from 3 frames after the slam
            self.assertLessEqual(ln["deadline"] - ln["start"], 66)          # finished within about 2.2 s
        for _, pace in sum(N.ROUNDS.values(), []):
            self.assertTrue(0.85 <= N.PACE_RANGE[0] <= pace <= N.PACE_RANGE[1] <= 0.95)  # OVERRIDES §38
        for lid in ("n1", "n2", "n3"):
            ln = N.BY_ID[lid]
            self.assertEqual(ln["deadline"], ln["card"][1] - 6)             # before the card's 6-frame blur-out
        self.assertEqual(N.BY_ID["n4"]["deadline"], 1869)                    # T16's pre-roll, FILM_SPEC S8
        self.assertEqual(N.DISCLOSURE, "Narration: an AI voice by Sarvam AI, Bulbul")


class TestLoudness(unittest.TestCase):
    def test_bs1770_reference(self):
        t = np.arange(10 * SR) / SR
        # BS.1770: a 0 dBFS 997 Hz sine in one channel reads -3.01 LKFS, so an amplitude of 0.1 reads -23.01
        self.assertAlmostEqual(N.lufs(0.1 * np.sin(2 * np.pi * 997 * t)), -23.01, delta=0.02)

    def test_a_partial_last_block_never_counts(self):
        x = np.random.default_rng(1).normal(0, 0.05, int(0.857 * SR))
        cut = x.copy()
        cut[int(0.8 * SR):] = 0.0             # 0.80-0.857 s lies in no whole 400 ms block (starts 0, 0.1 ... 0.4 s)
        self.assertEqual(N.lufs(x), N.lufs(cut))
        self.assertEqual(N.lufs(x[: int(0.3 * SR)]), float("-inf"))


class TestWav(unittest.TestCase):
    def test_float_wav_is_exact_and_repeatable(self):
        x = np.random.default_rng(2).uniform(-0.9, 0.9, 4801).astype(np.float32)
        with tempfile.TemporaryDirectory() as td:
            a, b = pathlib.Path(td) / "a.wav", pathlib.Path(td) / "b.wav"
            N.write_float_wav(a, x)
            N.write_float_wav(b, x)
            self.assertEqual(a.read_bytes(), b.read_bytes())
            self.assertNotIn(b"PEAK", a.read_bytes()[:64])
            y, sr = sf.read(str(a), dtype="float32")
            self.assertEqual(sr, SR)
            self.assertEqual(sf.info(str(a)).subtype, "FLOAT")
            np.testing.assert_array_equal(y, x)


class TestProcessing(unittest.TestCase):
    def test_deesser_is_transparent_below_its_threshold(self):
        t = np.arange(SR) / SR
        x = 0.1 * np.sin(2 * np.pi * 1000 * t)
        y, info = N.deess(x, -30.0)
        self.assertEqual(info["gr_max_db"], 0.0)
        self.assertLess(np.max(np.abs(y - x)), 1e-12)

    def test_deesser_turns_a_loud_ess_down_by_at_most_its_limit(self):
        t = np.arange(SR) / SR
        x = 0.3 * np.sin(2 * np.pi * 6500 * t) * (np.abs(t - 0.5) < 0.1)
        y, info = N.deess(x, -30.0)
        self.assertGreater(info["gr_max_db"], 3.0)
        self.assertLessEqual(info["gr_max_db"], N.DEESS["max_gr_db"] + 1e-9)
        self.assertLess(np.max(np.abs(y)), np.max(np.abs(x)))

    def test_a_clip_is_trimmed_levelled_and_faded(self):
        t = np.arange(int(1.6 * SR)) / SR
        # a 1 s tone with 20 ms raised-cosine edges, as a spoken onset and decay are soft (a hard edge would make the
        # zero-phase high pass ring for a few ms either side, and the clip would keep that ringing)
        env = np.clip(np.minimum(t - 0.3, 1.3 - t) / 0.02, 0.0, 1.0)
        x = 0.2 * np.sin(2 * np.pi * 220 * t) * (0.5 - 0.5 * np.cos(np.pi * env))
        y, info = N.process(x, SR)
        self.assertEqual(y[0], 0.0)
        self.assertEqual(y[-1], 0.0)
        self.assertAlmostEqual(N.lufs(y), N.TARGET_LUFS, delta=0.01)
        self.assertLess(len(y) / SR, 1.0 + (N.LEAD_MS + N.TAIL_MS) / 1000 + 0.03)
        self.assertGreater(len(y) / SR, 0.96)
        self.assertEqual(info["lead_short_by_samples"], 0)


if __name__ == "__main__":
    unittest.main()
