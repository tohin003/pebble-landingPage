import json
import unittest
import zlib

import numpy as np

import synth as S
from synth import core, fills, grid


class TestCore(unittest.TestCase):
    def test_notes_and_chords(self):
        self.assertEqual(core.note("C4"), 60.0)
        self.assertEqual(core.note("A4"), 69.0)
        self.assertEqual(core.note("F#2"), 42.0)
        self.assertEqual(core.note("Bb1"), 34.0)
        self.assertAlmostEqual(core.hz("A4"), 440.0)
        self.assertAlmostEqual(core.hz("D2"), 73.416, places=2)
        self.assertEqual(core.chord("Bm7", 3), [59.0, 62.0, 66.0, 69.0])
        self.assertEqual(core.chord("D(add9)", 3), [50.0, 54.0, 57.0, 64.0])
        self.assertEqual(core.chord("Gmaj7/D", 3)[0], 50.0)             # the slash bass under the chord
        self.assertEqual(core.chord("A7sus4", 2), [45.0, 50.0, 52.0, 55.0])
        with self.assertRaises(ValueError):
            core.chord("Hm7")

    def test_pan_fit_place_fade(self):
        for v in core.pan_gains(0.0):
            self.assertAlmostEqual(v, 1.0)                                  # unity at centre, as mix_master.py pans
        gl, gr = core.pan_gains(-1.0)
        self.assertAlmostEqual(gl * gl + gr * gr, 2.0)
        self.assertEqual(core.fit(np.ones(5), 8).shape, (8,))
        self.assertEqual(core.fit(np.ones((2, 9)), 4).shape, (2, 4))
        buf = np.zeros(10)
        core.place(buf, np.ones(4), -2)
        core.place(buf, np.ones(4), 8)
        self.assertEqual(buf.tolist(), [1, 1, 0, 0, 0, 0, 0, 0, 1, 1])
        y = core.fade(np.ones((2, 1000)), 0.005, 0.005)
        self.assertEqual(float(np.abs(y[:, 0]).max()), 0.0)
        self.assertEqual(float(np.abs(y[:, -1]).max()), 0.0)

    def test_rng_is_stable(self):
        a = core.rng(7, "hats", 806400).standard_normal(4)
        b = core.rng(7, "hats", 806400).standard_normal(4)
        c = core.rng(7, "hats", 806401).standard_normal(4)
        np.testing.assert_array_equal(a, b)
        self.assertFalse(np.array_equal(a, c))
        # string keys go through CRC-32, never Python's per-process hash()
        self.assertEqual(core._seed_word("hats"), zlib.crc32(b"hats"))


