"""Fetches the sample world's third-party assets from Wikimedia Commons: CC0 photos and CC0 music.

Every file is pinned here by its Commons title, and Commons' SHA-1 of the original is pinned in pins.json on the first
fetch and checked on every later one. The licence is checked again at fetch time through the Commons API (extmetadata
License == "cc0"); a file whose licence or original changed is refused. Each download goes into its own new folder
under <out>/downloads/ (untrusted data: images are only decoded by Pillow, audio is only copied, never run).

What is placed in the world:
- **Photos** (home/Pictures/Open day): re-encoded with no metadata at all (no EXIF, GPS or camera serials), at most
  3200 px on the long side, under neutral names; two are cropped to leave out a person's leg and an emblem.
- **Music** (home/Music/Studio playlist): Commons' own MP3 transcodes of the CC0 originals (Music can't play Ogg), with
  any old tag removed and a new ID3v2.3 tag: the track's own title, the artist exactly as Commons credits them (both
  are pseudonymous projects, not personal names), the album "Studio playlist", a comment with the licence and source,
  and a self-made cover (art/make_art.py). Nothing is re-encoded.

assets.json records, for each placed file: the Commons page, the original's SHA-1, the author as credited, the licence
and its URL, when it was checked, what was changed, and the SHA-256 of the download (make_sample_world.py adds the
placed copy's). Nothing here is committed: the media stay in .work/.

The photos were chosen by eye from a contact sheet on 26 Oct 2026 (still lifes of pots, teapots, a mug and a kiln);
every photo with a person or hands in it, a logo or legible text, or a real shop's name was left out. The tracks are
calm, instrumental and between 2 and 4.5 minutes long.

Run (network; a polite pause between requests):
  "$PYQA" -I -B capture/sample-world-2.0/assets/fetch_assets.py --out .work/sample-world [--only photos|music]
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import html
import io
import json
import os
import re
import ssl
import struct
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "art"))
import make_art  # noqa: E402  (the playlist's cover)

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "PebbleFilmSampleWorld/1.0 (sample files for a product demo; one-off fetch)"}
LONG_SIDE = 3200
CC0_URL = "https://creativecommons.org/publicdomain/zero/1.0/"
# The python.org Python ships without a CA store; verify against macOS's own bundle (never skip verification).
CTX = ssl.create_default_context(cafile="/etc/ssl/cert.pem") if os.path.exists("/etc/ssl/cert.pem") else ssl.create_default_context()

PHOTOS = [
    # (placed name, Commons title, crop box as fractions of the image (left, top, right, bottom) or None)
    ("stacked-pots.jpg", "File:Ceramic pots (Unsplash).jpg", None),
    ("terracotta-pots.jpg", "File:Handmade Terracotta Ceramics (Unsplash).jpg", None),
    ("red-teapot.jpg", "File:Teapot and mug on table (Unsplash).jpg", None),
    ("teal-mug.jpg", "File:Teal mug over gingham cloth (Unsplash).jpg", None),
    ("black-glaze-teapot.jpg", "File:Black Glaze Facet Teapot.jpg", None),
    ("tan-glaze-teapot.jpg", "File:Tan Glaze Facet Teapot With Bamboo Handle.jpg", None),
    # A person's leg and a bag stand at the left edge: cropped out (no real people in the world).
    ("raku-kiln.jpg", "File:Un four mobile à cuisson des céramiques.jpg", (0.15, 0.0, 1.0, 1.0)),
    # The napkin ring at the top left carries a small emblem: cropped out (no marks).
    ("table-setting.jpg", "File:Dinnerware setup (Unsplash).jpg", (0.1875, 0.305, 1.0, 1.0)),
]
TRACKS = [
    # (placed file name, Commons title, title for the tag, track number in the playlist)
    ("01 Sweet Sun.mp3", "File:Loyalty Freak Music - 04 - Sweet Sun.ogg", "Sweet Sun", 1),
    ("02 Softly.mp3", "File:Loyalty Freak Music - 06 - Softly.ogg", "Softly", 2),
    ("03 Merfolks Song.mp3", "File:Komiku - 41 - Merfolks Song.ogg", "Merfolks Song", 3),
    ("04 Old Key.mp3", "File:Loyalty Freak Music - 03 - Old Key.ogg", "Old Key", 4),
]
PINS_FILE = HERE / "pins.json"  # Commons' SHA-1 of each original: filled on the first fetch, checked after that


def api(params: dict) -> dict:
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60, context=CTX) as r:
        return json.load(r)


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180, context=CTX) as r:
        return r.read()


def strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", "", html.unescape(s or "")).strip()


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def checked_info(title: str, pins: dict, prop: str) -> dict:
    """The file's Commons record, after checking its licence (CC0) and its pinned original."""
    params = {"action": "query", "titles": title, "prop": prop}
    if prop == "imageinfo":
        params.update(iiprop="url|size|mime|sha1|extmetadata", iiurlwidth=str(LONG_SIDE))
    else:
        params.update(viprop="url|size|mime|sha1|extmetadata|derivatives")
    page = next(iter(api(params)["query"]["pages"].values()))
    info = (page.get(prop) or [None])[0]
    if not info:
        raise SystemExit(f"{title}: not found on Commons")
    licence = ((info.get("extmetadata", {}).get("License") or {}).get("value") or "").lower()
    if licence != "cc0":
        raise SystemExit(f"{title}: its licence is now {licence!r}, not CC0: refusing")
    if pins.get(title) and pins[title] != info["sha1"]:
        raise SystemExit(f"{title}: the original changed on Commons (SHA-1 {info['sha1']}, pinned {pins[title]})")
    pins[title] = info["sha1"]
    return info


