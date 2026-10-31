"""The take agent's camera: recordings through the copied heavy.sh, stills, ffprobe's measurements, and the conform.

The conform is RUNBOOK §6.2.1 word for word (CR-12, OVERRIDES §55): by TIMESTAMPS only,
    ffmpeg -hide_banner -i raw/<name>.mov -vf fps=60 -fps_mode cfr -an -c:v libx264 -preset medium -crf 16 \
      -pix_fmt yuv420p conformed/<name>.mp4
which repeats a frame to fill a gap and never re-times one. Its checks: the raw and conformed durations match within
one frame, the conformed frame count matches its duration, and the events the agent logged are placed on the
recording's own clock, calibrated by the first pointer movement seen in the picture (the sync). The record it writes
has the shape of `TakeConform` (video/src/film2/setpieces/take.ts), so `checkTakeManifest()` can check it.

Recording and stills happen only as the demo user (`arm`); the conform and the measurements are file work and run in
any account (the tests run them on synthetic clips).
"""

from __future__ import annotations

import datetime as dt
import errno
import json
import os
import shutil
import signal
import subprocess
import time
from dataclasses import dataclass, field

import macos

CONFORM_METHOD = "fps-filter-cfr"


class MediaError(RuntimeError):
    pass


def now_iso() -> str:
    return dt.datetime.now().astimezone().isoformat(timespec="milliseconds")


def free_gib(path: str) -> float:
    return shutil.disk_usage(path).free / 2**30


@dataclass
class Recording:
    name: str
    method: str
    stop_with: str
    max_s: int
    raw: str                       # relative to the root: raw/<name>.mov
    started_wall: str
    t0: float                      # monotonic time the recorder took its control pipe (≈ its first frame; see sync)
    scale: float | None
    screen: dict
    job: str
    take: str | None
    proc: subprocess.Popen | None = None
    fifo: str | None = None
    fifo_fd: int | None = None
    events: dict = field(default_factory=dict)    # name -> seconds on the agent's clock since t0
    moves: list = field(default_factory=list)     # the pointer's movements: {t, x0, y0, x1, y1}
    actions: list = field(default_factory=list)   # every step while recording: {t, do, detail}
    simulated: bool = False

    def rel(self) -> float:
        return time.monotonic() - self.t0

    def meta(self) -> dict:
        return {"name": self.name, "method": self.method, "stop_with": self.stop_with, "max_s": self.max_s, "raw": self.raw,
                "started": self.started_wall, "scale": self.scale, "screen": self.screen, "job": self.job, "take": self.take,
                "events": self.events, "moves": self.moves, "actions": self.actions, "simulated": self.simulated,
                "clock": "seconds on the agent's clock since the recorder opened its control pipe; the conform's sync "
                         "calibrates them to the recording's first frame"}


