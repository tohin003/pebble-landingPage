"""The lead's side of the take agent: write jobs into its queue, and read what came back.

    PY=/Library/Frameworks/Python.framework/Versions/3.14/bin/python3
    $PY -I -B capture/takes/enqueue.py job capture/takes/jobs/dry/02-calculator.json [--n 1] [--set key=value …]
    $PY -I -B capture/takes/enqueue.py dry-run            # the whole dry-run set, in order
    $PY -I -B capture/takes/enqueue.py status             # the agent's heartbeat, the queue, the last results
    $PY -I -B capture/takes/enqueue.py wait <job-id> [--timeout 600]
    $PY -I -B capture/takes/enqueue.py show <job-id>
    $PY -I -B capture/takes/enqueue.py check <template.json> [--n 1] [--set …]   # validate only
    $PY -I -B capture/takes/enqueue.py pause | resume | stop

Templates (capture/takes/jobs/) are jobs with placeholders. A JSON string that is exactly "$name" becomes the value of
`name` (a number, a text or a point {x, y}); "$name" inside a longer text becomes that text. Values come from, in
order: --set, the positions file (default .work/real-takes/positions.json: points the lead read off the dry run's
stills and Accessibility dumps), and the template's own "defaults". "$n" is the take number (--n, default: the next
free one for that id). After substitution the job is checked by the same validator the agent uses (agent/jobspec.py)
and written atomically to the queue as NNNN-<id>.json. The queue is the person's account's own folder: the agent in
the demo user can read it, never write it.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, os.path.join(HERE, "agent"))
import jobspec  # noqa: E402

ROOT = "/Users/Shared/pebble-takes"
REPO = os.path.dirname(os.path.dirname(HERE))
POSITIONS = os.path.join(REPO, ".work", "real-takes", "positions.json")
TOKEN = re.compile(r"\$([a-z][a-z0-9_]*)")
DRY_RUN = sorted(os.path.join(HERE, "jobs", "dry", n) for n in os.listdir(os.path.join(HERE, "jobs", "dry"))
                 if n.endswith(".json")) if os.path.isdir(os.path.join(HERE, "jobs", "dry")) else []


def load_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def substitute(obj, values: dict, missing: set):
    if isinstance(obj, dict):
        return {k: substitute(v, values, missing) for k, v in obj.items()}
    if isinstance(obj, list):
        return [substitute(v, values, missing) for v in obj]
    if isinstance(obj, str):
        whole = TOKEN.fullmatch(obj)
        if whole:
            if whole.group(1) in values:
                return values[whole.group(1)]
            missing.add(whole.group(1))
            return obj

        def one(m):
            if m.group(1) in values and isinstance(values[m.group(1)], (str, int, float)):
                return str(values[m.group(1)])
            missing.add(m.group(1))
            return m.group(0)
        return TOKEN.sub(one, obj)
    return obj


def parse_set(pairs: list[str]) -> dict:
    out = {}
    for p in pairs or []:
        k, sep, v = p.partition("=")
        if not sep or not re.fullmatch(r"[a-z][a-z0-9_]*", k):
            raise SystemExit(f"--set wants name=value, got {p!r}")
        try:
            out[k] = json.loads(v)
        except json.JSONDecodeError:
            out[k] = v
    return out


def next_n(root: str, id_template: str) -> int:
    """The next take number for this id: one more than any result or queued job with the same id."""
    prefix, _, suffix = id_template.partition("$n")
    seen = set(os.listdir(os.path.join(root, "results"))) if os.path.isdir(os.path.join(root, "results")) else set()
    seen |= {m.group(2) for n in os.listdir(os.path.join(root, "queue"))
             if (m := jobspec.QUEUE_FILE_RE.match(n))} if os.path.isdir(os.path.join(root, "queue")) else set()
    n = 1
    while f"{prefix}{n:02d}{suffix}" in seen:
        n += 1
    return n


def build(template_path: str, root: str, cfg: dict, n: int | None, sets: dict, positions_path: str | None) -> dict:
    tpl = load_json(template_path)
    defaults = tpl.pop("defaults", {})
    tpl.pop("_about", None)
    positions = {}
    pp = positions_path or POSITIONS
    if os.path.exists(pp):
        positions = {k: v for k, v in load_json(pp).items() if not k.startswith("_")}
    values = {**defaults, **positions, **sets}
    if "n" not in sets:
        # the take number: the next free one for this id, once the id's other placeholders are filled
        id_partial = TOKEN.sub(lambda m: str(values[m.group(1)]) if m.group(1) != "n" and m.group(1) in values else m.group(0),
                               str(tpl.get("id", "")))
        values["n"] = f"{(n if n is not None else next_n(root, id_partial)):02d}"
    missing: set = set()
    job = substitute(tpl, values, missing)
    if missing:
        raise SystemExit(f"{os.path.basename(template_path)}: no value for {', '.join('$' + m for m in sorted(missing))} "
                         f"(--set name=value, or the positions file {pp})")
    try:
        return jobspec.validate_job(job, cfg)
    except jobspec.JobError as e:
        raise SystemExit(f"{os.path.basename(template_path)}: the job would be refused: {e}") from None


def write_job(root: str, job: dict) -> str:
    q = os.path.join(root, "queue")
    nums = [int(m.group(1)) for n in os.listdir(q) if (m := jobspec.QUEUE_FILE_RE.match(n)) and m.group(1)]
    seq = max(nums + [0]) + 1
    if os.path.exists(os.path.join(root, "results", job["id"])) or any(
            (m := jobspec.QUEUE_FILE_RE.match(n)) and m.group(2) == job["id"] for n in os.listdir(q)):
        raise SystemExit(f"job id {job['id']} was used already (a job runs once): use a new --n")
    name = f"{seq:04d}-{job['id']}.json"
    tmp = os.path.join(q, f".{name}.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(job, f, indent=1, ensure_ascii=False)
    os.chmod(tmp, 0o644)
    os.replace(tmp, os.path.join(q, name))
    return name


def summary(res: dict) -> str:
    lines = [f"{res.get('id')}: {res.get('status')}" + (f" — {res['error']}" if res.get("error") else "")
             + (f" ({res.get('seconds')} s)" if res.get("seconds") is not None else "")]
    for s in res.get("steps", []):
        d = s.get("detail")
        extra = ""
        if isinstance(d, dict):
            keep = {k: d[k] for k in ("path", "file", "to", "at", "name", "stopped_by", "source_s", "output_s", "frames", "sync", "found", "centre") if k in d}
            if "probe" in d and d["probe"]:
                pr = d["probe"]
                keep["probe"] = {k: pr.get(k) for k in ("duration_s", "frames", "fps_average", "gap_max_s", "mb_per_min", "width", "height")}
            extra = " " + json.dumps(keep, ensure_ascii=False) if keep else ""
        flag = "ok" if s.get("ok") else "FAILED"
        if s.get("skipped"):
            flag = "skipped"
        lines.append(f"  {s['i']:>3} {s['do']:<14} {flag}{' ' + s['error'] if s.get('error') else ''}{extra}"[:400])
    if res.get("events"):
        lines.append("  events: " + ", ".join(f"{k} {v.get('rec_s', v.get('job_s'))}" for k, v in res["events"].items()))
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", default=ROOT)
    ap.add_argument("--config", default=None, help="default: the installed agent's config, else the source's")
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name in ("job", "check"):
        sp = sub.add_parser(name)
        sp.add_argument("template")
        sp.add_argument("--n", type=int)
        sp.add_argument("--set", action="append", default=[])
        sp.add_argument("--positions")
    sub.add_parser("dry-run")
    sub.add_parser("status")
    w = sub.add_parser("wait")
    w.add_argument("id")
    w.add_argument("--timeout", type=float, default=600)
    s = sub.add_parser("show")
    s.add_argument("id")
    for name in ("pause", "resume", "stop"):
        sub.add_parser(name)
    a = ap.parse_args()
    root = a.root
    cfg_path = a.config or (os.path.join(root, "agent", "config.json") if os.path.exists(os.path.join(root, "agent", "config.json"))
                            else os.path.join(HERE, "agent", "config.json"))
    cfg = jobspec.load_config(cfg_path)

    if a.cmd in ("job", "check"):
        job = build(a.template, root, cfg, a.n, parse_set(a.set), a.positions)
        if a.cmd == "check":
            print(json.dumps(job, indent=1, ensure_ascii=False))
            print(f"OK: {job['id']}, {len(job['steps'])} steps", file=sys.stderr)
            return 0
        print(f"queued {write_job(root, job)}")
        return 0
    if a.cmd == "dry-run":
        for t in DRY_RUN:
            job = build(t, root, cfg, None, {}, None)
            print(f"queued {write_job(root, job)}")
        return 0
    if a.cmd == "status":
        hb = os.path.join(root, "results", "agent.json")
        if os.path.exists(hb):
            h = load_json(hb)
            age = time.time() - os.path.getmtime(hb)
            print(f"agent: {h.get('state')}{' ' + h['job'] if h.get('job') else ''}, mode {h.get('mode')}, as {h.get('user')}, "
                  f"Pebble {h.get('pebble', {}).get('version')}, recording {h.get('recording')}, {h.get('free_gib')} GiB free; "
                  f"heartbeat {age:.0f} s ago{' (STALE: the agent may have stopped)' if age > 30 and h.get('state') != 'stopped' else ''}")
        else:
            print("agent: no heartbeat yet (not started)")
        pf = os.path.join(root, "results", "preflight.json")
        if os.path.exists(pf):
            p = load_json(pf)
            print(f"preflight {p.get('when')}: {'ok' if p.get('ok') else 'NOT ok'} {p.get('checks')}; screen {p.get('screen', {}).get('points')}, "
                  f"scale {p.get('screen', {}).get('scale')}, {p.get('screen', {}).get('refresh_hz')} Hz; memory free {p.get('memory_free_pct')} %")
        for f in ("STOP", "PAUSE"):
            if os.path.exists(os.path.join(root, f)):
                print(f"{f} is set")
        q = sorted(n for n in os.listdir(os.path.join(root, "queue")) if n.endswith(".json") and not n.startswith("."))
        pend = [n for n in q if not os.path.exists(os.path.join(root, "results", jobspec.QUEUE_FILE_RE.match(n).group(2) if jobspec.QUEUE_FILE_RE.match(n) else "_"))]
        print(f"queue: {len(q)} files, {len(pend)} not yet taken: {', '.join(pend) or '-'}")
        rdir = os.path.join(root, "results")
        done = sorted((os.path.getmtime(os.path.join(rdir, d, "result.json")), d) for d in os.listdir(rdir)
                      if os.path.exists(os.path.join(rdir, d, "result.json")))
        for _, d in done[-8:]:
            r = load_json(os.path.join(rdir, d, "result.json"))
            print(f"  {d}: {r.get('status')}{' — ' + str(r.get('error') or r.get('errors'))[:160] if r.get('status') != 'done' else ''}")
        return 0
    if a.cmd == "wait":
        path = os.path.join(root, "results", a.id, "result.json")
        end = time.time() + a.timeout
        while not os.path.exists(path):
            if time.time() > end:
                print(f"{a.id}: no result after {a.timeout:.0f} s", file=sys.stderr)
                return 75
            time.sleep(2)
        print(summary(load_json(path)))
        return 0 if load_json(path).get("status") == "done" else 1
    if a.cmd == "show":
        print(summary(load_json(os.path.join(root, "results", a.id, "result.json"))))
        return 0
    flag = {"pause": "PAUSE", "resume": "PAUSE", "stop": "STOP"}[a.cmd]
    path = os.path.join(root, flag)
    if a.cmd == "resume":
        if os.path.exists(path):
            os.unlink(path)
        print("resumed: the agent takes new jobs")
    else:
        with open(path, "w") as f:
            f.write(f"{time.strftime('%Y-%m-%dT%H:%M:%S%z')} set by the lead\n")
        print(f"{flag} set: " + ("the agent lets go, stops any recording and exits (only the person can start it again)"
                                 if flag == "STOP" else "the agent starts no new job (a running job finishes)"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
