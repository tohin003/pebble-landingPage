"""score2 lane: cue windows, transition points and the cross-track compatibility table for the film's multi-cue score
(OVERRIDES §51), from the per-track maps that measure_track.py wrote. Reads JSON and small NPZ curves only; no audio.

Usage: python -I cue_windows.py WORK_DIR    (WORK_DIR = .work/score2; writes WORK_DIR/MUSIC_MAP.json and strips specs)

Scene types (TREATMENT §3.4-3.9, §3.12; reference lengths from the §3.5 beat sheet):
  intimate_open    Act I (S01-S05, 19.5 s): soft and sparse, sound on frame 1, an accent 3.5-5.5 s in, bars that lead on
  tension_build    the bars into an entrance (4-8 bars), rising, ending on the entrance's downbeat
  drop_entrance    the Drop (S06-S07, 7.5 s): a step of +3 LU or more on a downbeat, heard as an arrival, held after it
  ring_groove      the rings and cascades (S08-S19, 33 + 29.5 s): a sustained drive with a clear pulse, no breakdown
  the_wall         the pull-back to the wall (S25 start): the densest, widest, fullest 2-4 bars
  quiet_dusk       the Stealth passage (S20-S22, 14.5 s): a real quiet section, 6 LU or more under the drive, sparse
  climax_peak      S23-S24 (11.5 s): a build into the peak's first strong downbeat (the kept card lands there), held
  convergence      S25 (3 s): 1-2 bars rising into a strong downbeat (the title's)
  title            S26 (4 s): a strong downbeat that rings, harmonically settled
  end_decay        S27-S28 (12.5 s): the track's real ending: a last strong note, then its decay (never a fade)
Scores are heuristics on measured numbers [I]; every window lists the numbers behind it. A person listens before use.
"""
import json
import os
import sys

import numpy as np

W = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".work", "score2")
TRACKS = {
    "Starfire": ("A1", "Starfire", "Scott Buckley", "scottbuckley.com.au", "CC BY 4.0"),
    "Convergence": ("A2", "Convergence", "Scott Buckley", "scottbuckley.com.au", "CC BY 4.0"),
    "Aphelion": ("A3", "Aphelion", "Scott Buckley", "scottbuckley.com.au", "CC BY 4.0"),
    "BornOfTheSky": ("A4", "Born Of The Sky", "Scott Buckley", "scottbuckley.com.au", "CC BY 4.0"),
    "Wildflowers": ("A5", "Wildflowers", "Scott Buckley", "scottbuckley.com.au", "CC BY 4.0"),
    "MaskingTheMasters": ("B1", "Masking the Masters", "Eugenio Mininni", "Mixkit", "Mixkit Stock Music Free License"),
    "YourBreath": ("B2", "Your Breath", "Eugenio Mininni", "Mixkit", "Mixkit Stock Music Free License"),
    "AtomsInPeace": ("B3", "Atoms in Peace", "Alejandro Magaña", "Mixkit", "Mixkit Stock Music Free License"),
    "TechnoFestVibes": ("B4", "Techno Fest Vibes", "Alejandro Magaña", "Mixkit", "Mixkit Stock Music Free License"),
}
RULES_A = ["edits allowed (trim, splice, reorder, layer) with credit",
           "credit: '<Title>' by Scott Buckley (edited) - CC BY 4.0 - www.scottbuckley.com.au (OVERRIDES §51)",
           "never submit to Content ID or any fingerprinting service"]
RULES_B = ["a cue is an edited excerpt in its own order: trim, fade, shorten at bar lines (OVERRIDES §51)", "never reorder its sections into a new arrangement",
           "never layer it with other music beyond a short, standard cue transition",
           "never export or deliver a music-only file containing it: previews are VIDEO; working WAVs stay in .work",
           "never register with Content ID; not for broadcast"]
SCENES = ["intimate_open", "tension_build", "drop_entrance", "ring_groove", "the_wall", "quiet_dusk", "climax_peak",
          "convergence", "title", "end_decay"]


def r(v, d=2):
    return None if v is None or not np.isfinite(v) else round(float(v), d)


