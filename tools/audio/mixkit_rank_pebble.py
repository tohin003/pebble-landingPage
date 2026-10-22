"""Pebble-profile ranking of Mixkit tracks from metadata + public waveform JSON (no audio download).
Usage: python -I mixkit_rank_pebble.py catalog.json waveform_dir out.json [min_dur] [max_dur]"""
import json, sys, os, subprocess, math
cat = json.load(open(sys.argv[1])); wdir = sys.argv[2]; os.makedirs(wdir, exist_ok=True)
mn = float(sys.argv[4]) if len(sys.argv) > 4 else 80; mx = float(sys.argv[5]) if len(sys.argv) > 5 else 240
W = {  # brand fit for Pebble: calm, warm, friendly, precise; acoustic/mallet/piano/soft synth; no drama, no hype
 'calm': 2, 'hopeful': 2, 'warm': 2, 'friendly': 2, 'positive': 1.5, 'uplifting': 1.5, 'reflective': 1, 'melodic': 1,
 'playful': 1, 'confident': 1, 'relaxed': 1, 'inspiring': 1.5, 'happy': 0.5, 'lighthearted': 1, 'soft': 1,
 'piano': 1.5, 'mallets': 2, 'acoustic-guitar': 1, 'synth': 0.5, 'keyboard': 0.5, 'strings': 0.5, 'technology': 1,
 'background': 0.5, 'intro': 0.5, 'documentary': 0.5, 'science': 0.5, 'motivational': 0.5, 'corporate': 0.3,
 'dramatic': -3, 'epic-drama': -3, 'aggressive': -4, 'eerie': -4, 'disturbing': -4, 'nightmarish': -4, 'tension': -3,
 'sexy': -3, 'sensual': -3, 'comedy': -3, 'humorous': -3, 'wedding': -2, 'modern-christmas': -4, 'traditional-christmas': -4,
 'workout': -2, 'fashion': -1, 'meditation': -2, 'yoga': -2, 'lullabies': -3, 'arabic': -2, 'weird': -3, 'mysterious': -1.5,
 'action': -2, 'thriller': -3, 'investigation': -2, 'extreme-sports': -3, 'nightlife': -2, 'brass': -0.5, 'drums': 0}
def tags(r): return {t.split(':', 1)[1] for t in r['tags']}
res = []
for r in cat:
    if not r['duration_s'] or not (mn <= r['duration_s'] <= mx): continue
    fit = sum(W.get(t, 0) for t in tags(r))
    title = r['title'].lower()
    fit -= 4 * any(w in title for w in ('baby', 'lullaby', 'child', 'christmas', 'xmas', 'wedding', 'love', 'romantic', 'sexy', 'funk', 'trap', 'epic', 'horror', 'yoga', 'meditation'))
    fit -= 2 * ('fairytale' in tags(r) or 'family' in tags(r))
    if fit < 2: continue
    p = os.path.join(wdir, f"{r['id']}.json")
    if not os.path.exists(p):
        subprocess.run(['curl', '-sS', '--max-time', '20', '-o', p, f"https://assets.mixkit.co/music/{r['id']}/{r['id']}-waveform.json"])
    try: w = json.load(open(p))
    except Exception: continue
    d = w['data']; pps = w['sample_rate'] / w['samples_per_pixel']
    amp = [max(abs(d[i]), abs(d[i + 1])) / 128.0 for i in range(0, len(d) - 1, 2)]
    secs = int(len(amp) / pps)
    db = [20 * math.log10(max(sum(amp[int(i * pps):int((i + 1) * pps)]) / max(1, len(amp[int(i * pps):int((i + 1) * pps)])), 1e-4)) for i in range(secs)]
    if len(db) < 40: continue
    s = sorted(db); body = s[len(s) // 2]; loud = s[int(len(s) * 0.9)]; quiet = s[int(len(s) * 0.1)]
    last_body = max(i for i, x in enumerate(db) if x > body - 6)                 # last second near body level
    ringout = len(db) - 1 - last_body                                             # seconds of natural decay at the end
    q = len(db) // 4; build = loud - sum(db[:q]) / q
    intro = next((i for i, x in enumerate(db) if x > body - 3), 0)
    peak_pos = max(range(len(db) - 8), key=lambda i: sum(db[i:i + 8])) / len(db)
    struct = min(build, 12) / 12 * 2 + (1 if 3 <= intro <= 20 else 0) + (1 if 2 <= ringout <= 10 else 0) + (0.5 if 0.4 <= peak_pos <= 0.85 else 0) + min(loud - quiet, 12) / 12
    res.append(dict(id=r['id'], title=r['title'], author=r['author'], dur=r['duration_s'], fit=round(fit, 1), struct=round(struct, 2),
                    score=round(fit + 1.5 * struct, 2), intro_s=intro, build_db=round(build, 1), ringout_s=ringout, peak_pos=round(peak_pos, 2),
                    tags=sorted(tags(r)), url=f"https://assets.mixkit.co/music/{r['id']}/{r['id']}.mp3",
                    page=f"https://mixkit.co/free-stock-music/download/{r['id']}/"))
res.sort(key=lambda x: -x['score']); json.dump(res, open(sys.argv[3], 'w'), indent=1)
for x in res[:15]:
    print(f"{x['score']:5.1f} fit={x['fit']:4.1f} st={x['struct']:4.2f} #{x['id']:<4} {x['title'][:24]:24s} {x['author'][:20]:20s} {x['dur']:>3}s intro={x['intro_s']:>2}s build={x['build_db']:>4}dB ring={x['ringout_s']:>2}s | {','.join(x['tags'])[:70]}")
print(len(res), 'ranked')
