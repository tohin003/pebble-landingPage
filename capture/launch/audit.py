"""Every string a launch clip shows, looked up in the sources it may come from (the house rule: never show UI text that
isn't in Pebble's own v2.0.1 code or the fixtures' sample data).

  python3 -I capture/launch/audit.py <frames-dir> [<frames-dir> ...] --frozen=<v2.0.1 tree> --backend=<v2.0.1 backend>

<frames-dir>: a record.mjs output made with LAUNCH_PROBE=1 (its probes.json holds the visible text every 10 frames).
The corpus: the frozen tree's src/ (.vue, .ts), the tag's backend files fetched next to it (.py), the launch world and the
launch timelines. A string is "found" when it occurs in the corpus once whitespace is collapsed and Markdown's marks are
dropped; a string made at run time (a count, a time, a receipt) is listed under "composed" for a person to read, with
the frames it shows on. Standard library only.
"""
import json, os, re, sys

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict((a[2:].split("=", 1) + [""])[:2] for a in sys.argv[1:] if a.startswith("--"))
HERE = os.path.dirname(os.path.abspath(__file__))


def read_tree(root, exts):
    out = []
    for folder, _, files in os.walk(root):
        for f in files:
            if f.endswith(exts) and ".test." not in f:
                with open(os.path.join(folder, f), encoding="utf-8", errors="replace") as fh:
                    out.append(fh.read())
    return out


def norm(text):
    text = text.replace("\\n", " ").replace("\\`", "").replace("**", "").replace("`", "")
    return re.sub(r"\s+", " ", text).strip()


pebble = norm("\n".join(read_tree(os.path.join(opts["frozen"], "src"), (".vue", ".ts")) + read_tree(opts["backend"], (".py",))))
ours = []
for f in ("../mock/launch-world.js", "timelines.mjs", "scenes.mjs"):
    with open(os.path.join(HERE, f), encoding="utf-8") as fh:
        ours.append(fh.read())
ours = norm("\n".join(ours))

seen = {}
for d in args:
    with open(os.path.join(d, "probes.json"), encoding="utf-8") as fh:
        probes = json.load(fh)
    for frame, lines in probes.get("texts", {}).items():
        for _, _, text in lines:
            seen.setdefault(text, set()).add((os.path.basename(os.path.normpath(d)), int(frame)))

found, sample, composed = [], [], []
for text, where in sorted(seen.items()):
    t = norm(text)
    (found if t in pebble else sample if t in ours else composed).append((text, where))
print(f"AUDIT: {len(seen)} visible strings; {len(found)} in Pebble's v2.0.1 sources; {len(sample)} only in the launch "
      f"world (sample data: read them, none may be a host or window string); {len(composed)} composed at run time:")
for title, rows in (("sample data", sample), ("composed", composed)):
    print(f"-- {title}")
    for text, where in rows:
        first = sorted(where)[0]
        print(f"  {text!r}  ({first[0]} frame {first[1]}, {len(where)} sightings)")
