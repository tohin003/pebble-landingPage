"""score2 lane: draw score_sfx_audition.py's candidates (pictures only; no audio). Runs in the qa venv (Pillow).

  .work/qa-venv/bin/python -I tools/audio/score2/score_sfx_sheet.py OUT_PREFIX
  -> OUT_PREFIX.png: one row per candidate: its name, numbers and classifier labels; its level (dB, 1 ms steps, 0 to
     -60 dB re its peak, the first 3 s); its log-mel spectrogram over the same 3 s.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, __import__("os").path.dirname(__import__("os").path.abspath(__file__)))
from cue_strips import spec_panel  # noqa: E402
from strips import FONT, FONT_B, LM, W  # noqa: E402


def main():
    out = sys.argv[1]
    res = json.load(open(out + ".json"))
    Z = np.load(out + ".npz")
    rows = []
    span = 3.0
    for c in res["candidates"]:
        cid = c["id"]
        m, cl = c["measure"], c["classifier"]
        head = Image.new("RGB", (W, 40), (24, 26, 30))
        d = ImageDraw.Draw(head)
        d.text((8, 3), f"{cid}  ({c.get('for') or ''})  licence {c['src'].get('licence')}", font=FONT_B, fill=(255, 255, 255))
        d.text((8, 22), f"dur {m['duration_s']} s · M max {m['lufs_m_max']} · centroid {m['centroid_hz']} Hz · "
                        f">150 Hz {m['share_above_150hz']} · peak at {m['peak_time_s']} s · attack {m['attack_s']} s · "
                        f"-20 dB after {m['decay_20db_s']} s · {cl['verdict']} · {', '.join(cl['top'][:4])} · "
                        f"watch {cl['watch_max']}", font=FONT, fill=(200, 200, 200))
        env = Z[f"{cid}_env"]
        el = Image.new("RGB", (W, 90), (16, 18, 22))
        d = ImageDraw.Draw(el)
        e = env - env.max()
        n = min(len(e), int(span * 1000))
        xs = LM + np.arange(n) / (span * 1000) * (W - LM - 8)
        ys = 4 + (np.clip(-e[:n], 0, 60) / 60) * 82
        for g in (0, -20, -40, -60):
            yy = 4 + (-g / 60) * 82
            d.line([(LM, yy), (W - 8, yy)], fill=(50, 54, 60))
            d.text((4, yy - 7), f"{g}", font=FONT, fill=(150, 150, 150))
        for k in range(int(span * 10) + 1):
            x = LM + k / (span * 10) * (W - LM - 8)
            d.line([(x, 84), (x, 90)], fill=(200, 200, 200))
        d.line(list(zip(xs, ys)), fill=(255, 200, 80), width=2)
        mel, mt = Z[f"{cid}_mel"], Z[f"{cid}_mel_t"]
        sp = spec_panel(mel, mt, 0.0, span, 150, float(mel.max()))
        rows += [head, el, sp]
    im = Image.new("RGB", (W, sum(r.height for r in rows) + 4 * len(rows)), (0, 0, 0))
    y = 0
    for r in rows:
        im.paste(r, (0, y))
        y += r.height + 4
    im.save(out + ".png")
    print("wrote", out + ".png", im.size)


if __name__ == "__main__":
    main()
