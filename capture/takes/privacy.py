"""RUNBOOK §8 as far as a machine can: the text in a take's frames (or a job's stills), read by macOS's Vision (ocr.js),
checked for what must never be on a kept frame; and a contact sheet, so the lead's own eyes do the rest.

    PY=/Library/Frameworks/Python.framework/Versions/3.14/bin/python3
    cd <repo> && source scripts/env.sh && scripts/heavy.sh privacy-RS9-01 \
        $PY -I -B capture/takes/privacy.py /Users/Shared/pebble-takes/conformed/RS9-01.mp4 [--every 2]
    $PY -I -B capture/takes/privacy.py /Users/Shared/pebble-takes/results/<job-id>      (a job's stills; light)

It REJECTS a take (exit 1) for: an e-mail address outside example.com; a home folder other than /Users/studio or
/Users/Shared; the running account's own short or full name (read at run time with `id`, never written anywhere: the
report says "[the account's name]"); any line of the deny-list file (.work/real-takes/privacy-denylist.txt, local and
ignored by git, one name or word a line); "Context Warping"; "undetectable"; and usage, cost or speed figures (a
price, tokens, "cached", a rate). It FLAGS for the lead's eyes (not a rejection by itself): the Stealth never-words
(src/content/neverWords.ts), focus wording, and any text in the notification area (top right) or the menu bar.
What OCR can't judge (faces, other creators' thumbnails, a Wi-Fi name in an open menu, a notification's app icon)
is for the contact sheet: frames every few seconds with their times, in <out>/contact-NN.jpg.
Output: <out>/report.json and report.md (default out: .work/real-takes/privacy/<name>/); the frames it extracted are
deleted afterwards unless --keep-frames.
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.realpath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
FFMPEG = "/opt/homebrew/bin/ffmpeg"
FFPROBE = "/opt/homebrew/bin/ffprobe"
DENY = os.path.join(REPO, ".work", "real-takes", "privacy-denylist.txt")

REJECT = [
    (re.compile(r"[A-Za-z0-9._%+-]+@(?!example\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "an e-mail address outside example.com"),
    (re.compile(r"/Users/(?!studio\b|Shared\b)[A-Za-z0-9._-]+"), "a home folder other than the demo user's"),
    (re.compile(r"context\s*warping", re.I), "the name 'Context Warping'"),
    (re.compile(r"\bundetectabl", re.I), "'undetectable'"),
    (re.compile(r"[$£€]\s?\d"), "a price or cost"),
    (re.compile(r"\b\d[\d,.]*\s*k?\s*(tokens?|tok/s)\b", re.I), "a token count or rate"),
    (re.compile(r"\bcached\b", re.I), "a usage line (cached tokens)"),
    (re.compile(r"\b\d+(\.\d+)?\s*(x|×|%)\s*(faster|cheaper|quicker|less|fewer)\b", re.I), "a speed or savings figure"),
    (re.compile(r"\b(rate limit|usage limit|per task|cost per)\b", re.I), "usage or cost wording"),
]
FLAG = [
    (re.compile(r"\binvisib", re.I), "Stealth never-word 'invisible'"),
    (re.compile(r"\bexam(s|inations?)?\b|\binterview|\bproctor|\bmonitor(ing|ed|s)?\b|\bcheat|\bbypass|\b(evad(e|es|ed|ing)|evasion)\b", re.I),
     "a Stealth never-word (fine only far from a Stealth shot, or in macOS's own prompt; the lead decides)"),
    (re.compile(r"\b(keyboard focus|keeps? the keyboard|focus)\b", re.I), "focus wording (only if 2.0.0 ships the fix: the lead decides)"),
]
HONEST = ("Hidden from screen capture and screen sharing, not from a camera, a capture card or a process list. Exams and "
          "interviews that forbid assistants still forbid it.")


def account_names() -> list[str]:
    names = []
    for flag in ("-un", "-F"):
        try:
            v = subprocess.run(["/usr/bin/id", flag], capture_output=True, text=True, timeout=5).stdout.strip()
        except OSError:
            v = ""
        if v and v.lower() not in ("studio",):
            names.append(v)
            names += [p for p in v.split() if len(p) >= 3]
    return sorted(set(names), key=len, reverse=True)


def deny_words(path: str) -> list[str]:
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]


def ocr(paths: list[str], batch: int = 24) -> list[dict]:
    out = []
    for i in range(0, len(paths), batch):
        r = subprocess.run(["/usr/bin/osascript", "-l", "JavaScript", os.path.join(HERE, "ocr.js"), *paths[i:i + batch]],
                           capture_output=True, text=True, timeout=900)
        if r.returncode != 0:
            raise SystemExit(f"OCR failed: {r.stderr.strip()[:300]}")
        out += json.loads(r.stdout)
    return out


def frames_from_video(video: str, out: str, every: float) -> list[tuple[str, float]]:
    os.makedirs(out, exist_ok=True)
    dur = float(subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video],
                               capture_output=True, text=True, timeout=60).stdout.strip() or 0)
    times = sorted(set([round(t * every, 3) for t in range(int(dur / every) + 1)] + [0.5, round(dur / 2, 3), max(0.0, round(dur - 0.5, 3))]))
    times = [t for t in times if t < dur]
    # one decode pass at 1/every fps, plus the first, middle and last seconds (RUNBOOK §8)
    subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-i", video, "-vf", f"fps=1/{every}", "-q:v", "2",
                    os.path.join(out, "f%05d.jpg")], check=True, timeout=3600)
    got = sorted(glob.glob(os.path.join(out, "f*.jpg")))
    pairs = [(p, i * every) for i, p in enumerate(got)]
    for t in (0.5, dur / 2, max(0.0, dur - 0.5)):
        p = os.path.join(out, f"x{int(t * 1000):08d}.jpg")
        subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", "-q:v", "2", p],
                       check=True, timeout=120)
        if os.path.exists(p):
            pairs.append((p, t))
    return sorted(pairs, key=lambda x: x[1])


def contact_sheets(frames: list[tuple[str, float]], out: str) -> list[str]:
    sheets = []
    per = 12
    for k in range(0, len(frames), per):
        chunk = frames[k:k + per]
        lst = os.path.join(out, f"contact-{k // per + 1:02d}.txt")
        with open(lst, "w") as f:
            for p, _ in chunk:
                f.write(f"file '{p}'\nduration 1\n")
        sheet = os.path.join(out, f"contact-{k // per + 1:02d}.jpg")
        label = ",".join(f"{t:.1f}s" for _, t in chunk)
        subprocess.run([FFMPEG, "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
                        "-vf", "scale=800:-2,tile=3x4:padding=6:color=white", "-frames:v", "1", "-q:v", "3", sheet],
                       check=True, timeout=300)
        os.unlink(lst)
        with open(sheet + ".times.txt", "w") as f:
            f.write(f"frames, left to right, top to bottom: {label}\n")
        sheets.append(sheet)
    return sheets


def check(pages: list[dict], times: dict[str, float], names: list[str], deny: list[str]) -> list[dict]:
    findings = []
    name_res = [(re.compile(r"\b" + re.escape(n) + r"\b", re.I), "[the account's name]") for n in names]
    deny_res = [(re.compile(r"\b" + re.escape(w) + r"\b", re.I), "a word on the deny-list") for w in deny]
    for page in pages:
        w = int(page.get("width") or 0)
        h = int(page.get("height") or 0)
        t = times.get(page["path"])
        for ln in page.get("lines", []):
            text = ln["text"].replace(HONEST, " ")
            x, y, bw, bh = ln["box"]
            for rx, why in name_res + deny_res:
                if rx.search(text):
                    findings.append({"level": "reject", "why": why if why != "[the account's name]" else "the person's account name",
                                     "time_s": t, "text": rx.sub(why, ln["text"]), "box": ln["box"], "frame": os.path.basename(page["path"])})
            for rx, why in REJECT:
                if rx.search(text):
                    findings.append({"level": "reject", "why": why, "time_s": t, "text": ln["text"], "box": ln["box"], "frame": os.path.basename(page["path"])})
            for rx, why in FLAG:
                if rx.search(text):
                    findings.append({"level": "check", "why": why, "time_s": t, "text": ln["text"], "box": ln["box"], "frame": os.path.basename(page["path"])})
            if w and h and y < 0.035 * h:
                findings.append({"level": "check", "why": "menu-bar text (an account or a Wi-Fi name?)", "time_s": t, "text": ln["text"], "box": ln["box"], "frame": os.path.basename(page["path"])})
            elif w and h and x > 0.6 * w and y < 0.2 * h and "pebble" not in ln["text"].lower():
                findings.append({"level": "check", "why": "text in the notification area (is it Pebble's banner?)", "time_s": t, "text": ln["text"], "box": ln["box"], "frame": os.path.basename(page["path"])})
    # account names never appear in the report, even inside other findings' text
    for f in findings:
        for rx, label in name_res:
            f["text"] = rx.sub(label, f["text"])
    return findings


def main() -> int:
    ap = argparse.ArgumentParser(description="RUNBOOK §8 privacy check of a take or a job's stills")
    ap.add_argument("source", help="a conformed take (.mp4/.mov), or a folder of stills (a job's results folder)")
    ap.add_argument("--every", type=float, default=2.0, help="seconds between sampled frames (video)")
    ap.add_argument("--out")
    ap.add_argument("--deny", default=DENY)
    ap.add_argument("--keep-frames", action="store_true")
    a = ap.parse_args()
    name = os.path.splitext(os.path.basename(a.source.rstrip("/")))[0]
    out = os.path.abspath(a.out or os.path.join(REPO, ".work", "real-takes", "privacy", name))
    os.makedirs(out, exist_ok=True)
    if os.path.isdir(a.source):
        frames = [(p, None) for p in sorted(glob.glob(os.path.join(a.source, "*.png")))]
        extracted = None
    else:
        extracted = os.path.join(out, "frames")
        if os.path.exists(extracted):
            shutil.rmtree(extracted)
        frames = frames_from_video(a.source, extracted, a.every)
    if not frames:
        print("no frames or stills found", file=sys.stderr)
        return 2
    pages = ocr([p for p, _ in frames])
    times = {p: t for p, t in frames}
    findings = check(pages, times, account_names(), deny_words(a.deny))
    sheets = contact_sheets(frames, out) if extracted else []
    rejects = [f for f in findings if f["level"] == "reject"]
    report = {"source": a.source, "frames": len(frames), "ocr_lines": sum(len(p.get("lines", [])) for p in pages),
              "verdict": "REJECT" if rejects else ("CHECK" if findings else "CLEAN (by OCR; still look at the contact sheets)"),
              "findings": findings, "contact_sheets": sheets,
              "not_checked_by_machine": ["faces and voices", "other creators' thumbnails, comments, view counts, avatars",
                                         "a notification's app (icon)", "browser history or suggestions that look like sample data",
                                         "whether a Stealth shot can hold the honest line beside it"]}
    with open(os.path.join(out, "report.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=1, ensure_ascii=False)
    with open(os.path.join(out, "report.md"), "w", encoding="utf-8") as f:
        f.write(f"# Privacy check: {name}\n\n{report['verdict']}: {len(frames)} frames, {report['ocr_lines']} lines of text read.\n\n")
        for fd in findings:
            where = f"{fd['time_s']:.1f} s" if fd["time_s"] is not None else fd["frame"]
            f.write(f"- **{fd['level']}** at {where}: {fd['why']}: \"{fd['text']}\"\n")
        f.write("\nContact sheets (look at every one): " + ", ".join(os.path.basename(s) for s in sheets) + "\n")
        f.write("Not checked by the machine: " + "; ".join(report["not_checked_by_machine"]) + ".\n")
    if extracted and not a.keep_frames:
        shutil.rmtree(extracted)
    print(f"{report['verdict']}: {len(rejects)} to reject, {len(findings) - len(rejects)} to check; {os.path.join(out, 'report.md')}")
    return 1 if rejects else 0


if __name__ == "__main__":
    sys.exit(main())
