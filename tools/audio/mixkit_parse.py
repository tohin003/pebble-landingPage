"""Parse saved Mixkit music category pages into a JSON catalog (id,title,author,tags,duration_s)."""
import re, html, json, sys, glob, os
items = {}
for path in sys.argv[2:]:
    t = open(path, encoding='utf-8', errors='ignore').read()
    for m in re.finditer(r'data-audio-player-item-id-value="(\d+)"', t):
        iid = m.group(1)
        seg = t[m.start(): m.start() + 6000]
        nxt = seg.find('data-audio-player-item-id-value', 50)
        if nxt > 0:
            seg = seg[:nxt]
        title = re.search(r'item-grid-card__title">\s*(.*?)\s*</h2>', seg, re.S)
        author = re.search(r'music-preview__author">\s*by\s*(.*?)\s*</p>', seg, re.S)
        tags = re.findall(r'href="/free-stock-music/(mood|tag|instrument|genre)/([^/"]+)/"', seg)
        dur = re.search(r'data-test-id="duration">\s*(\d+):(\d+)', seg)
        if not title:
            continue
        rec = items.setdefault(iid, {"id": int(iid), "title": html.unescape(title.group(1)),
                                    "author": html.unescape(author.group(1)) if author else None,
                                    "tags": [], "duration_s": (int(dur.group(1)) * 60 + int(dur.group(2))) if dur else None,
                                    "pages": []})
        for k, v in tags:
            tv = f"{k}:{v}"
            if tv not in rec["tags"]:
                rec["tags"].append(tv)
        cat = os.path.basename(path).replace('.html', '')
        if cat not in rec["pages"]:
            rec["pages"].append(cat)
json.dump(sorted(items.values(), key=lambda r: r["id"]), open(sys.argv[1], 'w'), indent=1)
print(len(items), "tracks")
