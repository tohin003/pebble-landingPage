"""Check a main-live-film-150 recording against its own clocks (TRAILER_RESEARCH §6.5, OVERRIDES §39): every "+N s"
stamp, every "· N s" duration, the status line's elapsed time, the receipts, the usage lines and the toast, from the
recording's probes.json and timeline.json (record.mjs writes both). With --corpus, every string a viewer can see on the
sampled frames is also looked up in the release's own source and the fixtures, and what isn't found is listed.
A schedule with K.testsEnd follows v1.5.0's Ask-mode approval (OVERRIDES §40), and is also checked for that: no running
"Requesting isolated tests" row and no "Testing" status anywhere, the review status and no live time while the approve
route runs the tests, the tests card reading Running on exactly those 72 frames, and Verified after the resumed turn.
A round-2 schedule (meta fidelity_round 2, OVERRIDES §41) also has its receipts counted from its own rows at each settle,
its usage lines matched to its own usage records, and the window's fallback rows (from progress events, before a run's
first host row) checked against its progress log. A quick chat recording (pet-live-150) gets its own checks: the answer
whole on its turn's end, the status line's time, the usage line and the completion.

  python3 -I capture/check_live_film.py <frames-dir> [--corpus=FILE,FILE,…] [--held=408,480] [--json=OUT]

Exit 1 when a clock or a gate fails. Standard library only.
"""
import json, math, os, re, sys

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict((a[2:].split("=", 1) + [""])[:2] for a in sys.argv[1:] if a.startswith("--"))
folder = args[0]
timeline = json.load(open(os.path.join(folder, "timeline.json")))
probes = json.load(open(os.path.join(folder, "probes.json")))
meta = timeline["meta"]
K, T0, fps = meta["K"], meta.get("T0", meta["K"].get("send")), timeline["fps"]
failures, notes = [], []


def fail(msg):
    failures.append(msg)


def r3(x):
    return round(x * 1000) / 1000


def fmt_duration(seconds):  # activity.ts formatDuration
    if seconds < 1:
        return "<1 s"
    s = math.floor(seconds + 0.5)  # Math.round
    return f"{s} s" if s < 60 else f"{s // 60} min {s % 60:02d} s"


def fmt_offset(at):  # activity.ts formatOffset (< 60 s here)
    return f"+{at:.1f} s"


def usage_text(u):
    seconds = u["seconds"] if u.get("seconds") is not None else u.get("generation_seconds")
    out = [f"{u['input_tokens']:,} in"]
    if u.get("cached_tokens"):
        out.append(f"{u['cached_tokens']:,} cached")
    out.append(f"{u['output_tokens']:,} out")
    if seconds is not None and seconds >= 0.1:
        out.append(f"{seconds:.1f} s")
    rate = u.get("tokens_per_second")
    if rate and u["output_tokens"] >= 64 and seconds is not None and seconds >= 1:
        out.append(f"{math.floor(rate + 0.5):,} tok/s")
    return " ".join(out)

def strings_not_in_corpus():
    """6. Every visible string, looked up in the release's source and the fixtures (--corpus)."""
    corpus = ""
    for path in opts["corpus"].split(","):
        for root, _, files in (os.walk(path) if os.path.isdir(path) else [(os.path.dirname(path), None, [os.path.basename(path)])]):
            for name in files:
                if name.endswith((".vue", ".ts", ".js", ".mjs", ".py", ".md", ".json")):
                    try:
                        corpus += "\n" + open(os.path.join(root, name), encoding="utf-8", errors="replace").read()
                    except OSError:
                        pass
    flat = re.sub(r"\s+", " ", corpus)
    dynamic = [r"\+\d+\.\d s", r"[\d,]+ (in|out|cached)", r"\d+\.\d s", r"\d+ s", r"Worked( for \d+ s)? · \d+ steps?( · waited \d+ s for you)?",
               r"[\d,]+", r"·", r"\d+"]
    missing = {}
    for f, lines in probes["texts"].items():
        for top, left, text in lines:
            s = re.sub(r"\s+", " ", text).strip()
            if s in flat or any(re.fullmatch(d, s) for d in dynamic):
                continue
            missing.setdefault(s, int(f))
    return missing


def report(result):
    if opts.get("corpus"):
        result["strings_not_in_corpus"] = strings_not_in_corpus()
    print(json.dumps(result, indent=1, ensure_ascii=False))
    if opts.get("json"):
        json.dump(result, open(opts["json"], "w"), indent=1, ensure_ascii=False)
    print("CHECK", "FAILED" if failures else "OK", f"({result.get('stamps_checked', 0)} stamps, {result.get('durations_checked', 0)} durations, {result.get('status_checked', 0)} status times)")
    sys.exit(1 if failures else 0)


