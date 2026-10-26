"""Builds the Pebble 2.0 film's sample world (TREATMENT §3.3) into .work/sample-world/ and writes its manifest.

The world is a small pottery studio, "Clay & Current", getting ready for its open day. Everything in it is fictional:
no real person's name, account, address or data. The layout under home/ mirrors the demo macOS user's home folder, so
setup/copy_in.sh (run as the demo user) can copy it in as it is.

What it writes (all under --out, default .work/sample-world):
  home/Documents/Open day/   flyer.md, plan.md, tickets.csv, poster.pdf, poster-screen.png, price-list.pdf,
                             glazes/celadon.csv
  home/Pictures/Open day/    the photos to resize (CC0 downloads, see assets/fetch_assets.py; re-encoded, no metadata)
  home/Projects/studio-bookings/   the booking website with its 18 tests (1 fails until the slots fix)
  home/Music/Studio playlist/      CC0 tracks, when assets/fetch_assets.py fetched them (else absent, and said so)
  home/Applications/Kiln Board.app the sample app for the click by picture, when kilnboard/build.sh built it
  notes/*.txt, setup/notes.applescript      the five sample notes, and the script that makes them in Notes
  calendar/open-day-week.ics, setup/calendar.applescript    the sample events
  setup/*.sh, setup/*.applescript, setup/music.applescript  copy-in, reset and import helpers for the demo user
  briefs/  KILN_BRIEF.md, GLAZE_BRIEF.md, TAKE_LINES.md (every typed message, from world.json)
  MANIFEST.json, MANIFEST.md   every file: size, SHA-256, purpose, source and licence; the checks that ran

Run (light; Pillow and pytest from the framework Python that every macOS user on this Mac can run):
  "$PYQA" -I -B capture/sample-world-2.0/make_sample_world.py [--open-day 2026-11-14] [--out .work/sample-world]
It never writes outside --out, never downloads (assets/fetch_assets.py does that, once) and never touches public/media/.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
DEFAULT_OUT = REPO / ".work" / "sample-world"
FRAMEWORK_PY = "/Library/Frameworks/Python.framework/Versions/3.14/bin/python3"

sys.path.insert(0, str(HERE / "art"))
import make_art  # noqa: E402  (the poster and the price list)


def long_date(day: dt.date) -> str:
    return f"{day.strftime('%A')} {day.day} {day.strftime('%B')}"


def short_date(day: dt.date) -> str:
    return f"{day.strftime('%a')} {day.day} {day.strftime('%b')}"


def fill(template: str, values: dict) -> str:
    out = template
    for key, value in values.items():
        out = out.replace("{" + key + "}", value)
    left = re.findall(r"\{[a-z_0-9]+\}", out)
    if left:
        raise SystemExit(f"unfilled placeholders: {left}")
    return out


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


# ---- calendar -----------------------------------------------------------------------------------------------------

def week_events(day: dt.date) -> list[dict]:
    """The open-day week. Times are local (floating) so Calendar shows them as written, in any time zone."""
    thu, fri, mon = day - dt.timedelta(days=2), day - dt.timedelta(days=1), day + dt.timedelta(days=2)
    ev = [
        (thu, "14:00", 90, "Glaze mixing", "Celadon for the demo tiles."),
        (fri, "18:00", 60, "Bisque firing starts", "About ten hours. Unload on Saturday at 9:00."),
        (day, "09:00", 30, "Kiln unload", ""),
        (day, "10:00", 360, "Open day", "Doors 10:00 to 16:00."),
        (day, "10:30", 45, "Wheel taster", "12 places, sold out."),
        (day, "11:15", 30, "Glazing demo", ""),
        (day, "12:00", 45, "Wheel taster", "12 places, sold out."),
        (day, "13:30", 45, "Wheel taster", "12 places, sold out."),
        (day, "14:15", 30, "Glazing demo", ""),
        (day, "15:00", 45, "Wheel taster", "12 places, sold out."),
        (mon, "10:00", 30, "Post the photos to the website", ""),
    ]
    out = []
    for i, (d, hhmm, minutes, title, note) in enumerate(ev, 1):
        start = dt.datetime.combine(d, dt.time.fromisoformat(hhmm))
        out.append({"uid": f"sample-{d:%Y%m%d}{chr(96 + i)}@example.com", "start": start,
                    "end": start + dt.timedelta(minutes=minutes), "title": title, "note": note})
    return out


def ics(events: list[dict]) -> str:
    def esc(s: str) -> str:
        return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")
    stamp = "20261026T000000Z"
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pebble film sample world//EN", "CALSCALE:GREGORIAN",
             "X-WR-CALNAME:Studio"]
    for e in events:
        lines += ["BEGIN:VEVENT", f"UID:{e['uid']}", f"DTSTAMP:{stamp}",
                  f"DTSTART:{e['start']:%Y%m%dT%H%M%S}", f"DTEND:{e['end']:%Y%m%dT%H%M%S}",
                  f"SUMMARY:{esc(e['title'])}"]
        if e["note"]:
            lines.append(f"DESCRIPTION:{esc(e['note'])}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def applescript_string(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def calendar_applescript(events: list[dict]) -> str:
    """Makes the events in a calendar named Studio. Dates are built from numbers, never parsed from text (locale-proof)."""
    out = ['-- Run as the demo user: osascript calendar.applescript (Calendar asks once for permission).',
           'on mkdate(y, m, d, hh, mm)', '  set t to current date', '  set day of t to 1', '  set year of t to y',
           '  set month of t to m', '  set day of t to d', '  set hours of t to hh', '  set minutes of t to mm',
           '  set seconds of t to 0', '  return t', 'end mkdate', '',
           'tell application "Calendar"',
           '  if not (exists calendar "Studio") then make new calendar with properties {name:"Studio"}',
           '  tell calendar "Studio"']
    for e in events:
        s, n = e["start"], e["end"]
        out.append(f'    make new event with properties {{summary:{applescript_string(e["title"])}, '
                   f'start date:my mkdate({s.year}, {s.month}, {s.day}, {s.hour}, {s.minute}), '
                   f'end date:my mkdate({n.year}, {n.month}, {n.day}, {n.hour}, {n.minute}), '
                   f'description:{applescript_string(e["note"])}}}')
    out += ['  end tell', 'end tell', '']
    return "\n".join(out)


def notes_applescript(notes: list[tuple[str, str]]) -> str:
    """Makes the sample notes in On My Mac › Notes; a note's first line is its title."""
    out = ['-- Run as the demo user: osascript notes.applescript (Notes asks once for permission).',
           'tell application "Notes"', '  set target to default account']
    for title, body in notes:
        html = "<div><b>" + title + "</b></div>" + "".join(f"<div>{line}</div>" for line in body.splitlines())
        out.append(f'  if not (exists note {applescript_string(title)} of target) then make new note at folder "Notes" '
                   f'of target with properties {{body:{applescript_string(html)}}}')
    out += ['end tell', '']
    return "\n".join(out)