class TestGrid(unittest.TestCase):
    def setUp(self):
        self.g = S.Grid.from_beatmap()

    def test_film_grid(self):
        with open(grid.BEATMAP) as f:
            bm = json.load(f)
        g = self.g
        self.assertEqual((g.bpm, g.beats_per_bar, g.fps), (bm["bpm"], bm["beats_per_bar"], bm["fps"]))
        self.assertEqual(g.s(g.sixteenth / g.beat), 7200)                  # a 16th is 7,200 samples at 100 BPM
        self.assertEqual(g.frame_s(1), 1600)                                # a frame is 1,600 samples at 30 fps
        self.assertEqual(g.s(str(bm["reveal"]["bar"])), bm["reveal"]["frame"] * 1600)  # the reveal's bar (the trailer: bar 10, f648)
        self.assertEqual(g.s("f504"), 806400)
        self.assertEqual(g.s((8, 1)), g.s("8.1.1"))
        self.assertAlmostEqual(g.t("16.8s"), 16.8)
        self.assertEqual(g.length(bars=bm["total_bars"]), int(round(bm["duration_s"] * 48000)))
        self.assertEqual(g.length(frames=bm["total_frames"]), 3686400)
        bar, beat = g.where(g.t((9, 3)))
        self.assertEqual(bar, 9)
        self.assertAlmostEqual(beat, 3.0)

    def test_any_tempo(self):
        g = S.Grid(bpm=128.0, beats_per_bar=4)
        self.assertAlmostEqual(g.bar, 1.875)
        self.assertEqual(g.s((2, 1)), 90000)

    def test_swing(self):
        g = self.g.but(swing=0.6)
        self.assertEqual(g.swung(1.0), 1.0)                                 # on-beat units never move
        self.assertAlmostEqual(g.swung(0.25), 0.3)                          # the off 16th at 60 % of the pair
        self.assertAlmostEqual(g.swung(0.75), 0.8)
        b = np.linspace(0, 4, 97)
        self.assertTrue(np.all(np.diff(g.swung(b)) > 0))                    # monotonic

    def test_humanise_is_seeded_and_local(self):
        ev = S.hits("x.x.x.x.x.x.x.x.", self.g)
        a = S.humanise(ev, ms=4, vel=0.1, seed=3, key="h")
        b = S.humanise(ev, ms=4, vel=0.1, seed=3, key="h")
        self.assertEqual([e.t for e in a], [e.t for e in b])
        self.assertTrue(all(abs(x.t - e.t) <= 0.004 + 1e-12 for x, e in zip(a, ev)))
        more = S.humanise(ev + S.hits("..x.", self.g, at=8), ms=4, vel=0.1, seed=3, key="h")
        self.assertEqual([e.t for e in more[:len(ev)]], [e.t for e in a])   # other events change nothing

    def test_hits(self):
        g = self.g
        ev = S.hits("X.x_ o..g 3... r... | f... .... .... ....", g, at="2")
        self.assertEqual([round(e.vel, 2) for e in ev], [1.0, 0.8, 0.5, 0.3, 0.3, 0.75, 0.6, 0.4, 0.85])
        self.assertAlmostEqual(ev[0].t, g.t("2"))
        self.assertAlmostEqual(ev[1].dur, 2 * g.sixteenth)                  # the tie
        self.assertAlmostEqual(ev[6].t - ev[5].t, g.sixteenth / 2)          # the roll
        self.assertAlmostEqual(ev[8].t - ev[7].t, 0.025)                    # the flam
        with self.assertRaises(ValueError):
            S.hits("x... x... | x...", g)                                   # a short bar
        with self.assertRaises(ValueError):
            S.hits("x?..", g)

    def test_seq(self):
        g = self.g
        ev = S.seq("D2 _ . [Bm7] A1~*2 D3+F#3! . 38@0.5", g, step=0.25)
        self.assertEqual([e.note for e in ev][:2], [38.0, tuple(core.chord("Bm7", 3))])
        self.assertAlmostEqual(ev[0].dur, 2 * g.sixteenth)
        self.assertTrue(ev[2].params.get("glide"))
        self.assertAlmostEqual(ev[2].dur, 2 * g.sixteenth)
        self.assertEqual(ev[3].note, (50.0, 54.0))
        self.assertEqual(ev[3].vel, 1.0)
        self.assertEqual((ev[4].note, ev[4].vel), (38.0, 0.5))
        self.assertAlmostEqual(ev[4].t, 8 * g.sixteenth)
        with self.assertRaises(ValueError):
            S.seq("D2 | D2 D2", g, step=1.0)

    def test_arp_progression_fills(self):
        g = self.g
        up = S.arp("Bm", g, beats=1, step=0.25, mode="up")
        self.assertEqual([e.note for e in up], [59.0, 62.0, 66.0, 59.0])
        ud = S.arp([60, 64, 67], g, beats=2, step=0.25, mode="updown")
        self.assertEqual([e.note for e in ud][:6], [60, 64, 67, 64, 60, 64])
        r1 = S.arp([60, 64, 67], g, beats=2, mode="random", seed=4)
        r2 = S.arp([60, 64, 67], g, beats=2, mode="random", seed=4)
        self.assertEqual([e.note for e in r1], [e.note for e in r2])
        pr = S.progression(["Bm", "G"], g, at="9", beats_each=2)
        self.assertEqual(len(pr), 2)
        self.assertAlmostEqual(pr[1].t, g.t((9, 3)))
        roll = fills.accel_roll(g, at="2", beats=4, start_rate=0.5, end_rate=0.0625)
        gaps = np.diff([e.t for e in roll])
        self.assertTrue(np.all(np.diff(gaps) < 1e-9))                       # accelerating
        self.assertTrue(0.4 < gaps[0] / g.beat <= 0.5)
        self.assertLess(roll[-1].t, g.t("3"))
        b = fills.build(g, at="6", bars=2)
        self.assertLess(max(e.t for e in b["snare"]), g.t("8") - g.sixteenth + 1e-9)
        tk = fills.ticking(g, beats=2, step=0.25, tock_every=1)
        self.assertEqual([bool(e.params.get("tock")) for e in tk][:4], [False, True, False, True])
