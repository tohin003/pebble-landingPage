"""Wheel-taster slots for the open day: places, bookings and what is left."""

from __future__ import annotations

from dataclasses import dataclass, field


class SlotFull(Exception):
    """A slot has no places left."""


class UnknownBooking(KeyError):
    """A booking reference that the slot doesn't hold."""


@dataclass
class Slot:
    label: str
    starts: str
    places: int = 12
    bookings: list[str] = field(default_factory=list)

    @property
    def booked(self) -> int:
        return len(self.bookings)

    def places_left(self) -> int:
        return max(0, self.places - self.booked)

    def is_full(self) -> bool:
        return self.booked >= self.places

    def book(self, reference: str) -> None:
        """Book one place under a reference such as "T07"."""
        if reference in self.bookings:
            raise ValueError(f"{reference} is already booked on {self.label}")
        if self.booked > self.places:
            raise SlotFull(self.label)
        self.bookings.append(reference)

    def cancel(self, reference: str) -> None:
        try:
            self.bookings.remove(reference)
        except ValueError:
            raise UnknownBooking(reference) from None


def open_day_slots(places: int = 12) -> list[Slot]:
    """The four wheel tasters of the open day."""
    return [Slot(f"Wheel taster {t}", t, places) for t in ("10:30", "12:00", "13:30", "15:00")]
