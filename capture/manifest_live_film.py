"""Write the picture lane's manifest for a main-live-film-150 recording: the source frame and second of every moment the
trailer uses, the boxes of the controls the film aims at (CSS px of the 1160 x 800 window, from the probes, at the frames
named), how long each waiting state holds still, and the clock check's result. A main-challenge-live or pet-live-150
recording gets its own moments and boxes; a round-2 recording (meta fidelity_round 2) is marked "fidelity_round": 2, and
main-live-film-150's carries the Undo's per-frame track (undo_track).

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

# The probe state on every frame (the deltas folded forward), to the recording's last frame.
states, state, by_frame = {}, {}, {p["f"]: p for p in probes["probes"]}
last = max(max(by_frame), round((timeline.get("from") or 0) * fps) + timeline["frames"] - 1)
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


first_saved = round((timeline.get("from") or 0) * fps)
# The Details drawer's scrolling panel shows from this y down to the window's bottom (800). Probed as drawerBox from
# retake 2b on ([801, 115, 359, 685] in the dark twin); earlier probes lack it, so that measured top stands in for them.
PANEL_TOP_MEASURED = 115


def panel_top(f):
    box = at(f, "drawerBox")
    return box[1] if box else PANEL_TOP_MEASURED


def usage_spans(lines_at):
    """Every span of frames on which a usage line (TokenStats) is visible, per line text: its first and last frames and
    seconds, its box then, and the union of its boxes over the span (CSS px), within this recording's saved frames."""
    done, open_ = [], {}
    for f in range(first_saved, last + 1):
        seen = {text: rect for text, rect in (lines_at(f) or []) if rect}
        for text in [t for t in open_ if t not in seen]:
            done.append(open_.pop(text))
        for text, rect in seen.items():
            span = open_.get(text)
            if span is None:
                open_[text] = {"text": text, "frames": [f, f], "first_box": rect, "last_box": rect, "union_box": list(rect)}
                continue
            span["frames"][1], span["last_box"] = f, rect
            u = span["union_box"]
            x0, y0 = min(u[0], rect[0]), min(u[1], rect[1])
            x1, y1 = max(u[0] + u[2], rect[0] + rect[2]), max(u[1] + u[3], rect[1] + rect[3])
            span["union_box"] = [x0, y0, round(x1 - x0, 1), round(y1 - y0, 1)]
    done += open_.values()
    for span in done:
        span["seconds"] = [sec(span["frames"][0]), sec(span["frames"][1])]
        span["shows_rate_or_cached"] = bool(" tok/s" in span["text"] or " cached" in span["text"])
    return sorted(done, key=lambda span: span["frames"][0])


def common(name, made_by):
    return {"recording": os.path.relpath(folder, os.getcwd()), "made_by": made_by,
            "release": "Pebble v1.5.0's frontend, frozen with capture/freeze-release.py and verified (tag commit 16dd425)",
            "method": timeline.get("note"), "theme": timeline["theme"], "fps": fps, "scale": timeline["scale"],
            "frames_saved": timeline["frames"], "from_seconds": timeline.get("from"), "file_of_frame": "frame f is %05d.png with f+1",
            **({"fidelity_round": 2} if meta.get("fidelity_round") == 2 else {}),
            **({"retake": meta["retake"]} if meta.get("retake") else {})}


def finish_manifest(manifest):
    for m in manifest["moments"].values():
        if isinstance(m, dict) and "frame" in m and m["frame"] is not None and "seconds" not in m:
            m["seconds"] = sec(m["frame"])
    if opts.get("check") and os.path.exists(opts["check"]):
        c = json.load(open(opts["check"]))
        manifest["check"] = {k: c[k] for k in ("stamps_checked", "durations_checked", "status_checked", "failures") if k in c}
    json.dump(manifest, open(out, "w"), indent=1, ensure_ascii=False)
    print(json.dumps(manifest["moments"], indent=1, ensure_ascii=False))
    sys.exit(0)


