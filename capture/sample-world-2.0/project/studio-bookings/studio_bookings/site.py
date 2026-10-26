"""Builds the sessions list on the booking page from the slots."""

from __future__ import annotations

from html import escape
from pathlib import Path

from .slots import Slot, open_day_slots


def render_sessions(slots: list[Slot]) -> str:
    rows = []
    for slot in slots:
        left = slot.places_left()
        status = "Full" if slot.is_full() else f"{left} place{'s' if left != 1 else ''} left"
        rows.append(
            f'<li class="slot{" full" if slot.is_full() else ""}">'
            f'<span class="time">{escape(slot.starts)}</span> '
            f'<span class="what">Wheel taster</span> '
            f'<span class="left">{escape(status)}</span></li>'
        )
    return '<ul class="sessions">\n' + "\n".join(rows) + "\n</ul>\n"


def write_sessions(out_dir: Path, slots: list[Slot] | None = None) -> Path:
    """Write site/sessions.html, the fragment the booking page shows."""
    out = Path(out_dir) / "sessions.html"
    out.write_text(render_sessions(slots or open_day_slots()), encoding="utf-8")
    return out
