from studio_bookings.site import render_sessions, write_sessions
from studio_bookings.slots import Slot


def test_sessions_list_says_places_left_and_full():
    open_slot = Slot("Wheel taster 10:30", "10:30", places=12, bookings=["T01", "T02"])
    full_slot = Slot("Wheel taster 12:00", "12:00", places=1, bookings=["T13"])
    html = render_sessions([open_slot, full_slot])
    assert "10 places left" in html
    assert '<li class="slot full">' in html and "Full" in html


def test_sessions_fragment_is_written(tmp_path):
    out = write_sessions(tmp_path)
    assert out.name == "sessions.html"
    assert out.read_text(encoding="utf-8").count("<li") == 4
