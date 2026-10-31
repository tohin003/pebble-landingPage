# The take agent: real takes in the demo user while the person is away (RUNBOOK §10, mode B)

The Pebble 2.0 film's real takes (route R, `.work/real-takes/RUNBOOK.md` and `MATRIX.md`) are recorded on Pebble 2.0.0
in a demo macOS user, **Studio**, that holds nothing but the sample world. The person sets that user up once
(`STUDIO_SETUP.md`, about 39 minutes), starts the take agent in its Terminal and leaves. The lead then drives the takes
from the person's own account by writing job files; the agent runs them on the Studio user's real screen and writes
back results, stills, recordings and their conforms.

```
capture/takes/
  agent/            installed read-only to /Users/Shared/pebble-takes/agent/
    takeagent.py    the agent: the watch loop, the kill switch, the job runner, every action
    jobspec.py      the job format: the fixed vocabulary and its validator (the lead's tools use the same one)
    macos.py        the hands: real pointer and keyboard events (CoreGraphics), the permission checks
    ax.js           the eyes: windows and elements through System Events (Accessibility), read only
    media.py        the camera: recordings, stills, ffprobe's measurements, the conform and its checks
    rec.sh          the recorder heavy.sh runs (screencapture -v, or FFmpeg's avfoundation input)
    config.json     the allowlists (apps, pages, folders) and limits
    setup.sh        the Studio user's one setup line;   start.sh  the agent alone
  enqueue.py        the lead: jobs into the queue; status, wait, show, pause, resume, stop
  jobs/             job templates: dry/ (run first), setup/ (scenes, resets, a look), takes/ (RUNBOOK §7)
  privacy.py ocr.js RUNBOOK §8 by machine (Vision OCR) plus contact sheets for the lead's eyes
  takelog.py        the take log's verdicts and its export
  install.sh        installs the agent;   stage_world.sh  builds and stages the sample world
  STUDIO_SETUP.md   the person's checklist (also on their Desktop, in Pebble 2.0 film/)
  tests/            headless tests (simulate mode only)
```

## The order of things