# The quick chat (pet-live-150, Pet.vue): no steps or receipts; its answer, status line, usage line and completion.
if timeline["name"].startswith("pet-live"):
    states, st, by = {}, {}, {p["f"]: p for p in probes["probes"]}
    rec_last = round((timeline.get("from") or 0) * fps) + timeline["frames"] - 1
    for f in range(rec_last + 1):
        if f in by:
            st = {**st, **{k: v for k, v in by[f].items() if k != "f"}}
        states[f] = st
    feed = lambda f: (states[f].get("pet") or {}).get("feed") or []
    answers = [f for f in range(rec_last + 1) if any(a[0] == "assistant" for a in feed(f))]
    if not answers or answers[0] != K["respond"]:
        fail(f"the answer appears on frame {answers[0] if answers else None}, not on its turn's end {K['respond']}")
    # whole on arrival: the answer's text (without the article's screen-reader heading) shows complete on the first
    # sampled frame it shows at all, at most two frames after the token (Markdown renders on the next frame), and on
    # every sampled frame after; none of it shows before
    texts = {int(f): v for f, v in probes["texts"].items()}
    USAGE_PART = r"[\d,]+ (in|out|cached)|[\d.]+ s|[\d,]+ tok/s"
    def answer_lines(f):  # the visible text inside the answer's article (its box from the probe), without the usage line
        art = next((a for a in feed(f) if a[0] == "assistant"), None)
        if not art or not art[2] or art[2][3] <= 0:
            return []
        left, top, width, height = art[2]
        return [t for y, x, t in texts[f] if top - 1 <= y <= top + height + 1 and left - 1 <= x <= left + width + 1
                and not re.fullmatch(USAGE_PART, t)]
    final = answer_lines(max(texts)) if texts else []
    if not final:
        fail("no answer text on the last sampled frame")
    shown = [f for f in sorted(texts) if answer_lines(f)]
    if shown and not (answers and answers[0] <= shown[0] <= answers[0] + 2):
        fail(f"the answer's text first shows on frame {shown[0]}, not within two frames of the token ({answers[0] if answers else None})")
    sampled = [f for f in sorted(texts) if shown and f >= shown[0]]
    for f in sampled:
        if answer_lines(f) != final:
            fail(f"frame {f}: the answer reads {answer_lines(f)!r}, not the whole answer {final!r}")
    # the status line's time counts from the first running event (the pose's startedAt), shown as whole seconds
    status_checks, statuses = 0, {}
    for f in range(rec_last + 1):
        text = (states[f].get("pet") or {}).get("status")
        statuses.setdefault(text, f)
        m = re.search(r"(\d+)\s?s$", text or "")
        if m:
            t_shown = (f + 1) / fps
            now = math.floor(t_shown - K["running"] / fps + 1e-9)
            lag = math.floor(t_shown - 0.25 - K["running"] / fps + 1e-9)
            if int(m.group(1)) not in (now, lag):
                fail(f"frame {f}: status {text!r} but the run has been running {t_shown - K['running'] / fps:.3f} s")
            status_checks += 1
    # the usage line under the answer: the finish record (the segment's wall seconds), from the frame it is saved
    finish = [u for u in meta.get("usage") or [] if u.get("finish")]
    want = usage_text(finish[-1]) if finish else None
    usage_seen = {}
    for f in sorted(texts):
        lines = texts[f]
        tops = [top for top, _, t in lines if re.fullmatch(r"[\d,]+ in", t)]
        if tops:
            row = " ".join(t for top, _, t in sorted(lines, key=lambda l: l[1]) if top == tops[0])
            usage_seen.setdefault(row, f)
            if row != want:
                fail(f"frame {f}: usage {row!r}, not {want!r}")
            if finish and f < finish[-1]["f"]:
                fail(f"frame {f}: a usage line before the reply is saved (frame {finish[-1]['f']})")
    # the task completes with the run
    done_at = next((f for f in range(rec_last + 1) if ((states[f].get("pet") or {}).get("task") or "").endswith("completed")), None)
    if done_at is None or not K["complete"] <= done_at <= K["complete"] + round(0.25 * fps):
        fail(f"'completed' shows from frame {done_at}, not with the run's completion ({K['complete']})")
    report({"answer_frame": answers[0] if answers else None, "answer_text_from": shown[0] if shown else None, "answer": final,
            "answer_sampled_frames": len(sampled), "status_checked": status_checks,
            "status_first_frames": statuses, "usage": usage_seen, "completed_frame": done_at, "failures": failures})