def credit(info: dict) -> tuple[str, str]:
    em = info.get("extmetadata", {})
    return strip_html((em.get("Artist") or {}).get("value", "")), strip_html((em.get("Credit") or {}).get("value", ""))[:300]


def page_url(title: str) -> str:
    return "https://commons.wikimedia.org/wiki/" + urllib.parse.quote(title.replace(" ", "_"))


# ---- photos -----------------------------------------------------------------------------------------------------

def fetch_photos(out: Path, pins: dict, record: dict, now: str) -> None:
    downloads, pictures = out / "downloads" / "photos", out / "home" / "Pictures" / "Open day"
    downloads.mkdir(parents=True, exist_ok=True)
    pictures.mkdir(parents=True, exist_ok=True)
    for name, title, crop in PHOTOS:
        info = checked_info(title, pins, "imageinfo")
        src_url = info["thumburl"] if info.get("width", 0) > LONG_SIDE and info.get("thumburl") else info["url"]
        data = get(src_url)
        folder = downloads / Path(name).stem  # its own folder
        folder.mkdir(exist_ok=True)
        (folder / "download.jpg").write_bytes(data)
        im = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
        if crop:
            w, h = im.size
            im = im.crop((round(crop[0] * w), round(crop[1] * h), round(crop[2] * w), round(crop[3] * h)))
        im.thumbnail((LONG_SIDE, LONG_SIDE), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=90, optimize=True)  # no exif= and no icc_profile=: no metadata at all
        placed = pictures / name
        placed.write_bytes(buf.getvalue())
        author, credit_line = credit(info)
        record["placed"][str(placed.relative_to(out))] = {
            "purpose": "S15-S16 (RS-H): a photo to resize ('Resize the open-day photos ... to 1600 px'); the Finder grid",
            "source": f"Wikimedia Commons: {page_url(title)}", "original_url": info["url"].split("?")[0],
            "original_sha1": info["sha1"], "original_size": [info.get("width"), info.get("height")],
            "downloaded_url": src_url, "download_sha256": sha256(data),
            "author_as_credited": author, "credit_line": credit_line,
            "licence": "CC0 1.0 (public domain dedication); checked through the Commons API at fetch time",
            "licence_url": CC0_URL, "checked_at": now,
            "changes": (f"cropped to {list(crop)} (fractions of the image) to leave out a person or a mark; " if crop else "")
                       + f"scaled to at most {LONG_SIDE} px on the long side, orientation applied, re-encoded as JPEG q90, all metadata removed",
            "placed_size": list(im.size),
        }
        print(f"photo {name}: {im.size[0]}x{im.size[1]} from {title} ({author[:40]})")
        time.sleep(2)


# ---- music ------------------------------------------------------------------------------------------------------

def strip_id3(data: bytes) -> bytes:
    """Removes an ID3v2 tag at the start and an ID3v1 tag at the end, if there are any."""
    if data[:3] == b"ID3" and len(data) > 10:
        size = (data[6] << 21) | (data[7] << 14) | (data[8] << 7) | data[9]
        data = data[10 + size + (10 if data[5] & 0x10 else 0):]
    if len(data) > 128 and data[-128:-125] == b"TAG":
        data = data[:-128]
    return data