1. **The lead, now** (the person's account; light):
   `bash capture/takes/stage_world.sh 2026-11-07` (the Saturday after the recording days; the manifest's checks must
   pass and the privacy scan be clean), then `bash capture/takes/install.sh`.
2. **The person** follows `STUDIO_SETUP.md`. The last step starts the agent; it checks its permissions, moves the
   pointer a little in front of the person, and writes `results/preflight.json` and a heartbeat
   (`results/agent.json`, every 5 s).
3. **The lead posts the hold** (RUNBOOK §6.4): the status file, and the landing repo's `.work/HOLD`, so no heavy job of
   ours runs while the Studio user records. `enqueue.py status` shows the agent ready.
4. **The dry run first:** `enqueue.py dry-run` queues `jobs/dry/01…09` (probe, Calculator, a 6 s recording and its
   conform, the Spaces, both recorders measured, a SIGINT stop, typing, Pebble's Accessibility tree). Read every
   result (`enqueue.py show <id>`), every still and dump in `results/<id>/`, and the conforms in `conformed/`. Then:
   - choose the recorder (RUNBOOK §6.2: dry05 against dry06: frames, average rate, gaps, MB a minute) and the stop
     method (`key` worked if dry05's file is whole; else `signal`);
   - write `.work/real-takes/positions.json` (`jobs/positions.example.json`): the pebble's centre (`stone`) read off
     dry09's stills (the still is in pixels: divide by the scale in `preflight.json` for points) or its AX dump;
   - correct each take template's element names from the AX dumps (Allow, the composer, Open full workspace …), and
     rename the conversations the takes use (R15), with small jobs.
5. **The takes**, P0 first (RS-15, RS-1, RS-9, RS-4, RS-5, RS-H, RS-13, RS-W), then P1. One job per take:
   `enqueue.py job capture/takes/jobs/takes/rs4.json`; `enqueue.py wait RS4-01`. Each records, conforms and logs.
6. **Every take is looked at** (RUNBOOK §8): `privacy.py /Users/Shared/pebble-takes/conformed/RS4-01.mp4` through
   heavy.sh, then the contact sheets by eye, then `takelog.py verdict RS4-01 kept|rejected "why"` (a rejected take is
   deleted at once: `--delete`).
7. **After the last take:** lift the hold; `takelog.py export`; RUNBOOK §9's cleanup.

## Jobs: data in a fixed vocabulary

A job is a JSON file `queue/NNNN-<id>.json`:

```json
{"schema": "pebble-take-job/1", "id": "RS4-01", "take": "RS-4", "title": "Calculator", "max_minutes": 10,
 "steps": [{"do": "record_start", "name": "RS4-01", "max_s": 120},
           {"do": "find", "app": "Pebble", "role": "AXButton", "name": "Allow", "save_as": "@allow"},
           {"do": "click", "at": "@allow", "event": "allow"}, …]}
```

| Action | What it does |
|---|---|
| `wait` `{s}` | waits (≤ 600 s) |
| `wait_window` `{app, title or title_contains, gone, timeout_s}` | waits for a window (System Events) |
| `wait_element` `{app, role, name, contains, window_contains, index, gone, optional, save_as, anchor, timeout_s}` | waits for an element; can save its point |
| `wait_file` `{path, gone, timeout_s}` | waits for a file in the allowed folders |
| `find` `{…as wait_element…, save_as}` | finds an element now (10 s by default) and saves its centre, or `anchor` top/bottom/left/right (a window's top is its title bar) |
| `ax_dump` `{app, window_contains, max, name}` | writes the app's Accessibility tree to `results/<id>/ax-*.json` (read only) |
| `screen_info`, `pointer` | the display (points, pixels, scale, Hz); the pointer's place |
| `move` `{to, ms, curve}` | moves the pointer along a hand's arc (minimum-jerk speed, 120 updates a second) |
| `click` `{at, ms, button, count, hold_ms, mods}` | moves there, then presses and lets go |
| `drag` `{from, to or circle, ms, hold_ms}` | a real drag (RS-14; the dry run drags a window in circles) |
| `scroll` `{at, lines, ms}` | scroll-wheel lines |
| `type` `{text, cps, jitter, seed}` | types the characters themselves (any layout: ×, “ ”, °), about 6.5 a second, a little uneven |
| `key` `{key, mods, repeat, hold_ms, gap_ms}` | a key or chord: `{"key": "k", "mods": ["cmd"]}`, `{"key": "right", "mods": ["ctrl"]}` |
| `open_app`, `activate` `{app}`; `open_file` `{path, app}`; `open_url` `{url, app}` | only apps, pages and folders on the allowlists (`config.json`) |
| `hide` `{app}` | hides an allowlisted app (the agent hides its own Terminal before every job) |
| `still` `{name, region}` | a screenshot (`screencapture -x -C`) into `results/<id>/` |
| `record_start` `{name, max_s, method, stop_with, display}`; `record_stop` | a recording into `raw/<name>.mov`, through heavy.sh's copy |
| `mark` `{event}` | an event on the recording's clock |
| `conform` `{name, sync}` | RUNBOOK §6.2.1's conform and its checks (below) |
| `reset` `{what}` | the sample world's `reset_take.sh photos|notes|app-actions|calculator|all` |
| `log` `{text}` | a note in the agent's log |

Every step may carry `"event"` (that moment is logged on the recording's clock: a click's press, a key's press, the
first typed character, a move's start, any other step's start), `"note"`, and `"if": "@name"` (run only if an earlier
optional `find`/`wait_element` saved that point: RS-9's press card, R10). Points are screen points (CoreGraphics' global
space, the main display's top-left at 0,0), `"@name"`, or `{"ref": "@name", "dx": …, "dy": …}`; every point must be
on the screen. Templates add placeholders (`"$stone"`, `"$n"`, `"$video_message"`) that `enqueue.py` fills before the
validator sees the job; the agent itself never substitutes anything.

## Safety

- **Kill switch:** `enqueue.py stop` writes `/Users/Shared/pebble-takes/STOP`. Within one pointer tick the agent lets go
  of any key or button, stops a running recording (the file is kept), writes the job's result as `stopped` and exits.
  Only the person can start it again, and `start.sh` refuses while STOP exists. Ctrl-C in its window does the same.
  `enqueue.py pause` (a `PAUSE` file) only keeps it from starting a new job.
- **A fix without the person:** after `install.sh`, `enqueue.py restart` writes `RESTART`; between jobs, with no
  recording running, the agent starts itself again in the same process (exec: the same Terminal, so the same
  permissions) and loads the new code at that new start. Only the person's account can write `RESTART`.
- **Jobs are data:** a malformed job (unknown action or key, a value out of range, an app, page or folder off the
  allowlist, a control character in a text, a point no earlier step saved) is refused whole before any step runs. A
  job runs once: its `results/<id>/` folder marks it, and a job found half-run at start is marked `interrupted`.
- **No arbitrary shell, no network of its own:** the agent runs only fixed programs (`open`, `osascript` with its own
  JXA, `screencapture`, FFmpeg and ffprobe, heavy.sh's copy, `reset_take.sh`), with arguments it builds from checked
  values, never through a shell. It reads and writes only `/Users/Shared/pebble-takes`, the Studio user's home and
  `/Applications` (and runs the sample world's own read-only reset script). Paths are resolved (symlinks too) before
  the check.
- **Code loaded once:** its Python modules, `ax.js` and `config.json` are read at start; the scripts it runs (heavy.sh,
  env.sh, rec.sh, reset_take.sh) are hashed at start and refused if they change.
- **Only in Studio:** it posts input, records and takes stills only when it runs as `studio` with `--live`
  (`macos.arm` checks the account before every event). In any other account it refuses `--live` and simulates.
  This matters: the person's own session's host app has Accessibility and Screen Recording, so the account check is
  what keeps the tests from ever moving the person's pointer.
- **Logged:** every action, with a millisecond timestamp, in `log/agent.log`.
- **Its input is the person's input in the film's terms:** real events at the HID level, the real pointer recorded by
  `screencapture -C`; nothing is painted.

### Who can write what

| Path | Owner, mode | Who writes |
|---|---|---|
| `/Users/Shared/pebble-takes` | the person's account, 755 | only our side (STOP, PAUSE, INSTALLED.json) |
| `agent/`, `scripts/` | the person's account, 755, files 644 | `install.sh` only; Studio runs them, never changes them |
| `queue/` | the person's account, 755 | the lead only; the agent only reads |
| `results/`, `raw/`, `conformed/`, `log/`, `run/`, `.work/` | group `staff`, 2775 | the agent (Studio) and the lead |

Every account made in Users & Groups is in `staff`, and this Mac has no account but the person's (checked 31 Oct), so
in practice group write means the person's account and Studio. An ACL naming `studio` can't be set before the user
exists; once it does, the lead may tighten it (`chmod +a "studio allow add_file,add_subdirectory,delete_child,file_inherit,directory_inherit" …`
and `chmod g-w`). The agent's umask is 002, so the lead can read and append to what it writes.

## Recording and the conform

- **Recorder:** `rec.sh` under heavy.sh's copy (its own lock and log in `/Users/Shared/pebble-takes/.work/`, the same
  disk and memory floors) and `taskpolicy -c utility`: `screencapture -v -C -x -D 1 -V <max_s>` (RUNBOOK §6.2 A) or
  FFmpeg's avfoundation screen input (§6.2 B; it fails cleanly where the device is gone). Its standard input is a
  FIFO the agent holds: a background job's stdin is otherwise `/dev/null`, which can end a recording that waits for a
  key at once. Stop methods: `key` (a character on the FIFO, screencapture's own stop), `signal` (SIGINT), `duration`
  (its own limit), each with SIGINT, then TERM, as fallbacks. `record_start` refuses below twice the take's estimated
  size plus 2 GB free (RUNBOOK §6.3). The dry run measures the real rate.
- **Stills** don't go through heavy.sh: a recording holds its lock for the whole take, so a still would wait for the
  take to end. A still is one PNG in under a second, refused under 1.7 GiB free.
- **The conform** is RUNBOOK §6.2.1 word for word, run in `/Users/Shared/pebble-takes` through heavy.sh:
  `ffmpeg -hide_banner -i raw/<name>.mov -vf fps=60 -fps_mode cfr -an -c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p conformed/<name>.mp4`.
  Its checks: the raw and conformed durations within one frame; the frame count matching the duration; a true 60/1
  rate; no input-side rate and no setpts in the command. `conformed/<name>.conform.json` has `TakeConform`'s shape
  (`method`, `command`, `sourceDurationS`, `outputDurationS`, `events: {name: {wallS}}`) plus `_detail` (both
  probes, the checks, the sync, each event's predicted frame), ready for `checkTakeManifest()`.
- **The events' clock:** the agent times every event from the moment the recorder opened its control pipe. The real
  first frame comes a little later, so the conform finds the first pointer movement in the picture (a small box
  around where the pointer started; the agent logged when it moved) and subtracts that lag. `wallS` is then on the
  recording's own clock. Check one or two events by eye before a manifest uses them.

## Tests

```
cd <repo> && TMPDIR=/private/tmp/claude-501/takes-tests /usr/sbin/taskpolicy -b \
  /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 -I -B -m unittest discover -s capture/takes/tests -v
```

34 tests, all headless; the agent runs in simulate mode: the vocabulary and every kind of refusal; jobs run once and every step
is logged; optional finds and `if`; off-screen points and outside paths refused at run time; PAUSE; interrupted jobs;
the kill switch by STOP and by Ctrl-C (stops within 2 s, the recording stopped and kept); `--live` refused in any
other account and with test overrides; stills and recordings refused outside live mode; the JXA helper's matching;
the conform on a synthetic variable-rate clip (time kept, 180 frames, the sync found within a frame, a frame-count
conform caught by the checks); every template builds; the whole dry run walks through in simulation; RESTART execs
once, in the same process. The recorder's plumbing runs for real with a synthetic picture in place of the screen
(rec.sh's test-only `testsrc`, which jobs can't ask for): heavy.sh's actual copy with its lock and log, the control
FIFO, each stop (key, SIGINT, its own limit), a HOLD in the take folder refused cleanly, and the conform through
heavy.sh. The UI actions themselves (pointer, keys, Accessibility, screencapture) are tested only in the dry run, in
the Studio user.

## Decisions worth knowing

- **Pointer and keys through framework Python's ctypes**, calling the same CoreGraphics functions JXA's bridge exposes.
  Nothing is compiled or installed (the framework Python is the one every user here already runs: the sample world's
  copy-in uses it), and the motion runs in-process at 120 Hz, which a new `osascript` per step can't. JXA does the
  Accessibility reads and the OCR.
- **Terminal's Accessibility and Screen Recording are granted by hand before the setup command** (checklist step 4),
  not after: Screen Recording takes effect only when Terminal starts again, and the setup command runs in Terminal.
- **The person quits their own heavy apps before switching** (checklist step 1): it has to happen in their account,
  before the first switch, and they don't switch back before leaving.
- **Terminal stays running** (the agent's permissions belong to it): it is hidden before every job, but its icon is
  in the Dock while it runs. RS-13 frames the Dock: crop it or keep it; it is real.