# 1. The schedule is built from frames: each row's `at` is its own frame's offset from the send, each span its frames.
schedule = meta["schedule"]
for e in schedule:
    if abs(e["at"] - r3((e["made"] - T0) / fps)) > 0.0005:
        fail(f"schedule: {e['label']} at {e['at']} is not frame {e['made']}'s offset {r3((e['made'] - T0) / fps)}")
spans = {}
for e in schedule:
    if e.get("by") == "record":  # a later change to a row's record (its span was checked where the row finished)
        continue
    if e["status"] == "done" and e["duration"] is not None and e["label"].startswith(("The model responded", "Searching", "Reading", "Preparing", "Requesting")):
        if abs(e["duration"] - r3((e["f"] - e["made"]) / fps)) > 0.0005:
            fail(f"schedule: {e['label']} lasts {e['duration']} s but runs frames {e['made']}-{e['f']}")
waits = meta.get("waits") or {}
held_run = "runTests" in K  # main-live-film-150's own checks: the approvals' waits and the 2.4-s isolated test run
# v1.5.0's Ask-mode model (OVERRIDES §40): the approved tests run inside the approve route (K has testsEnd); recordings
# made with the earlier schedule (a running test step that ends with Verified) keep its checks.
ask_model = held_run and "testsEnd" in K
# Fidelity round 2 (OVERRIDES §41): the run in v1.5.0's own order throughout; its meta names the approvals' bindings,
# the settles and every usage record.
round2 = meta.get("fidelity_round") == 2
bind = meta.get("bind") or {"dates": 168, "tests": 174, "run": K.get("runTheTests", 0) + 1}
for label, key, made, click in (() if not held_run else (("invoice_kit/dates.py", "dates", bind["dates"], K["p1"]), ("tests/test_dates.py", "tests", bind["tests"], K["p2"]),
                                ("Requesting isolated tests", "run", bind["run"], K["runTests"]))):
    if abs(waits[key] - r3((click - made) / fps)) > 0.0005:
        fail(f"schedule: the wait on {label} is {waits[key]} s, not frames {made}-{click}")


def live_seconds(t):
    total = 0.0
    tr = meta["transitions"]
    for i, (start, st) in enumerate(tr):
        end = tr[i + 1][0] if i + 1 < len(tr) else math.inf
        if st in ("queued", "running", "retry_wait"):
            total += max(0.0, min(end, t) - start)
    return total


verified = [e for e in schedule if e["label"].startswith("Verified")]
if ask_model:
    if K["testsEnd"] - K["runTests"] != round(2.4 * fps):
        fail("the tests do not run exactly 2.4 s from the Run tests click to the approve route's answer")
    if any(e["label"] == "Requesting isolated tests" and e["status"] == "running" for e in schedule):
        fail("a running 'Requesting isolated tests' row is scheduled: v1.5.0 runs approved tests inside the approve route")
    if live_seconds((K["testsEnd"] - 0.5) / fps) - live_seconds((K["runTests"] + 0.5) / fps) > 1e-6:
        fail("the run accrues live time while the approved tests run (it waits for the approval until they end)")
    responded = [e for e in schedule if e["label"] == "The model responded" and e["made"] > K["testsEnd"]]
    if not responded or not verified or not (responded[-1]["f"] <= verified[0]["f"] <= K["complete"]):
        fail("Verified must follow the resumed run's model turn (runner.py: the completion check runs on a finished turn) "
             "and come before the run completes")
elif held_run:
    tests_run = [e for e in schedule if e["label"] == "Requesting isolated tests" and e["status"] == "done"]
    if not tests_run or tests_run[0]["made"] != K["runTests"] or tests_run[0]["f"] - tests_run[0]["made"] != round(2.4 * fps):
        fail("the isolated test step does not run exactly 2.4 s from the Run tests click")
    if not verified or verified[0]["f"] != K["runTests"] + round(2.4 * fps):
        fail("Verified does not arrive 2.4 s after the Run tests click")

# 2. Replay the probes frame by frame.
state = {}
frames = {}
for p in probes["probes"]:
    frames[p["f"]] = p
last = max(frames) if frames else 0
expected = {}  # base label -> list of schedule rows with that label
for e in schedule:
    expected.setdefault(e["label"], []).append(e)


