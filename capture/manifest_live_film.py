"""Write the picture lane's manifest for a main-live-film-150 recording: the source frame and second of every moment the
trailer uses, the boxes of the controls the film aims at (CSS px of the 1160 x 800 window, from the probes, at the frames
named), how long each waiting state holds still, and the clock check's result.

  python3 -I capture/manifest_live_film.py <frames-dir> <out.json> [--check=check.json] [--tree=<frozen-dir>]

Frame f is file f+1 (00001.png is frame 0), at f/30 s. Standard library only.
"""
import json, os, sys

args = [a for a in sys.argv[1:] if not a.startswith("--")]
opts = dict((a[2:].split("=", 1) + [""])[:2] for a in sys.argv[1:] if a.startswith("--"))
folder, out = args
timeline = json.load(open(os.path.join(folder, "timeline.json")))
probes = json.load(open(os.path.join(folder, "probes.json")))
meta, fps = timeline["meta"], timeline["fps"]
K = meta["K"]

# The probe state on every frame (the deltas folded forward).
states, state, by_frame = {}, {}, {p["f"]: p for p in probes["probes"]}
last = max(by_frame)
for f in range(last + 1):
    if f in by_frame:
        state = {**state, **{k: v for k, v in by_frame[f].items() if k != "f"}}
    states[f] = state


def sec(f):
    return round(f / fps, 4)


def at(f, key):
    return states[f].get(key) if f is not None and f in states else None  # None past a partial recording's end


def still(key, f0):
    """The last frame from f0 on where `key` still has f0's value (a waiting state holding still)."""
    v, f = json.dumps(at(f0, key)), f0
    while f + 1 <= last and json.dumps(at(f + 1, key)) == v:
        f += 1
    return f


def step(f, label, newest=False):
    """The first visible step whose text starts with `label` (or, with newest, the last one: the newest row)."""
    rows = at(f, "steps") or []
    for s in (reversed(rows) if newest else rows):
        text, stamp, rect = s[0], s[1], s[2]
        if text and text.startswith(label):
            return {"text": text, "stamp": stamp, "rect": rect, **({"phase": s[3]} if len(s) > 3 else {})}
    return None


def first_frame(pred, start=0):
    for f in range(start, last + 1):
        if pred(states[f]):
            return f
    return None


toast_on = [f for f in range(last + 1) if at(f, "toast") and float(at(f, "toast")[2]) > 0.01]
spans = []
for f in toast_on:
    if spans and f == spans[-1][1] + 1:
        spans[-1][1] = f
    else:
        spans.append([f, f])
blocked_in_view = first_frame(lambda s: bool(s.get("heldState")), K["hold"])
card_in_view = first_frame(lambda s: any((c[0] or "").startswith("Run isolated tests") for c in s.get("cards") or []), K["runTheTests"])
undo_still_to = still("undo", K["scroll"][1])
moments = {
    "send": {"frame": K["send"], "what": "the request is sent; the run starts (every +N s counts from here)"},
    "cards": {"frame": K["cards"], "what": "the two edit cards arrive and the Details drawer opens on them"},
    "apply1_last_before": {"frame": K["p1"] - 1, "what": "the invoice_kit/dates.py card waiting, the last frame before the click"},
    "apply1_click": {"frame": K["p1"], "what": "Apply edit (dates.py); the app re-renders on this frame (the card moves to Earlier actions)"},
    "apply2_click": {"frame": K["p2"], "what": "Apply edit (tests/test_dates.py), under the second question card"},
    "done_in_place": {"frame": K["scroll"][1], "what": "the drawer scroll settles: the dates.py card marked Done, Undo this edit where Apply edit was"},
    "done_still_until": {"frame": undo_still_to, "what": "the last frame on which Undo this edit and the drawer have not moved"},
    "notice": {"frame": 411, "what": "the reply ends with the host's 'Verification remains incomplete: …' notice"},
    "hold": {"frame": K["hold"], "what": "verification_required: the drawer shows 'Pebble's change isn't verified yet.' with Run the tests, Ask Pebble to finish, Accept as unverified; the status line says Blocked"},
    "held_block_in_view": {"frame": blocked_in_view, "what": "the person's scroll brings the conversation's held run (Blocked, the sentence, the three buttons) into view"},
    "held_settled": {"frame": K["convScroll"][1], "what": "the scroll ends; the held run is static to the click"},
    "run_the_tests_last_before": {"frame": K["runTheTests"] - 1, "what": "the held run, the last frame before the click"},
    "run_the_tests_click": {"frame": K["runTheTests"], "what": "Run the tests (the held run's first button)"},
    "isolated_card": {"frame": card_in_view, "what": "the 'Run isolated tests' card arrives in the drawer ('Runs the project's tests in a temporary copy. Your project files don't change.')"},
    "run_tests_last_before": {"frame": K["runTests"] - 1, "what": "the card waiting, the last frame before the click"},
    "run_tests_click": {"frame": K["runTests"], "what": "Run tests; the isolated test step starts on this frame (+16.8 s), the status line says Testing from about 0.23 s later"},
    "verified": {"frame": K["verified"], "what": "the test step ends ('Requesting isolated tests · 2 s', 2.4 s exactly) and 'Verified · pytest 42 passed on current files' arrives, on the same frame"},
    "completion": {"frame": K["complete"], "what": "the run completes (Done.) and the host's idle follows on the same frame: the app's own completion, for the one celebration"},
}
ask_model = "testsEnd" in K  # v1.5.0's Ask-mode approval (OVERRIDES §40): the tests run inside the approve route


