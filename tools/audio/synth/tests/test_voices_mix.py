import os
import tempfile
import unittest

import numpy as np
import soundfile as sf

import synth as S
from synth import core, presets, stems

SR = 48000
ARGS = {"sub": dict(note="D2", dur=0.3), "bass_808": dict(note="D1", dur=0.3), "pluck_bass": dict(dur=0.2),
        "reese": dict(dur=0.3), "saw_bass": dict(dur=0.2), "supersaw": dict(dur=0.3), "stab": dict(dur=0.15),
        "pad": dict(dur=0.5, attack=0.2, release=0.3), "pluck": dict(dur=0.15), "arp": dict(dur=0.1),
        "lead": dict(dur=0.3), "epiano": dict(dur=0.3), "pulse": dict(dur=0.1), "riser": dict(dur=0.6),
        "riser_pitch": dict(dur=0.6), "shepard": dict(dur=0.6), "downlifter": dict(dur=0.5),
        "reverse_swell": dict(dur=0.5), "whoosh": dict(dur=0.4), "braam": dict(dur=0.8), "crash": dict(decay=0.5),
        "ride": dict(decay=0.4), "trailer_hit": dict(length=1.0), "impact": dict(length=1.0), "kick_808": dict(length=0.6)}


class TestPresets(unittest.TestCase):
    def test_every_preset(self):
        for name in presets.names():
            with self.subTest(preset=name):
                out = presets.get(name)(rng=core.rng(7, name), **ARGS.get(name, {}))
                anchor = 0
                if isinstance(out, tuple):
                    out, anchor = out
                self.assertEqual(out.ndim, 2)
                self.assertEqual(out.shape[0], 2)
                self.assertTrue(np.isfinite(out).all())
                self.assertEqual(float(np.abs(out[:, 0]).max()), 0.0)        # starts on an exact zero
                self.assertEqual(float(np.abs(out[:, -1]).max()), 0.0)       # and ends on one: no click
                self.assertLessEqual(core.peak_db(out), 0.5)
                self.assertGreater(core.peak_db(out), -30.0)
                self.assertTrue(0 <= anchor <= out.shape[1])
                again = presets.get(name)(rng=core.rng(7, name), **ARGS.get(name, {}))
                np.testing.assert_array_equal(out, again[0] if isinstance(again, tuple) else again)

    def test_anchors(self):
        y, a = presets.get("riser")(dur=0.5, rng=core.rng(1))
        self.assertEqual(a, y.shape[1])                                      # a riser ends on its event
        y, a = presets.get("whoosh")(dur=0.5, rng=core.rng(1))
        self.assertTrue(0 < a < y.shape[1])
        self.assertLess(abs(int(np.argmax(np.abs(y).max(axis=0))) - a), 4800)   # its loudest point near the anchor

    def test_kick_falls_and_variants(self):
        k = S.get("kick")(rng=core.rng(1))[0]
        zc = lambda x: np.count_nonzero(np.diff(np.signbit(x)))  # noqa: E731
        self.assertGreater(zc(k[:2400]), zc(k[9600:12000]))                 # the pitch glides down
        hard = S.get("kick", drive=3.0)
        self.assertEqual(hard.defaults, {"drive": 3.0})
        with self.assertRaises(TypeError):
            S.get("kick", no_such_param=1)


class TestMix(unittest.TestCase):
    def session(self, seed=7):
        g = S.Grid.from_beatmap()
        s = S.Session(g, bars=1, seed=seed)
        s.track("kick", "kick", S.hits("X...x...X...x...", g), bus="drive", gain_db=-6)
        s.track("hat", "hat", S.hits("x.x.x.x.x.x.x.x.", g), bus="drive", gain_db=-10, pan=0.2)
        s.track("bass", "sub", S.seq("D2*8 A1~*8", g), bus="drive", gain_db=-8, mono=True,
                duck=dict(by="kick", depth_db=6))
        s.track("chord", "stab", S.progression(["Bm"], g, beats_each=1, octave=4), bus="music", gain_db=-6)
        s.track("riser", "riser", [S.Event(g.t("2"), 1.2, 0.8)], bus="fx", gain_db=-10)
        s.bus("music", fx=lambda x: S.fx.reverb(x, 0.5, wet=0.2))
        return s

    def test_exact_and_deterministic(self):
        a, b = self.session().stems(), self.session().stems()
        self.assertEqual(sorted(a), ["drive", "fx", "music"])
        for k in a:
            self.assertEqual(a[k].shape, (2, 115200))
            np.testing.assert_array_equal(a[k], b[k])
        c = self.session(seed=8).stems()
        self.assertFalse(np.array_equal(a["drive"], c["drive"]))              # the seed reaches the noise
        self.assertGreater(float(np.abs(a["fx"][:, -1200:]).max()), 0.0)      # the riser arrives on bar 2

    def test_mono_line_glides(self):
        g = S.Grid.from_beatmap()
        ev = S.seq("D2*4 A1~*4", g)
        y = S.render_mono(ev, "sub", SR, seed=1)
        i = g.s(1.0)
        env_ = np.abs(y[0])
        k = 480
        frames = env_[: (len(env_) // k) * k].reshape(-1, k).max(axis=1)
        j = i // k
        self.assertGreater(frames[j], 0.5 * frames[j - 3])                  # no retrigger dip at the legato join

    def test_write_stem(self):
        with tempfile.TemporaryDirectory() as td:
            p = os.path.join(td, "s.wav")
            rep = stems.write_stem(p, core.rng(1).standard_normal((2, 1000)) * 0.1, n=4800)
            x, sr = sf.read(p, always_2d=True)
            info = sf.info(p)
            self.assertEqual((x.shape, sr, info.subtype), ((4800, 2), 48000, "FLOAT"))
            self.assertEqual(float(np.abs(x[0]).max()), 0.0)
            self.assertEqual(float(np.abs(x[-1]).max()), 0.0)
            self.assertEqual(rep["samples"], 4800)
            with self.assertRaises(FloatingPointError):
                stems.write_stem(p, np.full((2, 100), np.nan))
            with self.assertRaises(ValueError):
                stems.write_stem(p, np.full((2, 100), 2.0), fade_in_ms=0, fade_out_ms=0)
            s = self.session()
            rep = s.write(td, prefix="t_", master=dict(lufs=-16.0, ceiling_db=-1.7))
            self.assertEqual(rep["stems"]["drive"]["samples"], 115200)
            self.assertAlmostEqual(rep["master"]["lufs"], -16.0, delta=0.3)
            self.assertLessEqual(rep["master"]["true_peak_dbtp"], -1.5)
            self.assertTrue(os.path.exists(os.path.join(td, "t_mix.wav")))
