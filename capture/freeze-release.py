"""Freeze one Pebble release's frontend for the capture harness: index.html and src/ exactly as the release tag has
them on GitHub, each file checked against the tag's git tree (blob SHA-1), plus a node_modules link to a checkout whose
dependencies match (package-lock.json differing at most in its version fields). Use it when the checkout's working tree
has moved past the release you are capturing: serve.mjs then reads the frozen copy, never the moving tree.

  python3 -I -B capture/freeze-release.py <tag> <new-dir> --node-modules=<checkout>/node_modules
  python3 -I -B capture/freeze-release.py --verify <new-dir>      (every file again, and no extra file under src/)
  then: PEBBLE_REPO=<new-dir> scripts/heavy.sh capture capture/with-server.sh node capture/capture.mjs ...

<new-dir> must not exist yet. The tag's tree listing is kept in <new-dir>/release-tree.json for --verify. Network: the
GitHub API (one tag, one commit, one tree) and raw.githubusercontent.com (one request per file). Standard library only.
"""
import hashlib, json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor

REPO = "tohin003/Pebble"
PREFIXES = ("src/", "index.html")
args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict((a[2:].split("=", 1) + [""])[:2] for a in sys.argv[1:] if a.startswith("--"))


def api(path):
    with urllib.request.urlopen(f"https://api.github.com/repos/{REPO}/{path}", timeout=60) as r:
        return json.load(r)


def blob_sha(data):
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def wanted(path):
    return path == "index.html" or path.startswith("src/")


def verify(out):
    tree = json.load(open(os.path.join(out, "release-tree.json")))
    blobs = {e["path"]: e["sha"] for e in tree["tree"] if e["type"] == "blob" and wanted(e["path"])}
    bad = [p for p, sha in blobs.items() if not os.path.isfile(os.path.join(out, p)) or blob_sha(open(os.path.join(out, p), "rb").read()) != sha]
    extra = []
    for folder, _, files in os.walk(os.path.join(out, "src")):
        extra += [os.path.relpath(os.path.join(folder, f), out) for f in files if os.path.relpath(os.path.join(folder, f), out) not in blobs]
    print(f"VERIFY {tree['tag']} (commit {tree['commit'][:7]}): {len(blobs)} files, {len(bad)} differ or missing {bad[:5]}, {len(extra)} extra {extra[:5]}")
    return not bad and not extra


if "verify" in opts:
    sys.exit(0 if verify(opts["verify"] or args[0]) else 1)

tag, out = args[0], args[1]
if os.path.exists(out):
    raise SystemExit(f"{out} exists: freeze into a new folder")
ref = api(f"git/refs/tags/{tag}")["object"]
commit = api(f"git/tags/{ref['sha']}")["object"]["sha"] if ref["type"] == "tag" else ref["sha"]
tree_sha = api(f"git/commits/{commit}")["tree"]["sha"]
tree = api(f"git/trees/{tree_sha}?recursive=1")
if tree.get("truncated"):
    raise SystemExit("the tree listing is truncated")
blobs = {e["path"]: e["sha"] for e in tree["tree"] if e["type"] == "blob" and wanted(e["path"])}
os.makedirs(out)


def get(path):
    url = f"https://raw.githubusercontent.com/{REPO}/{commit}/" + urllib.request.quote(path)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                data = r.read()
            break
        except OSError:
            if attempt == 2:
                raise
    target = os.path.join(out, path)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "wb") as f:
        f.write(data)


with ThreadPoolExecutor(8) as pool:
    list(pool.map(get, sorted(blobs)))
json.dump({"tag": tag, "commit": commit, "tree": tree["tree"]}, open(os.path.join(out, "release-tree.json"), "w"))
modules = opts.get("node-modules")
if modules:
    lock = os.path.join(os.path.dirname(os.path.abspath(modules)), "package-lock.json")
    with urllib.request.urlopen(f"https://raw.githubusercontent.com/{REPO}/{commit}/package-lock.json", timeout=60) as r:
        tagged = json.load(r)
    local = json.load(open(lock))
    for doc in (tagged, local):  # the release's own version is the only field allowed to differ
        doc.pop("version", None)
        doc.get("packages", {}).get("", {}).pop("version", None)
    if tagged != local:
        raise SystemExit(f"{lock} has other dependencies than {tag}: install the tag's packages instead")
    os.symlink(os.path.abspath(modules), os.path.join(out, "node_modules"))
ok = verify(out)
print(f"FROZEN {tag} -> {out}" + (f" (node_modules -> {modules})" if modules else " (no node_modules link yet)"))
sys.exit(0 if ok else 1)
