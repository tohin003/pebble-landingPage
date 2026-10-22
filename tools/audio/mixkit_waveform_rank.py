"""Rank Mixkit tracks for a product launch film using ONLY metadata + the public BBC-audiowaveform JSON (5 px/s min/max envelope).
Usage: python -I mixkit_waveform_rank.py catalog.json waveform_dir out.json"""
import json, sys, os, subprocess, math
cat = json.load(open(sys.argv[1])); wdir = sys.argv[2]; os.makedirs(wdir, exist_ok=True)
GOOD = {'technology','futuristic','corporate','uplifting','hopeful','positive','motivational','atmospheric','cinematic','melodic','confident','reflective','calm','inspiring','intro','background','science','documentary'}
BAD = {'humorous','comedy','sexy','sensual','disturbing','eerie','nightmarish','aggressive','workout','wedding','modern-christmas','traditional-christmas','lullabies','arabic','weird','tension','dramatic','extreme-sports','nightlife','fashion','aerobics','beach','summer','meditation','yoga','relaxation'}
def tagset(r): return {t.split(':',1)[1] for t in r['tags']}
cands = [r for r in cat if r['duration_s'] and 75 <= r['duration_s'] <= 240 and tagset(r) & GOOD and not (tagset(r) & BAD)]
res = []
for r in cands:
    p = os.path.join(wdir, f"{r['id']}.json")
    if not os.path.exists(p):
        subprocess.run(['curl','-sS','--max-time','20','-o',p,f"https://assets.mixkit.co/music/{r['id']}/{r['id']}-waveform.json"])
    try: w = json.load(open(p))
    except Exception: continue
    d = w['data']; pps = w['sample_rate']/w['samples_per_pixel']  # pixels per second
    amp = [max(abs(d[i]), abs(d[i+1]))/128.0 for i in range(0, len(d)-1, 2)]
    n = len(amp)
    # 1-second RMS-ish envelope (mean of peak per second) -> dBFS-ish
    sec = [sum(amp[int(i*pps):int((i+1)*pps)])/max(1,len(amp[int(i*pps):int((i+1)*pps)])) for i in range(int(n/pps))]
    db = [20*math.log10(max(x,1e-4)) for x in sec]
    if len(db) < 30: continue
    body = sorted(db)[len(db)//2]
    loud = sorted(db)[int(len(db)*0.9)]
    quiet = sorted(db)[int(len(db)*0.1)]
    intro = next((i for i,x in enumerate(db) if x > body-3), 0)            # seconds until near-body level
    peak_t = max(range(len(db)), key=lambda i: sum(db[i:i+8]))/len(db)    # where the loudest 8 s window sits (0..1)
    tail = db[-3:]; end_drop = body - sum(tail)/3                           # >12 dB = fades/rings out; small = hard stop
    # "build" = loudness increase from first 25% to the loudest 25% window
    q = len(db)//4; first = sum(db[:q])/q
    build = loud - first
    # count big section changes: |Δ| of 4 s moving average > 4 dB
    ma = [sum(db[i:i+4])/4 for i in range(len(db)-4)]
    changes = sum(1 for i in range(4, len(ma)) if abs(ma[i]-ma[i-4]) > 4 and (i < 8 or abs(ma[i-1]-ma[i-5]) <= 4))
    score = 0
    score += min(build, 12)/12*3           # a real build into a peak
    score += 1.5 if 0.45 <= peak_t <= 0.85 else 0   # climax late-ish (reveal)
    score += 1.0 if 4 <= intro <= 20 else 0          # a usable intro before full energy
    score += 1.0 if end_drop > 10 else 0             # clean ending (fade/ring-out), easy to backtime
    score += min(loud-quiet, 15)/15                  # dynamics (not a flat loop)
    res.append(dict(id=r['id'], title=r['title'], author=r['author'], dur=r['duration_s'], tags=sorted(tagset(r)),
                    intro_s=intro, build_db=round(build,1), climax_pos=round(peak_t,2), end_drop_db=round(end_drop,1),
                    dyn_db=round(loud-quiet,1), section_changes=changes, score=round(score,2),
                    url=f"https://assets.mixkit.co/music/{r['id']}/{r['id']}.mp3"))
res.sort(key=lambda x: -x['score'])
json.dump(res, open(sys.argv[3],'w'), indent=1)
for x in res[:25]:
    print(f"{x['score']:5.2f} #{x['id']:<4} {x['title'][:26]:26s} {x['dur']:>3}s intro={x['intro_s']:>2}s build={x['build_db']:>5}dB climax@{x['climax_pos']:.2f} end_drop={x['end_drop_db']:>5}dB dyn={x['dyn_db']:>4} chg={x['section_changes']} {','.join(x['tags'])[:60]}")
print(len(res), 'ranked of', len(cands), 'candidates')