if "refused" in K:  # main-challenge-live: the refused write's step, its Details, the scroll
    def refused_row(f):
        for s in at(f, "steps") or []:
            if (s[0] or "").startswith("Preparing an edit to invoice_kit/templates/statement.html"):
                return [s[1], s[2]]
        return None
    moves = sorted({f for f in range(K["scroll"][1] + 1, last + 1) if json.dumps(at(f, "steps")) != json.dumps(at(f - 1, "steps"))
                    or at(f, "drawerTop") != at(f - 1, "drawerTop")})
    live_from = first_frame(lambda s: bool(s.get("liveAttempt")), K["refused"][1])
    finish_manifest({**common("main-challenge-live", "capture/record.mjs main-challenge-live --theme=%s --scale=%s --from=%s" % (timeline["theme"], timeline["scale"], timeline.get("from"))),
        "viewport_css": [1160, 800],
        "moments": {
            "refused_step_arrives": {"frame": K["refused"][1], "what": "the refused write's step turns red ('Preparing an edit to invoice_kit/templates/statement.html') with a collapsed Details"},
            "next_turn": {"frame": K["refused"][1] + 2, "what": "the model's next turn starts at once ('Waiting for the model'); the drawer's live response opens below the steps (empty: no text yet)"},
            "live_attempt_shown": {"frame": live_from, "what": "'Receiving model response' shows under the steps (AttemptStream.vue)"},
            "details_opened": {"frame": K["details"], "what": "the person opens Details: 'AgentGuard: AgentGuard — evidence check', '5 file(s) changed that the task does not reach', the request, the evidence, the suggestion and the closing line"},
            "scroll": {"frames": K["scroll"], "what": "the person scrolls the drawer so the whole challenge is in view"},
            "still_from": {"frame": K["scroll"][1], "what": "nothing in the drawer moves from here to the last frame" if not moves else "the drawer settles here; see moves_after_still_from"},
            "last_frame": {"frame": last},
        },
        "moves_after_still_from": moves,
        "geometry_css_px": {
            "refused_row_collapsed": {"frame": K["refused"][1], "row": refused_row(K["refused"][1])},
            "refused_row_open": {"frame": K["details"], "row": refused_row(K["details"])},
            "refused_row_open_after_scroll": {"frame": K["scroll"][1], "row": refused_row(K["scroll"][1])},
            "drawer_scroll_top_after": at(K["scroll"][1], "drawerTop"),
            "live_attempt_after_scroll": {"frame": K["scroll"][1], "section": at(K["scroll"][1], "liveAttempt")},
        },
        "wording": "the vendored AgentGuard engine at v1.5.0 (validate/checks.py scope_creep(), challenge/renderer.py render(), guard.py refusal()), unchanged since v1.0.4; five files outside the task's reach (OVERRIDES §9)",
        "usage_lines": usage_spans(lambda f: at(f, "usage")),
    })

