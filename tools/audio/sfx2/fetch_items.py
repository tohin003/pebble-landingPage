"""Download a short, hand-picked list of Mixkit sound effects, one at a time, with a provenance record for each.

Mixkit's User Terms forbid "scripts or bots to mass download Items": this fetcher refuses lists longer than MAX_ITEMS,
waits PAUSE_S between downloads, and skips files it already has. The files are untrusted data: they go into their own
folder and are only ever read as audio.

Usage: python -I fetch_items.py CANDIDATES.json CATALOGUE.json OUT_DIR PROVENANCE.json
  CANDIDATES.json  {"mixkit": [{"id": 2632, "roles": ["ring_sweep"]}, ...]}
  CATALOGUE.json   mixkit_catalog.py's output (title, where it is listed)
Writes OUT_DIR/mixkit-<id>.wav and PROVENANCE.json (url, HTTP status, bytes, SHA-256, time, listing pages, licence).
"""
import datetime
import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.request

MAX_ITEMS = 50
PAUSE_S = 3.0
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36"
LICENCE = {
    "name": "Mixkit Sound Effects Free License",
    "url": "https://mixkit.co/license/modal/sfxFree/",
    "terms_url": "https://mixkit.co/terms/",
}


def get(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://mixkit.co/"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
            status = r.status
            ctype = r.headers.get("Content-Type", "")
    except urllib.error.HTTPError as e:
        return {"status": e.code, "bytes": 0}
    tmp = dest + ".part"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, dest)
    return {"status": status, "bytes": len(data), "content_type": ctype, "sha256": hashlib.sha256(data).hexdigest()}


def main():
    args = [x for x in sys.argv[1:] if x != "--retry"]
    if len(args) != 4:
        raise SystemExit(__doc__)
    cand_path, cat_path, out_dir, prov_path = args
    items = json.load(open(cand_path, encoding="utf-8"))["mixkit"]
    if len(items) > MAX_ITEMS:
        raise SystemExit(f"{len(items)} items: more than {MAX_ITEMS} would be a bulk download; pick fewer")
    cat = {r["id"]: r for r in json.load(open(cat_path, encoding="utf-8"))}
    os.makedirs(out_dir, exist_ok=True)
    prov = {}
    if os.path.exists(prov_path):
        prov = {int(k): v for k, v in json.load(open(prov_path, encoding="utf-8")).get("items", {}).items()}
    for n, it in enumerate(items):
        iid = int(it["id"])
        dest = os.path.join(out_dir, f"mixkit-{iid}.wav")
        if os.path.exists(dest) and prov.get(iid, {}).get("status") == 200:
            continue
        if prov.get(iid, {}).get("status") in (403, 404) and "--retry" not in sys.argv:
            continue  # refused before: don't ask again unless told to
        meta = cat.get(iid, {})
        url = f"https://assets.mixkit.co/active_storage/sfx/{iid}/{iid}.wav"
        res = get(url, dest)
        rec = {"id": iid, "title": meta.get("title"), "roles": it.get("roles", []), "url": url,
               "listed_on": meta.get("listed_on", []), "tags": meta.get("tags", []),
               "fetched_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"), **res}
        if res["status"] != 200:
            pv = f"https://assets.mixkit.co/active_storage/sfx/{iid}/{iid}-preview.mp3"
            rec["wav_status"] = res["status"]
            rec["note"] = "WAV refused; the preview MP3 was not fetched (temp quality only, fetch by hand if wanted)"
            rec["preview_url"] = pv
        prov[iid] = rec
        print(f"{n + 1}/{len(items)} {iid} {res['status']} {res.get('bytes', 0)} {meta.get('title')}", flush=True)
        with open(prov_path, "w", encoding="utf-8") as f:
            json.dump({"licence": LICENCE, "items": {str(k): v for k, v in sorted(prov.items())}}, f, indent=1,
                      ensure_ascii=False)
        time.sleep(PAUSE_S)


if __name__ == "__main__":
    main()
