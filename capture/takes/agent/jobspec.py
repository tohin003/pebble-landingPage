"""The take agent's job format: its fixed vocabulary and the validator the agent and the lead's enqueue tool share.

A job is DATA, never code: one JSON object with a fixed set of keys, whose steps each name one action from VOCABULARY
with typed, range-checked parameters. A job with anything else in it (an unknown key, an unknown action, a value out
of range, an app, URL or path outside the allowlists) is refused whole, before any step runs. Nothing in a job is ever
evaluated, interpolated into a shell command or used as a path outside the allowed roots.

Points are screen coordinates in points (CoreGraphics' global space: the main display's top-left is 0,0), or "@name",
the centre of an element an earlier `find` or `wait_element` step of the same job saved, or {"ref": "@name", "dx": …,
"dy": …} for an offset from it.
"""

from __future__ import annotations

import json
import os
import re
import unicodedata
from typing import Any

SCHEMA = "pebble-take-job/1"
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")  # recordings and stills: file-safe, no slashes
EVENT_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]{0,39}$")
VAR_RE = re.compile(r"^@[a-z][a-z0-9_]{0,31}$")
ROLE_RE = re.compile(r"^AX[A-Za-z]{1,40}$")
QUEUE_FILE_RE = re.compile(r"^(?:(\d{4})-)?([A-Za-z0-9][A-Za-z0-9._-]{0,63})\.json$")

MAX_JOB_BYTES = 256 * 1024
MAX_STEPS = 500
MAX_TEXT = 2000
COORD_MAX = 20000.0

# Keys the `key` action can press (macOS virtual key codes, ANSI positions). Letters and digits press the physical key,
# so ⌘K is {"key": "k", "mods": ["cmd"]}; `type` is for text (it sends the characters themselves, any layout).
KEYCODES: dict[str, int] = {
    "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9, "b": 11, "q": 12, "w": 13, "e": 14,
    "r": 15, "y": 16, "t": 17, "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23, "equal": 24, "9": 25, "7": 26,
    "minus": 27, "8": 28, "0": 29, "rightbracket": 30, "o": 31, "u": 32, "leftbracket": 33, "i": 34, "p": 35,
    "return": 36, "l": 37, "j": 38, "quote": 39, "k": 40, "semicolon": 41, "backslash": 42, "comma": 43, "slash": 44,
    "n": 45, "m": 46, "period": 47, "tab": 48, "space": 49, "grave": 50, "delete": 51, "escape": 53,
    "f1": 122, "f2": 120, "f3": 99, "f4": 118, "f5": 96, "f6": 97, "f7": 98, "f8": 100, "f9": 101, "f10": 109,
    "f11": 103, "f12": 111, "home": 115, "pageup": 116, "forwarddelete": 117, "end": 119, "pagedown": 121,
    "left": 123, "right": 124, "down": 125, "up": 126,
}
ARROWS = {"left", "right", "down", "up", "home", "end", "pageup", "pagedown", "forwarddelete"}
MODS = ("cmd", "shift", "ctrl", "opt", "fn")
RESET_WHAT = ("photos", "notes", "app-actions", "calculator", "all")


class JobError(ValueError):
    """A job (or one of its steps) is malformed; the whole job is refused."""


# ---- parameter types ---------------------------------------------------------------------------------------------

def _num(lo: float, hi: float):
    def check(v: Any, where: str, cfg: dict) -> float:
        if isinstance(v, bool) or not isinstance(v, (int, float)) or v != v:
            raise JobError(f"{where}: expected a number, got {type(v).__name__}")
        if not lo <= v <= hi:
            raise JobError(f"{where}: {v} is outside {lo}..{hi}")
        return float(v)
    return check


def _int(lo: int, hi: int):
    def check(v: Any, where: str, cfg: dict) -> int:
        if isinstance(v, bool) or not isinstance(v, int):
            raise JobError(f"{where}: expected a whole number, got {v!r}")
        if not lo <= v <= hi:
            raise JobError(f"{where}: {v} is outside {lo}..{hi}")
        return v
    return check


