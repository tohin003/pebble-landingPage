"""score2 lane: close CR-13 for the music. Compare the person's hand-downloaded Mixkit tracks with the audition copies
the masters were built from (OVERRIDES §55: the person downloads each Mixkit track by hand before the masters).

Hashes only (SHA-256); no audio is decoded or written, and nothing is fetched. Writes .work/score2/master/
hand_download_check.json, which score_provenance.py and score_readme.py read:
  - every file matches its audition copy byte for byte: the working masters and the previews stand as built, made from
    the same bytes the person downloaded; re-run score_provenance.py and score_readme.py only;
  - any file differs: rebuild from the person's copies (put them in .work/music-audition under the audition names, then
    score_build.py for both films, the strips, the previews, score_readme.py and score_provenance.py) and compare.

  python3 -I tools/audio/score2/score_handcheck.py --b2 ~/Downloads/<Your Breath>.mp3 --b4 ~/Downloads/<Techno Fest Vibes>.mp3
"""
import argparse
import datetime
import hashlib
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
AUD = os.path.join(REPO, ".work", "music-audition")
TRACKS = {"b2": ("B2", "YourBreath", 634), "b4": ("B4", "TechnoFestVibes", 124)}  # Mixkit's item ids


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--b2", required=True, help="the person's hand download of Your Breath (Mixkit item 634)")
    ap.add_argument("--b4", required=True, help="the person's hand download of Techno Fest Vibes (Mixkit item 124)")
    a = ap.parse_args()
    rows = []
    for key in ("b2", "b4"):
        label, name, item = TRACKS[key]
        mine = os.path.abspath(os.path.expanduser(getattr(a, key)))
        ref = os.path.join(AUD, name + ".mp3")
        hm, hr = sha256(mine), sha256(ref)
        rows.append({"label": label, "track": name, "mixkit_item_id": item, "hand_download_sha256": hm,
                     "hand_download_bytes": os.path.getsize(mine), "audition_copy": os.path.relpath(ref, REPO),
                     "audition_sha256": hr, "matches": hm == hr})
    out = {"made": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
           "what": "the person's hand downloads of the Mixkit music against the audition copies (OVERRIDES §55 CR-13)",
           "files": rows, "all_match": all(r["matches"] for r in rows),
           "then": ("the working masters and the previews stand bit for bit: re-run score_provenance.py and "
                    "score_readme.py" if all(r["matches"] for r in rows) else
                    "rebuild from the person's copies and compare the build records")}
    path = os.path.join(REPO, ".work", "score2", "master", "hand_download_check.json")
    json.dump(out, open(path, "w"), indent=1)
    print(json.dumps({"all_match": out["all_match"], "files": [(r["label"], r["matches"]) for r in rows]}))


if __name__ == "__main__":
    main()