stamp_checks = dur_checks = status_checks = 0
seen_receipts, seen_usage, toast_frames, status_seen = {}, {}, [], {}
card_running, card_states = [], {}
REVIEW_WORDS = ("Needs your review", "Waiting for your review")  # statusWords.ts: the review key, a run waiting_approval
for f in range(0, last + 1):
    p = frames.get(f)
    if p:
        state.update({k: v for k, v in p.items() if k != "f"})
    t_shown = (f + 1) / fps  # the screenshot shows the clock after the frame's advance
    for s in state.get("steps") or []:
        text, stamp, phase = s[0], s[1], (s[3] if len(s) > 3 else None)
        if not text:
            continue
        if ask_model and text.startswith("Requesting isolated tests") and phase == "running":
            fail(f"frame {f}: a running 'Requesting isolated tests' row")
        m = re.match(r"^(.*?)(?: · (<1 s|\d+ s))?$", text)
        base, took = m.group(1), m.group(2)
        if text.startswith("Explored · "):  # a fold of finished reads and searches: its stamp is the first one's
            rows = expected.get("Searching project source", [])
        else:
            rows = expected.get(base, [])
        if not rows:
            # Before the run's first host row the window shows its own fallback rows, from progress events (activity.ts
            # `local`), each stamped at its event's arrival.
            fallback = [p for p in meta.get("progress") or [] if p["label"] == base and p["f"] <= f and stamp == fmt_offset(r3((p["f"] - T0) / fps))]
            if fallback:
                stamp_checks += 1
                continue
            fail(f"frame {f}: a step not in the schedule: {text!r}")
            continue
        ok = [e for e in rows if stamp == fmt_offset(e["at"]) and e["f"] <= f]
        if not ok:
            fail(f"frame {f}: {text!r} shows {stamp}, schedule {[fmt_offset(e['at']) + ' from f' + str(e['f']) for e in rows]}")
            continue
        stamp_checks += 1
        if took:
            done = [e for e in ok if e["status"] == "done" and e["duration"] is not None and e["duration"] >= 1 and fmt_duration(e["duration"]) == took]
            if not done:
                fail(f"frame {f}: {text!r}: no finished row of {took} by this frame")
            else:
                dur_checks += 1
    status = state.get("status")
    if ask_model:
        card = state.get("testsCard")
        word = card[0].split("Run isolated tests", 1)[-1].strip() if card and card[0] else None
        card_states.setdefault(word, []).append(f)
        if word == "Running":
            card_running.append(f)
        if status and status.startswith("Testing"):
            fail(f"frame {f}: the status line says {status!r}; v1.5.0 sends no progress while approved tests run")
        if K["runTests"] <= f < K["testsEnd"] and status and not status.startswith(REVIEW_WORDS):
            fail(f"frame {f}: the status line says {status!r} while the run waits for the approval")
    if status:
        m = re.search(r"(\d+) s$", status)
        status_seen.setdefault(status, f)
        if m:
            shown = int(m.group(1))
            now, lag = math.floor(live_seconds(t_shown) + 1e-9), math.floor(live_seconds(t_shown - 0.25) + 1e-9)
            if shown not in (now, lag):
                fail(f"frame {f}: status {status!r} but the run has been live {live_seconds(t_shown):.3f} s")
            status_checks += 1
        elif "~" in status:
            fail(f"frame {f}: an approximate elapsed time {status!r}")
    for text, _ in state.get("receipts") or []:
        seen_receipts.setdefault(text, []).append(f)
    for text, _ in state.get("usage") or []:
        seen_usage.setdefault(text, []).append(f)
    toast = state.get("toast")
    if toast and float(toast[2]) > 0.01:
        toast_frames.append(f)

# The tests card reads Running exactly while the approve route runs the tests (frames runTests .. testsEnd - 1), when
# the recording reaches them (the dark twin, --frames=499, ends at 16.6 s).
rec_last = round((timeline.get("from") or 0) * fps) + timeline["frames"] - 1
if ask_model and rec_last < K["testsEnd"]:
    notes.append(f"the recording ends at frame {rec_last}, before the tests run ({K['runTests']}-{K['testsEnd'] - 1}): their gate is not applied")
elif ask_model and card_running != list(range(K["runTests"], K["testsEnd"])):
    spans_r = f"{card_running[0]}-{card_running[-1]} ({len(card_running)} frames)" if card_running else "never"
    fail(f"the tests card reads Running on frames {spans_r}, not exactly frames {K['runTests']}-{K['testsEnd'] - 1}")