class Track:
    def __init__(self, name):
        self.name = name
        self.m = json.load(open(f"{W}/maps/{name}.map.json"))
        c = np.load(f"{W}/curves/{name}.npz")
        self.c = {k: c[k] for k in c.files}
        m = self.m
        self.down = np.array(m["downbeats_s"])
        self.beats = np.array(m["beats_s"])
        self.P = m["tempo"]["grid_period_s"]
        self.bars = m["bar_table"]
        self.BL = np.array([b["lufs"] if b["lufs"] is not None else -70 for b in self.bars])
        self.drive = m["loudness"]["drive_level_lufs"]
        self.peak = m["loudness"]["peak_level_lufs"]
        self.lt, self.mom, self.st = self.c["lt"], self.c["mom"], self.c["st"]
        self.ot, self.oenv = self.c["ot"], self.c["oenv"]
        self.o99 = float(np.percentile(self.oenv, 99))
        self.dur = m["duration_s"]
        e = m["ending"]
        self.final_hit = e.get("t_last_strong_onset")
        self.last_sound = e.get("t_last_sound")
        self.mixkit = TRACKS[name][3] == "Mixkit"

    # ---- measurements on a span
    def integ(self, a, b):
        msk = (self.lt >= a + 0.2) & (self.lt <= b - 0.2)
        if msk.sum() < 2:
            return None
        e = 10 ** ((self.mom[msk] + 0.691) / 10)
        lj = self.mom[msk]
        g = lj >= -70
        if not g.any():
            return -70.0
        rel = -0.691 + 10 * np.log10(e[g].mean()) - 10
        g2 = g & (lj > rel)
        return float(-0.691 + 10 * np.log10(e[g2].mean()))

    def st_range(self, a, b):
        msk = (self.lt >= a) & (self.lt <= b)
        return (float(self.st[msk].min()), float(self.st[msk].max())) if msk.any() else (None, None)

    def bar_idx(self, t):
        return int(np.argmin(np.abs(self.down - t)))

    def bars_between(self, a, b):
        return [k for k in range(len(self.bars)) if self.bars[k]["start"] >= a - 0.05 and self.bars[k]["end"] <= b + 0.05]

    def mean_bar(self, a, b, key):
        ks = self.bars_between(a, b)
        v = [self.bars[k][key] for k in ks if self.bars[k][key] is not None]
        return float(np.mean(v)) if v else None

    def hit(self, t, w=0.04):
        msk = (self.ot >= t - w) & (self.ot <= t + w)
        return float(self.oenv[msk].max() / self.o99) if msk.any() else 0.0

    def mom_at(self, a, b, f=np.min):
        msk = (self.lt >= a) & (self.lt <= b)
        return float(f(self.mom[msk])) if msk.any() else None

    def strong_pons(self, a, b, frac=0.25):
        """Percussive onsets in [a, b) whose percussive flux is at least frac of the track's 99th percentile."""
        pf, tt = self.c["pflux"], self.c["stt"]
        thr = frac * float(np.percentile(pf, 99))
        out = []
        for p in self.c["pons"]:
            if a <= p < b:
                j = int(np.argmin(np.abs(tt - p)))
                if pf[max(0, j - 1):j + 2].max() >= thr:
                    out.append(float(p))
        return out

    def phrase_bonus(self, a, b, w_start=0.8, w_end=0.4):
        """Windows that start (and end) where the music itself starts a phrase: a section boundary or a strong change."""
        pts = [x["start_s"] for x in self.m["sections"]] + [c["t"] for c in self.m["change_points"] if c["strength"] >= 0.9]
        bo = w_start if any(abs(a - p_) < 0.12 for p_ in pts) else 0.0
        bo += w_end if any(abs(b - p_) < 0.12 for p_ in pts) else 0.0
        return bo

    def bar_len(self):
        return float(np.median(np.diff(self.down)))

    def window(self, a, b, scene, score, why, extra=None):
        lo, hi = self.st_range(a, b)
        d = {"scene": scene, "start_s": r(a, 3), "end_s": r(b, 3), "length_s": r(b - a, 2),
             "start_bar": self.bar_idx(a), "end_bar": self.bar_idx(b) if b < self.down[-1] + 0.05 else len(self.down),
             "bars": r((b - a) / self.bar_len(), 1), "lufs": r(self.integ(a, b), 1), "st_min": r(lo, 1),
             "st_max": r(hi, 1), "perc_share": r(self.mean_bar(a, b, "perc"), 3),
             "onsets_per_beat": r(self.mean_bar(a, b, "perc_onsets_per_beat"), 2),
             "low_share": r(self.mean_bar(a, b, "low"), 3), "centroid_hz": r(self.mean_bar(a, b, "centroid"), 0),
             "score": r(score, 2), "why": why}
        if self.mixkit:
            d["licence_note"] = "Mixkit: play this span as one contiguous excerpt in its own order (trim/fade/shorten at bar lines only)"
        if extra:
            d.update(extra)
        return d


def lvl_step(T, t, bars=2):
    bl = T.bar_len()
    a = T.integ(t - bars * bl, t)
    b = T.integ(t, t + bars * bl)
    return (b - a) if a is not None and b is not None else None, a, b


def pre_gap(T, t):
    """How far the momentary loudness dips in the beat before t, against the bar before that (a stop or breath)."""
    bl = T.bar_len()
    ref = T.integ(t - bl - T.P, t - T.P)
    dip = T.mom_at(t - T.P, t - 0.05)
    return (ref - dip) if ref is not None and dip is not None else 0.0


