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
    return states[f].get(key)


def still(key, f0):
    """The last frame from f0 on where `key` still has f0's value (a waiting state holding still)."""
    v, f = json.dumps(at(f0, key)), f0
    while f + 1 <= last and json.dumps(at(f + 1, key)) == v:
        f += 1
    return f


def step(f, label):
    for text, stamp, rect in at(f, "steps") or []:
        if text and text.startswith(label):
            return {"text": text, "stamp": stamp, "rect": rect}
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
for m in moments.values():
    m["seconds"] = sec(m["frame"]) if m["frame"] is not None else None

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
manifest = {
    "recording": os.path.relpath(folder, os.getcwd()),
    "made_by": "capture/record.mjs main-live-film-150 --theme=%s --scale=%s" % (timeline["theme"], timeline["scale"]),
    "release": "Pebble v1.5.0's frontend, frozen with capture/freeze-release.py and verified (tag commit 16dd425)",
    "method": timeline.get("note"),
    "theme": timeline["theme"], "fps": fps, "scale": timeline["scale"], "viewport_css": [1160, 800],
    "frames_saved": timeline["frames"], "from_seconds": timeline.get("from"), "file_of_frame": "frame f is %05d.png with f+1",
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
