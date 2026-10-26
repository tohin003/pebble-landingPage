"""The open day's programme: doors, wheel tasters and glazing demos."""

from __future__ import annotations

from dataclasses import dataclass

OPENS = "10:00"
CLOSES = "16:00"


def minutes(clock: str) -> int:
    hours, mins = clock.split(":")
    return int(hours) * 60 + int(mins)


@dataclass(frozen=True)
class Session:
    label: str
    starts: str
    length: int  # minutes

    @property
    def ends(self) -> str:
        end = minutes(self.starts) + self.length
        return f"{end // 60:02d}:{end % 60:02d}"


PROGRAMME = (
    Session("Wheel taster", "10:30", 45),
    Session("Glazing demo", "11:15", 30),
    Session("Wheel taster", "12:00", 45),
    Session("Wheel taster", "13:30", 45),
    Session("Glazing demo", "14:15", 30),
    Session("Wheel taster", "15:00", 45),
)


def sessions(kind: str | None = None) -> list[Session]:
    """The programme in time order, optionally only one kind of session."""
    chosen = [s for s in PROGRAMME if kind is None or s.label.lower() == kind.lower()]
    return sorted(chosen, key=lambda s: minutes(s.starts))


def overlaps(a: Session, b: Session) -> bool:
    return minutes(a.starts) < minutes(b.ends) and minutes(b.starts) < minutes(a.ends)


def within_opening_hours(s: Session) -> bool:
    return minutes(OPENS) <= minutes(s.starts) and minutes(s.ends) <= minutes(CLOSES)