def candidates(T):
    """Downbeats plus the measured change points (which may fall on another beat of the bar)."""
    pts = [(float(d), "downbeat") for d in T.down]
    for c in T.m["change_points"]:
        if all(abs(c["t"] - p) > 0.05 for p, _ in pts):
            pts.append((float(c["t"]), f"change point (beat {c['pos_in_bar'] + 1} of the bar)"))
    music_end = T.final_hit if T.final_hit else T.dur
    return sorted(p for p in pts if 0.0 <= p[0] < music_end + 0.1)


def top(ws, n=3, min_gap=None):
    ws = sorted(ws, key=lambda w: -w["score"])
    out = []
    for w in ws:
        if all(abs(w["start_s"] - o["start_s"]) > (min_gap or 4.0) for o in out):
            out.append(w)
        if len(out) == n:
            break
    return out


# ---------------------------------------------------------------------------------------------------------- scenes
def scene_windows(T):
    bl = T.bar_len()
    cands = candidates(T)
    music_end = T.final_hit if T.final_hit else T.dur
    res = {s: [] for s in SCENES}
    steps = {}
    for t, kind in cands:
        s_, a_, b_ = lvl_step(T, t)
        steps[t] = (s_, a_, b_, kind)
    # an entrance is a step up from music, never the music starting from silence
    entrances = [t for t, (s_, a_, b_, k) in steps.items() if s_ is not None and s_ >= 3.0 and b_ is not None
                 and a_ is not None and a_ > -40 and T.mom_at(t - 2 * bl, t, np.min) is not None and T.mom_at(t - 2 * bl, t, np.min) > -50]

    # intimate open
    for t, kind in cands:
        for nb in range(max(4, int(round(12 / bl))), int(round(24 / bl)) + 1):
            e = t + nb * bl
            if e > music_end:
                break
            L = T.integ(t, e)
            if L is None:
                continue
            first = T.mom_at(t, t + 0.5, np.max)
            if first is None or first < L - 12:
                continue  # no sound on frame 1
            if any(t - 0.05 < x < e - 0.05 for x in entrances):
                continue  # an open ends on an entrance; it never starts on or swallows one
            lo_, hi_ = T.st_range(t, e)
            if hi_ - lo_ > 9:
                continue  # one character: no big structural change inside
            perc = T.mean_bar(t, e, "perc") or 0
            dens = T.mean_bar(t, e, "perc_onsets_per_beat") or 0
            soft = np.clip((T.drive - L) / 8, 0, 1)
            sparse = np.clip(1 - perc / 0.45, 0, 1) * 0.5 + np.clip(1 - dens / 1.5, 0, 1) * 0.5
            if T.drive - L < 4 and not (perc <= 0.2 and dens <= 0.6):
                continue  # neither soft (4 LU under the drive) nor sparse: not an intimate open
            l0, l1 = T.integ(t, t + 2 * bl), T.integ(e - 2 * bl, e)
            rise = np.clip(((l1 or L) - (l0 or L)) / 6, -0.5, 1)
            acc_m = (T.ot >= t + 3.5) & (T.ot <= t + 5.5)
            win_m = (T.ot >= t) & (T.ot <= e)
            acc = float(T.oenv[acc_m].max() / max(float(np.percentile(T.oenv[win_m], 95)), 0.05 * T.o99)) if acc_m.any() else 0
            accent = 1.0 if acc >= 1.0 else 0.5 if acc >= 0.8 else 0.0
            follows = any(0 <= x - e <= 2 * bl + 0.05 for x in entrances)
            fit = 1 - min(1, abs((e - t) - 19.5) / 10)
            sc = 2 * soft + 1.5 * sparse + rise + accent + (1.0 if follows else 0) + 0.5 * fit + T.phrase_bonus(t, e, 0.4, 0.4)
            why = (f"{L:.1f} LUFS, {T.drive - L:.1f} LU under the drive; percussive share {perc:.2f}, {dens:.2f} onsets/beat; "
                   f"{'rises' if rise > 0 else 'falls'} {abs((l1 or L) - (l0 or L)):.1f} LU first to last 2 bars; accent 3.5-5.5 s in: "
                   f"{'yes' if accent == 1 else 'soft' if accent else 'no'} ({acc:.2f} of the window's p95 onset)"
                   + ("; an entrance follows within 2 bars, so Act I can run into the Drop in this track" if follows else ""))
            res["intimate_open"].append(T.window(t, e, "intimate_open", sc, why, {"starts_on": kind}))

    # tension build: 4-8 bars ending on an entrance
    for x in entrances:
        s_, a_, b_, k = steps[x]
        for nb in (4, 6, 8):
            t = x - nb * bl
            if t < 0:
                continue
            l0, l1 = T.integ(t, t + bl), T.integ(x - bl, x)
            if l0 is None or l1 is None or l1 - l0 < 1.0:
                continue  # a build rises
            bls = [T.integ(t + i * bl, t + (i + 1) * bl) for i in range(nb)]
            bls = [v for v in bls if v is not None]
            mono = float(np.mean(np.diff(bls) > -0.5)) if len(bls) > 2 else 0
            d0 = T.mean_bar(t, t + 2 * bl, "perc_onsets_per_beat") or 0
            d1 = T.mean_bar(x - 2 * bl, x, "perc_onsets_per_beat") or 0
            sc = np.clip((l1 - l0) / 8, -0.5, 1) * 2 + mono + np.clip((d1 - d0) / 1.0, -0.5, 1) + np.clip(s_ / 8, 0, 1) * 1.5
            why = (f"rises {l1 - l0:+.1f} LU over {nb} bars ({l0:.1f} to {l1:.1f} LUFS bar averages), {mono:.0%} of bar steps "
                   f"not falling; density {d0:.2f} to {d1:.2f} onsets/beat; ends on an entrance of {s_:+.1f} LU at {x:.2f} s")
            res["tension_build"].append(T.window(t, x, "tension_build", sc, why, {"entrance_s": r(x, 3)}))

    # drop entrance
    for x in entrances:
        s_, a_, b_, k = steps[x]
        hold = T.integ(x, x + 4 * bl)
        after_min = min([v for v in (T.integ(x + i * bl, x + (i + 1) * bl) for i in range(4)) if v is not None] or [b_])
        held = (after_min >= b_ - 3) if b_ is not None else False
        h = T.hit(x)
        lo0, lo1 = T.mean_bar(x - 2 * bl, x, "low") or 0, T.mean_bar(x, x + 2 * bl, "low") or 0
        p0, p1 = T.mean_bar(x - 2 * bl, x, "perc") or 0, T.mean_bar(x, x + 2 * bl, "perc") or 0
        gap = pre_gap(T, x)
        sc = (np.clip(s_ / 10, 0, 1.2) * 3 + np.clip(h, 0, 1.5) + np.clip((lo1 - lo0) / 0.3, -0.5, 1) * 0.7
              + np.clip((p1 - p0) / 0.15, -0.5, 1) * 0.5 + (0.7 if gap >= 4 else 0.3 if gap >= 2 else 0) + (0.8 if held else -0.5))
        why = (f"{s_:+.1f} LU step at {x:.2f} s ({k}): {a_:.1f} to {b_:.1f} LUFS (2 bars each side); onset at the downbeat "
               f"{h:.2f} of the track's p99; low-end share {lo0:.2f} to {lo1:.2f}, percussive {p0:.2f} to {p1:.2f}; "
               f"pre-entrance dip {gap:.1f} LU; next 4 bars {'hold' if held else 'do not hold'} (lowest bar {after_min:.1f} LUFS)")
        res["drop_entrance"].append(T.window(max(0, x - 2 * bl), x + 4 * bl, "drop_entrance", sc, why,
                                             {"entrance_s": r(x, 3), "step_lu": r(s_, 1), "level_after_lufs": r(hold, 1)}))

    # ring groove: 16-bar windows, and the longest unbroken runs
    for i, (t, kind) in enumerate(cands):
        for nb, tag in ((int(round(33 / bl)), "rings 1-2 + cascades 1-2 (33 s)"), (int(round(29.5 / bl)), "rings 3-4 + cascades 3-4 (29.5 s)"),
                        (int(round(62.5 / bl)), "all four rings (62.5 s)")):
            e = t + nb * bl
            if e > music_end:
                continue
            ks = T.bars_between(t, e)
            if len(ks) < nb * 0.8:
                continue
            bls = np.array([T.BL[k] for k in ks])
            L = T.integ(t, e)
            sal = [w["beat_salience"] for w in T.m["tempo"]["local_10s"] if w["beat_salience"] and t <= w["t0"] < e]
            sal = float(np.mean(sal)) if sal else 1.0
            dens = T.mean_bar(t, e, "perc_onsets_per_beat") or 0
            perc = T.mean_bar(t, e, "perc") or 0
            drive = np.clip(1 - (T.peak - L) / 6, 0, 1)
            steady = np.clip(1 - (bls.std() - 0.5) / 2.5, 0, 1)
            nobreak = 1.0 if bls.min() >= L - 4 else 0.0
            pulse = np.clip((sal - 1.1) / 0.9, 0, 1)
            sc = (2 * drive + 1.5 * steady + 2 * nobreak + 1.5 * pulse + np.clip(dens / 1.5, 0, 1) + np.clip(perc / 0.35, 0, 1) * 0.5
                  + T.phrase_bonus(t, e))
            lifts = [c for c in T.m["change_points"] if t + 2 * bl < c["t"] < e - 2 * bl and (c["loud_step_lu"] or 0) >= 1.5]
            why = (f"{L:.1f} LUFS ({T.peak - L:.1f} LU under the track's peak level); bar loudness spread {bls.std():.1f} LU, "
                   f"quietest bar {bls.min():.1f}; beat salience {sal:.2f}; {dens:.2f} percussive onsets/beat, percussive share {perc:.2f}"
                   + (f"; an upward change inside at {lifts[0]['t']:.2f} s ({lifts[0]['loud_step_lu']:+.1f} LU) can carry Ring 3's lift" if lifts else "")
                   + ("; starts on the music's own phrase line" if T.phrase_bonus(t, e, 1, 0) else ""))
            res["ring_groove"].append(T.window(t, e, "ring_groove", sc, why, {"fits": tag, "lift_inside_s": r(lifts[0]["t"], 3) if lifts else None}))

    # the wall: 2-4 densest, widest bars
    for k in range(len(T.bars) - 2):
        for nb in (2, 4):
            if k + nb > len(T.bars):
                continue
            t, e = T.bars[k]["start"], T.bars[k + nb - 1]["end"]
            if e > music_end:
                continue
            L = T.integ(t, e)
            if L is None:
                continue
            wd = np.mean([T.bars[j]["width_db"] for j in range(k, k + nb)])
            air = np.mean([T.bars[j]["air"] for j in range(k, k + nb)])
            fl = np.mean([T.bars[j]["flat"] or 0 for j in range(k, k + nb)])
            dens = np.mean([T.bars[j]["perc_onsets_per_beat"] for j in range(k, k + nb)])
            sc = 2 * np.clip(1 - (T.peak - L) / 4, 0, 1) + np.clip((wd + 15) / 12, 0, 1) + np.clip(air / 0.08, 0, 1) + np.clip(fl / 0.05, 0, 1) * 0.5 + np.clip(dens / 1.5, 0, 1) * 0.5
            why = (f"{L:.1f} LUFS ({T.peak - L:.1f} LU under the peak level); width {wd:.1f} dB side/mid, air (>5 kHz) share {air:.3f}, "
                   f"flatness {fl:.3f}, {dens:.2f} onsets/beat")
            res["the_wall"].append(T.window(t, e, "the_wall", sc, why))

    # quiet dusk
    for t, kind in cands:
        for nb in range(int(np.ceil(14.5 / bl)), int(np.ceil(20 / bl)) + 1):
            e = t + nb * bl
            if e > music_end:
                continue
            L = T.integ(t, e)
            if L is None:
                continue
            lo, hi = T.st_range(t, e)
            perc = T.mean_bar(t, e, "perc") or 0
            dens = T.mean_bar(t, e, "perc_onsets_per_beat") or 0
            under = T.drive - L
            if under < 4 or any(t - 0.05 < x < e - 0.05 for x in entrances) or hi - lo > 9:
                continue  # a quiet passage holds: no entrance on or inside it, no big change inside
            nxt = T.integ(e, e + 4 * bl)
            rebuild = (nxt - L) if nxt is not None else 0
            sc = (2.5 * np.clip((under - 3) / 6, 0, 1) + 1.5 * np.clip(1 - perc / 0.4, 0, 1) + np.clip(1 - dens / 1.2, 0, 1)
                  + np.clip(1 - (hi - lo - 3) / 6, 0, 1) + (0.7 if rebuild >= 3 else 0) + (0.5 if under >= 6 else 0)
                  + T.phrase_bonus(t, e, 0.4, 0.4))
            why = (f"{L:.1f} LUFS, {under:.1f} LU under the drive ({T.drive:.1f}); short-term range {lo:.1f} to {hi:.1f}; percussive share "
                   f"{perc:.2f}, {dens:.2f} onsets/beat" + (f"; it rebuilds {rebuild:+.1f} LU in the next 4 bars" if rebuild >= 3 else ""))
            res["quiet_dusk"].append(T.window(t, e, "quiet_dusk", sc, why, {"under_drive_lu": r(under, 1)}))

    # climax peak: 2 bars of build into a strong downbeat that starts >= 4 bars near the peak level
    for t, kind in cands:
        a, e = t - 2 * bl, t + 4 * bl
        if a < 0 or e > music_end:
            continue
        Lp = T.integ(t, e)
        Lb = T.integ(a, t)
        if Lp is None or Lb is None or Lb < -40:
            continue
        bars4 = [T.integ(t + i * bl, t + (i + 1) * bl) for i in range(4)]
        held = min(v for v in bars4 if v is not None) >= Lp - 2.5
        h = T.hit(t)
        sc = 3 * np.clip(1 - (T.peak - Lp) / 3, 0, 1) + np.clip((Lp - Lb) / 4, -0.5, 1) * 1.5 + np.clip(h, 0, 1.5) + (1 if held else -1)
        why = (f"lands at {t:.2f} s ({kind}): next 4 bars {Lp:.1f} LUFS ({T.peak - Lp:+.1f} LU from the track's peak level); "
               f"2 bars before {Lb:.1f} LUFS ({Lp - Lb:+.1f} LU into it); onset at the landing {h:.2f} of p99; "
               f"{'held' if held else 'not held'} for 4 bars")
        res["climax_peak"].append(T.window(a, e, "climax_peak", sc, why, {"landing_s": r(t, 3)}))

    # convergence: 1-2 bars rising into a strong downbeat
    for t, kind in cands:
        for nb in (1, 2):
            a = t - nb * bl
            if a < 0:
                continue
            l0 = T.integ(a, a + bl / 2); l1 = T.integ(t - bl / 2, t)
            if l0 is None or l1 is None or l0 < -40:
                continue
            d0 = len(T.strong_pons(a, a + nb * bl / 2))
            d1 = len(T.strong_pons(a + nb * bl / 2, t))
            h = T.hit(t)
            s_ = steps.get(t, (None,))[0]
            sc = np.clip((l1 - l0) / 4, -0.5, 1) * 2 + np.clip((d1 - d0) / 4, -0.5, 1) + np.clip(h, 0, 1.5) * 1.5 + (np.clip(s_ / 6, 0, 1) if s_ else 0)
            why = (f"{l0:.1f} to {l1:.1f} LUFS across {nb} bar(s) into {t:.2f} s ({kind}); percussive onsets {d0} then {d1} per half; "
                   f"downbeat onset {h:.2f} of p99" + (f"; {s_:+.1f} LU step at the downbeat" if s_ else ""))
            res["convergence"].append(T.window(a, t, "convergence", sc, why, {"lands_s": r(t, 3)}))

    # title: a strong downbeat that rings for >= 3 s
    for t, kind in cands:
        if t + 4 > T.dur:
            continue
        h = T.hit(t)
        lpk = T.mom_at(t, t + 0.6, np.max)
        l3 = T.mom_at(t + 2.5, t + 3.5, np.mean)
        if lpk is None or l3 is None:
            continue
        later = (T.ot > t + 0.25) & (T.ot <= t + 3.0)
        new_hits = float(T.oenv[later].max() / T.o99) if later.any() else 0
        ring = lpk - l3  # decay over 3 s
        if lpk < T.drive - 6:
            continue  # a title hit sounds at (nearly) full level
        dens_after = len(T.strong_pons(t + 0.3, t + 3.0)) / 2.7
        rings = np.clip(1 - dens_after / 3.0, 0, 1)
        to_end = (T.final_hit - t) if T.final_hit else None
        runs_on = to_end is not None and 4.0 <= to_end <= 13.0 and "real ending" in T.m["ending"].get("type", "")
        sc = (np.clip(h, 0, 1.5) * 1.5 + 3 * rings + (1 if 1 <= ring <= 18 else 0.3 if ring < 1 else 0)
              + np.clip((lpk - (T.drive - 10)) / 10, 0, 1) + (1.5 if runs_on else 0))
        why = (f"downbeat onset {h:.2f} of p99 at {t:.2f} s ({kind}); peak {lpk:.1f} LUFS momentary, {ring:.1f} LU lower after 3 s; "
               f"{dens_after:.1f} percussive onsets/s in the next 2.7 s ({'it rings' if rings >= 0.6 else 'the beat carries on'})"
               + (f"; the track's real ending follows {to_end:.1f} s later, so title and end card can run on in this track" if runs_on else ""))
        res["title"].append(T.window(t, t + 4.0, "title", sc, why, {"hit_s": r(t, 3)}))

    # end decay: the real ending
    e = T.m["ending"]
    if T.final_hit:
        fh = T.final_hit
        tail = (T.last_sound or T.dur) - fh
        lpre = e.get("level_4s_before_final_hit_lufs")
        typ = e.get("type", "")
        real = typ.startswith(("stop", "final hit", "real ending")) or typ.startswith("diminuendo") or typ.startswith("soft ending")
        k = T.bar_idx(fh)
        start = float(T.down[max(0, k - int(np.ceil(6 / bl)))])
        film_end = start + 12.5
        left = T.mom_at(film_end - 0.4, film_end + 0.4, np.mean)
        sc = (2 if real else -2) + np.clip(tail / 6, 0, 1.5) + (np.clip((lpre - (T.drive - 8)) / 8, 0, 1) if lpre is not None else 0) + np.clip(T.hit(fh), 0, 1)
        why = (f"{e.get('type')}; last strong onset {fh:.2f} s, sound until {T.last_sound:.2f} s ({tail:.1f} s of tail); level 4 s "
               f"before the final hit {lpre} LUFS; decay {e.get('decay_after_last_onset_lu_per_s')} LU/s; window starts on a downbeat "
               f"{fh - start:.1f} s before the final hit, as S27-S28 want (the last strong note 6.5-12.5 s before the film's end)")
        if left is not None and tail > film_end - fh:
            why += f"; at 12.5 s (the film's end) the tail still plays at {left:.1f} LUFS momentary, so a 12.5 s end card would cut it"
        res["end_decay"].append(T.window(start, min(film_end, (T.last_sound or T.dur) + 0.5), "end_decay", sc, why,
                                         {"final_hit_s": r(fh, 3), "tail_s": r(tail, 2), "final_hit_into_window_s": r(fh - start, 2),
                                          "tail_level_at_12p5s_lufs": r(left, 1) if tail > film_end - fh else None}))
    out = {}
    for s in SCENES:
        gap = {"ring_groove": 8 * bl, "intimate_open": 4 * bl, "quiet_dusk": 4 * bl}.get(s, 2 * bl)
        out[s] = top(res[s], 3, gap)
    if not out["intimate_open"]:
        qs = min((T.integ(t, t + 12) or 0, t) for t, _ in cands if t + 12 <= music_end)
        out["none"] = out.get("none", {})
        out["none"]["intimate_open"] = f"no span of 12-24 s is 4 LU under the drive or sparse; the quietest 12 s ({qs[1]:.1f} s) reads {qs[0]:.1f} LUFS against a drive of {T.drive:.1f}"
    if not out["quiet_dusk"]:
        out["none"] = out.get("none", {})
        out["none"]["quiet_dusk"] = "no span of 14.5-20 s sits 4 LU or more under the drive"
    if not out["drop_entrance"]:
        out["none"] = out.get("none", {})
        out["none"]["drop_entrance"] = "no downbeat or change point steps up 3 LU or more"
        out["none"]["tension_build"] = "no build: there is no entrance to build into"
    return out