def card(f):
    return at(f, "testsCard")


def bubble(f, start):
    for role, text, rect in at(f, "bubbles") or []:
        if text.startswith(start):
            return {"role": role, "text": text, "rect": rect}
    return None


if ask_model:
    running_in_view = first_frame(lambda s: bool(s.get("testsCard")) and s["testsCard"][2] and s["testsCard"][0].endswith("Running"), K["runTests"])
    summary_from = first_frame(lambda s: any(t.startswith("The isolated test run finished") for _, t, _ in s.get("bubbles") or []), K["testsEnd"])
    live_from = first_frame(lambda s: bool(s.get("liveAttempt")), K["testsEnd"])
    moments.pop("verified")
    moments.update({
        "run_tests_click": {"frame": K["runTests"], "what": "Run tests (App.vue decide() calls approve): the approve route starts the tests. The card leaves Needs your review and reads Running in Earlier actions, below the fold; no step, progress or run event while they run, and the status line keeps the review words"},
        "card_scroll_start": {"frame": K["cardScroll"][0], "what": "the person scrolls the drawer down to the card, now its last"},
        "card_running_in_view": {"frame": running_in_view, "what": "the first frame with the Running card in the drawer's view"},
        "card_settled": {"frame": K["cardScroll"][1], "what": "the scroll ends: the Running card in view and still until the tests end"},
        "tests_running": {"frame": K["runTests"], "until": K["testsEnd"] - 1, "what": "the card reads Running on these 72 frames, exactly 2.4 s"},
        "tests_end": {"frame": K["testsEnd"], "what": "the tests end: the card reads Done and its Result block grows below the fold; the approve route answers, so 'Action completed' arrives (the second toast), and the conversation gets the host's summary; the run is queued and running again"},
        "summary_in_view": {"frame": summary_from, "what": "the conversation shows the host's 'The isolated test run finished with exit code 0. Review the output in Activity & review.'"},
        "result_scroll_start": {"frame": K["resultScroll"][0], "what": "the person scrolls down to the card's Result"},
        "result_in_view": {"frame": K["resultScroll"][1], "what": "the scroll ends: the Done card with Result (Outcome passed, Tests passed 42 …, Exit code 0) and the output '42 passed in 1.84s'"},
        "resumed_attempt": {"frame": K["context"], "what": "the resumed run: 'Recalled 3 memories', then 'Waiting for the model'; its text streams into the drawer's 'Receiving model response'"},
        "live_attempt_shown": {"frame": live_from, "what": "the drawer shows 'Receiving model response' (AttemptStream.vue)"},
        "steps_scroll_start": {"frame": K["stepsScroll"][0], "what": "the person scrolls back up to the newest steps"},
        "steps_in_view": {"frame": K["stepsScroll"][1], "what": "the scroll ends: the newest steps, the run's state and the live response in view; the drawer is still from here to the end"},
        "model_responded": {"frame": K["respond"], "what": "the model responded: the live response closes, and the reply's last paragraph arrives in the conversation in one piece"},
        "verified": {"frame": K["verified"], "what": "'Verified · pytest 42 passed on current files': the completion check on the finished turn"},
        "completion": {"frame": K["complete"], "what": "the run completes (Done.), the host's idle follows on the same frame and the conversation re-reads: the reply moves after the host's summary. The app's own completion, for the one celebration"},
    })
    for m in moments.values():
        if "until" in m:
            m["until_seconds"] = sec(m["until"])
first_saved = round((timeline.get("from") or 0) * fps)
for m in moments.values():
    m["seconds"] = sec(m["frame"]) if m["frame"] is not None else None
    if m["frame"] is not None and not first_saved <= m["frame"] <= last:
        m["not_in_this_recording"] = True  # a partial recording (--from, --frames) has no file for this frame