def _bool(v: Any, where: str, cfg: dict) -> bool:
    if not isinstance(v, bool):
        raise JobError(f"{where}: expected true or false")
    return v


def _plain_text(v: Any, where: str, limit: int, newlines: bool = False) -> str:
    if not isinstance(v, str):
        raise JobError(f"{where}: expected text")
    if len(v) > limit:
        raise JobError(f"{where}: {len(v)} characters, more than {limit}")
    for ch in v:
        cat = unicodedata.category(ch)
        if ch == "\n" and newlines:
            continue
        if cat in ("Cc", "Cf", "Cs", "Co", "Cn") and ch != " ":
            raise JobError(f"{where}: contains a control or invisible character (U+{ord(ch):04X})")
    return v


def _str(limit: int):
    def check(v: Any, where: str, cfg: dict) -> str:
        return _plain_text(v, where, limit)
    return check


def _text(v: Any, where: str, cfg: dict) -> str:
    v = _plain_text(v, where, MAX_TEXT, newlines=True)
    if not v:
        raise JobError(f"{where}: empty")
    return v


def _enum(*choices: str):
    def check(v: Any, where: str, cfg: dict) -> str:
        if v not in choices:
            raise JobError(f"{where}: {v!r} is not one of {', '.join(choices)}")
        return v
    return check


def _re(rx: re.Pattern, what: str):
    def check(v: Any, where: str, cfg: dict) -> str:
        if not isinstance(v, str) or not rx.match(v):
            raise JobError(f"{where}: {v!r} is not a valid {what}")
        return v
    return check


_name = _re(NAME_RE, "name (letters, digits, '.', '_' and '-'; at most 64)")
_event = _re(EVENT_RE, "event name (a letter, then letters, digits or '_')")
_var = _re(VAR_RE, "saved-point name ('@' and lower-case letters, digits or '_')")
_role = _re(ROLE_RE, "Accessibility role (AXButton, AXStaticText …)")


def _app(v: Any, where: str, cfg: dict) -> str:
    apps = cfg.get("apps", {})
    if v not in apps:
        raise JobError(f"{where}: app {v!r} is not on the allowlist ({', '.join(sorted(apps))})")
    return v


def _ax_app(v: Any, where: str, cfg: dict) -> str:
    procs = cfg.get("ax_processes", [])
    if v not in procs:
        raise JobError(f"{where}: {v!r} is not a process the agent may read ({', '.join(procs)})")
    return v


def _hide_app(v: Any, where: str, cfg: dict) -> str:
    if v not in cfg.get("hideable", []):
        raise JobError(f"{where}: {v!r} may not be hidden by the agent")
    return v


def _url(v: Any, where: str, cfg: dict) -> str:
    v = _plain_text(v, where, 500)
    for rule in cfg.get("urls", []):
        if v == rule.get("exact") or (rule.get("prefix") and v.startswith(rule["prefix"])):
            if rule.get("prefix") and re.search(r"[\s\"'<>\\`]", v):
                raise JobError(f"{where}: the URL has characters the allowlist doesn't take")
            return v
    raise JobError(f"{where}: URL {v!r} is not on the allowlist")


def _path(v: Any, where: str, cfg: dict) -> str:
    """A path is checked here for shape; the agent checks it again, resolved, against its roots before using it."""
    v = _plain_text(v, where, 400)
    if not (v.startswith("/") or v.startswith("~/")):
        raise JobError(f"{where}: {v!r} must be absolute (or start with ~/, the demo user's home)")
    parts = v.split("/")
    if any(p in ("..", ".") for p in parts):
        raise JobError(f"{where}: {v!r} may not contain '.' or '..'")
    return v