# --------------------------------------------------------------------------------------------- transition points
def transitions(T):
    bl = T.bar_len()
    pts = []
    secs = T.m["sections"]
    seen = []
    sec_t = [s["start_s"] for s in secs[1:]]
    for c in T.m["change_points"]:
        st_, _, _ = lvl_step(T, c["t"])
        # a transition needs a real texture change, a bar-level step, or a section boundary (2-beat level wobbles,
        # such as Your Breath's 2-bar bass pattern from 0:51.5, are not seams)
        if (c["texture"] or 0) >= 0.5 or (st_ is not None and abs(st_) >= 1.5) or any(abs(c["t"] - x) < 0.3 for x in sec_t):
            seen.append(c["t"])
    for s in secs[1:]:
        if all(abs(s["start_s"] - x) > 0.3 for x in seen):
            seen.append(s["start_s"])
    music_end = T.final_hit if T.final_hit else T.dur
    for t in sorted(seen):
        if t < 1.0 or t > music_end + 0.1:
            continue
        s_, a_, b_ = lvl_step(T, t)
        if s_ is None:
            continue
        h = T.hit(t)
        gap = pre_gap(T, t)
        pos = None
        for c in T.m["change_points"]:
            if abs(c["t"] - t) < 0.05:
                pos = c["pos_in_bar"] + 1
        if pos is None:
            pos = 1
        kinds = []
        if s_ >= 3:
            kinds.append("entrance")
        elif s_ >= 1.5:
            kinds.append("lift")
        elif s_ <= -3:
            kinds.append("drop-out")
        if h >= 0.9:
            kinds.append("hit")
        if gap >= 6:
            kinds.append("stop before it")
        elif gap >= 3:
            kinds.append("breath before it")
        if not kinds:
            kinds.append("phrase change")
        if T.final_hit and abs(t - T.final_hit) < 0.1:
            kinds = ["final hit"]
        enter = ("good entry: the cue can start here with authority" if (s_ >= 1.5 or h >= 0.9) and t < music_end - 4 * bl
                 else "entry possible on a soft start" if s_ <= -3 else "entry mid-texture: needs a hit or a cut to cover it")
        exit_ = ("good exit: leave at the end of the bar before (the phrase ends there)" if abs(s_) >= 1.5 or gap >= 3
                 else "exit possible: a phrase change only")
        if gap >= 3:
            exit_ = f"best exit: the music already breathes {gap:.1f} LU in the beat before; cut or crossfade into that breath"
        pts.append({"t": r(t, 3), "bar": T.bar_idx(t), "beat_of_bar": pos, "kinds": kinds, "step_lu": r(s_, 1),
                    "before_lufs": r(a_, 1), "after_lufs": r(b_, 1), "onset": r(h, 2), "pre_dip_lu": r(gap, 1),
                    "entry": enter, "exit": exit_})
    if T.final_hit:
        pts.append({"t": r(T.last_sound, 2), "bar": T.bar_idx(T.last_sound), "kinds": ["decay end"],
                    "entry": "-", "exit": "the track has ended (natural decay to silence)"})
    return pts


