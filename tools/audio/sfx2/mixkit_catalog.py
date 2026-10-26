"""Parse saved Mixkit sound-effect listing pages into a catalogue (id, title, tags, duration, where it was listed).

The pages are untrusted data: this script only reads them as text. Fetch them by hand or with a polite loop (one
page at a time, a pause between requests); Mixkit's User Terms forbid scripts or bots that mass-download Items, so the
catalogue is for choosing a few items by name, never for bulk downloads.

Usage: python -I mixkit_catalog.py OUT.json PAGE.html [PAGE.html ...]
Page files are named <category>__p<N>.html (e.g. whoosh__p1.html); the name becomes the listing URL in the record.
"""
import html
import json
import os
import re
import sys

ITEM = re.compile(r'data-audio-player-item-id-value="(\d+)"')
TITLE = re.compile(r'item-grid-card__title">\s*(.*?)\s*</h2>', re.S)
TAG = re.compile(r'href="/free-sound-effects/([a-z0-9-]+)/"')
DUR = re.compile(r'data-test-id="duration">\s*(\d+):(\d+)')
NAME = re.compile(r"^(?P<cat>[a-z0-9-]+)__p(?P<page>\d+)\.html$")


def listing_url(cat, page):
    base = f"https://mixkit.co/free-sound-effects/{cat}/"
    return base if page == 1 else f"{base}?page={page}"


def parse(path):
    m = NAME.match(os.path.basename(path))
    if not m:
        raise SystemExit(f"unexpected page name: {path} (want <category>__p<N>.html)")
    cat, page = m.group("cat"), int(m.group("page"))
    text = open(path, encoding="utf-8", errors="ignore").read()
    starts = [x.start() for x in ITEM.finditer(text)]
    for i, s in enumerate(starts):
        seg = text[s: starts[i + 1] if i + 1 < len(starts) else s + 8000]
        iid = ITEM.match(text, s).group(1)
        t = TITLE.search(seg)
        if not t:
            continue
        d = DUR.search(seg)
        yield {
            "id": int(iid),
            "title": html.unescape(t.group(1)).strip(),
            "duration_listed_s": int(d.group(1)) * 60 + int(d.group(2)) if d else None,
            "tags": sorted(set(TAG.findall(seg))),
            "listed_on": listing_url(cat, page),
        }


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)
    items = {}
    for path in sys.argv[2:]:
        for rec in parse(path):
            cur = items.setdefault(rec["id"], {**rec, "listed_on": []})
            cur["tags"] = sorted(set(cur["tags"]) | set(rec["tags"]))
            if rec["listed_on"] not in cur["listed_on"]:
                cur["listed_on"].append(rec["listed_on"])
    out = sorted(items.values(), key=lambda r: r["id"])
    for r in out:
        r["preview_url"] = f"https://assets.mixkit.co/active_storage/sfx/{r['id']}/{r['id']}-preview.mp3"
        r["wav_url"] = f"https://assets.mixkit.co/active_storage/sfx/{r['id']}/{r['id']}.wav"
    with open(sys.argv[1], "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1, ensure_ascii=False)
    print(f"{len(out)} items from {len(sys.argv) - 2} pages")


if __name__ == "__main__":
    main()
