import unittest

import numpy as np

from synth import core, env, filters, fx, osc

SR = 48000


def worst_alias_db(y, f0):
    """The loudest component that is not a harmonic of f0 (an integer, so 1 s is exactly periodic), below 16 kHz,
    against the fundamental."""
    Y = np.abs(np.fft.rfft(y))
    harm = np.zeros(len(Y), bool)
    harm[np.arange(1, int((SR / 2) // f0) + 1) * f0] = True
    harm[0] = True
    band = (~harm) & (np.arange(len(Y)) < 16000)
    return 20 * np.log10(Y[band].max() / Y[f0] + 1e-15)


class TestOscillators(unittest.TestCase):
    def test_band_limited(self):
        t = np.arange(SR) / SR
        naive = 2 * ((441 * t) % 1.0) - 1
        self.assertGreater(worst_alias_db(naive, 441), -40.0)               # the naive saw aliases
        self.assertLess(worst_alias_db(osc.saw(441.0, SR), 441), -70.0)     # auto 2x
        self.assertLess(worst_alias_db(osc.saw(220.0, SR), 220), -57.0)     # 1x polyBLEP
        self.assertLess(worst_alias_db(osc.saw(1319.0, SR), 1319), -60.0)
        self.assertLess(worst_alias_db(osc.saw(3517.0, SR), 3517), -75.0)   # auto 4x
        self.assertLess(worst_alias_db(osc.square(1319.0, SR), 1319), -60.0)
        self.assertLess(worst_alias_db(osc.triangle(441.0, SR), 441), -85.0)
        self.assertLess(worst_alias_db(osc.pulse(441.0, SR, 0.3), 441), -60.0)

    def test_shapes(self):
        s = osc.saw(100.0, 4800)
        self.assertAlmostEqual(float(s.mean()), 0.0, places=2)
        tri = osc.triangle(100.0, 4800, phase0=0.25)
        np.testing.assert_allclose(tri, np.sin(2 * np.pi * 100 * np.arange(4800) / SR), atol=0.25)
        p = osc.pulse(100.0, 48000, width=0.2)
        self.assertAlmostEqual(float(p.mean()), 0.0, places=2)               # DC removed at any width
        g = osc.saw(np.linspace(40, 4000, 9600), 9600)                      # a glide stays bounded and finite
        self.assertTrue(np.isfinite(g).all() and np.abs(g).max() < 1.2)

    def test_supersaw_and_unison(self):
        a = osc.supersaw(110.0, 4800, rng=core.rng(1))
        b = osc.supersaw(110.0, 4800, rng=core.rng(1))
        np.testing.assert_array_equal(a, b)
        self.assertEqual(a.shape, (2, 4800))
        self.assertGreater(np.corrcoef(a[0], a[1])[0, 1], -0.5)
        self.assertLess(np.corrcoef(a[0], a[1])[0, 1], 0.99)                 # stereo spread
        rms = np.sqrt(np.mean(osc.unison(220.0, 48000, voices=5, rng=core.rng(2)) ** 2))
        self.assertTrue(0.3 < rms < 0.9)

    def test_fm(self):
        np.testing.assert_allclose(osc.fm(440.0, 4800, mods=((1.0, 0.0),)), osc.sine(440.0, 4800), atol=1e-12)
        y = osc.fm(220.0, 48000, mods=((1.0, 2.0),), phase0=0.37)
        self.assertLess(abs(float(y.mean())), 1e-3)                          # 1:1 FM without a DC offset
        hi = osc.fm(1046.5, 48000, mods=((14.0, 1.0),))                      # auto oversampling under Nyquist
        self.assertTrue(np.isfinite(hi).all())

    def test_noise_and_curves(self):
        for c in ("white", "pink", "brown", "blue"):
            x = osc.noise(48000, core.rng(3), c)
            self.assertAlmostEqual(float(np.std(x)), 1.0, places=1)
        f = osc.freq_curve("D2", 4800, glide_from=12, glide_s=0.05)
        self.assertAlmostEqual(f[0], core.hz("D3"), places=3)
        self.assertAlmostEqual(f[-1], core.hz("D2"), places=6)
        self.assertTrue(np.all(np.diff(f) <= 1e-9))


class TestEnvelopes(unittest.TestCase):
    def test_adsr(self):
        e = env.adsr(0.5, 0.01, 0.1, 0.6, 0.2)
        self.assertEqual(len(e), int(0.7 * SR))
        self.assertEqual(e[0], 0.0)
        self.assertEqual(e[-1], 0.0)
        self.assertAlmostEqual(float(e.max()), 1.0, places=6)
        self.assertAlmostEqual(float(e[int(0.4 * SR)]), 0.6, places=6)
        short = env.adsr(0.002, 0.02, 0.1, 0.6, 0.05)                        # released mid-attack
        self.assertLess(float(short.max()), 0.5)
        self.assertEqual(short[-1], 0.0)
        self.assertLess(float(np.abs(np.diff(short)).max()), 0.01)          # no step

    def test_one_shots_and_automation(self):
        p = env.perc(0.3, 0.001, 0.05)
        self.assertEqual((p[0], p[-1]), (0.0, 0.0))
        b = env.breakpoints([(0.0, 0.0), (0.1, 1.0, -3.0), (0.2, 0.5)], 14400)
        self.assertAlmostEqual(float(b[4800]), 1.0)
        self.assertAlmostEqual(float(b[-1]), 0.5)
        self.assertLess(float(b[2400]), 0.5)                                  # c < 0: slow, then fast
        gt = env.gate(4800, 0.05, 0.01)
        self.assertEqual((gt[0], gt[-1]), (1.0, 0.0))
        from synth.grid import Grid
        sg = env.step_gate("x.x.x.x.", Grid(), 48000, step=0.25, floor=0.1)
        self.assertLess(float(np.abs(np.diff(sg)).max()), 0.02)              # its edges are ramps
        self.assertAlmostEqual(float(sg.min()), 0.1)


class TestFilters(unittest.TestCase):
    def test_sweep_matches_fixed(self):
        x = core.rng(5).standard_normal((2, 9000))
        for kind in filters.KINDS:
            a = filters.filt(x, kind, 1200.0, 2.0, 4, gain_db=6.0)
            b = filters.filt(x, kind, np.full(9000, 1200.0), 2.0, 4, gain_db=6.0)
            np.testing.assert_allclose(a, b, atol=1e-9)

    def test_slopes(self):
        def gain(f, kind, fc, poles=2, q=0.7071):
            s = osc.sine(f, SR)
            y = filters.filt(s, kind, fc, q, poles)
            return 20 * np.log10(np.std(y[SR // 2:]) / np.std(s[SR // 2:]))
        self.assertAlmostEqual(gain(1000, "lp", 1000), -3.01, places=1)
        self.assertLess(gain(8000, "lp", 1000), -35)
        self.assertLess(gain(8000, "lp", 1000, 4), -70)
        self.assertLess(gain(125, "hp", 1000, 4), -70)
        self.assertAlmostEqual(gain(1000, "bp", 1000, 2, 4.0), 0.0, places=1)
        lo, hi = filters.crossover(core.rng(6).standard_normal((2, SR)), 150.0)
        x = core.rng(6).standard_normal((2, SR))
        self.assertAlmostEqual(float(np.sum((lo + hi) ** 2) / np.sum(x ** 2)), 1.0, places=2)

    def test_sweep_is_clean(self):
        s = osc.sine(220.0, SR)
        y = filters.filt(s, "lp", 2000 + 1500 * np.sin(2 * np.pi * 3 * np.arange(SR) / SR), 0.7071, 2)
        Y = np.abs(np.fft.rfft(y * np.hanning(SR)))
        self.assertLess(20 * np.log10(Y[2000:].max() / Y.max()), -80)        # no zipper noise


class TestProcessing(unittest.TestCase):
    def test_latency_free(self):
        x = np.zeros((2, SR))
        x[:, 10000] = 0.5
        for y in (fx.brickwall(x, -1.0), fx.limiter(x, -1.0), fx.compressor(x, -10, 4)):
            self.assertEqual(int(np.argmax(np.abs(y[0]))), 10000)

    def test_sidechain(self):
        g = fx.duck_env(SR, [0.5], depth_db=6, attack_ms=2, hold_ms=30, release_ms=150)
        i = int(0.5 * SR)
        self.assertAlmostEqual(float(g[i]), core.amp(-6), places=3)
        self.assertEqual(float(g[i + int(0.19 * SR)]), 1.0)
        self.assertEqual(float(g[0]), 1.0)
        self.assertLess(float(np.abs(np.diff(g)).max()), 0.01)

    def test_space_and_tone(self):
        x = np.zeros((2, SR))
        x[:, 1000] = 1.0
        y = fx.delay(x, 0.1, feedback=0.5, mix=1.0, pingpong=True, hp_hz=None, lp_hz=None)
        self.assertEqual([round(float(y[0, 1000 + 4800 * k]), 3) for k in (1, 3)], [1.0, 0.25])
        self.assertEqual([round(float(y[1, 1000 + 4800 * k]), 3) for k in (2, 4)], [0.5, 0.125])
        r = fx.reverb(x, wet=0.5, dry=0.0, tail_s=1.0)
        self.assertEqual(r.shape, (2, 2 * SR))
        self.assertGreater(float(np.abs(r[:, SR:]).max()), 1e-4)            # the tail was kept
        s = fx.saturate(np.linspace(-1, 1, 101), 3.0)
        self.assertAlmostEqual(float(s[-1]), 1.0)
        w = fx.widen(core.rng(1).standard_normal((2, 100)), 0.0)
        np.testing.assert_allclose(w[0], w[1])
        m = fx.mono_below(core.rng(2).standard_normal((2, SR)), 120.0)
        lo, _ = filters.crossover(m, 60.0)
        self.assertGreater(float(np.corrcoef(lo[0], lo[1])[0, 1]), 0.99)
