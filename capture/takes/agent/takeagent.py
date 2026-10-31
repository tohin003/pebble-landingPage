"""The Pebble 2.0 film's take agent (RUNBOOK §10 B): it runs in the demo user's Terminal and records real takes while
the person is away, driven by job files the lead writes.

    python3 -I -B /Users/Shared/pebble-takes/agent/takeagent.py --live      (start.sh does this)

It watches /Users/Shared/pebble-takes/queue/ for job files and runs each once, in name order. A job is data in a fixed
vocabulary (jobspec.py): wait; move the pointer and click; type at a human pace; press a key or chord; open an app, a
file or a page from the allowlists; wait for a window, an element or a file; save a still; start and stop a recording;
mark an event; conform a take; reset the sample world. It never runs a command a job names, makes no network call of
its own and touches no path outside /Users/Shared/pebble-takes, the demo user's home and /Applications (and the
sample world's own reset script, read-only).

Safety:
- STOP: the moment /Users/Shared/pebble-takes/STOP exists (or Ctrl-C in its window), it lets go of any key or button,
  stops a running recording (keeping the file), writes the job's result and exits.
- PAUSE: while /Users/Shared/pebble-takes/PAUSE exists, it starts no new job.
- RESTART: when the lead writes /Users/Shared/pebble-takes/RESTART (after installing a fix), the agent, between jobs
  and with no recording running, starts itself again in the same Terminal process (exec), so it loads the new code
  at its new start and keeps Terminal's permissions; only the person's account can write that file.
- A malformed job is refused whole, before any step runs; a job runs at most once (its result folder marks it).
- It loads its code, its JXA helper and its config only at start, and checks the hashes of the scripts it runs
  (heavy.sh, env.sh, rec.sh, reset_take.sh) before each use.
- It posts input, records and takes stills only as the demo user (`--live`); anywhere else it simulates.
- Every action goes to log/agent.log with a timestamp.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import plistlib
import pwd
import random
import signal
import subprocess
import sys
import time
import traceback

HERE = os.path.dirname(os.path.realpath(__file__))
sys.path.insert(0, HERE)  # python -I leaves the script's folder off sys.path; this folder is the agent's own (read-only)

import jobspec  # noqa: E402
import macos  # noqa: E402
import media  # noqa: E402

VERSION = "1.0"


class Stop(Exception):
    """The kill switch (STOP, or a signal): stop everything and exit."""


class JobTimeout(Exception):
    pass


class StepFailed(Exception):
    pass


def now_iso() -> str:
    return dt.datetime.now().astimezone().isoformat(timespec="milliseconds")


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 16), b""):
            h.update(block)
    return h.hexdigest()


def write_json(path: str, obj) -> None:
    tmp = f"{path}.tmp{os.getpid()}"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False)
    os.replace(tmp, path)


# ---- the two UIs: live (the demo user's screen) and simulated (tests, any other account) -------------------------

class LiveUI:
    def __init__(self, agent: "Agent"):
        self.a = agent
        self.hands = macos.Hands(should_stop=agent.check_stop_bool, seed=int(time.time()))

    def ax(self, req: dict, timeout: float = 40) -> dict:
        try:
            r = subprocess.run([self.a.cfg["tools"]["osascript"], "-l", "JavaScript", "-", json.dumps(req)], input=self.a.ax_src,
                               capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired:
            raise StepFailed(f"the Accessibility helper took longer than {timeout:.0f} s ({req.get('cmd')} {req.get('app', '')})") from None
        try:
            out = json.loads(r.stdout.strip() or "{}")
        except json.JSONDecodeError:
            raise StepFailed(f"the Accessibility helper answered badly: {r.stderr.strip()[:300]}") from None
        if not out.get("ok"):
            raise StepFailed(f"Accessibility: {out.get('error') or r.stderr.strip()[:300]}")
        return out["result"]

    def pointer(self) -> tuple[float, float]:
        return macos.pointer_location()

    def screen(self) -> dict:
        return macos.screen_info()

    def open(self, args: list[str]) -> None:
        r = subprocess.run([self.a.cfg["tools"]["open"], *args], capture_output=True, text=True, timeout=30)
        if r.returncode != 0:
            raise StepFailed(f"open failed: {r.stderr.strip()[:300]}")

    def reset(self, what: str) -> str:
        script = os.path.join(self.a.cfg["world"], "setup", "reset_take.sh")
        self.a.check_integrity(script)
        r = subprocess.run([self.a.cfg["tools"]["bash"], script, what], capture_output=True, text=True, timeout=180)
        if r.returncode != 0:
            raise StepFailed(f"reset_take.sh {what} failed ({r.returncode}): {r.stderr.strip()[:300]}")
        return r.stdout.strip()[-300:]


class SimHands:
    """Stands in for macos.Hands: it moves an imaginary pointer and logs, posting nothing."""

    def __init__(self, ui: "SimUI"):
        self.ui = ui
        self.down_button = None

    def move(self, x, y, ms=None, curve=0.12):
        self.ui.calls.append(("move", round(x, 1), round(y, 1)))
        self.ui.at = (x, y)
        self.ui.a.sleep(min((ms or 300) / 1000, 0.01))

    def click(self, button="left", count=1, hold_ms=70, mods=None, on_press=None):
        if on_press:
            on_press()
        self.ui.calls.append(("click", button, count, tuple(mods or ())))

    def drag(self, pts, hold_ms=120):
        self.ui.calls.append(("drag", len(pts)))
        self.ui.at = pts[-1]

    def scroll(self, lines, ms=400):
        self.ui.calls.append(("scroll", lines))

    def key(self, keycode, mods, arrow, hold_ms=60, on_press=None):
        if on_press:
            on_press()
        self.ui.calls.append(("key", keycode, tuple(mods)))

    def type_text(self, text, cps, jitter, on_first=None):
        if on_first:
            on_first()
        for _ in text:
            self.ui.a.check_stop()
        self.ui.calls.append(("type", text))

    def release_all(self):
        self.ui.calls.append(("release_all",))


class SimUI:
    def __init__(self, agent: "Agent", fixture: dict | None = None):
        self.a = agent
        self.calls: list = []
        self.at = (100.0, 100.0)
        self.fixture = fixture or {}
        self.polls: dict = {}
        self.hands = SimHands(self)

    def ax(self, req: dict, timeout: float = 40) -> dict:
        key = f"{req['cmd']}:{req.get('app', '')}"
        seq = self.fixture.get(key)
        self.calls.append(("ax", req["cmd"], req.get("app")))
        if seq is None:
            return {"running": False, "matches": [], "windows": []} if req["cmd"] != "frontmost" else {"app": "Terminal"}
        i = self.polls.get(key, 0)
        self.polls[key] = i + 1
        return seq[min(i, len(seq) - 1)]

    def pointer(self):
        return self.at

    def screen(self):
        return {"display": 1, "points": {"x": 0, "y": 0, "w": 1280, "h": 832}, "pixels": {"w": 2560, "h": 1664},
                "scale": 2.0, "refresh_hz": 60.0, "simulated": True}

    def open(self, args):
        self.calls.append(("open", *args))

    def reset(self, what):
        self.calls.append(("reset", what))
        return "simulated"


# ---- the agent ----------------------------------------------------------------------------------------------------

class Agent:
    def __init__(self, cfg: dict, root: str, live: bool, fixture: dict | None = None, heavy: list[str] | None = None,
                 out=sys.stdout, home: str | None = None):
        self.cfg = cfg
        self.root = root
        self.live = live
        self.out = out
        self.user = pwd.getpwuid(os.getuid()).pw_name
        self.home = home or os.path.expanduser("~")
        self.signalled = False
        self.deadline: float | None = None
        self.ax_src = open(os.path.join(HERE, "ax.js"), encoding="utf-8").read()
        self.hashes: dict[str, str] = {}
        for d in ("log", "results", "queue", "raw", "conformed", "run"):
            os.makedirs(self.p(d), exist_ok=True)
        self.logf = open(self.p("log", "agent.log"), "a", encoding="utf-8", buffering=1)
        self.media = media.Media(cfg, root, self.log, live, heavy=heavy, should_stop=self.check_stop_bool)
        self.ui = LiveUI(self) if live else SimUI(self, fixture)
        self.state = {"state": "starting", "job": None}
        self.last_beat = 0.0
        self.started = now_iso()
        self.started_epoch = time.time()
        self.argv: list[str] = []
        self.pebble_version = self.read_pebble_version()

    # ---- basics -----------------------------------------------------------------------------------------------

    def p(self, *parts: str) -> str:
        return os.path.join(self.root, *parts)

    def log(self, msg: str) -> None:
        line = f"{now_iso()} {msg}"
        self.logf.write(line + "\n")

    def say(self, msg: str) -> None:
        print(msg, file=self.out, flush=True)
        self.log(f"said: {msg}")

    def read_pebble_version(self) -> dict:
        try:
            with open(os.path.join(self.cfg["pebble_app"], "Contents", "Info.plist"), "rb") as f:
                pl = plistlib.load(f)
            return {"version": pl.get("CFBundleShortVersionString"), "build": pl.get("CFBundleVersion"), "id": pl.get("CFBundleIdentifier")}
        except OSError as e:
            return {"error": str(e)}

    def sleep(self, s: float) -> None:
        end = time.monotonic() + s
        while True:
            self.check_stop()
            left = end - time.monotonic()
            if left <= 0:
                return
            time.sleep(min(left, 0.05))

    def stop_file(self) -> bool:
        return os.path.exists(self.p("STOP"))

    def check_stop_bool(self) -> bool:
        return self.signalled or self.stop_file() or (self.deadline is not None and time.monotonic() > self.deadline)

    def check_stop(self) -> None:
        if self.signalled or self.stop_file():
            raise Stop("STOP" if self.stop_file() else "a signal (Ctrl-C)")
        if self.deadline is not None and time.monotonic() > self.deadline:
            raise JobTimeout("the job ran past its max_minutes")

    def on_signal(self, signum, frame) -> None:
        self.signalled = True

    def beat(self, force: bool = False) -> None:
        if not force and time.monotonic() - self.last_beat < self.cfg.get("heartbeat_s", 5):
            return
        self.last_beat = time.monotonic()
        write_json(self.p("results", "agent.json"), {
            **self.state, "updated": now_iso(), "started": self.started, "pid": os.getpid(), "user": self.user,
            "mode": "live" if self.live else "simulate", "agent_version": VERSION, "pebble": self.pebble_version,
            "recording": self.media.recording.name if self.media.recording else None,
            "free_gib": round(media.free_gib(self.root), 2), "stop_file": self.stop_file(),
            "pause_file": os.path.exists(self.p("PAUSE")),
        })

    # ---- integrity of the scripts it runs ---------------------------------------------------------------------

    def record_hashes(self) -> None:
        for path in self.external_scripts():
            if os.path.exists(path):
                self.hashes[path] = sha256(path)

    def external_scripts(self) -> list[str]:
        return [self.p("scripts", "heavy.sh"), self.p("scripts", "env.sh"), os.path.join(HERE, "rec.sh"),
                os.path.join(self.cfg["world"], "setup", "reset_take.sh")]

    def check_integrity(self, path: str | None = None) -> None:
        for p in [path] if path else list(self.hashes):
            want = self.hashes.get(p)
            if want is None:
                raise StepFailed(f"{p} was not there when the agent started; it runs only what it hashed at start")
            if sha256(p) != want:
                raise StepFailed(f"{p} changed since the agent started; restart the agent to accept it")

    # ---- preflight (live) ------------------------------------------------------------------------------------

    def preflight(self) -> dict:
        res: dict = {"when": now_iso(), "user": self.user, "pebble": self.pebble_version, "checks": {}, "notes": []}
        c = res["checks"]
        c["demo_user"] = self.user == self.cfg["demo_user"]
        perms = macos.permissions()
        res["permissions"] = perms
        c["accessibility"] = perms["accessibility"] and perms["post_events"]
        c["screen_recording"] = perms["screen_recording"]
        try:
            fm = self.ui.ax({"cmd": "frontmost"}, timeout=20)
            c["system_events"] = True
            res["frontmost"] = fm.get("app")
        except (StepFailed, subprocess.TimeoutExpired) as e:
            c["system_events"] = False
            res["notes"].append(f"System Events: {e}")
        tools = self.cfg["tools"]
        c["tools"] = all(os.access(tools[k], os.X_OK) for k in ("ffmpeg", "ffprobe", "screencapture", "osascript", "open"))
        c["heavy_copy"] = os.path.exists(self.p("scripts", "heavy.sh")) and os.path.exists(self.p("scripts", "env.sh"))
        c["folders_writable"] = all(os.access(self.p(d), os.W_OK) for d in ("results", "raw", "conformed", "log", ".work"))
        c["sample_world"] = os.path.exists(os.path.join(self.cfg["world"], "setup", "reset_take.sh"))
        c["pebble_2"] = str(self.pebble_version.get("version", "")).startswith("2.")
        res["screen"] = self.ui.screen()
        res["free_gib"] = round(media.free_gib(self.root), 2)
        try:
            mp = subprocess.run(["/usr/bin/memory_pressure"], capture_output=True, text=True, timeout=20).stdout
            pct = [ln.split(":")[1].strip().rstrip("%") for ln in mp.splitlines() if "System-wide memory free percentage" in ln]
            res["memory_free_pct"] = int(pct[0]) if pct else None
        except (OSError, subprocess.TimeoutExpired, ValueError):
            res["memory_free_pct"] = None
        res["ok"] = all(c.values())
        return res

    def selftest_visible(self) -> None:
        """While the person watches: the pointer moves a little and back, and a still is saved. Proof it all works."""
        x, y = self.ui.pointer()
        self.ui.hands.move(x + 80 if x < 600 else x - 80, y, 400)
        self.ui.hands.move(x, y, 400)
        self.log(f"selftest: the pointer moved and came back to {x:.0f},{y:.0f}")
        os.makedirs(self.p("results", "preflight"), exist_ok=True)
        shot = self.p("results", "preflight", f"still-{dt.datetime.now():%H%M%S}.png")
        self.media.still(shot)

    # ---- the loop ---------------------------------------------------------------------------------------------

    def mark_interrupted(self) -> None:
        rdir = self.p("results")
        for jid in sorted(os.listdir(rdir)):
            d = os.path.join(rdir, jid)
            if os.path.isdir(d) and os.path.exists(os.path.join(d, "RUNNING")) and not os.path.exists(os.path.join(d, "result.json")):
                write_json(os.path.join(d, "result.json"), {"id": jid, "status": "interrupted", "ended": now_iso(),
                                                            "why": "the agent stopped while this job ran; it is never rerun"})
                os.unlink(os.path.join(d, "RUNNING"))
                self.log(f"job {jid}: marked interrupted (found running at start)")

    def pending(self) -> list[str]:
        try:
            names = sorted(n for n in os.listdir(self.p("queue")) if n.endswith(".json") and not n.startswith("."))
        except OSError:
            return []
        out = []
        for n in names:
            m = jobspec.QUEUE_FILE_RE.match(n)
            jid = m.group(2) if m else None
            if jid and os.path.exists(self.p("results", jid)):
                continue
            if not jid and os.path.exists(self.p("results", "_refused", n + ".json")):
                continue
            out.append(n)
        return out

    def run_forever(self, once: bool = False) -> int:
        self.mark_interrupted()
        self.state = {"state": "idle", "job": None}
        self.beat(force=True)
        self.log(f"agent {VERSION} up: {'live' if self.live else 'simulate'} as {self.user}, root {self.root}, Pebble {self.pebble_version.get('version')}")
        try:
            while True:
                self.check_stop()
                self.beat()
                if os.path.exists(self.p("PAUSE")):
                    if self.state.get("state") != "paused":
                        self.state = {"state": "paused", "job": None}
                        self.log("PAUSE: no new job starts until it is removed")
                        self.beat(force=True)
                    if once:
                        return 0
                    time.sleep(self.cfg.get("poll_s", 0.5))
                    continue
                if self.restart_requested():
                    self.restart()
                todo = self.pending()
                if not todo:
                    if self.state.get("state") != "idle":
                        self.state = {"state": "idle", "job": None}
                        self.beat(force=True)
                    if once:
                        return 0
                    time.sleep(self.cfg.get("poll_s", 0.5))
                    continue
                try:
                    self.take_job(todo[0])
                except Stop:
                    raise
                except Exception as e:  # noqa: BLE001 (never loop on a file that broke the agent)
                    self.log(f"job file {todo[0]}: agent error {type(e).__name__}: {e}")
                    m = jobspec.QUEUE_FILE_RE.match(todo[0])
                    self.refuse(todo[0], m.group(2) if m else None, [f"agent error: {type(e).__name__}: {e}"])
        except Stop as e:
            self.shutdown(str(e))
            return 3
        finally:
            self.beat(force=True)

    def restart_requested(self) -> bool:
        try:
            return os.path.getmtime(self.p("RESTART")) > self.started_epoch and not self.media.recording
        except OSError:
            return False

    def restart(self) -> None:
        """exec: the same process (so the same Terminal and its permissions), new code, a new start."""
        self.log("RESTART: starting again with the installed code")
        self.state = {"state": "restarting", "job": None}
        self.beat(force=True)
        self.logf.flush()
        args = [sys.executable, "-I", "-B", os.path.realpath(__file__), *self.argv]
        if self.live and "--restarted" not in args:
            args.append("--restarted")
        os.execv(sys.executable, args)

    def shutdown(self, why: str) -> None:
        self.log(f"stopping: {why}")
        try:
            self.ui.hands.release_all()
        except Exception as e:  # noqa: BLE001 (best effort: nothing may stay pressed)
            self.log(f"release_all: {e}")
        if self.media.recording:
            try:
                self.media.stop(reason=f"kill switch: {why}")
            except Exception as e:  # noqa: BLE001
                self.log(f"stopping the recording: {e}")
        self.state = {"state": "stopped", "job": None, "why": why}
        self.say(f"The take agent stopped ({why}).")

    def refuse(self, filename: str, fid: str | None, errors: list[str]) -> None:
        """A refused job's result goes where pending() looks: results/<the file's id>/, or results/_refused/ for a file
        whose name isn't [NNNN-]<id>.json. So a refused file is never read twice."""
        if fid and not os.path.exists(self.p("results", fid)):
            d, target = self.p("results", fid), self.p("results", fid, "result.json")
        else:
            d, target = self.p("results", "_refused"), self.p("results", "_refused", filename + ".json")
        os.makedirs(d, exist_ok=True)
        write_json(target, {"id": fid, "file": filename, "status": "refused", "errors": errors, "ended": now_iso()})
        self.log(f"job {filename}: REFUSED: {'; '.join(errors)}")

    def take_job(self, filename: str) -> None:
        path = self.p("queue", filename)
        m = jobspec.QUEUE_FILE_RE.match(filename)
        fid = m.group(2) if m else None
        try:
            if not fid:
                raise jobspec.JobError("the file name must be [NNNN-]<id>.json")
            if os.path.islink(path) or not os.path.isfile(path):
                raise jobspec.JobError("not a regular file")
            if os.lstat(path).st_size > jobspec.MAX_JOB_BYTES:
                raise jobspec.JobError(f"more than {jobspec.MAX_JOB_BYTES} bytes")
            with open(path, "rb") as f:
                data = f.read(jobspec.MAX_JOB_BYTES + 1)
            job = jobspec.parse_job_bytes(data, self.cfg)
            if job["id"] != fid:
                raise jobspec.JobError(f"the file name {filename!r} doesn't match the job id {job['id']!r} ([NNNN-]<id>.json)")
        except (jobspec.JobError, OSError) as e:
            self.refuse(filename, fid, [str(e)])
            return
        self.run_job(job)

    # ---- one job ----------------------------------------------------------------------------------------------

    def run_job(self, job: dict) -> dict:
        jid = job["id"]
        rdir = self.p("results", jid)
        os.makedirs(rdir)  # pending() checked it is new; a job runs once
        open(os.path.join(rdir, "RUNNING"), "w").close()
        write_json(os.path.join(rdir, "job.json"), job)
        self.state = {"state": "running", "job": jid, "since": now_iso()}
        self.beat(force=True)
        res = {"id": jid, "take": job.get("take"), "title": job.get("title"), "status": "running", "started": now_iso(),
               "mode": "live" if self.live else "simulate", "pebble": self.pebble_version, "steps": [], "vars": {}, "events": {}}
        ctx = {"job": job, "dir": rdir, "vars": {}, "t0": time.monotonic(), "res": res, "started_recording": None}
        self.log(f"job {jid}: start ({len(job['steps'])} steps){' — ' + job['title'] if job.get('title') else ''}")
        self.deadline = time.monotonic() + job["max_minutes"] * 60
        stop: Stop | None = None
        try:
            if self.live:
                self.hide_terminal()
            for i, step in enumerate(job["steps"]):
                self.check_stop()
                self.beat()
                rec = {"i": i + 1, "do": step["do"], "t": round(time.monotonic() - ctx["t0"], 3), "wall": now_iso()}
                if self.media.recording:
                    rec["t_rec"] = round(self.media.recording.rel(), 3)
                    self.media.recording.actions.append({"t": rec["t_rec"], "do": step["do"], "job": jid, "i": i + 1})
                if "if" in step and step["if"] not in ctx["vars"]:
                    rec.update(ok=True, skipped=f"{step['if']} was not found")
                    res["steps"].append(rec)
                    self.log(f"job {jid} step {i + 1}: skipped ({step['if']} was not found): {step['do']}")
                    continue
                self.log(f"job {jid} step {i + 1}: {self.describe(step)}")
                try:
                    detail = getattr(self, "do_" + step["do"])(step, ctx)
                except StepFailed as e:
                    rec.update(ok=False, error=str(e))
                    res["steps"].append(rec)
                    raise
                rec["ok"] = True
                if detail:
                    rec["detail"] = detail
                rec["took"] = max(0.0, round(time.monotonic() - ctx["t0"] - rec["t"], 3))
                res["steps"].append(rec)
            res["status"] = "done"
        except StepFailed as e:
            res["status"] = "failed"
            res["error"] = str(e)
            self.log(f"job {jid}: FAILED: {e}")
        except JobTimeout as e:
            res["status"] = "failed"
            res["error"] = str(e)
            self.log(f"job {jid}: TIMEOUT: {e}")
        except Stop as e:
            res["status"] = "stopped"
            res["error"] = f"the kill switch: {e}"
            stop = e
        except InterruptedError:
            # the hands noticed the kill switch or the deadline between two events
            if self.signalled or self.stop_file():
                stop = Stop("STOP" if self.stop_file() else "a signal (Ctrl-C)")
                res["status"], res["error"] = "stopped", f"the kill switch: {stop}"
            else:
                res["status"], res["error"] = "failed", "the job ran past its max_minutes"
            self.log(f"job {jid}: {res['error']}")
        except Exception as e:  # noqa: BLE001 (a bug must still leave a result and stop the take cleanly)
            res["status"] = "failed"
            res["error"] = f"{type(e).__name__}: {e}"
            res["trace"] = traceback.format_exc()[-2000:]
            self.log(f"job {jid}: ERROR: {e}")
        finally:
            self.deadline = None
            try:
                self.ui.hands.release_all()
            except Exception:  # noqa: BLE001
                pass
            if res["status"] != "done" and ctx["started_recording"] and self.media.recording \
                    and self.media.recording.name == ctx["started_recording"]:
                try:
                    why = f"the kill switch ({stop})" if stop else f"the job ended: {res['status']}"
                    res["recording_stopped"] = self.media.stop(reason=why).get("stopped_by")
                except Exception as e:  # noqa: BLE001
                    res["recording_stop_error"] = str(e)
            res["vars"] = ctx["vars"]
            res["ended"] = now_iso()
            res["seconds"] = round(time.monotonic() - ctx["t0"], 3)
            write_json(os.path.join(rdir, "result.json"), res)
            try:
                os.unlink(os.path.join(rdir, "RUNNING"))
            except OSError:
                pass
            self.state = {"state": "idle", "job": None, "last_job": jid, "last_status": res["status"]}
            self.beat(force=True)
            self.log(f"job {jid}: {res['status']} in {res['seconds']} s")
        if stop:
            raise stop
        return res

    def describe(self, step: dict) -> str:
        s = dict(step)
        if s.get("do") == "type":
            s["text"] = f"{len(step['text'])} characters: {step['text'][:60]}"
        return json.dumps(s, ensure_ascii=False)[:400]

    def hide_terminal(self) -> None:
        """The agent's own window stays out of every take: hidden before each job (idempotent)."""
        try:
            was_front = self.ui.ax({"cmd": "frontmost"}, timeout=15).get("app") == "Terminal"
            self.ui.ax({"cmd": "hide", "app": "Terminal"}, timeout=15)
            if was_front:
                self.sleep(0.4)
        except (StepFailed, subprocess.TimeoutExpired) as e:
            self.log(f"could not hide Terminal: {e}")

    # ---- helpers for steps ------------------------------------------------------------------------------------

    def mark(self, ctx: dict, event: str) -> None:
        t_job = round(time.monotonic() - ctx["t0"], 4)
        entry = {"job_s": t_job, "wall": now_iso()}
        rec = self.media.recording
        if rec:
            rec.events[event] = round(rec.rel(), 4)
            entry["rec_s"] = rec.events[event]
            entry["recording"] = rec.name
        ctx["res"]["events"][event] = entry
        self.log(f"event {event}" + (f" at {entry['rec_s']:.3f} s on {rec.name}" if rec else ""))

    def on_event(self, step: dict, ctx: dict):
        ev = step.get("event")
        return (lambda: self.mark(ctx, ev)) if ev else None

    def bounds(self) -> dict:
        return self.ui.screen()["points"]

    def resolve(self, pt, ctx: dict) -> tuple[float, float]:
        if isinstance(pt, str):
            base = ctx["vars"].get(pt)
            if not base:
                raise StepFailed(f"{pt} was not found by an earlier step")
            x, y = base["x"], base["y"]
        elif "ref" in pt:
            base = ctx["vars"].get(pt["ref"])
            if not base:
                raise StepFailed(f"{pt['ref']} was not found by an earlier step")
            x, y = base["x"] + pt["dx"], base["y"] + pt["dy"]
        else:
            x, y = pt["x"], pt["y"]
        b = self.bounds()
        if not (b["x"] <= x <= b["x"] + b["w"] - 1 and b["y"] <= y <= b["y"] + b["h"] - 1):
            raise StepFailed(f"the point {x:.0f},{y:.0f} is off the screen ({b['w']:.0f} × {b['h']:.0f} points)")
        return x, y

    def glide(self, x: float, y: float, ms: int | None, curve: float, step: dict, ctx: dict) -> None:
        x0, y0 = self.ui.pointer()
        rec = self.media.recording
        if rec and (abs(x - x0) > 1 or abs(y - y0) > 1):
            rec.moves.append({"t": round(rec.rel(), 4), "x0": round(x0, 1), "y0": round(y0, 1), "x1": round(x, 1), "y1": round(y, 1)})
        self.ui.hands.move(x, y, ms, curve)

    def app_path(self, app: str) -> str:
        return jobspec.expand_home(self.cfg["apps"][app], self.home)

    def allowed(self, path: str) -> str:
        real = jobspec.path_allowed(path, self.cfg, self.home)
        if not real:
            raise StepFailed(f"{path} is outside the agent's folders (the demo user's home, {self.root}, /Applications)")
        return real

    def ax_find(self, step: dict, budget_ms: int = 6000) -> dict:
        q = {"cmd": "find", "app": step["app"], "ms": budget_ms}
        for k in ("role", "name", "contains", "window_contains"):
            if k in step:
                q[k] = step[k]
        return self.ui.ax(q, timeout=budget_ms / 1000 + 20)

    def wait_for_element(self, step: dict, ctx: dict, timeout: float) -> dict | None:
        """Polls until the element is there (or gone). A read that fails (an app launching or quitting, a slow tree)
        is retried until the timeout; "gone" counts only when the app is not running, or a read saw elements."""
        end = time.monotonic() + timeout
        idx = step.get("index", 0)
        last: dict = {}
        last_error = None
        while True:
            self.check_stop()
            try:
                r = self.ax_find(step, step.get("budget_ms", 6000))
                last, last_error = r, None
                ms = r.get("matches", [])
                if step.get("gone"):
                    if not r.get("running", True) or (not ms and (r.get("seen") or 0) > 0):
                        return {"gone": True, "seen": r.get("seen"), "running": r.get("running", True)}
                elif len(ms) > idx:
                    return ms[idx]
            except StepFailed as e:
                last_error = str(e)
            if time.monotonic() > end:
                raise StepFailed(f"{'still there' if step.get('gone') else 'not found'} after {timeout:.0f} s "
                                 f"({step['app']}: {', '.join(f'{k}={step[k]!r}' for k in ('role', 'name', 'contains') if k in step)}; "
                                 f"{len(last.get('matches', []))} matches, {last.get('seen')} elements read"
                                 + (f"; last read failed: {last_error}" if last_error else "") + ")")
            self.sleep(0.3)

    # ---- the vocabulary ---------------------------------------------------------------------------------------

    def do_wait(self, s, ctx):
        if s.get("event"):
            self.mark(ctx, s["event"])
        self.sleep(s["s"])

    def do_wait_window(self, s, ctx):
        end = time.monotonic() + s["timeout_s"]
        titles: list = []
        while True:
            self.check_stop()
            try:
                r = self.ui.ax({"cmd": "windows", "app": s["app"]}, timeout=20)
            except StepFailed as e:  # the app may still be launching or quitting: read again until the timeout
                if time.monotonic() > end:
                    raise StepFailed(f"{s['app']}: no answer about its windows within {s['timeout_s']:.0f} s ({e})") from None
                self.sleep(0.5)
                continue
            titles = [w.get("title") or "" for w in r.get("windows", [])]
            if "title" in s:
                hit = s["title"] in titles
            elif "title_contains" in s:
                hit = any(s["title_contains"] in t for t in titles)
            else:
                hit = bool(titles)
            if hit != bool(s.get("gone")):
                if s.get("event"):
                    self.mark(ctx, s["event"])
                return {"windows": titles[:12]}
            if time.monotonic() > end:
                raise StepFailed(f"{s['app']}: the window {'is still there' if s.get('gone') else 'did not appear'} "
                                 f"within {s['timeout_s']:.0f} s (windows: {titles[:6]})")
            self.sleep(0.25)

    def do_wait_element(self, s, ctx):
        try:
            m = self.wait_for_element(s, ctx, s["timeout_s"])
        except StepFailed as e:
            if s.get("optional"):
                return {"optional": True, "found": False, "why": str(e)}
            raise
        if s.get("event"):
            self.mark(ctx, s["event"])
        if "save_as" in s and m and m.get("centre"):
            ctx["vars"][s["save_as"]] = self.anchor_point(m, s.get("anchor", "centre"))
        return m

    def do_find(self, s, ctx):
        try:
            m = self.wait_for_element(s, ctx, s.get("timeout_s", 10))
        except StepFailed as e:
            if s.get("optional"):
                return {"optional": True, "found": False, "why": str(e)}
            raise
        if not m or not m.get("centre"):
            raise StepFailed("the element has no position on screen")
        ctx["vars"][s["save_as"]] = self.anchor_point(m, s.get("anchor", "centre"))
        return m

    @staticmethod
    def anchor_point(m: dict, anchor: str) -> dict:
        c = dict(m["centre"])
        if anchor == "centre" or m.get("w") is None or m.get("h") is None:
            return c
        inset_x, inset_y = min(10, m["w"] / 2), min(10, m["h"] / 2)
        return {"top": {"x": c["x"], "y": m["y"] + inset_y}, "bottom": {"x": c["x"], "y": m["y"] + m["h"] - inset_y},
                "left": {"x": m["x"] + inset_x, "y": c["y"]}, "right": {"x": m["x"] + m["w"] - inset_x, "y": c["y"]}}[anchor]

    def do_wait_file(self, s, ctx):
        path = self.allowed(s["path"])
        end = time.monotonic() + s["timeout_s"]
        while os.path.exists(path) == bool(s.get("gone")):
            if time.monotonic() > end:
                raise StepFailed(f"{s['path']} {'is still there' if s.get('gone') else 'did not appear'} within {s['timeout_s']:.0f} s")
            self.sleep(0.25)
        if s.get("event"):
            self.mark(ctx, s["event"])

    def do_ax_dump(self, s, ctx):
        q = {"cmd": "dump", "app": s["app"], "max": s.get("max", 1500), "ms": 30000}
        if "window_contains" in s:
            q["window_contains"] = s["window_contains"]
        r = self.ui.ax(q, timeout=75)
        out = os.path.join(ctx["dir"], f"ax-{s.get('name') or s['app'].replace(' ', '-')}.json")
        write_json(out, r)
        return {"file": os.path.relpath(out, self.root), "windows": [(w["title"], w["seen"]) for w in r.get("windows", [])]}

    def do_screen_info(self, s, ctx):
        return self.ui.screen()

    def do_pointer(self, s, ctx):
        x, y = self.ui.pointer()
        return {"x": round(x, 1), "y": round(y, 1)}

    def do_move(self, s, ctx):
        x, y = self.resolve(s["to"], ctx)
        if s.get("event"):
            self.mark(ctx, s["event"])
        self.glide(x, y, s.get("ms"), s.get("curve", 0.12), s, ctx)
        return {"to": [round(x, 1), round(y, 1)]}

    def do_click(self, s, ctx):
        if "at" in s:
            x, y = self.resolve(s["at"], ctx)
            self.glide(x, y, s.get("ms"), 0.12, s, ctx)
            self.sleep(0.08)
        self.ui.hands.click(s.get("button", "left"), s.get("count", 1), s.get("hold_ms", 70), s.get("mods"), on_press=self.on_event(s, ctx))
        x, y = self.ui.pointer()
        return {"at": [round(x, 1), round(y, 1)]}

    def do_drag(self, s, ctx):
        x0, y0 = self.resolve(s["from"], ctx)
        ms = s.get("ms", 900)
        rng = random.Random(7)
        if "to" in s:
            x1, y1 = self.resolve(s["to"], ctx)
            pts = macos.path_points(x0, y0, x1, y1, ms, 0.08, rng)
        else:
            c = s["circle"]
            ring = macos.circle_points(c["cx"], c["cy"], c["r"], c["turns"], ms)
            pts = macos.path_points(x0, y0, ring[0][0], ring[0][1], 300, 0.05, rng) + ring
        for (px, py) in pts:  # every point of the path must be on the screen
            self.resolve({"x": max(0.0, px), "y": max(0.0, py)}, ctx)
        self.glide(x0, y0, None, 0.12, s, ctx)
        if s.get("event"):
            self.mark(ctx, s["event"])
        self.ui.hands.drag(pts, s.get("hold_ms", 120))
        return {"points": len(pts)}

    def do_scroll(self, s, ctx):
        if "at" in s:
            x, y = self.resolve(s["at"], ctx)
            self.glide(x, y, None, 0.1, s, ctx)
        if s.get("event"):
            self.mark(ctx, s["event"])
        self.ui.hands.scroll(s["lines"], s.get("ms", 400))

    def do_type(self, s, ctx):
        t = self.cfg.get("typing", {})
        if self.live and "seed" in s:
            self.ui.hands.rng.seed(s["seed"])
        self.ui.hands.type_text(s["text"], s.get("cps", t.get("cps", 6.5)), s.get("jitter", t.get("jitter", 0.35)), on_first=self.on_event(s, ctx))
        return {"characters": len(s["text"])}

    def do_key(self, s, ctx):
        code = jobspec.KEYCODES[s["key"]]
        arrow = s["key"] in jobspec.ARROWS
        for n in range(s.get("repeat", 1)):
            self.ui.hands.key(code, s.get("mods", []), arrow, s.get("hold_ms", 60), on_press=self.on_event(s, ctx) if n == 0 else None)
            if n + 1 < s.get("repeat", 1):
                self.sleep(s.get("gap_ms", 140) / 1000)

    def do_open_app(self, s, ctx):
        if s.get("event"):
            self.mark(ctx, s["event"])
        self.ui.open((["-g"] if s.get("background") else []) + ["-a", self.app_path(s["app"])])

    def do_open_file(self, s, ctx):
        real = self.allowed(s["path"])
        if not os.path.exists(real):
            raise StepFailed(f"{s['path']} doesn't exist")
        if s.get("event"):
            self.mark(ctx, s["event"])
        self.ui.open((["-a", self.app_path(s["app"])] if "app" in s else []) + [real])

    def do_open_url(self, s, ctx):
        if s.get("event"):
            self.mark(ctx, s["event"])
        self.ui.open(["-a", self.app_path(s.get("app", "Google Chrome")), s["url"]])

    def do_activate(self, s, ctx):
        if s.get("event"):
            self.mark(ctx, s["event"])
        self.ui.open(["-a", self.app_path(s["app"])])

    def do_hide(self, s, ctx):
        return self.ui.ax({"cmd": "hide", "app": s["app"]}, timeout=15)

    def do_still(self, s, ctx):
        if s.get("event"):
            self.mark(ctx, s["event"])
        out = os.path.join(ctx["dir"], f"{s['name']}.png")
        try:
            r = self.media.still(out, s.get("region"))
        except media.MediaError as e:
            raise StepFailed(str(e)) from None
        r["path"] = os.path.relpath(out, self.root)
        return r

    def do_record_start(self, s, ctx):
        try:
            self.check_integrity()
            rec = self.media.start(s["name"], s["max_s"], s.get("method", "screencapture"), s.get("stop_with", "key"),
                                   s.get("display", 1), ctx["job"]["id"], ctx["job"].get("take"), self.ui.screen())
        except media.MediaError as e:
            raise StepFailed(str(e)) from None
        ctx["started_recording"] = rec.name
        if s.get("event"):
            self.mark(ctx, s["event"])
        return {"name": rec.name, "started": rec.started_wall}

    def do_record_stop(self, s, ctx):
        rec = self.media.recording
        if not rec:
            raise StepFailed("no recording is running")
        if "name" in s and s["name"] != rec.name:
            raise StepFailed(f"the running recording is {rec.name}, not {s['name']}")
        if s.get("event"):
            self.mark(ctx, s["event"])
        meta = self.media.stop()
        self.takelog_recorded(meta)
        if meta.get("error"):
            raise StepFailed(meta["error"])
        return {k: meta.get(k) for k in ("name", "stopped_by", "probe")}

    def do_mark(self, s, ctx):
        self.mark(ctx, s["event"])

    def do_conform(self, s, ctx):
        if self.media.recording and self.media.recording.name == s["name"]:
            raise StepFailed(f"{s['name']} is still recording; stop it first")
        try:
            self.check_integrity()
            r = self.media.conform(s["name"], s.get("sync"))
        except media.MediaError as e:
            raise StepFailed(str(e)) from None
        self.takelog_conformed(s["name"], r)
        d = r["_detail"]
        if not d["ok"]:
            raise StepFailed(f"the conform's checks failed: {[k for k, v in d['checks'].items() if not v]}")
        return {"file": f"conformed/{s['name']}.mp4", "record": f"conformed/{s['name']}.conform.json",
                "source_s": r["sourceDurationS"], "output_s": r["outputDurationS"], "frames": d["frames"],
                "sync": d["sync"].get("lag_s") if d["sync"].get("found") else None}

    def do_reset(self, s, ctx):
        return {"output": self.ui.reset(s["what"])}

    def do_log(self, s, ctx):
        self.log(f"note: {s['text']}")

    # ---- the take log (RUNBOOK §8: log/takes.md) --------------------------------------------------------------

    def takelog_recorded(self, meta: dict) -> None:
        pr = meta.get("probe") or {}
        lines = [f"\n## {meta['name']} ({meta.get('take') or 'no take'}, job {meta.get('job')})",
                 f"- build: Pebble {self.pebble_version.get('version')} ({self.pebble_version.get('build')})",
                 f"- recorded: {meta.get('started')}, {meta.get('method')}, stopped by {meta.get('stopped_by', 'n/a')}"
                 + (" (SIMULATED)" if meta.get("simulated") else "")]
        if pr:
            lines.append(f"- raw: {meta['raw']}, {pr.get('duration_s', 0):.3f} s, {pr.get('frames')} frames "
                         f"({pr.get('fps_average')} fps on average), largest gap {pr.get('gap_max_s')} s, "
                         f"{pr.get('bytes', 0) / 2**20:.0f} MB ({pr.get('mb_per_min')} MB a minute), {pr.get('width')} × {pr.get('height')}")
        if meta.get("events"):
            lines.append("- events (agent clock, s from the recorder's start): "
                         + ", ".join(f"{k} {v:.3f}" for k, v in sorted(meta["events"].items(), key=lambda kv: kv[1])))
        if meta.get("error"):
            lines.append(f"- error: {meta['error']}")
        lines.append("- verdict: (the lead, after RUNBOOK §8: kept or rejected, and why)")
        self.append_takelog("\n".join(lines) + "\n", {"kind": "recorded", **{k: meta.get(k) for k in ("name", "take", "job", "started", "stopped_by")}, "probe": pr})

    def takelog_conformed(self, name: str, r: dict) -> None:
        d = r["_detail"]
        sync = d["sync"]
        line = (f"- conformed ({now_iso()}): conformed/{name}.mp4, {r['outputDurationS']:.3f} s from {r['sourceDurationS']:.3f} s, "
                f"{d['frames']} frames at {d['fps']} fps; checks {'pass' if d['ok'] else 'FAIL ' + str([k for k, v in d['checks'].items() if not v])}; "
                + (f"sync: the recorder started {sync['lag_s']:.3f} s after the agent's clock (frame {sync['frame']})" if sync.get("found") else f"sync: not found ({sync.get('why')})")
                + "; events on the recording's clock: " + (", ".join(f"{k} {v['wallS']:.3f} s (frame {v['frame']})" for k, v in d["events"].items()) or "none"))
        self.append_takelog(line + "\n", {"kind": "conformed", "name": name, "ok": d["ok"], "checks": d["checks"],
                                          "source_s": r["sourceDurationS"], "output_s": r["outputDurationS"], "sync": sync})

    def append_takelog(self, md: str, entry: dict) -> None:
        with open(self.p("log", "takes.md"), "a", encoding="utf-8") as f:
            if f.tell() == 0:
                f.write("# The take log (RUNBOOK §8)\n\nWritten by the take agent as it records and conforms; the lead adds each "
                        "take's verdict (capture/takes/takelog.py).\n")
            f.write(md)
        with open(self.p("log", "takes.jsonl"), "a", encoding="utf-8") as f:
            f.write(json.dumps({"when": now_iso(), **entry}, ensure_ascii=False) + "\n")