# 3. Receipts: the live "Worked · N steps", or the host's live seconds and waits once settled. Round 2 counts the steps
# from the schedule's own rows at each settle (activity.ts tally(): tool, check and child rows; approvals' waits).
L = meta.get("live") or [0, 0, 0]
if round2 and held_run:
    def tally_at(f):
        latest = {}
        for e in schedule:
            if e["f"] <= f or e.get("by") == "mock" and e["made"] <= f:
                latest[e["seq"]] = e
        steps_n = sum(1 for e in latest.values() if e.get("kind") in ("tool", "check", "child"))
        waited = sum(e["duration"] or 0 for e in latest.values() if e.get("kind") == "approval")
        return steps_n, waited

    def receipt_text(seconds, steps_n, waited):
        parts = [f"Worked for {fmt_duration(seconds)}", f"{steps_n} step{'s' if steps_n != 1 else ''}"]
        if waited >= 1:
            parts.append(f"waited {fmt_duration(waited)} for you")
        return " · ".join(parts)
    allowed = {receipt_text(L[i], *tally_at(f)) for i, f in enumerate(meta["settles"])}
else:
    allowed = set() if not held_run else {f"Worked for {fmt_duration(L[0])} · 4 steps",
               f"Worked for {fmt_duration(L[1])} · 7 steps · waited {fmt_duration(waits['dates'] + waits['tests'])} for you",
               f"Worked for {fmt_duration(L[2])} · 9 steps · waited {fmt_duration(waits['dates'] + waits['tests'] + waits['run'])} for you"}
for text, fs in seen_receipts.items():
    if held_run and text not in allowed and not re.fullmatch(r"Worked · \d+ steps?", text) and text != "What Pebble did":
        fail(f"receipt {text!r} on frames {fs[0]}-{fs[-1]} is not the host's live seconds")


# 4. Usage lines: under the 4,096-token window. Round 2: each line is one of the run's own usage records as TokenStats
# shows it (the segment's wall seconds once finish() saved them, else the generation seconds; tok/s only with at least
# 64 output tokens over at least 1 s). Earlier schedules: no rate, and the time is the model attempts' sum.
usage_allowed = {usage_text(u) for u in meta.get("usage") or []} if round2 else set()
for text, fs in seen_usage.items():
    # TokenStats separates its fields with CSS ("·" in ::before), so the text has spaces between them
    m = re.match(r"^([\d,]+) in(?:(?: · | )([\d,]+) cached)?(?: · | )([\d,]+) out(?:(?: · | )([\d.]+) s)?(?:(?: · | )([\d,]+) tok/s)?$", text)
    if not m:
        fail(f"usage {text!r}: unexpected form")
        continue
    if int(m.group(1).replace(",", "")) > 4096:
        fail(f"usage {text!r}: more input than the 4,096-token window")
    if round2:
        if text not in usage_allowed:
            fail(f"usage {text!r}: not one of the run's own usage records {sorted(usage_allowed)}")
        continue
    if m.group(5):
        fail(f"usage {text!r}: shows a rate")
    if m.group(4) and m.group(4) not in {f"{u['seconds']:.1f}" for u in meta.get("usage") or []}:
        fail(f"usage {text!r}: its time is not the attempts' sum")

# 5. The toast: never during the held run's shots, and gone before them.
held = [int(x) for x in opts.get("held", f"{K['hold'] - 13},{K['runTheTests']}" if "hold" in K else "-1,-1").split(",")]
spans_t = []
for f in toast_frames:
    if spans_t and f == spans_t[-1][1] + 1:
        spans_t[-1][1] = f
    else:
        spans_t.append([f, f])
for a, b in spans_t:
    if a <= held[1] and b >= held[0]:
        fail(f"the toast is on screen on frames {a}-{b}, inside the held run's frames {held[0]}-{held[1]}")

result = {"stamps_checked": stamp_checks, "durations_checked": dur_checks, "status_checked": status_checks,
          **({"tests_card": {str(k): [v[0], v[-1], len(v)] for k, v in card_states.items()}} if ask_model else {}),
          "receipts": {k: [v[0], v[-1]] for k, v in seen_receipts.items()},
          "usage": {k: [v[0], v[-1]] for k, v in seen_usage.items()},
          "toast_frames": spans_t, "status_first_frames": status_seen, "failures": failures, **({"notes": notes} if notes else {})}

report(result)