# ---- the build ----------------------------------------------------------------------------------------------------

def copy_project(dst: Path) -> list[str]:
    src = HERE / "project" / "studio-bookings"
    ignore = shutil.ignore_patterns("__pycache__", ".pytest_cache", ".venv", "*.pyc", ".DS_Store")
    shutil.copytree(src, dst, ignore=ignore, dirs_exist_ok=True)
    return sorted(str(p.relative_to(dst)) for p in dst.rglob("*") if p.is_file())


def check_project_tests(project: Path) -> dict:
    """The world's promise about the project: 1 failed and 17 passed as shipped; 18 passed after the reference fix."""
    if not Path(FRAMEWORK_PY).exists():
        return {"ran": False, "why": f"{FRAMEWORK_PY} is missing"}
    result = {"ran": True, "python": FRAMEWORK_PY}
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    with tempfile.TemporaryDirectory() as tmp:
        for name, fixed in (("as_shipped", False), ("after_fix", True)):
            work = Path(tmp) / name
            shutil.copytree(project, work)
            if fixed:
                slots = work / "studio_bookings" / "slots.py"
                text = slots.read_text(encoding="utf-8")
                assert text.count("if self.booked > self.places:") == 1, "the bug is not where the fix expects it"
                slots.write_text(text.replace("if self.booked > self.places:", "if self.is_full():"), encoding="utf-8")
            run = subprocess.run([FRAMEWORK_PY, "-m", "pytest", "-p", "no:cacheprovider", "-o", "addopts=", "-q"],
                                 cwd=work, env=env, capture_output=True, text=True, timeout=120)
            last = [ln for ln in run.stdout.strip().splitlines() if ln.strip()][-1:]
            result[name] = re.sub(r" in [0-9.]+s", "", last[0]) if last else f"no output (exit {run.returncode})"
    result["ok"] = result.get("as_shipped") == "1 failed, 17 passed" and result.get("after_fix") == "18 passed"
    return result