def _point(v: Any, where: str, cfg: dict):
    if isinstance(v, str):
        return _var(v, where, cfg)
    if not isinstance(v, dict):
        raise JobError(f"{where}: expected a point {{\"x\": …, \"y\": …}} or \"@name\"")
    if "ref" in v:
        _keys(v, {"ref", "dx", "dy"}, where)
        return {"ref": _var(v["ref"], f"{where}.ref", cfg), "dx": _num(-COORD_MAX, COORD_MAX)(v.get("dx", 0), f"{where}.dx", cfg),
                "dy": _num(-COORD_MAX, COORD_MAX)(v.get("dy", 0), f"{where}.dy", cfg)}
    _keys(v, {"x", "y"}, where, required={"x", "y"})
    return {"x": _num(0, COORD_MAX)(v["x"], f"{where}.x", cfg), "y": _num(0, COORD_MAX)(v["y"], f"{where}.y", cfg)}


def _rect(v: Any, where: str, cfg: dict) -> dict:
    if not isinstance(v, dict):
        raise JobError(f"{where}: expected a rectangle {{x, y, w, h}}")
    _keys(v, {"x", "y", "w", "h"}, where, required={"x", "y", "w", "h"})
    return {k: _num(0 if k in "xy" else 1, COORD_MAX)(v[k], f"{where}.{k}", cfg) for k in ("x", "y", "w", "h")}


def _circle(v: Any, where: str, cfg: dict) -> dict:
    if not isinstance(v, dict):
        raise JobError(f"{where}: expected {{cx, cy, r, turns}}")
    _keys(v, {"cx", "cy", "r", "turns"}, where, required={"cx", "cy", "r"})
    return {"cx": _num(0, COORD_MAX)(v["cx"], f"{where}.cx", cfg), "cy": _num(0, COORD_MAX)(v["cy"], f"{where}.cy", cfg),
            "r": _num(5, 2000)(v["r"], f"{where}.r", cfg), "turns": _num(0.25, 10)(v.get("turns", 1), f"{where}.turns", cfg)}


def _sync(v: Any, where: str, cfg: dict) -> dict:
    if not isinstance(v, dict):
        raise JobError(f"{where}: expected {{x, y, box}}")
    _keys(v, {"x", "y", "box"}, where, required={"x", "y"})
    return {"x": _num(0, COORD_MAX)(v["x"], f"{where}.x", cfg), "y": _num(0, COORD_MAX)(v["y"], f"{where}.y", cfg),
            "box": _num(8, 400)(v.get("box", 40), f"{where}.box", cfg)}


def _mods(v: Any, where: str, cfg: dict) -> list[str]:
    if not isinstance(v, list) or len(v) > len(MODS):
        raise JobError(f"{where}: expected a list of modifiers ({', '.join(MODS)})")
    for m in v:
        if m not in MODS:
            raise JobError(f"{where}: {m!r} is not a modifier ({', '.join(MODS)})")
    if len(set(v)) != len(v):
        raise JobError(f"{where}: a modifier is listed twice")
    return list(v)


def _key(v: Any, where: str, cfg: dict) -> str:
    if v not in KEYCODES:
        raise JobError(f"{where}: {v!r} is not a key the agent knows")
    return v


def _keys(obj: dict, allowed: set, where: str, required: set = frozenset()) -> None:
    extra = set(obj) - allowed
    if extra:
        raise JobError(f"{where}: unknown key(s) {', '.join(sorted(map(str, extra)))}")
    missing = required - set(obj)
    if missing:
        raise JobError(f"{where}: missing {', '.join(sorted(missing))}")


# ---- the vocabulary ----------------------------------------------------------------------------------------------
# Each action: {param: (checker, required)}. Every step may also carry "event" (a moment to log on the recording's
# clock: a click's press, a key's press, the first typed key, a move's start, any other step's start) and "note".