def id3v23(frames: list[tuple[str, bytes]]) -> bytes:
    body = b"".join(fid.encode("ascii") + struct.pack(">I", len(payload)) + b"\x00\x00" + payload for fid, payload in frames)
    size = len(body)
    synchsafe = bytes([(size >> 21) & 0x7F, (size >> 14) & 0x7F, (size >> 7) & 0x7F, size & 0x7F])
    return b"ID3\x03\x00\x00" + synchsafe + body


def latin1_text(s: str) -> bytes:
    return b"\x00" + s.encode("latin-1")


def fetch_music(out: Path, pins: dict, record: dict, now: str) -> None:
    downloads, folder = out / "downloads" / "music", out / "home" / "Music" / "Studio playlist"
    downloads.mkdir(parents=True, exist_ok=True)
    folder.mkdir(parents=True, exist_ok=True)
    world = json.loads((HERE.parent / "world.json").read_text(encoding="utf-8"))
    buf = io.BytesIO()
    make_art.playlist_cover(world).resize((600, 600), Image.LANCZOS).save(buf, "JPEG", quality=88)
    cover = buf.getvalue()
    for name, title, tag_title, number in TRACKS:
        info = checked_info(title, pins, "videoinfo")
        mp3 = [d["src"] for d in info.get("derivatives", []) if d.get("type", "").startswith("audio/mpeg")]
        if not mp3:
            raise SystemExit(f"{title}: Commons offers no MP3 transcode")
        data = get(mp3[0])
        own = downloads / Path(name).stem.replace(" ", "-").lower()
        own.mkdir(exist_ok=True)
        (own / "download.mp3").write_bytes(data)
        author, credit_line = credit(info)
        frames = [
            ("TIT2", latin1_text(tag_title)),
            ("TPE1", latin1_text(author)),
            ("TALB", latin1_text("Studio playlist")),
            ("TRCK", latin1_text(str(number))),
            ("COMM", b"\x00" + b"eng" + b"\x00" + f"CC0 1.0, from Wikimedia Commons ({title[5:]})".encode("latin-1")),
            ("APIC", b"\x00" + b"image/jpeg\x00" + b"\x03" + b"\x00" + cover),
        ]
        placed = folder / name
        placed.write_bytes(id3v23(frames) + strip_id3(data))
        record["placed"][str(placed.relative_to(out))] = {
            "purpose": "S14 (RS-5): 'Play the Studio playlist in Music.' (a track starting in Music)",
            "source": f"Wikimedia Commons: {page_url(title)}", "original_url": info["url"].split("?")[0],
            "original_sha1": info["sha1"], "downloaded_url": mp3[0], "download_sha256": sha256(data),
            "author_as_credited": author, "credit_line": credit_line,
            "licence": "CC0 1.0 (public domain dedication); checked through the Commons API at fetch time",
            "licence_url": CC0_URL, "checked_at": now,
            "changes": "Commons' own MP3 transcode of the original, not re-encoded; old tags removed; a new ID3v2.3 tag "
                       "(title, the artist as credited, album 'Studio playlist', track number, licence comment, a self-made cover)",
        }
        print(f"track {name}: {len(data) / 1e6:.1f} MB from {title} ({author})")
        time.sleep(2)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, required=True, help="the sample world's folder (.work/sample-world)")
    ap.add_argument("--only", choices=["photos", "music"], default=None)
    a = ap.parse_args()
    out = a.out.resolve()
    pins = json.loads(PINS_FILE.read_text(encoding="utf-8")) if PINS_FILE.exists() else {}
    record_path = out / "downloads" / "assets.json"
    record_path.parent.mkdir(parents=True, exist_ok=True)
    record = json.loads(record_path.read_text(encoding="utf-8")) if record_path.exists() else {"placed": {}}
    now = dt.datetime.now().astimezone().isoformat(timespec="seconds")
    if a.only in (None, "photos"):
        fetch_photos(out, pins, record, now)
        record["photos_fetched_at"] = now
    if a.only in (None, "music"):
        fetch_music(out, pins, record, now)
        record["music_fetched_at"] = now
    PINS_FILE.write_text(json.dumps(pins, indent=1, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    record_path.write_text(json.dumps(record, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"record: {record_path}; pins: {PINS_FILE}")


if __name__ == "__main__":
    main()