if "click" in K and "hold" not in K:  # pet-live-150: the quick chat
    # .pet-status's text also holds StatusLine's screen-reader sentence (statusWords.ts STATUS_LABELS, "Reply
    # finished"), which is visually hidden: the status line below is the visible word and time only.
    SR = ("Pebble is thinking", "Pebble is writing a reply", "Pebble is reading", "Pebble is searching", "Pebble is editing",
          "Pebble is testing", "Pebble is running a command", "Pebble is working", "Sending your message", "Reply finished")

    def pet(f, key):
        p = at(f, "pet") or {}
        return p.get(key)

    def visible_status(text):
        t = (text or "").strip()
        for sentence in SR:
            if t.startswith(sentence):
                return t[len(sentence):].strip()
        return t

    def article(f):
        return next((a for a in pet(f, "feed") or [] if a[0] == "assistant"), None)
    answer_at = first_frame(lambda s: any(a[0] == "assistant" for a in (s.get("pet") or {}).get("feed") or []), K["send"])
    answer_text_at = first_frame(lambda s: any(a[0] == "assistant" and a[2] and a[2][3] > 0 for a in (s.get("pet") or {}).get("feed") or []), K["send"])
    completed_at = first_frame(lambda s: ((s.get("pet") or {}).get("task") or "").endswith("completed"), K["send"])
    finish = [u for u in meta.get("usage") or [] if u.get("finish")]
    statuses = []
    for f in range(K["click"], last + 1):
        st = visible_status(pet(f, "status"))
        if not statuses or statuses[-1][1] != st:
            statuses.append([f, st])
    first_word = lambda word: next((f for f, t in statuses if t.startswith(word)), None)
    cleared = next((f for f, t in statuses if f > K["send"] and t == ""), None)
    # the composer: the first frame on which it holds the whole question (probed from retake 2b on), and its Send button
    question = pet(K["send"] - 1, "typed")
    typed_at = first_frame(lambda st: question and (st.get("pet") or {}).get("typed") == question, K["click"]) if question else None
    send_at_typed = pet(typed_at, "send") or [None, None, None] if typed_at is not None else None
    # what changes once the whole answer shows: each frame where a probed part of the quick chat differs from the frame before
    changes = []
    if answer_text_at is not None:
        parts = ("feed", "usage", "status", "task", "send", "feedBox")
        for f in range(answer_text_at + 1, last + 1):
            what = {k: pet(f, k) for k in parts if json.dumps(pet(f, k)) != json.dumps(pet(f - 1, k))}
            if what:
                if "status" in what:
                    what["status"] = visible_status(what["status"])
                if "feed" in what:
                    what["feed"] = [[a[0], a[2]] for a in what["feed"]]
                changes.append({"frame": f, "seconds": sec(f), **what})
    finish_manifest({**common("pet-live-150", "capture/record.mjs pet-live-150 --theme=%s --scale=%s%s" % (timeline["theme"], timeline["scale"], " --hide=" + timeline["hide"] if timeline.get("hide") else "")),
        "viewport_css": [384, 456],
        "transparent": True,
        "moments": {
            "click": {"frame": K["click"], "what": "the pebble is clicked: the quick chat opens ('pebble.', 'A little help, right here.')"},
            "typing": {"frame": K["type"], "until": K["send"] - 1, "what": "the question types itself, one character every 34 ms (the person's part; the film may play it at up to 2x)"},
            "send": {"frame": K["send"], "what": "Enter: the question is sent; the status line says Sending, the task line 'Task: queued'"},
            "thinking": {"frame": first_word("Thinking"), "what": "the status line says Thinking (the pose's status after the send; the run starts at %d, 'Task: running')" % K["running"]},
            "answer_token": {"frame": answer_at, "what": "the model's turn ends: its text arrives in one token event; the status line says Writing and the answer's article is added (its text renders on the next frame)"},
            "answer_visible": {"frame": answer_text_at, "what": "the whole answer shows at once: 'Python is being asked for a date that doesn't exist, like 31 February. If it's from your invoice export, open invoice-kit and I'll look.'"},
            "usage_line": {"frame": finish[-1]["f"] if finish else None, "what": "the reply is saved: its usage line '1,180 in · 52 out · 3.3 s' shows under the answer"},
            "completed": {"frame": completed_at, "what": "the task completes ('Task: completed' for a moment); the header shows 'A little help, right here.' again"},
            "status_cleared": {"frame": cleared, "what": "the status line clears"},
            "idle": {"frame": K["idle"], "what": "the host's idle after its upkeep"},
        },
        "status_line": [{"frame": f, "seconds": sec(f), "text": t} for f, t in statuses],
        **({"typed": {"complete_from": typed_at, "complete_seconds": sec(typed_at), "until": K["send"] - 1, "text": question,
                      "send_button": {"frame": typed_at, "label": send_at_typed[0], "box": send_at_typed[1], "disabled": send_at_typed[2]},
                      "what": "the question is fully typed in the composer and Send message is enabled from this frame to the Enter on %d (the recording sends with Enter: no pointer, no hover or pressed state on the button)" % K["send"]}}
           if typed_at is not None else {}),
        **({"after_answer": {"from": answer_text_at, "to": last, "changes": changes,
                             "what": "every frame from the whole answer on where the quick chat's probed state changes (the feed's articles, the usage line, the status line, the task line, the composer's last button)"}}
           if answer_text_at is not None else {}),
        "usage_lines": usage_spans(lambda f: pet(f, "usage")),
        "geometry_css_px": {"answer_article": {"frame": answer_text_at, "box": (article(answer_text_at) or [None, None, None])[2]},
                            "answer_article_with_usage": {"frame": finish[-1]["f"] if finish else None, "box": (article(finish[-1]["f"]) or [None, None, None])[2] if finish else None},
                            "answer_article_settled": {"frame": K["idle"], "box": (article(K["idle"]) or [None, None, None])[2]},
                            "question": {"frame": K["send"], "box": next((a[2] for a in pet(K["send"], "feed") or [] if a[0] == "user"), None)}},
        "clocks": {"model_attempts": meta.get("model"), "usage": meta.get("usage")},
    })


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
    "cards": {"frame": K.get("cards", K.get("card1")), "what": "the two edit cards arrive and the Details drawer opens on them" if "cards" in K else "the first edit card arrives as its edit is staged, and the Details drawer opens on it"},
    "apply1_last_before": {"frame": K["p1"] - 1, "what": "the invoice_kit/dates.py card waiting, the last frame before the click"},
    "apply1_click": {"frame": K["p1"], "what": "Apply edit (dates.py); the app re-renders on this frame (the card moves to Earlier actions)"},
    "apply2_click": {"frame": K["p2"], "what": "Apply edit (tests/test_dates.py), under the second question card"},
    "done_in_place": {"frame": K["scroll"][1], "what": ("the drawer scroll settles: the dates.py card marked Done, Undo this edit centred at y %s (retake %s), the whole card in the window" % (meta["undoY"], meta.get("retake"))) if meta.get("undoY") else "the drawer scroll settles: the dates.py card marked Done, Undo this edit where Apply edit was"},
    "done_still_until": {"frame": undo_still_to, "what": "the last frame on which Undo this edit and the drawer have not moved"},
    "notice": {"frame": K.get("notice", 411), "what": "the reply ends with the host's 'Verification remains incomplete: …' notice"},
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
round2 = meta.get("fidelity_round") == 2  # OVERRIDES §41: v1.5.0's own event order throughout
if round2:
    def bubble_from(start, f0):
        return first_frame(lambda s: any(t.startswith(start) for _, t, _ in s.get("bubbles") or []), f0)
    applied1 = bubble_from("Applied the edit to invoice_kit/dates.py", K["p1"])
    applied2 = bubble_from("Applied the edit to tests/test_dates.py", K["p2"])
    turn_ends = [u["f"] for u in meta["usage"] if not u.get("finish")]  # each model turn's end (its usage event)
    moments.pop("cards", None)
    moments.update({
        "card1": {"frame": K["card1"], "what": "the invoice_kit/dates.py card arrives as its edit is staged (mid-run), and the Details drawer opens on it"},
        "card2": {"frame": K["card2"], "what": "the tests/test_dates.py card arrives as its edit is staged"},
        "proposal": {"frame": K["proposal"], "what": "the model's proposal arrives in the conversation in one piece (its turn ended)"},
        "settle1": {"frame": K["settle1"], "what": "'Checked the reply', then the run waits for the approvals (Waiting for your approval)"},
        "applied1_message": {"frame": applied1, "what": "the conversation shows the host's 'Applied the edit to invoice_kit/dates.py. You can undo it in Activity & review.'"},
        "applied2_message": {"frame": applied2, "what": "the conversation shows 'Applied the edit to tests/test_dates.py. …'; the run is queued again"},
        "resume": {"frame": K["running2"], "what": "the run resumes: 'Recalled 3 memories' (+8.9 s), then the model's first turn"},
        "summary_text": {"frame": K["respond2"], "what": "the model's summary ('Both edits are in: …') arrives in one piece; 'Not verified · 2 changed files, no tests run' follows on the next frame"},
        "repair_replies": {"frame": turn_ends[4], "until": turn_ends[5], "what": "the model's two replies to the completion check's repair requests arrive in the reply (below the conversation's view) at %d and %d, each followed by 'Not verified …' on the next frame; the drawer's live response shows each as it streams" % (turn_ends[4], turn_ends[5])},
        "hold_reorder": {"frame": K["hold"], "what": "the hold: the conversation re-reads, and the reply (saved again) moves after the two 'Applied …' messages"},
        "model_responded": {"frame": K["respond"], "what": "the model responded: the reply's last paragraph arrives in the conversation in one piece; the drawer's live response keeps the finished text until the run completes"},
    })
    moments["repair_replies"]["until_seconds"] = sec(turn_ends[5])