PRIVACY_PATTERNS = [
    (re.compile(r"[A-Za-z0-9._%+-]+@(?!example\.com\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "an e-mail address outside example.com"),
    (re.compile(r"/Users/(?!studio\b|Shared\b)[A-Za-z0-9._-]+"), "a home folder other than the demo user's"),
    # A phone-like run: digits with spaces, dots, dashes or brackets between them (never colons: clock times), 9-15 digits.
    (re.compile(r"(?<![\w.:])\+?\(?\d[\d .()-]{7,}\d(?![\w.:])"), "something like a phone number"),
]
PRIVACY_TEXT = {".md", ".txt", ".csv", ".py", ".html", ".css", ".ics", ".applescript", ".sh", ".json", ".toml", ".plist", ".swift"}
# What is copied into the demo user, or read by the take operator. downloads/ (our own fetch records) never leaves .work.
PRIVACY_ROOTS = ("home", "notes", "calendar", "setup", "briefs")


def privacy_scan(root: Path) -> list[str]:
    found = []
    for top in PRIVACY_ROOTS:
        for p in sorted((root / top).rglob("*")) if (root / top).exists() else []:
            if not p.is_file() or p.suffix.lower() not in PRIVACY_TEXT:
                continue
            for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
                if ' d="' in line or "viewBox" in line:
                    continue  # SVG path data is coordinates
                for rx, what in PRIVACY_PATTERNS:
                    for m in rx.finditer(line):
                        if what.startswith("something like a phone") and not 9 <= sum(c.isdigit() for c in m.group(0)) <= 15:
                            continue  # dates, sums and short codes are not phone numbers
                        found.append(f"{p.relative_to(root)}: {what}: {m.group(0)!r}")
    return found


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--open-day", default=None, help="YYYY-MM-DD, a Saturday (default: world.json)")
    ap.add_argument("--skip-tests", action="store_true")
    a = ap.parse_args()

    world = json.loads((HERE / "world.json").read_text(encoding="utf-8"))
    day = dt.date.fromisoformat(a.open_day or world["open_day"]["date"])
    if day.weekday() != 5:
        raise SystemExit(f"{day} is a {day.strftime('%A')}: the open day is a Saturday")
    out = a.out.resolve()
    # This build deletes and rewrites folders under --out, so it works only in a folder it made itself: never a home
    # folder or anything above one, and never a non-empty folder without its marker.
    real_home = Path.home().resolve()
    if out == real_home or out in real_home.parents or out == REPO or out == Path("/Users"):
        raise SystemExit(f"refusing --out {out}: a home folder, a folder above one, or the repo itself")
    marker = out / ".sample-world-root"
    if out.exists() and any(out.iterdir()) and not marker.exists():
        raise SystemExit(f"refusing --out {out}: not empty and not made by this script (no {marker.name})")
    out.mkdir(parents=True, exist_ok=True)
    marker.write_text("Made by capture/sample-world-2.0/make_sample_world.py; safe for it to rebuild.\n", encoding="utf-8")
    home = out / "home"
    docs = home / "Documents" / "Open day"
    for sub in ("home/Documents", "home/Projects", "notes", "calendar", "setup", "briefs"):
        target = out / sub
        if target.exists():
            shutil.rmtree(target)  # rebuilt every time; downloads (downloads/) and built apps are kept
    docs.mkdir(parents=True)
    (docs / "glazes").mkdir()
    for sub in ("notes", "calendar", "setup", "briefs"):
        (out / sub).mkdir()

    values = {
        "studio": world["studio"]["name"], "website": world["studio"]["website"],
        "open_day_long": long_date(day), "friday_long": long_date(day - dt.timedelta(days=1)),
        "friday_short": short_date(day - dt.timedelta(days=1)),
        "log_1": short_date(day - dt.timedelta(days=22)), "log_2": short_date(day - dt.timedelta(days=15)),
        "log_3": short_date(day - dt.timedelta(days=8)),
    }
    files: dict[str, dict] = {}

    def record(path: Path, purpose: str, source: str, licence: str = "Self-made for the film (fictional); no third-party content", **extra):
        files[str(path.relative_to(out))] = {"purpose": purpose, "source": source, "licence": licence, **extra}

    tpl = HERE / "templates"
    for name, purpose in (("flyer.md", "S16 (RS-H): the file Pebble edits ('Put Saturday's hours in the flyer'); Undo this change"),
                          ("plan.md", "S16: the hours, beside the flyer, if Pebble looks for them; Ring 3's world")):
        (docs / name).write_text(fill((tpl / name).read_text(encoding="utf-8"), values), encoding="utf-8")
        record(docs / name, purpose, f"capture/sample-world-2.0/templates/{name}")

    with (docs / "tickets.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["ticket", "session", "price"])
        n = 0
        for s in world["sessions"]:
            if s["kind"] == "wheel taster":
                for _ in range(s["places"]):
                    n += 1
                    w.writerow([f"T{n:02d}", f"Wheel taster {s['starts']}", s["price"]])
    assert n == world["tickets"]["sold"] == 48
    record(docs / "tickets.csv", "S11 ('Tickets'): the 48 tickets behind 48 × 12.5 = 600; no names", "make_sample_world.py")

    shutil.copyfile(tpl / "celadon.csv", docs / "glazes" / "celadon.csv")
    record(docs / "glazes" / "celadon.csv", "S23 ('Glaze', the ask card): the file the tool is shaped by", "templates/celadon.csv")

    art = out / "build" / "art"
    art.mkdir(parents=True, exist_ok=True)
    screen, a3, prices = make_art.poster_screen(world, day), make_art.poster_a3(world, day), make_art.price_list(world, day)
    screen.save(docs / "poster-screen.png", optimize=True)
    a3.save(docs / "poster.pdf", resolution=200.0)
    prices.save(docs / "price-list.pdf", resolution=200.0)
    a3.resize((585, 827)).save(art / "_preview-poster-a3.png")
    prices.resize((551, 780)).save(art / "_preview-price-list.png")
    record(docs / "poster-screen.png", "S01-S02 (RS-15): the full-screen app behind the quick chat (Preview, full screen; 2560 x 1664 = the demo Mac's display)",
           "art/make_art.py (Pillow; shapes drawn in code; Fraunces and Inter, SIL OFL 1.1, from the site's src/fonts)",
           "Self-made for the film (fictional); fonts under SIL OFL 1.1")
    record(docs / "poster.pdf", "the printed poster (A3); in Documents for Finder and the tour", "art/make_art.py",
           "Self-made for the film (fictional); fonts under SIL OFL 1.1")
    record(docs / "price-list.pdf", "RS-6 (tour/kit): 'Open the price list in Preview.' (1.9.13 opens a file in an app)", "art/make_art.py",
           "Self-made for the film (fictional); fonts under SIL OFL 1.1")

    proj = home / "Projects" / "studio-bookings"
    copy_project(proj)
    for p in sorted(proj.rglob("*")):
        if p.is_file():
            record(p, "S18 (HS-F or RS-F): the project 'studio-bookings' with 18 pytest tests; the AgentGuard ring",
                   f"capture/sample-world-2.0/project/studio-bookings/{p.relative_to(proj)}")

    notes = []
    for p in sorted((tpl / "notes").glob("*.txt")):
        text = fill(p.read_text(encoding="utf-8"), values)
        title, _, body = text.partition("\n")
        notes.append((title, body.strip()))
        (out / "notes").mkdir(exist_ok=True)
        (out / "notes" / p.name).write_text(text, encoding="utf-8")
        record(out / "notes" / p.name, "Notes (On My Mac): the sample notes; 'Old price list (2025)' is S13's Delete card",
               f"templates/notes/{p.name}")
    (out / "setup").mkdir(exist_ok=True)
    (out / "setup" / "notes.applescript").write_text(notes_applescript(notes), encoding="utf-8")
    record(out / "setup" / "notes.applescript", "setup: makes the five notes in Notes, as the demo user", "make_sample_world.py")

    events = week_events(day)
    (out / "calendar" / "open-day-week.ics").write_text(ics(events), encoding="utf-8")
    (out / "setup" / "calendar.applescript").write_text(calendar_applescript(events), encoding="utf-8")
    record(out / "calendar" / "open-day-week.ics", "Calendar: the open-day week (no attendees, no organiser)", "make_sample_world.py")
    record(out / "setup" / "calendar.applescript", "setup: makes the same events in a calendar named Studio", "make_sample_world.py")

    for name in ("copy_in.sh", "reset_take.sh", "music.applescript", "README.md"):
        src = HERE / "setup" / name
        if src.exists():
            shutil.copyfile(src, out / "setup" / name)
            if name.endswith(".sh"):
                os.chmod(out / "setup" / name, 0o755)
            record(out / "setup" / name, "setup and resets for the demo user (run as the demo user)", f"capture/sample-world-2.0/setup/{name}")

    for name in ("KILN_BRIEF.md", "GLAZE_BRIEF.md"):
        shutil.copyfile(tpl / name, out / "briefs" / name)
        record(out / "briefs" / name, "for the lead and the take operator; never given to Pebble", f"templates/{name}")
    lines = ["# Every typed message in the takes (from world.json; sample data, typed by the person or the operator)", ""]
    for c in world["conversations"]:
        lines.append(f"## {c['title']} ({c['shot']}){' in the project ' + c['project'] if c['project'] else ', no project'}")
        lines += [f"- {m}" for m in c["messages"]]
        if c.get("note"):
            lines += ["", c["note"]]
        lines.append("")
    (out / "briefs" / "TAKE_LINES.md").write_text("\n".join(lines), encoding="utf-8")
    record(out / "briefs" / "TAKE_LINES.md", "the exact words of every request, per take", "world.json")

    # The demo user's wallpaper: the landing page's own riverbed plate (capture/riverbed-plate.mjs makes it), until the
    # film's ground (FX-1, "the riverbed under still water") replaces it. No Apple wallpaper is ever in frame.
    plate = REPO / "video" / "public" / "desktop" / "riverbed-light@3x.png"
    (out / "wallpaper").mkdir(exist_ok=True)
    if plate.exists():
        shutil.copyfile(plate, out / "wallpaper" / "riverbed-light.png")
        record(out / "wallpaper" / "riverbed-light.png", "the demo user's wallpaper (TREATMENT §3.3; FX-1 replaces it when made)",
               "video/public/desktop/riverbed-light@3x.png (the page's riverbed plate, rendered by capture/riverbed-plate.mjs)",
               "Pebble's own artwork (Apache-2.0 repository); not third-party")

    # Downloads and builds made by other steps: recorded as they are, if present.
    assets = json.loads((out / "downloads" / "assets.json").read_text(encoding="utf-8")) if (out / "downloads" / "assets.json").exists() else {}
    for rel, meta in sorted(assets.get("placed", {}).items()):
        p = out / rel
        if p.exists():
            files[rel] = meta
    app = home / "Applications" / "Kiln Board.app"
    if app.exists():
        for p in sorted(app.rglob("*")):
            if p.is_file():
                record(p, "S12 (RS-7): the sample app Accessibility can't read (custom-drawn, no accessibility elements)",
                       "capture/sample-world-2.0/kilnboard (KilnBoard.swift, built by build.sh with swiftc)")

    checks = {"open_day": day.isoformat(), "weekday": day.strftime("%A")}
    checks["project_tests"] = {"ran": False, "why": "--skip-tests"} if a.skip_tests else check_project_tests(proj)
    checks["privacy_scan"] = privacy_scan(out) or "clean: no e-mail outside example.com, no other home folder, no phone-like number"
    checks["missing"] = [k for k in ("home/Pictures/Open day", "home/Music/Studio playlist", "home/Applications/Kiln Board.app")
                         if not (out / k).exists()]

    for rel, meta in files.items():
        p = out / rel
        meta["bytes"] = p.stat().st_size
        meta["sha256"] = sha256(p)
    manifest = {"what": "The Pebble 2.0 film's sample world (TREATMENT §3.3): fictional; see world.json",
                "built": dt.datetime.now().astimezone().isoformat(timespec="seconds"), "embargo": world["_embargo"],
                "studio": world["studio"]["name"], "demo_user": world["demo_user"], "checks": checks,
                "files": dict(sorted(files.items()))}
    (out / "MANIFEST.json").write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    md = io.StringIO()
    md.write("# Sample world manifest\n\n")
    md.write(f"Built {manifest['built']} by `capture/sample-world-2.0/make_sample_world.py`. Studio: {world['studio']['name']} "
             f"(fictional). Open day: {long_date(day)} {day.year}. Demo user: {world['demo_user']['home']}.\n\n")
    md.write("## Checks\n\n")
    for k, v in checks.items():
        md.write(f"- **{k}:** {json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v}\n")
    md.write("\n## Files\n\n| File | Bytes | SHA-256 (first 16) | Purpose | Source | Licence |\n|---|---|---|---|---|---|\n")
    for rel, meta in manifest["files"].items():
        source = meta["source"]
        if meta.get("author_as_credited"):
            source += f"; author as credited: {meta['author_as_credited']}"
        if meta.get("changes"):
            source += f"; changes: {meta['changes']}"
        md.write(f"| `{rel}` | {meta['bytes']} | `{meta['sha256'][:16]}` | {meta['purpose']} | {source} | {meta['licence']} |\n")
    (out / "MANIFEST.md").write_text(md.getvalue(), encoding="utf-8")
    print(json.dumps(checks, indent=1, ensure_ascii=False))
    print(f"{len(files)} files recorded in {out / 'MANIFEST.json'}")


if __name__ == "__main__":
    main()