R, O = True, False
TIMEOUT = _num(0.1, 900)
VOCABULARY: dict[str, dict[str, tuple]] = {
    # waiting
    "wait": {"s": (_num(0, 600), R)},
    "wait_window": {"app": (_ax_app, R), "title": (_str(200), O), "title_contains": (_str(200), O), "gone": (_bool, O),
                    "timeout_s": (TIMEOUT, R)},
    "wait_element": {"app": (_ax_app, R), "role": (_role, O), "name": (_str(200), O), "contains": (_str(200), O),
                     "window_contains": (_str(200), O), "index": (_int(0, 50), O), "gone": (_bool, O),
                     "timeout_s": (TIMEOUT, R), "save_as": (_var, O)},
    "wait_file": {"path": (_path, R), "gone": (_bool, O), "timeout_s": (TIMEOUT, R)},
    # looking (read only)
    "find": {"app": (_ax_app, R), "role": (_role, O), "name": (_str(200), O), "contains": (_str(200), O),
             "window_contains": (_str(200), O), "index": (_int(0, 50), O), "save_as": (_var, R), "timeout_s": (TIMEOUT, O)},
    "ax_dump": {"app": (_ax_app, R), "window_contains": (_str(200), O), "max": (_int(10, 5000), O), "name": (_name, O)},
    "screen_info": {},
    "pointer": {},
    # the person's input: pointer and keys (real events, never painted)
    "move": {"to": (_point, R), "ms": (_int(60, 6000), O), "curve": (_num(0, 0.5), O)},
    "click": {"at": (_point, O), "ms": (_int(60, 6000), O), "button": (_enum("left", "right"), O), "count": (_int(1, 3), O),
              "hold_ms": (_int(20, 3000), O), "mods": (_mods, O)},
    "drag": {"from": (_point, R), "to": (_point, O), "circle": (_circle, O), "ms": (_int(150, 30000), O), "hold_ms": (_int(50, 3000), O)},
    "scroll": {"at": (_point, O), "lines": (_int(-60, 60), R), "ms": (_int(50, 10000), O)},
    "type": {"text": (_text, R), "cps": (_num(1, 25), O), "jitter": (_num(0, 0.6), O), "seed": (_int(0, 2**31 - 1), O)},
    "key": {"key": (_key, R), "mods": (_mods, O), "repeat": (_int(1, 30), O), "hold_ms": (_int(20, 3000), O), "gap_ms": (_int(20, 5000), O)},
    # apps, files and pages from the allowlists
    "open_app": {"app": (_app, R), "background": (_bool, O)},
    "open_file": {"path": (_path, R), "app": (_app, O)},
    "open_url": {"url": (_url, R), "app": (_app, O)},
    "activate": {"app": (_app, R)},
    "hide": {"app": (_hide_app, R)},
    # pictures
    "still": {"name": (_name, R), "region": (_rect, O)},
    "record_start": {"name": (_name, R), "max_s": (_int(3, 900), R), "method": (_enum("screencapture", "avfoundation"), O),
                     "stop_with": (_enum("key", "signal", "duration"), O), "display": (_int(1, 4), O)},
    "record_stop": {"name": (_name, O)},
    "mark": {"event": (_event, R)},
    "conform": {"name": (_name, R), "sync": (_sync, O)},
    # the sample world's own reset (reset_take.sh), and a note in the log
    "reset": {"what": (_enum(*RESET_WHAT), R)},
    "log": {"text": (_str(500), R)},
}
COMMON = {"do", "event", "note"}
TOP_KEYS = {"schema", "id", "take", "title", "steps", "max_minutes", "note"}


def validate_step(step: Any, i: int, cfg: dict, saved: set) -> dict:
    where = f"step {i + 1}"
    if not isinstance(step, dict):
        raise JobError(f"{where}: expected an object")
    action = step.get("do")
    if action not in VOCABULARY:
        raise JobError(f"{where}: unknown action {action!r} (the vocabulary: {', '.join(VOCABULARY)})")
    spec = VOCABULARY[action]
    where = f"step {i + 1} ({action})"
    _keys(step, set(spec) | COMMON, where, required={k for k, (_, req) in spec.items() if req})
    out: dict[str, Any] = {"do": action}
    if "event" in step:
        out["event"] = _event(step["event"], f"{where}.event", cfg)
    if "note" in step:
        out["note"] = _str(300)(step["note"], f"{where}.note", cfg)
    for k, (check, _) in spec.items():
        if k in step:
            out[k] = check(step[k], f"{where}.{k}", cfg)
    # cross-field rules
    if action == "wait_window" and "title" in out and "title_contains" in out:
        raise JobError(f"{where}: give title or title_contains, not both")
    if action in ("wait_element", "find") and not any(k in out for k in ("role", "name", "contains")):
        raise JobError(f"{where}: give at least one of role, name or contains")
    if action == "drag" and ("to" in out) == ("circle" in out):
        raise JobError(f"{where}: give exactly one of to or circle")
    if action == "wait_element" and out.get("gone") and "save_as" in out:
        raise JobError(f"{where}: an element that must be gone can't be saved")
    # a saved point must be saved by an earlier step of the same job
    for k in ("to", "at", "from"):
        ref = out.get(k)
        name = ref if isinstance(ref, str) else (ref.get("ref") if isinstance(ref, dict) else None)
        if name and name not in saved:
            raise JobError(f"{where}.{k}: {name} is not saved by an earlier find or wait_element step")
    if "save_as" in out:
        saved.add(out["save_as"])
    return out


