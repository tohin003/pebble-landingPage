"""Headless tests of the take agent (capture/takes/README.md, "Tests"). They run in ANY account, and never post input,
record, take a still or read another app's UI: the agent runs in simulate mode, the live mode is checked only for its
refusal, and the conform runs on synthetic clips made here.

    /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 -I -B -m unittest discover -s capture/takes/tests -v
"""

from __future__ import annotations

import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest

HERE = os.path.dirname(os.path.realpath(__file__))
AGENT = os.path.join(os.path.dirname(HERE), "agent")
TAKES = os.path.dirname(HERE)
sys.path.insert(0, AGENT)
sys.path.insert(0, TAKES)

import jobspec  # noqa: E402
import macos  # noqa: E402
import media  # noqa: E402

PY = sys.executable
FAKE_HEAVY = os.path.join(HERE, "fake_heavy.sh")
FFMPEG = "/opt/homebrew/bin/ffmpeg"
CFG = jobspec.load_config(os.path.join(AGENT, "config.json"))


def job(steps, jid="t1", **kw):
    return {"schema": jobspec.SCHEMA, "id": jid, "steps": steps, **kw}


def make_root() -> str:
    root = tempfile.mkdtemp(prefix="takes-test-", dir=os.environ.get("TMPDIR", "/tmp"))
    for d in ("queue", "results", "log", "raw", "conformed", "run", ".work", "scripts"):
        os.makedirs(os.path.join(root, d))
    return root


def enqueue_raw(root: str, name: str, obj) -> None:
    with open(os.path.join(root, "queue", name), "w", encoding="utf-8") as f:
        f.write(obj if isinstance(obj, str) else json.dumps(obj))


def run_agent(root: str, *extra: str, timeout: float = 60) -> subprocess.CompletedProcess:
    return subprocess.run([PY, "-I", "-B", os.path.join(AGENT, "takeagent.py"), "--simulate", "--root", root, "--once",
                           "--heavy", FAKE_HEAVY, *extra], capture_output=True, text=True, timeout=timeout)