# ------------------------------------------------------------------------------------------------- compatibility
CAM = {}
for i, k in enumerate(["C", "G", "D", "A", "E", "B", "F#", "C#", "Ab", "Eb", "Bb", "F"]):
    pass


def cam_parse(c):
    return int(c[:-1]), c[-1]


def key_relation(c1, c2):
    n1, l1 = cam_parse(c1); n2, l2 = cam_parse(c2)
    d = min((n1 - n2) % 12, (n2 - n1) % 12)
    if c1 == c2:
        return "same key", "compatible"
    if l1 == l2 and d == 1:
        return "adjacent on the wheel (a fifth apart)", "compatible"
    if n1 == n2:
        return "relative major/minor", "compatible"
    if l1 != l2 and d == 1:
        return "diagonal neighbour", "workable"
    if l1 == l2 and d == 2:
        return "two steps (a whole tone)", "workable"
    if l1 != l2 and d == 3:
        return "parallel major/minor", "workable"
    if l1 == l2 and d == 7:
        return "a semitone apart", "clash (or a deliberate lift)"
    return f"{d} steps apart", "clash"


def tempo_relation(b1, b2):
    best = None
    for p, q in ((1, 1), (2, 1), (1, 2), (3, 2), (2, 3), (4, 3), (3, 4), (5, 4), (4, 5)):
        err = (b2 / b1) / (p / q) - 1
        if best is None or abs(err) < abs(best[2]):
            best = (p, q, err)
    return best