def validate_job(obj: Any, cfg: dict) -> dict:
    """Returns the normalised job, or raises JobError naming the first problem."""
    if not isinstance(obj, dict):
        raise JobError("a job is a JSON object")
    _keys(obj, TOP_KEYS, "the job", required={"schema", "id", "steps"})
    if obj["schema"] != SCHEMA:
        raise JobError(f"schema must be {SCHEMA!r}")
    job: dict[str, Any] = {"schema": SCHEMA, "id": _re(ID_RE, "job id")(obj["id"], "id", cfg)}
    if "take" in obj:
        job["take"] = _re(re.compile(r"^[A-Za-z][A-Za-z0-9-]{0,15}$"), "take name")(obj["take"], "take", cfg)
    if "title" in obj:
        job["title"] = _str(200)(obj["title"], "title", cfg)
    if "note" in obj:
        job["note"] = _plain_text(obj["note"], "note", 2000, newlines=True)
    job["max_minutes"] = _num(1, 120)(obj.get("max_minutes", 30), "max_minutes", cfg)
    steps = obj["steps"]
    if not isinstance(steps, list) or not 1 <= len(steps) <= MAX_STEPS:
        raise JobError(f"steps: expected a list of 1 to {MAX_STEPS} steps")
    saved: set[str] = set()
    job["steps"] = [validate_step(s, i, cfg, saved) for i, s in enumerate(steps)]
    # a recording started here and stopped here must use one name; a conform needs a name
    started = [s["name"] for s in job["steps"] if s["do"] == "record_start"]
    if len(started) != len(set(started)):
        raise JobError("two record_start steps use the same name")
    return job


def _no_constants(c: str):
    raise JobError(f"{c} is not allowed in a job")


def parse_job_bytes(data: bytes, cfg: dict) -> dict:
    if len(data) > MAX_JOB_BYTES:
        raise JobError(f"the job file is {len(data)} bytes, more than {MAX_JOB_BYTES}")
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as e:
        raise JobError(f"not UTF-8: {e}") from None
    try:
        obj = json.loads(text, parse_constant=_no_constants)
    except json.JSONDecodeError as e:
        raise JobError(f"not valid JSON: {e}") from None
    return validate_job(obj, cfg)


def queue_name_ok(filename: str, job_id: str) -> bool:
    m = QUEUE_FILE_RE.match(filename)
    return bool(m) and m.group(2) == job_id


def load_config(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        cfg = json.load(f)
    for k in ("demo_user", "root", "apps", "ax_processes", "hideable", "urls"):
        if k not in cfg:
            raise ValueError(f"config {path}: missing {k}")
    return cfg


def expand_home(path: str, home: str) -> str:
    return home + path[1:] if path.startswith("~/") else path


def path_allowed(path: str, cfg: dict, home: str) -> str | None:
    """The resolved path if it is inside one of the allowed roots (the demo user's home, the takes folder,
    /Applications), else None. Symlinks are resolved first, so a link can't lead outside."""
    real = os.path.realpath(expand_home(path, home))
    roots = [os.path.realpath(expand_home(r, home)) for r in cfg.get("file_roots", [])]
    for r in roots:
        if real == r or real.startswith(r.rstrip("/") + "/"):
            return real
    return None