def load(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def read(path: str) -> str:
    with open(path, encoding="utf-8") as f:
        return f.read()


def dump(obj, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f)


def result(root: str, jid: str) -> dict:
    return load(os.path.join(root, "results", jid, "result.json"))


class TestJobSpec(unittest.TestCase):
    def ok(self, steps, **kw):
        return jobspec.validate_job(job(steps, **kw), CFG)

    def bad(self, obj, needle):
        with self.assertRaises(jobspec.JobError) as cm:
            jobspec.validate_job(obj, CFG)
        self.assertIn(needle, str(cm.exception))

    def test_a_good_job(self):
        j = self.ok([
            {"do": "record_start", "name": "RS4-01", "max_s": 90},
            {"do": "find", "app": "Pebble", "role": "AXButton", "name": "Allow", "save_as": "@allow"},
            {"do": "click", "at": "@allow", "event": "allow"},
            {"do": "click", "at": {"ref": "@allow", "dx": -80, "dy": 0}},
            {"do": "type", "text": "What's 48 × 12.5? Use Calculator.", "event": "typed"},
            {"do": "key", "key": "k", "mods": ["cmd"]},
            {"do": "key", "key": "right", "mods": ["ctrl"]},
            {"do": "open_url", "url": "file:///Users/studio/Projects/studio-bookings/site/index.html"},
            {"do": "open_file", "path": "~/Documents/Open day/poster-screen.png", "app": "Preview"},
            {"do": "drag", "from": {"x": 600, "y": 40}, "circle": {"cx": 640, "cy": 400, "r": 120, "turns": 2}, "ms": 4000},
            {"do": "wait_window", "app": "Calculator", "title": "Calculator", "timeout_s": 10},
            {"do": "record_stop"}, {"do": "conform", "name": "RS4-01"}, {"do": "reset", "what": "calculator"},
        ], take="RS-4", title="Calculator", max_minutes=10)
        self.assertEqual(j["steps"][2]["at"], "@allow")
        self.assertEqual(j["steps"][0]["max_s"], 90)
        self.assertIsInstance(j["steps"][9]["from"]["x"], float)

    def test_refusals(self):
        cases = [
            (job([{"do": "shell", "cmd": "ls"}]), "unknown action"),
            (job([{"do": "wait", "s": 1, "cmd": "ls"}]), "unknown key"),
            (job([{"do": "wait", "s": 601}]), "outside"),
            (job([{"do": "wait", "s": True}]), "expected a number"),
            (job([{"do": "wait", "s": "1"}]), "expected a number"),
            (job([{"do": "open_app", "app": "Terminal"}]), "not on the allowlist"),
            (job([{"do": "open_app", "app": "System Settings"}]), "not on the allowlist"),
            (job([{"do": "open_url", "url": "https://example.com/"}]), "not on the allowlist"),
            (job([{"do": "open_url", "url": "https://www.youtube.com/watch?v=x\"; rm"}]), "characters"),
            (job([{"do": "open_file", "path": "~/../xyx/secret"}]), "'..'"),
            (job([{"do": "open_file", "path": "Documents/x"}]), "absolute"),
            (job([{"do": "type", "text": "hi\x1b[2J"}]), "control"),
            (job([{"do": "type", "text": "x" * 2001}]), "more than"),
            (job([{"do": "type", "text": ""}]), "empty"),
            (job([{"do": "key", "key": "k", "mods": ["cmd", "cmd"]}]), "twice"),
            (job([{"do": "key", "key": "power"}]), "key the agent knows"),
            (job([{"do": "click", "at": "@nowhere"}]), "not saved"),
            (job([{"do": "drag", "from": {"x": 1, "y": 1}}]), "exactly one"),
            (job([{"do": "find", "app": "Pebble", "save_as": "@x"}]), "at least one"),
            (job([{"do": "find", "app": "Keychain Access", "name": "x", "save_as": "@x"}]), "may read"),
            (job([{"do": "hide", "app": "Pebble"}]), "may not be hidden"),
            (job([{"do": "record_start", "name": "a/b", "max_s": 9}]), "valid name"),
            (job([{"do": "record_start", "name": "a", "max_s": 9}, {"do": "record_start", "name": "a", "max_s": 9}]), "same name"),
            (job([{"do": "reset", "what": "everything"}]), "not one of"),
            (job([{"do": "wait", "s": 1}], jid="../x"), "job id"),
            ({"schema": "other", "id": "x", "steps": [{"do": "wait", "s": 1}]}, "schema"),
            ({"schema": jobspec.SCHEMA, "id": "x", "steps": [], "run": "x"}, "unknown key"),
            (job([]), "1 to"),
            ([1, 2], "JSON object"),
        ]
        for obj, needle in cases:
            with self.subTest(needle=needle, obj=str(obj)[:80]):
                self.bad(obj, needle)

    def test_bytes_and_names(self):
        with self.assertRaises(jobspec.JobError):
            jobspec.parse_job_bytes(b'{"schema": "pebble-take-job/1", "id": "x", "steps": [{"do": "wait", "s": NaN}]}', CFG)
        with self.assertRaises(jobspec.JobError):
            jobspec.parse_job_bytes(b"\xff\xfe", CFG)
        with self.assertRaises(jobspec.JobError):
            jobspec.parse_job_bytes(b" " * (jobspec.MAX_JOB_BYTES + 1), CFG)
        self.assertTrue(jobspec.queue_name_ok("0003-RS4-01.json", "RS4-01"))
        self.assertTrue(jobspec.queue_name_ok("RS4-01.json", "RS4-01"))
        self.assertFalse(jobspec.queue_name_ok("0003-RS4-02.json", "RS4-01"))

    def test_paths_stay_inside(self):
        root = make_root()
        try:
            home = os.path.join(root, "home")
            os.makedirs(os.path.join(home, "Documents"))
            os.symlink("/etc", os.path.join(home, "Documents", "escape"))
            cfg = dict(CFG, file_roots=["~", root])
            self.assertTrue(jobspec.path_allowed("~/Documents/x.txt", cfg, home))
            self.assertTrue(jobspec.path_allowed("~/Documents/x.txt", CFG, home), "the '~' root itself must expand")
            self.assertIsNone(jobspec.path_allowed("~/Documents/escape/hosts", cfg, home))
            self.assertIsNone(jobspec.path_allowed("/Users/Shared/elsewhere", cfg, home))
        finally:
            shutil.rmtree(root)


class TestHands(unittest.TestCase):
    def test_never_armed_outside_the_demo_user(self):
        self.assertNotEqual(macos.current_user(), "studio", "these tests must not run in the demo user")
        self.assertFalse(macos.arm("studio"))
        self.assertFalse(macos.armed())
        with self.assertRaises(macos.NotArmed):
            macos._post(macos.mouse_event(macos.MOUSE_MOVED, 10, 10))
        with self.assertRaises(macos.NotArmed):
            macos.Hands().type_text("x", 10, 0)

    def test_events_carry_what_they_should(self):
        ev = macos.mouse_event(macos.MOUSE_MOVED, 321.5, 123.25)
        p = macos.CGEventGetLocation(ev)
        macos.CFRelease(ev)
        self.assertEqual((p.x, p.y), (321.5, 123.25))
        for ch in "×“”°é£a":
            ev = macos.key_event(0, True, 0, ch)
            self.assertEqual(macos.event_text(ev), ch)
            macos.CFRelease(ev)
        self.assertEqual(macos.flags_for(["cmd", "shift"]), 0x120000)
        self.assertTrue(macos.flags_for([], arrow=True) & macos.FLAG_NUMPAD)

    def test_paths_and_pace(self):
        import random
        pts = macos.path_points(0, 0, 400, 300, 600, 0.12, random.Random(1))
        self.assertEqual(pts[-1], (400, 300))
        self.assertEqual(len(pts), 72)
        d = macos.typing_delays("What can you do now?", 6.5, 0.35, random.Random(3))
        self.assertEqual(d[0], 0.0)
        self.assertTrue(2.0 < sum(d) < 4.5, sum(d))


class TestAgentSimulated(unittest.TestCase):
    def setUp(self):
        self.root = make_root()

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_runs_a_job_once_and_logs_every_step(self):
        enqueue_raw(self.root, "0001-a.json", job([
            {"do": "record_start", "name": "a-01", "max_s": 30},
            {"do": "click", "at": {"x": 200, "y": 300}, "event": "press"},
            {"do": "type", "text": "What can you do now?", "event": "typed"},
            {"do": "key", "key": "return", "event": "send"},
            {"do": "mark", "event": "reply"},
            {"do": "record_stop"},
        ], jid="a"))
        r = run_agent(self.root)
        self.assertEqual(r.returncode, 0, r.stderr)
        res = result(self.root, "a")
        self.assertEqual(res["status"], "done")
        self.assertEqual([s["do"] for s in res["steps"]], ["record_start", "click", "type", "key", "mark", "record_stop"])
        self.assertEqual(set(res["events"]), {"press", "typed", "send", "reply"})
        meta = load(os.path.join(self.root, "raw", "a-01.json"))
        self.assertTrue(meta["simulated"])
        self.assertEqual(meta["moves"][0]["x1"], 200.0)
        log = read(os.path.join(self.root, "log", "agent.log"))
        self.assertEqual(len(re.findall(r"job a step \d+:", log)), 6)
        self.assertTrue(all(re.match(r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}", ln) for ln in log.splitlines()))
        # run again: the job never runs twice
        run_agent(self.root)
        self.assertEqual(read(os.path.join(self.root, "log", "agent.log")).count("job a: start"), 1)
        self.assertIn("## a-01", read(os.path.join(self.root, "log", "takes.md")))

    def test_refuses_malformed_jobs_whole(self):
        enqueue_raw(self.root, "0001-x.json", job([{"do": "wait", "s": 0.1}, {"do": "shell", "cmd": "rm -rf ~"}], jid="x"))
        enqueue_raw(self.root, "0002-y.json", "{not json")
        enqueue_raw(self.root, "0003-z.json", job([{"do": "wait", "s": 0.1}], jid="other"))
        enqueue_raw(self.root, "weird name.json", job([{"do": "wait", "s": 0.1}], jid="w"))
        r = run_agent(self.root)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(result(self.root, "x")["status"], "refused")
        self.assertEqual(result(self.root, "y")["status"], "refused")
        self.assertIn("doesn't match", result(self.root, "z")["errors"][0])
        self.assertTrue(os.path.exists(os.path.join(self.root, "results", "_refused", "weird name.json.json")))
        log = read(os.path.join(self.root, "log", "agent.log"))
        self.assertNotIn("step 1: {\"do\": \"wait\"", log)  # no step of a refused job ran
        run_agent(self.root)  # nothing is read twice
        self.assertEqual(read(os.path.join(self.root, "log", "agent.log")).count("REFUSED"), 4)

    def test_a_failed_step_stops_the_job_and_its_recording(self):
        fixture = os.path.join(self.root, "fixture.json")
        dump({"find:Pebble": [{"running": True, "matches": [], "seen": 40}]}, fixture)
        enqueue_raw(self.root, "0001-f.json", job([
            {"do": "record_start", "name": "f-01", "max_s": 30},
            {"do": "find", "app": "Pebble", "role": "AXButton", "name": "Allow", "save_as": "@allow", "timeout_s": 0.5},
            {"do": "click", "at": "@allow"},
        ], jid="f"))
        r = run_agent(self.root, "--fixture", fixture)
        self.assertEqual(r.returncode, 0, r.stderr)
        res = result(self.root, "f")
        self.assertEqual(res["status"], "failed")
        self.assertIn("not found", res["error"])
        self.assertEqual(len(res["steps"]), 2)
        self.assertTrue(os.path.exists(os.path.join(self.root, "raw", "f-01.json")))  # the recording was stopped, kept

    def test_find_waits_for_an_element_then_clicks_its_centre(self):
        fixture = os.path.join(self.root, "fixture.json")
        allow = {"role": "AXButton", "name": "Allow", "centre": {"x": 640, "y": 500}, "x": 600, "y": 485, "w": 80, "h": 30}
        dump({"find:Pebble": [{"running": True, "matches": []}, {"running": True, "matches": []},
                                   {"running": True, "matches": [allow]}]}, fixture)
        enqueue_raw(self.root, "0001-g.json", job([
            {"do": "wait_element", "app": "Pebble", "role": "AXButton", "name": "Allow", "timeout_s": 5, "save_as": "@allow", "event": "card"},
            {"do": "click", "at": {"ref": "@allow", "dx": 0, "dy": 2}, "event": "allow"},
        ], jid="g"))
        r = run_agent(self.root, "--fixture", fixture)
        self.assertEqual(r.returncode, 0, r.stderr)
        res = result(self.root, "g")
        self.assertEqual(res["status"], "done", res.get("error"))
        self.assertEqual(res["steps"][1]["detail"]["at"], [640.0, 502.0])
        self.assertEqual(res["vars"]["@allow"], {"x": 640, "y": 500})

    def test_off_screen_points_are_refused(self):
        enqueue_raw(self.root, "0001-o.json", job([{"do": "move", "to": {"x": 5000, "y": 10}}], jid="o"))
        run_agent(self.root)
        self.assertIn("off the screen", result(self.root, "o")["error"])

    def test_paths_outside_are_refused_at_run_time(self):
        enqueue_raw(self.root, "0001-p.json", job([{"do": "open_file", "path": "/etc/hosts"}], jid="p"))
        run_agent(self.root)
        self.assertIn("outside the agent's folders", result(self.root, "p")["error"])

    def test_pause(self):
        open(os.path.join(self.root, "PAUSE"), "w").close()
        enqueue_raw(self.root, "0001-q.json", job([{"do": "wait", "s": 0.1}], jid="q"))
        run_agent(self.root)
        self.assertFalse(os.path.exists(os.path.join(self.root, "results", "q")))
        os.unlink(os.path.join(self.root, "PAUSE"))
        run_agent(self.root)
        self.assertEqual(result(self.root, "q")["status"], "done")

    def test_interrupted_jobs_are_marked_never_rerun(self):
        os.makedirs(os.path.join(self.root, "results", "i"))
        open(os.path.join(self.root, "results", "i", "RUNNING"), "w").close()
        enqueue_raw(self.root, "0001-i.json", job([{"do": "wait", "s": 0.1}], jid="i"))
        run_agent(self.root)
        self.assertEqual(result(self.root, "i")["status"], "interrupted")


class TestKillSwitch(unittest.TestCase):
    def setUp(self):
        self.root = make_root()

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def start(self):
        enqueue_raw(self.root, "0001-long.json", job([
            {"do": "record_start", "name": "long-01", "max_s": 300},
            {"do": "type", "text": "a slow sentence " * 20, "cps": 2},
            {"do": "wait", "s": 120},
        ], jid="long"))
        p = subprocess.Popen([PY, "-I", "-B", os.path.join(AGENT, "takeagent.py"), "--simulate", "--root", self.root,
                              "--heavy", FAKE_HEAVY], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        deadline = time.time() + 20
        while not os.path.exists(os.path.join(self.root, "results", "long", "RUNNING")):
            self.assertLess(time.time(), deadline, "the job never started")
            time.sleep(0.05)
        time.sleep(0.5)
        return p

    def check_stopped(self, p, t0):
        rc = p.wait(timeout=10)
        took = time.time() - t0
        self.assertEqual(rc, 3)
        self.assertLess(took, 2.0, f"took {took:.2f} s to stop")
        res = result(self.root, "long")
        self.assertEqual(res["status"], "stopped")
        meta = load(os.path.join(self.root, "raw", "long-01.json"))
        self.assertIn("kill switch", meta["stop_reason"])
        self.assertEqual(load(os.path.join(self.root, "results", "agent.json"))["state"], "stopped")
        self.assertIn("stopping:", read(os.path.join(self.root, "log", "agent.log")))

    def test_stop_file(self):
        p = self.start()
        t0 = time.time()
        open(os.path.join(self.root, "STOP"), "w").close()
        self.check_stopped(p, t0)

    def test_ctrl_c(self):
        p = self.start()
        t0 = time.time()
        p.send_signal(signal.SIGINT)
        self.check_stopped(p, t0)


class TestLiveRefusal(unittest.TestCase):
    def test_live_mode_refuses_any_other_account(self):
        r = subprocess.run([PY, "-I", "-B", os.path.join(AGENT, "takeagent.py"), "--live"], capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 64)
        self.assertIn("runs live only in the demo user", r.stderr)

    def test_live_mode_takes_no_test_overrides(self):
        r = subprocess.run([PY, "-I", "-B", os.path.join(AGENT, "takeagent.py"), "--live", "--heavy", FAKE_HEAVY],
                           capture_output=True, text=True, timeout=30)
        self.assertEqual(r.returncode, 64)

    def test_media_refuses_stills_and_recordings_outside_live(self):
        root = make_root()
        try:
            m = media.Media(CFG, root, lambda s: None, live=True, heavy=[FAKE_HEAVY])
            with self.assertRaises(media.MediaError):
                m.still(os.path.join(root, "x.png"))
            with self.assertRaises(media.MediaError):
                m.start("x", 5, "screencapture", "key", 1, "j", None, {"scale": 2})
        finally:
            shutil.rmtree(root)


class TestJXAHelper(unittest.TestCase):
    def test_matching_logic(self):
        src = read(os.path.join(AGENT, "ax.js"))
        r = subprocess.run(["/usr/bin/osascript", "-l", "JavaScript", "-", '{"cmd":"selftest"}'], input=src,
                           capture_output=True, text=True, timeout=30)
        out = json.loads(r.stdout)
        self.assertTrue(out["ok"], out)
        self.assertEqual(out["result"]["allow"][0]["centre"], {"x": 140, "y": 215})
        self.assertEqual(len(out["result"]["contains"]), 1)
        self.assertEqual(out["result"]["none"], 0)


def ffmpeg(*args: str) -> None:
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", *args], check=True, timeout=60)


@unittest.skipUnless(os.access(FFMPEG, os.X_OK), "needs Homebrew FFmpeg")
class TestConform(unittest.TestCase):
    """A synthetic variable-rate take (frames missing, as screencapture leaves them when the screen is still), with a
    white square appearing at 1.5 s where the 'pointer' starts: the conform must keep its time, and the sync must find
    the square."""

    def setUp(self):
        self.root = make_root()
        raw = os.path.join(self.root, "raw", "syn-01.mov")
        src = ("color=c=gray:s=160x104:r=60:d=3,drawbox=x=40:y=40:w=16:h=16:c=white:t=fill:enable='gte(t,1.5)'")
        ffmpeg("-f", "lavfi", "-i", src, "-vf", "select='not(between(n,20,50))*not(between(n,100,110))+eq(n,90)'",
               "-fps_mode", "vfr", "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", raw)
        # the agent's clock for this take: the move started 0.2 s after the picture shows it (the recorder's lag)
        meta = {"name": "syn-01", "take": "dry", "job": "j", "scale": 1.0, "started": "2026-10-31T00:00:00+05:30",
                "events": {"press": 1.7, "send": 2.4}, "moves": [{"t": 1.7, "x0": 48, "y0": 48, "x1": 90, "y1": 60}]}
        dump(meta, os.path.join(self.root, "raw", "syn-01.json"))

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_the_raw_take_is_variable_rate(self):
        m = media.Media(CFG, self.root, lambda s: None, live=False, heavy=[FAKE_HEAVY])
        p = m.probe(os.path.join(self.root, "raw", "syn-01.mov"), packets=True)
        self.assertLess(p["frames"], 180)
        self.assertGreater(p["gap_max_s"], 0.4)

    def test_conform_keeps_time_and_finds_the_sync(self):
        enqueue_raw(self.root, "0001-c.json", job([{"do": "conform", "name": "syn-01"}], jid="c"))
        r = run_agent(self.root)
        self.assertEqual(r.returncode, 0, r.stderr)
        res = result(self.root, "c")
        self.assertEqual(res["status"], "done", res.get("error"))
        rec = load(os.path.join(self.root, "conformed", "syn-01.conform.json"))
        d = rec["_detail"]
        self.assertEqual(rec["method"], "fps-filter-cfr")
        self.assertTrue(d["ok"], d["checks"])
        self.assertLessEqual(abs(rec["sourceDurationS"] - rec["outputDurationS"]), 1 / 60)
        self.assertEqual(d["frames"], 180)
        self.assertTrue(d["sync"]["found"], d["sync"])
        self.assertAlmostEqual(d["sync"]["lag_s"], 0.2, delta=1 / 60 + 1e-6)
        self.assertAlmostEqual(rec["events"]["press"]["wallS"], 1.5, delta=1 / 60 + 1e-6)
        self.assertAlmostEqual(rec["events"]["send"]["wallS"], 2.2, delta=1 / 60 + 1e-6)
        # the command passes take.ts checkTakeManifest's tests on the conform command
        cmd = f" {rec['command']} "
        first = cmd.index(" -i ")
        self.assertFalse(re.search(r"\s-(r|framerate)\s", cmd[:first]))
        self.assertNotIn("setpts", cmd)
        self.assertTrue(re.search(r"fps=\s*\d", cmd) and re.search(r"-fps_mode\s+cfr", cmd))
        self.assertIn("-i raw/syn-01.mov", cmd)
        self.assertIn("conformed/syn-01", read(os.path.join(self.root, "log", "takes.md")))
        # never overwritten
        enqueue_raw(self.root, "0002-c2.json", job([{"do": "conform", "name": "syn-01"}], jid="c2"))
        run_agent(self.root)
        self.assertIn("never overwritten", result(self.root, "c2")["error"])

    def test_a_frame_count_conform_fails_the_checks(self):
        """What CR-12 forbids: reading the frames at 60 a second (an input-side -r) plays the take faster."""
        m = media.Media(CFG, self.root, lambda s: None, live=False, heavy=[FAKE_HEAVY])
        bad = os.path.join(self.root, "conformed", "bad.mp4")
        cmd = [FFMPEG, "-hide_banner", "-r", "60", "-i", os.path.join(self.root, "raw", "syn-01.mov"), "-vf", "fps=60",
               "-fps_mode", "cfr", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", bad]
        subprocess.run([*cmd[:2], "-loglevel", "error", *cmd[2:]], check=True, timeout=60)
        src = m.probe(os.path.join(self.root, "raw", "syn-01.mov"))
        dst = m.probe(bad)
        checks = media.conform_checks(src, dst, cmd, 60)
        self.assertFalse(checks["durations_within_a_frame"], (src["duration_s"], dst["duration_s"]))
        self.assertFalse(checks["timestamp_conform_only"])
        good = media.conform_checks(src, src | {"nb_frames": round(src["duration_s"] * 60), "avg_frame_rate": "60/1", "r_frame_rate": "60/1"},
                                    m.conform_command("syn-01"), 60)
        self.assertTrue(good["timestamp_conform_only"])


class TestEnqueue(unittest.TestCase):
    """The lead's tool: every template builds into a job the agent accepts, and the queue is written safely."""

    def setUp(self):
        self.root = make_root()
        import enqueue
        self.enqueue = enqueue
        self.positions = os.path.join(self.root, "positions.json")
        dump({"stone": {"x": 1180, "y": 760}}, self.positions)

    def tearDown(self):
        shutil.rmtree(self.root, ignore_errors=True)

    def test_every_template_builds(self):
        import glob
        n = 0
        for t in sorted(glob.glob(os.path.join(TAKES, "jobs", "*", "*.json"))):
            with self.subTest(template=os.path.basename(t)):
                job = self.enqueue.build(t, self.root, CFG, None, {"what": "photos"}, self.positions)
                self.assertTrue(job["id"])
                n += 1
        self.assertGreaterEqual(n, 30)

    def test_missing_values_are_named(self):
        with self.assertRaises(SystemExit) as cm:
            self.enqueue.build(os.path.join(TAKES, "jobs", "takes", "rs15.json"), self.root, CFG, None, {}, os.path.join(self.root, "none.json"))
        self.assertIn("$stone", str(cm.exception))

    def test_queue_numbers_and_take_numbers(self):
        t = os.path.join(TAKES, "jobs", "setup", "reset.json")
        a = self.enqueue.build(t, self.root, CFG, None, {"what": "notes"}, self.positions)
        name_a = self.enqueue.write_job(self.root, a)
        b = self.enqueue.build(t, self.root, CFG, None, {"what": "notes"}, self.positions)
        name_b = self.enqueue.write_job(self.root, b)
        self.assertEqual((name_a, name_b), ("0001-reset-notes-01.json", "0002-reset-notes-02.json"))
        with self.assertRaises(SystemExit):
            self.enqueue.write_job(self.root, a)  # a job id runs once
        self.assertFalse([n for n in os.listdir(os.path.join(self.root, "queue")) if n.startswith(".")])
        r = run_agent(self.root)  # the agent accepts what enqueue wrote (simulated)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(result(self.root, "reset-notes-01")["status"], "done")

    def test_the_dry_run_walks_through_in_simulation(self):
        for t in self.enqueue.DRY_RUN:
            self.enqueue.write_job(self.root, self.enqueue.build(t, self.root, CFG, None, {}, self.positions))
        fixture = os.path.join(self.root, "fixture.json")
        win = {"running": True, "windows": [{"title": "Calculator"}, {"title": "poster-screen.png"}, {"title": "Studio"}]}
        calc = {"role": "AXWindow", "name": "Calculator", "centre": {"x": 640, "y": 300}, "x": 500, "y": 150, "w": 280, "h": 300}
        dump({"windows:Calculator": [win], "windows:Preview": [win], "windows:Google Chrome": [win],
              "find:Calculator": [{"running": True, "matches": [calc]}],
              "dump:Pebble": [{"running": True, "windows": []}], "dump:Dock": [{"running": True, "windows": []}],
              "dump:ControlCenter": [{"running": True, "windows": []}], "dump:Calculator": [{"running": True, "windows": []}]}, fixture)
        home = os.path.join(self.root, "home")
        os.makedirs(os.path.join(home, "Documents", "Open day"))
        open(os.path.join(home, "Documents", "Open day", "poster-screen.png"), "w").close()
        r = run_agent(self.root, "--fixture", fixture, "--home", home, timeout=180)
        self.assertEqual(r.returncode, 0, r.stderr)
        for d in sorted(os.listdir(os.path.join(self.root, "results"))):
            if d.startswith("dry"):
                res = result(self.root, d)
                # the conforms fail in simulation (no recording exists); every step before them must pass
                if res["status"] != "done":
                    self.assertIn("no raw take", res.get("error", ""), (d, res.get("error")))

    def test_optional_and_if(self):
        fixture = os.path.join(self.root, "fixture.json")
        dump({"find:Pebble": [{"running": True, "matches": []}]}, fixture)
        enqueue_raw(self.root, "0001-opt.json", job([
            {"do": "wait_element", "app": "Pebble", "role": "AXButton", "name": "Allow", "timeout_s": 0.3, "optional": True, "save_as": "@press"},
            {"do": "click", "at": "@press", "if": "@press"},
            {"do": "mark", "event": "after"},
        ], jid="opt"))
        run_agent(self.root, "--fixture", fixture)
        res = result(self.root, "opt")
        self.assertEqual(res["status"], "done", res.get("error"))
        self.assertIn("skipped", res["steps"][1])


if __name__ == "__main__":
    unittest.main()