for m in moments.values():
    m["seconds"] = sec(m["frame"]) if m["frame"] is not None else None
    if m["frame"] is not None and not first_saved <= m["frame"] <= last or m["frame"] is None and last < K["complete"]:
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
if round2:
    geometry.update({
        "cards_on_arrival": {"frame": K["card2"], "cards": at(K["card2"], "cards")},
        "applied1_bubble": {"frame": applied1, "bubble": bubble(applied1, "Applied the edit to invoice_kit/dates.py") if applied1 is not None else None},
        "applied2_bubble": {"frame": applied2, "bubble": bubble(applied2, "Applied the edit to tests/test_dates.py") if applied2 is not None else None},
        "conversation_at_hold": {"frame": K["hold"] + 1, "bubbles": at(K["hold"] + 1, "bubbles")},
        "conversation_held_settled": {"frame": K["convScroll"][1], "bubbles": at(K["convScroll"][1], "bubbles")},
        "steps_at_hold": {"frame": K["hold"], "steps": at(K["hold"], "steps")},
    })
    # Undo this edit after the scroll (bar 5): the drawer's live response sits above Earlier actions, so the card moves
    # as each model turn's text grows there and jumps back when the next turn's empty response replaces it. Every frame
    # on which its box changes, to the Run the tests click (the window is 800 CSS px tall).
    undo_track, prev = [], None
    for f in range(K["scroll"][1], K["runTheTests"] + 1):
        r = at(f, "undo")
        if r != prev:
            undo_track.append({"frame": f, "seconds": sec(f), "rect": r,
                               "whole_in_window": bool(r) and r[1] >= panel_top(f) and r[1] + r[3] <= 800})
            prev = r
    # the whole invoice_kit/dates.py card (Done) over the same frames: its box on every change, and whether all of it is
    # inside the drawer's visible panel (from the panel's top to the window's bottom)
    card_track, prev = [], None
    for f in range(K["scroll"][1], K["runTheTests"] + 1):
        r = next((c[1] for c in at(f, "cards") or [] if (c[0] or "").startswith("invoice_kit/dates.py")), None)
        if r != prev:
            card_track.append({"frame": f, "seconds": sec(f), "rect": r, "panel_top": panel_top(f),
                               "whole_in_window": bool(r) and r[1] >= panel_top(f) and r[1] + r[3] <= 800})
            prev = r