geometry = {
    "apply_edit_dates": {"frame": K["p1"] - 1, "rect": at(K["p1"] - 1, "apply")},
    "undo_this_edit": {"frame": K["scroll"][1], "rect": at(K["scroll"][1], "undo")},
    "held_buttons": {"frame": K["runTheTests"] - 1, "buttons": at(K["runTheTests"] - 1, "held")},
    "held_sentence": {"frame": K["runTheTests"] - 1, "box": at(K["runTheTests"] - 1, "heldState")},
    "drawer_held_controls": {"frame": K["hold"], "box": at(K["hold"], "drawerRun")},
    "run_tests_button": {"frame": K["runTests"] - 1, "rect": at(K["runTests"] - 1, "apply")},
    # 560: the drawer's scroll to its newest steps (frames 540-558) has settled
    "requesting_step_running": {"frame": 560, "step": step(560, "Requesting isolated tests")},
    "requesting_step_done": {"frame": K["verified"], "step": step(K["verified"], "Requesting isolated tests")},
    "verified_step": {"frame": K["verified"], "step": step(K["verified"], "Verified")},
    "toast": {"frame": spans[0][0] if spans else None, "rect": at(spans[0][0], "toast")[1] if spans else None},
}
if ask_model:
    for key in ("requesting_step_running", "requesting_step_done", "verified_step"):
        geometry.pop(key, None)
    second = spans[1] if len(spans) > 1 else None
    geometry.update({
        "tests_card_running": {"frame": K["cardScroll"][1], "card": card(K["cardScroll"][1])},
        "tests_card_running_last": {"frame": K["testsEnd"] - 1, "card": card(K["testsEnd"] - 1)},
        "tests_card_done": {"frame": K["testsEnd"], "card": card(K["testsEnd"])},
        "tests_card_result": {"frame": K["resultScroll"][1], "card": card(K["resultScroll"][1])},
        "summary_bubble": {"frame": summary_from, "bubble": bubble(summary_from, "The isolated test run finished") if summary_from is not None else None},
        "toast_second": {"frame": second[0] if second else None, "rect": at(second[0], "toast")[1] if second else None},
        "live_attempt": {"frame": K["stepsScroll"][1], "section": at(K["stepsScroll"][1], "liveAttempt")},
        "waiting_step": {"frame": K["stepsScroll"][1], "step": step(K["stepsScroll"][1], "Waiting for the model")},
        "responded_step": {"frame": K["respond"], "step": step(K["respond"], "The model responded", newest=True)},
        "verified_step": {"frame": K["verified"], "step": step(K["verified"], "Verified")},
        "drawer_run_done": {"frame": K["complete"], "box": at(K["complete"], "drawerRun")},
        "reply_after_completion": {"frame": K["complete"] + 2, "bubbles": at(K["complete"] + 2, "bubbles")},
    })
manifest = {
    "recording": os.path.relpath(folder, os.getcwd()),
    "made_by": "capture/record.mjs main-live-film-150 --theme=%s --scale=%s" % (timeline["theme"], timeline["scale"]),
    "release": "Pebble v1.5.0's frontend, frozen with capture/freeze-release.py and verified (tag commit 16dd425)",
    "method": timeline.get("note"),
    "theme": timeline["theme"], "fps": fps, "scale": timeline["scale"], "viewport_css": [1160, 800],
    "frames_saved": timeline["frames"], "from_seconds": timeline.get("from"), "file_of_frame": "frame f is %05d.png with f+1",
    **({"spliced": timeline["spliced"]} if timeline.get("spliced") else {}),
    **({"fidelity": "From the Run tests click the climax follows v1.5.0's Ask-mode event model (OVERRIDES §40): the approved tests run inside the approve route, and Verified is the completion check on the resumed run's finished turn"} if ask_model else {}),
    "moments": moments,
    "toast_on_screen": [{"frames": s, "seconds": [sec(s[0]), sec(s[1])]} for s in spans],
    "geometry_css_px": geometry,
    "clocks": {"run_start_frame": meta["T0"], "live_seconds_at_settles": meta["live"], "approval_waits": meta["waits"],
               "model_attempts": meta["model"], "usage": meta["usage"]},
}
if opts.get("check") and os.path.exists(opts["check"]):
    c = json.load(open(opts["check"]))
    manifest["check"] = {k: c[k] for k in ("stamps_checked", "durations_checked", "status_checked", "failures") if k in c}
json.dump(manifest, open(out, "w"), indent=1, ensure_ascii=False)
print(json.dumps(manifest["moments"], indent=1, ensure_ascii=False))
print("toast", manifest["toast_on_screen"])
