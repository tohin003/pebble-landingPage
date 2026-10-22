"""Fetch and verify the CC0 instrument samples that tools/audio/render_sampled.py plays (kit: tools/audio/sample_kit.json).

Only WAV sample files and the libraries' licence texts are downloaded, from raw.githubusercontent.com at each library's
pinned commit, one request at a time; nothing downloaded is ever executed. Every file is checked twice:
  - against the git blob SHA-1 listed in the kit (taken from the pinned commit's tree), so it is the file at that commit;
  - against the SHA-256 recorded in the kit (and in tools/audio/sha256-sources.txt) once it has been fetched.
Files land in .work/audio/samples/<library>/<path in the repository> (gitignored; audio never enters git).

Usage (from the repo root, with the audio venv):
  python -I tools/audio/sample_kit.py fetch [--only INSTRUMENT ...] [--record]
      download what is missing and verify everything; --record writes missing SHA-256 values into the kit and appends
      them to tools/audio/sha256-sources.txt (used once, when the kit was assembled)
  python -I tools/audio/sample_kit.py verify      check the files on disk, download nothing
  python -I tools/audio/sample_kit.py prune       delete downloaded samples the kit no longer lists
  python -I tools/audio/sample_kit.py drop INSTRUMENT [...]   remove instruments from the kit (and their files)
"""
import argparse
import datetime
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.parse

KIT = "tools/audio/sample_kit.json"
DEST = ".work/audio/samples"
SUMS = "tools/audio/sha256-sources.txt"


def raw_url(lib, path):
    return f"https://raw.githubusercontent.com/{lib['repo']}/{lib['commit']}/{urllib.parse.quote(path)}"


def blob_sha1(data):
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def fetch_one(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    part = dest + ".part"
    subprocess.run(["curl", "-sSf", "--max-time", "180", "-o", part, url], check=True)
    os.replace(part, dest)
    time.sleep(0.3)                                                   # polite: one request at a time


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["fetch", "verify", "prune", "drop"])
    ap.add_argument("names", nargs="*")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--record", action="store_true")
    a = ap.parse_args()
    kit = json.load(open(KIT))
    libs = kit["libraries"]

    if a.cmd == "drop":
        for name in a.names:
            inst = kit["instruments"].pop(name)
            for f in inst["files"]:
                p = os.path.join(DEST, inst["lib"], inst["dir"], f["file"])
                if os.path.exists(p):
                    os.remove(p)
            print(f"dropped {name} ({len(inst['files'])} files)")
        json.dump(kit, open(KIT, "w"), indent=1, ensure_ascii=False)
        return

    if a.cmd == "prune":
        keep = {os.path.normpath(os.path.join(DEST, i["lib"], i["dir"], f["file"]))
                for i in kit["instruments"].values() for f in i["files"]}
        removed = 0
        for lib in libs:
            for root, _, files in os.walk(os.path.join(DEST, lib)):
                for fn in files:
                    p = os.path.normpath(os.path.join(root, fn))
                    if fn.lower().endswith(".wav") and p not in keep:
                        os.remove(p)
                        removed += 1
        print(f"pruned {removed} files no longer in the kit")
        return

    # licence texts first: a library whose licence text changed is not used
    for name, lib in libs.items():
        dest = os.path.join(DEST, name, lib["licence_file"])
        if not os.path.exists(dest):
            if a.cmd == "verify":
                sys.exit(f"missing {dest}")
            fetch_one(raw_url(lib, lib["licence_file"]), dest)
        h = hashlib.sha256(open(dest, "rb").read()).hexdigest()
        if h != lib["licence_sha256"]:
            sys.exit(f"{name}: licence text changed ({h}); re-check the licence before using this library")

    today = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30))).strftime("%Y-%m-%d")
    known = set()
    if os.path.exists(SUMS):
        known = {ln.split()[1] for ln in open(SUMS) if ln.strip() and not ln.startswith("#")}
    new_lines, n_ok, n_get, total = [], 0, 0, 0
    for iname, inst in kit["instruments"].items():
        if a.only and iname not in a.only:
            continue
        lib = libs[inst["lib"]]
        for f in inst["files"]:
            path = f"{inst['dir']}/{f['file']}"
            dest = os.path.join(DEST, inst["lib"], path)
            if not os.path.exists(dest):
                if a.cmd == "verify":
                    sys.exit(f"missing {dest} (run: sample_kit.py fetch)")
                fetch_one(raw_url(lib, path), dest)
                n_get += 1
            data = open(dest, "rb").read()
            if len(data) != f["bytes"] or blob_sha1(data) != f["git_blob_sha1"]:
                os.remove(dest)
                sys.exit(f"{path}: not the file at {lib['repo']}@{lib['commit'][:12]} (size or git blob SHA-1 differs); removed")
            h = hashlib.sha256(data).hexdigest()
            if f.get("sha256") and f["sha256"] != h:
                sys.exit(f"{path}: SHA-256 differs from the kit ({h})")
            if not f.get("sha256"):
                if not a.record:
                    sys.exit(f"{path}: no SHA-256 in the kit yet (run with --record once)")
                f["sha256"] = h
            key = f"{inst['lib']}/{f['file']}"
            if a.record and key not in known:
                new_lines.append(f"{h}  {key}  {raw_url(lib, path)}  {today}\n")
                known.add(key)
            n_ok += 1
            total += len(data)
    if a.record:
        json.dump(kit, open(KIT, "w"), indent=1, ensure_ascii=False)
        if new_lines:
            with open(SUMS, "a") as fh:
                fh.writelines(new_lines)
    print(f"{n_ok} sample files verified ({total / 1e6:.1f} MB), {n_get} downloaded; licence texts unchanged")


if __name__ == "__main__":
    main()