manifest = {
    "recording": os.path.relpath(folder, os.getcwd()),
    "made_by": "capture/record.mjs main-live-film-150 --theme=%s --scale=%s%s" % (timeline["theme"], timeline["scale"],
               " --from=%s --frames=%d" % (timeline["from"], last + 1) if timeline.get("from") else ""),
    "release": "Pebble v1.5.0's frontend, frozen with capture/freeze-release.py and verified (tag commit 16dd425)",
    "method": timeline.get("note"),
    "theme": timeline["theme"], "fps": fps, "scale": timeline["scale"], "viewport_css": [1160, 800],
    "frames_saved": timeline["frames"], "from_seconds": timeline.get("from"), "file_of_frame": "frame f is %05d.png with f+1",
    **({"spliced": timeline["spliced"]} if timeline.get("spliced") else {}),
    **({"fidelity": "From the Run tests click the climax follows v1.5.0's Ask-mode event model (OVERRIDES §40): the approved tests run inside the approve route, and Verified is the completion check on the resumed run's finished turn"} if ask_model and not round2 else {}),
    **({"fidelity_round": 2, "fidelity": "The whole run follows v1.5.0's own event order at the 4,096-token window (OVERRIDES §40-§41): text arrives in one piece when its turn ends (the drawer shows the live response), approvals answer once committed and write their summaries into the conversation, the resumed run recalls context again, host rows carry no activity class (no 'Explored' fold), model rows carry no timing detail (a local GGUF model), no turn-end is held at 4K (no 'Draft withdrawn'), and the approved tests run inside the approve route"} if round2 else {}),
    "moments": moments,
    "toast_on_screen": [{"frames": s, "seconds": [sec(s[0]), sec(s[1])]} for s in spans],
    **({"retake": meta["retake"], "undo_y": meta.get("undoY")} if meta.get("retake") else {}),
    **({"undo_track": undo_track, "dates_card_track": card_track} if round2 else {}),
    "usage_lines": usage_spans(lambda f: at(f, "usage")),
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