# ---- entry point --------------------------------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="The Pebble film's take agent (RUNBOOK §10 B)")
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--live", action="store_true", help="the demo user's real screen (refused in any other account)")
    mode.add_argument("--simulate", action="store_true", help="validate and walk jobs without input, recording or stills")
    ap.add_argument("--root", help="the takes folder (default: the config's root)")
    ap.add_argument("--config", default=os.path.join(HERE, "config.json"))
    ap.add_argument("--once", action="store_true", help="run what is queued, then exit (tests)")
    ap.add_argument("--fixture", help="simulate: a JSON file of Accessibility answers")
    ap.add_argument("--heavy", help="simulate/tests: a pass-through runner instead of heavy.sh (never in live mode)")
    ap.add_argument("--home", help="simulate/tests: the demo user's home stand-in (never in live mode)")
    ap.add_argument("--no-selftest", action="store_true", help="live: skip the visible pointer test at start")
    ap.add_argument("--restarted", action="store_true", help="set by a RESTART: no pointer test, caffeinate already runs")
    a = ap.parse_args(argv)
    cfg = jobspec.load_config(a.config)
    root = os.path.realpath(a.root or cfg["root"])
    os.umask(0o002)  # results, takes and log entries stay readable and appendable by the lead (group staff)
    user = pwd.getpwuid(os.getuid()).pw_name
    if a.live:
        if a.heavy or a.fixture or a.root or a.home:
            print("takeagent: --heavy, --fixture, --root and --home are for tests; live mode always uses the installed folder.", file=sys.stderr)
            return 64
        if user != cfg["demo_user"] or not macos.arm(cfg["demo_user"]):
            print(f"takeagent: this is the account '{user}'. The take agent runs live only in the demo user "
                  f"'{cfg['demo_user']}'. Nothing was done.", file=sys.stderr)
            return 64
    fixture = json.load(open(a.fixture, encoding="utf-8")) if a.fixture else None
    heavy = [a.heavy] if a.heavy else None
    agent = Agent(cfg, root, a.live, fixture=fixture, heavy=heavy, home=os.path.realpath(a.home) if a.home else None)
    agent.argv = list(argv if argv is not None else sys.argv[1:])
    agent.record_hashes()
    for sig in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        signal.signal(sig, agent.on_signal)
    if a.live:
        agent.say("Pebble take agent: checking permissions …")
        pf = agent.preflight()
        write_json(agent.p("results", "preflight.json"), pf)
        # Only what the person must fix stops the start; anything else is a warning the lead reads in preflight.json
        # and can fix without the person (install.sh, then RESTART).
        must = {"demo_user", "accessibility", "screen_recording"}
        if not pf["checks"].get("system_events") and any(("1743" in n or "not allowed" in n.lower() or "Not authori" in n)
                                                         for n in pf.get("notes", [])):
            must.add("system_events")  # Terminal was refused control of System Events: only the person can allow it
        missing = [k for k, v in pf["checks"].items() if not v and k in must]
        warnings = [k for k, v in pf["checks"].items() if not v and k not in must]
        if missing:
            hints = {
                "accessibility": "System Settings › Privacy & Security › Accessibility: turn Terminal on.",
                "screen_recording": "System Settings › Privacy & Security › Screen & System Audio Recording: turn Terminal on, then quit and reopen Terminal.",
                "system_events": "Allow Terminal to control System Events when macOS asks (Privacy & Security › Automation › Terminal › System Events).",
                "tools": "FFmpeg or a macOS tool is missing: tell the lead.",
                "heavy_copy": "The takes folder is incomplete: tell the lead.",
                "folders_writable": "The takes folders aren't writable by this account: tell the lead.",
                "sample_world": "The sample world is missing from /Users/Shared: tell the lead.",
                "pebble_2": "Pebble 2.0 is not in /Applications: tell the lead.",
                "demo_user": "Run this in the Studio user.",
            }
            agent.say("Not ready. Fix these, then start the agent again (bash /Users/Shared/pebble-takes/agent/start.sh):")
            for k in missing:
                agent.say(f"  - {hints.get(k, k)}")
            return 2
        if warnings:
            agent.say(f"Starting with warnings for the lead ({', '.join(warnings)}); nothing for you to do.")
        if not a.no_selftest and not a.restarted:
            agent.say("Permissions are fine. Watch the pointer: it moves a little and comes back …")
            try:
                agent.selftest_visible()
            except media.MediaError as e:
                agent.say(f"(The test picture failed: {e}. The lead will see it; nothing for you to do.)")
            except Exception as e:  # noqa: BLE001 (the pointer itself failed: the person must see this)
                agent.say(f"The pointer test failed: {e}. Check Accessibility for Terminal, then start again.")
                return 2
        if not a.restarted:  # caffeinate waits on this pid, which an exec keeps
            subprocess.Popen([cfg["tools"]["caffeinate"], "-dimsu", "-w", str(os.getpid())])
        agent.say("Ready. The take agent now waits for the lead's jobs. This window hides itself before each take.\n"
                  "You can leave the Mac now (keep it on this user's screen, plugged in).\n"
                  "To stop it: come back, click Terminal in the Dock, press Control-C.")
    return agent.run_forever(once=a.once)


if __name__ == "__main__":
    sys.exit(main())