class Media:
    def __init__(self, cfg: dict, root: str, log, live: bool, heavy: list[str] | None = None, should_stop=lambda: False):
        self.cfg = cfg
        self.root = root
        self.log = log
        self.live = live
        self.should_stop = should_stop
        t = cfg["tools"]
        self.ffmpeg, self.ffprobe = t["ffmpeg"], t["ffprobe"]
        # heavy.sh's copy, under taskpolicy's utility class (RUNBOOK §6.1); the tests pass a pass-through runner instead
        self.heavy = heavy or [t["taskpolicy"], "-c", "utility", os.path.join(root, "scripts", "heavy.sh")]
        self.recording: Recording | None = None

    # ---- paths ------------------------------------------------------------------------------------------------

    def p(self, *parts: str) -> str:
        return os.path.join(self.root, *parts)

    def env(self) -> dict:
        e = {"PATH": "/usr/bin:/bin:/usr/sbin:/sbin", "HOME": os.environ.get("HOME", "/tmp"), "LANG": "en_GB.UTF-8",
             "HEAVY_WAIT_SECS": str(self.cfg.get("heavy_wait_secs", 120)), "PEBBLE_REPO": "unused-in-the-demo-user"}
        return e

    def _guard(self, what: str) -> None:
        if not (self.live and macos.armed()):
            raise MediaError(f"{what} happens only in the demo user's session (live mode)")

    # ---- stills -----------------------------------------------------------------------------------------------

    def still(self, out_path: str, region: dict | None = None) -> dict:
        """One screenshot (screencapture -x: no sound), with the pointer. Light: one PNG, under a second. It doesn't
        go through heavy.sh, whose lock a running recording holds (it would wait for the take to end)."""
        if free_gib(self.root) < self.cfg["disk"]["still_min_free_gib"]:
            raise MediaError(f"only {free_gib(self.root):.2f} GiB free: no still")
        if os.path.exists(out_path):
            raise MediaError(f"{out_path} exists; a still is never overwritten")
        if not self.live:
            return {"simulated": True, "path": out_path}
        self._guard("a still")
        cmd = [self.cfg["tools"]["screencapture"], "-x", "-C", "-D", "1", "-t", "png"]
        if region:
            cmd += ["-R", f"{region['x']:.0f},{region['y']:.0f},{region['w']:.0f},{region['h']:.0f}"]
        try:
            r = subprocess.run([self.cfg["tools"]["taskpolicy"], "-c", "utility", *cmd, out_path], capture_output=True,
                               text=True, timeout=30, env=self.env())
        except subprocess.TimeoutExpired:
            raise MediaError("screencapture took longer than 30 s (a macOS question on screen?)") from None
        if r.returncode != 0 or not os.path.exists(out_path):
            raise MediaError(f"screencapture failed ({r.returncode}): {r.stderr.strip()[:300]}")
        return {"path": out_path, "bytes": os.path.getsize(out_path)}

    # ---- recordings -------------------------------------------------------------------------------------------

    def avfoundation_screen(self) -> int:
        r = subprocess.run([self.ffmpeg, "-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""],
                           capture_output=True, text=True, timeout=30, env=self.env())
        for line in r.stderr.splitlines():
            if "Capture screen 0" in line and "[" in line:
                try:
                    return int(line.rsplit("[", 1)[1].split("]", 1)[0])
                except ValueError:
                    pass
        raise MediaError("this FFmpeg lists no 'Capture screen' device (RUNBOOK §6.2 B): use screencapture")

    def start(self, name: str, max_s: int, method: str, stop_with: str, display: int, job: str, take: str | None,
              screen: dict) -> Recording:
        if self.recording:
            raise MediaError(f"a recording is already running ({self.recording.name})")
        raw_rel = f"raw/{name}.mov"
        raw = self.p(raw_rel)
        if os.path.exists(raw) or os.path.exists(self.p("raw", f"{name}.json")):
            raise MediaError(f"{raw_rel} exists; a take is never overwritten (use a new name)")
        need = 2 * (max_s / 60 * self.cfg["disk"]["take_mb_per_min"] / 1024) + self.cfg["disk"]["min_free_gib"]
        if free_gib(self.root) < need:
            raise MediaError(f"only {free_gib(self.root):.2f} GiB free; a take of up to {max_s} s needs {need:.2f} GiB "
                             "(twice its size plus 2 GB, RUNBOOK §6.3)")
        rec = Recording(name=name, method=method, stop_with=stop_with, max_s=max_s, raw=raw_rel, started_wall=now_iso(),
                        t0=time.monotonic(), scale=screen.get("scale"), screen=screen, job=job, take=take)
        if not self.live:
            rec.simulated = True
            self.recording = rec
            self.log(f"record_start {name} (simulated)")
            return rec
        self._guard("a recording")
        fifo = self.p("run", f"{name}.ctl")
        os.makedirs(self.p("run"), exist_ok=True)
        if os.path.exists(fifo):
            os.unlink(fifo)
        os.mkfifo(fifo, 0o600)
        dev = str(display) if method == "screencapture" else str(self.avfoundation_screen())
        cmd = [*self.heavy, f"take-{name}", self.cfg["tools"]["bash"], self.p("agent", "rec.sh"), method, str(max_s),
               raw_rel, fifo, dev]
        logf = open(self.p("log", f"rec-{name}.log"), "ab")
        proc = subprocess.Popen(cmd, cwd=self.root, stdin=subprocess.DEVNULL, stdout=logf, stderr=logf, env=self.env(),
                                start_new_session=True)
        logf.close()
        # The recorder is running once it has opened the control pipe for reading (heavy.sh may first wait for its lock).
        deadline = time.monotonic() + self.cfg.get("heavy_wait_secs", 120) + 15
        fd = None
        while fd is None:
            try:
                fd = os.open(fifo, os.O_WRONLY | os.O_NONBLOCK)
            except OSError as e:
                if e.errno != errno.ENXIO:
                    raise
                if proc.poll() is not None:
                    os.unlink(fifo)
                    raise MediaError(f"the recorder stopped before it started (heavy.sh exit {proc.returncode}; "
                                     f"see log/rec-{name}.log: 73 disk or memory, 75 lock, HOLD)")
                if time.monotonic() > deadline or self.should_stop():
                    self._kill(proc)
                    os.unlink(fifo)
                    raise MediaError("the recorder did not start in time")
                time.sleep(0.02)
        rec.t0 = time.monotonic()
        rec.started_wall = now_iso()
        rec.proc, rec.fifo, rec.fifo_fd = proc, fifo, fd
        self.recording = rec
        self.log(f"record_start {name}: {method}, up to {max_s} s, stop with {stop_with}")
        return rec

    def _job_pid(self) -> int | None:
        try:
            with open(self.p(".work", "heavy.lock", "job")) as f:
                return int(f.read().strip())
        except (OSError, ValueError):
            return None

    def _kill(self, proc: subprocess.Popen) -> None:
        try:
            os.killpg(proc.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass

    def stop(self, reason: str = "asked") -> dict:
        rec = self.recording
        if not rec:
            raise MediaError("no recording is running")
        self.recording = None
        how = rec.stop_with
        if rec.simulated:
            meta = rec.meta() | {"stopped": now_iso(), "stop_reason": reason, "duration_on_agent_clock_s": rec.rel()}
            self._write_meta(rec, meta)
            return meta
        stopped_by = "the recording's own limit"
        t_stop = rec.rel()
        if rec.proc.poll() is None:
            if how == "key":
                try:
                    os.write(rec.fifo_fd, b"q\n")  # any character stops screencapture -v; FFmpeg stops on "q"
                    stopped_by = "a key on its control pipe"
                except OSError:
                    pass
            elif how == "signal":
                pid = self._job_pid()
                if pid:
                    os.kill(pid, signal.SIGINT)
                    stopped_by = "SIGINT"
            elif how == "duration":
                # wait for -V / -t to end it (bounded by max_s from the start)
                end = rec.t0 + rec.max_s + 20
                while rec.proc.poll() is None and time.monotonic() < end and not self.should_stop():
                    time.sleep(0.1)
            # fallbacks: SIGINT to the recorder, then heavy.sh's own TERM
            for sig_wait, action in ((6, "sigint"), (15, "term")):
                end = time.monotonic() + sig_wait
                while rec.proc.poll() is None and time.monotonic() < end:
                    time.sleep(0.1)
                if rec.proc.poll() is not None:
                    break
                if action == "sigint":
                    pid = self._job_pid()
                    if pid:
                        os.kill(pid, signal.SIGINT)
                        stopped_by += ", then SIGINT"
                else:
                    self._kill(rec.proc)
                    stopped_by += ", then SIGTERM"
            try:
                rec.proc.wait(timeout=30)
            except subprocess.TimeoutExpired:
                os.killpg(rec.proc.pid, signal.SIGKILL)
                stopped_by += ", then SIGKILL"
        try:
            os.close(rec.fifo_fd)
        except OSError:
            pass
        try:
            os.unlink(rec.fifo)
        except OSError:
            pass
        meta = rec.meta() | {"stopped": now_iso(), "stop_reason": reason, "stopped_by": stopped_by,
                             "stop_requested_at_s": t_stop, "recorder_exit": rec.proc.returncode}
        raw = self.p(rec.raw)
        if os.path.exists(raw) and os.path.getsize(raw) > 0:
            # the take's record (its events and moves) is written whatever the probe says: a file cut short by a
            # watchdog or a forced stop may not open
            try:
                meta["probe"] = self.probe(raw, packets=True)
            except (MediaError, subprocess.TimeoutExpired, ValueError) as e:
                meta["probe"] = None
                meta["error"] = f"{rec.raw} exists but ffprobe can't read it ({e}); stopped by {stopped_by}"
        else:
            meta["probe"] = None
            meta["error"] = f"no file at {rec.raw} (recorder exit {rec.proc.returncode}; see log/rec-{rec.name}.log)"
        self._write_meta(rec, meta)
        self.log(f"record_stop {rec.name}: {stopped_by}; " + (f"{meta['probe']['duration_s']:.3f} s" if meta.get("probe") else meta.get("error", "")))
        return meta

    def _write_meta(self, rec: Recording, meta: dict) -> None:
        path = self.p("raw", f"{rec.name}.json")
        with open(path + ".tmp", "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=1, ensure_ascii=False)
        os.replace(path + ".tmp", path)

    # ---- measurements -----------------------------------------------------------------------------------------

    def probe(self, path: str, packets: bool = False) -> dict:
        """Duration, size, frame count and rate, and (for a raw take) the gaps between frames: the dry run's measure."""
        r = subprocess.run([self.ffprobe, "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "format=duration,size:stream=codec_name,width,height,avg_frame_rate,r_frame_rate,nb_frames",
                            "-of", "json", path], capture_output=True, text=True, timeout=60)
        if r.returncode != 0:
            raise MediaError(f"ffprobe failed on {os.path.basename(path)}: {r.stderr.strip()[:300]}")
        j = json.loads(r.stdout)
        st = (j.get("streams") or [{}])[0]
        fmt = j.get("format", {})
        out = {"duration_s": float(fmt.get("duration", "nan")), "bytes": int(fmt.get("size", 0)), "codec": st.get("codec_name"),
               "width": st.get("width"), "height": st.get("height"), "avg_frame_rate": st.get("avg_frame_rate"),
               "r_frame_rate": st.get("r_frame_rate"), "nb_frames": int(st["nb_frames"]) if str(st.get("nb_frames", "")).isdigit() else None}
        if out["duration_s"] > 0:
            out["mb_per_min"] = round(out["bytes"] / 2**20 / (out["duration_s"] / 60), 1)
        if packets:
            p = subprocess.run([self.ffprobe, "-v", "error", "-select_streams", "v:0", "-show_entries", "packet=pts_time",
                                "-of", "csv=p=0", path], capture_output=True, text=True, timeout=120)
            ts = sorted(float(x) for x in p.stdout.split() if x.strip() and x.strip() != "N/A")
            gaps = [b - a for a, b in zip(ts, ts[1:])]
            out["frames"] = len(ts)
            if ts and out["duration_s"] > 0:
                out["fps_average"] = round(len(ts) / out["duration_s"], 2)
            if gaps:
                out["gap_max_s"] = round(max(gaps), 4)
                out["gaps_over_2_frames"] = sum(1 for g in gaps if g > 2 / 60 + 1e-6)
                out["first_pts_s"] = ts[0]
        return out

    # ---- the conform (RUNBOOK §6.2.1) -------------------------------------------------------------------------

    def conform_command(self, name: str) -> list[str]:
        c = self.cfg["conform"]
        return [self.ffmpeg, "-hide_banner", "-i", f"raw/{name}.mov", "-vf", f"fps={c['fps']}", "-fps_mode", "cfr", "-an",
                "-c:v", "libx264", "-preset", c["preset"], "-crf", str(c["crf"]), "-pix_fmt", "yuv420p", f"conformed/{name}.mp4"]

    def run_heavy(self, label: str, cmd: list[str], timeout_s: float, stdout=None) -> int:
        logf = open(self.p("log", f"{label}.log"), "ab")
        proc = subprocess.Popen([*self.heavy, label, *cmd], cwd=self.root, stdin=subprocess.DEVNULL,
                                stdout=stdout if stdout is not None else logf, stderr=logf, env=self.env(), start_new_session=True)
        logf.close()
        end = time.monotonic() + timeout_s
        while proc.poll() is None:
            if self.should_stop() or time.monotonic() > end:
                self._kill(proc)
                proc.wait(timeout=30)
                raise MediaError(f"{label} stopped ({'the kill switch' if self.should_stop() else 'timed out'})")
            time.sleep(0.2)
        return proc.returncode

    def conform(self, name: str, sync: dict | None = None) -> dict:
        raw_rel, out_rel = f"raw/{name}.mov", f"conformed/{name}.mp4"
        raw, out = self.p(raw_rel), self.p(out_rel)
        if not os.path.exists(raw):
            raise MediaError(f"no raw take {raw_rel}")
        if os.path.exists(out):
            raise MediaError(f"{out_rel} exists; a conformed take is never overwritten")
        meta_path = self.p("raw", f"{name}.json")
        meta = json.load(open(meta_path, encoding="utf-8")) if os.path.exists(meta_path) else {}
        src = self.probe(raw, packets=True)
        cmd = self.conform_command(name)
        rc = self.run_heavy(f"conform-{name}", cmd, timeout_s=max(600, src["duration_s"] * 20))
        if rc != 0 or not os.path.exists(out):
            raise MediaError(f"the conform failed (exit {rc}; see log/conform-{name}.log)")
        dst = self.probe(out)
        fps = self.cfg["conform"]["fps"]
        checks = conform_checks(src, dst, cmd, fps)
        sync_result = self.find_sync(out, meta, sync, fps) if meta else {"found": False, "why": "no recording record"}
        lag = sync_result.get("lag_s") if sync_result.get("found") else None
        events = {}
        for ev, t in sorted((meta.get("events") or {}).items(), key=lambda kv: kv[1]):
            wall = t - (lag or 0.0)
            events[ev] = {"wallS": round(wall, 4), "frame": int(round(wall * fps)), "agentClockS": round(t, 4)}
        record = {
            "method": CONFORM_METHOD,
            "command": " ".join(_quote(a) for a in cmd),
            "sourceDurationS": round(src["duration_s"], 6),
            "outputDurationS": round(dst["duration_s"], 6),
            "events": {k: {"wallS": v["wallS"]} for k, v in events.items()},
            "_detail": {
                "take": meta.get("take"), "job": meta.get("job"), "recorded": meta.get("started"), "raw": src, "conformed": dst,
                "frames": dst["nb_frames"], "fps": fps, "checks": checks, "ok": all(checks.values()),
                "sync": sync_result, "events": events,
                "events_note": ("wallS = the agent's time for each event minus the recorder's start lag, which the sync "
                                "measured from the first pointer movement in the picture; frame = round(wallS × fps). "
                                "Check one or two by eye before the manifest uses them." if lag is not None else
                                "no sync found: wallS is the agent's clock from the recorder's start, uncalibrated "
                                "(the recorder's start lag is unknown; read the events off the picture)"),
            },
        }
        with open(self.p("conformed", f"{name}.conform.json"), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=1, ensure_ascii=False)
        self.log(f"conform {name}: {src['duration_s']:.3f} s -> {dst['duration_s']:.3f} s, {dst['nb_frames']} frames, "
                 f"checks {'pass' if record['_detail']['ok'] else 'FAIL'}; sync "
                 + (f"lag {lag:.3f} s" if lag is not None else "not found"))
        return record

    def find_sync(self, conformed: str, meta: dict, sync: dict | None, fps: int) -> dict:
        """The recorder's start lag: the first pointer movement after the recording began, found in the picture.
        A small box around where the pointer started is watched; the first frame that changes there is the move."""
        moves = meta.get("moves") or []
        # pixels per point: the picture's own width over the screen's width in points (the recorder's real size), else
        # the display's backing scale at the recording's start
        scale = meta.get("scale") or 2.0
        try:
            pw = (meta.get("screen") or {}).get("points", {}).get("w")
            vw = self.probe(conformed).get("width")
            if pw and vw:
                scale = vw / pw
        except MediaError:
            pass
        if sync:
            x, y, box = sync["x"], sync["y"], sync.get("box", 40)
            t_agent = None
            for m in moves:
                if abs(m["x0"] - x) < 2 and abs(m["y0"] - y) < 2:
                    t_agent = m["t"]
                    break
        elif moves:
            m = moves[0]
            x, y, box, t_agent = m["x0"], m["y0"], 40, m["t"]
        else:
            return {"found": False, "why": "no pointer movement was logged while recording"}
        if t_agent is None:
            return {"found": False, "why": "no logged movement starts at the sync point"}
        side = int(round(box * scale)) // 2 * 2
        cx, cy = int(round(x * scale)), int(round(y * scale))
        x0, y0 = max(0, cx - side // 2) // 2 * 2, max(0, cy - side // 2) // 2 * 2
        start = max(0, int((t_agent - 2.5) * fps)) / fps   # on a frame boundary, so frame i of the window is start + i/fps
        span = 5.0
        cmd = [self.ffmpeg, "-hide_banner", "-loglevel", "error", "-ss", f"{start:.3f}", "-i", conformed, "-t", f"{span:.3f}",
               "-vf", f"crop={side}:{side}:{x0}:{y0},format=gray", "-f", "rawvideo", "-"]
        buf_path = self.p("run", f"sync-{os.getpid()}.gray")
        os.makedirs(self.p("run"), exist_ok=True)
        with open(buf_path, "wb") as fout:
            rc = self.run_heavy("sync", cmd, timeout_s=120, stdout=fout)
        try:
            data = open(buf_path, "rb").read()
        finally:
            os.unlink(buf_path)
        n = side * side
        frames = [data[i:i + n] for i in range(0, len(data) - n + 1, n)]
        if rc != 0 or len(frames) < 2:
            return {"found": False, "why": f"could not read the sync box (exit {rc}, {len(frames)} frames)"}
        ref = frames[0]
        first = None
        for i, fr in enumerate(frames[1:], 1):
            changed = sum(1 for a, b in zip(ref, fr) if abs(a - b) > 24)
            if changed >= max(6, n // 400):
                first = i
                break
        if first is None:
            return {"found": False, "why": "nothing changed in the sync box within 2.5 s either side of the move",
                    "box_px": [x0, y0, side, side]}
        t_video = start + first / fps
        return {"found": True, "lag_s": round(t_agent - t_video, 4), "frame": int(round(t_video * fps)),
                "agent_time_s": round(t_agent, 4), "box_px": [x0, y0, side, side], "point": [x, y]}


def conform_checks(src: dict, dst: dict, cmd: list[str], fps: int) -> dict:
    """RUNBOOK §6.2.1's checks on a conform: the time is unchanged (durations within a frame), the output is a true
    constant-rate take whose frame count matches its length, and the command never re-timed the input."""
    frame = 1 / fps
    pre_input = cmd[: cmd.index("-i")] if "-i" in cmd else cmd
    return {
        "durations_within_a_frame": abs(src["duration_s"] - dst["duration_s"]) <= frame + 1e-9,
        "frames_match_duration": dst.get("nb_frames") is not None and abs(dst["nb_frames"] / fps - dst["duration_s"]) <= frame + 1e-9,
        "constant_rate": dst.get("avg_frame_rate") == f"{fps}/1" and dst.get("r_frame_rate") == f"{fps}/1",
        "timestamp_conform_only": ("setpts" not in " ".join(cmd) and not ({"-r", "-framerate"} & set(pre_input))
                                   and f"fps={fps}" in cmd and "-fps_mode" in cmd and cmd[cmd.index("-fps_mode") + 1] == "cfr"),
    }


def _quote(a: str) -> str:
    return a if a and all(c.isalnum() or c in "-_./=:,+" for c in a) else "'" + a.replace("'", "'\\''") + "'"
