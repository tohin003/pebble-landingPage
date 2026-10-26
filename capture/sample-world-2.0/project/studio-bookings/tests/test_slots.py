import pytest

from studio_bookings.slots import Slot, SlotFull, UnknownBooking, open_day_slots


def test_new_slot_has_every_place_left():
    slot = Slot("Wheel taster 10:30", "10:30", places=12)
    assert slot.places_left() == 12
    assert not slot.is_full()


def test_booking_takes_a_place():
    slot = Slot("Wheel taster 10:30", "10:30", places=12)
    slot.book("T01")
    assert slot.booked == 1
    assert slot.places_left() == 11


def test_same_reference_cannot_book_twice():
    slot = Slot("Wheel taster 12:00", "12:00", places=12)
    slot.book("T07")
    with pytest.raises(ValueError):
        slot.book("T07")


def test_full_slot_refuses_another_booking():
    slot = Slot("Wheel taster 13:30", "13:30", places=2)
    slot.book("T21")
    slot.book("T22")
    with pytest.raises(SlotFull):
        slot.book("T23")
    assert slot.booked == 2


def test_cancel_frees_a_place():
    slot = Slot("Wheel taster 15:00", "15:00", places=1)
    slot.book("T40")
    slot.cancel("T40")
    assert slot.places_left() == 1


def test_cancel_unknown_reference_raises():
    slot = Slot("Wheel taster 15:00", "15:00")
    with pytest.raises(UnknownBooking):
        slot.cancel("T99")


def test_open_day_has_four_tasters_of_twelve():
    slots = open_day_slots()
    assert [s.starts for s in slots] == ["10:30", "12:00", "13:30", "15:00"]
    assert sum(s.places for s in slots) == 48