def compat(tracks):
    pairs = []
    names = list(tracks)
    for a in names:
        for b in names:
            if a == b:
                continue
            A, B = tracks[a], tracks[b]
            ba, bb = A.m["tempo"]["bpm"], B.m["tempo"]["bpm"]
            p, q, err = tempo_relation(ba, bb)
            rel, grade = key_relation(A.m["key"]["camelot"], B.m["key"]["camelot"])
            same_tempo = abs(bb / ba - 1) < 0.003
            ga = np.mean([x["centroid"] for x in A.bars if x["lufs"] and x["lufs"] > A.drive - 3] or [0])
            gb = np.mean([x["centroid"] for x in B.bars if x["lufs"] and x["lufs"] > B.drive - 3] or [0])
            la = np.mean([x["low"] for x in A.bars if x["lufs"] and x["lufs"] > A.drive - 3] or [0])
            lb = np.mean([x["low"] for x in B.bars if x["lufs"] and x["lufs"] > B.drive - 3] or [0])
            pa = np.mean([x["perc"] for x in A.bars if x["lufs"] and x["lufs"] > A.drive - 3] or [0])
            pb = np.mean([x["perc"] for x in B.bars if x["lufs"] and x["lufs"] > B.drive - 3] or [0])
            if same_tempo and grade == "compatible":
                how = "beat-matched: a pre-roll crossfade of 1/8-1/2 beat ending on the incoming downbeat; no stretch needed"
            elif same_tempo:
                how = "same tempo, keys differ: cut on a downbeat at a phrase start, ideally through a stop, a hit or a drum-only bar"
            elif grade == "compatible":
                how = "tempos differ, keys agree: no beat overlap; cut through a held chord, a stop or a decay, or mask the cut with a hit"
            else:
                how = "tempos and keys differ: a hard cut at a phrase start masked by a designed hit or whoosh, or a gap through silence/room tone"
            if A.mixkit or B.mixkit:
                how += "; Mixkit side: keep any overlap to a short, standard transition (at most about 1 bar) [I]"
            pairs.append({"from": a, "to": b, "bpm_from": ba, "bpm_to": bb, "tempo_ratio": r(bb / ba, 4),
                          "nearest_simple": f"{p}:{q}", "ratio_error_pct": r(err * 100, 2), "same_tempo": same_tempo,
                          "key_from": A.m["key"]["key"], "key_to": B.m["key"]["key"], "camelot": f"{A.m['key']['camelot']} -> {B.m['key']['camelot']}",
                          "key_relation": rel, "key_grade": grade, "drive_gap_lu": r(B.drive - A.drive, 1),
                          "integrated_gap_lu": r(B.m["loudness"]["integrated_lufs"] - A.m["loudness"]["integrated_lufs"], 1),
                          "centroid_ratio_octaves": r(np.log2((gb + 1) / (ga + 1)), 2), "low_share_gap": r(lb - la, 3),
                          "perc_share_gap": r(pb - pa, 3), "how": how})
    return pairs


if __name__ == "__main__":
    names = [n for n in TRACKS if os.path.exists(f"{W}/maps/{n}.map.json")]
    tracks = {n: Track(n) for n in names}
    out = {"tracks": {}, "compatibility": compat(tracks)}
    for n, T in tracks.items():
        lab, title, artist, src, lic = TRACKS[n]
        out["tracks"][n] = {"label": lab, "title": title, "artist": artist, "source": src, "licence": lic,
                            "licence_rules": RULES_B if T.mixkit else RULES_A,
                            "cue_windows": scene_windows(T), "transition_points": transitions(T)}
    json.dump(out, open(f"{W}/cues.json", "w"), indent=1)
    for n in out["tracks"]:
        print(n)
        for s, ws in out["tracks"][n]["cue_windows"].items():
            if s == "none":
                print("   none:", ws); continue
            for w in ws[:2]:
                print(f"   {s:14s} {w['start_s']:7.2f}-{w['end_s']:7.2f} ({w['length_s']:5.1f} s) {w['lufs']} LUFS score {w['score']}")
