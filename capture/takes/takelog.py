"""The take log (RUNBOOK §8): /Users/Shared/pebble-takes/log/takes.md. The agent writes each take's facts as it records
and conforms it (the build, the start time, the raw and conformed measurements, the events); the lead adds the verdict.

    PY=/Library/Frameworks/Python.framework/Versions/3.14/bin/python3
    $PY -I -B capture/takes/takelog.py verdict RS9-01 kept "the whole chain at 1×; banner, card, Allow, video, reply"
    $PY -I -B capture/takes/takelog.py verdict RS9-02 rejected "an advert played before the video"
    $PY -I -B capture/takes/takelog.py show [RS9-01]
    $PY -I -B capture/takes/takelog.py export        # a copy into .work/real-takes/TAKE_LOG.md (kept after cleanup, §9)

A rejected take is deleted at once (RUNBOOK §8): `verdict … rejected` prints the files to delete, and --delete
deletes the raw and conformed files of that take (never anything else).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import shutil
import sys

ROOT = "/Users/Shared/pebble-takes"
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")


def main() -> int:
    ap = argparse.ArgumentParser(description="the take log: verdicts, show, export")
    ap.add_argument("--root", default=ROOT)
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("verdict")
    v.add_argument("name")
    v.add_argument("verdict", choices=("kept", "rejected"))
    v.add_argument("why")
    v.add_argument("--delete", action="store_true", help="rejected: delete the take's raw and conformed files now")
    s = sub.add_parser("show")
    s.add_argument("name", nargs="?")
    sub.add_parser("export")
    a = ap.parse_args()
    os.umask(0o002)  # the agent appends to the same file
    md = os.path.join(a.root, "log", "takes.md")
    jl = os.path.join(a.root, "log", "takes.jsonl")

    if a.cmd == "verdict":
        if not NAME_RE.match(a.name):
            raise SystemExit("not a take name")
        when = dt.datetime.now().astimezone().isoformat(timespec="seconds")
        with open(md, "a", encoding="utf-8") as f:
            f.write(f"- verdict on {a.name} ({when}, the lead): **{a.verdict}**: {a.why}\n")
        with open(jl, "a", encoding="utf-8") as f:
            f.write(json.dumps({"when": when, "kind": "verdict", "name": a.name, "verdict": a.verdict, "why": a.why}, ensure_ascii=False) + "\n")
        files = [p for p in (os.path.join(a.root, "raw", f"{a.name}.mov"), os.path.join(a.root, "conformed", f"{a.name}.mp4"))
                 if os.path.exists(p)]
        if a.verdict == "rejected":
            if a.delete:
                for p in files:
                    os.unlink(p)
                    print(f"deleted {p}")
            elif files:
                print("RUNBOOK §8: a rejected take is deleted at once. Run again with --delete, or delete: " + ", ".join(files))
        print(f"{a.name}: {a.verdict}")
        return 0
    if a.cmd == "show":
        text = open(md, encoding="utf-8").read() if os.path.exists(md) else "(no take log yet)"
        if a.name:
            blocks = re.split(r"\n(?=## )", text)
            text = "\n".join(b for b in blocks if b.startswith(f"## {a.name} ") or f" {a.name} " in b or f"/{a.name}." in b)
        print(text)
        return 0
    dst = os.path.join(REPO, ".work", "real-takes", "TAKE_LOG.md")
    shutil.copyfile(md, dst)
    if os.path.exists(jl):
        shutil.copyfile(jl, os.path.join(REPO, ".work", "real-takes", "takes.jsonl"))
    print(f"copied to {dst}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
